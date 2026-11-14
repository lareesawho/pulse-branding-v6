/* Case links must leave the app, not be routed inside it.
 *
 * /work/* case pages are static documents now. Framer's client-side router still
 * intercepts clicks on those links and renders its own case page, which is the
 * "wrong version". This forces a full document load for /work/<slug> links only.
 */
(function () {
  'use strict';
  var CASE = /^\/work\/[a-z0-9-]+\/?$/i;

  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a[href]');
    if (!a) return;
    var url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    if (!CASE.test(url.pathname)) return;
    event.preventDefault();
    event.stopPropagation();
    location.assign(url.pathname);
  }, true);
})();
