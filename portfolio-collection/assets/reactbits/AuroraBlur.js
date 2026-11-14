/**
 * AuroraBlur — React Bits Pro component, running from the vendor's own shader.
 *
 * The vertex and fragment shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping and its own animation clock. The three.js wrapper the vendor uses is replaced by
 * an equivalent fullscreen quad in plain WebGL — same geometry mapping, same uniforms, same
 * maths — so the output matches the component's Customize preview.
 *
 * Vendor wrapper detail kept here: u_resolution is read only for its aspect ratio and vUv 0..1 spans the container, so device pixels reproduce the vendor framing.
 * The vendor vertex shader transforms through `projectionMatrix * modelViewMatrix` (three.js
 * prepends those), so the matrices are supplied as three.js computes them for this camera
 * rather than edited out of the body: ortho(-1,1,1,-1,0.1,2000) x translate(0,0,-1) for the
 * orthographic components, the same pair for the default-camera ones (their plane is sized to
 * the viewport, and the result is identity in xy either way).
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Vendor prop defaults: ({width:"100%",height:"100%",speed:1.5,layers:d,noiseScale:3.5,movementX:-2,movementY:-3,verticalFade:.75,bloomIntensity:2,skyLayers:m,brightness:.8,saturation:1,opacity:1})
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
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform vec3 u_layer1Color;
uniform float u_layer1Speed;
uniform float u_layer1Intensity;
uniform vec3 u_layer2Color;
uniform float u_layer2Speed;
uniform float u_layer2Intensity;
uniform vec3 u_layer3Color;
uniform float u_layer3Speed;
uniform float u_layer3Intensity;
uniform vec3 u_layer4Color;
uniform float u_layer4Speed;
uniform float u_layer4Intensity;
uniform float u_noiseScale;
uniform float u_movementX;
uniform float u_movementY;
uniform float u_verticalFade;
uniform float u_bloomIntensity;
uniform vec3 u_skyColor1;
uniform vec3 u_skyColor2;
uniform float u_skyBlend1;
uniform float u_skyBlend2;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_opacity;

float h(float n){return fract(sin(n)*43758.5453);}

float n2d(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(h(i.x+h(i.y)),h(i.x+1.+h(i.y)),u.x),
             mix(h(i.x+h(i.y+1.)),h(i.x+1.+h(i.y+1.)),u.x),u.y);
}

vec3 aurora(vec2 uv,float spd,float intensity,vec3 col,float aspect){
  float t=u_time*u_speed*spd;
  vec2 scaled=vec2(uv.x*aspect,uv.y)*u_noiseScale;
  vec2 p=scaled+t*vec2(u_movementX,u_movementY);
  float n=n2d(p+n2d(col.xy+p+t));
  float a=n-uv.y*u_verticalFade;
  return col*a*intensity*u_bloomIntensity;
}

vec3 sat(vec3 c,float s){
  float g=dot(c,vec3(0.299,0.587,0.114));
  return mix(vec3(g),c,s);
}

void main(){
  vec2 uv=vUv;
  float aspect=u_resolution.x/u_resolution.y;

  vec3 c=vec3(0.);
  c+=aurora(uv,u_layer1Speed,u_layer1Intensity,u_layer1Color,aspect);
  c+=aurora(uv,u_layer2Speed,u_layer2Intensity,u_layer2Color,aspect);
  c+=aurora(uv,u_layer3Speed,u_layer3Intensity,u_layer3Color,aspect);
  c+=aurora(uv,u_layer4Speed,u_layer4Intensity,u_layer4Color,aspect);

  c+=u_skyColor2*(1.-smoothstep(u_skyBlend1,1.,uv.y));
  c+=u_skyColor1*(1.-smoothstep(0.,u_skyBlend2,uv.y));

  c=sat(c,u_saturation)*u_brightness;

  gl_FragColor=vec4(c,u_opacity);
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
  speed: 1.5,
  layers: [
    { color: '#00ff4d', speed: 0.37, intensity: 0.5 },
    { color: '#66b3ff', speed: 0.15, intensity: 0.35 },
    { color: '#d438ff', speed: 0.2, intensity: 0.1 },
    { color: '#1acbae', speed: 0.07, intensity: 0.15 }
  ],
  noiseScale: 3.5,
  movementX: -2,
  movementY: -3,
  verticalFade: 0.75,
  bloomIntensity: 2,
  skyLayers: [
    { color: '#5f2762', blend: 0.5 },
    { color: '#263031', blend: 0.5 }
  ],
  brightness: 0.8,
  saturation: 1,
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

export default function AuroraBlur(props) {
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
      console.error('[AuroraBlur] ' + err.message);
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
    ['u_time', 'u_resolution', 'u_speed', 'u_layer1Color', 'u_layer1Speed', 'u_layer1Intensity', 'u_layer2Color', 'u_layer2Speed', 'u_layer2Intensity', 'u_layer3Color', 'u_layer3Speed', 'u_layer3Intensity', 'u_layer4Color', 'u_layer4Speed', 'u_layer4Intensity', 'u_noiseScale', 'u_movementX', 'u_movementY', 'u_verticalFade', 'u_bloomIntensity', 'u_skyColor1', 'u_skyColor2', 'u_skyBlend1', 'u_skyBlend2', 'u_brightness', 'u_saturation', 'u_opacity'].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    const setRGB = (loc, c) => { gl.uniform3f(loc, c[0], c[1], c[2]); };

    /* static uniforms, assigned exactly as the vendor's per-frame block does */
    function applyStatic() {
      gl.uniform1f(u.u_speed, cfg.speed);
      const L = (cfg.layers && cfg.layers.length ? cfg.layers : DEFAULTS.layers);
      for (let i = 0; i < 4; i++) {
        const l = L[i] || {};
        setRGB(u['u_layer' + (i + 1) + 'Color'], hexToRgb(l.color || '#000'));
        gl.uniform1f(u['u_layer' + (i + 1) + 'Speed'], l.speed || 0);
        gl.uniform1f(u['u_layer' + (i + 1) + 'Intensity'], l.intensity || 0);
      }
      gl.uniform1f(u.u_noiseScale, cfg.noiseScale);
      gl.uniform1f(u.u_movementX, cfg.movementX);
      gl.uniform1f(u.u_movementY, cfg.movementY);
      gl.uniform1f(u.u_verticalFade, cfg.verticalFade);
      gl.uniform1f(u.u_bloomIntensity, cfg.bloomIntensity);
      const S = (cfg.skyLayers && cfg.skyLayers.length ? cfg.skyLayers : DEFAULTS.skyLayers);
      setRGB(u.u_skyColor1, hexToRgb((S[0] || {}).color || '#000'));
      setRGB(u.u_skyColor2, hexToRgb((S[1] || {}).color || '#000'));
      gl.uniform1f(u.u_skyBlend1, (S[1] || {}).blend || 0);   /* vendor: skyLayers[1].blend */
      gl.uniform1f(u.u_skyBlend2, (S[0] || {}).blend || 0);   /* vendor: skyLayers[0].blend */
      gl.uniform1f(u.u_brightness, cfg.brightness);
      gl.uniform1f(u.u_saturation, cfg.saturation);
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
    /* Offscreen pause: a hero field animates while it is on screen and holds its last
       frame once it leaves the viewport, so a page never pays for a field nobody sees. */
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          if (cfg.paused || reduce) return;
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!running && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
            } else if (running) {
              running = false;
              cancelAnimationFrame(raf);
            }
          });
        }, { rootMargin: '120px 0px' })
      : null;
    if (io) io.observe(host);
    const onLost = (e) => { e.preventDefault(); canvas.style.display = 'none'; };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
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
      className=${'rb-aurora-blur ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="rb-aurora-blur__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
