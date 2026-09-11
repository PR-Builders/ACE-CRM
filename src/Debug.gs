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

  ids.forEach(function (row) {
    var testId = row[0];
    Logger.log('--- Trying getLead("' + testId + '")...');
    try {
      var result = getLead(testId);
      Logger.log('SUCCESS. Result: ' + JSON.stringify(result));
    } catch (e) {
      Logger.log('THREW: ' + e.message);
      Logger.log('STACK: ' + e.stack);
    }
  });
}

/**
 * Bisection probes for the "RPC success handler receives null" bug. Paste
 * these one at a time into the CRM page's browser console (after it's
 * loaded) — no UI button needed, google.script.run is already on the page:
 *
 *   google.script.run.withSuccessHandler(r => console.log('ECHO:', r)).withFailureHandler(e => console.log('ECHO ERR:', e)).debugEcho('hello');
 *   google.script.run.withSuccessHandler(r => console.log('PING:', r)).withFailureHandler(e => console.log('PING ERR:', e)).debugSheetPing();
 *
 * debugEcho touches nothing but the RPC bridge itself. debugSheetPing adds
 * one minimal Spreadsheet read. Whichever one comes back null (if either)
 * tells us which layer the bug is actually in.
 */
function debugEcho(value) {
  return { echoed: value, receivedType: typeof value, timestamp: new Date().toISOString() };
}

function debugSheetPing() {
  var sheet = getSheet_(LEADS_SHEET);
  return { ok: true, lastRow: sheet.getLastRow(), sheetName: sheet.getName() };
}

/** debugSheetPing works but getLeadsList doesn't — these isolate why:
 * a top-level array, a raw Date object, and the real per-lead shape
 * (minus the Date fields) each in isolation. */
function debugReturnArray() {
  return [{ a: 1, name: 'x' }, { a: 2, name: 'y' }];
}

function debugReturnDate() {
  return { created: new Date(), label: 'test' };
}

function debugReturnOneLeadNoDates() {
  var leads = getAllLeads_();
  if (!leads.length) return { note: 'no leads' };
  var lead = leads[0];
  var stripped = {};
  Object.keys(lead).forEach(function (k) {
    stripped[k] = (Object.prototype.toString.call(lead[k]) === '[object Date]') ? String(lead[k]) : lead[k];
  });
  return stripped;
}
