/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE 3D MUSCLE MAP IN THE EXERCISE CARD

   The athlete (avatar.js) standing at rest, front and back side by side
   as the 2D map was, with the exercise's muscles lit on his own surface
   (muscles3d.js): primary, supporting and stabilizing in the map's three
   colours. Drag to turn him; a muscle chip turns him to face that muscle
   and closes in on it; a tap on the body names the muscle under it.

   One body serves every card. It is built the first time a card opens
   (the model is fetched once, and shared with the animated rep), then
   retinted for each exercise and moved into whichever card is open. It
   draws only when something changes, so an open card costs nothing at
   rest. If WebGL or the model is missing, show() rejects and the card
   keeps its 2D map.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { loadTrainer, Trainer } from './avatar.js?v=3d-oct14d';
import { REGIONS, regionsOf, regionsOfMuscle } from './muscles3d.js?v=3d-oct14d';
import { MMAP } from './data.js?v=3d-oct14d';

const MODEL = 'athlete';
const TIER_ALPHA = [0, 0.9, 0.8, 0.55];   // by tier: primary, supporting, stabilizing

let V = null;             // the one view: { T, regs, renderer, scene, body, … }
let building = null;

/* The model's own materials, with a per-vertex tint laid over the skin
   and a little glow, so a lit muscle reads in shadow as well. */
function tintMaterial(src, uNeck) {
  const m = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, color: src.color.clone(), roughness: src.roughness, metalness: 0, alphaTest: src.alphaTest, side: src.side });
  if (src.normalScale) m.normalScale = src.normalScale.clone();
  m.name = src.name; m.visible = src.visible;
  m.onBeforeCompile = sh => {
    sh.uniforms.uNeck = uNeck;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nattribute float aBlend;\nvarying vec4 vTint;\nvarying float vBlend;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvBlend = aBlend;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uNeck;\nvarying vec4 vTint;\nvarying float vBlend;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uNeck, vBlend);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb, vTint.a);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vTint.rgb * vTint.a * 0.22;');
  };
  m.customProgramCacheKey = () => 'mm-tint';
  return m;
}

async function build() {
  const T = await loadTrainer(MODEL);
  const regs = regionsOf(T);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setScissorTest(true);
  renderer.domElement.className = 'mv-canvas';

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2622, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.1), rim = new THREE.DirectionalLight(0xbfd8ff, 1.0), fill = new THREE.DirectionalLight(0xffffff, 0.55);
  scene.add(key, rim, fill);

  /* The body at rest: every bone at its bind transform, in rig units. */
  const zero = { weights: Tm => { const n = Tm.geo.attributes.position.count; return [new Float32Array(n), new Float32Array(n)]; } };
  const body = new Trainer(T, { muscle: new THREE.Color(), muscle2: new THREE.Color() }, { hi: [], hi2: [] }, zero);
  const M = new THREE.Matrix4().makeScale(T.cm, T.cm, T.cm);
  for (const b of body.bones) { b.matrix.copy(M); b.matrixWorld.copy(M); }
  const old = body.mesh.material;
  body.mesh.material = old.map(o => tintMaterial(o, body.uniforms.uNeck));
  old.forEach(o => o.dispose());
  const n = body.mesh.geometry.attributes.position.count;
  body.mesh.geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  body.mesh.frustumCulled = false;
  scene.add(body.group);

  /* A plain copy of the rest pose for finding what a tap lands on. */
  const P = T.geo.attributes.position.array, rest = new Float32Array(P.length);
  for (let i = 0; i < P.length; i++) rest[i] = P[i] * T.cm;
  const pickGeo = new THREE.BufferGeometry();
  pickGeo.setAttribute('position', new THREE.BufferAttribute(rest, 3));
  pickGeo.setIndex(T.geo.index);
  pickGeo.computeBoundingSphere(); pickGeo.computeBoundingBox();
  const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

  const box = pickGeo.boundingBox, centre = box.getCenter(new THREE.Vector3()), height = box.max.y - box.min.y;
  const cams = [new THREE.PerspectiveCamera(30, 1, 1, 2000), new THREE.PerspectiveCamera(30, 1, 1, 2000)];

  V = { T, regs, renderer, scene, body, pick, rest, centre, height, cams, key, rim, fill,
    yaw: 0, view: 'both', focusOn: null, lit: new Map(), box: null, raf: 0, ro: null, onTap: null, spots: new Map() };
  wire();
  return V;
}

/* Where a region sits on the body: its weighted centre, height, and which
   way it faces (+z is the front at rest). Worked out once per region. */
function spot(id) {
  if (V.spots.has(id)) return V.spots.get(id);
  const k = V.regs.ids.indexOf(id), w = V.regs.w[k], R = V.rest, N = V.T.geo.attributes.normal;
  let sw = 0, x = 0, y = 0, z = 0, nz = 0, y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (let i = 0; i < w.length; i++) {
    const a = w[i];
    if (a < 0.4) continue;
    sw += a; x += R[3 * i] * a; y += R[3 * i + 1] * a; z += R[3 * i + 2] * a; nz += N.getZ(i) * a;
    y0 = Math.min(y0, R[3 * i + 1]); y1 = Math.max(y1, R[3 * i + 1]); x0 = Math.min(x0, R[3 * i]); x1 = Math.max(x1, R[3 * i]);
  }
  const s = sw ? { c: new THREE.Vector3(x / sw, y / sw, z / sw), size: Math.max(y1 - y0, (x1 - x0) * 0.8), front: nz >= 0 } : null;
  V.spots.set(id, s);
  return s;
}

/* Paint the lit regions: tier colours, or with one muscle in focus, that
   one bright and the rest faint. */
function tint() {
  const A = V.body.mesh.geometry.attributes.aTint, out = A.array, n = A.count;
  out.fill(0);
  const css = n2 => getComputedStyle(V.box || document.documentElement).getPropertyValue(n2).trim();
  const col = [null, new THREE.Color(css('--map-p') || '#4cc3ff'), new THREE.Color(css('--map-s') || '#f5a524'), new THREE.Color(css('--map-t') || '#8a8f98')];
  const focus = V.focusOn ? new Set(V.focusOn) : null;
  for (const [id, tier] of V.lit) {
    const k = V.regs.ids.indexOf(id);
    if (k < 0 || REGIONS[k].deep) continue;
    const c = focus && focus.has(id) ? col[1] : col[tier];
    const a = focus ? (focus.has(id) ? 0.95 : TIER_ALPHA[tier] * 0.3) : TIER_ALPHA[tier];
    const w = V.regs.w[k];
    for (let i = 0; i < n; i++) {
      const x = w[i] * a;
      if (x > out[i * 4 + 3] + 1e-3) { out[i * 4] = c.r; out[i * 4 + 1] = c.g; out[i * 4 + 2] = c.b; out[i * 4 + 3] = x; }
    }
  }
  /* a focused muscle outside the exercise's list still shows, in the
     primary colour */
  if (focus) for (const id of focus) if (!V.lit.has(id)) {
    const k = V.regs.ids.indexOf(id), w = k >= 0 ? V.regs.w[k] : null;
    if (w) for (let i = 0; i < n; i++) if (w[i] * 0.95 > out[i * 4 + 3]) { out[i * 4] = col[1].r; out[i * 4 + 1] = col[1].g; out[i * 4 + 2] = col[1].b; out[i * 4 + 3] = w[i] * 0.95; }
  }
  A.needsUpdate = true;
  draw();
}

/* Cameras: whole body front and back, or one side closed in on a muscle. */
function aim() {
  const { renderer, cams, centre, height } = V, el = renderer.domElement;
  const W = el.clientWidth || 1, H = el.clientHeight || 1;
  const both = V.view === 'both' && !V.focusOn;
  const panes = both ? [[0, W / 2], [W / 2, W / 2]] : [[0, W]];
  const s = V.focusOn && V.focusOn.map(spot).find(Boolean);
  const sides = both ? [0, 180] : [(V.view === 'back' || (s && !s.front)) ? 180 : 0];
  V.panes = panes.map(([x, w], k) => {
    const cam = cams[k], aspect = w / H;
    const yaw = (sides[k] + V.yaw) * Math.PI / 180;
    const target = s ? s.c.clone() : centre.clone();
    const fitH = s ? Math.max(s.size * 2.2, height * 0.32) : height * 0.98;
    const tanV = Math.tan((cam.fov / 2) * Math.PI / 180);
    const dist = Math.max(fitH / 2 / tanV, (fitH * 0.45) / (tanV * aspect));
    cam.aspect = aspect;
    cam.position.set(target.x + Math.sin(yaw) * dist, target.y + dist * 0.06, target.z + Math.cos(yaw) * dist);
    cam.lookAt(target);
    cam.near = Math.max(1, dist - height); cam.far = dist + height * 2;
    cam.updateProjectionMatrix();
    return { cam, x, w, yaw };
  });
}

function draw() {
  if (!V || V.raf) return;
  V.raf = requestAnimationFrame(() => {
    V.raf = 0;
    const { renderer, scene } = V, el = renderer.domElement;
    if (!el.isConnected) return;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const pr = renderer.getPixelRatio();
    if (el.width !== Math.round(W * pr) || el.height !== Math.round(H * pr)) renderer.setSize(W, H, false);
    aim();
    renderer.setScissorTest(true);
    renderer.setClearColor(0x000000, 0);
    renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
    for (const p of V.panes) {
      /* lights follow the camera round, so whichever side is shown is lit */
      const c = p.cam.position, t = V.centre, s = Math.sin(p.yaw), co = Math.cos(p.yaw), R = V.height * 3;
      V.key.position.set(t.x + R * (0.6 * s + 0.5 * co), t.y + R * 1.1, t.z + R * (0.6 * co - 0.5 * s));
      V.rim.position.set(t.x - R * s * 0.9 - R * 0.4 * co, t.y + R * 0.6, t.z - R * co * 0.9 + R * 0.4 * s);
      V.fill.position.set(c.x, c.y, c.z);
      renderer.setScissor(p.x, 0, p.w, H); renderer.setViewport(p.x, 0, p.w, H);
      renderer.render(scene, p.cam);
    }
  });
}

/* Drag turns him; a tap (no drag) names the muscle under it. */
function wire() {
  const el = V.renderer.domElement;
  let drag = null;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: V.yaw, moved: false }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) { V.yaw = drag.yaw + dx * 0.6; el.classList.add('turned'); draw(); }
  });
  const end = e => {
    if (drag && !drag.moved) tap(e);
    drag = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { drag = null; });
}

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function tap(e) {
  if (!V.onTap || !V.panes) return;
  const r = V.renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const p = V.panes.find(p2 => x >= p2.x && x < p2.x + p2.w);
  if (!p) return;
  ndc.set(((x - p.x) / p.w) * 2 - 1, -(y / r.height) * 2 + 1);
  ray.setFromCamera(ndc, p.cam);
  const h = ray.intersectObject(V.pick, false)[0];
  if (!h) { V.onTap(null); return; }
  let best = null, bw = 0.15;
  for (const vi of [h.face.a, h.face.b, h.face.c]) V.regs.w.forEach((w, k) => { if (!REGIONS[k].deep && w[vi] > bw) { bw = w[vi]; best = REGIONS[k]; } });
  V.onTap(best);
}

/* ── for the card ── */

/* The exercise's muscle list (data.js `m`, most important first) → region
   id → tier (1 primary, 2 supporting, 3 stabilizing); the strongest claim
   wins where two names share a region. */
export function tiersOf(mStr) {
  const out = new Map();
  mStr.replace(/\(.*?\)/g, '').split(',').map(s => s.trim()).filter(Boolean).forEach((name, i) => {
    for (const id of regionsOfMuscle(name, MMAP)) out.set(id, Math.min(out.get(id) ?? 9, Math.min(i + 1, 3)));
  });
  return out;
}
export const regionsOfName = name => regionsOfMuscle(name, MMAP);

/* Shows the body in `box` lit for the muscle list `mStr`. Resolves once it
   is drawn; rejects if there is no WebGL or no model. */
export async function show(box, mStr, { onTap } = {}) {
  if (!V) { building ||= build(); await building; }
  V.box = box;
  V.onTap = onTap || null;
  const el = V.renderer.domElement;
  if (el.parentNode !== box) box.appendChild(el);
  V.ro?.disconnect();
  V.ro = new ResizeObserver(() => draw());
  V.ro.observe(box);
  V.lit = tiersOf(mStr);
  V.focusOn = null; V.view = 'both'; V.yaw = 0;
  el.classList.remove('turned');
  tint();
}

/* 'both' | 'front' | 'back' */
export function setView(view) {
  if (!V) return;
  V.view = view; V.focusOn = null; V.yaw = 0;
  tint();
}

/* Close in on these regions (a muscle chip), or back to the whole body. */
export function focus(ids) {
  if (!V) return;
  V.focusOn = ids && ids.length ? ids : null;
  V.yaw = 0;
  tint();
}

/* The card closed: stop drawing and let go of it. */
export function hide() {
  if (!V) return;
  V.ro?.disconnect(); V.ro = null;
  V.onTap = null;
  V.renderer.domElement.remove();
}
