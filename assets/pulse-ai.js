/* Pulse AI — the site assistant.
 *
 * Drop-in: <script src="/assets/pulse-ai.js" data-pulse-ai="/api/assistant"></script>
 * The widget is one file, no dependencies, and it never auto-opens: the panel is
 * invited once per visitor and remembers a dismissal. If the service is not
 * reachable, the panel explains that and keeps a working route to a person.
 */
(function () {
  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  var CFG = window.PULSE_AI || {};
  var SERVICE = CFG.service || '';
  var ENDPOINT = SERVICE + ((script && script.dataset.pulseAi) || CFG.assistant || '/api/assistant');
  var LEAD = SERVICE + ((script && script.dataset.pulseLead) || CFG.lead || '/api/lead');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mode = (document.body && document.body.dataset.pulseMode) || 'navigator';
  var auditId = (document.body && document.body.dataset.auditId) || '';
  var history = [];
  var open = false;
  var busy = false;
  var available = true;

  var css = "\n.pai-btn{position:fixed;right:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:1001;display:grid;place-items:center;width:44px;height:44px;padding:0;border:1px solid #526077;background:#0a1931;color:#e1eef0;border-radius:50%;cursor:pointer}\n.pai-label{display:none}.pai-ico{width:22px;height:22px;display:block}\n.pai-panel{position:fixed;right:20px;bottom:calc(76px + env(safe-area-inset-bottom,0px));width:min(420px,calc(100vw - 32px));max-height:min(620px,calc(100dvh - 104px));background:#f0f4f4;border:1px solid #78869a;border-radius:4px;box-shadow:0 16px 40px rgba(10,25,49,.2);display:none;flex-direction:column;overflow:hidden;z-index:1002;color:#111c29;font:400 15px/1.6 Inter,'Segoe UI',system-ui,sans-serif}\n.pai-panel.on{display:flex}.pai-head{display:flex;align-items:center;gap:16px;padding:20px 24px;background:#0a1931;color:#e1eef0}.pai-head strong{font:600 20px/1.3 Montserrat,Inter,sans-serif}.pai-head small{display:block;margin-top:8px;font:400 12px/1.5 Inter,system-ui,sans-serif;color:#bdcad8;max-width:29ch}.pai-close{margin-left:auto;align-self:flex-start;min-width:44px;min-height:44px;background:none;border:1px solid #526077;color:#e1eef0;font-size:24px;cursor:pointer}\n.pai-log{padding:24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:20px;min-height:110px;overscroll-behavior:contain}.pai-msg{max-width:94%;font-size:15px;overflow-wrap:anywhere}.pai-msg.ai{background:none;align-self:flex-start;border-left:2px solid #2163af;padding:0 0 0 16px}.pai-msg.me{background:#0a1931;color:#e1eef0;align-self:flex-end;padding:12px 16px;border-radius:2px}\n.pai-chips{display:flex;flex-direction:column;gap:0;padding:0 24px 16px}.pai-chip{border:0;border-bottom:1px solid #c4cdd3;background:none;text-align:left;min-height:44px;padding:8px 0;font:500 13px/1.5 Inter,system-ui,sans-serif;color:#2163af;cursor:pointer}.pai-chip:hover{color:#111c29}\n.pai-form{display:flex;gap:8px;padding:16px 24px;border-top:1px solid #c4cdd3}.pai-form input,.pai-handoff input{min-width:0;flex:1;border:1px solid #84929e;border-radius:0;padding:12px;font:400 16px/1.5 Inter,system-ui,sans-serif;color:#111c29;background:#fff}.pai-send,.pai-handoff button{min-height:48px;border:1px solid #0a1931;background:#0a1931;color:#e1eef0;padding:10px 16px;font:600 14px/1.4 Inter,system-ui,sans-serif;cursor:pointer}.pai-send[disabled]{opacity:.5;cursor:default}\n.pai-panel :focus-visible,.pai-btn:focus-visible{outline:2px solid #2ea8ae;outline-offset:3px}.pai-foot{font-size:12px;line-height:1.5;color:#526171;padding:0 24px 20px}.pai-foot a{color:#2163af;text-decoration:underline}.pai-handoff{display:grid;gap:12px;padding:0 24px 20px}\n@media(max-width:600px){.pai-panel{left:12px;right:12px;width:auto;max-height:calc(100dvh - 100px)}.pai-head,.pai-log{padding:20px}.pai-form{padding:16px 20px}.pai-chips,.pai-foot,.pai-handoff{padding-inline:20px}}\n";
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var button = document.createElement('button');
  button.className = 'pai-btn';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Ask Pulse');
  button.title = 'Ask Pulse';
  button.innerHTML = '<svg class="pai-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<path fill="currentColor" d="M4 4.6C4 3.2 5.1 2 6.6 2h10.8C18.9 2 20 3.2 20 4.6v8.3c0 1.4-1.1 2.6-2.6 2.6h-4.9l-4.6 3.8c-.5.4-1.3.1-1.3-.6V15.5h-.1C5.1 15.5 4 14.4 4 13z"/>'
    + '<circle cx="8.6" cy="8.7" r="1.05" fill="#fff"/><circle cx="12" cy="8.7" r="1.05" fill="#fff"/>'
    + '<circle cx="15.4" cy="8.7" r="1.05" fill="#fff"/></svg>'
    + '<span class="pai-label">Ask Pulse</span>';
  document.body.appendChild(button);

  var panel = document.createElement('div');
  panel.className = 'pai-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Pulse AI assistant');
  panel.innerHTML = ''
    + '<div class="pai-head"><strong>Pulse AI<small>Your first questions, answered. A person can take over.</small></strong>'
    + '<button class="pai-close" type="button" aria-label="Close assistant">×</button></div>'
    + '<div class="pai-log" aria-live="polite"></div>'
    + '<div class="pai-chips"></div>'
    + '<form class="pai-form"><input type="text" name="q" autocomplete="off" placeholder="Ask a question" aria-label="Your question">'
    + '<button class="pai-send" type="submit">Send</button></form>'
    + '<div class="pai-foot">Automated first pass. Anything about price, scope or timing goes to a human. '
    + '<a href="/contact.html">Talk to a person</a></div>';
  document.body.appendChild(panel);
  var log = panel.querySelector('.pai-log');
  var chips = panel.querySelector('.pai-chips');
  var form = panel.querySelector('.pai-form');
  var input = form.querySelector('input');
  var send = form.querySelector('.pai-send');

  /* Placement. The launcher is the CSS default now: fixed to the bottom-right corner of
     the viewport at every width below 1024px, opening the panel upward from it. It used to
     be measured into the fixed header band on narrow screens, which put it at the top of a
     phone screen; because those offsets were written as inline styles they also won against
     any stylesheet rule. All this needs to do now is make sure no earlier inline placement
     survives a resize or a rotation.
     (Lareesa, iPhone review 2026-10-04: "move this to bottom right corner".) */
  function place() {
    button.style.removeProperty('top');
    button.style.removeProperty('left');
    button.style.removeProperty('right');
    button.style.removeProperty('bottom');
    panel.style.removeProperty('--pai-hdr');
  }
  place();
  window.addEventListener('resize', place, {passive: true});
  window.addEventListener('orientationchange', place);

  var MODES = {
    navigator: ['What does Pulse do?', 'Have you worked in my sector?', 'How does a project start?'],
    case: ['What changed commercially?', 'What was the hardest part?'],
    scoping: ['Talk me through this', 'I would rather type', 'Can I just book a call?']
  };

  function paintChips(items) {
    chips.innerHTML = '';
    (items || MODES[mode] || MODES.navigator).slice(0, 3).forEach(function (text) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pai-chip';
      chip.textContent = text;
      chip.addEventListener('click', function () { ask(text); });
      chips.appendChild(chip);
    });
  }

  function bubble(text, who) {
    var node = document.createElement('div');
    node.className = 'pai-msg ' + who;
    node.textContent = text;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  /* Keyboard focus stays inside the panel while it is open, and returns to the
     launcher on close, so a keyboard user cannot wander behind it. */
  function trap(event) {
    if (event.key !== 'Tab') return;
    var focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function setOpen(next) {
    open = next;
    panel.classList.toggle('on', open);
    button.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-modal', String(open));
    if (open) {
      document.addEventListener('keydown', trap);
    } else {
      document.removeEventListener('keydown', trap);
      button.focus();
    }
    if (open) {
      try { localStorage.setItem('pulse-ai-invited', '1'); } catch (e) {}
      if (!log.childElementCount && !reduce) {
        bubble('Ask anything about how Pulse works, or start with a suggestion below.', 'ai');
      } else if (!log.childElementCount) {
        bubble('Ask anything about how Pulse works, or start with a suggestion below.', 'ai');
      }
      if (available) paintChips();
      if (available) input.focus(); else panel.querySelector('.pai-close').focus();
    }
  }

  button.addEventListener('click', function () { setOpen(!open); });
  panel.querySelector('.pai-close').addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && open) { setOpen(false); button.focus(); }
  });

  function handoff() {
    if (panel.querySelector('.pai-handoff')) return;
    var box = document.createElement('div');
    box.className = 'pai-handoff';
    box.innerHTML = '<input placeholder="Name" aria-label="Name"><input type="email" placeholder="Email" aria-label="Email">'
      + '<input placeholder="Company or website" aria-label="Company"><button type="button">Send to a person</button>';
    panel.insertBefore(box, form);
    box.querySelector('button').addEventListener('click', function () {
      var fields = box.querySelectorAll('input');
      var payload = {name: fields[0].value, email: fields[1].value, company: fields[2].value,
                     source: 'assistant', audit_id: auditId,
                     transcript: history.map(function (t) { return {role: t.role, content: t.content}; })};
      fetch(LEAD, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                   body: JSON.stringify(payload)})
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          bubble(data.ok ? 'Thank you. A person will reply from your message, usually within one working day.'
                         : (data.error || 'That did not go through. Try the contact page instead.'), 'ai');
          box.remove();
        })
        .catch(function () { bubble('That did not go through. Try the contact page instead.', 'ai'); });
    });
  }

  function ask(text) {
    if (busy || !text || !available) return;
    busy = true;
    send.disabled = true;
    bubble(text, 'me');
    history.push({role: 'user', content: text});
    var thinking = bubble(reduce ? 'Thinking' : 'Thinking…', 'ai');
    fetch(ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                     body: JSON.stringify({message: text, mode: mode, audit_id: auditId,
                                           page: location.pathname, history: history.slice(-6)})})
      .then(function (response) { return response.json().then(function (data) { return {ok: response.ok, data: data}; }); })
      .then(function (result) {
        thinking.remove();
        if (!result.ok || !result.data || !result.data.reply) {
          bubble((result.data && result.data.error) || 'The assistant is unavailable right now. The contact page still works.', 'ai');
        } else {
          bubble(result.data.reply, 'ai');
          history.push({role: 'assistant', content: result.data.reply});
          if (result.data.suggested && result.data.suggested.length) paintChips(result.data.suggested);
          if (result.data.escalate) handoff();
        }
      })
      .catch(function () {
        thinking.remove();
        bubble('The assistant is unavailable right now. The contact page still works.', 'ai');
      })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  });

  function unavailable() {
    available = false;
    send.disabled = true;
    input.disabled = true;
    input.placeholder = 'Assistant temporarily unavailable';
    chips.hidden = true;
    log.innerHTML = '';
    bubble('The assistant is temporarily unavailable. You can still speak with Pulse through the contact page below.', 'ai');
    panel.querySelector('.pai-head small').textContent = 'A direct route to the Pulse team.';
  }
  fetch(SERVICE + (CFG.health || '/api/health'), {method: 'GET'})
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.assistant_ready) { unavailable(); }
    })
    .catch(function () { unavailable(); });
})();
