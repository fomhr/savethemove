/**
 * 2026 SAVE THE MOVE · 토크콘서트 사전 질문 접수
 * Google Sheets-bound Apps Script: paste entire file, save, and deploy NEW VERSION
 * of the EXISTING web app (execute as Me, access Anyone).
 *
 * GET legacy JSONP is retained, but the primary read/write transport is POST
 * from an invisible HTML form. HtmlService responds via postMessage, avoiding
 * Google's ContentService redirect and browser CORS restrictions.
 */
const SHEET_ID = '1uMt4iCrJaSD2Ydaioe1H6KcKgO3xqd9-AV-_nSB0qg8';
const TAB = '사전 질문 접수';
const SITE_ORIGIN = 'https://fomhr.github.io';
const ALLOWED_CATEGORIES = [
  '전체 토크콘서트',
  '대전서부아동보호전문기관 · 김은지',
  '인천광역시아동보호전문기관 · 박혜원',
  '전북가정위탁지원센터 · 최시원',
  '대구광역시가정위탁지원센터 · 장혜정',
  '울산신나는아동쉼터 · 이선희'
];

function sheet_() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sh) throw new Error('사전 질문 접수 탭을 찾을 수 없습니다.');
  return sh;
}

function readPublicQuestions() {
  const rows = sheet_().getDataRange().getValues();
  return rows.slice(1)
    .filter(r => String(r[4]).trim() === '공개')
    .map(r => ({
      id: String(r[0]),
      createdAt: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
      category: String(r[2]),
      question: String(r[3])
    }));
}

function saveQuestion_(data) {
  const id = String(data.id || '').trim();
  const category = String(data.category || '').trim();
  const question = String(data.question || '').trim();
  if (!/^STM-[a-z0-9]+-[a-z0-9]{8}$/.test(id)
      || !ALLOWED_CATEGORIES.includes(category)
      || question.length < 10 || question.length > 600) {
    throw new Error('질문 입력값을 확인해 주세요.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const lastRow = sh.getLastRow();
    if (lastRow > 1) {
      const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
      if (ids.some(row => String(row[0]) === id)) return { id:id, duplicate:true };
    }
    // Stop spreadsheet-formula injection; the original question is preserved.
    const safeQuestion = /^[=+@-]/.test(question) ? "'" + question : question;
    sh.appendRow([id, new Date(), category, safeQuestion, '공개', '']);
    SpreadsheetApp.flush();
    return { id:id, duplicate:false };
  } finally {
    lock.releaseLock();
  }
}

function jsonReply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlReply_(nonce, payload) {
  // Only public question fields are sent to the event page.
  // The random nonce ensures a response belongs to the current request.
  const message = JSON.stringify({
    source: 'savethemove-talk-post',
    nonce: nonce,
    payload: payload
  })
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const html = '<!doctype html><html lang="ko"><head><meta charset="UTF-8">' +
    '<title>SAVE THE MOVE</title></head><body><script>' +
    'window.top.postMessage(' + message + ',' + JSON.stringify(SITE_ORIGIN) + ');' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const action = String(p.action || '');
  if (action === 'list' || action === 'submit') {
    const nonce = String(p.nonce || '');
    if (!/^[a-z0-9-]{10,70}$/.test(nonce)) {
      return jsonReply_({ok:false,error:'Invalid request nonce'});
    }
    try {
      let receipt = null;
      if (action === 'submit') receipt = saveQuestion_(p);
      return htmlReply_(nonce, {
        ok: true,
        receipt: receipt,
        questions: readPublicQuestions()
      });
    } catch (error) {
      return htmlReply_(nonce, {ok:false,error:String(error.message || error)});
    }
  }

  // Backward compatibility for the existing JSON POST client.
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');
    const receipt = saveQuestion_(data);
    return jsonReply_({ok:true,id:receipt.id,duplicate:receipt.duplicate});
  } catch (error) {
    return jsonReply_({ok:false,error:String(error.message || error)});
  }
}

function doGet(e) {
  const callback = String(e && e.parameter && e.parameter.callback || '');
  if (!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(callback)) {
    return jsonReply_({ok:false,error:'Invalid callback'});
  }
  try {
    const payload = JSON.stringify({ok:true,questions:readPublicQuestions()})
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    return ContentService.createTextOutput(callback + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    const payload = JSON.stringify({ok:false,error:String(error.message || error)});
    return ContentService.createTextOutput(callback + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}