/**
 * Script Properties accessors. Set these under
 * Project Settings > Script Properties in the Apps Script editor.
 */

function getConfig_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  return {
    companyName: p.COMPANY_NAME || 'Ace Septic & Excavation',
    companyPhone: p.COMPANY_PHONE || '',
    privacyPolicyUrl: p.PRIVACY_POLICY_URL || '',
    reviewLink: p.REVIEW_LINK || '',
    smsDisclosureVersion: p.SMS_DISCLOSURE_VERSION || 'v1',

    staffDigestEmails: (p.STAFF_DIGEST_EMAILS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),

    twilioAccountSid: p.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: p.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: p.TWILIO_FROM_NUMBER || '',

    metaPixelId: p.META_PIXEL_ID || '',
    metaAccessToken: p.META_ACCESS_TOKEN || '',
    metaApiVersion: p.META_API_VERSION || 'v21.0',
    metaTestEventCode: p.META_TEST_EVENT_CODE || '',

    // JSON string mapping a call-tracking phone number to its source, e.g.
    // {"+19705551234": {"source":"Ads","sourceDetail":"Google Call Ext","utmSource":"google"},
    //  "+19705555678": {"source":"Ads","sourceDetail":"Meta Call Button","utmSource":"facebook"}}
    callTrackingNumberMap: parseJsonSafe_(p.CALL_TRACKING_NUMBER_MAP, {}),

    // Shared secret the call-tracking service / SMS provider must send so
    // doPost can tell trusted webhooks apart from arbitrary POSTs.
    webhookSharedSecret: p.WEBHOOK_SHARED_SECRET || ''
  };
}

function parseJsonSafe_(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}
