/* Remove the social furniture that has no destination.
 *
 * The markup pass (tools/meta/socials.js) deletes the footer "Social" column and the
 * /contact/ "Follow" row from every served page, but Framer re-renders the footer from
 * its bundle data on hydration and puts them back — measured: after the static pass the
 * hydrated page still had one column and four bare platform links. This file removes
 * them again in the browser: the column by its component name, the row by what it says
 * (four platform names and nothing else), and the eyebrow it leaves behind.
 *
 * There is no Pulse profile behind any of the four links, so there is nothing to point
 * them at. If real handles appear later, the right fix is to give the column real hrefs
 * and delete this file (and the static pass) rather than re-point them at home pages.
 */
(function () {
  'use strict';

  var BARE = /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|behance\.net|dribbble\.com|linkedin\.com)\/?$/i;
  var ROW = 'InstagramBehanceDribbbleLinkedIn';

  function dropColumn() {
    var cols = document.querySelectorAll('[data-framer-name="Social"]');
    for (var i = cols.length - 1; i >= 0; i--) cols[i].remove();
  }

  function dropRows() {
    var anchors = document.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!BARE.test(a.getAttribute('href') || '')) continue;
      var el = a.parentElement;
      var row = null;
      while (el && el !== document.body) {
        if ((el.textContent || '').replace(/\s+/g, '') === ROW) row = el;
        el = el.parentElement;
      }
      if (row) row.remove();
      else a.remove();
    }
    // the "Follow" eyebrow is left sitting over an empty gap
    var nodes = document.querySelectorAll('div, p, span');
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      if ((n.textContent || '').trim() === 'Follow' && !n.querySelector('a')) n.remove();
    }
  }

  function run() {
    try {
      dropColumn();
      dropRows();
    } catch (e) {
      /* a half-updated DOM must not break the page */
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  var times = [0, 300, 900, 1800, 3000];
  times.forEach(function (t) { setTimeout(run, t); });

  if (document.body) {
    var timer = 0;
    new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () { timer = 0; run(); }, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
