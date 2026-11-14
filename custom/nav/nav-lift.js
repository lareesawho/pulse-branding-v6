/* ---------------------------------------------------- the nav's hairline -- */
/* The template slides the nav's Bar out of view on scroll down (-102 px at
 * desktop, -96 on the phone) and brings it back on scroll up. The hairline is
 * drawn on the nav box, which never moves, so without this it stays behind at
 * y=90 while the bar leaves: a line hanging in the air. Copy the bar's own travel
 * onto --pulse-nav-lift and the line leaves with it. No constants, so every
 * breakpoint stays exact.
 *
 * Lives in its own file because two kinds of page need it: the template routes
 * (loaded with the rest of the nav layer) and the generated case pages (loaded by
 * the case builder). One home, no copies.
 *
 * The nav must be looked up again on every tick, not cached once: at defer time
 * it is the server's node, which does receive the property, and then Framer's
 * hydration replaces the whole <nav> and the property dies with the old node.
 * Measured: __ssrNav.isConnected === false after load, live nav clean. Hence the
 * ladder and the observer below, not a "did it once" flag. */
(function () {
  'use strict';
  var nav = null, bar = null, shown = null, raf = 0, settle = 0;

  function resolve() {
    var n = document.querySelector('nav');
    var b = n && n.querySelector('[data-framer-name="Bar"]');
    if (!n || !b) return false;
    nav = n; bar = b;
    return true;
  }

  function lift() {
    var t = window.getComputedStyle(bar).transform;
    if (!t || t === 'none') return 0;
    var m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!m) return 0;
    var v = m[1].split(',');
    return v.length > 14 ? parseFloat(v[13]) : parseFloat(v[5]);
  }

  function apply() {
    /* a replaced node takes its inline property with it */
    if (!nav || !bar || !bar.isConnected || !nav.isConnected) {
      if (!resolve()) return;
    }
    var y = lift() || 0;
    if (y === shown) return;
    shown = y;
    nav.style.setProperty('--pulse-nav-lift', y + 'px');
  }

  function resync() { shown = null; apply(); }

  function frame() { apply(); raf = window.requestAnimationFrame(frame); }

  window.addEventListener('scroll', function () {
    if (!raf) frame();
    window.clearTimeout(settle);
    settle = window.setTimeout(function () {
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      apply();
    }, 700);
  }, { passive: true });

  window.addEventListener('resize', resync);
  window.addEventListener('load', resync);

  /* hydration is the reason this exists: retry across it, then keep watching
     in case a client-side navigation re-renders the chrome again */
  [0, 150, 400, 900, 1600, 2600, 4000, 6000].forEach(function (ms) {
    window.setTimeout(resync, ms);
  });
  /* one frame at most: hydration mutates the tree hundreds of times and each
     apply() reads a computed style */
  var pending = false;
  var mo = new MutationObserver(function () {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () { pending = false; resync(); });
  });
  mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  window.setTimeout(function () { mo.disconnect(); }, 8000);

  apply();
})();
