/* Pulse page loader — runtime.

   The loader used to hide on a timer: `load` or a 3.2 s ceiling, whichever came
   first, so a slow connection saw the site half-painted. It now waits for the
   page to actually be ready to look at:

     · the document has parsed (DOMContentLoaded),
     · the fonts that the first screen needs have loaded,
     · every image inside the first screen has decoded,
     · and the browser's own `load` event has fired, or 2.5 s have passed since
       DOMContentLoaded (a video or a print sheet can hold `load` for a long time
       without anything on screen changing; the visual checks already cover it).

   Then it keeps the MIN beat so the mark does not flash, and fades out over
   650 ms. MAX is a failsafe, not a schedule: it only fires if something above
   never settles.

   Options (data attributes on the script tag):
     data-text="Pulse"      loader word
     data-min="1400"        minimum time on screen (ms)
     data-max="12000"       failsafe ceiling (ms)

   Behaviour flags: ?nopreload=1 (no loader), ?loader=hold (visible, no finish).
   Reduced motion: no loader at all.
*/
(function () {
  'use strict';
  if (window.__pulseLoader) return;
  window.__pulseLoader = true;

  var script = document.currentScript;
  var opt = function (name, dflt) { return script ? (script.getAttribute(name) || dflt) : dflt; };
  var TEXT = opt('data-text', 'Pulse');
  var MIN = parseInt(opt('data-min', '1400'), 10);
  var MAX = parseInt(opt('data-max', '12000'), 10);
  var LOAD_GRACE = 2500; // how long after DCL a held `load` event may delay us

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (/[?&]nopreload=1/.test(location.search)) return;
  var HOLD = /[?&]loader=hold/.test(location.search);

  var root = document.documentElement;
  var start = performance.now();
  var mounted = false;
  var finished = false;

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
    mark.src = '/custom/brand/marks/pulse-mark-min-white.svg';
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
    if (finished) return;
    finished = true;
    var el = document.getElementById('pulse-loader');
    if (!el) { root.classList.remove('pl-lock'); return; }
    el.classList.add('is-done');
    window.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      root.classList.remove('pl-lock');
      document.dispatchEvent(new CustomEvent('pulse-loader:done'));
    }, 650);
  }

  /* The first screen, not the whole document: an image 4 screens down is not
     something the visitor is waiting to see. */
  function firstScreenImages() {
    var vh = window.innerHeight || 800;
    var out = [];
    var all = document.images;
    for (var i = 0; i < all.length; i++) {
      var img = all[i];
      if (!img.currentSrc && !img.getAttribute('src') && !img.getAttribute('srcset')) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) continue;
      if (r.bottom < -40 || r.top > vh * 1.25) continue;
      out.push(img);
    }
    return out;
  }

  function imagesReady() {
    var imgs = firstScreenImages();
    var pending = [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.complete && img.naturalWidth > 0) continue;
      pending.push(img);
    }
    if (!pending.length) return true;
    // decoding is the last step before paint; give each one its own promise
    pending.forEach(function (img) {
      if (img.decode) img.decode().catch(function () {});
    });
    return false;
  }

  var settled = { dcl: false, fonts: false, load: false };
  var dclAt = 0;

  function note() {
    if (finished) return;
    if (!settled.dcl || !settled.fonts) return;
    if (!settled.load && !(dclAt && performance.now() - dclAt > LOAD_GRACE)) return;
    if (!imagesReady()) return;
    var elapsed = performance.now() - start;
    var wait = Math.max(0, MIN - elapsed);
    window.setTimeout(finish, wait);
  }

  function onDcl() {
    if (settled.dcl) return;
    settled.dcl = true;
    dclAt = performance.now();
    note();
    // re-check while the first screen's images settle; cheap and self-limiting
    var runs = 0;
    var timer = setInterval(function () {
      note();
      if (finished || ++runs > 40) clearInterval(timer);
    }, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDcl, { once: true });
  else onDcl();

  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () {
      settled.fonts = true;
      note();
    }, function () {
      settled.fonts = true;
      note();
    });
  } else {
    settled.fonts = true;
  }

  if (document.readyState === 'complete') {
    settled.load = true;
  } else {
    window.addEventListener('load', function () {
      settled.load = true;
      note();
    }, { once: true });
  }

  // hydration can swap the first screen's images after DCL; look once more
  window.setTimeout(function () { if (settled.dcl) note(); }, 1200);

  // failsafe: nothing above is allowed to keep the loader forever
  window.setTimeout(function () { if (!HOLD) finish(); }, MAX);

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  window.addEventListener('pagehide', function () { root.classList.remove('pl-lock'); });
  try { sessionStorage.setItem('pulseLoaderSeen', '1'); } catch (e) {}
})();
