/* The free audit — findings first, email afterwards.
 *
 * Markup contract (audit.html):
 *   <form data-audit-form>
 *     <input name="url"> <select name="goal"> <textarea name="pain"></textarea>
 *   </form>
 *   <div data-audit-progress hidden><ol><li>…</li></ol></div>
 *   <div data-audit-output hidden></div>
 *   <div data-audit-gate hidden><input name="email"><button data-audit-email></div>
 *   <div data-audit-next hidden>…</div>
 *
 * The order is the point. /api/audit runs on the URL and the goal alone, and the
 * response carries the leakage index, the four axis scores, what already works and
 * three evidence-backed findings. Only once that is on screen does the gate appear
 * asking where to send the fuller report. Nothing is stored client-side except the
 * audit id, which is enough to reload the finished result after a refresh.
 *
 * A failure says what failed, leaves the typed answers where they are, and offers
 * the same button again. It never pretends an audit ran.
 */
(function () {
  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  var CFG = window.PULSE_AI || {};
  var API = (CFG.service || '') + ((script && script.dataset.pulseAudit) || CFG.audit || '/api/audit');
  var form = document.querySelector('[data-audit-form]');
  if (!form) return;
  var output = document.querySelector('[data-audit-output]');
  var gate = document.querySelector('[data-audit-gate]');
  var next = document.querySelector('[data-audit-next]');
  var progress = document.querySelector('[data-audit-progress]');
  var button = form.querySelector('button[type="submit"]') || form.querySelector('button');
  var currentId = '';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character];
    });
  }

  function safeReportURL(value) {
    try {
      /* The report is served by the AI service, not by this static host: the API
         answers with a root-relative "/r/<id>". Resolving that against location.origin
         produced https://<site>/r/<id>, which is a 404 - the funnel's last step.
         Resolve against the service origin whenever one is configured. */
      var serviceOrigin = new URL(CFG.service || location.origin, location.href).origin;
      var url = new URL(value, CFG.service ? serviceOrigin + "/" : location.origin);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (url.origin !== location.origin && url.origin !== serviceOrigin) return '';
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function say(text, kind) {
    if (!output) return;
    output.hidden = false;
    output.setAttribute('data-state', kind || 'info');
    output.innerHTML = '<p class="audit-note">' + escapeHTML(text) + '</p>';
  }

  function validEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(value || '').trim());
  }

  function axes(scores) {
    var rows = Object.keys(scores.axes).map(function (key) {
      var axis = scores.axes[key];
      var score = Number(axis.score);
      score = isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
      return '<div class="audit-axis"><span>' + escapeHTML(axis.label) + '</span>'
        + '<span class="audit-bar"><i style="width:' + score + '%"></i></span>'
        + '<b>' + score + '</b></div>';
    }).join('');
    return rows;
  }

  function findingList(items) {
    return (items || []).slice(0, 3).map(function (item) {
      return '<article class="audit-finding"><h3>' + escapeHTML(item.title) + '</h3>'
        + (item.evidence ? '<blockquote>' + escapeHTML(item.evidence) + '</blockquote>' : '')
        + '<p>' + escapeHTML(item.why || '') + '</p>'
        + (item.fix ? '<p class="meta">Smallest change: ' + escapeHTML(item.fix) + '</p>' : '') + '</article>';
    }).join('');
  }

  function renderFindings(data) {
    var index = Number(data.scores.leakage_index);
    index = isFinite(index) ? Math.max(0, Math.min(100, Math.round(index))) : 0;
    var items = findingList(data.findings_preview || data.findings || []);
    var working = (data.working || []).map(function (line) { return '<li>' + escapeHTML(line) + '</li>'; }).join('');
    output.innerHTML = '<p class="eyebrow muted">Your outside view</p><h2 class="h2 mt-3">The first findings.</h2>'
      + (items || '<p class="copy mt-3">No specific findings were returned. Try another public page or talk with Pulse.</p>')
      + (working ? '<h3 class="h3 mt-4">Already working</h3><ul class="audit-note">' + working + '</ul>' : '')
      + '<details class="audit-signal-detail"><summary>View the supporting signals</summary>'
      + '<div class="audit-index"><b>' + index + '</b><span>Leakage index out of 100 across four axes. An automated signal, not a grade of the business.</span></div>'
      + '<div class="audit-axes">' + axes(data.scores) + '</div></details>'
      + (data.warning ? '<p class="meta">' + escapeHTML(data.warning) + '</p>' : '');
    output.hidden = false;
    output.setAttribute('data-state', 'info');
  }

  /* ------------------------------------------------------------- progress state */
  var timer = null;

  function stopProgress() {
    if (timer) { clearInterval(timer); timer = null; }
    if (progress) progress.hidden = true;
  }

  function startProgress() {
    if (!progress) return;
    progress.hidden = false;
    var steps = progress.querySelectorAll('li');
    var at = 0;
    [].forEach.call(steps, function (step) { step.classList.remove('is-active', 'is-done'); });
    if (steps[0]) steps[0].classList.add('is-active');
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (!steps.length) return;
      if (at >= steps.length - 1) return;   /* the last line holds while we wait */
      steps[at].classList.remove('is-active');
      steps[at].classList.add('is-done');
      at += 1;
      steps[at].classList.add('is-active');
    }, 1400);
  }

  function revealAfterResult() {
    if (gate) gate.hidden = false;
    if (next) next.hidden = false;
  }

  /* --------------------------------------------------------------------- submit */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var urlField = form.querySelector('[name="url"]');
    var goalField = form.querySelector('[name="goal"]');
    var payload = {
      url: (urlField || {}).value || '',
      goal: (goalField || {}).value || '',
      pain: (form.querySelector('[name="pain"]') || {}).value || ''
    };
    if (!payload.url.trim()) {
      say('Add the website address and the audit can start.', 'error');
      if (urlField) urlField.focus();
      return;
    }
    if (!payload.goal.trim()) {
      say('Choose the business goal this audit should be judged against.', 'error');
      if (goalField) goalField.focus();
      return;
    }
    if (button) { button.disabled = true; }
    if (gate) gate.hidden = true;
    if (next) next.hidden = true;
    output.hidden = true;
    startProgress();
    fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                body: JSON.stringify(payload)})
      .then(function (response) { return response.json().then(function (data) { return {ok: response.ok, data: data}; }); })
      .then(function (result) {
        stopProgress();
        if (button) { button.disabled = false; }
        if (!result.ok) {
          /* the typed answers stay in the fields; only the message changes */
          say((result.data && result.data.error) || 'The audit could not run just now. Your answers are still in the form.', 'error');
          return;
        }
        currentId = result.data.id || '';
        try { localStorage.setItem('pulse-audit-id', currentId); } catch (e) {}
        if (document.body) document.body.dataset.auditId = currentId;
        renderFindings(result.data);
        revealAfterResult();
      })
      .catch(function () {
        stopProgress();
        if (button) { button.disabled = false; }
        say('The audit could not run just now. Your answers are still in the form — try again, or use the contact page.', 'error');
      });
  });

  /* ------------------------------------------------------------- the email gate */
  if (gate) {
    var send = gate.querySelector('[data-audit-email]');
    var note = gate.querySelector('[data-audit-gate-note]');
    /* The note sits directly under the gate heading. Bring it to the middle of the viewport
       after it appears, so the note and the control that produced it stay in one frame and
       clear of the fixed launcher in the bottom-right corner. */
    function revealNote() {
      if (!note || note.hidden) { return; }
      if (note.scrollIntoView) {
        try { note.scrollIntoView({block: 'center'}); } catch (e) { note.scrollIntoView(); }
      }
    }
    if (send) {
      send.addEventListener('click', function () {
        var field = gate.querySelector('input');
        var email = (field || {}).value || '';
        if (!currentId) { return; }
        if (!validEmail(email)) {
          if (note) { note.textContent = 'That email address does not look right.'; note.hidden = false; revealNote(); }
          return;
        }
        send.disabled = true;
        var label = send.textContent;
        send.textContent = 'Sending';
        fetch(API + '/' + encodeURIComponent(currentId) + '/email',
              {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
               body: JSON.stringify({email: email})})
          .then(function (response) { return response.json().then(function (data) { return {ok: response.ok, data: data}; }); })
          .then(function (result) {
            send.disabled = false;
            send.textContent = label;
            if (!result.ok) {
              if (note) {
                note.textContent = (result.data && result.data.error) || 'That did not go through. Try again in a moment.';
                note.hidden = false; revealNote();
              }
              return;
            }
            /* A "queued" delivery now means the service has sending switched off. Say exactly
               that: the visitor-facing text must never read as if a message was sent, saved or
               queued. The report itself is still on this page and the action can be tried again. */
            var queued = String(result.data.delivery || '').indexOf('queued') === 0;
            var href = safeReportURL(result.data.report_url);
            if (note) {
              note.innerHTML = escapeHTML(queued
                ? 'Email delivery is disabled. Nothing was sent. Your report remains available here: '
                : 'On its way. The report is also readable here: ')
                + (href ? '<a href="' + escapeHTML(href) + '">open the report</a>' : 'the link could not be verified.')
                + (queued ? '. Try again, or <a href="contact.html">ask us to send it</a>.' : '');
              note.hidden = false; revealNote();
            }
          })
          .catch(function () {
            send.disabled = false;
            send.textContent = label;
            if (note) { note.textContent = 'That did not go through. Try again in a moment.'; note.hidden = false; revealNote(); }
          });
      });
    }
  }

  /* ------------------------------------------------- reload a finished audit ---- */
  /* Only the id is kept. The service is asked for the public half of that record, so
     the findings survive a refresh without page content landing in localStorage. */
  try { currentId = localStorage.getItem('pulse-audit-id') || ''; } catch (e) {}
  if (currentId) {
    var restored = currentId;
    fetch(API + '/' + encodeURIComponent(restored) + '/findings', {headers: {'Accept': 'application/json'}})
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.scores) return;
        if (document.body) document.body.dataset.auditId = restored;
        renderFindings(data);
        revealAfterResult();
      })
      .catch(function () { /* a stale id is not an error worth showing */ });
  }
})();
