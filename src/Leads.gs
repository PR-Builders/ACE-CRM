/**
 * Lead CRUD, pipeline queries, and the stage/status transitions that drive
 * the rest of the automation (email/SMS templates, Meta CAPI, reporting).
 */

/**
 * Creates a new lead.
 * @param {Object} data Fields from the intake form, website POST, or call-tracking webhook.
 * @param {boolean} viaWebsite When true, applies UTM/gclid/fbclid attribution
 *   auto-detection and the submit-button-disclosure SMS consent capture.
 */
function createLead(data, viaWebsite) {
  var isCallPlaceholder = data['Contact Method'] === 'Call';
  if (!isCallPlaceholder) {
    ['Name', 'Email', 'Phone'].forEach(function (field) {
      if (isBlank_(data[field])) throw new Error(field + ' is required.');
    });
  } else if (isBlank_(data.Phone)) {
    throw new Error('Phone is required.');
  }

  var lead = {
    'Lead ID': generateId_(),
    'Name': data.Name || '',
    'Email': data.Email || '',
    'Phone': data.Phone || '',
    'Address': data.Address || '',
    'Source': data.Source || 'Other',
    'Source Detail': data['Source Detail'] || '',
    'Contact Method': data['Contact Method'] || 'Form',
    'Estimated Value': data['Estimated Value'] || '',
    'Actual Value': '',
    'Lost Reason': '',
    'Next Follow-Up Date': data['Next Follow-Up Date'] || '',
    'SMS Consent': data['SMS Consent'] || 'Not Asked',
    'UTM Source': data['UTM Source'] || '',
    'UTM Medium': data['UTM Medium'] || '',
    'UTM Campaign': data['UTM Campaign'] || '',
    'GCLID': data['GCLID'] || '',
    'FBCLID': data['FBCLID'] || '',
    'Stage': 'Leads',
    'Status': 'Active',
    'Assigned To': data['Assigned To'] || '',
    'Created Date': new Date(),
    'Last Updated': new Date(),
    'Notes': data.Notes || ''
  };

  if (viaWebsite) {
    applyWebsiteAttribution_(lead);
  }

  var sheet = getSheet_(LEADS_SHEET);
  sheet.appendRow(objectToRow_(LEAD_HEADERS, lead));

  logActivity_(lead['Lead ID'], 'Stage Change', 'Lead created, entered stage: Leads', viaWebsite ? '' : (data['Assigned To'] || ''));

  if (viaWebsite) {
    logActivity_(lead['Lead ID'], 'Manual Note',
      'SMS consent captured via submit-button disclosure (version ' + getConfig_().smsDisclosureVersion + ') at ' + lead['Created Date'],
      '');
  }

  runStageAutomation_(lead, 'Leads');

  if (lead['FBCLID']) {
    sendMetaEvent_(lead, 'Lead');
  }

  return lead;
}

/** Website form submissions: auto-detect Source from UTM/click-ID data, else fall back to "Website". */
function applyWebsiteAttribution_(lead) {
  var hasUtmData = lead['UTM Source'] || lead['UTM Campaign'] || lead['GCLID'] || lead['FBCLID'];
  if (hasUtmData) {
    lead['Source'] = 'Ads';
    lead['Source Detail'] = lead['UTM Campaign'] || lead['Source Detail'];
  } else if (isBlank_(lead['Source Detail']) && lead['Source'] !== 'Ads') {
    lead['Source'] = 'Website';
  }
  // Form submission itself is the TCPA-compliant consent action (submit-button disclosure pattern).
  lead['SMS Consent'] = 'Yes';
}

function getLead(leadId) {
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  return serializeDates_({ lead: found.obj, activities: getActivitiesForLead(leadId) });
}

/** All leads, any status — feeds the flat, searchable Leads table view. */
function getLeadsList() {
  return serializeDates_(getAllLeads_());
}

function getAllLeads_() {
  var sheet = getSheet_(LEADS_SHEET);
  var headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) { return rowToObject_(headers, row); });
}

/** Kanban data: active leads grouped by stage, with a days-in-stage figure per card. */
function getPipelineData() {
  var leads = getAllLeads_().filter(function (l) { return l.Status === 'Active'; });
  var board = {};
  STAGES.forEach(function (s) { board[s] = []; });

  leads.forEach(function (lead) {
    var card = {
      'Lead ID': lead['Lead ID'],
      'Name': lead.Name,
      'Phone': lead.Phone,
      'Source': lead.Source,
      'Stage': lead.Stage,
      'Estimated Value': lead['Estimated Value'],
      'Assigned To': lead['Assigned To'],
      'Next Follow-Up Date': lead['Next Follow-Up Date'],
      'daysInStage': daysInStage_(lead)
    };
    if (board[lead.Stage]) board[lead.Stage].push(card);
  });
  return serializeDates_(board);
}

function daysInStage_(lead) {
  var activities = getActivitiesForLead(lead['Lead ID']);
  var lastStageChange = activities.find(function (a) { return a.Type === 'Stage Change'; });
  var since = lastStageChange ? lastStageChange.Timestamp : lead['Created Date'];
  return Math.max(0, Math.floor((new Date() - new Date(since)) / (1000 * 60 * 60 * 24)));
}

function getFilteredLeads(status) {
  return getAllLeads_().filter(function (l) { return l.Status === status; });
}

/** Advances (or moves) a lead to a new pipeline stage and fires the associated automation. */
function updateLeadStage(leadId, newStage, staff) {
  if (STAGES.indexOf(newStage) === -1) throw new Error('Unknown stage: ' + newStage);
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);

  var oldStage = found.obj.Stage;
  found.obj.Stage = newStage;
  found.obj['Last Updated'] = new Date();
  if (newStage === 'Close Out') found.obj.Status = 'Closed';
  writeLeadRow_(found);

  logActivity_(leadId, 'Stage Change', 'Moved from ' + oldStage + ' to ' + newStage, staff || '');

  runStageAutomation_(found.obj, newStage);

  if (META_QUALIFIED_STAGES.indexOf(newStage) !== -1) {
    sendMetaEvent_(found.obj, 'QualifiedLead');
  }
  if (newStage === 'Close Out') {
    sendMetaEvent_(found.obj, 'Purchase', found.obj['Actual Value']);
  }

  return found.obj;
}

function flagSpam(leadId, staff) {
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  found.obj.Status = 'Spam';
  found.obj['Last Updated'] = new Date();
  writeLeadRow_(found);
  logActivity_(leadId, 'Spam Flag', 'Marked as Spam', staff || '');
  return found.obj;
}

function flagNotQualified(leadId, lostReason, staff) {
  if (LOST_REASONS.indexOf(lostReason) === -1) throw new Error('Unknown Lost Reason: ' + lostReason);
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  found.obj.Status = 'Not Qualified';
  found.obj['Lost Reason'] = lostReason;
  found.obj['Last Updated'] = new Date();
  writeLeadRow_(found);
  logActivity_(leadId, 'Not Qualified Flag', 'Marked Not Qualified — Lost Reason: ' + lostReason, staff || '');
  return found.obj;
}

/** Staff confirms SMS consent verbally on a phone-in lead (no web form to log a click). */
function setSmsConsentVerbal(leadId, staff) {
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  found.obj['SMS Consent'] = 'Yes';
  found.obj['Last Updated'] = new Date();
  writeLeadRow_(found);
  logActivity_(leadId, 'Manual Note', 'Verbal SMS consent confirmed by staff at ' + new Date(), staff || '');
  return found.obj;
}

/** Generic patch for fields staff edit directly (Notes, Next Follow-Up Date, values, etc). */
function updateLeadFields(leadId, fields, staff) {
  var found = findLeadRow_(leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  Object.keys(fields).forEach(function (key) {
    if (LEAD_HEADERS.indexOf(key) !== -1 && key !== 'Lead ID') found.obj[key] = fields[key];
  });
  found.obj['Last Updated'] = new Date();
  writeLeadRow_(found);
  if (fields.Notes !== undefined) logActivity_(leadId, 'Manual Note', fields.Notes, staff || '');
  return found.obj;
}

function deleteLeadRow_(leadId) {
  var found = findLeadRow_(leadId);
  if (!found) return false;
  found.sheet.deleteRow(found.rowIndex);
  return true;
}
