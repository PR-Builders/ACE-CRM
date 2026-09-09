/** Shared helpers used across the CRM's Apps Script files. */

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function generateId_() {
  return Utilities.getUuid();
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function rowToObject_(headers, row) {
  var obj = {};
  headers.forEach(function (h, i) { obj[h] = row[i]; });
  return obj;
}

function objectToRow_(headers, obj) {
  return headers.map(function (h) { return (obj[h] === undefined || obj[h] === null) ? '' : obj[h]; });
}

/** Finds a lead row by Lead ID. Returns {sheet, rowIndex (1-based), headers, obj} or null. */
function findLeadRow_(leadId) {
  var sheet = getSheet_(LEADS_SHEET);
  var headers = getHeaders_(sheet);
  var idCol = headers.indexOf('Lead ID');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === leadId) {
      var rowIndex = i + 2;
      var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      return { sheet: sheet, rowIndex: rowIndex, headers: headers, obj: rowToObject_(headers, row) };
    }
  }
  return null;
}

/** Finds the most recent lead row matching a phone number (digits-only compare). Returns same shape as findLeadRow_. */
function findLeadRowByPhone_(phone) {
  var sheet = getSheet_(LEADS_SHEET);
  var headers = getHeaders_(sheet);
  var phoneCol = headers.indexOf('Phone');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var wanted = normalizePhone_(phone);
  if (!wanted) return null;
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (normalizePhone_(values[i][phoneCol]) === wanted) {
      return { sheet: sheet, rowIndex: i + 2, headers: headers, obj: rowToObject_(headers, values[i]) };
    }
  }
  return null;
}

function normalizePhone_(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
}

function writeLeadRow_(found) {
  found.sheet.getRange(found.rowIndex, 1, 1, found.headers.length)
    .setValues([objectToRow_(found.headers, found.obj)]);
}

/** Replaces {{Field Name}} placeholders in a template string with lead values. */
function fillTemplate_(template, lead) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (match, key) {
    var value = lead[key];
    return (value === undefined || value === null) ? '' : String(value);
  });
}

function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str).trim().toLowerCase());
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isBlank_(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function startOfDay_(date) {
  var d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursSince_(date) {
  return (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60);
}
