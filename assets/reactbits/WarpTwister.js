/**
 * WarpTwister — React Bits Pro component, running from the vendor's own shader.
 *
 * The vertex and fragment shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping and its own animation clock. The three.js wrapper the vendor uses is replaced by
 * an equivalent fullscreen quad in plain WebGL — same geometry mapping, same uniforms, same
 * maths — so the output matches the component's Customize preview.
 *
 * Vendor wrapper detail kept here: The fragment is a raymarched quadric: u_resolution feeds only the ndc.x aspect and vUv spans the container, so device pixels reproduce the vendor framing.
 * The vendor vertex shader transforms through `projectionMatrix * modelViewMatrix` (three.js
 * prepends those), so the matrices are supplied as three.js computes them for this camera
 * rather than edited out of the body: ortho(-1,1,1,-1,0.1,2000) x translate(0,0,-1) for the
 * orthographic components, the same pair for the default-camera ones (their plane is sized to
 * the viewport, and the result is identity in xy either way).
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Vendor prop defaults: ({radius:1.5,narrow:1.8,length:10,hazeSpeed:.5,dustSpeed:1,hazeStrength:.25,hazeFrequency:100,dustDensity:300,dustSize:100,dustOpacity:.1,edgeFade:2,spiralTight:.5,rotSpeed:0,baseColor:[.753,.518,.988],baseColorLight:[.267,0,.667],cameraDistance:8.5,lightMode:!1,className:b})
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
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float u_narrow;
uniform float u_length;
uniform float u_hazeSpeed;
uniform float u_dustSpeed;
uniform float u_hazeStrength;
uniform float u_hazeFrequency;
uniform float u_dustDensity;
uniform float u_dustSize;
uniform float u_dustOpacity;
uniform float u_edgeFade;
uniform float u_spiralTight;
uniform float u_rotSpeed;
uniform vec3 u_baseColor;
uniform float u_cameraDistance;
uniform bool u_lightMode;

varying vec2 vUv;

bool clipped(in vec3 pos, float clipY, float clipZ) {
  return abs(pos.y) < clipY && abs(pos.z) < clipZ;
}

float iQuadricTypeA(in vec3 ro, in vec3 rd, in vec4 abcd, in float clipY, in float clipZ, out vec3 oNor) {
  vec3 r2 = abcd.xyz * abs(abcd.xyz);
  float k2 = dot(rd, rd * r2);
  float k1 = dot(rd, ro * r2);
  float k0 = dot(ro, ro * r2) - abcd.w;

  float h = k1 * k1 - k2 * k0;
  float nh = step(0.0, h);
  h = sqrt(max(h, 0.0)) * sign(k2);

  float t1 = (-k1 - h) / k2;
  float t2 = (-k1 + h) / k2;

  vec3 pos1 = ro + t1 * rd;
  vec3 pos2 = ro + t2 * rd;

  float v1 = float(clipped(pos1, clipY, clipZ)) * step(0.0, t1);
  float v2 = float(clipped(pos2, clipY, clipZ)) * step(0.0, t2);
  float s = step(0.0, v1);

  float t = mix(t2, t1, s) * nh;

  vec3 nor1 = normalize(pos1 * r2);
  vec3 nor2 = normalize(pos2 * r2);
  oNor = mix(nor2, nor1, s);

  return mix(-1.0, t, step(0.0, v1 + v2));
}

float hash21(vec2 p) {
  p = fract(p * vec2(345.42, 137.25));
  p += dot(p, p + 34.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1, 0));
  float c = hash21(i + vec2(0, 1));
  float d = hash21(i + vec2(1, 1));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.4;
  for (int i = 0; i < 3; i++) {
    s += noise(p) * a;
    p *= 1.28;
    a *= 0.512;
  }
  return s;
}

void main() {
  vec4 kShape = vec4(1.0 / u_radius, -1.0 / u_narrow, 1.0 / u_radius, 1.0);

  vec2 ndc = (vUv - 0.5) * 2.0;
  ndc.x *= u_resolution.x / u_resolution.y;

  vec3 ro = vec3(0.0, 0.0, u_cameraDistance);
  vec3 ta = vec3(0.0, 0.0, 0.0);

  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0, 1, 0)));
  vec3 vv = cross(uu, ww);

  vec3 rd = normalize(ndc.x * uu + ndc.y * vv + 3.0 * ww);

  float ang = 1.5707963;
  float c = cos(ang), s = sin(ang);
  ro = vec3(c * ro.x - s * ro.y, s * ro.x + c * ro.y, ro.z);
  rd = vec3(c * rd.x - s * rd.y, s * rd.x + c * rd.y, rd.z);

  vec3 nor;
  float t = iQuadricTypeA(ro, rd, kShape, u_length, u_length, nor);
  float valid = step(0.0, t);

  vec3 pos = ro + t * rd;

  float angle = atan(pos.z, pos.x);
  float cy = pos.y;
  float angle01 = angle * 0.15915494 + 0.5;
  float flow = cy - u_time * u_hazeSpeed;

  float swirl = angle + cy * u_spiralTight + u_time * u_rotSpeed;
  vec2 cyc = vec2(cos(swirl), sin(swirl));

  vec2 h1 = vec2(cyc.x * u_hazeFrequency, flow * 2.0 + cyc.y * 0.75);
  vec2 h2 = vec2(cyc.y * (u_hazeFrequency * 0.7), flow * 1.37 - cyc.x * 0.5);
  float haze = pow(mix(fbm(h1), fbm(h2), 0.5), 2.0) * u_hazeStrength;

  float u = cyc.x * 0.5 + 0.5;
  float v = cyc.y * 0.5 + 0.5;

  vec2 uid = vec2(
    floor(u * u_dustDensity),
    floor(v * u_dustDensity + flow * 0.1)
  );

  float r1 = hash21(uid * 1.373 + 1.7);
  float r2 = hash21(uid * 2.911 + 3.1);
  float r3 = hash21(uid * 4.277 + 5.9);

  float local = cy + (r1 - 0.5) - u_time * u_dustSpeed * 0.5;
  float d = abs(fract(local) - 0.5);

  float size = mix(u_dustSize * 0.6, u_dustSize * 1.4, r2);
  float opacity = mix(u_dustOpacity * 0.4, u_dustOpacity * 0.8, r3);

  float core = exp(-d * size);
  float halo = exp(-d * size * 0.35);
  float dust = (core * 0.1 + halo * 0.8) * opacity;

  float seamFade = smoothstep(0.0, 0.2, min(angle01, 1.0 - angle01));
  dust *= seamFade;

  float fres = pow(1.0 - abs(dot(nor, -rd)), 1.35);
  float edgeFadeVal = smoothstep(0.0, 0.9, fres);
  float fadeLen = smoothstep(u_length * 0.55, 0.25, length(pos));

  vec3 col = (vec3(haze) + vec3(dust)) * fadeLen * valid;
  col *= 1.0 - edgeFadeVal * u_edgeFade;
  col *= u_baseColor;
  col = sqrt(col);

  float alpha = max(max(col.r, col.g), col.b);
  alpha = clamp(alpha * 2.0, 0.0, 1.0);

  if (u_lightMode) {
    float luminance = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luminance), col, 2.5);
    col = pow(col, vec3(0.7));
    col = clamp(col * 2.0, 0.0, 1.0);
    alpha = clamp(luminance * 6.0, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, alpha);
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
  radius: 1.5,
  narrow: 1.8,
  length: 10,
  hazeSpeed: 0.5,
  dustSpeed: 1,
  hazeStrength: 0.25,
  hazeFrequency: 100,
  dustDensity: 300,
  dustSize: 100,
  dustOpacity: 0.1,
  edgeFade: 2,
  spiralTight: 0.5,
  rotSpeed: 0,
  baseColor: [0.753, 0.518, 0.988],
  baseColorLight: [0.267, 0, 0.667],
  cameraDistance: 8.5,
  lightMode: false,
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

export default function WarpTwister(props) {
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
      console.error('[WarpTwister] ' + err.message);
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
    ['u_time', 'u_resolution', 'u_radius', 'u_narrow', 'u_length', 'u_hazeSpeed', 'u_dustSpeed', 'u_hazeStrength', 'u_hazeFrequency', 'u_dustDensity', 'u_dustSize', 'u_dustOpacity', 'u_edgeFade', 'u_spiralTight', 'u_rotSpeed', 'u_baseColor', 'u_cameraDistance', 'u_lightMode'].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    const setRGB = (loc, c) => { gl.uniform3f(loc, c[0], c[1], c[2]); };

    /* static uniforms, assigned exactly as the vendor's per-frame block does */
    function applyStatic() {
      gl.uniform1f(u.u_radius, cfg.radius);
      gl.uniform1f(u.u_narrow, cfg.narrow);
      gl.uniform1f(u.u_length, cfg.length);
      gl.uniform1f(u.u_hazeSpeed, cfg.hazeSpeed);
      gl.uniform1f(u.u_dustSpeed, cfg.dustSpeed);
      gl.uniform1f(u.u_hazeStrength, cfg.hazeStrength);
      gl.uniform1f(u.u_hazeFrequency, cfg.hazeFrequency);
      gl.uniform1f(u.u_dustDensity, cfg.dustDensity);
      gl.uniform1f(u.u_dustSize, cfg.dustSize);
      gl.uniform1f(u.u_dustOpacity, cfg.dustOpacity);
      gl.uniform1f(u.u_edgeFade, cfg.edgeFade);
      gl.uniform1f(u.u_spiralTight, cfg.spiralTight);
      gl.uniform1f(u.u_rotSpeed, cfg.rotSpeed);
      setRGB(u.u_baseColor, rgbOrHex(cfg.baseColor));
      gl.uniform1f(u.u_cameraDistance, cfg.cameraDistance);
      gl.uniform1i(u.u_lightMode, cfg.lightMode ? 1 : 0);

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
      className=${'rb-warp-twister ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="rb-warp-twister__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
