/**
 * GlowingRidges — React Bits Pro component, running from the vendor's own shader.
 *
 * The fragment/vertex shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping and its per-frame animation of uFlow / uChurn. The three.js wrapper the vendor
 * uses (drei shaderMaterial on a 1x1 plane with an orthographic camera) is replaced by an
 * equivalent fullscreen quad in plain WebGL — same geometry mapping (vUv = position*0.5+0.5),
 * same uniforms, same maths, so the output matches the component's Customize preview.
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Configuration: passed in as props (the island supplies Lareesa's exact Customize values).
 */
const { useEffect, useRef } = React;
const html = window.htm.bind(window.React.createElement);

const VERT_BODY = `
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

/* three.js injects these declarations and compiles as GLSL 3; build both flavours so the
   vendor shader text stays byte-identical apart from the version plumbing. */
const vertFor = (gl2) => (gl2
  ? `#version 300 es
in vec3 position;
in vec2 uv;
out vec2 vUv;
` + VERT_BODY
  : `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
` + VERT_BODY);

/* GLSL 1 has no tanh(): provide overloads instead of editing the shader body. */
const TANH_SHIM = `
float tanh(float x) { return 1.0 - 2.0 / (exp(2.0 * x) + 1.0); }
vec3 tanh(vec3 v) { return vec3(tanh(v.x), tanh(v.y), tanh(v.z)); }
`;

const fragFor = (gl2) => (gl2
  ? `#version 300 es
` + FRAG
      .replace('precision highp float;', 'precision highp float;\nout vec4 fragColor;')
      .replace('varying vec2 vUv;', 'in vec2 vUv;')
      .replace('gl_FragColor', 'fragColor')
  : TANH_SHIM + FRAG);

const FRAG = `
precision highp float;

#define MAX_LAYERS 15
#define MAX_DETAIL 10

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uFlow;
uniform float uChurn;
uniform int uLayers;
uniform int uDetail;
uniform float uTurbulence;
uniform float uZoom;
uniform vec2 uShift;
uniform float uRidgeFrequency;
uniform float uRidgePhase;
uniform float uDensity;
uniform float uSwirl;
uniform float uExposure;
uniform float uGain;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uColorCycle;
uniform float uRotation;
uniform float uGrain;
uniform float uOpacity;
uniform vec3 uBackground;
uniform float uInk;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}

vec3 palette(float layer) {
  vec3 w = 0.25 + 1.0 * cos(layer * uColorCycle + vec3(0.0, 2.094, 4.189));
  return uColorA * w.x + uColorB * w.y + uColorC * w.z;
}

void main() {

  float c = cos(uRotation);
  float sn = sin(uRotation);
  vec2 turned = mat2(c, -sn, sn, c) * (vUv - 0.5) + 0.5;
  vec2 uv = (turned - 1.0) * uZoom - uShift;

  vec2 p = (uv + vec2(0.6, -0.1)) * uDensity;

  uv *= sin(log(max(abs(uv.y), 1e-4)) * uRidgeFrequency + uRidgePhase);

  float radius = normalize(vec3(length(uv), 0.1, 0.51)).x;
  float drift = (log2(radius) * 15.0 + uFlow) * uSwirl;
  float bearing = sin(atan(uv.y, uv.x));
  vec2 push = sin(vec2(bearing, drift));

  vec3 film = vec3(0.0);
  for (int i = 0; i < MAX_LAYERS; i++) {
    if (i >= uLayers) break;
    float layer = float(i) + 1.0;

    vec2 v = p;
    float f = 1.0;
    for (int k = 0; k < MAX_DETAIL; k++) {
      if (k >= uDetail) break;

      v += (tan(cos(v.yx * f + f + layer - uChurn)) * uTurbulence + 2.5) / f;
      v += push;
      f *= 1.5;
    }

    film += palette(layer) / (5.0 * length(v));
  }

  vec3 light = tanh(max(film, 0.0) * uExposure) * uGain;

  float noise = hash(gl_FragCoord.xy + fract(uChurn) * 1000.0) - 0.5;
  light *= 1.0 + noise * uGrain;
  light *= uOpacity;

  vec3 lit = uBackground + light;

  float amount = max(light.r, max(light.g, light.b));
  float coverage = smoothstep(0.08, 0.6, amount);
  vec3 pigment = amount > 0.0001 ? light / amount : vec3(1.0);
  vec3 inked = uBackground * mix(vec3(1.0), pigment * 0.75, coverage);

  gl_FragColor = vec4(clamp(mix(lit, inked, uInk), 0.0, 1.0), 1.0);
}
`;

const DEFAULTS = {
  layers: 12,
  detail: 5,
  turbulence: 0.6,
  zoom: 1.1,
  shiftX: 0.45,
  shiftY: 0.5,
  ridgeFrequency: 1,
  ridgePhase: 2,
  density: 11,
  flowSpeed: 0.1,
  churnSpeed: 1,
  swirl: 16,
  exposure: 0.25,
  gain: 2,
  colorA: '#ff6a2a',
  colorB: '#22d3ee',
  colorC: '#c026d3',
  colorCycle: 0.4,
  rotation: 0,
  grain: 0.25,
  opacity: 0.75,
  backgroundColor: '#000000',
  blend: 'add',
  paused: false,
  dpr: 1,
  /* The vendor shader maps straight to vUv with no aspect correction, so a tall
     container stretches the ridges. Rendering the same field at the reference's
     16:9 and cover-cropping keeps the component's framing untouched. */
  aspect: 16 / 9
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hexToRgb(hex) {
  let h = String(hex || '#000').trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('shader compile failed: ' + log);
  }
  return sh;
}

export default function GlowingRidges(props) {
  const cfg = Object.assign({}, DEFAULTS, props || {});
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const opts = {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false
    };
    const gl2ctx = canvas.getContext('webgl2', opts);
    const gl = gl2ctx || canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) { canvas.style.display = 'none'; return undefined; }
    const gl2 = !!gl2ctx;

    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertFor(gl2)));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragFor(gl2)));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('link failed: ' + gl.getProgramInfoLog(program));
      }
    } catch (err) {
      canvas.style.display = 'none';
      console.error('[GlowingRidges] ' + err.message);
      return undefined;
    }
    gl.useProgram(program);

    /* fullscreen quad standing in for the vendor's 1x1 plane under an ortho camera */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0, 0,
       1, -1, 0, 1, 0,
      -1,  1, 0, 0, 1,
      -1,  1, 0, 0, 1,
       1, -1, 0, 1, 0,
       1,  1, 0, 1, 1
    ]), gl.STATIC_DRAW);
    const stride = 5 * 4;
    const posLoc = gl.getAttribLocation(program, 'position');
    const uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * 4);

    const u = {};
    ['uResolution', 'uFlow', 'uChurn', 'uLayers', 'uDetail', 'uTurbulence', 'uZoom', 'uShift',
     'uRidgeFrequency', 'uRidgePhase', 'uDensity', 'uSwirl', 'uExposure', 'uGain', 'uColorA',
     'uColorB', 'uColorC', 'uColorCycle', 'uRotation', 'uGrain', 'uOpacity', 'uBackground', 'uInk'
    ].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    /* static uniforms, exactly as the component sets them */
    gl.uniform1i(u.uLayers, Math.round(clamp(cfg.layers, 1, 15)));
    gl.uniform1i(u.uDetail, Math.round(clamp(cfg.detail, 1, 10)));
    gl.uniform1f(u.uTurbulence, Math.max(cfg.turbulence, 0));
    gl.uniform1f(u.uZoom, Math.max(cfg.zoom, 0.05));
    gl.uniform2f(u.uShift, cfg.shiftX, cfg.shiftY);
    gl.uniform1f(u.uRidgeFrequency, cfg.ridgeFrequency);
    gl.uniform1f(u.uRidgePhase, cfg.ridgePhase);
    gl.uniform1f(u.uDensity, Math.max(cfg.density, 0.1));
    gl.uniform1f(u.uSwirl, cfg.swirl);
    gl.uniform1f(u.uExposure, Math.max(cfg.exposure, 0));
    gl.uniform1f(u.uGain, Math.max(cfg.gain, 0));
    gl.uniform1f(u.uColorCycle, cfg.colorCycle);
    gl.uniform1f(u.uRotation, cfg.rotation * Math.PI / 180);
    gl.uniform1f(u.uGrain, clamp(cfg.grain, 0, 2));
    gl.uniform1f(u.uOpacity, clamp(cfg.opacity, 0, 1));
    gl.uniform1f(u.uInk, cfg.blend === 'ink' ? 1 : 0);
    gl.uniform3fv(u.uColorA, hexToRgb(cfg.colorA));
    gl.uniform3fv(u.uColorB, hexToRgb(cfg.colorB));
    gl.uniform3fv(u.uColorC, hexToRgb(cfg.colorC));
    gl.uniform3fv(u.uBackground, hexToRgb(cfg.backgroundColor));

    /* Backing-store density. Capped at 1.5 by the contract: past that the fill cost buys
       nothing a display can show. */
    const dprBound = Math.min(Math.max(cfg.dpr || 1, 0.5), window.devicePixelRatio || 1, 1.5);
    let flow = 0;
    let churn = 0;
    let raf = 0;
    let running = true;
    let last = performance.now();

    const drawStatic = () => {
      gl.uniform1f(u.uFlow, 0);
      gl.uniform1f(u.uChurn, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const aspect = cfg.aspect > 0 ? cfg.aspect : rect.width / Math.max(rect.height, 1);
      /* cover: fill the box, crop the overflow, never stretch the field */
      let cssW = rect.width;
      let cssH = rect.width / aspect;
      if (cssH < rect.height) { cssH = rect.height; cssW = rect.height * aspect; }
      canvas.style.position = 'absolute';
      canvas.style.left = '50%';
      canvas.style.top = '50%';
      canvas.style.transform = 'translate(-50%, -50%)';
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      /* Size the drawing buffer from the element's own rendered box, not from the cover size
         above. The global `img,video,canvas{max-width:100%}` rule clamps the rendered width, so
         a cover width (which is chosen from the host's height) can be far wider than the box the
         canvas actually occupies — on a 390px viewport that left a 1320px backing store for a
         390px element, 3.38x, well past the contract's 1.5 cap. `getBoundingClientRect()`
         reports the box after that clamp, so the ratio here is exactly `dprBound` (<= 1.5) and
         the field is drawn in CSS-pixel coordinates with the same transform the cover layout
         already applies; the CSS cover dimensions themselves are untouched. */
      const box = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round((box.width || cssW) * dprBound));
      const h = Math.max(1, Math.round((box.height || cssH) * dprBound));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.uResolution, w, h);
      /* Resizing the drawing buffer clears it. Under reduced motion (or paused) there is no
         frame loop to repaint, so any ResizeObserver tick used to leave the field blank —
         which reads as a canvas update under prefers-reduced-motion. Repaint the static frame. */
      if (!running) drawStatic();
    };

    const frame = (now) => {
      const delta = Math.min((now - last) / 1000, 0.05);   /* the component clamps delta to 0.05 */
      last = now;
      flow += delta * cfg.flowSpeed * 0.5;   /* half speed (2026-09-29): the field read as rushed */

      churn += delta * cfg.churnSpeed * 0.5;   /* half speed (2026-09-29): the field read as rushed */

      resize();
      gl.uniform1f(u.uFlow, flow);
      gl.uniform1f(u.uChurn, churn);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (running) raf = requestAnimationFrame(frame);
    };

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host);

    if (cfg.paused || reduce) {
      running = false;
      resize();
      gl.uniform1f(u.uFlow, 0);
      gl.uniform1f(u.uChurn, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVis = () => {
      if (cfg.paused || reduce) return;
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);
    const onLost = (e) => { e.preventDefault(); canvas.style.display = 'none'; };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
  }, []);

  return html`
    <div
      ref=${hostRef}
      className=${'glowing-ridges ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="glowing-ridges__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
