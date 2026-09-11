/**
 * Web app entry points.
 *
 * doGet   -> serves the internal CRM UI (Pipeline / New Lead / Reports).
 * doPost  -> the single external integration endpoint, shared by:
 *              - the website contact form (lead creation + UTM/click-ID attribution)
 *              - the call-tracking service's post-call webhook
 *              - the SMS provider's inbound/opt-out webhook
 *            Routing is by payload shape; see routePost_ below.
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Ace Septic & Excavation CRM')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    var params = parseRequestParams_(e);
    var result = routePost_(params);
    return jsonOutput_({ success: true, result: result });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}

function parseRequestParams_(e) {
  var params = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) { params[k] = e.parameter[k]; });
  }
  if (e && e.postData && e.postData.type === 'application/json' && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      Object.keys(body).forEach(function (k) { params[k] = body[k]; });
    } catch (jsonErr) {
      // Not JSON — fall back to whatever was in e.parameter.
    }
  }
  return params;
}

function routePost_(params) {
  var config = getConfig_();

  var isCallWebhook = params.type === 'call_webhook' || !!params.CallerNumber || !!params.TrackingNumber;
  if (isCallWebhook) {
    requireSharedSecret_(params, config);
    return handleCallWebhook_(params);
  }

  var isSmsWebhook = !!params.OptOutType || (params.MessageSid && params.Body !== undefined);
  if (isSmsWebhook) {
    return handleSmsOptOutWebhook_(params);
  }

  // Default: website contact form submission (manual entry goes through
  // google.script.run -> createLead directly, not through doPost).
  return createLead(mapWebsiteFormFields_(params), true, params.landing_url);
}

function requireSharedSecret_(params, config) {
  if (config.webhookSharedSecret && params.secret !== config.webhookSharedSecret) {
    throw new Error('Invalid webhook secret.');
  }
}

function mapWebsiteFormFields_(params) {
  return {
    'Name': params.name || params.Name,
    'Email': params.email || params.Email,
    'Phone': params.phone || params.Phone,
    'Address': params.address || params.Address,
    'Source': params.source || params.Source,
    'Source Detail': params.sourceDetail || params['Source Detail'],
    'Contact Method': 'Form',
    'Notes': params.notes || params.Notes,
    'UTM Source': params.utm_source || params.utmSource,
    'UTM Medium': params.utm_medium || params.utmMedium,
    'UTM Campaign': params.utm_campaign || params.utmCampaign,
    'GCLID': params.gclid || params.GCLID,
    'FBCLID': params.fbclid || params.FBCLID
  };
}
