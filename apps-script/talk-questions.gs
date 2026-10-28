/**
 * 2026 SAVE THE MOVE / Google Apps Script Web App
 * Deploy: Web app > Execute as Me > Anyone (anonymous)
 * Bound to sheet via the spreadsheet ID below.
 * Never publish this script as a GitHub Pages executable backend.
 */
const SHEET_ID = '1uMt4iCrJaSD2Ydaioe1H6KcKgO3xqd9-AV-_nSB0qg8';
const TAB = '사전 질문 접수';
const ALLOWED_CATEGORIES = [
  '전체 토크콘서트',
  '대전서부아동보호전문기관 · 김은지',
  '인천광역시아동보호전문기관 · 박혜원',
  '전북가정위탁지원센터 · 최시원',
  '대구광역시가정위탁지원센터 · 장혜정',
  '울산신나는아동쉼터 · 이선희'
];
function readPublicQuestions() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sh) throw new Error('Question sheet not found');
  const values = sh.getDataRange().getValues();
  return values.slice(1)
    .filter(row => String(row[4]).trim() === '공개')
    .map(row => ({
      id: String(row[0]),
      createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
      category: String(row[2]),
      question: String(row[3])
    }));
}
function doGet(e) {
  if (e && e.parameter && e.parameter.bridge === '1') {
    // The nonce binds a publicly readable reply to one on-page request.
    const nonce = String(e.parameter.nonce || '');
    if (!/^[a-z0-9-]{10,70}$/.test(nonce)) {
      return ContentService.createTextOutput('Invalid request');
    }
    const pageTemplate = String.raw`<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><title>SAVE THE MOVE 질문 조회</title></head>
<body><script>
(function () {
  var PARENT_ORIGIN = 'https://fomhr.github.io';
  var NONCE = __NONCE__;
  function send(type, data) {
    window.top.postMessage(
      {source:'savethemove-talk-bridge', nonce:NONCE, type:type, data:data},
      PARENT_ORIGIN
    );
  }
  function refresh() {
    google.script.run
      .withSuccessHandler(function (questions) {
        send('questions', {ok:true, questions:questions});
      })
      .withFailureHandler(function (err) {
        send('error', {message:String(err && err.message || '조회 실패')});
      })
      .readPublicQuestions();
  }
  refresh();
})();
</script></body></html>`;
    const page = pageTemplate.replace('__NONCE__', JSON.stringify(nonce));
    return HtmlService.createHtmlOutput(page)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Keep the original read-only JSONP response for compatibility.
  const callback = String(e && e.parameter && e.parameter.callback || '');
  if (!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput(
      JSON.stringify({ok:false,error:'Invalid callback'})
    ).setMimeType(ContentService.MimeType.JSON);
  }
  const json = JSON.stringify({ok:true,questions:readPublicQuestions()})
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return ContentService.createTextOutput(callback+'('+json+');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function doPost(e) {
  try {
    const data=JSON.parse((e.postData&&e.postData.contents)||'{}');
    const id=String(data.id||'').trim();
    const category=String(data.category||'').trim();
    const question=String(data.question||'').trim();
    if(!/^STM-[a-z0-9]+-[a-z0-9]{8}$/.test(id)||!ALLOWED_CATEGORIES.includes(category)||question.length<10||question.length>600)throw Error('Invalid input');
    const lock=LockService.getScriptLock();lock.waitLock(20000);
    try {
      const sh=SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
      const last=sh.getLastRow();
      if(last>1&&sh.getRange(2,1,last-1,1).getValues().some(row=>String(row[0])===id))return respond({ok:true,id,duplicate:true});
      const clean=question.replace(/^[=+@\\-]/,"'"+question[0]);
      sh.appendRow([id,new Date(),category,clean,'공개','']);
      SpreadsheetApp.flush();
    } finally {lock.releaseLock();}
    return respond({ok:true,id});
  } catch(ex){return respond({ok:false,error:'Invalid request'});}
}
function respond(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
