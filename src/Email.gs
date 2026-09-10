/**
 * Thin wrapper around GmailApp so callers don't touch the Gmail quota API
 * directly. Uses GmailApp (not MailApp) so an optional custom From address
 * can be applied — see FROM_EMAIL in Config.gs / docs/SETUP.md.
 */

function sendEmail_(toAddress, subject, body) {
  if (isBlank_(toAddress)) return false;
  var config = getConfig_();
  var options = { name: config.fromName };
  if (config.fromEmail) options.from = config.fromEmail;
  GmailApp.sendEmail(toAddress, subject, body, options);
  return true;
}
