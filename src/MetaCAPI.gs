/**
 * Meta Conversions API — sends server-side conversion events so Meta's ad
 * system can optimize on real outcomes (leads, qualified leads, closed
 * jobs) rather than just cheap form-fills.
 *
 * Matches events back to the original ad click via FBCLID (converted to
 * Meta's fbc format), falling back to SHA-256-hashed email/phone per Meta's
 * requirement that raw PII never be sent.
 */

function sendMetaEvent_(lead, eventName, valueOverride) {
  var config = getConfig_();
  if (!config.metaPixelId || !config.metaAccessToken) return { skipped: true, reason: 'Meta CAPI not configured' };

  var userData = {};
  if (lead.Email) userData.em = [sha256Hex_(lead.Email)];
  if (lead.Phone) userData.ph = [sha256Hex_(normalizePhone_(lead.Phone))];
  if (lead['FBCLID']) userData.fbc = 'fb.1.' + Date.now() + '.' + lead['FBCLID'];

  var eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'system_generated',
    event_id: lead['Lead ID'] + ':' + eventName,
    user_data: userData
  };

  var value = valueOverride !== undefined ? valueOverride : lead['Estimated Value'];
  if (value) {
    eventData.custom_data = { currency: 'USD', value: Number(value) };
  }

  var payload = { data: [eventData] };
  if (config.metaTestEventCode) payload.test_event_code = config.metaTestEventCode;

  var url = 'https://graph.facebook.com/' + config.metaApiVersion + '/' + config.metaPixelId + '/events'
    + '?access_token=' + encodeURIComponent(config.metaAccessToken);

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  logActivity_(lead['Lead ID'], 'Manual Note',
    'Meta CAPI event "' + eventName + '" ' + (ok ? 'sent' : 'failed: ' + response.getContentText()), '');
  return { ok: ok, response: response.getContentText() };
}
