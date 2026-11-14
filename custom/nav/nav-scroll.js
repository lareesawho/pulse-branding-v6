// Hide the pill header while scrolling down, bring it back on any upward scroll.
// Toggles `pulse-nav-hidden` on <html>; nav.css does the sliding (no inline styles, so the
// Framer runtime cannot fight it).
//
// Two phone-only facts have to hold here too, because the drawer lives inside the nav:
//  - the bar that carries the drawer's close button must never slide away while the
//    drawer is open, or the menu is stuck open with no visible way to close it;
//  - Framer's Menu Button is a bare div with tabindex:0: focusable, but announced as
//    nothing. Annotate it (role, label, expanded, controls) after every re-render, and
//    let Escape close the drawer.
(() => {
  const THRESHOLD = 240; // px scrolled before the bar may hide
  const DELTA = 8;       // ignore wheel jitter smaller than this
  const root = document.documentElement;
  let hidden = false;
  let lastY = window.scrollY;

  const nav = () => document.querySelector('nav');
  const isOpen = () => {
    const n = nav();
    return !!(n && /open/i.test(n.getAttribute('data-framer-name') || ''));
  };

  function setHidden(next) {
    if (next === hidden) return;
    hidden = next;
    root.classList.toggle('pulse-nav-hidden', next);
  }

  function update() {
    const y = Math.max(0, window.scrollY);
    const dy = y - lastY;
    lastY = y;
    if (isOpen()) { setHidden(false); return; } // the close button must stay reachable
    if (y <= THRESHOLD) { setHidden(false); return; }
    if (dy > DELTA) setHidden(true);
    else if (dy < -DELTA) setHidden(false);
  }

  // --- the phone menu button ------------------------------------------------
  function part(name) {
    const n = nav();
    return n ? n.querySelector('[data-framer-name="' + name + '"]') : null;
  }

  let wasOpen = false;
  const muted = [];

  // While the drawer is open the rest of the page is inert. The overlay covers the
  // viewport, so a Tab that reached the hero behind it would move focus somewhere the
  // person cannot see (measured: after the six drawer rows, focus went to the hero
  // CTAs). Walk up from the nav and silence every sibling branch; the nav itself —
  // bar, close button, drawer — stays live. What we silenced is remembered exactly,
  // so closing restores the page instead of guessing.
  function contain(on) {
    const n = nav();
    if (!n) return;
    if (!on) {
      for (const el of muted) el.removeAttribute('inert');
      muted.length = 0;
      return;
    }
    if (muted.length) return;
    let node = n;
    while (node && node.parentElement && node !== document.body) {
      const parent = node.parentElement;
      for (const sib of parent.children) {
        if (sib === node || sib.contains(n)) continue;
        if (sib.tagName === 'SCRIPT' || sib.tagName === 'STYLE' || sib.tagName === 'LINK') continue;
        if (sib.hasAttribute('inert')) continue; // someone else owns that one
        sib.setAttribute('inert', '');
        muted.push(sib);
      }
      node = parent;
    }
  }

  function decorate() {
    const b = part('Menu Button');
    if (!b) return;
    const d = part('Drawer');
    const open = isOpen();
    if (open !== wasOpen) {
      wasOpen = open;
      contain(open);
      // closing from inside the drawer: hand focus back to the button before the
      // drawer becomes inert, otherwise focus falls to <body>. Framer's own Escape
      // handling can already have moved it, so also catch the body case.
      if (!open && (document.activeElement === document.body || (d && d.contains(document.activeElement)))) b.focus();
    }
    if (d) {
      if (!d.id) d.id = 'pulse-menu-drawer';
      // The closed drawer is only clipped, not hidden: its eight links stay in the tab
      // order and focus disappears below the bar. inert takes them out of it (and out
      // of the accessibility tree) without touching the layout Framer animates.
      if (open) d.removeAttribute('inert');
      else if (!d.hasAttribute('inert')) d.setAttribute('inert', '');
    }
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (d) b.setAttribute('aria-controls', d.id);
  }

  // Framer listens for its own pointer sequence on its own nodes; a bare .click() is
  // ignored (measured: the variant stays "Phone"). Dispatch what the runtime reads.
  function press(el) {
    const opts = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    const b = part('Menu Button');
    if (b) press(b);
  });

  document.addEventListener('click', (event) => {
    const el = event.target;
    if (!(el instanceof Element) || !el.closest('[data-framer-name="Navigation"]')) return;
    [0, 80, 250].forEach((ms) => window.setTimeout(() => { decorate(); update(); }, ms));
  }, true);

  // With the drawer open, Tab cycles inside the nav: the six rows, then the logo and
  // the close button, then back to the first row. Without this the last row hands focus
  // to <body> and the next Tab lands on the logo underneath the overlay - two stops a
  // keyboard user cannot see (measured). The page behind is inert at the same time.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !isOpen()) return;
    const n = nav();
    if (!n) return;
    const items = [...n.querySelectorAll('a[href], button, [tabindex="0"]')].filter((el) => {
      if (el.closest('[inert]')) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0;
    });
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!n.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (window.scrollY <= THRESHOLD) setHidden(false);
    decorate();
    update();
  }, { passive: true });

  // Never hide the bar from keyboard users: focus inside it re-reveals it.
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-framer-name="Navigation"]')) setHidden(false);
  });

  // Route changes (Framer router) reset scroll; mirror that state.
  window.addEventListener('popstate', () => setTimeout(update, 60));

  // Hydration replaces the chrome: retry across it rather than trusting one run.
  [0, 150, 400, 900, 1600, 2600, 4000, 6000].forEach((ms) => {
    window.setTimeout(() => { decorate(); update(); }, ms);
  });

  // One frame at most. The open/closed state lives in data-framer-name and nowhere else,
  // so watch attributes as well as the tree.
  let pending = false;
  const mo = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; decorate(); });
  });
  mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-framer-name'] });
  window.setTimeout(() => mo.disconnect(), 8000);

  decorate();
  update();
})();
