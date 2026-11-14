/* React Bits — Card Swap. Dependency-free ES module island, same contract as the
   other ports in this folder (no build step, React + htm from assets/vendor).

   Provenance: original published source staged verbatim at
   .ui-evidence/reactbits-src/CardSwap.jsx (React + gsap + CardSwap.css).
   This repo deliberately ships no GSAP (docs/design/MOTION_SYSTEM.md defers the
   ~600 KB dependency pair), so the GSAP timeline is reimplemented here with rAF
   while preserving the original's slot maths, timeline label offsets, duration
   config and easing names exactly as written in the original:

     slot(i)   = { x: i*distX, y: -i*distY, z: -i*distX*1.5, zIndex: total-i }
     promoteAt = durDrop - durDrop*promoteOverlap
     returnAt  = promoteAt + durMove*returnDelay
     front     : y += 500 over durDrop, ease config.ease
     others    : -> slot(i) over durMove, ease config.ease, staggered i*0.15s
     front     : -> backSlot over durReturn, ease config.ease, zIndex set at returnAt
     then order = [...rest, front] and the interval repeats every `delay` ms.

   Fidelity note (honest): power1.inOut is quadratic in/out, which is exact.
   elastic.out(0.6, 0.9) is NOT bit-identical to GSAP — GSAP's amplitude < 1
   handling is not public. elasticOut() below reproduces the same damped-curve
   family with the same period and scales the positive overshoot lobe by the
   amplitude, keeping f(0)=0 and f(1)=1. Feel matches; bytes do not.
*/

const React = window.React;
const html = (strings, ...values) => window.__rbHtml(strings, ...values);

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* GSAP power1.inOut — quadratic in/out (exact). */
const quadInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* elasticOut(amplitude, period) — damped oscillation, f(0)=0, f(1)=1. */
const elasticOut = (amplitude, period) => {
  const a = amplitude > 0 ? amplitude : 1;
  const p = period > 0 ? period : 0.3;
  const s = (p / (2 * Math.PI)) * Math.asin(1);
  return t => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const g = Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p);
    return 1 + (g < 0 ? g : g * a);
  };
};

const makeSlot = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i
});

export default function CardSwap(props) {
  const width = props.width == null ? 500 : props.width;
  const height = props.height == null ? 400 : props.height;
  const cardDistance = props.cardDistance == null ? 60 : props.cardDistance;
  const verticalDistance = props.verticalDistance == null ? 70 : props.verticalDistance;
  const delay = props.delay == null ? 5000 : props.delay;
  const pauseOnHover = !!props.pauseOnHover;
  const skewAmount = props.skewAmount == null ? 6 : props.skewAmount;
  const easing = props.easing || 'elastic';
  const onCardClick = props.onCardClick;
  const className = props.className || '';

  const childArr = React.Children.toArray(props.children || []);
  const cardRefs = React.useMemo(() => childArr.map(() => React.createRef()), []);
  const hostRef = React.useRef(null);
  const order = React.useRef(null);

  React.useEffect(() => {
    const nodes = cardRefs.map(r => r.current);
    if (!nodes.length || nodes.some(n => !n)) return;

    const total = nodes.length;
    const config =
      easing === 'elastic'
        ? { ease: elasticOut(0.6, 0.9), durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 }
        : { ease: quadInOut, durDrop: 0.8, durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2 };

    /* live slot state per node: {x,y,z,zIndex} */
    const st = nodes.map(() => ({ x: 0, y: 0, z: 0, zIndex: 1 }));

    const paint = () => {
      for (let i = 0; i < total; i++) {
        const s = st[i];
        nodes[i].style.transform =
          'translate(-50%, -50%) translate3d(' + s.x + 'px,' + s.y + 'px,' + s.z + 'px) skewY(' + skewAmount + 'deg)';
        nodes[i].style.zIndex = String(s.zIndex);
      }
    };

    const setSlot = (i, slot) => {
      st[i].x = slot.x;
      st[i].y = slot.y;
      st[i].z = slot.z;
      st[i].zIndex = slot.zIndex;
    };

    /* place without animating — the original's placeNow() */
    for (let i = 0; i < total; i++) setSlot(i, makeSlot(i, cardDistance, verticalDistance, total));
    paint();

    if (order.current == null || order.current.length !== total) {
      order.current = Array.from({ length: total }, (_, i) => i);
    }

    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || total < 2) return; /* stack stays still; no interval, no rAF */

    let raf = null;
    let intervalId = null;
    let stopped = false;

    const swap = () => {
      if (stopped) return;
      const ord = order.current.slice();
      const front = ord[0];
      const rest = ord.slice(1);

      const promoteAt = config.durDrop - config.durDrop * config.promoteOverlap;
      const returnAt = promoteAt + config.durMove * config.returnDelay;
      const backSlot = makeSlot(total - 1, cardDistance, verticalDistance, total);

      const dropFromY = st[front].y;
      const moves = rest.map((idx, i) => ({
        idx: idx,
        startAt: promoteAt + i * 0.15,
        to: makeSlot(i, cardDistance, verticalDistance, total),
        from: null,
        promoted: false
      }));

      const moveEnd = promoteAt + (rest.length - 1) * 0.15 + config.durMove;
      const totalDur = Math.max(returnAt + config.durReturn, moveEnd);

      let returned = false;
      let returnFrom = null;
      let t0 = null;

      const frame = ts => {
        if (stopped) return;
        if (t0 === null) t0 = ts;
        const t = (ts - t0) / 1000;

        /* front card drops */
        const dp = clamp01(t / config.durDrop);
        st[front].y = dropFromY + 500 * config.ease(dp);

        /* the others promote into slots i..n */
        moves.forEach(m => {
          if (t < m.startAt) return;
          if (m.from === null) {
            m.from = { x: st[m.idx].x, y: st[m.idx].y, z: st[m.idx].z };
            m.to = makeSlot(m.idx === front ? 0 : 0, cardDistance, verticalDistance, total); /* replaced below */
            m.to = makeSlot(moves.indexOf(m), cardDistance, verticalDistance, total);
          }
          if (!m.promoted && t >= promoteAt) {
            st[m.idx].zIndex = m.to.zIndex;
            m.promoted = true;
          }
          const p = config.ease(clamp01((t - m.startAt) / config.durMove));
          st[m.idx].x = m.from.x + (m.to.x - m.from.x) * p;
          st[m.idx].y = m.from.y + (m.to.y - m.from.y) * p;
          st[m.idx].z = m.from.z + (m.to.z - m.from.z) * p;
        });

        /* front returns to the back slot */
        if (t >= returnAt) {
          if (!returned) {
            returned = true;
            st[front].zIndex = backSlot.zIndex;
            returnFrom = { x: st[front].x, y: st[front].y, z: st[front].z };
          }
          const p = config.ease(clamp01((t - returnAt) / config.durReturn));
          st[front].x = returnFrom.x + (backSlot.x - returnFrom.x) * p;
          st[front].y = returnFrom.y + (backSlot.y - returnFrom.y) * p;
          st[front].z = returnFrom.z + (backSlot.z - returnFrom.z) * p;
        }

        paint();

        if (t >= totalDur) {
          setSlot(front, backSlot);
          paint();
          order.current = rest.concat([front]);
          raf = null;
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      swap();
      intervalId = window.setInterval(swap, delay);
    };

    const host = hostRef.current;
    let onEnter = null;
    let onLeave = null;
    if (pauseOnHover && host) {
      onEnter = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        clearInterval(intervalId);
        intervalId = null;
      };
      onLeave = () => {
        clearInterval(intervalId);
        intervalId = window.setInterval(swap, delay);
      };
      host.addEventListener('mouseenter', onEnter);
      host.addEventListener('mouseleave', onLeave);
    }

    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        clearInterval(intervalId);
        intervalId = null;
      } else if (intervalId === null) {
        intervalId = window.setInterval(swap, delay);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    start();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      clearInterval(intervalId);
      intervalId = null;
      document.removeEventListener('visibilitychange', onVis);
      if (host && onEnter) host.removeEventListener('mouseenter', onEnter);
      if (host && onLeave) host.removeEventListener('mouseleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing, childArr.length]);

  const rendered = childArr.map((child, i) =>
    html`<div
      key=${i}
      ref=${cardRefs[i]}
      className="card"
      style=${{ width: width + 'px', height: height + 'px' }}
      onClick=${e => {
        if (child && child.props && child.props.onClick) child.props.onClick(e);
        if (onCardClick) onCardClick(i);
      }}
    >${child}</div>`
  );

  return html`<div
    ref=${hostRef}
    className=${'card-swap-container ' + className}
    style=${{ width: width + 'px', height: height + 'px' }}
  >${rendered}</div>`;
}
