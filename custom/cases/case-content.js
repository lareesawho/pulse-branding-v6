/* ============================================================================
   Case page content — applied after hydration.

   The template's case page is a Framer page whose content comes from component
   defaults in the shipped module, so a static HTML edit alone is re-rendered back
   to the template's demo case on hydration. This layer writes the real project
   data into the template's own nodes after mount, and re-applies for a few
   seconds so late renders cannot win.

   Data comes from window.__PULSE_CASE__ (inlined per route by tools/cases/build-pages.js).
   ========================================================================== */
(function () {
  'use strict';

  var C = window.__PULSE_CASE__;
  if (!C) return;

  var PRE_STYLE = 'display:inline-block;opacity:1;filter:blur(0px);transform:none;will-change:transform';

  function setText(el, text) {
    if (!el) return false;
    if (el.textContent !== text) el.textContent = text;
    return true;
  }

  function setRich(container, text) {
    if (!container) return false;
    var p = container.querySelector('p, h1, h2, h3, h4');
    return setText(p || container, text);
  }

  function find(name) {
    return document.querySelector('[data-framer-name="' + name + '"]');
  }

  function headerTitle(name) {
    var wrap = find('Page Title');
    var h1 = wrap && wrap.querySelector('h1');
    if (!h1) return false;
    var spans = h1.querySelectorAll('span[style]');
    var current = h1.textContent.replace(/\s+/g, ' ').trim();
    if (current === name && spans.length) return false;
    h1.innerHTML = name.split(' ').map(function (word) {
      return '<span style="white-space:nowrap">' +
        word.split('').map(function (ch) { return '<span style="' + PRE_STYLE + '">' + ch + '</span>'; }).join('') +
        '</span>';
    }).join(' ');
    return true;
  }

  function applyFacts() {
    var map = [
      ['Fact Client', C.client],
      ['Fact Year', C.year],
      ['Fact Sector', C.sector],
      ['Fact Services', C.services]
    ];
    map.forEach(function (pair) {
      var box = find(pair[0]);
      if (!box) return;
      var rich = box.querySelectorAll('[data-framer-name="Default"] [data-framer-component-type="RichTextContainer"]');
      var target = rich.length ? rich[rich.length - 1] : box.querySelector('[data-framer-component-type="RichTextContainer"]');
      setRich(target, String(pair[1]));
    });
  }

  function applyStory() {
    var rows = [
      ['Overview', C.overview],
      ['The Challenge', C.challenge],
      ['Our Approach', C.approach],
      ['The Result', C.result]
    ];
    rows.forEach(function (pair) {
      var box = find(pair[0]);
      if (!box) return;
      var rich = box.querySelectorAll('[data-framer-component-type="RichTextContainer"]');
      var target = rich[rich.length - 1];
      setRich(target, pair[1]);
    });
  }

  function setImage(container, src, alt) {
    if (!container) return false;
    var img = container.querySelector('img');
    if (!img) return false;
    var abs = new URL(src, location.origin).href;
    if (img.getAttribute('src') !== abs) {
      img.removeAttribute('srcset');
      img.src = abs;
    }
    if (alt && img.getAttribute('alt') !== alt) img.alt = alt;
    return true;
  }

  function applyImages() {
    setImage(find('Cover'), C.cover, C.name);
    if (C.shotA) setImage(find('Shot A'), C.shotA, C.name);
    if (C.shotB) setImage(find('Shot B'), C.shotB, C.name);
  }

  function applyNext() {
    var card = find('Next Card');
    if (card && card.setAttribute) {
      var href = './' + C.nextSlug;
      if (card.getAttribute('href') !== href) card.setAttribute('href', href);
    }
    var title = find('Next Title');
    if (title) {
      var h1 = title.querySelector('h1');
      setText(h1 || title, C.nextName.toUpperCase());
    }
  }

  function applyHeader() {
    // "Case Study — 2026" label
    var tagline = 'Case Study — ' + C.year;
    var nodes = document.querySelectorAll('[data-framer-name="Header Top"] p, [data-framer-name="Header Top"] h4');
    nodes.forEach(function (node) {
      if (/Case Study\s*—\s*\d{4}/i.test(node.textContent)) setText(node, tagline);
    });
    setRich(find('Page Intro'), C.tagline);
    headerTitle(C.name.toUpperCase());
  }

  function applyDeliverables() {
    var box = find('Deliverables');
    if (!box) return;
    var p = box.querySelector('p');
    setText(p, C.services);
  }

  function applyMeta() {
    var title = C.name + ' — Case study — Pulse';
    if (document.title !== title) document.title = title;
    var set = function (sel, attr, value) {
      var el = document.querySelector(sel);
      if (el) el.setAttribute(attr, value);
    };
    set('link[rel="canonical"]', 'href', location.origin + '/work/' + C.slug);
    set('meta[property="og:url"]', 'content', location.origin + '/work/' + C.slug);
    set('meta[property="og:title"]', 'content', title);
    set('meta[name="twitter:title"]', 'content', title);
  }

  function applyAll() {
    if (!document.body) return;
    applyHeader();
    applyFacts();
    applyStory();
    applyDeliverables();
    applyImages();
    applyNext();
    applyMeta();
  }

  function start() {
    applyAll();
    var runs = 0;
    var timer = setInterval(function () { applyAll(); if (++runs >= 12) clearInterval(timer); }, 300);
    var debounce;
    new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(applyAll, 120);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('load', function () { setTimeout(applyAll, 200); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
