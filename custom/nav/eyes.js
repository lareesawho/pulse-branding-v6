// Permanent eye-follow button (the chosen CTA) — pointer vars only, no DOM changes.
(function () {
  'use strict';
  if (window.__pulseEyes) return;
  window.__pulseEyes = true;
  if (!window.matchMedia || !window.matchMedia('(min-width: 720px)').matches) return;

  function target() {
    return document.querySelector('[data-framer-name="Hero CTAs"] > div:nth-child(1) a');
  }

  document.addEventListener('pointermove', function (e) {
    var btn = target();
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    if (!r.width) return;
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy) || 1;
    var max = 7;
    btn.style.setProperty('--ex', (dx / d * max).toFixed(1) + 'px');
    btn.style.setProperty('--ey', (dy / d * max).toFixed(1) + 'px');
  });
})();
