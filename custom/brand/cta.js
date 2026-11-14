/**
 * The call to action's sweep, applied after the page settles.
 *
 * Why this exists: linked from <head>, the sweep's background declarations are
 * inert on the Framer CTAs — Framer's own rule owns those pills' background
 * longhands, and every static form of the override (zero specificity, class
 * specificity, !important, animated custom properties) computed correctly and
 * still never reached the pixels. Applied after load, the identical rule paints.
 * So the values stay in cta.css — one home, no copy — and this fetches that file
 * and adds it to the document once the markup it targets is on screen.
 *
 * Fails open: if the fetch fails the page simply has no sweep.
 */
(function () {
  const HREF = '/custom/brand/cta.css';

  /* The page already links cta.css, versioned by its bytes (assetver.js). Fetch
     that exact URL so this re-read is a cache hit instead of a second download
     of an unversioned path. Fall back to the bare path when the page has no link. */
  function href() {
    const link = document.querySelector('link[rel="stylesheet"][href*="/custom/brand/cta.css"]');
    return link ? link.getAttribute('href') : HREF;
  }

  async function apply() {
    if (document.querySelector('style[data-cta-sweep]')) return;
    try {
      const css = await fetch(href(), { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : ''));
      if (!css) return;
      const style = document.createElement('style');
      style.setAttribute('data-cta-sweep', '');
      style.textContent = css;
      document.head.appendChild(style);
    } catch (e) {
      /* no sweep, no error surfaced to the reader */
    }
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', apply);
  else apply();
})();
