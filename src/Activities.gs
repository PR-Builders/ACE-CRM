/** Activity log: every automated/staff action tied to a lead. */

function logActivity_(leadId, type, detail, staff) {
  var sheet = getSheet_(ACTIVITIES_SHEET);
  var row = objectToRow_(ACTIVITY_HEADERS, {
    'Activity ID': generateId_(),
    'Lead ID': leadId,
    'Type': type,
    'Detail': detail || '',
    'Timestamp': new Date(),
    'Staff': staff || ''
  });
  sheet.appendRow(row);
}

function getActivitiesForLead(leadId) {
  var sheet = getSheet_(ACTIVITIES_SHEET);
  var headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var idCol = headers.indexOf('Lead ID');
  return values
    .filter(function (row) { return row[idCol] === leadId; })
    .map(function (row) { return rowToObject_(headers, row); })
    .sort(function (a, b) { return new Date(b.Timestamp) - new Date(a.Timestamp); });
}
