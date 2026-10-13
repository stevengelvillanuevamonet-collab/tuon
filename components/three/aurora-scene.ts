import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from "three";

/**
 * The Aurora ribbons background: three soft light ribbons drawn by one fragment shader.
 *
 * Kept deliberately cheap:
 *  - the canvas renders at ~60% resolution (it's blurry light, so nothing is lost) and CSS scales it up
 *  - the loop stops when the tab is hidden, when paused, and in "still" mode
 *  - "calm" mode renders at 30 fps
 */
export type SceneMode = "full" | "calm" | "still";

export interface AuroraController {
  setDark(dark: boolean): void;
  setMode(mode: SceneMode): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uDark, uScroll;
uniform vec2 uMouse, uRes;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(asp, 1.0) * 2.0;
  float t = uTime * 0.07;
  p.y += uScroll * 0.5;

  float w1 = fbm(vec2(p.x * 0.9 + t, t * 0.7));
  float w2 = fbm(vec2(p.x * 0.7 - t * 1.2 + 4.0, t * 0.5 + 3.0));
  float w3 = fbm(vec2(p.x * 1.3 + t * 0.8 + 9.0, t * 0.9));
  float b1 = exp(-pow((p.y - (w1 - 0.5) * 1.7 - 0.38) * 2.3, 2.0));
  float b2 = exp(-pow((p.y - (w2 - 0.5) * 1.9 + 0.22) * 1.9, 2.0));
  float b3 = exp(-pow((p.y - (w3 - 0.5) * 1.5 - 0.85) * 3.0, 2.0));

  vec2 m = (uMouse - 0.5) * vec2(asp, 1.0) * 2.0;
  float mg = exp(-length(p - m) * 1.5) * 0.28;

  vec3 c1 = vec3(0.17, 0.27, 1.0);   // cobalt
  vec3 c2 = vec3(0.56, 0.31, 0.78);  // violet
  vec3 c3 = vec3(0.07, 0.65, 0.58);  // teal
  vec3 c4 = vec3(1.0, 0.89, 0.36);   // highlighter

  float wsum = b1 + b2 + b3 * 0.8 + mg;
  vec3 col = (c1 * b1 + c2 * b2 + c3 * b3 * 0.8 + mix(c1, c4, 0.5) * mg) / max(wsum, 0.001);
  float a = clamp(wsum, 0.0, 1.0) * mix(0.3, 0.4, uDark);
  gl_FragColor = vec4(col, a);
}`;

const MODE_OPACITY: Record<SceneMode, number> = { full: 1, calm: 0.6, still: 0.34 };

export function createAuroraScene(
  canvas: HTMLCanvasElement,
  initial: { dark: boolean; mode: SceneMode; paused: boolean },
): AuroraController | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    return null; // WebGL blocked: the CSS gradient on <body> is the fallback
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uDark: { value: initial.dark ? 1 : 0 },
    uScroll: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uRes: { value: new Vector2(1, 1) },
  };
  const material = new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false });
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);

  let mode = initial.mode;
  let paused = initial.paused;
  let running = false;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let time = 0;
  let fade = 1;
  const target = new Vector2(0.5, 0.5);

  function applyOpacity() {
    canvas.style.opacity = (MODE_OPACITY[mode] * fade).toFixed(3);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1) * 0.6);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
    draw();
  }

  function draw() {
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    let dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (mode === "calm") {
      acc += dt;
      if (acc < 1 / 30) return;
      dt = acc;
      acc = 0;
    }
    time += dt;
    uniforms.uTime.value = time;
    uniforms.uMouse.value.lerp(target, Math.min(1, dt * 3));
    draw();
  }

  function sync() {
    const want = !paused && mode !== "still" && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    if (!want) draw();
  }

  const onPointer = (e: PointerEvent) => target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    uniforms.uScroll.value = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    // On the landing page, ease the scene back as dense content scrolls in so text stays readable.
    fade = mode === "full" ? Math.max(0.58, window.scrollY < 260 ? 1 : 1 - ((window.scrollY - 260) / 1000) * 0.42) : 1;
    applyOpacity();
    if (!running) draw();
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", sync);

  resize();
  onScroll();
  sync();

  return {
    setDark(dark) {
      uniforms.uDark.value = dark ? 1 : 0;
      if (!running) draw();
    },
    setMode(next) {
      mode = next;
      onScroll();
      sync();
    },
    setPaused(next) {
      paused = next;
      sync();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", sync);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
