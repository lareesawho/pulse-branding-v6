/**
 * ChromaWaves — React Bits Pro component, running from the vendor's own shader.
 *
 * The vertex and fragment shaders below are the Pro component's shaders as shipped in its
 * published bundle (extracted verbatim, not reimplemented), together with its uniform
 * mapping, its own clamp rules and its own animation clock. The three.js wrapper the vendor
 * uses (WebGLRenderer + PlaneGeometry(2,2) with `gl_Position = vec4(position, 1.0)`) is
 * replaced by an equivalent fullscreen quad in plain WebGL — same geometry mapping, same
 * uniforms, same maths — so the output matches the component's Customize preview.
 *
 * The vendor material is `transparent: true` with the renderer cleared to (0,0,0,0), so the
 * fragment's alpha (mean intensity * uOpacity) is composited over the page; that is kept.
 *
 * Licensing: Pro (paid) component. Kept inside Lareesa's private project at her instruction.
 * Do not republish or ship this file in a public/OSS repo.
 *
 * Configuration: passed in as props by the island markup (data-rb-props).
 */
const { useEffect, useRef } = React;
const html = window.htm.bind(window.React.createElement);

/* Vendor vertex shader, byte-identical to the bundle. */
const VERT = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

/* Vendor fragment shader, byte-identical to the bundle. */
const FRAG = `
      precision mediump float;

      #define PI 3.1415926538

      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor;
      uniform vec3 uBackgroundColor;
      uniform float uWaveFrequency;
      uniform float uWaveAmplitude;
      uniform float uDistortion;
      uniform float uChromaShift;
      uniform float uNoiseLevel;
      uniform float uFlatness;
      uniform float uOpacity;

      vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }

      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }

      vec3 fade(vec3 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      }

      float cnoise(vec3 P) {
        vec3 Pi0 = floor(P);
        vec3 Pi1 = Pi0 + vec3(1.0);
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P);
        vec3 Pf1 = Pf0 - vec3(1.0);
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
        vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
        vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
        vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
        vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
        vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
        vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
        vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
        return 2.2 * n_xyz;
      }

      float flatSin(float x, float b) {
        float num = 1.0 + b * b;
        float den = 1.0 + b * b * cos(x) * cos(x);
        float y = sqrt(num / den) * cos(x);
        return y * 0.5 + 0.5;
      }

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord / iResolution.xy;
        vec2 center = vec2(0.5);
        vec2 delta = uv - center;
        float dist = length(delta);

        float timeScale = 0.1;
        float timeDelay = uChromaShift * 0.08;
        float baseTime = iTime * timeScale;

        float bSquared = uFlatness * uFlatness;
        float num = 1.0 + bSquared;

        vec3 intensity;

        for (int i = 0; i < 3; i++) {
          float tOffset = float(i) * timeDelay;

          vec2 distortedUV = uv;
          float dx = cnoise(vec3(1.8 * uv, baseTime + tOffset)) * uDistortion;
          distortedUV.x += dx * 0.8;

          vec2 distortedDelta = distortedUV - center;
          float distortedDist = length(distortedDelta);
          float normalizedDist = 1.0 - distortedDist / 0.70710678;

          float x = uWaveFrequency * 100.0 * normalizedDist * uWaveAmplitude;
          float cosX = cos(x);
          float den = 1.0 + bSquared * cosX * cosX;
          float waveValue = sqrt(num / den) * cosX * 0.5 + 0.5;

          if (uNoiseLevel > 0.01) {
            float noise = rand(distortedUV * 1000.0);
            waveValue = waveValue * (1.0 - uNoiseLevel) + noise * uNoiseLevel;
          }

          intensity[i] = waveValue;
        }

        vec3 finalColor = mix(uBackgroundColor, uColor, intensity);

        float alpha = (intensity.r + intensity.g + intensity.b) * 0.333333 * uOpacity;

        fragColor = vec4(finalColor, alpha);
      }

      void main() {
        vec4 color = vec4(0.0);
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `;

/* The vendor's vertex shader declares no attributes itself (three.js prepends them);
   the quad supplies position(3)+uv(2), so only `position` is declared here. */
const vertFor = (gl2) => (gl2
  ? `#version 300 es
in vec3 position;
` + VERT
  : `attribute vec3 position;
` + VERT);

/* This component's fragment uses only functions present in GLSL ES 1.00 (mod, floor, fract,
   mix, step, sqrt, dot, sin, cos, abs), so the WebGL1 fallback needs no shims; the empty
   hook is kept so the fallback path stays a pure prefix instead of a shader edit. */
const GLSL1_SHIMS = '';

const fragFor = (gl2) => (gl2
  ? `#version 300 es
` + FRAG
      .replace('precision mediump float;', 'precision mediump float;\nout vec4 fragColor;')
      .replace('gl_FragColor', 'fragColor')
  : GLSL1_SHIMS + FRAG);

/* Defaults are the component's own prop defaults, read from the module in the bundle:
   ({width:"100%",height:"100%",speed:.5,color:"#FFFFFF",backgroundColor:"#8B5CF6",
     waveFrequency:.2,waveAmplitude:.3,distortion:1.5,chromaShift:.25,noiseLevel:.1,
     flatness:1,opacity:1,quality:"high"}) */
const DEFAULTS = {
  width: '100%',
  height: '100%',
  speed: 0.5,
  color: '#FFFFFF',
  backgroundColor: '#8B5CF6',
  waveFrequency: 0.2,
  waveAmplitude: 0.3,
  distortion: 1.5,
  chromaShift: 0.25,
  noiseLevel: 0.1,
  flatness: 1,
  opacity: 1,
  quality: 'high',
  /* Port-only knobs (not part of the vendor API): paused/dpr mirror the other islands;
     aspect 0 = the vendor's framing (iResolution is the container's real size). */
  paused: false,
  dpr: 0,
  aspect: 0
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* the component's own hex parser: #rrggbb, falling back to white */
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
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

export default function ChromaWaves(props) {
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
      console.error('[ChromaWaves] ' + err.message);
      return undefined;
    }
    gl.useProgram(program);

    /* fullscreen quad standing in for the vendor's PlaneGeometry(2,2) (position in [-1,1]) */
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

    const u = {};
    ['iTime', 'iResolution', 'uColor', 'uBackgroundColor', 'uWaveFrequency', 'uWaveAmplitude',
     'uDistortion', 'uChromaShift', 'uNoiseLevel', 'uFlatness', 'uOpacity'
    ].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    /* static uniforms, with the component's own clamps */
    const col = hexToRgb(cfg.color);
    const bg = hexToRgb(cfg.backgroundColor);
    gl.uniform3f(u.uColor, col[0], col[1], col[2]);
    gl.uniform3f(u.uBackgroundColor, bg[0], bg[1], bg[2]);
    gl.uniform1f(u.uWaveFrequency, clamp(cfg.waveFrequency, 0.1, 10));
    gl.uniform1f(u.uWaveAmplitude, clamp(cfg.waveAmplitude, 0.1, 5));
    gl.uniform1f(u.uDistortion, clamp(cfg.distortion, 0, 2));
    gl.uniform1f(u.uChromaShift, clamp(cfg.chromaShift, 0, 0.5));
    gl.uniform1f(u.uNoiseLevel, clamp(cfg.noiseLevel, 0, 1));
    gl.uniform1f(u.uFlatness, clamp(cfg.flatness, 0, 10));
    gl.uniform1f(u.uOpacity, clamp(cfg.opacity, 0, 1));

    /* the component's quality -> pixel-ratio scale, capped at 2 like the vendor */
    let qs = 1;
    if (cfg.quality === 'low') qs = 0.5;
    else if (cfg.quality === 'medium') qs = 0.75;
    let dprBound = Math.min((window.devicePixelRatio || 1) * qs, 2);
    if (cfg.dpr > 0) dprBound = Math.min(dprBound, cfg.dpr);

    /* the vendor clears the renderer to transparent black and blends the fragment's alpha */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let time = 0;
    let raf = 0;
    let running = true;
    let last = performance.now();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      let cssW = rect.width;
      let cssH = rect.height;
      if (cfg.aspect > 0) {
        /* optional cover-crop (port-only): keep the field's framing in extreme boxes */
        cssW = rect.width;
        cssH = rect.width / cfg.aspect;
        if (cssH < rect.height) { cssH = rect.height; cssW = rect.height * cfg.aspect; }
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
      } else {
        canvas.style.transform = 'none';
      }
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const w = Math.max(1, Math.round(cssW * dprBound));
      const h = Math.max(1, Math.round(cssH * dprBound));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform3f(u.iResolution, w, h, 1);
    };

    const frame = (now) => {
      const delta = Math.min((now - last) / 1000, 0.05);   /* port clamp, see report */
      last = now;
      time += delta * cfg.speed;                            /* vendor: iTime = elapsed * speed */
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.iTime, time);
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
      gl.uniform1f(u.iTime, 0);
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
      className=${'chroma-waves ' + (cfg.className || '')}
      style=${{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas
        ref=${canvasRef}
        className="chroma-waves__canvas"
        style=${{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  `;
}
