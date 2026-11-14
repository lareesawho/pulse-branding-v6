/* Document structure, kept true after hydration.
 *
 * The markup pass (tools/meta/document.js) writes the skip link, role=main, a focusable
 * #main and a label on the primary nav into the served HTML, so a crawler, a no-JS
 * reader and the first paint get all of it. This file is the repair layer for the
 * runtime: Framer re-renders the nav and the main wrapper, and anything it replaces
 * loses the attributes the markup carried.
 *
 * The vendor badge is removed here, not in the markup: it is a React-rendered node
 * inside the hydrated tree, and deleting it before the runtime boots throws
 * "Error: Minified React error #405" on every route (measured one change at a time).
 * It waits for the load event plus 1.2 s, then goes; our CSS keeps it invisible until
 * then. A keyboard user never reaches it (display:none, visibility:hidden).
 */
(function () {
  'use strict';

  var SKIP_CLASS = 'pulse-skip';
  var HYDRATED_AT = 1200;

  function mainNode() {
    return document.querySelector('#main, main, [role="main"]');
  }

  function dropOldSkip() {
    // The case pages shipped their own <a class="skip"> after the nav; it is not first
    // in the tab order, so it was a skip link you could only reach by not needing it.
    var old = document.querySelectorAll('a.skip:not(.pulse-skip)');
    for (var i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }
  }

  function ensureSkip() {
    var body = document.body;
    var main = mainNode();
    if (!body || !main) return;

    if (!main.id) main.id = 'main';
    if (main.tagName === 'DIV' && main.getAttribute('role') !== 'main') main.setAttribute('role', 'main');
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');

    var link = document.querySelector('a.' + SKIP_CLASS);
    if (!link) {
      link = document.createElement('a');
      link.className = SKIP_CLASS;
      body.insertBefore(link, body.firstChild);
    } else if (link !== body.firstElementChild) {
      body.insertBefore(link, body.firstChild);
    }
    var href = '#' + main.id;
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    var label = main.tagName === 'MAIN' && main.id === 'case' ? 'Skip to the case study' : 'Skip to content';
    if (link.textContent !== label) link.textContent = label;

    if (!link.__pulseBound) {
      link.__pulseBound = true;
      link.addEventListener('click', function (e) {
        var target = document.getElementById(href.slice(1));
        if (!target) return;
        // Do the skip in script rather than letting the browser follow the fragment: on the
        // case pages the exhibit's own router turns a fragment click into a real navigation,
        // which throws away the focus we just set (measured: document context destroyed).
        e.preventDefault();
        target.scrollIntoView(true);
        target.focus({ preventScroll: true });
        if (window.history && history.replaceState) history.replaceState(null, '', href);
      });
    }
  }

  function ensureNavLabels() {
    var navs = document.querySelectorAll('nav');
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      if (nav.getAttribute('aria-label') || nav.getAttribute('aria-labelledby')) continue;
      nav.setAttribute('aria-label', 'Main');
    }
  }

  function dropBadge() {
    var badge = document.getElementById('__framer-badge-container');
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
  }

  function structure() {
    dropOldSkip();
    ensureSkip();
    ensureNavLabels();
  }

  structure();
  [0, 150, 400, 900, 1600, 2600].forEach(function (ms) {
    window.setTimeout(structure, ms);
  });

  function afterHydration() {
    dropBadge();
    // A re-render can recreate it; check once more when the observer goes quiet.
    window.setTimeout(dropBadge, 2800);
    window.setTimeout(dropBadge, 8000);
  }

  if (document.readyState === 'complete') {
    window.setTimeout(afterHydration, HYDRATED_AT);
  } else {
    window.addEventListener('load', function () {
      window.setTimeout(afterHydration, HYDRATED_AT);
    });
  }

  if (window.MutationObserver) {
    var scheduled = 0;
    var observer = new MutationObserver(function (records) {
      var interesting = records.some(function (r) {
        return r.type === 'childList';
      });
      if (!interesting || scheduled) return;
      scheduled = window.setTimeout(function () {
        scheduled = 0;
        structure();
      }, 150);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 10000);
  }
})();
