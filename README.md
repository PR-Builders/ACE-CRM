# Ace Septic & Excavation CRM

A lightweight CRM for Ace Septic & Excavation: a Google Sheet as the
database, and a Google Apps Script backend + HTML/JS frontend as the web
app. Tracks leads from first contact through project close-out, with
automated stage emails/texts, UTM/click-ID ad attribution, call-tracking
integration, Meta Conversions API reporting, and TCPA-aware SMS consent
handling.

See `docs/SETUP.md` for the full build/deploy walkthrough. This section is
a quick orientation to the repo.

## Repo layout

```
src/                     Apps Script project (clasp rootDir)
  appsscript.json        Manifest: web app config, OAuth scopes, timezone
  Constants.gs           Sheet/column names, dropdown option lists
  Config.gs               Script Properties accessors (API keys, etc.)
  Utils.gs                Shared helpers (UUIDs, sheet I/O, templating, hashing)
  SheetSetup.gs           Creates the Leads / Activities / Stage Templates tabs
  Leads.gs                Lead CRUD, pipeline queries, stage/spam/NQ transitions
  Activities.gs           Activity log read/write
  StageAutomation.gs      Looks up Stage Templates and fires email/SMS on stage entry
  Email.gs                MailApp wrapper
  SMS.gs                  Twilio send + STOP/opt-out webhook handling
  MetaCAPI.gs             Meta Conversions API events (Lead/QualifiedLead/Purchase)
  CallTracking.gs         Post-call webhook handling (call-tracking service -> Lead)
  Triggers.gs             Hourly auto-expire + daily follow-up digest triggers
  Reporting.gs            Source/campaign/lost-reason aggregation for Reports view
  Code.gs                 doGet/doPost — web app UI + external webhook router
  Index.html, Stylesheet.html, JavaScript.html   Frontend (kanban pipeline, intake
                                                  form, lead detail panel, reports)

website-snippet/
  utm-capture.js          Drop-in JS for the marketing site: captures utm_*/gclid/fbclid
  disclosure-snippet.html Example contact form using the TCPA submit-button disclosure pattern

docs/
  SETUP.md                Step-by-step build/deploy/test instructions

package.json, .clasp.json.example, .claspignore   clasp (Apps Script CLI) project files
```

## Pipeline stages

`Leads → Site Visit → Estimating → Engineering → Proposal → Contract → Review → Follow Up → Close Out`,
plus the side statuses `Spam` and `Not Qualified` (settable from any stage).

## Quick start

1. `npm install` (installs `clasp` locally).
2. `npx clasp login`.
3. Create the Google Sheet, then create/bind an Apps Script project to it
   and copy its script ID into a real `.clasp.json` (see `.clasp.json.example`).
4. `npm run push` to upload `src/` to the Apps Script project.
5. In the Apps Script editor, run `setupSpreadsheet()` once to build the
   `Leads`, `Activities`, and `Stage Templates` tabs.
6. Set Script Properties (Twilio, Meta, staff digest emails, etc — see
   `docs/SETUP.md`).
7. Run `installTriggers()` once to schedule the hourly auto-expire and
   daily follow-up digest jobs.
8. Deploy as a Web App (`npm run deploy`, or via the editor's Deploy menu)
   and use the resulting `/exec` URL both for staff (open it directly) and
   for the website form / call-tracking webhook (`doPost`).

Full details, including Twilio/Meta/call-tracking account setup and the
end-to-end test checklist, are in `docs/SETUP.md`.
