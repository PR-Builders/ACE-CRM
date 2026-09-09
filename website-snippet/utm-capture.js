/**
 * Ace Septic & Excavation — website attribution capture.
 *
 * Include this on every page (e.g. in the site footer template) BEFORE any
 * contact form. It reads utm_source/utm_medium/utm_campaign/gclid/fbclid
 * from the landing URL, persists them across page views in sessionStorage,
 * and stamps them into any form with data-ace-lead-form onto hidden inputs
 * so they're included in the POST to the CRM's Apps Script Web App.
 *
 * Usage on the contact form:
 *   <form data-ace-lead-form action="https://script.google.com/macros/s/XXXX/exec" method="POST">
 *     ...
 *   </form>
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

  function wireForms() {
    var attribution = getStoredAttribution();
    document.querySelectorAll('[data-ace-lead-form]').forEach(function (form) {
      stampHiddenFields(form, attribution);
    });
  }

  captureFromUrl();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireForms);
  } else {
    wireForms();
  }
})();
