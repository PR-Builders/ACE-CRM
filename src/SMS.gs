/**
 * SMS sending via Twilio, plus opt-out handling. Register a Brand/Campaign
 * with The Campaign Registry through Twilio before sending in production.
 */

function sendSms_(toPhone, body) {
  var config = getConfig_();
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    throw new Error('Twilio is not configured (set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).');
  }
  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + config.twilioAccountSid + '/Messages.json';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: { To: toPhone, From: config.twilioFromNumber, Body: body },
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(config.twilioAccountSid + ':' + config.twilioAuthToken) },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code >= 200 && code < 300) return true;
  throw new Error('Twilio send failed (' + code + '): ' + response.getContentText());
}

var STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];

/**
 * Handles inbound webhooks from the SMS provider: Twilio's Advanced Opt-Out
 * feature posts OptOutType on STOP-equivalent replies, and a plain inbound
 * message webhook posts From/Body — either path flips SMS Consent to "No"
 * so no future automation attempts to text that lead.
 */
function handleSmsOptOutWebhook_(params) {
  var isOptOut = !!params.OptOutType ||
    (params.Body && STOP_KEYWORDS.indexOf(String(params.Body).trim().toUpperCase()) !== -1);
  if (!isOptOut) return { handled: false };

  var found = findLeadRowByPhone_(params.From);
  if (!found) return { handled: false, reason: 'No lead matches phone ' + params.From };

  found.obj['SMS Consent'] = 'No';
  found.obj['Last Updated'] = new Date();
  writeLeadRow_(found);
  logActivity_(found.obj['Lead ID'], 'Manual Note', 'SMS opt-out received (' + (params.OptOutType || params.Body) + ') — SMS Consent set to No', '');
  return { handled: true, leadId: found.obj['Lead ID'] };
}
