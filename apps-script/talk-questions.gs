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
function doGet(e) {
  const callback=String(e.parameter.callback||'');
  if(!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(callback)){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Invalid callback'})).setMimeType(ContentService.MimeType.JSON);
  }
  const sh=SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  const data=sh.getDataRange().getValues();
  const questions=data.slice(1).filter(r=>String(r[4]).trim()==='공개').map(r=>({id:String(r[0]),createdAt:r[1] instanceof Date?r[1].toISOString():String(r[1]),category:String(r[2]),question:String(r[3])}));
  const output=JSON.stringify({ok:true,questions}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(callback+'('+output+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
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
