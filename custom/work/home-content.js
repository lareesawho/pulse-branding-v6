/* ============================================================================
   Home page — real clients and the full set of real testimonials.

   The template ships invented clients (NOVA, VELA, ARCEN, LUMA, MONO, AETHER) and
   three invented testimonials in a 3-slide Framer slider. This builds the slider
   from the five real client quotes in the archive (portrait, quote, name, role),
   cloning the template's own slide markup and re-creating its navigation,
   counter and progress bars — the visuals stay the template's.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.__PULSE_HOME_CONTENT__;
  if (!C) return;

  var index = 0;

  /* One autoplay for the page, not one per wire() call. Hydration replaces the
     slider element, build() re-queries it, wire() runs again — and the old
     7 s interval kept running against the detached element, both increments hit
     this same `index`, so the slider jumped two slides per tick and the counter
     read 01 / 03 / 05 / 02 instead of 01 / 02 / 03. */
  var autoplayTimer = 0;

  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  function applyClients() {
    var section = document.querySelector('[data-framer-name="Clients"]');
    if (!section) return;
    var names = section.querySelectorAll('[data-framer-name="Name"] p');
    for (var i = 0; i < names.length; i++) setText(names[i], C.clients[i % C.clients.length]);
    var wraps = section.querySelectorAll('[data-framer-name="Name"]');
    for (var j = 0; j < wraps.length; j++) {
      if (wraps[j].children.length === 0) setText(wraps[j], C.clients[j % C.clients.length]);
    }
  }

  function fillSlide(slide, t) {
    if (!slide) return;
    var quote = slide.querySelector('[data-framer-name="Quote"] h2') || slide.querySelector('[data-framer-name="Quote"]');
    setText(quote, '“' + t.quote + '”');
    var author = slide.querySelector('[data-framer-name="Author"]');
    if (!author) return;
    var name = author.querySelectorAll('p');
    // first p = name, second = role (template order)
    setText(name[0], t.name);
    setText(name[1], t.role);
    var img = author.querySelector('img');
    if (img) {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = t.photo;
      img.alt = t.name;
    }
  }

  function build() {
    var slider = document.querySelector('[data-framer-name="Testimonial Slider"]');
    if (!slider) return false;
    var viewport = slider.querySelector('[data-framer-name="Viewport"]');
    if (!viewport) return false;
    var T = C.testimonials;

    // slides: clone the template's last slide until we have one per testimonial
    var slides = viewport.querySelectorAll('[data-framer-name^="Slide"]');
    if (!slides.length) return false;
    var proto = slides[slides.length - 1].cloneNode(true);
    while (viewport.querySelectorAll('[data-framer-name^="Slide"]').length < T.length) {
      viewport.appendChild(proto.cloneNode(true));
    }
    var all = viewport.querySelectorAll('[data-framer-name^="Slide"]');
    for (var i = 0; i < all.length && i < T.length; i++) fillSlide(all[i], T[i]);

    // progress bars: same treatment
    var progress = slider.querySelector('[data-framer-name="Progress"]');
    if (progress) {
      var bars = progress.querySelectorAll('[data-framer-name^="Bar "]');
      if (bars.length) {
        var barProto = bars[bars.length - 1].cloneNode(true);
        while (progress.querySelectorAll('[data-framer-name^="Bar "]').length < T.length) {
          progress.appendChild(barProto.cloneNode(true));
        }
      }
    }

    wire(slider, viewport, T);
    return true;
  }

  function render(slider, viewport) {
    var T = C.testimonials;

    /* The Viewport IS the clip window: its width is exactly one slide (1280) and
       it hides its overflow. Translating it moved the window itself off the page,
       so the slide that came into the window's old place was clipped away and the
       panel read empty after every arrow click. Move the slides inside the window
       instead — same transform, same easing, and the window stays where it is. */
    viewport.style.transition = '';
    viewport.style.transform = '';
    var frames = viewport.querySelectorAll('[data-framer-name^="Slide"]');
    for (var f = 0; f < frames.length; f++) {
      frames[f].style.transition = 'transform .7s cubic-bezier(.22, 1, .36, 1)';
      frames[f].style.transform = 'translateX(' + (-index * 100) + '%)';
    }

    var counter = slider.querySelector('[data-framer-name="Counter"] p');
    setText(counter, String(index + 1).padStart(2, '0') + ' / ' + String(T.length).padStart(2, '0'));

    var bars = slider.querySelectorAll('[data-framer-name^="Bar "]');
    for (var i = 0; i < bars.length; i++) {
      var active = i === index;
      bars[i].style.transition = 'width .5s cubic-bezier(.22, 1, .36, 1), background-color .5s cubic-bezier(.22, 1, .36, 1)';
      bars[i].style.width = active ? '56px' : '20px';
      bars[i].style.backgroundColor = active ? 'rgb(214, 234, 240)' : 'rgb(42, 43, 48)';
    }
  }

  function wire(slider, viewport, T) {
    if (slider.__pulseWired) { render(slider, viewport); return; }
    slider.__pulseWired = true;

    /* drop the previous wire's autoplay so two intervals never share `index` */
    if (autoplayTimer) { window.clearInterval(autoplayTimer); autoplayTimer = 0; }

    var go = function (next) {
      index = (next + T.length) % T.length;
      render(slider, viewport);
    };

    var prev = slider.querySelector('[data-framer-name="slPrev"]');
    var next = slider.querySelector('[data-framer-name="slNext"]');

    // stop the template's own (3-slide) handler from also running
    [prev, next].forEach(function (el) {
      if (!el || el.__pulseNav) return;
      el.__pulseNav = true;
      el.addEventListener('click', function (event) {
        event.stopPropagation();
        event.preventDefault();
        go(el === prev ? index - 1 : index + 1);
      }, true);
      el.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.stopPropagation();
        event.preventDefault();
        go(el === prev ? index - 1 : index + 1);
      }, true);
    });

    render(slider, viewport);

    /* the slider used to sit on the first person until someone found the arrows,
       which reads as "it only shows one guy". It advances on its own now: 7 s a
       slide, paused while she is over it or tabbed into it, gone for anyone who
       asked their system to reduce motion, and it steps aside for 20 s after she
       drives it herself so her choice is never yanked away mid-read. */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var hold = 0;
    function pause() { window.clearInterval(autoplayTimer); autoplayTimer = 0; }
    function play() {
      if (autoplayTimer || document.hidden || !slider.isConnected) return;
      autoplayTimer = window.setInterval(function () {
        if (!slider.isConnected) { pause(); return; }
        if (Date.now() < hold) return;
        go(index + 1);
      }, 7000);
    }
    function nudge() { hold = Date.now() + 20000; }

    slider.addEventListener('pointerenter', pause);
    slider.addEventListener('pointerleave', play);
    slider.addEventListener('focusin', pause);
    slider.addEventListener('focusout', play);
    slider.addEventListener('click', nudge, true);
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
    play();
  }

  function applyAll() {
    if (!document.body) return;
    applyClients();
    if (!build()) return;
  }

  function start() {
    applyAll();
    var runs = 0;
    var timer = setInterval(function () { applyAll(); if (++runs >= 14) clearInterval(timer); }, 300);
    var debounce;
    new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(applyAll, 150);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('load', function () { setTimeout(applyAll, 250); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
