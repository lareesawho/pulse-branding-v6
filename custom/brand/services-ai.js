/* ============================================================================
   Sixth discipline: AI Consulting.

   The template ships five disciplines. This adds the sixth in the template's own
   shape: on /services a cloned Service Block (same component markup, same type,
   same list rhythm) and on the home page a cloned row + panel, so the hover list
   keeps its behaviour.

   Everything is done after hydration and by cloning the template's own nodes:
   nothing is rebuilt by hand, so spacing, borders, hover states and the reveal
   animation stay identical.
   ========================================================================== */
(function () {
  'use strict';

  var AI = {
    number: '06',
    title: 'AI Consulting',
    lede: 'AI that can act — and knows when not to.',
    items: [
      'Workflow Audit',
      'Knowledge Systems',
      'Customer-Facing Agents',
      'Revenue Operations',
      'AI Visibility'
    ],
    card: 'Workflow audits, knowledge systems and customer-facing agents designed to act inside real business processes, with a person in control.',
    tags: 'WORKFLOW AUDIT · KNOWLEDGE SYSTEMS · AGENTS',
    image: '/images/services/ai-consulting.webp'
  };

  /* Write into the template's existing text node; never replace the element, never add spans. */
  function setText(el, text) {
    if (!el) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var first = walker.nextNode();
    if (!first) { el.appendChild(document.createTextNode(text)); return; }
    first.nodeValue = text;
    var node;
    while ((node = walker.nextNode())) node.nodeValue = '';
  }

  function swapImage(img, src, alt) {
    if (!img) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = src;
    img.alt = alt;
  }

  /* ---------------------------------------------------------------- /services */
  function applyServices() {
    var wrap = document.querySelector('[data-framer-name="Service Blocks"]');
    if (!wrap || wrap.querySelector('.pulse-ai-block')) return false;
    var last = wrap.lastElementChild;
    if (!last || !last.querySelector) return false;

    var block = last.cloneNode(true);
    block.classList.add('pulse-ai-block');
    block.style.opacity = '1';
    block.style.transform = 'none';
    block.style.willChange = 'auto';

    var left = block.querySelector('[data-framer-name="Left"]');
    var right = block.querySelector('[data-framer-name="Right"]');
    if (!left || !right) return false;

    var texts = left.querySelectorAll('[data-framer-component-type="RichTextContainer"]');
    setText(texts[0] && texts[0].querySelector('p'), AI.number);
    setText(left.querySelector('h2'), AI.title);
    setText(texts[2] && texts[2].querySelector('p'), AI.lede);

    var items = right.querySelectorAll('[data-framer-name="Item"]');
    for (var i = 0; i < items.length && i < AI.items.length; i++) {
      setText(items[i].querySelector('h4'), AI.items[i]);
    }

    swapImage(right.querySelector('[data-framer-name="Image"] img'), AI.image, AI.title);

    wrap.appendChild(block);

    // the page label counts the disciplines
    document.querySelectorAll('p, span, h2, h3').forEach(function (el) {
      if (el.children.length === 0 && /^\s*05\s*DISCIPLINES\s*$/i.test(el.textContent || '')) {
        el.textContent = el.textContent.replace(/05/, '06');
      }
    });
    return true;
  }

  /* -------------------------------------------------------------------- home */
  function applyHome() {
    var names = document.querySelector('[data-framer-name="Names"]');
    var panels = document.querySelector('[data-framer-name="Panels"]');
    if (!names || !panels || names.querySelector('.pulse-ai-row')) return false;

    var row = names.lastElementChild.cloneNode(true);
    row.classList.add('pulse-ai-row');
    row.setAttribute('data-framer-name', 'Row 6');
    row.setAttribute('href', '/services');
    setText(row.querySelector('[data-framer-name="No"] p'), AI.number);
    setText(row.querySelector('[data-framer-name="Name"] p'), 'AI CONSULTING');
    names.appendChild(row);

    var panel = panels.lastElementChild.cloneNode(true);
    panel.classList.add('pulse-ai-panel');
    panel.setAttribute('data-framer-name', 'Panel 6');
    swapImage(panel.querySelector('img'), AI.image, AI.title);
    setText(panel.querySelector('h3'), AI.title);
    var paras = panel.querySelectorAll('p');
    setText(paras[0], AI.card);
    setText(paras[1], AI.tags);
    panels.appendChild(panel);

    var root = document.documentElement;
    var enter = function () { root.classList.add('pulse-ai-hover'); };
    var leave = function () { root.classList.remove('pulse-ai-hover'); };
    row.addEventListener('mouseenter', enter);
    row.addEventListener('mouseleave', leave);
    row.addEventListener('focus', enter);
    row.addEventListener('blur', leave);
    return true;
  }

  function applyAll() {
    if (!document.body) return;
    applyServices();
    applyHome();
  }

  function start() {
    applyAll();
    var runs = 0;
    var timer = setInterval(function () { applyAll(); if (++runs >= 6) clearInterval(timer); }, 250);
    var debounce;
    new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(applyAll, 160);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', function () { setTimeout(applyAll, 100); });
    var last = location.pathname;
    setInterval(function () {
      if (location.pathname === last) return;
      last = location.pathname;
      setTimeout(applyAll, 180);
    }, 320);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
