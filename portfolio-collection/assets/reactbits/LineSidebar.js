/**
 * LineSidebar — React Bits component ported to a dependency-free ES module (htm templates).
 *
 * Source: .ui-evidence/reactbits-src/LineSidebar.jsx
 * Loaded as a module island at runtime; React 18 + htm must already be on the page as
 * globals (window.React, window.ReactDOM, window.htm) before this module is imported.
 *
 * No imports, no CSS import. Behaviour, props, default prop values, DOM structure,
 * class names, inline styles, the single rAF lerp loop, pointer handlers and the
 * per-item `--effect` custom property are identical to the JSX source.
 *
 * REQUIRED CSS CLASS NAMES (from LineSidebar.css — ship these rules, do not import them here):
 *   .line-sidebar                 custom props --accent-color:#a855f7, --text-color:#c4c4c4,
 *                                 --marker-color:#6c6c6c, --marker-length:60px, --marker-gap:0px,
 *                                 --tick-scale:.5, --max-shift:30px, --item-gap:20px,
 *                                 --font-size:1.1rem, --smoothing:100ms (all set inline by JS);
 *                                 position:relative; display:flex; justify-content:flex-start
 *   .line-sidebar--markers        padding-left:calc(var(--marker-length) + var(--marker-gap))
 *   .line-sidebar__list           list-style:none; margin:0; padding:1rem 0; display:flex;
 *                                 flex-direction:column; gap:var(--item-gap)
 *   .line-sidebar__item           position:relative; cursor:pointer
 *                                 (+ ::before { content:''; position:absolute; inset:-6px -48px } to widen the pointer target)
 *   .line-sidebar__label          position:relative; display:inline-flex; align-items:baseline;
 *                                 font-size:var(--font-size); line-height:1.2;
 *                                 color:color-mix(in srgb, var(--accent-color) calc(var(--effect,0) * 100%), var(--text-color));
 *                                 transform:translateX(calc(var(--effect,0) * var(--max-shift)))
 *   .line-sidebar__index          font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
 *                                 margin-right:.6rem; font-size:.85em;
 *                                 opacity:calc(.55 + var(--effect,0) * .45)
 *   .line-sidebar__marker         position:absolute; top:50%;
 *                                 left:calc(-1 * var(--marker-length) - var(--marker-gap));
 *                                 height:1px; width:var(--marker-length); transform-origin:left center;
 *                                 background-color:color-mix(in srgb, var(--accent-color) calc(var(--effect,0) * 100%), var(--marker-color));
 *                                 transform:translateY(-50%) scaleX(calc(.7 + var(--effect,0) * .5))
 *   .line-sidebar--markers .line-sidebar__item:not(:last-child)::after
 *                                 content:''; position:absolute; top:calc(100% + var(--item-gap) / 2);
 *                                 left:calc(-1 * var(--marker-length) - var(--marker-gap)); height:1px;
 *                                 width:calc(var(--marker-length) * var(--tick-scale));
 *                                 background-color:var(--marker-color); opacity:.5; transform:translateY(-50%)
 *   .line-sidebar--scale-tick .line-sidebar__item:not(:last-child)::after
 *                                 transform-origin:left center;
 *                                 transform:translateY(-50%) scaleX(calc(.7 + var(--effect,0) * .6))
 *
 * Custom property written at runtime: --effect (0..1, per .line-sidebar__item, via rAF lerp in JS —
 * no CSS transitions, so color / shift / scale stay in step).
 */

const html = window.htm.bind(window.React.createElement);
const { useRef, useState, useCallback, useEffect } = window.React;

const FALLOFF_CURVES = {
  linear: p => p,
  smooth: p => p * p * (3 - 2 * p),
  sharp: p => p * p * p
};

const DEFAULT_ITEMS = [
  'Overview',
  'Components',
  'Animations',
  'Backgrounds',
  'Showcase',
  'Playground',
  'Templates',
  'Changelog',
  'Community',
  'Resources',
  'Documentation',
  'Support'
];

const LineSidebar = ({
  items = DEFAULT_ITEMS,
  accentColor = '#A855F7',
  textColor = '#c4c4c4',
  markerColor = '#6c6c6c',
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = 'smooth',
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  onItemClick,
  className = ''
}) => {
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const targetsRef = useRef([]);
  const currentRef = useRef([]);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const activeRef = useRef(defaultActive);
  const smoothingRef = useRef(smoothing);
  const [activeIndex, setActiveIndex] = useState(defaultActive);

  activeRef.current = activeIndex;
  smoothingRef.current = smoothing;

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  const runFrame = useCallback(now => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothingRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const items = itemRefs.current;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (!el) continue;
      const target = Math.max(targetsRef.current[i] || 0, activeRef.current === i ? 1 : 0);
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty('--effect', value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    e => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const items = itemRefs.current;
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (!el) continue;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(pointerY - center);
        targetsRef.current[i] = ease(Math.max(0, 1 - distance / proximityRadius));
      }
      startLoop();
    },
    [falloff, proximityRadius, startLoop]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  const handleClick = useCallback(
    (index, label) => {
      setActiveIndex(index);
      onItemClick?.(index, label);
    },
    [onItemClick]
  );

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    []
  );

  return html`
    <nav
      className=${`line-sidebar${showMarker ? ' line-sidebar--markers' : ''}${scaleTick ? ' line-sidebar--scale-tick' : ''}${className ? ` ${className}` : ''}`}
      style=${{
        '--accent-color': accentColor,
        '--text-color': textColor,
        '--marker-color': markerColor,
        '--marker-length': `${markerLength}px`,
        '--marker-gap': `${markerGap}px`,
        '--tick-scale': tickScale,
        '--max-shift': `${maxShift}px`,
        '--item-gap': `${itemGap}px`,
        '--font-size': `${fontSize}rem`,
        '--smoothing': `${smoothing}ms`
      }}
    >
      <ul
        ref=${listRef}
        className="line-sidebar__list"
        onPointerMove=${handlePointerMove}
        onPointerLeave=${handlePointerLeave}
      >
        ${items.map((label, index) =>
          html`
            <li
              key=${`${label}-${index}`}
              ref=${el => {
                itemRefs.current[index] = el;
              }}
              className="line-sidebar__item"
              aria-current=${activeIndex === index ? 'true' : undefined}
              onClick=${() => handleClick(index, label)}
            >
              ${showMarker &&
              html`
                <span className="line-sidebar__marker" aria-hidden="true" />
              `}
              <span className="line-sidebar__label">
                ${showIndex &&
                html`
                  <span className="line-sidebar__index">${String(index + 1).padStart(2, '0')}</span>
                `}
                <span className="line-sidebar__text">${label}</span>
              </span>
            </li>
          `
        )}
      </ul>
    </nav>
  `;
};

export default LineSidebar;
