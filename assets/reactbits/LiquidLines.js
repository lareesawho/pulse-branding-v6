/**
 * LiquidLines — React Bits Pro component, running from the vendor's own shader.
 *
 * The vertex and fragment shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping and its own animation clock. The three.js wrapper the vendor uses is replaced by
 * an equivalent fullscreen quad in plain WebGL — same geometry mapping, same uniforms, same
 * maths — so the output matches the component's Customize preview.
 *
 * Vendor wrapper detail kept here: u_resolution is read only as resolution.x / resolution.y, so device pixels reproduce the vendor framing (the vendor passed 100 x the container viewport). The fragment writes alpha 1.0 and its material is not transparent, so the field is opaque: the CSS layer decides how much of it shows.
 * The vendor vertex shader transforms through `projectionMatrix * modelViewMatrix` (three.js
 * prepends those), so the matrices are supplied as three.js computes them for this camera
 * rather than edited out of the body: ortho(-1,1,1,-1,0.1,2000) x translate(0,0,-1) for the
 * orthographic components, the same pair for the default-camera ones (their plane is sized to
 * the viewport, and the result is identity in xy either way).
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Vendor prop defaults: ({width:"100%",height:"100%",className:"",speed:.4,iterations:3,waveFrequency:49,depthStep:.05,lineThickness:.009,waveAmplitude:.6,lineColor:"#ffffff",lightBackground:"#ffffff",darkBackground:"#000000",brightness:2.5,contrast:1.1,offsetX:0,offsetY:0,scale:.3,opacity:1})
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

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform int u_iterations;
uniform float u_waveFrequency;
uniform float u_depthStep;
uniform float u_lineThickness;
uniform float u_waveAmplitude;
uniform vec3 u_lineColor;
uniform vec3 u_backgroundColor;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_scale;
uniform float u_opacity;

varying vec2 vUv;

void main() {
  float time = u_time * u_speed;
  vec2 resolution = u_resolution;

  vec3 accumulator = vec3(0.0);
  float depth = time;
  float magnitude = 0.0;

  vec2 baseCoord = (vUv - 0.5) * 2.0;
  baseCoord.x *= resolution.x / resolution.y;
  baseCoord *= u_scale;
  baseCoord += vec2(u_offsetX, u_offsetY);

  for (int i = 0; i < 100; i++) {
    if (i >= u_iterations) break;

    vec2 coord = baseCoord;
    vec2 waveCoord = coord;

    coord -= waveCoord.x + 0.1;
    coord.x *= resolution.x / resolution.y;

    depth += u_depthStep;
    magnitude = length(coord);

    float phase1 = depth * 0.7;
    float phase2 = depth * 1.3;
    float wave1 = sin(phase1) * 0.5 + cos(phase2) * 0.5 + 1.5;
    float wave2 = sin(magnitude * u_waveFrequency - depth) * 0.7 + cos(magnitude * u_waveFrequency * 0.5 + depth * 0.3) * 0.3;
    waveCoord += coord / max(magnitude, 0.01) * wave1 * wave2 * u_waveAmplitude;

    vec2 gridPos = mod(waveCoord, 1.0) - 0.5;
    float lineIntensity = u_lineThickness / length(gridPos);

    if (i == 0) accumulator.r = lineIntensity;
    else if (i == 1) accumulator.g = lineIntensity;
    else if (i == 2) accumulator.b = lineIntensity;
    else {
      accumulator += vec3(lineIntensity) * 0.01;
    }
  }

  accumulator = accumulator / max(magnitude, 0.001);

  accumulator = (accumulator - 0.5) * u_contrast + 0.5;
  accumulator *= u_brightness;

  vec3 finalColor = accumulator * u_lineColor;

  float alpha = clamp(length(accumulator) * u_opacity, 0.0, 1.0);
  finalColor = mix(u_backgroundColor, finalColor, alpha);

  gl_FragColor = vec4(finalColor, 1.0);
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
  speed: 0.4,
  iterations: 3,
  waveFrequency: 49,
  depthStep: 0.05,
  lineThickness: 0.009,
  waveAmplitude: 0.6,
  lineColor: '#ffffff',
  backgroundColor: '#000000',
  brightness: 2.5,
  contrast: 1.1,
  offsetX: 0,
  offsetY: 0,
  scale: 0.3,
  opacity: 1,
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

export default function LiquidLines(props) {
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
      console.error('[LiquidLines] ' + err.message);
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
    ['u_time', 'u_resolution', 'u_speed', 'u_iterations', 'u_waveFrequency', 'u_depthStep', 'u_lineThickness', 'u_waveAmplitude', 'u_lineColor', 'u_backgroundColor', 'u_brightness', 'u_contrast', 'u_offsetX', 'u_offsetY', 'u_scale', 'u_opacity'].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    const setRGB = (loc, c) => { gl.uniform3f(loc, c[0], c[1], c[2]); };

    /* static uniforms, assigned exactly as the vendor's per-frame block does */
    function applyStatic() {
      gl.uniform1f(u.u_speed, cfg.speed);
      gl.uniform1i(u.u_iterations, cfg.iterations);
      gl.uniform1f(u.u_waveFrequency, cfg.waveFrequency);
      gl.uniform1f(u.u_depthStep, cfg.depthStep);
      gl.uniform1f(u.u_lineThickness, cfg.lineThickness);
      gl.uniform1f(u.u_waveAmplitude, cfg.waveAmplitude);
      setRGB(u.u_lineColor, hexToRgb(cfg.lineColor));
      setRGB(u.u_backgroundColor, hexToRgb(cfg.backgroundColor));
      gl.uniform1f(u.u_brightness, cfg.brightness);
      gl.uniform1f(u.u_contrast, cfg.contrast);
      gl.uniform1f(u.u_offsetX, cfg.offsetX);
      gl.uniform1f(u.u_offsetY, cfg.offsetY);
      gl.uniform1f(u.u_scale, cfg.scale);
      gl.uniform1f(u.u_opacity, cfg.opacity);

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
      gl.uniform2f(u.u_resolution, w, h);
    };

    const frame = (now) => {
      const delta = Math.min((now - last) / 1000, 0.05);   /* port clamp */
      last = now;
      time += delta * cfg.speed * 0.5;   /* half speed (2026-09-29): the field read as rushed */
                            /* vendor: iTime = elapsed * speed */
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.u_time, time);
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
      gl.uniform1f(u.u_time, 0);
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
      className=${'rb-liquid-lines ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="rb-liquid-lines__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
