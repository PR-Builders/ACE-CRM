/**
 * Handles post-call webhooks from a call-tracking service (CallRail,
 * WhatConverts, CallTrackingMetrics, etc). Configure that service to POST
 * to this Web App's /exec URL with type=call_webhook on every incoming call.
 */

function handleCallWebhook_(params) {
  var callerNumber = params.CallerNumber || params.caller_number || params.From || params.from;
  var trackingNumber = params.TrackingNumber || params.tracking_number || params.DialedNumber || params.To || params.to;
  if (isBlank_(callerNumber)) throw new Error('Call webhook missing caller number.');

  var mapping = getConfig_().callTrackingNumberMap[normalizePhone_(trackingNumber)] || {};
  var source = mapping.source || 'Ads';
  var sourceDetail = mapping.sourceDetail || trackingNumber || '';
  var utmSource = mapping.utmSource || '';

  var existing = findLeadRowByPhone_(callerNumber);
  if (existing) {
    existing.obj['Last Updated'] = new Date();
    writeLeadRow_(existing);
    logActivity_(existing.obj['Lead ID'], 'Manual Note', 'Additional call received from tracking number ' + trackingNumber, '');
    return existing.obj;
  }

  return createLead({
    'Phone': callerNumber,
    'Contact Method': 'Call',
    'Source': source,
    'Source Detail': sourceDetail,
    'UTM Source': utmSource
  }, false);
}
