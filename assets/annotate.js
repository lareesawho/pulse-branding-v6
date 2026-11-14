/* Pulse review — click any place on the page, leave a comment, and keep it pinned
 * to exactly that place.
 *
 * Drop-in, same shape as the other widgets on this site:
 *   <link rel="stylesheet" href="assets/annotate.css">
 *   <script src="assets/annotate.js" defer></script>
 *
 * What it records for every comment: the page, the section it sits in, the
 * element and a CSS selector that survives a reload, the click position both as
 * a fraction of that element and as page coordinates, and the viewport it was
 * taken at. That is what makes a comment "exactly where I left it" for whoever
 * reads it later.
 *
 * It is dormant on a host it was not meant for, so a real visitor never sees the
 * control: it wakes up on the test host, a preview host, localhost or file://,
 * and anywhere the URL carries ?annotate=1 (which then sticks for that browser).
 *
 * Storage is the browser (localStorage, which is what draws the pins) and the
 * Pulse review service: every new or edited comment is posted to
 * /api/review-comments as well, so a note left on a phone reaches whoever reads
 * the log. The browser copy stays the one the pins are drawn from; the server
 * copy is the one anyone can read. "Copy all" and "Download" still work with
 * no server at all.
 */
(function () {
  'use strict';

  var HOST_OK = ['test.pulse-branding.com', 'pulse-branding-v4.onrender.com', 'localhost', '127.0.0.1', ''];
  var KEY_STICKY = 'pulse.review.awake';
  var KEY_DATA = 'pulse.review.comments.v1';
  var REVIEW_PATH = '/api/review-comments';

  /* ---------------------------------------------------------------- gate */

  function awake() {
    var q = location.search;
    if (/[?&]annotate=0(&|$)/.test(q)) return false;
    if (location.protocol === 'file:') return true;
    if (/[?&]annotate=1(&|$)/.test(q)) {
      try { localStorage.setItem(KEY_STICKY, '1'); } catch (e) {}
      return true;
    }
    try { if (localStorage.getItem(KEY_STICKY) === '1') return true; } catch (e) {}
    if (HOST_OK.indexOf(location.hostname) > -1) return true;
    return /\.onrender\.com$/.test(location.hostname) || /\.local$/.test(location.hostname);
  }

  if (!awake()) return;
  if (window.__pulseReviewLoaded) return;
  window.__pulseReviewLoaded = true;

  /* --------------------------------------------------------------- store */

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function keyOf(path) {
    return path || '/';
  }

  function loadAll() {
    try {
      var raw = localStorage.getItem(KEY_DATA);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.items && parsed.items.length !== undefined) return parsed.items;
    } catch (e) {}
    return [];
  }

  function saveAll(items) {
    try {
      localStorage.setItem(KEY_DATA, JSON.stringify({ version: 1, items: items }));
      return true;
    } catch (e) {
      toast('This browser refused to save — copy the log before you reload');
      return false;
    }
  }

  var items = loadAll();

  /* ---------------------------------------------------------------- sync */
  /* The site is a static build, but the review service is not: every comment is
   * posted to it as well, so a note left on a phone lands where it can be read.
   * The browser copy stays the one the pins are drawn from. Posting is
   * idempotent by comment id on the service side, so a device may re-send the
   * same batch safely; nothing here blocks the page if the service is asleep. */

  var sync = { state: 'idle', at: 0, busy: false };

  function endpoint() {
    var base = (window.PULSE_AI && window.PULSE_AI.service) || '';
    return String(base).replace(/\/+$/, '') + REVIEW_PATH;
  }

  function deviceInfo() {
    return {
      kind: 'review-widget',
      platform: navigator.platform || '',
      viewport: innerWidth + 'x' + innerHeight,
      ua: navigator.userAgent || ''
    };
  }

  function needsSync(c) {
    return !c.syncedAt || (c.updatedAt && c.updatedAt > c.syncedAt);
  }

  function markSynced(list, when) {
    var ids = {};
    list.forEach(function (c) { ids[c.id] = 1; });
    items.forEach(function (c) { if (ids[c.id]) c.syncedAt = when; });
    saveAll(items);
  }

  function setSync(state, message) {
    sync.state = state;
    sync.at = Date.now();
    var el = panel.querySelector('.pa-sync');
    if (!el) return;
    el.setAttribute('data-state', state);
    el.textContent = message || '';
  }

  function renderListSafe() {
    try {
      if (panel.classList.contains('pa-open')) renderList();
    } catch (e) {}
  }

  function syncNow(leaving) {
    var todo = items.filter(needsSync);
    if (!todo.length) {
      setSync('ok', items.length ? 'Saved to the review log' : '');
      return;
    }
    if (sync.busy && !leaving) return;
    if (!leaving && sync.state === 'off' && Date.now() - sync.at < 4000) return;
    var body = JSON.stringify({ device: deviceInfo(), page: location.href, comments: todo });
    var when = new Date().toISOString();
    if (leaving) {
      /* Leaving the page: a beacon is the only request the browser is obliged to
       * finish. It gives no answer, so nothing is marked — the next visit
       * re-sends the same ids and marks them once it hears back. */
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint(), new Blob([body], { type: 'text/plain;charset=UTF-8' }));
        }
      } catch (e) {}
      return;
    }
    sync.busy = true;
    setSync('sending', 'Saving\u2026');
    var settle = function (ok) {
      sync.busy = false;
      if (ok) {
        markSynced(todo, when);
        setSync('ok', 'Saved to the review log \u2014 ' + items.length + ' in all');
        renderListSafe();
      } else {
        setSync('off', 'Not saved yet \u2014 tap to retry');
      }
    };
    try {
      fetch(endpoint(), {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: body
      }).then(function (r) { return r.ok; }).then(settle, function () { settle(false); });
    } catch (e) {
      settle(false);
    }
  }

  /* ------------------------------------------------------------ describe */

  function shortText(t, max) {
    t = (t || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  function selectorFor(el) {
    if (!el || el.nodeType !== 1) return '';
    var parts = [];
    var node = el;
    var guard = 0;
    while (node && node.nodeType === 1 && node !== document.documentElement && guard++ < 7) {
      if (node.id) {
        parts.unshift('#' + node.id);
        break;
      }
      var tag = node.tagName.toLowerCase();
      var cls = (typeof node.className === 'string' ? node.className : '')
        .split(/\s+/)
        .filter(function (c) { return c && c.indexOf('pa-') !== 0 && c.length < 26; })
        .slice(0, 2)
        .map(function (c) { return '.' + c; })
        .join('');
      var sameTag = node.parentNode
        ? [].filter.call(node.parentNode.children, function (n) { return n.tagName === node.tagName; })
        : [node];
      var nth = sameTag.length > 1 ? ':nth-of-type(' + (sameTag.indexOf(node) + 1) + ')' : '';
      parts.unshift(tag + cls + nth);
      node = node.parentNode;
    }
    return parts.join(' > ');
  }

  function labelFor(el) {
    if (!el || el.nodeType !== 1) return '';
    var tag = el.tagName.toLowerCase();
    var cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter(function (c) { return c && c.indexOf('pa-') !== 0; })
      .slice(0, 3)
      .join('.');
    if (el.id) cls = '#' + el.id;
    var own = [].filter
      .call(el.childNodes, function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.textContent; })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!own) own = shortText(el.textContent, 70);
    return '<' + tag + (cls ? '.' + cls.replace(/^\./, '').replace(/\./g, '.') : '') + '>' + (own ? ' “' + shortText(own, 70) + '”' : '');
  }

  function sectionFor(el) {
    var node = el;
    var guard = 0;
    while (node && node.nodeType === 1 && guard++ < 8) {
      if (/^(section|header|footer|article|aside|main)$/.test(node.tagName.toLowerCase())) {
        var head = node.querySelector('h1,h2,h3,h4,.eyebrow,.kicker');
        var name = node.getAttribute('data-section') || node.id || node.tagName.toLowerCase();
        return { name: name, heading: head ? shortText(head.textContent, 80) : '' };
      }
      node = node.parentNode;
    }
    return { name: 'page', heading: document.title };
  }

  /* ----------------------------------------------------------- position */

  function rectOf(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return r;
  }

  function commentFor(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el || (el.closest && el.closest('#pa-root'))) return null;
    var r = rectOf(el) || { left: x, top: y, width: 1, height: 1 };
    var sec = sectionFor(el);
    return {
      id: uid(),
      n: 0,
      page: keyOf(location.pathname),
      pageTitle: document.title,
      url: location.href.split('#')[0],
      selector: selectorFor(el),
      label: labelFor(el),
      section: sec.name,
      sectionHeading: sec.heading,
      snippet: shortText(el.textContent, 140),
      rect: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height },
      doc: { x: x + scrollX, y: y + scrollY },
      rel: { x: r.width ? (x - r.left) / r.width : 0.5, y: r.height ? (y - r.top) / r.height : 0.5 },
      vp: { w: innerWidth, h: innerHeight },
      scroll: scrollY,
      text: '',
      createdAt: new Date().toISOString()
    };
  }

  /* ----------------------------------------------------------------- ui */

  var root = document.createElement('div');
  root.id = 'pa-root';
  root.setAttribute('aria-live', 'polite');

  var launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'pa-launch';
  launch.title = 'Click a spot on the page to comment there. Double-click to read the log.';
  launch.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-3.8-.8L3 21l1.9-5.2A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>' +
    '<span class="pa-label">Comment</span><span class="pa-count" hidden></span>';

  var toastEl = document.createElement('div');
  toastEl.className = 'pa-toast';

  var panel = document.createElement('div');
  panel.className = 'pa-panel';
  panel.innerHTML =
    '<div class="pa-panel-head"><strong>Comments</strong>' +
    '<button type="button" class="pa-tab pa-on" data-scope="page">This page</button>' +
    '<button type="button" class="pa-tab" data-scope="all">All pages</button>' +
    '<button type="button" class="pa-btn pa-btn-ghost" data-act="close">Close</button></div>' +
    '<ul class="pa-list"></ul>' +
    '<div class="pa-panel-foot">' +
    '<button type="button" class="pa-btn" data-act="copy">Copy all</button>' +
    '<button type="button" class="pa-btn" data-act="text">Show text</button>' +
    '<button type="button" class="pa-btn" data-act="download">Download</button>' +
    '<button type="button" class="pa-btn pa-btn-ghost" data-act="clear">Clear page</button>' +
    '</div>' +
    '<div class="pa-sync" data-state="idle" data-act="sync" role="button" tabindex="0" ' +
    'title="Comments save to the review log by themselves. Tap to save again now."></div>' +
    '<div class="pa-text" hidden><textarea readonly aria-label="Comment log"></textarea>' +
    '<div class="pa-row"><span class="pa-hint">Select all of it and copy, or use Copy all.</span>' +
    '<button type="button" class="pa-btn" data-act="back">Back to list</button></div></div>';

  root.appendChild(launch);
  root.appendChild(panel);
  root.appendChild(toastEl);

  var targetBox = document.createElement('div');
  targetBox.className = 'pa-target';
  targetBox.hidden = true;
  var targetName = document.createElement('div');
  targetName.className = 'pa-target-name';
  targetName.hidden = true;

  function mount() {
    document.body.appendChild(root);
    document.body.appendChild(targetBox);
    document.body.appendChild(targetName);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('pa-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('pa-show'); }, 2400);
  }

  /* ------------------------------------------------------------- arming */

  var armed = false;
  var pop = null;
  var popTarget = null;
  var scope = 'page';

  function setArmed(on) {
    armed = on;
    root.classList.toggle('pa-armed', on);
    launch.classList.toggle('pa-armed', on);
    launch.querySelector('.pa-label').textContent = on ? 'Click a spot' : 'Comment';
    if (!on) {
      targetBox.hidden = true;
      targetName.hidden = true;
      closePop();
    }
  }

  launch.addEventListener('click', function (e) {
    e.stopPropagation();
    setArmed(!armed);
  });

  function outline(el) {
    var r = rectOf(el);
    if (!r) {
      targetBox.hidden = true;
      targetName.hidden = true;
      return;
    }
    targetBox.hidden = false;
    targetBox.style.left = r.left + 'px';
    targetBox.style.top = r.top + 'px';
    targetBox.style.width = r.width + 'px';
    targetBox.style.height = r.height + 'px';
    var sec = sectionFor(el);
    targetName.hidden = false;
    targetName.textContent = (sec.name === 'page' ? '' : sec.name + ' · ') + labelFor(el).slice(0, 90);
    var ty = r.top > 30 ? r.top - 24 : r.bottom + 6;
    targetName.style.left = Math.max(6, Math.min(r.left, innerWidth - 260)) + 'px';
    targetName.style.top = ty + 'px';
  }

  document.addEventListener(
    'pointermove',
    function (e) {
      if (!armed || pop) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || (el.closest && el.closest('#pa-root'))) return;
      outline(el);
    },
    true
  );

  document.addEventListener(
    'click',
    function (e) {
      if (!armed) return;
      var own = e.target.closest && e.target.closest('#pa-root');
      if (own) return;
      if (pop) {
        e.preventDefault();
        e.stopPropagation();
        closePop();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      var draft = commentFor(e.clientX, e.clientY);
      if (!draft) return;
      openPop(draft, e.clientX, e.clientY);
    },
    true
  );

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (pop) {
      closePop();
    } else if (armed) {
      setArmed(false);
    }
  });

  /* ---------------------------------------------------------- the form */

  function closePop() {
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    pop = null;
    popTarget = null;
  }

  function openPop(draft, x, y) {
    closePop();
    popTarget = draft;
    pop = document.createElement('div');
    pop.className = 'pa-pop';
    pop.innerHTML =
      '<div class="pa-pop-head"><span>New comment</span><span data-role="nth"></span></div>' +
      '<p class="pa-pop-where"></p>' +
      '<textarea placeholder="What is wrong here, or what should change?" aria-label="Comment"></textarea>' +
      '<div class="pa-row"><span class="pa-hint">Ctrl/⌘ + Enter saves · Esc cancels</span>' +
      '<button type="button" class="pa-btn" data-act="cancel">Cancel</button>' +
      '<button type="button" class="pa-btn pa-btn-primary" data-act="save">Save</button></div>';
    pop.querySelector('.pa-pop-where').innerHTML =
      '<strong>' + escapeHtml(draft.sectionHeading || draft.section) + '</strong>' +
      '<span>' + escapeHtml(draft.label) + ' · ' + escapeHtml(draft.selector) + '</span>';
    pop.querySelector('[data-role=nth]').textContent = '#' + (items.filter(onPage).length + 1);
    pop.querySelector('textarea').addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
        ev.preventDefault();
        commit();
      }
    });
    pop.querySelector('[data-act=cancel]').addEventListener('click', closePop);
    pop.querySelector('[data-act=save]').addEventListener('click', commit);
    // Inside #pa-root, so the page-level picker treats our own form as furniture
    // rather than as a click target to comment on.
    root.appendChild(pop);

    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var left = Math.min(Math.max(8, x + 14), innerWidth - w - 8);
    var top = y + 14;
    if (top + h > innerHeight - 8) top = Math.max(8, y - h - 14);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.querySelector('textarea').focus();
  }

  function commit() {
    if (!pop || !popTarget) return;
    var text = pop.querySelector('textarea').value.trim();
    if (!text) {
      toast('Nothing written yet');
      return;
    }
    var draft = popTarget;
    draft.text = text;
    items.push(draft);
    renumber();
    saveAll(items);
    syncNow(false);
    closePop();
    render();
    flash(draft);
    toast('Saved — ' + shortText(text, 64));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------- pins */

  function onPage(c) {
    return c.page === keyOf(location.pathname);
  }

  function renumber() {
    var byPage = {};
    items.forEach(function (c) {
      byPage[c.page] = byPage[c.page] || 0;
      c.n = ++byPage[c.page];
    });
  }

  function anchorOf(c) {
    var el = null;
    try { el = c.selector ? document.querySelector(c.selector) : null; } catch (e) { el = null; }
    var r = el ? rectOf(el) : null;
    if (r) {
      return {
        x: r.left + c.rel.x * r.width,
        y: r.top + c.rel.y * r.height,
        box: { left: r.left, top: r.top, width: r.width, height: r.height },
        live: true
      };
    }
    return {
      x: c.doc.x - scrollX,
      y: c.doc.y - scrollY,
      box: c.rect ? { left: c.rect.x - scrollX, top: c.rect.y - scrollY, width: c.rect.w, height: c.rect.h } : null,
      live: false
    };
  }

  function render() {
    renumber();
    root.querySelectorAll('.pa-pin').forEach(function (p) { p.remove(); });
    if (panel.classList.contains('pa-open')) renderList();
    items.filter(onPage).forEach(function (c) {
      var a = anchorOf(c);
      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pa-pin';
      pin.textContent = c.n;
      pin.title = shortText(c.text, 120);
      pin.style.left = a.x + 'px';
      pin.style.top = a.y + 'px';
      pin.addEventListener('click', function (ev) {
        ev.stopPropagation();
        flash(c);
        openList();
      });
      root.appendChild(pin);
    });
    var here = items.filter(onPage).length;
    var all = items.length;
    var count = launch.querySelector('.pa-count');
    count.hidden = !all;
    count.textContent = String(here || all);
  }

  function flash(c) {
    var a = anchorOf(c);
    if (!a.box) return;
    var box = document.createElement('div');
    box.className = 'pa-flash';
    box.style.left = a.box.left + 'px';
    box.style.top = a.box.top + 'px';
    box.style.width = a.box.width + 'px';
    box.style.height = a.box.height + 'px';
    box.style.position = 'absolute';
    root.appendChild(box);
    if (!a.live) {
      var el = null;
      try { el = c.selector ? document.querySelector(c.selector) : null; } catch (e) {}
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      else scrollTo({ top: Math.max(0, c.doc.y - innerHeight / 2), behavior: 'smooth' });
    }
    setTimeout(function () { box.style.opacity = '0'; }, 1200);
    setTimeout(function () { box.remove(); }, 1800);
  }

  /* ------------------------------------------------------------ the log */

  function renderList() {
    var list = panel.querySelector('.pa-list');
    var shown = scope === 'page' ? items.filter(onPage) : items.slice();
    if (!shown.length) {
      list.innerHTML =
        '<li class="pa-empty">' +
        (scope === 'page'
          ? 'No comments on this page yet.<br>Press <strong>Comment</strong>, then click the spot you mean.'
          : 'No comments saved in this browser yet.') +
        '</li>';
      return;
    }
    list.innerHTML = shown
      .map(function (c) {
        return (
          '<li class="pa-item" data-id="' + c.id + '">' +
          '<div class="pa-item-where"><span class="pa-item-n">' + c.n + '</span>' +
          '<em>' + escapeHtml(c.sectionHeading || c.section) + (scope === 'all' ? ' · ' + escapeHtml(c.page) : '') + '</em></div>' +
          '<p class="pa-item-body">' + escapeHtml(c.text) + '</p>' +
          '<div class="pa-item-acts">' +
          (onPage(c) ? '<button type="button" class="pa-mini" data-act="jump">Show me</button>' : '') +
          '<button type="button" class="pa-mini" data-act="copy">Copy</button>' +
          '<button type="button" class="pa-mini" data-act="edit">Edit</button>' +
          '<button type="button" class="pa-mini" data-act="del">Delete</button>' +
          '</div></li>'
        );
      })
      .join('');
  }

  panel.addEventListener('click', function (e) {
    var tab = e.target.closest('.pa-tab');
    if (tab) {
      scope = tab.getAttribute('data-scope');
      panel.querySelectorAll('.pa-tab').forEach(function (t) { t.classList.toggle('pa-on', t === tab); });
      renderList();
      return;
    }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    var action = act.getAttribute('data-act');
    if (action === 'sync') {
      syncNow(false);
      toast('Saving the log to the review service');
      return;
    }
    if (action === 'close') {
      panel.classList.remove('pa-open');
      return;
    }
    if (action === 'copy') {
      copyText(exportText(items.filter(onPage)), 'Log copied for this page');
      return;
    }
    if (action === 'text') {
      showText();
      return;
    }
    if (action === 'back') {
      panel.querySelector('.pa-text').hidden = true;
      panel.querySelector('.pa-list').hidden = false;
      return;
    }
    if (action === 'download') {
      download();
      return;
    }
    if (action === 'clear') {
      var here = items.filter(onPage);
      if (!here.length) { toast('Nothing to clear on this page'); return; }
      if (!confirm('Delete ' + here.length + ' comment(s) on this page?')) return;
      items = items.filter(function (c) { return !onPage(c); });
      saveAll(items);
      render();
      renderList();
      return;
    }
    var row = act.closest('.pa-item');
    var c = items.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0];
    if (!c) return;
    if (action === 'jump') {
      if (!onPage(c)) return;
      flash(c);
    } else if (action === 'copy') {
      copyText(oneText(c, true), 'Comment copied');
    } else if (action === 'edit') {
      var next = prompt('Edit comment', c.text);
      if (next === null) return;
      c.text = next.trim() || c.text;
      c.updatedAt = new Date().toISOString();
      saveAll(items);
      syncNow(false);
      renderList();
      render();
    } else if (action === 'del') {
      items = items.filter(function (x) { return x.id !== c.id; });
      saveAll(items);
      render();
      renderList();
    }
  });

  function openList() {
    panel.classList.add('pa-open');
    renderList();
  }

  /* The clipboard is the polite path, not the only one: some browsers refuse it
   * on an unfocused window. "Show text" puts the same log in a field she can
   * select by hand, so the log can always leave the browser. */
  function showText() {
    var pane = panel.querySelector('.pa-text');
    var list = scope === 'page' ? items.filter(onPage) : items.slice();
    if (!list.length) {
      toast('Nothing to show yet');
      return;
    }
    pane.hidden = false;
    panel.querySelector('.pa-list').hidden = true;
    var ta = pane.querySelector('textarea');
    ta.value = exportText(list);
    ta.focus();
    ta.select();
  }

  launch.addEventListener('dblclick', function () {
    openList();
  });

  /* ---------------------------------------------------------- export */

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function oneText(c, withPage) {
    var pct = Math.round(c.rel.x * 100) + '% / ' + Math.round(c.rel.y * 100) + '%';
    var lines = [
      (withPage ? '[' + c.n + '] ' + c.page + ' — ' : '[' + c.n + '] ') + (c.sectionHeading || c.section),
      '    element: ' + c.label,
      '    selector: ' + c.selector,
      '    position: ' + pct + ' inside that element · page ' + Math.round(c.doc.x) + '×' + Math.round(c.doc.y) +
        ' · element ' + Math.round(c.rect.w) + '×' + Math.round(c.rect.h) + 'px · viewport ' + c.vp.w + '×' + c.vp.h + ' @ scroll ' + Math.round(c.scroll),
      '    note: ' + c.text.replace(/\n/g, '\n          ')
    ];
    return lines.join('\n');
  }

  function exportText(list) {
    var pages = {};
    list.forEach(function (c) { pages[c.page] = 1; });
    var head =
      'PULSE REVIEW — ' + list.length + ' comment' + (list.length === 1 ? '' : 's') +
      ' · ' + Object.keys(pages).length + ' page' + (Object.keys(pages).length === 1 ? '' : 's') +
      ' · exported ' + stamp();
    return head + '\n\n' + list.map(function (c) { return oneText(c, true); }).join('\n\n');
  }

  function copyText(text, msg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? msg : 'Copy blocked — select the panel text instead');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    } else {
      fallback();
    }
  }

  function download() {
    var blob = new Blob([JSON.stringify({ exported: stamp(), items: items }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pulse-review-' + stamp().replace(/[: ]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 400);
    toast('Saved the JSON file');
  }

  /* ------------------------------------------------------------ repaint */

  var ticking = false;
  function repaint() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (!armed) {
        targetBox.hidden = true;
        targetName.hidden = true;
      }
      render();
    });
  }

  addEventListener('scroll', repaint, { passive: true });
  addEventListener('resize', repaint);

  /* Anything this browser already holds — a comment left on a phone before the
   * service existed, say — goes up on the first load after this ships. */
  function syncOnArrival() {
    if (!items.length) { setSync('idle', ''); return; }
    var waiting = items.filter(needsSync).length;
    setSync(waiting ? 'sending' : 'ok', waiting ? 'Saving\u2026' : 'Saved to the review log');
    if (waiting) setTimeout(function () { syncNow(false); }, 600);
  }

  addEventListener('pagehide', function () { syncNow(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') syncNow(true);
  });

  render();
  syncOnArrival();
})();
