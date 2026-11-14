/* Site actions: the contact form and the first-party page view.
 *
 * <script src="/assets/site-actions.js" data-pulse-lead="/api/lead" data-pulse-event="/api/event" defer></script>
 *
 * The contact form posts to the service, which stores the enquiry and (when email
 * is switched on) sends it to contact@pulse-branding.com. If the service cannot be
 * reached, the visitor still gets a mailto draft rather than a dead button.
 */
(function () {
  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  var CFG = window.PULSE_AI || {};
  var SERVICE = CFG.service || '';
  var LEAD = SERVICE + ((script && script.dataset.pulseLead) || CFG.lead || '/api/lead');
  var EVENT = SERVICE + ((script && script.dataset.pulseEvent) || CFG.event || '/api/event');
  var ADMIN = 'contact@pulse-branding.com';

  function status(node, text, kind) {
    if (!node) return;
    node.textContent = text;
    node.setAttribute('data-state', kind || 'info');
  }

  /* ---- page view: one beacon, no cookies, no third party ---- */
  try {
    var body = JSON.stringify({path: location.pathname, referrer: document.referrer || ''});
    if (navigator.sendBeacon) {
      /* A beacon cannot perform a CORS preflight, so a cross-origin beacon declared as
         application/json never leaves the browser. text/plain is a safelisted type: no
         preflight, and the service parses the body whatever the header says. */
      navigator.sendBeacon(EVENT, new Blob([body], {type: 'text/plain;charset=UTF-8'}));
    } else {
      fetch(EVENT, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: body, keepalive: true});
    }
  } catch (error) { /* analytics must never break a page */ }

  /* ---- contact form ---- */
  var form = document.querySelector('form[data-contact-form]') || document.querySelector('.contact-form');
  if (!form) return;
  var note = document.querySelector('[data-contact-status]') || form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"], button');

  function value(name) {
    var field = form.querySelector('[name="' + name + '"]');
    return field ? String(field.value || '').trim() : '';
  }

  function mailtoHref() {
    var subject = 'Website enquiry — ' + (value('company') || value('name') || 'new enquiry');
    var body = ['Name: ' + value('name'), 'Email: ' + value('email'), 'Company: ' + value('company'),
                '', value('message')].join('\n');
    return 'mailto:' + ADMIN + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);
  }

  /* The mailto draft is an action the visitor chooses, not a redirect. Navigating to
     mailto: at the moment of failure would carry the page away before the failure could
     be read, so the failure is stated first and the fallback is offered as a link. */
  var fallback = document.querySelector('[data-contact-fallback]');
  var fallbackLink = document.querySelector('[data-contact-fallback-link]');

  function offerFallback(message) {
    status(note, message, 'error');
    if (!fallback) return;
    if (fallbackLink) fallbackLink.setAttribute('href', mailtoHref());
    fallback.hidden = false;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = value('email');
    if (!value('name') || !email || !value('message')) {
      status(note, 'Name, email and a short message are needed so the reply can reach you.', 'error');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
      status(note, 'That email address does not look right.', 'error');
      return;
    }
    if (button) button.disabled = true;
    status(note, 'Sending');
    fetch(LEAD, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify({name: value('name'), email: email, company: value('company'),
                            note: value('message'), source: 'contact', audit_id: document.body.dataset.auditId || ''})
    }).then(function (response) {
      return response.json().then(function (data) { return {ok: response.ok, data: data}; });
    }).then(function (result) {
      if (button) button.disabled = false;
      if (!result.ok) {
        if (fallback) fallback.hidden = true;
        offerFallback((result.data && result.data.error) ||
          'The server did not accept that just now. Nothing was sent.');
        return;
      }
      form.reset();
      if (fallback) fallback.hidden = true;
      status(note, 'Thank you. We reply within one working day. If it is urgent, write to ' + ADMIN + '.', 'ok');
    }).catch(function () {
      if (button) button.disabled = false;
      offerFallback('No connection to the server just now. Nothing was sent.');
    });
  });
})();
