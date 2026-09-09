/** Thin wrapper around MailApp so callers don't touch the Gmail quota API directly. */

function sendEmail_(toAddress, subject, body) {
  if (isBlank_(toAddress)) return false;
  MailApp.sendEmail({ to: toAddress, subject: subject, body: body });
  return true;
}
