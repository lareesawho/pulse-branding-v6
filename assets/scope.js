/* AI-02 — the five-step guided scoping journey on /proposal-scope.html.

   Step 1 Outcome (required, 20 characters minimum) · Step 2 Friction (multi-select) ·
   Step 3 Existing attempts (optional) · Step 4 Context review (every answer editable) ·
   Step 5 Recommendation (generated without an email).

   site.js already owns step visibility: it toggles .scope-step.active from the rail and
   from [data-scope-next] / [data-scope-back]. This file only gates the two required
   answers, keeps the context review honest, talks to the service, and adds voice inside
   steps 1 and 3. Every handler is delegated from the panel, because GlassSurface renders
   its children through React and swaps those nodes when it mounts.

   Nothing here emails or books anything on its own: the email field appears only after a
   recommendation exists, and it is the visitor who presses Send. */
(function () {
  var panel = document.querySelector('.scope-panel');
  if (!panel) return;

  var CFG = window.PULSE_AI || {};
  var SERVICE = CFG.service || '';
  var ENDPOINT = SERVICE + (CFG.scoping || '/api/scoping');
  var steps = [].slice.call(document.querySelectorAll('.scope-step'));
  var state = { outcome: '', friction: '', attempts: '', audit: '' };

  try {
    var last = localStorage.getItem('pulse-audit-id');
    if (last) state.audit = last;
  } catch (e) {}
  var fromQuery = (location.search.match(/[?&]audit=([a-z0-9]+)/i) || [])[1];
  if (fromQuery) state.audit = fromQuery;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function answer(name) { return q('[data-scope-answer="' + name + '"]'); }
  function note(name) { return q('[data-scope-note="' + name + '"]'); }
  function gate(name) { return q('[data-scope-gate="' + name + '"]'); }
  function activeIndex() {
    for (var i = 0; i < steps.length; i++) { if (steps[i].classList.contains('active')) return i; }
    return 0;
  }
  function showStep(index) {
    var rail = q('[data-scope-rail] [data-scope-goto="' + index + '"]');
    if (rail) { rail.click(); return; }
    steps.forEach(function (s, n) { s.classList.toggle('active', n === index); });
  }

  /* ------------------------------------------------------------- answers ---- */
  function clean(v) { return (v || '').replace(/\s+/g, ' ').trim(); }
  function outcomeValue() { return clean(answer('outcome').value); }
  function attemptsValue() { return clean(answer('attempts').value); }
  function frictionPicks() { return all('input[type=checkbox]', answer('friction')).filter(function (c) { return c.checked; }); }
  function frictionValue() {
    var picked = frictionPicks().map(function (c) { return c.value; });
    var other = clean(q('#scope-friction-other').value);
    var parts = picked.filter(function (v) { return v !== 'Other'; });
    if (picked.indexOf('Other') !== -1) parts.push(other ? 'Other: ' + other : 'Other');
    return parts.join(', ').slice(0, 300);
  }

  function sync() {
    state.outcome = outcomeValue();
    state.friction = frictionValue();
    state.attempts = attemptsValue();

    var outGate = gate('outcome');
    if (outGate) {
      var short = 20 - state.outcome.length;
      outGate.disabled = state.outcome.length < 20;
      var outNote = note('outcome');
      if (outNote) {
        outNote.textContent = state.outcome.length === 0
          ? 'At least 20 characters, so the recommendation has something real to work from.'
          : (short > 0 ? short + ' more character' + (short === 1 ? '' : 's') + ' needed.'
                       : 'That is enough to work from.');
        outNote.classList.toggle('is-ok', state.outcome.length >= 20);
      }
    }

    var frGate = gate('friction');
    if (frGate) frGate.disabled = frictionPicks().length === 0;

    var other = q('[data-scope-other]');
    if (other) {
      var toggle = q('[data-scope-other-toggle]');
      other.hidden = !(toggle && toggle.checked);
    }
  }

  /* -------------------------------------------------- context review (4) ---- */
  function row(label, value, index) {
    return '<div class="scope-review-row"><div class="eyebrow muted">' + esc(label) + '</div>' +
      '<p class="copy">' + value + '</p>' +
      '<button class="link" type="button" data-scope-edit="' + index + '">Edit</button></div>';
  }
  function reviewHTML() {
    return '<div class="scope-review">' +
      row('Outcome', state.outcome ? esc(state.outcome) : '<span class="scope-empty">Nothing written yet.</span>', 0) +
      row('Friction', state.friction ? esc(state.friction) : '<span class="scope-empty">Nothing chosen yet.</span>', 1) +
      row('What you have tried', state.attempts ? esc(state.attempts) : '<span class="scope-empty">Nothing — that is allowed.</span>', 2) +
      '</div>';
  }

  /* ------------------------------------------- GlassSurface summary/result--- */
  /* The island captures its children when it mounts, so the content is written first and
     the surface is rendered here rather than being declared empty in the markup. */
  function surface(name, innerHTML) {
    var host = q('[data-scope-surface="' + name + '"]');
    if (!host) return;
    var html = '<div class="scope-surface__inner">' + innerHTML + '</div>';
    var wrap = host.querySelector('.rb-children');
    if (wrap) { wrap.innerHTML = html; return; }
    host.innerHTML = html;
    if (host.getAttribute('data-rb-mounted') || !window.reactBits) return;
    host.setAttribute('data-rb', 'GlassSurface');
    host.setAttribute('data-rb-keep-children', '1');
    host.setAttribute('data-rb-props', JSON.stringify({
      width: '100%', height: 'auto', borderRadius: 18,
      backgroundOpacity: 0.06, saturation: 1.1
    }));
    window.reactBits.mount(host);
  }
  function renderSummary() { surface('summary', reviewHTML()); }

  /* ------------------------------------------------------- recommendation --- */
  function fitLabel(fit) {
    var key = String(fit || '').toLowerCase();
    if (key === 'strong') return 'Strong fit';
    if (key === 'not_yet' || key === 'not yet') return 'Not yet a fit';
    if (key === 'possible') return 'Possible fit';
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Fit not stated';
  }
  function list(items, tag) {
    if (!items || !items.length) return '<p class="copy scope-empty">Nothing returned here.</p>';
    var open = tag === 'ol' ? '<ol class="copy">' : '<ul class="copy">';
    var close = tag === 'ol' ? '</ol>' : '</ul>';
    return open + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + close;
  }
  function section(title, body) {
    return '<div class="scope-section"><h4>' + esc(title) + '</h4>' + body + '</div>';
  }
  function resultHTML(rec) {
    var streams = rec.workstreams || [];
    var workstreams = streams.map(function (w) {
      return '<div class="scope-ws"><strong>' + esc(w.name || '') + '</strong>' +
        '<p class="copy mt-1">' + esc(w.what || '') + '</p>' +
        (w.outcome ? '<p class="copy muted mt-1">' + esc(w.outcome) + '</p>' : '') + '</div>';
    }).join('');
    var first = streams[0];
    var engagement = '<p class="copy scope-lead">' + esc(rec.headline || '') + '</p>' +
      '<p class="copy mt-2">A ' + esc(fitLabel(rec.fit).toLowerCase()) + ' engagement across ' +
      streams.length + ' workstream' + (streams.length === 1 ? '' : 's') +
      (first && first.name ? ', beginning with ' + esc(first.name) : '') +
      '. No price or timeline is quoted here \u2014 that is a conversation, not a form.</p>';

    return '<div class="scope-result">' +
      '<div class="eyebrow muted">Your scoping recommendation</div>' +
      section('What we heard', '<p class="copy mt-2">' + esc(rec.read || '') + '</p>') +
      section('Fit decision', '<p class="scope-fit"><b>' + esc(fitLabel(rec.fit)) + '</b></p>' + list(rec.fit_reasons)) +
      section('Recommended engagement', engagement) +
      section('Workstreams', workstreams || '<p class="copy scope-empty">Nothing returned here.</p>') +
      section('Sequence', list(rec.sequence, 'ol')) +
      section('What not to do yet', list(rec.watchouts)) +
      section('Questions a person still needs to ask', list(rec.questions)) +
      section('Next action', '<p class="copy mt-2">' + esc(rec.next_step || '') + '</p>') +
      '</div>';
  }

  /* A failure message is never a dead end: every unavailable state keeps the answers, offers the
     same action again, and offers a person. The service is hosted separately and can be cold or
     briefly unreachable, so a request that does not answer in time is treated as unavailable
     rather than left spinning. */
  var WAIT_MS = 30000;
  var DEFAULT_FAIL = 'The recommendation could not be prepared just now. Try again, or use the contact page.';
  var TIMEOUT_FAIL = 'The scoping tool did not answer in time. Your answers are still here. Try again, or talk to a person on the contact page.';
  function failText(data) {
    if (data && data.error) return data.error;
    if (!data || typeof data.http === 'number') return TIMEOUT_FAIL;
    return DEFAULT_FAIL;
  }
  function appendActions(node, retry) {
    if (!retry) return;
    var again = document.createElement('button');
    again.type = 'button'; again.className = 'link'; again.textContent = 'Try again';
    again.addEventListener('click', retry);
    var person = document.createElement('a');
    person.className = 'link'; person.href = 'contact.html'; person.textContent = 'Talk to Pulse';
    node.appendChild(document.createTextNode(' '));
    node.appendChild(again);
    node.appendChild(document.createTextNode(' '));
    node.appendChild(person);
  }
  function status(message, retry) {
    var node = q('[data-scope-status]');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
    if (message) appendActions(node, retry);
  }
  function setEmailNote(text, retry) {
    var node = q('[data-scope-email-note]');
    if (!node) return;
    node.textContent = text;
    appendActions(node, retry);
  }
  function payload() {
    return {
      mode: 'guided text',
      priority: state.outcome,
      friction: state.friction,
      notes: state.attempts,
      audit_id: state.audit,
      page: location.pathname
    };
  }
  function post(body) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, WAIT_MS) : 0;
    function done(work) { clearTimeout(timer); return work; }
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return done(r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { data = data || {}; data.http = r.status; }
        return data;
      }));
    }, function () {
      return done({ http: 0 });
    });
  }

  function generate(button) {
    sync();
    if (state.outcome.length < 20) {
      status('Step 1 needs at least 20 characters before a recommendation can be prepared.');
      showStep(0);
      return;
    }
    button.disabled = true;
    status('Reading your answers and preparing the recommendation. This takes a few seconds.');
    post(payload()).then(function (data) {
      button.disabled = false;
      if (!data || !data.recommendation) {
        status(failText(data), function () { generate(button); });
        return;
      }
      status('');
      showStep(4);
      surface('result', resultHTML(data.recommendation));
      var actions = q('[data-scope-result-actions]');
      if (actions) actions.hidden = false;
      var box = q('[data-scope-email]');
      if (box) box.hidden = true;
      var input = q('#scope-email');
      if (input) { input.value = ''; input.disabled = false; }
      resetEmailNote();
    }).catch(function () {
      button.disabled = false;
      status(TIMEOUT_FAIL, function () { generate(button); });
    });
  }

  /* -------------------------------------------------------------- email ----- */
  function resetEmailNote() {
    var emailNote = q('[data-scope-email-note]');
    if (emailNote) emailNote.innerHTML = 'One address, one copy of this recommendation. <a class="link" href="privacy.html">Privacy</a>.';
  }
  function sendEmail(button) {
    var input = q('#scope-email');
    var emailNote = q('[data-scope-email-note]');
    var address = clean(input.value);
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(address)) {
      emailNote.textContent = 'That address does not look right. One address, one copy of this recommendation.';
      input.focus();
      return;
    }
    button.disabled = true;
    emailNote.textContent = 'Sending the recommendation to ' + address + '...';
    var body = payload();
    body.email = address;
    post(body).then(function (data) {
      button.disabled = false;
      if (data && data.emailed) {
        input.disabled = true;
        emailNote.textContent = 'Sent to ' + address + '. One address, one copy of this recommendation.';
      } else {
        setEmailNote((data && (data.email_error || data.error)) ||
          'The recommendation could not be emailed just now. Try again, or use the contact page.',
          function () { sendEmail(button); });
      }
    }).catch(function () {
      button.disabled = false;
      setEmailNote('The recommendation could not be emailed just now. Try again, or use the contact page.',
        function () { sendEmail(button); });
    });
  }

  /* -------------------------------------------------------------- voice ----- */
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var listeningFor = '';

  function voiceState(field) { return q('[data-scope-voice-state="' + field + '"]'); }
  function say(field, sentence) { var n = voiceState(field); if (n) n.textContent = sentence; }
  function listening(on, field) {
    var host = q('[data-scope-listening="' + field + '"]');
    if (host) host.hidden = !on;
    listeningFor = on ? field : '';
  }
  function voiceStop() {
    if (recognition) { try { recognition.stop(); } catch (e) {} recognition = null; }
    if (listeningFor) listening(false, listeningFor);
    listeningFor = '';
  }
  function voiceClick(field) {
    voiceStop();
    if (!SpeechRecognition) {
      say(field, 'Voice input is not available in this browser. Type your answer \u2014 the questions and the recommendation are the same.');
      return;
    }
    var box = answer(field);
    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = function () { listening(true, field); say(field, 'Listening. Speak your answer.'); };
      recognition.onerror = function (event) {
        listening(false, field);
        recognition = null;
        var err = event && event.error;
        say(field, (err === 'not-allowed' || err === 'service-not-allowed')
          ? 'The microphone is blocked for this page, so voice input is off. Type your answer and continue the same way.'
          : 'That did not come through. Try again, or type your answer.');
      };
      recognition.onresult = function (event) {
        var said = clean(event.results[0][0].transcript);
        listening(false, field);
        recognition = null;
        if (!said) { say(field, 'Nothing came through. Try again, or type your answer.'); return; }
        box.value = said;
        box.dispatchEvent(new Event('input', { bubbles: true }));
        sync();
        say(field, 'Transcript added above. Edit it if you need to, then continue.');
        box.focus();
      };
      recognition.onend = function () {
        if (listeningFor === field) listening(false, field);
        recognition = null;
      };
      recognition.start();
      window.setTimeout(function () {
        var node = voiceState(field);
        if (listeningFor === field && node && /Listening/.test(node.textContent)) {
          say(field, 'Waiting on the microphone. If the browser asked, choose Allow \u2014 or type the answer.');
        }
      }, 2500);
    } catch (e) {
      listening(false, field);
      recognition = null;
      say(field, 'The microphone did not start. Type your answer instead.');
    }
  }

  /* ----------------------------------------------------------- delegation --- */
  panel.addEventListener('click', function (event) {
    var node = event.target;
    if (!node || !node.closest) return;
    var hit = function (sel) { return node.closest(sel); };

    var voice = hit('[data-scope-voice]');
    if (voice) { voiceClick(voice.getAttribute('data-scope-voice')); return; }

    if (hit('[data-scope-goto]') || hit('[data-scope-back]')) {
      voiceStop();
      window.setTimeout(function () { sync(); if (activeIndex() === 3) renderSummary(); }, 0);
      return;
    }

    var edit = hit('[data-scope-edit]');
    if (edit) { voiceStop(); showStep(parseInt(edit.getAttribute('data-scope-edit'), 10) || 0); return; }

    if (hit('[data-scope-next]')) {
      voiceStop();
      window.setTimeout(function () { sync(); if (activeIndex() === 3) renderSummary(); }, 0);
      return;
    }

    var gen = hit('[data-scope-generate]');
    if (gen) { voiceStop(); generate(gen); return; }

    if (hit('[data-scope-email-open]')) {
      var box = q('[data-scope-email]');
      resetEmailNote();
      if (box) { box.hidden = false; var f = q('#scope-email'); if (f) f.focus(); }
      return;
    }

    var send = hit('[data-scope-email-send]');
    if (send) { sendEmail(send); return; }

    if (hit('[data-scope-change]')) { voiceStop(); showStep(0); return; }
  });

  panel.addEventListener('input', function () {
    sync();
    if (activeIndex() === 3) renderSummary();
  });
  panel.addEventListener('change', function (event) {
    sync();
    var toggle = event.target && event.target.getAttribute && event.target.getAttribute('data-scope-other-toggle');
    if (toggle && event.target.checked) { var f = q('#scope-friction-other'); if (f) f.focus(); }
    if (activeIndex() === 3) renderSummary();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && listeningFor) {
      var field = listeningFor;
      voiceStop();
      say(field, 'Listening stopped. Type your answer or start again.');
    }
  });

  sync();
  renderSummary();
})();
