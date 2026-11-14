/* Forms that do not lose what a person typed.
 *
 * The template's two forms are Framer form components with no endpoint: submitting
 * either one navigates to the same URL, so the page reloads, the fields clear and
 * the inquiry or email address is gone — no message, no error, nothing to see.
 * This file takes the submit, keeps the values and gives an honest status:
 *
 *   - with an endpoint (window.__PULSE_FORMS__.endpoint, or a <form data-endpoint="…">),
 *     it POSTs a flat JSON payload to Formspree and reports success or failure;
 *   - without one (no configuration, or the request did not go through), it offers
 *     a prefilled mailto the visitor can send in one click, and keeps every value
 *     on the page. Nothing is invented, nothing is discarded.
 *
 * The forms are Framer components, so hydration can replace the node and take the
 * listener with it; wire() is therefore idempotent and re-runs on mutations.
 */
(function () {
  'use strict';

  var EMAIL = 'contact@pulse-branding.com';
  var cfg = window.__PULSE_FORMS__ || {};
  var MAX_AGE = 10000;

  /* The captured template form still has Framer's own form backend behind it: pressing
     the button makes the bundle POST the visitor's details to
     api.framer.com/forms/<id>/submit — the template author's project, not Pulse
     Branding. Our handler runs after Framer's (its listener was registered first), so
     the only reliable place to stop that request is the network call itself. Answer it
     locally: nothing leaves for a third party, and Framer has no failed request to
     complain about behind our own status line. */
  function guardFramer() {
    if (window.__pulseFramerGuarded) return;
    window.__pulseFramerGuarded = true;
    var realFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/^https?:\/\/api\.framer\.com\/forms\//i.test(url)) {
        return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return realFetch.apply(this, arguments);
    };
  }

  /* One click can reach submit() twice (Framer's handler and ours both see the button,
     and the native form event still fires), which would send the same inquiry as two
     submissions. The busy flag covers the in-flight case; this covers the case where
     the two paths run a moment apart. */
  /* A native submission (formSubmissionGet at the CDP level) survived preventDefault on both the
     click and the submit event, so some path in the template calls the native submit directly.
     Guard the prototype itself: for our two forms it becomes our own send, for everything else
     it stays the platform's. */
  var nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    var name = this.getAttribute('data-framer-name') || '';
    if (/Contact Form|Newsletter Form/.test(name)) {
      if (!this.__pulseBusy) submit(this);
      return;
    }
    return nativeSubmit.apply(this, arguments);
  };

  var lastSend = { form: null, at: 0 };

  function statusOf(form) {
    var node = document.querySelector('.pulse-form-status');
    if (node) return node;
    node = document.createElement('p');
    node.className = 'pulse-form-status';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
      'z-index:9999', 'margin:0', 'max-width:min(560px, calc(100vw - 32px))',
      'padding:12px 18px', 'border-radius:10px', 'font-size:14px', 'line-height:1.55',
      'background:rgba(18,22,28,0.96)', 'color:#e9eef4',
      'border:1px solid rgba(233,238,244,0.18)',
      'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'box-sizing:border-box'
    ].join(';');
    document.body.appendChild(node);
    return node;
  }

  function say(form, html) {
    var node = statusOf(form);
    node.innerHTML = html;
    node.style.display = 'block';
  }

  function valueOf(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && el.value ? String(el.value).trim() : '';
  }

  /* The form carries a dozen zero-size helper inputs (Framer's CMS form plumbing);
     only the fields a person can see and type into belong in the email. */
  function fields(form) {
    return Array.prototype.slice
      .call(form.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea'))
      .filter(function (el) {
        if (!el.name) return false;
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map(function (el) {
        return { label: el.name, value: String(el.value || '').trim() };
      })
      .filter(function (f) { return f.value; });
  }

  function mailtoFor(form) {
    var isNews = form.getAttribute('data-framer-name') === 'Newsletter Form';
    var subject = isNews ? 'Newsletter — Pulse Branding' : 'Project inquiry — Pulse Branding';
    var lines = isNews
      ? ['Please add me to the Pulse Branding newsletter.', 'Email: ' + (valueOf(form, 'Email') || valueOf(form, 'email') || '')]
      : fields(form).map(function (f) { return f.label + ': ' + f.value; });
    var body = lines.join('\n');
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body + '\n\n— sent from pulse-branding.com');
  }

  function endpointOf(form) {
    return form.getAttribute('data-endpoint') || cfg.endpoint || '';
  }

  /* Formspree reads a flat JSON body: `email` is the address a reply goes to,
     `_replyto` repeats it so the notification can answer the visitor directly,
     `_subject` is the line that arrives in the inbox, and every other key becomes a
     labelled row of the submission. The template's fields are already named for people
     ("Project Type"), so they keep their names — a JSON key may contain a space and the
     dashboard shows it as written. */
  function payloadFor(form) {
    var isNews = form.getAttribute('data-framer-name') === 'Newsletter Form';
    var payload = {
      form: form.getAttribute('data-framer-name'),
      page: location.pathname,
      _subject: isNews ? 'Newsletter — Pulse Branding' : 'Project inquiry — Pulse Branding',
    };
    fields(form).forEach(function (f) {
      var key = f.label === 'Email' || f.label === 'email' ? 'email' : f.label;
      if (key === 'email') payload._replyto = f.value;
      payload[key] = f.value;
    });
    if (isNews && !payload.message) {
      payload.message = 'Please add me to the Pulse Branding newsletter.';
    }
    return payload;
  }

  function setBusy(form, busy) {
    var button = form.querySelector('button[type="submit"], button');
    if (!button) return;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    button.disabled = !!busy;
    if (busy) button.style.setProperty('opacity', '0.65', 'important');
    else button.style.removeProperty('opacity');
  }

  /* Framer's button component switches itself to its "Pending" variant on click and waits
     for a response the template has no endpoint to give, so the button stays grey at 60%
     opacity and, in the earlier build, said "Sending…" forever. We keep its original label
     and put the button back (variant, label, opacity) whenever it is left pending and no
     request of ours is actually in flight. */
  function settle(form) {
    var button = form.querySelector('button[type="submit"], button');
    if (!button) return;
    var variant = button.getAttribute('data-framer-name') || '';
    if (/pending|sending/i.test(variant)) button.setAttribute('data-framer-name', 'Default');
    var label = button.querySelector('[data-framer-name="Label"]') || button;
    if (form.__pulseLabel && /sending|please wait/i.test(label.textContent || '')) {
      label.textContent = form.__pulseLabel;
    }
    if (!form.__pulseBusy) {
      // Framer's press animation keeps writing opacity inline for over a second after the
      // click, so a plain assignment is overwritten; !important ends the argument.
      button.style.setProperty('opacity', '1', 'important');
      button.style.willChange = '';
      button.removeAttribute('aria-busy');
    }
  }

  function settleSoon(form) {
    settle(form);
    var button = form.querySelector('button[type="submit"], button');
    if (!button) return;
    if (!form.__pulseSettler) {
      form.__pulseSettler = new MutationObserver(function () {
        if (form.__pulseBusy) return;
        if (/pending|sending/i.test(button.getAttribute('data-framer-name') || '')) {
          button.setAttribute('data-framer-name', 'Default');
        }
        if (button.style.getPropertyValue('opacity') !== '1' || button.style.getPropertyPriority('opacity') !== 'important') {
          button.style.setProperty('opacity', '1', 'important');
        }
      });
      form.__pulseSettler.observe(button, { attributes: true, attributeFilter: ['style', 'data-framer-name'] });
    }
    clearTimeout(form.__pulseSettleTimer);
    form.__pulseSettleTimer = setTimeout(function () {
      if (form.__pulseSettler) form.__pulseSettler.disconnect();
      form.__pulseSettler = null;
      settle(form);
    }, 2500);
  }

  /* Framer's fields are controlled by its own React tree: a native reset or a value write is
     undone by the next render (measured 2026-11-14: a reset at 400 ms, 1500 ms and 2600 ms all
     came back). The form that was submitted is therefore replaced with a pristine copy of the
     markup captured when it was wired — that copy starts empty and Framer has no state for it —
     and the copy is wired again so a second message works. The status line is a page-level
     toast, so it survives the swap. A submit button inside the captured form would hand the
     field values to a native GET navigation the moment anything bypasses our listeners, so
     wire() turns those buttons into plain buttons and keeps the send in JS. */
  function rebuildSoon(form) {
    var snapshot = form.__pulseSnapshot;
    if (!snapshot) return;
    setTimeout(function () {
      var holder = document.createElement('div');
      holder.innerHTML = snapshot;
      var next = holder.firstElementChild;
      if (!next || !form.parentNode) return;
      form.parentNode.replaceChild(next, form);
      wire(next);
    }, 600);
  }

  function submit(form) {
    settle(form);
    if (form.__pulseBusy) return;
    if (lastSend.form === form && Date.now() - lastSend.at < 1500) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      say(form, 'Please fill the required fields.');
      settleSoon(form);
      return;
    }
    var endpoint = endpointOf(form);
    if (!endpoint) {
      var href = mailtoFor(form);
      say(
        form,
        'Direct sending is not connected yet — <a href="' + href + '" style="color:var(--accent,#2ea8ae);text-decoration:underline">send this by email</a> ' +
          'and it will open with everything filled in. Nothing you typed has been lost.'
      );
      settleSoon(form);
      return;
    }
    var payload = payloadFor(form);
    form.__pulseBusy = true;
    lastSend.form = form;
    lastSend.at = Date.now();
    setBusy(form, true);
    say(form, 'Sending…');
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        say(form, 'Thank you — your message is with us. We reply within two working days.');
        form.__pulseSent = true;
        rebuildSoon(form);
      })
      .catch(function (err) {
        say(
          form,
          'That did not go through. Email <a href="mailto:' + EMAIL + '" style="color:var(--accent,#2ea8ae)">' + EMAIL + '</a> and we will pick it up from there.'
        );
      })
      .then(function () { form.__pulseBusy = false; setBusy(form, false); settleSoon(form); });
  }

  // A placeholder is not a name: the footer newsletter field ships without a <label>,
  // so give every unnamed field an aria-label before anything else touches the form.
  // forms/apply.js writes the same attribute into the markup; this is the hydration-safe
  // second half (Framer re-renders the footer and can drop the attribute again).
  function labelFor(field) {
    var type = (field.getAttribute('type') || '').toLowerCase();
    if (type === 'email') return 'Email address';
    if (field.tagName === 'SELECT') return 'Choose an option';
    var name = (field.getAttribute('name') || '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (name) return name.charAt(0).toUpperCase() + name.slice(1);
    var placeholder = (field.getAttribute('placeholder') || '').trim();
    return placeholder || 'Field';
  }
  function nameFields(form) {
    var fields = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.type === 'hidden') continue;
      if (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')) continue;
      if (field.labels && field.labels.length) continue;
      field.setAttribute('aria-label', labelFor(field));
    }
  }

  function wire(form) {
    if (!form || form.__pulseFormWired) return;
    form.__pulseSnapshot = form.outerHTML;
    // A submit button is the browser's invitation to encode the form into the URL; with the
    // native submission uncancellable from our side, take the invitation away and keep the
    // send in JS (Enter still reaches the document submit capture).
    var buttons = form.querySelectorAll('button');
    for (var bi = 0; bi < buttons.length; bi++) {
      if (buttons[bi].type === 'submit') buttons[bi].type = 'button';
    }
    // Framer's own listener can call form.submit(), which bypasses the submit event and
    // therefore preventDefault — that is how a send turned into a page reload with every
    // field in the URL. Point it at our send instead.
    form.submit = function () {
      if (this.__pulseBusy) return;
      submit(this);
    };
    form.__pulseFormWired = true;
    nameFields(form);
    form.setAttribute('novalidate', 'novalidate'); // we validate and report ourselves
    var button = form.querySelector('button[type="submit"], button');
    if (button) {
      var label = button.querySelector('[data-framer-name="Label"]') || button;
      form.__pulseLabel = (label.textContent || '').trim();
    }
  }

  // Catch the click in capture at the document, before Framer's own click handler (which
  // would switch the button to its "Sending…" variant and leave it there, because the
  // response it waits for never comes). The submit event path below still covers Enter
  // and assistive-technology submits.
  document.addEventListener(
    'click',
    function (e) {
      var button = e.target && e.target.closest ? e.target.closest('button[type="submit"], button') : null;
      if (!button) return;
      var form = button.form;
      if (!form) return;
      var name = form.getAttribute('data-framer-name') || '';
      if (!/Contact Form|Newsletter Form/.test(name)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      wire(form);
      submit(form);
    },
    true
  );

  // Enter is the keyboard's way to submit a form. Taking type="submit" off the button
  // removed the browser's implicit submission too, and these forms carry Framer's hidden
  // helper fields, so Enter did nothing at all. Catch it on the field and send ourselves;
  // a textarea keeps its newline.
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
      var field = e.target;
      if (!field || !/^(INPUT|SELECT)$/.test(field.tagName)) return;
      var form = field.form;
      if (!form) return;
      var name = form.getAttribute('data-framer-name') || '';
      if (!/Contact Form|Newsletter Form/.test(name)) return;
      e.preventDefault();
      wire(form);
      submit(form);
    },
    true
  );

  // Capture on the document: the listener outlives a replaced form node, and it runs
  // before whatever Framer attached, so the navigation never happens.
  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      var name = form.getAttribute('data-framer-name') || '';
      if (!/Contact Form|Newsletter Form/.test(name)) return;
      e.preventDefault();
      e.stopPropagation();
      wire(form);
      submit(form);
    },
    true
  );

  function scan() {
    var forms = document.querySelectorAll('form[data-framer-name]');
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }

  guardFramer();

  var start = Date.now();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();

  var timer = 0;
  var observer = new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = 0; scan(); }, 150);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  var stop = setInterval(function () {
    scan();
    if (Date.now() - start > MAX_AGE) { clearInterval(stop); observer.disconnect(); }
  }, 400);
})();
