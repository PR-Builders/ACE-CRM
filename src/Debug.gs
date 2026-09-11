/**
 * Temporary diagnostics — safe to delete once the "click a lead card" bug
 * is resolved. Run debugGetLead directly from the Apps Script editor
 * (select it in the function dropdown, click Run), then View > Logs (or
 * the Executions panel) to see exactly what getLead() does server-side,
 * bypassing the browser entirely.
 *
 * Named without a trailing underscore on purpose — Apps Script hides
 * underscore-suffixed functions from the editor's Run dropdown, treating
 * them as private. This one needs to be runnable from the UI.
 */
function debugGetLead() {
  var sheet = getSheet_(LEADS_SHEET);
  var headers = getHeaders_(sheet);
  Logger.log('Leads sheet headers: ' + JSON.stringify(headers));

  var lastRow = sheet.getLastRow();
  Logger.log('Leads sheet last row: ' + lastRow);
  if (lastRow < 2) {
    Logger.log('No lead rows found at all.');
    return;
  }

  var idCol = headers.indexOf('Lead ID');
  Logger.log('"Lead ID" column index: ' + idCol);
  var ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  Logger.log('Lead IDs in sheet: ' + JSON.stringify(ids.map(function (r) { return r[0]; })));

  var testId = ids[0][0];
  Logger.log('Trying getLead("' + testId + '")...');
  try {
    var result = getLead(testId);
    Logger.log('SUCCESS. Result: ' + JSON.stringify(result));
  } catch (e) {
    Logger.log('THREW: ' + e.message);
    Logger.log('STACK: ' + e.stack);
  }
}
