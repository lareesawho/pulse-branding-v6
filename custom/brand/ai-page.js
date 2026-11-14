/* ============================================================================
   /services/ai-consulting/ — the sixth discipline, as its own page.

   The page is a copy of /services/ (same template, same chrome, same scripts)
   with one block kept. Everything here writes into text nodes the template
   already rendered — no spans replaced, no markup invented — so the type,
   the reveals and the hover behaviour stay the template's.
   ========================================================================== */
(function () {
  'use strict';

  var TEXT = {
    eyebrow: 'Services — 06',
    title: 'AI Consulting',
    lede: 'AI that can act inside a business process: audits, knowledge systems and customer-facing agents, with a person in control.',
    count: 'One discipline'
  };

  function setText(el, text) {
    if (!el) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var first = walker.nextNode();
    if (!first) { el.appendChild(document.createTextNode(text)); return; }
    first.nodeValue = text;
    var node;
    while ((node = walker.nextNode())) node.nodeValue = '';
  }

  /* The template renders the title one span per letter and colours the last one.
     Keep that shape: the letters of each word go into the spans that exist, and
     the closing word carries the accent colour the rest of the site uses. */
  function writeTitle(h1) {
    var letters = [].filter.call(h1.querySelectorAll('span'), function (s) {
      return s.querySelectorAll('span').length === 0;
    });
    if (!letters.length) { setText(h1, TEXT.title); return; }
    var words = TEXT.title.split(' ');
    for (var i = 0; i < letters.length; i++) letters[i].textContent = '';
    if (words.length === 1) {
      letters[0].textContent = words[0];
      return;
    }
    letters[0].textContent = words.slice(0, -1).join(' ') + ' ';
    var last = letters[letters.length - 1];
    last.textContent = words[words.length - 1];
    last.style.color = 'var(--accent)';
    tidyTitle(h1);
  }

  /* The template's title is six words; this page's is two. Blanking the unused
     letter spans leaves their word wrappers in the line, and the whitespace
     between those wrappers is printed because the h1 is `white-space: pre-wrap`
     — a 140px hole between "AI" and "CONSULTING". Drop the emptied spans, then
     keep exactly one space between what is left. */
  function tidyTitle(h1) {
    [].slice.call(h1.children).forEach(function (w) {
      var keep = [].some.call(w.querySelectorAll('span'), function (s) {
        return (s.textContent || '').trim().length > 0;
      });
      if (!keep) w.remove();
    });
    [].forEach.call(h1.querySelectorAll('span'), function (s) {
      if (s.children.length === 0 && !(s.textContent || '').trim().length) s.remove();
    });
    var seenSpace = false;
    [].slice.call(h1.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      if (seenSpace) { n.remove(); return; }
      n.nodeValue = ' ';
      seenSpace = true;
    });
  }

  function apply() {
    if (!document.body) return;

    /* the page header: eyebrow, title, lede */
    var header = document.querySelector('[data-framer-name="Page Header"]');
    if (header) {
      var h1 = header.querySelector('h1');
      if (h1 && h1.textContent.trim().replace(/\s+/g, ' ') !== TEXT.title) writeTitle(h1);

      var paras = header.querySelectorAll('p');
      if (paras[0]) setText(paras[0], TEXT.eyebrow);
      /* the lede is the longest run of text in the header */
      var lede = null;
      header.querySelectorAll('p').forEach(function (p) {
        if ((p.textContent || '').length > 40) lede = p;
      });
      if (lede) setText(lede, TEXT.lede);
    }

    /* the discipline count line */
    document.querySelectorAll('p, span, h2, h3').forEach(function (el) {
      if (el.children.length === 0 && /^\s*0?6\s*DISCIPLINES\s*$/i.test(el.textContent || '')) {
        setText(el, TEXT.count);
      }
    });

    /* the CTA at the end of the block still points at the services index */
    document.querySelectorAll('a[href="/services"]').forEach(function (a) {
      if ((a.textContent || '').trim().length === 0) a.setAttribute('href', '/contact');
    });
  }

  function start() {
    apply();
    var runs = 0;
    var timer = setInterval(function () { apply(); if (++runs >= 8) clearInterval(timer); }, 250);
    new MutationObserver(function () {
      clearTimeout(start._d);
      start._d = setTimeout(apply, 160);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
