/** Fires the Stage Templates email/SMS automation whenever a lead enters a stage. */

function getStageTemplate_(stage) {
  var sheet = getSheet_(STAGE_TEMPLATES_SHEET);
  var headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var stageCol = headers.indexOf('Stage');
  for (var i = 0; i < values.length; i++) {
    if (values[i][stageCol] === stage) return rowToObject_(headers, values[i]);
  }
  return null;
}

/** Merges company-level placeholders (Company Name, Review Link, ...) on top of the lead's own fields. */
function templateContext_(lead) {
  var config = getConfig_();
  var context = {};
  Object.keys(lead).forEach(function (k) { context[k] = lead[k]; });
  context['Company Name'] = config.companyName;
  context['Company Phone'] = config.companyPhone;
  context['Review Link'] = config.reviewLink;
  return context;
}

function runStageAutomation_(lead, stage) {
  var template = getStageTemplate_(stage);
  if (!template) return;
  var context = templateContext_(lead);

  if (template['Send Email'] === true && !isBlank_(lead.Email)) {
    var subject = fillTemplate_(template['Email Subject'], context);
    var body = fillTemplate_(template['Email Body'], context);
    sendEmail_(lead.Email, subject, body);
    logActivity_(lead['Lead ID'], 'Email Sent', subject, '');
  }

  if (template['Send Text'] === true) {
    if (lead['SMS Consent'] !== 'Yes' || isBlank_(lead.Phone)) {
      logActivity_(lead['Lead ID'], 'Text Sent', 'Skipped — SMS Consent is not "Yes"', '');
    } else {
      var textBody = fillTemplate_(template['Text Body'], context);
      try {
        sendSms_(lead.Phone, textBody);
        logActivity_(lead['Lead ID'], 'Text Sent', textBody, '');
      } catch (err) {
        logActivity_(lead['Lead ID'], 'Text Sent', 'Failed to send: ' + err.message, '');
      }
    }
  }
}
