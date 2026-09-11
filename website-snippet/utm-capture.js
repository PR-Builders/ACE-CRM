/**
 * Ace Septic & Excavation — website attribution capture + lead form submit.
 *
 * Include this on every page (e.g. in the site footer template) BEFORE any
 * contact form. It does two things to any <form data-ace-lead-form>:
 *
 * 1. Attribution: reads utm_source/utm_medium/utm_campaign/gclid/fbclid from
 *    the landing URL, persists them across page views in sessionStorage (so
 *    they survive a visitor browsing a few pages before submitting), and
 *    stamps them into hidden inputs on the form.
 * 2. Submit handling: intercepts submit and POSTs via fetch() instead of a
 *    plain HTML form post. A plain POST to the Apps Script /exec URL would
 *    navigate the visitor away from your site to a bare JSON response page
 *    — fetch() keeps them on the page and lets you show a real "thanks"
 *    message instead.
 *
 * Usage on the contact form:
 *   <form data-ace-lead-form action="https://script.google.com/macros/s/XXXX/exec" method="POST">
 *     ...
 *     <div data-ace-form-status></div>
 *   </form>
 *
 * Note on error detection: Apps Script Web Apps can't send CORS headers, so
 * the fetch below uses mode:"no-cors" — the response body/status can't be
 * read cross-origin, only whether the network request itself succeeded or
 * failed. That's enough to catch "visitor is offline" but not an
 * application-level rejection from the CRM (e.g. a required field it
 * considers missing) — so this relies on the form's own `required`
 * attributes to catch that before it ever sends. Keep Name/Email/Phone
 * marked required in your HTML.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ace_attribution';
  var TRACKED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'];

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var hasAny = false;
    TRACKED_PARAMS.forEach(function (key) {
      var value = params.get(key);
      if (value) { found[key] = value; hasAny = true; }
    });
    if (hasAny) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found)); } catch (e) { /* storage unavailable */ }
    }
  }

  function getStoredAttribution() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function stampHiddenFields(form, attribution) {
    TRACKED_PARAMS.forEach(function (key) {
      var input = form.querySelector('input[name="' + key + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        form.appendChild(input);
      }
      input.value = attribution[key] || '';
    });
  }

  function setStatus(form, message, isError) {
    var el = form.querySelector('[data-ace-form-status]');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#b3261e' : '#2E3D35';
  }

  function handleSubmit(e) {
    var form = e.target;
    e.preventDefault();

    if (!form.reportValidity()) return; // native HTML5 validation (required/type=email/etc)

    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    var originalLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
    setStatus(form, '', false);

    // The page the form was actually submitted from — passed through to the
    // CRM so a Meta Conversions API "Lead" event (when an fbclid is present)
    // can be tagged action_source="website" with this as event_source_url,
    // instead of the less-specific "system_generated".
    var formData = new FormData(form);
    formData.set('landing_url', window.location.href);

    fetch(form.action, { method: 'POST', mode: 'no-cors', body: formData })
      .then(function () {
        setStatus(form, "Thanks - we've got your request and will be in touch soon.", false);
        form.reset();
        // Attribution fields were just cleared by reset() — restore them for any next submit this session.
        stampHiddenFields(form, getStoredAttribution());
      })
      .catch(function () {
        setStatus(form, "Something went wrong sending that — please call us instead, or try again.", true);
      })
      .then(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      });
  }

  function wireForms() {
    var attribution = getStoredAttribution();
    document.querySelectorAll('[data-ace-lead-form]').forEach(function (form) {
      stampHiddenFields(form, attribution);
      form.addEventListener('submit', handleSubmit);
    });
  }

  captureFromUrl();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireForms);
  } else {
    wireForms();
  }
})();
