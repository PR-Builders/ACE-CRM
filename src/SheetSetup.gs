/**
 * One-time (and re-runnable) setup of the CRM's spreadsheet: tabs, headers,
 * dropdown validation, and default Stage Templates. Run setupSpreadsheet()
 * once from the Apps Script editor after binding this project to the Sheet.
 */

function setupSpreadsheet() {
  setupLeadsSheet_();
  setupActivitiesSheet_();
  setupStageTemplatesSheet_();
  var ss = getSpreadsheet_();
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
  return 'Spreadsheet setup complete.';
}

function getOrCreateSheet_(name) {
  var ss = getSpreadsheet_();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function applyHeaderRow_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#272727').setFontColor('#F4F4F4');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function applyDropdown_(sheet, colIndex1based, values, numRows) {
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  sheet.getRange(2, colIndex1based, numRows, 1).setDataValidation(rule);
}

function setupLeadsSheet_() {
  var sheet = getOrCreateSheet_(LEADS_SHEET);
  applyHeaderRow_(sheet, LEAD_HEADERS);
  if (sheet.getMaxRows() < 1000) sheet.insertRowsAfter(sheet.getMaxRows(), 1000 - sheet.getMaxRows());
  var numRows = sheet.getMaxRows() - 1;

  applyDropdown_(sheet, LEAD_HEADERS.indexOf('Source') + 1, SOURCES, numRows);
  applyDropdown_(sheet, LEAD_HEADERS.indexOf('Contact Method') + 1, CONTACT_METHODS, numRows);
  applyDropdown_(sheet, LEAD_HEADERS.indexOf('Lost Reason') + 1, LOST_REASONS, numRows);
  applyDropdown_(sheet, LEAD_HEADERS.indexOf('SMS Consent') + 1, SMS_CONSENT_VALUES, numRows);
  applyDropdown_(sheet, LEAD_HEADERS.indexOf('Stage') + 1, STAGES, numRows);
  applyDropdown_(sheet, LEAD_HEADERS.indexOf('Status') + 1, STATUSES, numRows);

  sheet.getRange(2, LEAD_HEADERS.indexOf('Estimated Value') + 1, numRows, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(2, LEAD_HEADERS.indexOf('Actual Value') + 1, numRows, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(2, LEAD_HEADERS.indexOf('Next Follow-Up Date') + 1, numRows, 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(2, LEAD_HEADERS.indexOf('Created Date') + 1, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(2, LEAD_HEADERS.indexOf('Last Updated') + 1, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

function setupActivitiesSheet_() {
  var sheet = getOrCreateSheet_(ACTIVITIES_SHEET);
  applyHeaderRow_(sheet, ACTIVITY_HEADERS);
  var numRows = Math.max(sheet.getMaxRows() - 1, 999);
  applyDropdown_(sheet, ACTIVITY_HEADERS.indexOf('Type') + 1, ACTIVITY_TYPES, numRows);
  sheet.getRange(2, ACTIVITY_HEADERS.indexOf('Timestamp') + 1, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function setupStageTemplatesSheet_() {
  var sheet = getOrCreateSheet_(STAGE_TEMPLATES_SHEET);
  applyHeaderRow_(sheet, STAGE_TEMPLATE_HEADERS);

  if (sheet.getLastRow() < 2) {
    var defaults = defaultStageTemplateRows_();
    sheet.getRange(2, 1, defaults.length, STAGE_TEMPLATE_HEADERS.length).setValues(defaults);
  }

  var numRows = sheet.getMaxRows() - 1;
  applyDropdown_(sheet, STAGE_TEMPLATE_HEADERS.indexOf('Stage') + 1, STAGES, numRows);
  var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, STAGE_TEMPLATE_HEADERS.indexOf('Send Email') + 1, numRows, 1).setDataValidation(checkboxRule);
  sheet.getRange(2, STAGE_TEMPLATE_HEADERS.indexOf('Send Text') + 1, numRows, 1).setDataValidation(checkboxRule);
}

function defaultStageTemplateRows_() {
  var reviewLink = '{{Review Link}}';
  var rows = {
    'Leads': { email: false, text: false, subj: '', ebody: '', tbody: '' },
    'Site Visit': {
      email: true, text: false,
      subj: 'Your site visit with {{Company Name}}',
      ebody: 'Hi {{Name}},\n\nThanks for reaching out. We\'ve got your site visit on the calendar for {{Address}}. We\'ll follow up shortly to confirm timing.\n\n{{Company Name}}',
      tbody: ''
    },
    'Estimating': {
      email: true, text: false,
      subj: 'We\'re putting together your estimate',
      ebody: 'Hi {{Name}},\n\nWe\'re working on a cost estimate for your project at {{Address}}. We\'ll be in touch soon with details.\n\n{{Company Name}}',
      tbody: ''
    },
    'Engineering': {
      email: false, text: false, subj: '', ebody: '', tbody: ''
    },
    'Proposal': {
      email: true, text: true,
      subj: 'Your proposal from {{Company Name}}',
      ebody: 'Hi {{Name}},\n\nYour proposal for {{Address}} is ready. Please let us know if you have any questions.\n\n{{Company Name}}',
      tbody: 'Hi {{Name}}, your proposal from {{Company Name}} is ready. Check your email for details. Reply STOP to opt out.'
    },
    'Contract': {
      email: true, text: true,
      subj: 'Contract for your project',
      ebody: 'Hi {{Name}},\n\nAttached/linked is your contract for {{Address}}. Let us know if you have questions before signing.\n\n{{Company Name}}',
      tbody: 'Hi {{Name}}, your contract from {{Company Name}} is ready for review. Reply STOP to opt out.'
    },
    'Review': {
      email: true, text: true,
      subj: 'How did we do?',
      ebody: 'Hi {{Name}},\n\nThanks for choosing {{Company Name}}! If you have a minute, we\'d really appreciate a review: ' + reviewLink + '\n\n{{Company Name}}',
      tbody: 'Hi {{Name}}, thanks for choosing {{Company Name}}! Mind leaving us a quick review? ' + reviewLink + ' Reply STOP to opt out.'
    },
    'Follow Up': {
      email: true, text: true,
      subj: 'Quick favor?',
      ebody: 'Hi {{Name}},\n\nJust following up in case you missed our last note — we\'d love it if you could leave us a review: ' + reviewLink + '\n\nThanks again,\n{{Company Name}}',
      tbody: 'Hi {{Name}}, following up — would you leave {{Company Name}} a quick review? ' + reviewLink + ' Reply STOP to opt out.'
    },
    'Close Out': {
      email: false, text: false, subj: '', ebody: '', tbody: ''
    }
  };
  return STAGES.map(function (stage) {
    var r = rows[stage];
    return [stage, r.email, r.subj, r.ebody, r.text, r.tbody];
  });
}
