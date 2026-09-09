/**
 * Field Log — lets crews capture marketing-usable material (photos taken,
 * video/education/case-study prompts) right after finishing a job. Lives in
 * its own spreadsheet (separate from the Leads/Activities data), surfaced
 * as a section of this same web app.
 */

var FIELD_LOG_SHEET_ID = '1GX6fIcZbsxKgrRZZUk69bF5GZPFIKc8vI79y08Znihk';

var FIELD_LOG_FIELDS = [
  'ticketId', 'savedAt', 'customer', 'address', 'scopeOfWork', 'date', 'crew', 'county', 'soil',
  'photoTaken', 'photoUploaded', 'gmb', 'ig',
  'vidHook', 'vidProblem', 'vidProcess', 'vidChallenge', 'vidResult',
  'eduTopic', 'eduPoints',
  'csProblem', 'csSolution', 'csTechnical', 'csChallenges', 'csEquipment', 'csLocal', 'csLinks',
  'status', 'serviceType'
];

function fieldLogSheet_() {
  return SpreadsheetApp.openById(FIELD_LOG_SHEET_ID).getSheets()[0];
}

/**
 * Saves one job entry. If a row with this ticketId already exists it's
 * overwritten in place (so saving progress twice never creates a duplicate);
 * otherwise a new row is appended.
 */
function saveFieldLogEntry(entry) {
  var sheet = fieldLogSheet_();
  entry = entry || {};
  entry.savedAt = new Date().toISOString();
  entry.status = entry.status || 'In Progress';

  var row = FIELD_LOG_FIELDS.map(function (key) {
    var v = entry[key];
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v === undefined || v === null ? '' : v;
  });

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === entry.ticketId) { rowIndex = i; break; }
  }

  if (rowIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  }

  return { ok: true, ticketId: entry.ticketId, status: entry.status };
}

/** Returns every saved entry as an array of objects, newest first. */
function getFieldLogEntries() {
  var sheet = fieldLogSheet_();
  var values = sheet.getDataRange().getValues();
  var rows = values.slice(1);

  var entries = rows
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      var obj = {};
      FIELD_LOG_FIELDS.forEach(function (key, i) {
        var v = row[i];
        if (Object.prototype.toString.call(v) === '[object Date]') {
          v = (key === 'date')
            ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
            : v.toISOString();
        }
        if (key === 'photoTaken' || key === 'photoUploaded' || key === 'gmb' || key === 'ig') {
          v = (v === true || v === 'TRUE');
        }
        obj[key] = v;
      });
      obj.status = obj.status || 'In Progress';
      return obj;
    });

  entries.reverse();
  return entries;
}
