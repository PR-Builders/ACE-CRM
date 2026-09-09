/**
 * Shared constants for the Ace Septic & Excavation CRM.
 * Apps Script concatenates all .gs files into one global scope, so these
 * are available from every other file without an import.
 */

var LEADS_SHEET = 'Leads';
var ACTIVITIES_SHEET = 'Activities';
var STAGE_TEMPLATES_SHEET = 'Stage Templates';

var LEAD_HEADERS = [
  'Lead ID', 'Name', 'Email', 'Phone', 'Address', 'Source', 'Source Detail',
  'Contact Method', 'Estimated Value', 'Actual Value', 'Lost Reason',
  'Next Follow-Up Date', 'SMS Consent', 'UTM Source', 'UTM Medium',
  'UTM Campaign', 'GCLID', 'FBCLID', 'Stage', 'Status', 'Assigned To',
  'Created Date', 'Last Updated', 'Notes'
];

var ACTIVITY_HEADERS = ['Activity ID', 'Lead ID', 'Type', 'Detail', 'Timestamp', 'Staff'];

var STAGE_TEMPLATE_HEADERS = [
  'Stage', 'Send Email', 'Email Subject', 'Email Body', 'Send Text', 'Text Body'
];

var STAGES = [
  'Leads', 'Site Visit', 'Estimating', 'Engineering', 'Proposal',
  'Contract', 'Review', 'Follow Up', 'Close Out'
];

var STATUSES = ['Active', 'Spam', 'Not Qualified', 'Closed'];

var SOURCES = ['Sign', 'Ads', 'Referral', 'Website', 'Repeat Client', 'Other'];

var CONTACT_METHODS = ['Form', 'Call'];

var LOST_REASONS = ['Out of Service Area', 'Budget', 'Wrong Job Type', 'Timing', 'Other'];

var SMS_CONSENT_VALUES = ['Yes', 'No', 'Not Asked'];

var ACTIVITY_TYPES = [
  'Stage Change', 'Email Sent', 'Text Sent', 'Manual Note',
  'Spam Flag', 'Not Qualified Flag', 'Auto-Removed'
];

// Stages at which a Meta Conversions API "QualifiedLead" signal fires.
var META_QUALIFIED_STAGES = ['Estimating', 'Proposal'];

var CALL_PLACEHOLDER_EXPIRY_HOURS = 36;
