/**
 * HalftoneWave — React Bits Pro component, running from the vendor's own shader.
 *
 * The vertex and fragment shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping and its own animation clock. The three.js wrapper the vendor uses is replaced by
 * an equivalent fullscreen quad in plain WebGL — same geometry mapping, same uniforms, same
 * maths — so the output matches the component's Customize preview.
 *
 * Vendor wrapper detail kept here: uRes is the device-pixel resolution (vendor: useThree size * dpr) and feeds gl_FragCoord.xy / uRes.
 * The vendor vertex shader transforms through `projectionMatrix * modelViewMatrix` (three.js
 * prepends those), so the matrices are supplied as three.js computes them for this camera
 * rather than edited out of the body: ortho(-1,1,1,-1,0.1,2000) x translate(0,0,-1) for the
 * orthographic components, the same pair for the default-camera ones (their plane is sized to
 * the viewport, and the result is identity in xy either way).
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Vendor prop defaults: ({width:"100%",height:"100%",speed:1,noiseScale:3,octaves:3,gridDensity:40,dotSize:.75,softness:.35,contrastMin:.2,contrastMax:.8,scrollX:.1,scrollY:.1,rotation:0,colorA:"#FFFFFF",colorB:"#000000",backgroundColor:"#FFFFFF",opacity:1,cursorInteraction:!1})
 * Configuration: passed in as props by the island markup (data-rb-props).
 */
const { useEffect, useRef } = React;
const html = window.htm.bind(window.React.createElement);

/* Vendor vertex shader, byte-identical to the bundle. */
const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* Vendor fragment shader, byte-identical to the bundle. */
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uNoiseScale;
uniform int   uOctaves;
uniform float uGridDensity;
uniform float uDotSize;
uniform float uSoftness;
uniform float uContrastMin;
uniform float uContrastMax;
uniform float uScrollX;
uniform float uScrollY;
uniform float uRotation;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uBg;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uCursorActive;

varying vec2 vUv;

float hash(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= uOctaves) break;
    value += amplitude * valueNoise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  float t = uTime * uSpeed;

  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x *= uRes.x / uRes.y;

  vec2 center = vec2((uRes.x / uRes.y) * 0.5, 0.5);
  vec2 rotUv = uv - center;
  float cr = cos(uRotation);
  float sr = sin(uRotation);
  rotUv = mat2(cr, -sr, sr, cr) * rotUv;
  uv = rotUv + center;

  vec2 noiseUV = uv * uNoiseScale + vec2(t * uScrollX, t * uScrollY);
  float n = fbm(noiseUV);

  n = smoothstep(uContrastMin, uContrastMax, n);

  vec2 gridUV = uv * uGridDensity;
  vec2 cellUV = fract(gridUV) - 0.5;
  float dist = length(cellUV);

  vec2 pointerUv = vec2(uPointer.x * (uRes.x / uRes.y), uPointer.y);
  float cursorDist = length(uv - pointerUv);
  float cursorBoost = smoothstep(0.35, 0.0, cursorDist) * 0.3 * uCursorActive;

  float targetRadius = n * uDotSize + cursorBoost;
  float dotMask = smoothstep(targetRadius + uSoftness, targetRadius - uSoftness, dist);

  vec3 dotColor = mix(uColorA, uColorB, n);
  vec3 finalColor = mix(uBg, dotColor, dotMask);

  gl_FragColor = vec4(finalColor, uAlpha);
}
`;

/* three.js supplies these; the vendor body stays untouched. */
const MATRIX_HEADER = `uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
`;
/* ortho(-1,1,1,-1,0.1,2000) and translate(0,0,-1), as three.js builds them */
const PROJECTION = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.00050003, 0, 0, 0, -1.00010002, 1]);
const MODELVIEW = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1, 1]);

const vertFor = (gl2) => (gl2
  ? `#version 300 es
in vec3 position;
in vec2 uv;
out vec2 vUv;
` + MATRIX_HEADER + VERT.replace('varying vec2 vUv;', '')
  : `attribute vec3 position;
attribute vec2 uv;
` + MATRIX_HEADER + VERT);

/* This component's fragment uses only functions present in GLSL ES 1.00, so the WebGL1
   fallback needs no shims; the empty hook is kept so the fallback stays a pure prefix. */
const GLSL1_SHIMS = '';

const fragFor = (gl2) => (gl2
  ? `#version 300 es
` + (FRAG.indexOf('precision highp float;') >= 0
      ? FRAG.replace('precision highp float;', 'precision highp float;\nout vec4 fragColor;')
      : 'precision highp float;\nout vec4 fragColor;\n' + FRAG)
      .replace('varying vec2 vUv;', 'in vec2 vUv;')
      .replace(/gl_FragColor/g, 'fragColor')
  : GLSL1_SHIMS + FRAG);

const DEFAULTS = {
  width: '100%',
  height: '100%',
  speed: 1,
  noiseScale: 3,
  octaves: 3,
  gridDensity: 40,
  dotSize: 0.75,
  softness: 0.35,
  contrastMin: 0.2,
  contrastMax: 0.8,
  scrollX: 0.1,
  scrollY: 0.1,
  rotation: 0,
  colorA: '#FFFFFF',
  colorB: '#000000',
  backgroundColor: '#FFFFFF',
  opacity: 1,
  cursorInteraction: false,
  paused: false,
  dpr: 0
};

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}
/* the vendor takes a bare [r,g,b] triple for this one */
function rgbOrHex(v) {
  return Array.isArray(v) ? [v[0], v[1], v[2]] : hexToRgb(v);
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

export default function HalftoneWave(props) {
  const cfg = Object.assign({}, DEFAULTS, props || {});
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const opts = {
      alpha: true, antialias: true, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false
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
      console.error('[HalftoneWave] ' + err.message);
      return undefined;
    }
    gl.useProgram(program);

    /* fullscreen quad standing in for the vendor's PlaneGeometry: position in [-1,1], uv 0..1 */
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
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * 4);
    }

    const projLoc = gl.getUniformLocation(program, 'projectionMatrix');
    const mvLoc = gl.getUniformLocation(program, 'modelViewMatrix');
    if (projLoc) gl.uniformMatrix4fv(projLoc, false, PROJECTION);
    if (mvLoc) gl.uniformMatrix4fv(mvLoc, false, MODELVIEW);

    const u = {};
    ['uTime', 'uRes', 'uSpeed', 'uNoiseScale', 'uOctaves', 'uGridDensity', 'uDotSize', 'uSoftness', 'uContrastMin', 'uContrastMax', 'uScrollX', 'uScrollY', 'uRotation', 'uColorA', 'uColorB', 'uBg', 'uAlpha', 'uPointer', 'uCursorActive'].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    const setRGB = (loc, c) => { gl.uniform3f(loc, c[0], c[1], c[2]); };

    /* static uniforms, assigned exactly as the vendor's per-frame block does */
    function applyStatic() {
      gl.uniform1f(u.uSpeed, cfg.speed);
      gl.uniform1f(u.uNoiseScale, cfg.noiseScale);
      gl.uniform1i(u.uOctaves, cfg.octaves);
      gl.uniform1f(u.uGridDensity, cfg.gridDensity);
      gl.uniform1f(u.uDotSize, cfg.dotSize);
      gl.uniform1f(u.uSoftness, cfg.softness);
      gl.uniform1f(u.uContrastMin, cfg.contrastMin);
      gl.uniform1f(u.uContrastMax, cfg.contrastMax);
      gl.uniform1f(u.uScrollX, cfg.scrollX);
      gl.uniform1f(u.uScrollY, cfg.scrollY);
      gl.uniform1f(u.uRotation, cfg.rotation * Math.PI / 180);
      setRGB(u.uColorA, hexToRgb(cfg.colorA));
      setRGB(u.uColorB, hexToRgb(cfg.colorB));
      setRGB(u.uBg, hexToRgb(cfg.backgroundColor));
      gl.uniform1f(u.uAlpha, cfg.opacity);
      /* no pointer handler in this port: the vendor only lerps toward the pointer when
         cursorInteraction is on, which needs a live input surface inside the island */
      gl.uniform2f(u.uPointer, 0.5, 0.5);
      gl.uniform1f(u.uCursorActive, 0);

    }
    applyStatic();

    /* the vendor clears the renderer to transparent black and blends the fragment's alpha */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    /* port knob: `dpr` caps the device ratio (0 = uncapped, capped at 2 like the vendor) */
    let dprBound = Math.min(window.devicePixelRatio || 1, 2);
    if (cfg.dpr > 0) dprBound = Math.min(dprBound, cfg.dpr);

    let time = 0;
    let raf = 0;
    let running = true;
    let last = performance.now();

    const drawStatic = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.uTime, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const cssW = rect.width;
      const cssH = rect.height;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const w = Math.max(1, Math.round(cssW * dprBound));
      const h = Math.max(1, Math.round(cssH * dprBound));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.uRes, w, h);
      /* Resizing the drawing buffer clears it. Under reduced motion (or paused) there is no
         frame loop to repaint, so any ResizeObserver tick used to leave the field blank —
         which reads as a canvas update under prefers-reduced-motion. Repaint the static frame. */
      if (!running) drawStatic();
    };

    const frame = (now) => {
      const delta = Math.min((now - last) / 1000, 0.05);   /* port clamp */
      last = now;
      time += delta * cfg.speed * 0.5;   /* half speed (2026-09-29): the field read as rushed */
                            /* vendor: iTime = elapsed * speed */
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (running) raf = requestAnimationFrame(frame);
    };

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host);
    window.addEventListener('resize', resize);

    if (cfg.paused || reduce) {
      running = false;
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.uTime, 0);
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
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
  }, []);

  return html`
    <div
      ref=${hostRef}
      className=${'rb-halftone-wave ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="rb-halftone-wave__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
