/* Pulse Branding background motion — the three Webflow interactions, reproduced 1:1.
 *
 * Source: webflow.schunk.8847b9a238de9b1c.js (site 673498ac936e891beb4335fd)
 *   a-48 "Gradient Animation 4"  -> .shape-2, looping        (event e-1099, SCROLL_INTO_VIEW, loop)
 *   a-49 "Gradient Animation 5"  -> .shape-3                 (event e-1106, SCROLL_INTO_VIEW)
 *   a-50 "Gradient Animation 6"  -> .shape-1                 (event e-1105, SCROLL_INTO_VIEW)
 *
 * Each action group is one step; actions inside a group run together, groups run
 * in order, exactly as IX2 does. Every action keeps the same duration and easing
 * as the Webflow file, and drives the `rotate` / `translate` / `scale` properties
 * separately, which is how IX2 composes a transform.
 */
(() => {
  const EASE = { linear: 'linear', easeInOut: 'cubic-bezier(.42,0,.58,1)' };

  // [property, from, to, duration(ms), easing] — `x` is in vw, as in the Webflow actions.
  const TRACKS = [
    {
      sel: '.shape-2', loop: true,
      groups: [
        [['rotate', -180, -180, 500, 'linear'], ['scale', 1, 1, 500, 'linear'], ['x', 0, 0, 500, 'linear']],
        [['rotate', -180, 0, 10000, 'easeInOut'], ['x', 0, -12, 10000, 'linear']],
        [['rotate', 0, 180, 10000, 'linear'], ['x', -12, 0, 10000, 'easeInOut'], ['scale', 1, 1.3, 10000, 'linear']],
        [['rotate', 180, -180, 0, 'easeInOut'], ['x', 0, 0, 10000, 'linear'], ['scale', 1.3, 1, 10000, 'linear']]
      ]
    },
    {
      sel: '.shape-3', loop: false,
      groups: [
        [['rotate', -180, -180, 500, 'linear'], ['x', 20, 20, 500, 'linear'], ['scale', 1, 1, 500, 'linear']],
        [['rotate', -180, 0, 10000, 'linear'], ['x', 20, 55, 10000, 'easeInOut'], ['scale', 1, 2, 500, 'linear']],
        [['rotate', 0, -180, 10000, 'linear'], ['x', 55, 0, 10000, 'easeInOut'], ['scale', 2, 1, 500, 'linear']]
      ]
    },
    {
      sel: '.shape-1', loop: false,
      groups: [
        [['scale', 1, 1, 11000, 'easeInOut']],
        [['scale', 1, 1.3, 10000, 'easeInOut']],
        [['scale', 1.3, 1, 5000, 'easeInOut']]
      ]
    }
  ];

  const vw = value => (value / 100) * document.documentElement.clientWidth;

  function frames(property, from, to) {
    if (property === 'rotate') return [{ rotate: `${from}deg` }, { rotate: `${to}deg` }];
    if (property === 'scale') return [{ scale: String(from) }, { scale: String(to) }];
    return [{ translate: `${vw(from)}px 0px` }, { translate: `${vw(to)}px 0px` }];
  }

  /** One element's timeline: groups in order, each group's actions side by side. */
  async function run(element, track) {
    const held = new Map(); // property -> the animation currently holding its value
    do {
      for (const group of track.groups) {
        const running = group.map(([property, from, to, duration, easing]) => {
          const previous = held.get(property);
          const animation = element.animate(frames(property, from, to), {
            duration, easing: EASE[easing], fill: 'forwards'
          });
          held.set(property, animation);
          if (previous) previous.cancel();
          return animation.finished.catch(() => {});
        });
        await Promise.all(running);
      }
    } while (track.loop);
  }

  function start() {
    const root = document.querySelector('.ultra-gradient-wrapper');
    if (!root) return;
    const paused = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (paused.matches) return;

    // SCROLL_INTO_VIEW, as in the Webflow events: the timelines start once the
    // wrapper is on screen, and the looping one keeps going from there.
    const run1 = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      run1.disconnect();
      for (const track of TRACKS) {
        const element = root.querySelector(track.sel);
        if (element) run(element, track);
      }
    }, { threshold: 0 });
    run1.observe(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
