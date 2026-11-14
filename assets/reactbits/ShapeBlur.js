/* React Bits — Shape Blur. Dependency-free ES module island, same contract as the
   other ports in this folder (no build step, React + htm from assets/vendor).

   Provenance: original published source staged verbatim at
   .ui-evidence/reactbits-src/ShapeBlur.jsx (React + three.js ShaderMaterial).
   This repo deliberately ships no three.js (docs/design/MOTION_SYSTEM.md defers
   the ~600 KB dependency pair), so the three.js plumbing is replaced by a raw
   WebGL fullscreen quad while the GLSL bodies are carried over UNCHANGED from
   the original, including sdRoundRect / sdCircle / sdPoly, aastep / fill / stroke
   / strokeAA, the `coord()` projection, the st0/mx macros and every
   `#ifndef VAR`-guarded branch. Only the boilerplate differs:
     - `#define VAR n` injected from the `variation` prop (original: three.js `defines`)
     - gl_FragColor -> out vec4 fragColor under WebGL2 (renamed, never rewritten)
     - u_resolution/u_pixelRatio/u_mouse driven by the same formulas as the original
     - the same u_mouse -> u_mouseDamp exponential damping (lambda 8)
   Uniform set is identical: u_mouse, u_resolution, u_pixelRatio, u_shapeSize,
   u_roundness, u_borderSize, u_circleSize, u_circleEdge.
*/

const React = window.React;
const html = (strings, ...values) => window.__rbHtml(strings, ...values);

const VERT = `
attribute vec3 position;
attribute vec2 uv;
varying vec2 v_texcoord;
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    v_texcoord = uv;
}
`;

/* WebGL2 core profile renames: every `attribute` becomes `in` and `varying` becomes `out`
   (a bare .replace() would only rewrite the first occurrence and leave the other illegal). */
const VERT2 = VERT.replace(/attribute/g, 'in').replace('varying', 'out');

/* Body below is the original fragmentShader, verbatim from the published source. */
const FRAG_BODY = `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform float u_shapeSize;
uniform float u_roundness;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;

#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif

#ifndef VAR
#define VAR 0
#endif

#ifndef FNC_COORD
#define FNC_COORD
vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}
#endif

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse * u_pixelRatio)

float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}
float sdCircle(in vec2 st, in vec2 center) {
    return length(st - center) * 2.0;
}
float sdPoly(in vec2 p, in float w, in int sides) {
    float a = atan(p.x, p.y) + PI;
    float r = TWO_PI / float(sides);
    float d = cos(floor(0.5 + a / r) * r - a) * length(max(abs(p) * 1.0, 0.0));
    return d * 2.0 - w;
}

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}
float fill(in float x) { return 1.0 - aastep(0.0, x); }
float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}
float stroke(in float d, in float t) { return (1.0 - aastep(t, abs(d))); }
float stroke(float x, float size, float w, float edge) {
    float d = smoothstep(size - edge, size + edge, x + w * 0.5) - smoothstep(size - edge, size + edge, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

float strokeAA(float x, float size, float w, float edge) {
    float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
    float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
            - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

void main() {
    vec2 st = st0 + 0.5;
    vec2 posMouse = mx * vec2(1., -1.) + 0.5;

    float size = u_shapeSize;
    float roundness = u_roundness;
    float borderSize = u_borderSize;
    float circleSize = u_circleSize;
    float circleEdge = u_circleEdge;

    float sdfCircle = fill(
        sdCircle(st, posMouse),
        circleSize,
        circleEdge
    );

    float sdf;
    if (VAR == 0) {
        sdf = sdRoundRect(st, vec2(size), roundness);
        sdf = strokeAA(sdf, 0.0, borderSize, sdfCircle) * 4.0;
    } else if (VAR == 1) {
        sdf = sdCircle(st, vec2(0.5));
        sdf = fill(sdf, 0.6, sdfCircle) * 1.2;
    } else if (VAR == 2) {
        sdf = sdCircle(st, vec2(0.5));
        sdf = strokeAA(sdf, 0.58, 0.02, sdfCircle) * 4.0;
    } else if (VAR == 3) {
        sdf = sdPoly(st - vec2(0.5, 0.45), 0.3, 3);
        sdf = fill(sdf, 0.05, sdfCircle) * 1.4;
    }

    vec3 color = vec3(1.0);
    float alpha = sdf;
    gl_FragColor = vec4(color.rgb, alpha);
}
`;

function fragSource(variation, webgl2, derivatives) {
  const body = FRAG_BODY.replace('#ifndef VAR\n#define VAR 0\n#endif\n', '#define VAR ' + variation + '\n');
  if (!webgl2) {
    /* WebGL1: the published GLSL is used as-is (gl_FragColor / varying), exactly as the
       original three.js ShaderMaterial compiled it. three.js silently enabled
       OES_standard_derivatives for dFdx/dFdy; that has to be declared here. #extension
       must precede every non-preprocessor token, including the precision statement. */
    const ext = derivatives ? '#extension GL_OES_standard_derivatives : enable\n' : '';
    return ext + 'precision highp float;\n' + body;
  }
  /* WebGL2 (GLSL ES 3.00): only the two incompatible declarations are renamed —
     `varying` -> `in` and `gl_FragColor` -> the declared out variable. Body otherwise
     untouched, and dFdx/dFdy are core so no #extension is needed. */
  return (
    '#version 300 es\nprecision highp float;\nout vec4 rbFragColor;\n' +
    body.replace('varying vec2 v_texcoord;', 'in vec2 v_texcoord;').replace('gl_FragColor', 'rbFragColor')
  );
}

export default function ShapeBlur(props) {
  const className = props.className || '';
  const variation = props.variation == null ? 0 : props.variation;
  const pixelRatioProp = props.pixelRatioProp == null ? 2 : props.pixelRatioProp;
  const shapeSize = props.shapeSize == null ? 1.2 : props.shapeSize;
  const roundness = props.roundness == null ? 0.4 : props.roundness;
  const borderSize = props.borderSize == null ? 0.05 : props.borderSize;
  const circleSize = props.circleSize == null ? 0.3 : props.circleSize;
  const circleEdge = props.circleEdge == null ? 0.5 : props.circleEdge;

  const hostRef = React.useRef(null);

  React.useEffect(() => {
    const mount = hostRef.current;
    if (!mount) return;

    let active = true;
    let raf = null;
    let gl = null;

    const canvas = document.createElement('canvas');
    canvas.className = 'shape-blur__canvas';
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    /* Context choice has to be made before the first getContext() on this canvas — a
       canvas can never hand out two different context types. Probe on a throwaway canvas:
       the published GLSL is WebGL1 (gl_FragColor + varying) and compiles verbatim there,
       but dFdx/dFdy need OES_standard_derivatives, so WebGL1 is only used when that
       extension is actually available. Otherwise WebGL2, where derivatives are core. */
    const probe = document.createElement('canvas');
    const probeGl = probe.getContext('webgl');
    let derivatives = !!(probeGl && probeGl.getExtension('OES_standard_derivatives'));
    if (probeGl) {
      const loseProbe = probeGl.getExtension('WEBGL_lose_context');
      if (loseProbe) loseProbe.loseContext();
    }

    const attrs = { alpha: true, premultipliedAlpha: false, antialias: false };
    let webgl2 = false;
    if (derivatives) {
      gl = canvas.getContext('webgl', attrs);
    } else {
      gl = canvas.getContext('webgl2', attrs);
      webgl2 = !!gl;
    }
    if (!gl) {
      if (derivatives) {
        gl = canvas.getContext('webgl2', attrs);
        webgl2 = !!gl;
      } else {
        gl = canvas.getContext('webgl', attrs);
        webgl2 = false;
        derivatives = false;
      }
    }
    if (!gl || typeof gl.createShader !== 'function') {
      if (gl) {
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
      canvas.style.display = 'none';
      console.error('[reactbits] ShapeBlur: WebGL unavailable');
      return;
    }
    if (!webgl2) gl.getExtension('OES_standard_derivatives');

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[reactbits] ShapeBlur shader error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, webgl2 ? '#version 300 es\n' + VERT2 : VERT);
    const fs = compile(gl.FRAGMENT_SHADER, fragSource(variation, webgl2, derivatives));
    if (!vs || !fs) {
      canvas.style.display = 'none';
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[reactbits] ShapeBlur link error:', gl.getProgramInfoLog(prog));
      canvas.style.display = 'none';
      return;
    }
    gl.useProgram(prog);

    /* fullscreen quad — position(3) + uv(2), stride 5*4 (matches the other islands) */
    const quad = new Float32Array([
      -1, -1, 0, 0, 0,
      3, -1, 0, 2, 0,
      -1, 3, 0, 0, 2
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'position');
    const aUv = gl.getAttribLocation(prog, 'uv');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 20, 12);

    const u = n => gl.getUniformLocation(prog, n);
    const uMouse = u('u_mouse');
    const uRes = u('u_resolution');
    const uPixelRatio = u('u_pixelRatio');
    const uShapeSize = u('u_shapeSize');
    const uRoundness = u('u_roundness');
    const uBorderSize = u('u_borderSize');
    const uCircleSize = u('u_circleSize');
    const uCircleEdge = u('u_circleEdge');

    let w = 1;
    let h = 1;
    const vMouse = { x: 0, y: 0 };
    const vMouseDamp = { x: 0, y: 0 };

    const onPointerMove = e => {
      const rect = mount.getBoundingClientRect();
      vMouse.x = e.clientX - rect.left;
      vMouse.y = e.clientY - rect.top;
    };
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('pointermove', onPointerMove);

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2) * (pixelRatioProp / 2);

    const resize = () => {
      if (!active) return;
      w = mount.clientWidth || 1;
      h = mount.clientHeight || 1;
      const r = dpr();
      canvas.width = Math.max(1, Math.round(w * r));
      canvas.height = Math.max(1, Math.round(h * r));
      gl.viewport(0, 0, canvas.width, canvas.height);
      /* original: vResolution.set(w, h).multiplyScalar(dpr) */
      gl.uniform2f(uRes, w * r, h * r);
      gl.uniform1f(uPixelRatio, r);
    };

    gl.uniform1f(uShapeSize, shapeSize);
    gl.uniform1f(uRoundness, roundness);
    gl.uniform1f(uBorderSize, borderSize);
    gl.uniform1f(uCircleSize, circleSize);
    gl.uniform1f(uCircleEdge, circleEdge);

    const paint = () => {
      gl.uniform2f(uMouse, vMouseDamp.x, vMouseDamp.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(() => {
      if (active) resize();
    });
    ro.observe(mount);

    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      vMouseDamp.x = vMouse.x;
      vMouseDamp.y = vMouse.y;
      paint();
    } else {
      let last = performance.now() * 0.001;
      const update = () => {
        if (!active) return;
        const now = performance.now() * 0.001;
        let dt = now - last;
        if (dt > 0.05) dt = 0.05;
        last = now;
        /* original: THREE.MathUtils.damp(value, target, 8, dt) */
        const k = 1 - Math.exp(-8 * dt);
        vMouseDamp.x += (vMouse.x - vMouseDamp.x) * k;
        vMouseDamp.y += (vMouse.y - vMouseDamp.y) * k;
        paint();
        raf = requestAnimationFrame(update);
      };
      raf = requestAnimationFrame(update);
    }

    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf && !reduce) {
        let last = performance.now() * 0.001;
        const update = () => {
          if (!active) return;
          const now = performance.now() * 0.001;
          let dt = now - last;
          if (dt > 0.05) dt = 0.05;
          last = now;
          const k = 1 - Math.exp(-8 * dt);
          vMouseDamp.x += (vMouse.x - vMouseDamp.x) * k;
          vMouseDamp.y += (vMouse.y - vMouseDamp.y) * k;
          paint();
          raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('pointermove', onPointerMove);
      ro.disconnect();
      if (mount.contains(canvas)) mount.removeChild(canvas);
      if (gl) {
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variation, pixelRatioProp, shapeSize, roundness, borderSize, circleSize, circleEdge]);

  return html`<div
    ref=${hostRef}
    className=${'shape-blur ' + className}
    style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
    aria-hidden="true"
  ></div>`;
}
