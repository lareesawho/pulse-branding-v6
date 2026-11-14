/* ============================================================================
   Home page — "selected work" cards.

   The template renders four demo collaborations from its shipped module, which is
   re-rendered on hydration. This layer clones the template's own home Work Card
   once per featured project, hides the four demo cards, and points everything at
   the real case routes.
   ========================================================================== */
(function () {
  'use strict';

  var ITEMS = window.__PULSE_HOME_WORK__ || [];
  var COVER_V = '?v=2';   // covers were re-captured at the same paths

  /* The capture ships one 1600px cover per project and the card paints it at 350–828px.
     The card is built here, so the srcset lives here too: 480/768/1200 siblings are
     written by tools/media/variants.py, and the browser takes the smallest that covers
     the slot (a 390 phone at 2x needs 700 → 768, a 1440 laptop at 1x needs 668 → 768). */
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

  if (!ITEMS.length) return;

  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  /* the template's card has two effects: a scroll reveal (rise + fade) and a pointer chip
     that follows the cursor inside the media. Clones get the same behaviour here. */
  function reveal(wrap, i) {
    wrap.style.setProperty('opacity', '0', 'important');
    wrap.style.setProperty('transform', 'translateY(60px)', 'important');
    wrap.style.setProperty('transition', 'opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1)', 'important');
    wrap.style.setProperty('transition-delay', (i * 0.07) + 's', 'important');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        wrap.style.setProperty('opacity', '1', 'important');
        wrap.style.setProperty('transform', 'none', 'important');
        io.disconnect();
      });
    }, { threshold: 0.15 });
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

  function build(proto, item, i) {
    var wrap = proto.cloneNode(true);
    wrap.classList.add('pulse-home-card');
    wrap.removeAttribute('id');

    var a = wrap.querySelector('a');
    if (a) {
      a.setAttribute('href', '/work/' + item.slug);
      a.setAttribute('aria-label', item.name + ' — case study');
    }
    var img = wrap.querySelector('img');
    if (img) {
      img.removeAttribute('sizes');
      img.setAttribute('srcset', coverSrcset(item.cover));
      img.setAttribute('sizes', COVER_SIZES);
      img.src = item.cover + COVER_V;
      img.alt = item.name + ' project cover';
    }
    setText(wrap.querySelector('[data-framer-name="Number"] p'), String(i + 1).padStart(2, '0'));
    setText(wrap.querySelector('[data-framer-name="Title"] h3'), item.name.toUpperCase());
    setText(wrap.querySelector('[data-framer-name="Meta"] p'), item.sector);
    setText(wrap.querySelector('[data-framer-name="Summary"] p'), item.tagline);
    reveal(wrap, i);
    chip(wrap);
    return wrap;
  }

  function apply() {
    var list = document.querySelector('[data-framer-name="Work List"]');
    if (!list || list.querySelector('.pulse-home-card')) return;
    var proto = list.querySelector('[data-framer-name="Work Card"]');
    if (!proto) return;

    var originals = list.querySelectorAll('[data-framer-name="Work Card"]');
    var clean = proto.cloneNode(true);
    originals.forEach(function (card) {
      card.classList.add('pulse-home-card-orig');
      /* the template's demo cards stay as the card-design reference and their
         pages do not exist in this build (nova, vela, arcen, luma): hidden
         duplicates must not be navigable, focusable or announced. */
      card.setAttribute('aria-hidden', 'true');
      card.querySelectorAll('a[href]').forEach(function (a) {
        a.removeAttribute('href');
        a.setAttribute('tabindex', '-1');
      });
    });
    ITEMS.forEach(function (item, i) { list.appendChild(build(clean, item, i)); });
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
