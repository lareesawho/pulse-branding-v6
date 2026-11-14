/* Pulse page loader — runtime. Mounts the AnimatedLoader port, keeps it for a minimum beat,
   then fades it out and unlocks scrolling. Vanilla, hydration-safe, removable.

   Options (data attributes on the script tag):
     data-text="Pulse"      loader word
     data-min="1500"        minimum time on screen (ms)
     data-max="3200"        hard ceiling (ms)
*/
(function () {
  'use strict';
  if (window.__pulseLoader) return;
  window.__pulseLoader = true;

  var script = document.currentScript;
  var opt = function (name, dflt) { return script ? (script.getAttribute(name) || dflt) : dflt; };
  var TEXT = opt('data-text', 'Pulse');
  var MIN = parseInt(opt('data-min', '1500'), 10);
  var MAX = parseInt(opt('data-max', '3200'), 10);

  // respect reduced motion and explicit opt-out
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (/[?&]nopreload=1/.test(location.search)) return;
  var HOLD = /[?&]loader=hold/.test(location.search);
  try { if (sessionStorage.getItem('pulseLoaderSeen') === '1' && !/[?&]preload=1/.test(location.search)) { /* first visit only */ } } catch (e) {}

  var root = document.documentElement;
  var start = performance.now();
  var mounted = false;

  function build() {
    var el = document.createElement('div');
    el.id = 'pulse-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', TEXT);

    var wrap = document.createElement('div');
    wrap.className = 'pl-wrap';

    // real wordmark asset (the loader previously rendered typed letters)
    var mark = document.createElement('img');
    mark.className = 'pl-wordmark';
    mark.src = '/custom/brand/marks/pulse-mark-min-white.svg?v=4';
    mark.alt = TEXT;
    mark.decoding = 'async';
    wrap.appendChild(mark);

    var orb = document.createElement('div');
    orb.className = 'pl-orb';
    wrap.appendChild(orb);

    el.appendChild(wrap);
    return el;
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    document.body.appendChild(build());
    root.classList.add('pl-lock');
  }

  function finish() {
    var el = document.getElementById('pulse-loader');
    if (!el) { root.classList.remove('pl-lock'); return; }
    el.classList.add('is-done');
    window.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      root.classList.remove('pl-lock');
      document.dispatchEvent(new CustomEvent('pulse-loader:done'));
    }, 650);
  }

  function whenReady(cb) {
    // wait for the page's own hydration/network to settle, but never past MAX
    var fired = false;
    var fire = function () { if (!fired) { fired = true; cb(); } };
    if (document.readyState === 'complete') setTimeout(fire, 60);
    else window.addEventListener('load', function () { setTimeout(fire, 60); }, { once: true });
    setTimeout(fire, MAX);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  whenReady(function () {
    if (HOLD) return;
    var elapsed = performance.now() - start;
    var wait = Math.max(0, MIN - elapsed);
    setTimeout(finish, wait);
  });

  window.addEventListener('pagehide', function () { root.classList.remove('pl-lock'); });
  try { sessionStorage.setItem('pulseLoaderSeen', '1'); } catch (e) {}
})();
