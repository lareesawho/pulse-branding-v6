/* Pulse page loader — runtime.

   The loader used to hide on a timer: `load` or a 3.2 s ceiling, whichever came
   first, so a slow connection saw the site half-painted. It now waits for the
   page to actually be ready to look at:

     · the document has parsed (DOMContentLoaded),
     · the fonts that the first screen needs have loaded,
     · every image inside the first screen has decoded,
     · and the browser's own `load` event has fired, or 1.4 s have passed since
       DOMContentLoaded (a video or a print sheet can hold `load` for a long time
       without anything on screen changing; the visual checks already cover it).

   Then it keeps the MIN beat so the mark does not flash, and fades out over
   450 ms. MIN is deliberately short: a visitor who sees a 1.4 s held screen on
   a connection that was ready in 400 ms reads that as the site being slow.
   MAX is a failsafe, not a schedule: it only fires if something above never
   settles.

   Options (data attributes on the script tag):
     data-text="Pulse"      loader word
     data-min="800"         minimum time on screen (ms)
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
  var MIN = parseInt(opt('data-min', '800'), 10);
  var MAX = parseInt(opt('data-max', '12000'), 10);
  var LOAD_GRACE = 1400; // how long after DCL a held `load` event may delay us

  var root = document.documentElement;

  // The overlay is markup now, inlined styles and all, so that the first paint
  // is the brand instead of the shell. When this runtime is asked not to run,
  // it must take that markup away rather than leave it covering the page.
  function drop() {
    var el = document.getElementById('pulse-loader');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    root.classList.remove('pl-lock');
  }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { drop(); return; }
  if (/[?&]nopreload=1/.test(location.search)) { drop(); return; }
  var HOLD = /[?&]loader=hold/.test(location.search);

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
    // adopt the static overlay; build one only for pages that predate it
    if (!document.getElementById('pulse-loader')) document.body.appendChild(build());
    root.classList.add('pl-lock');
  }

  function finish() {
    if (finished) return;
    finished = true;
    var el = document.getElementById('pulse-loader');
    if (!el) { root.classList.remove('pl-lock'); return; }
    el.classList.add('is-done');
    /* The fade is the reveal: the page is already laid out and settled under
       the overlay, so showing it now means the content never moves in front of
       the visitor - or in front of the layout-shift API. */
    root.classList.add('pl-reveal');
    /* One pass at 2.5 s catches a home hero that never starts; the later passes
       catch a headline whose hydration landed after that (an article page on a
       cold connection hydrates at ~8 s, and the runtime writes its entrance back
       over an earlier pass). Adding the class twice is harmless. */
    var deadline = [2500, 6000, 10000, 14000];
    for (var d = 0; d < deadline.length; d++) window.setTimeout(rescueStalledHero, deadline[d]);
    window.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      root.classList.remove('pl-lock');
      document.dispatchEvent(new CustomEvent('pulse-loader:done'));
    }, 450);
  }

  /* Framer draws the hero in after it hydrates - letters one by one, the tag
     and the booking line fading in - and on a 4x-CPU phone that is 8.7 s after
     the reveal. Until then the hero is an art panel with two floating buttons.
     Give the entrance a deadline instead: 2.5 s after the reveal (a fast load
     starts it ~1.7 s after the reveal, so this does not catch that), the words
     above the buttons that still have no opacity get shown as they are, and
     this one load loses the animation; the next one keeps it.

     Hero Bottom is left out on purpose. It holds the paragraph and the two
     pills, and the pills are absolutely placed from geometry Framer only
     settles after hydration: showing the paragraph there first put its last
     line under "VIEW OUR WORK" (seen 2026-11-16, 390 px), so that block waits
     for the runtime, as it did before.

     There is no <main> element in this export (only id="main"), so the old
     fallback matched nothing: the rescue only ever worked on the home page.
     An article page's headline is the same per-word entrance inside
     "Article Header", so that block is the second scope — later than the hero
     deadline, because at 2.5 s a fast load is still animating and this must
     not flatten an entrance that is merely in progress. */
  function rescueStalledHero(deadline) {
    var hero = document.querySelector('[data-framer-name="Hero"]');
    var article = hero ? null : document.querySelector('[data-framer-name="Article Header"]');
    if (!hero && !article) return;
    if (article && deadline < 5000) return;
    var scope = hero || article;
    var bottom = scope.querySelector('[data-framer-name="Hero Bottom"]');
    var all = scope.querySelectorAll('*');
    var stalled = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el.textContent || !el.textContent.trim()) continue;
      if (bottom && (el === bottom || bottom.contains(el))) continue;
      if (parseFloat(window.getComputedStyle(el).opacity) > 0.05) continue;
      stalled.push(el);
    }
    if (!stalled.length) return;
    for (var j = 0; j < stalled.length; j++) stalled[j].classList.add('pl-hero-stalled');
    root.classList.add('pl-hero-static');
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

  /* A case page's stylesheets are loaded with media="print" and promoted to
     "all" when they arrive, so the overlay can paint before the captured site's
     CSS does. That would let the overlay leave while the page is still unstyled,
     so the reveal also waits for every deferred sheet to have a rule list.

     A real print sheet is also `media="print"`; waiting for it would hold the
     overlay until `load` (a `load` event waits for print sheets too, so the
     grace period never applies). Only the promoted links carry the inline
     `onload` that promotes them, so only those are waited for. */
  function stylesReady() {
    var links = document.querySelectorAll('link[rel="stylesheet"][media="print"][onload]');
    for (var i = 0; i < links.length; i++) {
      if (!links[i].sheet) return false;
    }
    return true;
  }

  function note() {
    if (finished) return;
    if (!settled.dcl || !settled.fonts) return;
    if (!settled.load && !(dclAt && performance.now() - dclAt > LOAD_GRACE)) return;
    if (!stylesReady()) return;
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
