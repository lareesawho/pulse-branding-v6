/* ORENZA clone — local tweaks (not part of the original site).
 *
 * 1. Scroll: NATIVE by default.
 *    Smoothing (Lenis) is now an opt-in experiment: add ?smooth=1 to any URL, or set
 *    localStorage.orenzaSmooth = '1'. Why off by default:
 *      - this page already runs a full-screen WebGL shader plus scroll-linked Framer
 *        animation; a smoothing layer adds a second rAF loop and a long tail
 *        (measured: an 800 px flick settles in ~1.2 s smoothed vs ~0.6 s native),
 *        which is what reads as "rubbery / not smooth";
 *      - the template was designed around native scroll, including its sticky deck,
 *        parallax and reveal thresholds.
 *    When enabled, it uses duration mode (0.7 s expo-out) and self-disables if the
 *    page cannot hold ~45 fps, so it can never make a slow machine feel worse.
 * 2. Badge removal (CSS hides it; this re-applies after hydration).
 * 3. Debug: window.__scrollMode reports 'smooth' | 'native'.
 */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- badge --- */
  function hideBadge() {
    var nodes = document.querySelectorAll('#__framer-badge-container, a.__framer-badge');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.setProperty('display', 'none', 'important');
      nodes[i].setAttribute('aria-hidden', 'true');
    }
  }
  hideBadge();
  if (document.readyState !== 'complete') window.addEventListener('load', hideBadge);
  [600, 1500, 3000].forEach(function (ms) { setTimeout(hideBadge, ms); });

  /* -------------------------------------------------------------- smoothing -- */
  window.__scrollMode = 'native';
  if (!window.Lenis || (reduce && reduce.matches)) return;

  var params = new URLSearchParams(location.search);
  var optIn = params.get('smooth') === '1' ||
    (function () { try { return localStorage.getItem('orenzaSmooth') === '1'; } catch (e) { return false; } })();
  if (!optIn) return;   // default: native scroll, exactly like the original site

  var lenis = new window.Lenis({
    duration: 0.7,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.4,
    infinite: false,
    autoRaf: false,
    anchors: false
  });
  window.__lenis = lenis;
  window.__scrollMode = 'smooth';

  var rafId = null, idleFrames = 0;
  function loop(time) {
    lenis.raf(time);
    if (lenis.isScrolling || idleFrames < 2) {
      if (lenis.isScrolling) idleFrames = 0; else idleFrames++;
      rafId = requestAnimationFrame(loop);
    } else { rafId = null; }
  }
  function kick() { if (rafId === null) { idleFrames = 0; rafId = requestAnimationFrame(loop); } }
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, kick, { passive: true });
  });
  window.addEventListener('scroll', function () { if (rafId === null) kick(); }, { passive: true });

  function resync() { lenis.scrollTo(window.scrollY || 0, { immediate: true, force: true }); }
  window.addEventListener('popstate', function () { setTimeout(resync, 0); });
  var lastPath = location.pathname;
  setInterval(function () {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    setTimeout(resync, 0); setTimeout(resync, 120); setTimeout(resync, 400);
  }, 200);

  // frame-rate gate: if the page can't hold ~45 fps, hand scrolling back to native
  setTimeout(function () {
    var stamps = [], prev = performance.now(), n = 0;
    (function probe(t) {
      stamps.push(t - prev); prev = t;
      if (++n < 34) { requestAnimationFrame(probe); return; }
      var med = stamps.slice(2).sort(function (a, b) { return a - b; })[Math.floor((stamps.length - 2) / 2)];
      if (med > 22) {
        try { lenis.destroy(); } catch (e) {}
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        ['lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped'].forEach(function (c) { docEl.classList.remove(c); });
        window.__lenis = null;
        window.__scrollMode = 'native';
      }
    })(performance.now());
  }, 2500);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } return; }
    if (rafId === null) kick();
    if (window.__lenis) lenis.resize();
  });
  window.addEventListener('load', function () { if (window.__lenis) lenis.resize(); });
  setTimeout(function () { if (window.__lenis) lenis.resize(); }, 2500);
})();
