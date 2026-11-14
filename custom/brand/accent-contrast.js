/**
 * accent-contrast.js — keep the accent readable on a light surface.
 *
 * The eyebrow is painted --accent (pulse cyan) everywhere, which measures 7:1 on
 * the near-black ground and 2.4:1 on the paper cards (home "About", about
 * "Studio in numbers"): the same token, two surfaces, one of them failing WCAG AA
 * for 12 px text.
 *
 * CSS cannot ask an ancestor what colour it is, so this walks each eyebrow's
 * background once the page has settled and marks the ones standing on a light
 * surface with data-pulse-on-light. accent.css then paints those with pulse blue
 * (#2163af, ~5.6:1 on paper) instead of the cyan.
 *
 * Hydration-safe: re-runs on the ladder and on a MutationObserver, because Framer
 * replaces the nodes after load (lesson 66).
 */
(function () {
  'use strict';
  if (window.__pulseAccentContrast) return;
  window.__pulseAccentContrast = true;

  var TAGS = '[data-framer-name="Tag"]';
  var MARK = 'data-pulse-on-light';

  function parse(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    var p = m[1].split(',').map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  /* the colour actually behind the element: stack translucent layers to the body */
  function background(el) {
    var layers = [];
    var node = el;
    while (node && node.nodeType === 1) {
      var cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      var bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
      node = node.parentElement;
    }
    var out = layers.length ? layers[layers.length - 1] : { r: 255, g: 255, b: 255, a: 1 };
    if (!layers.length) return out;
    for (var i = layers.length - 2; i >= 0; i--) {
      var l = layers[i];
      out = {
        r: l.r * l.a + out.r * (1 - l.a),
        g: l.g * l.a + out.g * (1 - l.a),
        b: l.b * l.a + out.b * (1 - l.a),
        a: 1
      };
    }
    return out;
  }

  function luminance(c) {
    function f(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function mark() {
    var tags = document.querySelectorAll(TAGS);
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var bg = background(tag);
      if (!bg) continue; // sits on a photo: the accent there is the design's problem
      var light = luminance(bg) > 0.5;
      if (light) tag.setAttribute(MARK, '');
      else tag.removeAttribute(MARK);
    }
  }

  function start() {
    mark();
    [0, 150, 400, 900, 1600, 2600, 4000, 6000].forEach(function (t) { setTimeout(mark, t); });
    if (!window.MutationObserver) return;
    var timer = 0;
    var observer = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () { timer = 0; mark(); }, 150);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
