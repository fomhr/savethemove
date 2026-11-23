// Paste into the Apps Script project bound to the response spreadsheet.
// Run setupResponseSheet once in the editor before deploying as a web app.
function setupResponseSheet() {
  PropertiesService.getScriptProperties().setProperty(
    'RESPONSE_SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId()
  );
}

function doPost(e) {
  const reply = value => ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    const raw = e?.postData?.contents;
    if (!raw || raw.length > 120000) return reply({ok: false});
    const data = JSON.parse(raw);
    if (data.schema !== 'FAMILY_GAS_2026_v3' ||
        !['상담원', '팀장'].includes(data.role) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id || '') ||
        !data.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) {
      return reply({ok: false});
    }

    const id = PropertiesService.getScriptProperties().getProperty('RESPONSE_SHEET_ID');
    const sheet = SpreadsheetApp.openById(id).getSheetByName(data.role + ' 응답');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const keys = headers.slice(2);
    const entries = Object.entries(data.answers);
    if (!entries.length || !entries.every(([key, val]) => keys.includes(key) &&
        (validAnswer_(val) || (Array.isArray(val) && val.length <= 20 && val.every(validAnswer_))))) {
      return reply({ok: false});
    }
    const cells = keys.map(key => {
      const value = data.answers[key];
      const text = Array.isArray(value) ? value.join('\n') : value ?? '';
      return typeof text === 'string' && /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
    });

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1 && sheet.getRange(2, 2, lastRow - 1, 1).createTextFinder(data.id)
        .matchEntireCell(true).findNext()) return reply({ok: true, id: data.id});
    const time = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([time, data.id, ...cells]);
    SpreadsheetApp.flush();
    return reply({ok: true, id: data.id});
  } catch (error) {
    return reply({ok: false});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function validAnswer_(value) {
  return (typeof value === 'string' && value.length <= 10000) ||
    (typeof value === 'number' && Number.isFinite(value));
}
