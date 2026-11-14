/* ============================================================================
   The showreel, where the site talks about itself.

   The template's About block paints a still. This keeps that still exactly where
   it is — same box, same radius, same reveal — and lays the reel over it, so:
     · nothing moves if the video fails, the poster frame is the still;
     · a phone on a metered connection downloads nothing until it scrolls here;
     · reduced-motion visitors keep the still and never fetch a frame.
   ========================================================================== */
(function () {
  'use strict';

  /* Two cuts of the same reel: the 16:9 film, and the 9:16 edit for tall boxes,
     where cropping the landscape one to the middle third showed nothing.

     The 1080 cut is 9.3 MB and the 720 cut is 3.4 MB for the same 20 seconds.
     The box is 1,324 px wide on a 1440 screen, so the 1080 cut bought a 3%
     upscale for 6 MB; it is only worth it once the box itself is wider than the
     720 frame. Both files are the same edit, so the smaller one looks the same. */
  var LANDSCAPE = [
    ['(min-width: 1600px)', '/assets/video/showreel-1080.mp4'],
    ['', '/assets/video/showreel-720.mp4']
  ];
  var PORTRAIT = '/assets/video/showreel-vertical.mp4';
  var POSTER = '/assets/video/showreel-poster.jpg';
  var POSTER_PORTRAIT = '/assets/video/showreel-poster-vertical.jpg';

  /* the stills that stand in for the reel: the About block, and the studio and
     media blocks on the about page */
  var HOSTS = [
    '[data-framer-name="About Preview"] [data-framer-name="About Image"]',   /* home */
    '[data-framer-name="Studio Image"]'                                      /* about */
  ];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.HTMLVideoElement) return;

  function source(box) {
    if (box && box.height > box.width * 0.8) return PORTRAIT;
    for (var i = 0; i < LANDSCAPE.length; i++) {
      if (!LANDSCAPE[i][0] || window.matchMedia(LANDSCAPE[i][0]).matches) return LANDSCAPE[i][1];
    }
    return LANDSCAPE[LANDSCAPE.length - 1][1];
  }

  /* Hydration replaces the About block, and with it the video we dressed. A new
     element started a second download of the same file, which is why the reel
     used to arrive twice. The element is moved instead of re-created: same key,
     same video, same bytes. */
  var dressed = {};
  function keyFor(img, box) {
    return (img.getAttribute('alt') || '') + '|' + Math.round(box.width / 10) + 'x' + Math.round(box.height / 10);
  }

  function dress(img) {
    var host = img.parentElement;
    if (!host || host.dataset.reel === 'on') return null;
    var box = img.getBoundingClientRect();
    if (box.width < 240 || box.height < 160) return null;

    host.dataset.reel = 'on';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var key = keyFor(img, box);
    if (dressed[key] && dressed[key].parentElement !== host) {
      host.appendChild(dressed[key]);
      return dressed[key];
    }

    var video = document.createElement('video');
    video.className = 'pb-reel';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    video.preload = 'none';
    video.poster = box.height > box.width * 0.8 ? POSTER_PORTRAIT : POSTER;
    video.dataset.src = source(box);
    if (img.getAttribute('alt')) video.dataset.alt = img.getAttribute('alt');
    host.appendChild(video);
    dressed[key] = video;

    video.addEventListener('loadeddata', function () {
      video.classList.add('is-ready');
    }, { once: true });

    return video;
  }

  var reels = [];
  function collect() {
    HOSTS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (host) {
        if (host.dataset.reel === 'on') return;
        var img = host.querySelector('img');
        if (!img) return;
        var v = dress(img);
        if (v && reels.indexOf(v) === -1) reels.push(v);
      });
    });
    tick();
  }

  function inView(v) {
    var r = v.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return r.height > 0 && seen / r.height > 0.25;
  }

  function tick() {
    reels.forEach(function (v) {
      if (inView(v)) {
        if (!v.src) v.src = v.dataset.src;
        if (v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; tick(); });
  }

  function start() {
    collect();
    var runs = 0;
    var timer = setInterval(function () { collect(); if (++runs >= 6) clearInterval(timer); }, 400);
    new MutationObserver(function () {
      clearTimeout(start._d);
      start._d = setTimeout(collect, 250);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    var warm = 0;
    var early = setInterval(function () { tick(); if (++warm >= 8) clearInterval(early); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
