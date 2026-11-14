/* ============================================================================
   The showreel, where the site talks about itself.

   The template's About block paints a still. This keeps that still exactly where
   it is — same box, same radius, same reveal — and lays the reel over it, so:
     · nothing moves if the video fails, the poster frame is the still;
     · a phone on a metered connection downloads nothing until it scrolls here;
     · reduced-motion visitors keep the still and never fetch a frame.

   Two different things live behind the same still:

   · the home page's About preview plays the studio reel clipped to the box;
   · the about page's studio image is the brand film — "Pulse Branding Show
     Reel 2022", the one on the old published site. That film is hosted on
     Vimeo (referer-locked: it cannot be downloaded). It is shown as its title
     frame with a play control, and the player is only loaded when asked for:
     a 60-second film must not sit in the critical path of a page.
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

  /* the brand film, from the old published site (Vimeo 800267808) */
  var BRAND = {
    id: '800267808',
    hash: '3635d126cf',
    poster: '/assets/video/brand-reel-poster.jpg',
    url: 'https://vimeo.com/800267808/3635d126cf',
    player: 'https://player.vimeo.com/video/800267808?h=3635d126cf&autoplay=1&title=0&byline=0&portrait=0&dnt=1'
  };

  /* the stills that stand in for the reel: the About block on the home page,
     and the studio block on the about page (where the brand film goes) */
  var HOSTS = [
    { sel: '[data-framer-name="About Preview"] [data-framer-name="About Image"]' },
    { sel: '[data-framer-name="Studio Image"]', brand: true }
  ];

  if (!window.HTMLVideoElement) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function reel(img) {
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

  /* The brand film: a title frame that becomes the player when clicked. The
     player is a third-party iframe, so it is never in the page until the
     visitor asks for it. */
  function brand(img) {
    var host = img.parentElement;
    if (!host || host.dataset.brandReel === 'on') return null;
    var box = img.getBoundingClientRect();
    if (box.width < 240 || box.height < 160) return null;

    host.dataset.brandReel = 'on';
    host.classList.add('pb-brand-host');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var button = document.createElement('a');
    button.className = 'pb-brand';
    button.href = BRAND.url;
    button.target = '_blank';
    button.rel = 'noopener';
    button.setAttribute('aria-label', 'Play the Pulse Branding show reel, 60 seconds');

    var poster = document.createElement('img');
    poster.className = 'pb-brand-poster';
    poster.src = BRAND.poster;
    poster.alt = '';
    poster.decoding = 'async';
    button.appendChild(poster);

    var scrim = document.createElement('span');
    scrim.className = 'pb-brand-scrim';
    button.appendChild(scrim);

    var play = document.createElement('span');
    play.className = 'pb-brand-play';
    play.setAttribute('aria-hidden', 'true');
    button.appendChild(play);

    var label = document.createElement('span');
    label.className = 'pb-brand-label';
    label.textContent = 'Watch the brand film';
    button.appendChild(label);

    button.addEventListener('click', function (e) {
      e.preventDefault();
      var frame = document.createElement('iframe');
      frame.className = 'pb-brand-frame';
      frame.src = BRAND.player;
      frame.title = 'Pulse Branding Show Reel 2022';
      frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('frameborder', '0');
      button.replaceWith(frame);
    });

    host.appendChild(button);
    return button;
  }

  var reels = [];
  function collect() {
    HOSTS.forEach(function (hostDef) {
      document.querySelectorAll(hostDef.sel).forEach(function (host) {
        if (hostDef.brand) {
          if (host.dataset.brandReel === 'on') return;
          var still = host.querySelector('img');
          if (still) brand(still);
          return;
        }
        if (host.dataset.reel === 'on') return;
        var img = host.querySelector('img');
        if (!img) return;
        var v = reel(img);
        if (v && reels.indexOf(v) === -1) reels.push(v);
      });
    });
    if (!reduce) tick();
  }

  function inView(v) {
    var r = v.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return r.height > 0 && seen / r.height > 0.25;
  }

  function tick() {
    reels.forEach(function (v) {
      // near: within one screen of the slot (the observer is the cheap path, and
      // inView() is the fallback for browsers or frames where it never fires).
      // Until then nothing is downloaded: a phone at the top of the page must
      // not pull a 3.5 MB film for a block two screens down.
      var isNear = v.dataset.near === '1' || inView(v);
      if (!isNear) {
        if (!v.paused) v.pause();
        return;
      }
      if (!v.src) v.src = v.dataset.src;
      if (v.paused) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  var near = null;
  function watchNear() {
    if (!window.IntersectionObserver) {
      reels.forEach(function (v) { v.dataset.near = '1'; });
      return;
    }
    if (!near) {
      near = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.dataset.near = '1';
        });
      }, { rootMargin: '400px 0px' });
    }
    reels.forEach(function (v) { near.observe(v); });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; tick(); });
  }

  function start() {
    collect();
    watchNear();
    var runs = 0;
    var timer = setInterval(function () { collect(); watchNear(); if (++runs >= 6) clearInterval(timer); }, 400);
    new MutationObserver(function () {
      clearTimeout(start._d);
      start._d = setTimeout(function () { collect(); watchNear(); }, 250);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    var warm = 0;
    var early = setInterval(function () { tick(); if (++warm >= 8) clearInterval(early); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
