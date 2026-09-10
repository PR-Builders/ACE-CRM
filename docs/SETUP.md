# Setup & Deployment Guide

This walks through turning the code in `src/` into a working, deployed CRM.
Steps 1–8 get you a working internal tool with no paid dependencies. Steps
9+ add texting, ad-platform reporting, and call attribution, each of which
needs a third-party account.

## 1. Create the Google Sheet

Create a new blank Google Sheet (e.g. "Ace Septic & Excavation CRM"). You
don't need to add any tabs or headers by hand — `setupSpreadsheet()`
(step 3 below) builds `Leads`, `Activities`, and `Stage Templates` for you,
including dropdown validation and default automated-message templates.

## 2. Create the Apps Script project and set up clasp

```bash
npm install
npx clasp login                     # opens a browser to authorize clasp
```

From the Sheet: **Extensions → Apps Script** opens a bound script project.
Copy its Script ID from **Project Settings**, then:

```bash
cp .clasp.json.example .clasp.json
# edit .clasp.json and paste the real scriptId
npm run push
```

(Alternatively `npx clasp create --type webapp --rootDir src` creates a new
bound script and writes `.clasp.json` for you — then re-bind it to your
Sheet's container if it wasn't created from within the Sheet.)

## 3. Run first-time setup

In the Apps Script editor, select the `setupSpreadsheet` function and click
**Run** (you'll be asked to authorize the script's scopes the first time).
This creates the three tabs described in the CRM spec and seeds
`Stage Templates` with a starting set of subject/body text for Site Visit,
Estimating, Proposal, Contract, Review, and Follow Up — edit the copy in
the Sheet directly; no code changes needed for wording tweaks.

## 4. Configure Script Properties

**Project Settings → Script Properties** in the Apps Script editor:

| Property | Required for | Example |
|---|---|---|
| `COMPANY_NAME` | Meta events / email footer | `Ace Septic & Excavation` |
| `COMPANY_PHONE` | disclosure text | `(970) 555-0000` |
| `PRIVACY_POLICY_URL` | disclosure text | `https://acesepticco.com/privacy` |
| `REVIEW_LINK` | Review/Follow Up stage templates | your Google review short link |
| `FROM_EMAIL` | sending as a custom address | `leads@acesepticco.com` (optional — see below) |
| `FROM_NAME` | sender display name | `Ace Septic & Excavation` (optional, defaults to `COMPANY_NAME`) |
| `SMS_DISCLOSURE_VERSION` | consent audit trail | `v1` |
| `STAFF_DIGEST_EMAILS` | daily follow-up digest | `staff@acesepticco.com,owner@acesepticco.com` |
| `TWILIO_ACCOUNT_SID` | SMS sending | from Twilio console |
| `TWILIO_AUTH_TOKEN` | SMS sending | from Twilio console |
| `TWILIO_FROM_NUMBER` | SMS sending | `+19705551234` |
| `META_PIXEL_ID` | Meta CAPI | Events Manager → Dataset ID |
| `META_ACCESS_TOKEN` | Meta CAPI | Events Manager → generate access token |
| `META_API_VERSION` | Meta CAPI | `v21.0` (optional, has a default) |
| `META_TEST_EVENT_CODE` | Meta CAPI testing | Events Manager → Test Events tab (optional) |
| `CALL_TRACKING_NUMBER_MAP` | call attribution | JSON, see below |
| `WEBHOOK_SHARED_SECRET` | call webhook auth | any random string |

`CALL_TRACKING_NUMBER_MAP` example — maps each tracking number to the
source it represents:

```json
{
  "+19705551111": {"source": "Ads", "sourceDetail": "Google Call Extension", "utmSource": "google"},
  "+19705552222": {"source": "Ads", "sourceDetail": "Meta Call Button", "utmSource": "facebook"}
}
```

Everything works with these left unset except the features that need
them — e.g. skip the Twilio/Meta rows entirely if you're not ready to turn
on texting or ad reporting yet; `runStageAutomation_`/`sendMetaEvent_`
no-op (and log why) when their config is missing.

### Sending emails from a custom address

By default, stage-automation and digest emails are sent as whichever Google
account authorized/deployed the script (e.g. whoever ran `clasp login` and
owns the deployment) — so if that's your `@pr.builders` account, emails go
out from that address. To send as something like `leads@acesepticco.com`
instead:

1. In **that same Google account's** Gmail (not Ace's — the account the
   script runs as): **Settings → Accounts → Send mail as → Add another
   email address**, enter `leads@acesepticco.com`, and complete Google's
   verification (it emails a confirmation link to that address).
2. Set the `FROM_EMAIL` Script Property to that address, and optionally
   `FROM_NAME` (e.g. `Ace Septic & Excavation`) for the display name.
3. Re-run `clasp push` if you haven't already picked up this change, and
   re-authorize the script when prompted — sending as an alias needs the
   `gmail.send` scope instead of the more restricted mail-only scope.

If that verification step isn't done first, `GmailApp.sendEmail` will
silently fall back to sending as the authorizing account instead of
`FROM_EMAIL`. The most reliable long-term fix is deploying this whole
project from an actual `@acesepticco.com` Google account (Workspace or
plain Gmail) instead of an alias on a `pr.builders` one — then it's just
naturally the sending address, no alias dance required. If Ace doesn't
have their own Google account for this yet and you want it to look fully
independent from PR Builders (matching SPF/DKIM and everything), the more
robust route is a transactional email service (SendGrid, Postmark,
Mailgun) called via `UrlFetchApp` instead of `GmailApp` — a larger change
than what's built here, and only worth it if alias-based sending causes
deliverability problems (e.g. landing in spam) in practice.

## 5. Install the time-driven triggers

Run `installTriggers()` once from the editor. This schedules:
- `autoExpireCallLeads` — hourly
- `sendFollowUpDigest` — daily at 7am (script timezone, set to
  `America/Denver` in `appsscript.json`)

Re-running `installTriggers()` is safe — it clears old copies first.

## 6. Deploy as a Web App

**Deploy → New deployment → Web app** (or `npm run deploy`):
- Execute as: **User deploying** (bound to your Google Workspace account so
  `MailApp`/`SpreadsheetApp` run with proper access)
- Who has access: your organization's domain (already set in
  `appsscript.json`; loosen to "Anyone" only if you intend the `/exec` URL
  itself to be hit anonymously by the public website/webhooks — anyone with
  the URL can still only trigger `doPost`, since `doGet` just serves the
  staff UI page)

Copy the deployment's `/exec` URL — staff use it directly for the app UI,
and it's also the POST target for the website form and any webhooks.

## 7. Wire up the website

Add `website-snippet/utm-capture.js` to the marketing site (e.g. in the
footer, loaded on every page). Build the contact form using the pattern in
`website-snippet/disclosure-snippet.html`:
- `data-ace-lead-form` attribute + hidden `utm_source`/`utm_medium`/
  `utm_campaign`/`gclid`/`fbclid` inputs (the snippet fills these in)
- `action` pointed at your `/exec` URL
- the TCPA submit-button disclosure paragraph directly under the Submit
  button, with your real phone number and Privacy Policy link swapped in

Requires your Google/Meta ad campaigns to use UTM-tagged destination URLs
(a setup step in each ad platform, not in this repo).

## 8. Set up call tracking (optional, paid)

1. Sign up for a call-tracking service (CallRail, WhatConverts,
   CallTrackingMetrics, etc).
2. Get tracking numbers for Google Ads call extensions and Meta's Call Now
   button (and optionally dynamic number insertion on the website).
3. Configure the service to forward calls to your real business line.
4. Add each tracking number to `CALL_TRACKING_NUMBER_MAP` (step 4).
5. Configure the service's post-call webhook to POST to your `/exec` URL
   with `type=call_webhook`, the caller's number as `CallerNumber`, the
   dialed tracking number as `TrackingNumber`, and `secret=<WEBHOOK_SHARED_SECRET>`.
   Field names vary by provider — `handleCallWebhook_` in `CallTracking.gs`
   also accepts `From`/`To` and snake_case variants; add an alias there if
   your provider uses something else.

Without a call-tracking service, staff can still log calls manually via
**New Lead** in the app UI and pick the right Source themselves.

## 9. Register your SMS Brand/Campaign

Before sending any automated text in production, register a Brand and
Campaign with The Campaign Registry through Twilio (Twilio Console →
Messaging → Regulatory Compliance). Skipping this gets messages filtered
or blocked by carriers. This is unrelated to code changes here — it's an
account-level step on Twilio's side.

## 10. Meta Conversions API (optional)

1. In Meta Events Manager, create a Dataset (Pixel) and generate a
   Conversions API access token.
2. Set `META_PIXEL_ID`/`META_ACCESS_TOKEN` (step 4).
3. Events fire automatically:
   - `Lead` — new lead created with an `FBCLID` present (`Leads.gs createLead`)
   - `QualifiedLead` — lead reaches Estimating or Proposal (`Leads.gs updateLeadStage`)
   - `Purchase` — lead reaches Close Out, valued at `Actual Value`
4. Matching uses `FBCLID` when present, else SHA-256-hashed email/phone
   (`MetaCAPI.gs sha256Hex_` — raw PII is never sent).
5. Use `META_TEST_EVENT_CODE` and the Events Manager Test Events tab to
   verify events land before removing it.

A Google Ads equivalent (Enhanced Conversions / offline conversion import
via the stored `GCLID`) can be added the same way later — it isn't built
here, since it needs a Google Ads API/OAuth setup of its own.

## TCPA / SMS compliance notes

This is not legal advice — confirm specifics with an attorney before
sending automated texts. What's implemented here:

- **Website leads**: submitting the form itself is the consent action
  (submit-button disclosure pattern, see `website-snippet/disclosure-snippet.html`).
  `createLead(..., viaWebsite=true)` sets `SMS Consent = Yes` and logs an
  Activity with a timestamp and the live `SMS_DISCLOSURE_VERSION`.
- **Phone-in leads**: `SMS Consent` defaults to `Not Asked`; no automated
  text goes out (`StageAutomation.gs` checks this before every send).
  Staff use the **Confirm verbal consent** button in the lead detail panel
  (`setSmsConsentVerbal`) once they've asked and gotten a yes on the call.
- **Opt-out**: `SMS.gs handleSmsOptOutWebhook_` flips `SMS Consent` to `No`
  on a Twilio Advanced Opt-Out event or a STOP-equivalent inbound message,
  so no future automation — regardless of trigger — texts that lead again.
  Point Twilio's inbound-message webhook at your `/exec` URL to wire this up.
- **Documentation**: the `SMS Consent` field plus the Activities log
  entries described above are the audit trail if consent is ever challenged.

## Testing checklist (do this before going live)

- [ ] Create a lead manually via **New Lead** — confirm it lands in the
      `Leads` sheet with Stage=Leads, Status=Active.
- [ ] Create a lead via a UTM-tagged test link to your website form —
      confirm Source=Ads, Source Detail=campaign, UTM/click-ID columns
      populate, and SMS Consent=Yes with a matching Activity log entry.
- [ ] Submit the website form with no UTM params — confirm Source falls
      back to Website.
- [ ] POST a test payload shaped like your call-tracking provider's webhook
      — confirm a placeholder Lead is created with Contact Method=Call,
      correct Source from `CALL_TRACKING_NUMBER_MAP`, blank Name/Email.
- [ ] Move a lead through each stage in the app UI — confirm the matching
      Stage Templates email/text fires (check `Activities`), and that a
      text is correctly *skipped* (with a logged reason) when SMS Consent
      isn't Yes.
- [ ] Click Spam and Not Qualified on separate test leads — confirm they
      drop out of the Pipeline view, Not Qualified prompts for and records
      a Lost Reason, and both log an Activity.
- [ ] Set a `Next Follow-Up Date` in the past, run `sendFollowUpDigest`
      manually from the editor — confirm the digest email arrives.
- [ ] Create a Call-lead placeholder, backdate its `Created Date` 37+
      hours (edit the cell directly for the test), run
      `autoExpireCallLeads` manually — confirm it logs an `Auto-Removed`
      Activity and then deletes the row.
- [ ] With `META_ACCESS_TOKEN`/`META_TEST_EVENT_CODE` set, move a lead to
      Estimating and to Close Out — confirm both events show up in Meta
      Events Manager's Test Events tab.
- [ ] Check the **Reports** tab — confirm counts, conversion rate, and
      total Actual Value roll up correctly per Source/Campaign, and that
      Lost Reasons break out separately.
