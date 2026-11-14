/**
 * The ground behind the hero — mount.
 *
 * The template's pages are rendered by the Framer runtime, so the hero panel
 * does not exist in the served HTML: there is nothing static to put a layer
 * inside. This script finds the hero once it is on screen and mounts the
 * Webflow ground block into it, as its first child, where `hero.css` frames it.
 *
 * The markup and the motion are the component's, not new work:
 *   /components/background.css   shapes, geometry, colour, breakpoints
 *   /components/background.js    the three Webflow interactions
 * Both are loaded from their one home rather than restated here.
 *
 * Idempotent, and quiet when there is no hero (a 404 page, a bare route).
 */
(() => {
  const GROUND_CSS = '/components/background.css';
  const GROUND_JS = '/components/background.js';

  const MARKUP = `
    <div class="background">
      <div class="section-ultra-gradients">
        <div class="ultra-gradient-wrapper">
          <div class="main-shapes-wrapper">
            <div class="shape-3"></div>
            <div class="shape-2"></div>
            <div class="shape-1"></div>
          </div>
          <div class="blending-group-wrapper">
            <div class="shape-8"></div>
            <div class="shape-9"></div>
            <div class="shape-4"></div>
            <div class="shape-5"></div>
            <div class="shape-7"></div>
            <div class="shape-6"></div>
          </div>
          <div class="background-noise"></div>
        </div>
      </div>
    </div>`;

  function linkCss() {
    if (document.querySelector('link[data-pgx-ground]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = GROUND_CSS;
    link.setAttribute('data-pgx-ground', '');
    document.head.appendChild(link);
  }

  function loadMotion() {
    if (document.querySelector('script[data-pgx-motion]')) return;
    const script = document.createElement('script');
    script.src = GROUND_JS;
    script.setAttribute('data-pgx-motion', '');
    document.body.appendChild(script);
  }

  /** The hero: the first section that carries the page's h1. */
  function heroPanel() {
    const main = document.getElementById('main');
    if (!main) return null;
    for (const section of main.querySelectorAll('section')) {
      if (!section.querySelector('h1')) continue;
      const panel = section.firstElementChild;
      if (!panel || panel.getBoundingClientRect().height < 240) continue;
      return panel;
    }
    return null;
  }

  function mount() {
    const panel = heroPanel();
    if (!panel) return false;

    panel.classList.add('pgx-hero');
    linkCss();

    if (!panel.querySelector(':scope > .pgx-ground')) {
      const ground = document.createElement('div');
      ground.className = 'pgx-ground';
      ground.setAttribute('aria-hidden', 'true');
      ground.innerHTML = MARKUP;
      panel.insertBefore(ground, panel.firstChild);
      /* the component starts itself when appended and finds the wrapper it was
         just given; a second append after a re-render never happens */
      loadMotion();
    }

    /* the template's own hero canvas gets screened over the ground; find the
       container element rather than a generated class name, which changes on
       every export */
    const canvas = panel.querySelector('canvas');
    if (canvas) {
      let node = canvas;
      while (node.parentElement && node.parentElement !== panel) node = node.parentElement;
      node.classList.add('pgx-canvas');
    }

    return true;
  }

  /* the hero arrives with hydration, and a later commit can replace it */
  function watch() {
    const main = document.getElementById('main');
    if (!main) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        mount();
      });
    }).observe(main, { childList: true, subtree: true });
  }

  mount();
  [400, 1200, 2400, 4000].forEach((ms) => setTimeout(mount, ms));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mount(); watch(); });
  } else {
    watch();
  }
  addEventListener('load', mount);
})();
