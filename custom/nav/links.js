/**
 * The nav and footer are re-rendered from the Framer data on every route, and the
 * data writes them as `./about`, `./work`, `../contact` — root-relative in intent,
 * relative in syntax. On `/services/ai-consulting` the document base is
 * `/services/`, so `./about` becomes `/services/about`, which does not exist.
 *
 * The static pass (tools/meta/links.js) fixes what the HTML says; hydration
 * rewrites it back, so the same rules have to run again here. Known routes become
 * root-absolute — that is the destination the link always meant, and it stays
 * correct at any depth. Article links (`./<slug>` inside /insights) are left
 * alone: on `/insights/<slug>` those are relative to /insights and correct.
 */
(function () {
  'use strict';

  function normalise(href) {
    if (href === './' || href === '../' || href === '/.') return '/';
    var m = /^\.\/(about|work|services|insights|contact|privacy|terms)$/.exec(href);
    if (m) return '/' + m[1];
    m = /^\.\.\/(about|work|services|insights|contact|privacy|terms)$/.exec(href);
    if (m) return '/' + m[1];
    m = /^\.\/insights\/([a-z0-9-]+)$/.exec(href);
    if (m) return '/insights/' + m[1];
    /* the work index renders its cards as `./work/<slug>`; that is only right while
       the document sits at `/work` — one trailing slash and it becomes `/work/work/<slug>` */
    m = /^\.\.?\/work\/([a-z0-9-]+)$/.exec(href);
    if (m) return '/work/' + m[1];
    /* the template's case-page CTAs: no such files in this build */
    if (href === '../audit.html') return '/services/ai-consulting';
    if (href === '../contact.html') return '/contact';
    return null;
  }

  function fix(anchor) {
    var href = anchor.getAttribute('href');
    if (!href) return;
    var next = normalise(href);
    if (next) anchor.setAttribute('href', next);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'A') fix(node);
    var anchors = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
    for (var i = 0; i < anchors.length; i++) fix(anchors[i]);
  }

  function all() {
    scan(document.documentElement);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all);
  all();
  /* the nav is replaced a few times while the runtime boots */
  [300, 900, 1800, 3000].forEach(function (ms) { setTimeout(all, ms); });

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) scan(added[j]);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
