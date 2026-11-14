/* ============================================================================
   PULSE name + offer pass. Deliberately small.

   It changes two things and nothing else:
     1. the brand name (ORENZA → Pulse, the email, the copyright, the tab title)
     2. the service offering (the template's five disciplines → Pulse's four)

   Every other word on the site stays as the template wrote it. Applied after
   hydration because the templates are hydrated Framer apps, and nothing is ever
   added to or removed from the DOM — replacing child spans crashes React's commit.
   ========================================================================== */
(function () {
  'use strict';

  var NAME = 'Pulse';
  var EMAIL = 'contact@pulse-branding.com';

  /* OFFERS SWAP — deliberately OFF.
     The template's own copy is the thing being kept: its five disciplines, its ledes and
     its item lists stay exactly as ORENZA wrote them. Only the brand name is swapped.
     Flip to true to replace the five with Pulse's four (the data is still below). */
  var SWAP_OFFERS = false;

  var NAMES = [
    ['ORENZA Studio', 'Pulse Branding'],
    ['ORENZA STUDIO', 'PULSE BRANDING'],
    ['hello@orenza.studio', EMAIL],
    ['ORENZA', 'Pulse']
  ];

  /* Services page: five blocks → Pulse's four. */
  var SERVICES = [
    ['Build a clear foundation for your brand.', 'Find the problem beneath the brief, then decide what has to change.'],
    ['Positioning', 'Positioning', true], ['Research', 'Customer psychology', true],
    ['Brand Architecture', 'Market evidence', true], ['Messaging', 'Message system', true],
    ['Creative Direction', 'Creative direction', true],
    ['Visual Identity', 'Brand Identity'],
    ['Give your brand a distinctive point of view.', 'Make the idea impossible to mistake.'],
    ['Logo Systems', 'Recognition device', true], ['Typography', 'Typography', true],
    ['Color Systems', 'Colour', true], ['Art Direction', 'Imagery and art direction', true],
    ['Brand Guidelines', 'Brand centre', true],
    ['Digital Design', 'Digital Experience'],
    ['Design digital products people want to use.', 'Design the moment someone decides to continue.'],
    ['UX Strategy', 'Experience strategy', true], ['UI Design', 'UX and UI', true],
    ['Web Design', 'Web design and build', true], ['Design Systems', 'Design system', true],
    ['Prototyping', 'Motion and interaction', true],
    ['Creative Development', 'AI Consulting'],
    ['Turn ideas into high-performing digital experiences.', 'AI that can act, and knows when not to.'],
    ['Framer Development', 'Workflow audit', true], ['Web Development', 'Knowledge systems', true],
    ['Interactions', 'Customer-facing agents', true], ['Animations', 'Revenue operations', true],
    ['CMS', 'AI visibility', true]
  ];

  /* Home page repeats the same list, so it takes the same four. */
  var HOME_SERVICES = [
    ['Visual Identity', 'Brand Identity'],
    ['Digital Design', 'Digital Experience'],
    ['Creative Development', 'AI Consulting'],
    ['Identity systems, art direction, typography, color, and visual languages designed to make brands recognizable.',
      'Make the idea impossible to mistake. Recognition device, type, colour, imagery, language and motion, built as one system.'],
    ['Websites and digital experiences that balance strong visual design with intuitive user experiences.',
      'Design the moment someone decides to continue. Meaning, structure, interface, system and build.'],
    ['High-quality digital builds that bring creative concepts to life with thoughtful interactions and performance.',
      'AI that can act, and knows when not to. Workflow audit, knowledge systems, customer-facing agents and supervised automation.'],
    ['Positioning, research, messaging, creative direction, and brand strategy that give your business a clear point of view.',
      'Find the problem beneath the brief, then decide what actually has to change. Positioning, audience psychology, market evidence, message system and creative direction.'],
    ['LOGO SYSTEMS · TYPOGRAPHY · ART DIRECTION', 'Mark · type · colour · motion'],
    ['UX STRATEGY · UI DESIGN · DESIGN SYSTEMS', 'Structure · interface · system'],
    ['FRAMER · INTERACTIONS · CMS', 'Workflow · knowledge · agents']
  ];

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function isCaps(s) {
    var letters = s.replace(/[^A-Za-z]/g, '');
    return letters.length > 0 && letters === letters.toUpperCase();
  }

  function sub(text, from, to) {
    var re = new RegExp(escapeRe(from), 'gi');
    if (!re.test(text)) return text;
    var letters = from.replace(/[^A-Za-z]/g, '').length;
    return text.replace(re, function (m) {
      if (from === 'ORENZA') return isCaps(m) ? 'PULSE' : NAME;
      return isCaps(m) && letters >= 4 ? to.toUpperCase() : to;
    });
  }

  function applyPairs(text, pairs) {
    var out = text;
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][0] === pairs[i][1] || pairs[i][2]) continue;
      out = sub(out, pairs[i][0], pairs[i][1]);
    }
    return out;
  }

  /* Text nodes only — no node is ever added or removed. */
  function rewriteTextNodes(root, pairs) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) {
      var next = applyPairs(nodes[i].nodeValue, pairs);
      if (next !== nodes[i].nodeValue) nodes[i].nodeValue = next;
    }
  }

  /* Short words the template splits per character (discipline names, list items):
     written into the element's first text node, the rest emptied. */
  function rewriteSplit(root, pairs) {
    var els = root.querySelectorAll('p, span, h1, h2, h3, h4');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.querySelector('img, svg, a, button, input, textarea, select')) continue;
      if (el.querySelectorAll('*').length > 60) continue;
      var raw = el.textContent.replace(/\s+/g, ' ').trim();
      if (!raw || raw.length > 140) continue;
      for (var j = 0; j < pairs.length; j++) {
        var from = pairs[j][0], to = pairs[j][1];
        if (from === to) continue;
        if (raw.toLowerCase() !== from.toLowerCase()) continue;
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var nodes = [], n2;
        while ((n2 = walker.nextNode())) nodes.push(n2);
        if (!nodes.length) break;
        var target = null;
        for (var k = 0; k < nodes.length; k++) if (nodes[k].nodeValue.trim()) { target = nodes[k]; break; }
        if (!target) target = nodes[0];
        if (target.nodeValue !== to) {
          target.nodeValue = isCaps(raw) && to.indexOf(' ') === -1 ? to.toUpperCase() : to;
          for (var m = 0; m < nodes.length; m++) if (nodes[m] !== target) nodes[m].nodeValue = '';
        }
        break;
      }
    }
  }

  /* Per-character split words (the template tokenises big display type one span per
     glyph). A plain text-node rewrite cannot see "ORENZA" there because each node
     holds one letter, so the letters are remapped *in place* — same nodes, same count,
     so the character reveal keeps working and React never sees a changed child list. */
  function rewriteSplitChars(root) {
    var els = root.querySelectorAll('p, span, h1, h2, h3, h4');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.children.length) continue;
      if (el.querySelectorAll('*').length > 40) continue;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);
      if (nodes.length < 3) continue;
      var raw = nodes.map(function (x) { return x.nodeValue; }).join('');
      if (!/orenza/i.test(raw)) continue;

      var guard = 0;
      var idx = raw.toLowerCase().indexOf('orenza');
      while (idx !== -1 && guard++ < 8) {
        var caps = isCaps(raw.slice(idx, idx + 6));
        var repl = caps ? 'PULSE' : NAME;
        var pos = 0;
        for (var k = 0; k < nodes.length; k++) {
          var v = nodes[k].nodeValue, start = pos, end = pos + v.length;
          pos = end;
          if (end <= idx || start >= idx + 6) continue;
          var res = '';
          for (var c = 0; c < v.length; c++) {
            var abs = start + c;
            if (abs < idx || abs >= idx + 6) { res += v[c]; continue; }
            var ri = abs - idx;
            res += ri < repl.length ? repl[ri] : '';
          }
          nodes[k].nodeValue = res;
        }
        raw = nodes.map(function (x) { return x.nodeValue; }).join('');
        idx = raw.toLowerCase().indexOf('orenza');
      }
    }
  }

  /* Attributes a person can click or read. href matters most: hydration re-renders
     the server markup, which puts mailto:hello@orenza.studio back, so every email
     link on the site would open the template's mailbox without this.
     data-framer-name / name are node labels; the home card's is "More About
     ORENZA", which view-source would still show. Nothing selects that label, and
     the substring selector keeps the per-frame walk cheap. */
  var ATTRS = ['href', 'alt', 'aria-label', 'title', 'placeholder', 'data-framer-name', 'name'];
  var ATTR_SEL = '[href], [alt], [aria-label], [title], [placeholder], [data-framer-name*="ORENZA"], [name*="ORENZA"]';

  function rewriteAttrs(root) {
    root.querySelectorAll(ATTR_SEL).forEach(function (el) {
      for (var i = 0; i < ATTRS.length; i++) {
        var attr = ATTRS[i];
        var v = el.getAttribute(attr);
        if (!v || !/orenza/i.test(v)) continue;
        el.setAttribute(attr, applyPairs(v, NAMES));
      }
    });
  }

  function hideFifth() {
    var blocks = document.querySelectorAll('[data-framer-name="Service Block"]');
    for (var i = 4; i < blocks.length; i++) blocks[i].style.setProperty('display', 'none', 'important');
    ['Row 5', 'Panel 5'].forEach(function (n) {
      var el = document.querySelector('[data-framer-name="' + n + '"]');
      if (el) el.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('[data-framer-name="Ticker"] li').forEach(function (li) {
      if (/campaigns & content/i.test(li.textContent) || /ai visibility/i.test(li.textContent)) {
        li.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function applyMeta() {
    if (/orenza/i.test(document.title)) document.title = document.title.replace(/orenza/gi, 'Pulse');
    document.querySelectorAll('meta[property="og:site_name"]').forEach(function (el) {
      el.setAttribute('content', 'Pulse');
    });
    document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[property="og:title"], meta[name="twitter:title"]')
      .forEach(function (el) {
        var v = el.getAttribute('content');
        if (v && /orenza/i.test(v)) el.setAttribute('content', v.replace(/orenza/gi, 'Pulse'));
      });
    if (!document.querySelector('link[data-pulse-favicon]')) {
      var l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/svg+xml';
      l.href = '/custom/brand/favicon.svg';
      l.setAttribute('data-pulse-favicon', '');
      document.head.appendChild(l);
    }
  }

  function applyAll() {
    if (!document.body) return;
    rewriteTextNodes(document.body, NAMES);
    rewriteSplitChars(document.body);
    rewriteAttrs(document.body);
    if (SWAP_OFFERS) {
      document.querySelectorAll('[data-framer-name="Service Block"]').forEach(function (el) { rewriteSplit(el, SERVICES); });
      document.querySelectorAll('[data-framer-name="Services Showcase"], [data-framer-name="Ticker"]').forEach(function (el) { rewriteSplit(el, HOME_SERVICES); });
      hideFifth();
    }
    applyMeta();
  }

  /* A mutation that puts the template's name back is the hydration commit
     re-rendering the server markup over ours. It has to be undone in *this*
     microtask, before the frame paints: "We are ORENZA." is a character longer
     than "We are PULSE." and re-wraps the page title to two lines, so the 140 ms
     debounce below left a visible 41 px jump (CLS 0.136 on /about/ at 390, twice
     that when the layout settled again). */
  function reverted(records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'characterData') {
        if (/orenza/i.test(r.target.nodeValue || '')) return true;
        continue;
      }
      for (var j = 0; j < r.addedNodes.length; j++) {
        var n = r.addedNodes[j];
        var text = n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 ? n.textContent : '';
        if (/orenza/i.test(text || '')) return true;
        if (n.nodeType === 1) {
          for (var a = 0; a < ATTRS.length; a++) {
            var av = n.getAttribute && n.getAttribute(ATTRS[a]);
            if (av && /orenza/i.test(av)) return true;
          }
        }
      }
    }
    return false;
  }

  function start() {
    applyAll();
    var again = 0;
    var t = setInterval(function () { applyAll(); if (++again >= 5) clearInterval(t); }, 250);
    var mo = new MutationObserver(function (records) {
      if (reverted(records)) { applyAll(); return; }
      clearTimeout(window.__pulseDebounce);
      window.__pulseDebounce = setTimeout(applyAll, 140);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', function () { setTimeout(applyAll, 80); });
    var last = location.pathname;
    setInterval(function () {
      if (location.pathname === last) return;
      last = location.pathname;
      setTimeout(applyAll, 160);
    }, 320);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
