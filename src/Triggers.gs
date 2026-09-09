/**
 * Time-driven triggers. Run installTriggers() once from the Apps Script
 * editor (or via clasp run) to install both; it clears any prior copies
 * first so re-running it is safe.
 */

function installTriggers() {
  ['autoExpireCallLeads', 'sendFollowUpDigest'].forEach(function (fn) {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t);
    });
  });

  ScriptApp.newTrigger('autoExpireCallLeads').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('sendFollowUpDigest').timeBased().everyDays(1).atHour(7).create();

  return 'Installed hourly auto-expire and daily follow-up digest triggers.';
}

/** Deletes placeholder call leads (no Name captured) more than 36 hours old, logging first. */
function autoExpireCallLeads() {
  var leads = getAllLeads_();
  var toDelete = leads.filter(function (lead) {
    return lead['Contact Method'] === 'Call' &&
      isBlank_(lead.Name) &&
      lead['Created Date'] &&
      hoursSince_(lead['Created Date']) > CALL_PLACEHOLDER_EXPIRY_HOURS;
  });

  // Delete bottom-up isn't needed since deleteLeadRow_ re-locates by ID each time.
  toDelete.forEach(function (lead) {
    logActivity_(lead['Lead ID'], 'Auto-Removed',
      'Placeholder call lead expired after ' + CALL_PLACEHOLDER_EXPIRY_HOURS + ' hours with no name captured', '');
    deleteLeadRow_(lead['Lead ID']);
  });

  return toDelete.length;
}

/** Emails staff a digest of every lead whose Next Follow-Up Date is today or earlier. */
function sendFollowUpDigest() {
  var config = getConfig_();
  if (!config.staffDigestEmails.length) return 0;

  var today = startOfDay_(new Date());
  var due = getAllLeads_().filter(function (lead) {
    if (lead.Status !== 'Active' || isBlank_(lead['Next Follow-Up Date'])) return false;
    return startOfDay_(lead['Next Follow-Up Date']) <= today;
  });

  if (!due.length) return 0;

  var lines = due.map(function (lead) {
    return '- ' + lead.Name + ' (' + lead.Stage + ', ' + lead.Source + ') — due '
      + Utilities.formatDate(new Date(lead['Next Follow-Up Date']), Session.getScriptTimeZone(), 'yyyy-MM-dd')
      + ' — ' + lead.Phone + (lead.Email ? ' / ' + lead.Email : '');
  });

  var body = 'Leads needing follow-up today or overdue:\n\n' + lines.join('\n');
  config.staffDigestEmails.forEach(function (email) {
    sendEmail_(email, 'Follow-Up Digest — ' + due.length + ' lead(s) due', body);
  });

  return due.length;
}
