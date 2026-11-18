/* ============================================================================
   /work index — the real 28 case studies in the template's own Work Card.

   The template ships six cards as a hydrated Framer list; a static HTML edit of
   that list is reconciled away. This layer clones the template's card (same
   markup, same class names, same hover) once per case after hydration, hides the
   six demo cards, and drives the template's own filter tabs.
   ========================================================================== */
(function () {
  'use strict';

  var COVER_V = '?v=2';   // covers were re-captured at the same paths

  /* One 1600px cover shipped into a 350–828px card. tools/media/variants.py writes the
     480/768/1200 siblings; the card asks for the one it paints. */
  var COVER_WIDTHS = [480, 768, 1200];
  var COVER_SIZES = '(min-width: 1200px) min(calc((100vw - 104px) / 2), 828px), ' +
    '(min-width: 810px) calc((100vw - 84px) / 2), calc(100vw - 40px)';

  function coverSrcset(cover) {
    var out = [];
    COVER_WIDTHS.forEach(function (w) {
      out.push(cover.replace(/\.webp$/, '-' + w + '.webp') + COVER_V + ' ' + w + 'w');
    });
    out.push(cover + COVER_V + ' 1600w');
    return out.join(', ');
  }

  var CASES = window.__PULSE_WORK__ || [];
  if (!CASES.length) return;

  function find(name) { return document.querySelector('[data-framer-name="' + name + '"]'); }

  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  function firstCard() {
    return document.querySelector('[data-framer-name="Project List"] [data-framer-name="Work Card"]');
  }

  /* the template's card effects, re-created for the clones: scroll reveal + pointer chip */
  function reveal(wrap, i) {
    wrap.style.setProperty('opacity', '0', 'important');
    wrap.style.setProperty('transform', 'translateY(60px)', 'important');
    wrap.style.setProperty('transition', 'opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1)', 'important');
    wrap.style.setProperty('transition-delay', (i * 0.05) + 's', 'important');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        wrap.style.setProperty('opacity', '1', 'important');
        wrap.style.setProperty('transform', 'none', 'important');
        io.disconnect();
      });
    }, { threshold: 0.12 });
    io.observe(wrap);
    setTimeout(function () { wrap.style.setProperty('opacity', '1', 'important'); wrap.style.setProperty('transform', 'none', 'important'); }, 2600);
  }

  function chip(wrap) {
    var media = wrap.querySelector('[data-framer-name="Media"]');
    var el = wrap.querySelector('[data-framer-name="Chip"]');
    var img = wrap.querySelector('img');
    var filterEl = img && img.parentElement && img.parentElement.parentElement;
    var imageEl = wrap.querySelector('[data-framer-name="Image"]');
    var ctaEl = wrap.querySelector('[data-framer-name="CTA"]');
    if (!media || !el) return;
    media.style.position = 'relative';
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.transition = 'opacity .25s ease, transform .45s cubic-bezier(.22, 1, .36, 1)';
    el.style.transform = 'translate(-50%, -50%) scale(.6)';
    el.style.opacity = '0';
    if (filterEl) {
      filterEl.style.transition = 'filter .6s cubic-bezier(.22, 1, .36, 1)';
      filterEl.style.filter = 'grayscale(1)';
    }
    if (imageEl) {
      imageEl.style.transition = 'transform .7s cubic-bezier(.22, 1, .36, 1)';
      imageEl.style.willChange = 'transform';
    }
    if (ctaEl) {
      ctaEl.style.transition = 'opacity .35s ease';
    }
    wrap.addEventListener('pointerenter', function () {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      if (filterEl) filterEl.style.filter = 'grayscale(0)';
      if (imageEl) imageEl.style.transform = 'scale(1.06)';
      if (ctaEl) ctaEl.style.opacity = '1';
    });
    wrap.addEventListener('pointermove', function (event) {
      var r = media.getBoundingClientRect();
      el.style.left = (event.clientX - r.left) + 'px';
      el.style.top = (event.clientY - r.top) + 'px';
    });
    wrap.addEventListener('pointerleave', function () {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(.6)';
      if (filterEl) filterEl.style.filter = 'grayscale(1)';
      if (imageEl) imageEl.style.transform = 'none';
      if (ctaEl) ctaEl.style.opacity = '0.55';
    });
  }

  function buildCard(proto, item, i) {
    var wrap = proto.cloneNode(true);
    wrap.classList.add('pulse-card');
    wrap.setAttribute('data-cats', item.cats.join('|'));
    wrap.removeAttribute('id');

    var a = wrap.querySelector('a');
    if (a) {
      a.setAttribute('href', '/work/' + item.slug);
      a.setAttribute('aria-label', item.name + ' — case study');
    }

    var img = wrap.querySelector('img');
    if (img) {
      /* 25 covers at ~17 KB each were all fetched before `load`, on a phone
         showing one card, so they competed with the font and hero for the
         connection. The first two stay eager (one is in view, one is the next
         scroll); everything below asks for its art when it approaches the
         viewport.

         The browser's own `loading="lazy"` was not enough here: the cards are
         appended together after hydration, and Chrome treats that insertion as
         its moment to start fetching, so the covers were requested anyway. The
         source is therefore held back in data attributes and assigned by an
         IntersectionObserver — a request that was never made cannot be
         re-prioritised. */
      img.alt = item.name + ' project cover';
      img.removeAttribute('sizes');
      if (i < 2) {
        img.setAttribute('sizes', COVER_SIZES);
        img.setAttribute('srcset', coverSrcset(item.cover));
        img.src = item.cover + COVER_V;
        img.loading = 'eager';
      } else {
        img.loading = 'lazy';
        /* the clone still carries the template's demo cover in src/srcset;
           leaving it would fetch that art and show the wrong card */
        img.removeAttribute('srcset');
        img.removeAttribute('src');
        img.setAttribute('data-cover', item.cover);
        img.classList.add('pulse-card-cover-pending');
      }
      img.decoding = 'async';
    }

    setText(wrap.querySelector('[data-framer-name="Number"] p'), item.n);
    setText(wrap.querySelector('[data-framer-name="Title"] h3'), item.name.toUpperCase());
    setText(wrap.querySelector('[data-framer-name="Meta"] p'), item.sector);
    setText(wrap.querySelector('[data-framer-name="Summary"] p'), item.tagline);
    reveal(wrap, i);
    chip(wrap);
    return wrap;
  }

  var currentLabel = 'All';

  function filter(label) {
    currentLabel = label;
    var all = label === 'All';
    document.querySelectorAll('.pulse-card').forEach(function (card) {
      var cats = (card.getAttribute('data-cats') || '').split('|');
      card.classList.toggle('is-hidden', !all && cats.indexOf(label) === -1);
    });
  }

  function hookTabs() {
    document.querySelectorAll('[data-framer-name^="Tab "]').forEach(function (tab) {
      if (tab.__pulseFilter) return;
      tab.__pulseFilter = true;
      tab.addEventListener('click', function () {
        var label = (tab.getAttribute('data-framer-name') || '').replace('Tab ', '');
        filter(label || 'All');
      });
    });
  }

  /* The template's six demo cards (nova, vela, arcen, luma, kora, mono) stay in the DOM
     as the card-design reference, but their pages do not exist here. They must not be
     navigable, focusable or announced. This runs on EVERY pass: the template's own filter
     tabs re-render those cards when clicked, which drops the class and restores the href,
     and they were reappearing in the grid the moment a visitor used a filter. */
  function markOriginals(list) {
    list.querySelectorAll('[data-framer-name="Work Card"]').forEach(function (card) {
      if (card.classList.contains('pulse-card')) return;
      card.classList.add('pulse-card-orig');
      card.setAttribute('aria-hidden', 'true');
      card.querySelectorAll('a[href]').forEach(function (a) {
        a.removeAttribute('href');
        a.setAttribute('tabindex', '-1');
      });
      /* The template's demo cards carry four stock covers (NOVA, VELA, ARCEN, LUMA).
         They are invisible, but a src is a request: the phone downloaded 534 KB of
         pictures for cards it can never see. Strip the source on every pass instead
         of letting the hydrated markup keep it. */
      card.querySelectorAll('img').forEach(function (img) {
        if (!img.getAttribute('src') && !img.getAttribute('srcset')) return;
        img.removeAttribute('src');
        img.removeAttribute('srcset');
        img.setAttribute('data-pulse-demo', '1');
      });
    });
  }

  /* The cover of a below-the-fold card is assigned when the card approaches the
     viewport (see buildCard); a request that was never made is the only fetch a
     page can reliably avoid on a phone that will not scroll far. */
  function hydrateCover(img) {
    var cover = img.getAttribute('data-cover');
    if (!cover) return;
    img.removeAttribute('data-cover');
    img.classList.remove('pulse-card-cover-pending');
    img.setAttribute('sizes', COVER_SIZES);
    img.setAttribute('srcset', coverSrcset(cover));
    img.src = cover + COVER_V;
  }

  var coverObserver = null;

  function watchCovers() {
    var pending = document.querySelectorAll('img.pulse-card-cover-pending');
    if (!pending.length) return;
    if (!('IntersectionObserver' in window)) {
      pending.forEach(hydrateCover);
      return;
    }
    if (!coverObserver) {
      /* Observe the card, not the image: an image with no source has no
         intrinsic size, so a viewport-intersection test on it would never say
         "visible". The card is laid out by its grid slot regardless. */
      coverObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target.querySelector('img.pulse-card-cover-pending') || (entry.target.classList.contains('pulse-card-cover-pending') ? entry.target : null);
          if (img) hydrateCover(img);
          coverObserver.unobserve(entry.target);
        });
      }, { rootMargin: '600px 0px' });
    }
    pending.forEach(function (img) {
      var target = img.closest('.pulse-card') || img;
      if (target.__coverWatched) return;
      target.__coverWatched = true;
      coverObserver.observe(target);
    });
  }

  function apply() {
    var list = find('Project List');
    var proto = firstCard();
    if (!list || !proto) return;

    if (!list.querySelector('.pulse-card')) {
      var protoClone = proto.cloneNode(true);
      CASES.forEach(function (item, i) {
        list.appendChild(buildCard(protoClone, item, i));
      });
    }

    markOriginals(list);
    filter(currentLabel);
    watchCovers();

    // count in the page header ("06 Projects — 2018/2026") — React may restore it, so keep checking
    document.querySelectorAll('[data-framer-name="Header Card"] p').forEach(function (el) {
      if (el.children.length !== 0) return;
      if (!/projects\s*[—–-]/i.test(el.textContent)) return;
      var next = el.textContent.replace(/^\s*\d+/, String(CASES.length).padStart(2, '0'));
      if (next !== el.textContent) el.textContent = next;
    });

    hookTabs();
  }

  function start() {
    apply();
    var runs = 0;
    var timer = setInterval(function () { apply(); if (++runs >= 12) clearInterval(timer); }, 300);
    var debounce;
    new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(apply, 150);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', function () { setTimeout(apply, 250); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
