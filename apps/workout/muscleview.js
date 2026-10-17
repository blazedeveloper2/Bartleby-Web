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
import { loadTrainer, Trainer, skinLook, isSkin, studioEnv } from './avatar.js?v=3d-oct14h';
import { REGIONS, regionsOf, regionsOfMuscle } from './muscles3d.js?v=3d-oct14e';
import { MMAP } from './data.js?v=3d-oct14d';
import { axisLock } from './drag.js?v=3d-oct14d';

const MODEL = 'athlete';
const TIER_ALPHA = [0, 0.9, 0.8, 0.55];   // by tier: primary, supporting, stabilizing

let V = null;             // the one view: { T, regs, renderer, scene, body, … }
let building = null;

/* The model's own materials, with a per-vertex tint laid over the skin
   and a little glow, so a lit muscle reads in shadow as well.

   `H` switches the Anatomy tab's hologram skin in (uHolo 0 → 1): the
   body goes dark in the accent colour (uHoloCol), see-through except at
   its edges, with a glow round its outline and fine scan lines up it
   (uHoloK lines per unit of height), while the lit muscles glow solid
   inside it. A uniform, so turning it on or off recompiles nothing. */
function tintMaterial(src, uNeck, H) {
  const m = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, color: src.color.clone(), roughness: src.roughness, metalness: 0, alphaTest: src.alphaTest, side: src.side });
  if (src.normalScale) m.normalScale = src.normalScale.clone();
  m.name = src.name; m.visible = src.visible;
  const skin = isSkin(src.name);
  m.onBeforeCompile = sh => {
    skinLook(sh, skin);
    sh.uniforms.uNeck = uNeck;
    Object.assign(sh.uniforms, H);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nattribute float aBlend;\nvarying vec4 vTint;\nvarying float vBlend;\nvarying float vHoloY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvBlend = aBlend;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoloY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uNeck;\nuniform float uHolo;\nuniform vec3 uHoloCol;\nuniform float uHoloK;\nvarying vec4 vTint;\nvarying float vBlend;\nvarying float vHoloY;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uNeck, vBlend);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uHoloCol * 0.12, uHolo * 0.92);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb, vTint.a);')
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float holoF = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);',
        'float holoL = smoothstep(0.8, 1.0, abs(fract(vHoloY * uHoloK) * 2.0 - 1.0));',
        'totalEmissiveRadiance += vTint.rgb * vTint.a * mix(0.3, 0.85, uHolo);',
        'totalEmissiveRadiance += uHoloCol * uHolo * (holoF * 0.9 + holoL * 0.3) * (1.0 - vTint.a * 0.7);',
      ].join('\n'))
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a = mix(gl_FragColor.a, max(vTint.a, 0.22 + holoF * 0.75), uHolo);');
  };
  m.customProgramCacheKey = () => (skin ? 'mm-tint-skin' : 'mm-tint');
  return m;
}

/* How the Anatomy tab dresses the body; the exercise card always gets
   the plain one (show() puts it back). */
const PLAIN = { shorts: true, atlas: null, spin: false, holo: false };

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
  /* as the rep's stage: soft light mostly from the studio (useEnv below),
     a warm key, a cool rim for the outline, a faint fill */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2622, 0.95));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.4), rim = new THREE.DirectionalLight(0xbfd8ff, 1.7), fill = new THREE.DirectionalLight(0xe6eeff, 0.45);
  scene.add(key, rim, fill);

  /* The body at rest: every bone at its bind transform, in rig units. */
  const zero = { weights: Tm => { const n = Tm.geo.attributes.position.count; return [new Float32Array(n), new Float32Array(n)]; } };
  const body = new Trainer(T, { muscle: new THREE.Color(), muscle2: new THREE.Color() }, { hi: [], hi2: [] }, zero);
  const M = new THREE.Matrix4().makeScale(T.cm, T.cm, T.cm);
  for (const b of body.bones) { b.matrix.copy(M); b.matrixWorld.copy(M); }
  const old = body.mesh.material;
  const H = { uHolo: { value: 0 }, uHoloCol: { value: new THREE.Color('#ff7a18') }, uHoloK: { value: 1 } };
  body.mesh.material = old.map(o => tintMaterial(o, body.uniforms.uNeck, H));
  old.forEach(o => o.dispose());
  body.useEnv(studioEnv(renderer));
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

  V = { T, regs, renderer, scene, body, pick, rest, centre, height, width: box.max.x - box.min.x, cams, key, rim, fill,
    yaw: 0, view: 'both', focusOn: null, near: true, lit: new Map(), box: null, raf: 0, ro: null, onTap: null, spots: new Map(),
    orb: null, ins: { l: 0, r: 0, t: 0, b: 0 }, insGoal: { l: 0, r: 0, t: 0, b: 0 }, onFrame: null, anchors: new Map(), last: 0,
    H, look: { ...PLAIN }, idle: 0, spinT: 0 };
  H.uHoloK.value = 90 / height;
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

/* Where a label line meets a muscle: a point on its surface, the vertex
   nearest the middle of it, with the way it faces and how big it is. A
   muscle that comes in a pair gets one per side, and the line goes to
   whichever faces you. Halves closer than a tenth of his height (the
   abs, the erectors) are one muscle down the midline, one point. */
function anchors(id) {
  if (V.anchors.has(id)) return V.anchors.get(id);
  const k = V.regs.ids.indexOf(id), w = k >= 0 ? V.regs.w[k] : null, R = V.rest, N = V.T.geo.attributes.normal, mid = V.centre.x;
  const half = () => ({ s: 0, x: 0, y: 0, z: 0, y0: Infinity, y1: -Infinity, x0: Infinity, x1: -Infinity, at: [] });
  let sides = [half(), half()];
  if (w) for (let i = 0; i < w.length; i++) {
    const a = w[i];
    if (a < 0.5) continue;
    const h = sides[R[3 * i] < mid ? 0 : 1], x = R[3 * i], y = R[3 * i + 1];
    h.s += a; h.x += x * a; h.y += y * a; h.z += R[3 * i + 2] * a; h.at.push(i);
    h.y0 = Math.min(h.y0, y); h.y1 = Math.max(h.y1, y); h.x0 = Math.min(h.x0, x); h.x1 = Math.max(h.x1, x);
  }
  const tot = sides[0].s + sides[1].s;
  sides = sides.filter(h => h.s > tot * 0.15);
  if (sides.length === 2 && Math.abs(sides[0].x / sides[0].s - sides[1].x / sides[1].s) < V.height * 0.1) {
    const [a, b] = sides;
    sides = [{ s: a.s + b.s, x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, at: a.at.concat(b.at),
      y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1), x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1) }];
  }
  const out = sides.map(h => {
    const c = new THREE.Vector3(h.x / h.s, h.y / h.s, h.z / h.s);
    let best = h.at[0], bd = Infinity;
    for (const i of h.at) {
      const d = (R[3 * i] - c.x) ** 2 + (R[3 * i + 1] - c.y) ** 2 + (R[3 * i + 2] - c.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return { c, p: new THREE.Vector3(R[3 * best], R[3 * best + 1], R[3 * best + 2]),
      n: new THREE.Vector3(N.getX(best), N.getY(best), N.getZ(best)).normalize(),
      size: Math.max(h.y1 - h.y0, (h.x1 - h.x0) * 0.8) };
  });
  V.anchors.set(id, out);
  return out;
}

/* Of a muscle's anchors, the one turned most towards the camera. */
function facing(id, cam) {
  let best = null, bd = -Infinity;
  for (const a of anchors(id)) {
    const d = cam.position.clone().sub(a.p).normalize().dot(a.n);
    if (d > bd) { bd = d; best = a; }
  }
  return best && { ...best, d: bd };
}

/* Paint the lit regions: tier colours, or with one muscle in focus, that
   one bright and the rest faint. */
function tint() {
  const A = V.body.mesh.geometry.attributes.aTint, out = A.array, n = A.count;
  out.fill(0);
  const css = n2 => getComputedStyle(V.box || document.documentElement).getPropertyValue(n2).trim();
  const col = [null, new THREE.Color(css('--map-p') || '#4cc3ff'), new THREE.Color(css('--map-s') || '#f5a524'), new THREE.Color(css('--map-t') || '#8a8f98')];
  const focus = V.focusOn ? new Set(V.focusOn) : null;
  const put = (w, c, a) => {
    for (let i = 0; i < n; i++) {
      const x = w[i] * a;
      if (x > out[i * 4 + 3] + 1e-3) { out[i * 4] = c.r; out[i * 4 + 1] = c.g; out[i * 4 + 2] = c.b; out[i * 4 + 3] = x; }
    }
  };
  /* every muscle in its own colour (the Anatomy tab's "show every
     muscle"): the one in focus solid, the rest softer */
  if (V.orb && V.look.atlas) for (const [id, c] of V.look.atlas) {
    const k = V.regs.ids.indexOf(id);
    if (k >= 0 && !REGIONS[k].deep) put(V.regs.w[k], c, focus ? (focus.has(id) ? 1 : 0.4) : 0.8);
  }
  for (const [id, tier] of V.lit) {
    const k = V.regs.ids.indexOf(id);
    if (k < 0 || REGIONS[k].deep) continue;
    const c = focus && focus.has(id) ? col[1] : col[tier];
    put(V.regs.w[k], c, focus ? (focus.has(id) ? 0.95 : TIER_ALPHA[tier] * 0.3) : TIER_ALPHA[tier]);
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

/* Cameras: whole body front and back, or one side closed in on a muscle.
   A muscle in focus with `near` off (the anatomy tab, until you zoom) is
   lit on the whole body instead, so you see where it sits. */
function aim() {
  const { renderer, cams, centre, height } = V, el = renderer.domElement;
  const W = el.clientWidth || 1, H = el.clientHeight || 1;
  if (V.orb) { aimOrbit(W, H); return; }
  cams[0].clearViewOffset();
  const s = V.near && V.focusOn && V.focusOn.map(spot).find(Boolean);
  const both = V.view === 'both' && !s;
  const panes = both ? [[0, W / 2], [W / 2, W / 2]] : [[0, W]];
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

/* ── the orbit camera (the Anatomy tab) ──

   One camera on a sphere round a target: `az` round him (0 is the front),
   `el` up and over, `dist` out. A flight (`goal`) eases the camera there a
   frame at a time; touching him cancels it. `ins` is how much of the
   screen the panels cover on each side: the picture's centre moves into
   the space left over (a view offset, so a tap and the label line still
   line up with what is drawn), and eases with the panels as they move. */
const FOV_TAN = Math.tan(15 * Math.PI / 180);   // half of the cameras' 30°
const wrap180 = d => ((d % 360) + 540) % 360 - 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function freeArea() {
  const el = V.renderer.domElement, W = el.clientWidth || 1, H = el.clientHeight || 1, i = V.insGoal;
  return { W, H, w: Math.max(80, W - i.l - i.r), h: Math.max(80, H - i.t - i.b) };
}
/* Far enough back that the whole body fits the space the panels leave. */
function fitDist() {
  const { W, H, w, h } = freeArea();
  return Math.max(V.height * H / (2 * FOV_TAN * 0.88 * h), V.width * H / (2 * FOV_TAN * 0.9 * w));
}
const clampDist = d => clamp(d, V.height * 0.2, fitDist() * 1.7);

function aimOrbit(W, H) {
  const o = V.orb, cam = V.cams[0], i = V.ins;
  const a = o.az * Math.PI / 180, e = o.el * Math.PI / 180;
  cam.aspect = W / H;
  cam.position.set(o.t.x + o.dist * Math.sin(a) * Math.cos(e), o.t.y + o.dist * Math.sin(e), o.t.z + o.dist * Math.cos(a) * Math.cos(e));
  cam.up.set(0, 1, 0);
  cam.lookAt(o.t);
  cam.near = Math.max(1, o.dist - V.height * 1.5); cam.far = o.dist + V.height * 2;
  cam.setViewOffset(W, H, (i.r - i.l) / 2, (i.b - i.t) / 2, W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  V.panes = [{ cam, x: 0, w: W, yaw: a }];
}

/* One step of any flight, of the panels' space and of auto-spin; true
   while any of them is still moving.

   Auto-spin turns him about 12° a second once nothing has touched him
   for SPIN_WAIT, so a touch stops it and it comes back on its own. While
   it waits, a timer rather than the frame loop wakes it, so a still body
   costs nothing. */
const SPIN_WAIT = 5000;
function ease(now) {
  const dt = V.last ? Math.min(64, now - V.last) : 16, k = 1 - Math.exp(-dt / 110);
  let moving = false;
  for (const s of ['l', 'r', 't', 'b']) {
    const d = V.insGoal[s] - V.ins[s];
    if (Math.abs(d) > 0.5) { V.ins[s] += d * k; moving = true; } else V.ins[s] = V.insGoal[s];
  }
  const o = V.orb, g = o.goal;
  if (g) {
    const da = wrap180(g.az - o.az), de = g.el - o.el, dd = g.dist - o.dist, dt3 = g.t.distanceTo(o.t);
    if (Math.abs(da) < 0.1 && Math.abs(de) < 0.1 && Math.abs(dd) < 0.5 && dt3 < 0.2) {
      o.az = g.az; o.el = g.el; o.dist = g.dist; o.t.copy(g.t); o.goal = null;
    } else {
      o.az += da * k; o.el += de * k; o.dist += dd * k; o.t.lerp(g.t, k);
      moving = true;
    }
  }
  clearTimeout(V.spinT);
  if (V.look.spin && !o.goal && !orbit3.busy()) {
    const wait = SPIN_WAIT - (Date.now() - V.idle);
    if (wait <= 0) { o.az -= dt * 0.012; moving = true; }
    else V.spinT = setTimeout(draw, wait + 20);
  }
  V.last = moving ? now : 0;
  return moving;
}

function draw() {
  if (!V || V.raf) return;
  V.raf = requestAnimationFrame(now => {
    V.raf = 0;
    const { renderer, scene } = V, el = renderer.domElement;
    if (!el.isConnected) return;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const pr = renderer.getPixelRatio();
    if (el.width !== Math.round(W * pr) || el.height !== Math.round(H * pr)) renderer.setSize(W, H, false);
    const moving = V.orb ? ease(now) : false;
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
    V.onFrame?.();
    if (moving) draw();
  });
}

/* In the card: a sideways drag turns him, an up-and-down one scrolls the
   card (drag.js); a tap names the muscle under it. In orbit (the Anatomy
   tab) the gestures are orbit's, below. */
function wire() {
  const el = V.renderer.domElement, lock = axisLock();
  let drag = null;
  el.addEventListener('pointerdown', e => {
    if (V.orb) { orbit3.down(e); return; }
    drag = { x: e.clientX, y: e.clientY, yaw: V.yaw }; lock.down(e); el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (V.orb) { orbit3.move(e); return; }
    if (!drag || lock.move(e) !== 'turn' || (e.pointerType === 'mouse' && !e.buttons)) return;
    V.yaw = drag.yaw + (e.clientX - drag.x) * 0.6; el.classList.add('turned'); draw();
  });
  /* A touch is a tap when it never picked a direction; a mouse is always
     turning (drag.js), so for it a tap is a click that barely moved. */
  el.addEventListener('pointerup', e => {
    if (V.orb) { orbit3.up(e); return; }
    const still = lock.up() || e.pointerType === 'mouse';
    if (drag && still && Math.abs(e.clientX - drag.x) < 6 && Math.abs(e.clientY - drag.y) < 6) tap(e);
    drag = null;
  });
  el.addEventListener('pointercancel', e => {
    if (V.orb) { orbit3.up(e, true); return; }
    lock.up(); drag = null;
  });
  el.addEventListener('wheel', e => { if (V.orb) orbit3.wheel(e); }, { passive: false });
  el.addEventListener('contextmenu', e => { if (V.orb) e.preventDefault(); });
}

/* Orbit gestures. One finger (or the mouse) turns him any way; two
   fingers pinch to zoom and slide him about together; the right mouse
   button, or Shift with the left, slides him; the wheel zooms. A zoom
   closes in on the point between the fingers or under the cursor, which
   stays where it is. A press that barely moved is a tap. Each gesture is
   measured from where it started (base), and a finger lifting or landing
   mid-gesture starts a new base, so nothing jumps. */
const orbit3 = (() => {
  const pts = new Map();
  let g = null, moved = false;
  const axes = () => {
    const m = V.cams[0].matrixWorld;
    return [new THREE.Vector3().setFromMatrixColumn(m, 0), new THREE.Vector3().setFromMatrixColumn(m, 1)];
  };
  /* the point under a screen point (client px): on his skin where there
     is skin, so a zoom closes in on the surface rather than into him, or
     else on the target's plane, square to the view */
  const under = (x, y) => {
    const cam = V.cams[0], r = V.renderer.domElement.getBoundingClientRect(), s = 2 * V.orb.dist * FOV_TAN / (r.height || 1);
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObject(V.pick, false)[0];
    if (hit) return hit.point.clone();
    const c = V.orb.t.clone().project(cam), [right, up] = axes();
    return V.orb.t.clone()
      .addScaledVector(right, (x - r.left - (c.x + 1) / 2 * r.width) * s)
      .addScaledVector(up, -(y - r.top - (1 - c.y) / 2 * r.height) * s);
  };
  /* zoom by `k` (new distance over old) towards point `P` */
  const towards = (P, from, k) => P.clone().add(from.clone().sub(P).multiplyScalar(k));
  /* the target at `from`, slid across the screen by dx, dy */
  const slide = (from, dx, dy) => {
    const o = V.orb, s = 2 * o.dist * FOV_TAN / (V.renderer.domElement.clientHeight || 1), [right, up] = axes();
    o.t.copy(from).addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
    /* never so far that he is lost off screen */
    const off = o.t.clone().sub(V.centre), lim = V.height * 0.6;
    if (off.length() > lim) o.t.copy(V.centre).addScaledVector(off.normalize(), lim);
  };
  const base = () => {
    const o = V.orb, p = [...pts.values()].map(q => ({ ...q }));
    g = { az: o.az, el: o.el, dist: o.dist, t: o.t.clone(), p };
    if (p.length >= 2) {
      g.span = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
      g.mx = (p[0].x + p[1].x) / 2; g.my = (p[0].y + p[1].y) / 2;
      g.P = under(g.mx, g.my);
    }
  };
  return {
    down(e) {
      try { V.renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      if (!pts.size) moved = false;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey });
      V.orb.goal = null; V.orb.fit = false; V.idle = Date.now();
      base();
    },
    move(e) {
      const q = pts.get(e.pointerId);
      if (!q || !g) return;
      q.x = e.clientX; q.y = e.clientY; V.idle = Date.now();
      const p = [...pts.values()], o = V.orb;
      if (p.length === 1) {
        const dx = p[0].x - g.p[0].x, dy = p[0].y - g.p[0].y;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        moved = true;
        if (p[0].pan) slide(g.t, dx, dy);
        else { o.az = g.az - dx * 0.45; o.el = clamp(g.el + dy * 0.35, -85, 85); }
      } else {
        moved = true;
        const span = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
        o.dist = clampDist(g.dist * g.span / span);
        slide(towards(g.P, g.t, o.dist / g.dist), (p[0].x + p[1].x) / 2 - g.mx, (p[0].y + p[1].y) / 2 - g.my);
      }
      draw();
    },
    up(e, cancel) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      V.idle = Date.now();
      if (pts.size) { base(); return; }
      if (!moved && !cancel) tap(e);
      g = null;
      draw();   /* wakes auto-spin's timer */
    },
    busy: () => pts.size > 0,
    wheel(e) {
      e.preventDefault();
      const o = V.orb, d0 = o.dist, P = under(e.clientX, e.clientY);
      o.goal = null; o.fit = false; V.idle = Date.now();
      o.dist = clampDist(d0 * Math.exp(e.deltaY * 0.0015));
      slide(towards(P, o.t, o.dist / d0), 0, 0);
      draw();
    },
  };
})();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function tap(e) {
  if (!V.onTap || !V.panes) return;
  const r = V.renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const p = V.panes.find(p2 => x >= p2.x && x < p2.x + p2.w);
  if (!p) return;
  ndc.set(((x - p.x) / p.w) * 2 - 1, -(y / r.height) * 2 + 1);
  ray.setFromCamera(ndc, p.cam);
  const h = ray.intersectObject(V.pick, false)[0];
  /* the second argument: the tap missed him altogether */
  if (!h) { V.onTap(null, true); return; }
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

/* Build the body ahead of time — the model, its muscle regions, the
   renderer and its shaders — so the first exercise card or Anatomy opens
   without a wait. index.js calls it once the app sits idle. */
export async function warm() {
  if (!V) { building ||= build(); await building; }
  V.renderer.compile(V.scene, V.cams[0]);
}

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
  V.focusOn = null; V.near = true; V.view = 'both'; V.yaw = 0;
  V.orb = null; V.onFrame = null;
  dress({ ...PLAIN });
  el.classList.remove('turned');
  tint();
}

/* Put the look on the body: shorts on or off (the athlete has the skin
   modelled under them, `bareskin`), the hologram skin in the theme's
   accent, and the atlas colours, which tint() lays down. */
function dress(look) {
  V.look = look;
  const mats = V.body.mesh.material, bare = mats.some(m => m.name === 'bareskin');
  for (const m of mats) {
    if (m.name === 'shorts' || m.name === 'underskin') m.visible = !bare || look.shorts;
    if (m.name === 'bareskin') m.visible = bare && !look.shorts;
    m.transparent = look.holo;
  }
  V.H.uHolo.value = look.holo ? 1 : 0;
  const accent = getComputedStyle(V.box || document.documentElement).getPropertyValue('--blue').trim();
  if (accent) V.H.uHoloCol.value.set(accent);
  clearTimeout(V.spinT);
  V.idle = Date.now();
}

/* ── for the Anatomy tab ── */

/* The body full screen in `box`, on the orbit camera, standing square to
   you and sized to the space `inset` leaves. `onFrame` runs after every
   frame drawn, for the label line. Rejects as show() does. */
export async function orbit(box, { onTap, onFrame, inset, look } = {}) {
  await show(box, '', { onTap });
  V.onFrame = onFrame || null;
  if (look) setLook(look);
  if (inset) Object.assign(V.insGoal, inset);
  V.ins = { ...V.insGoal };
  /* `fit`: still the whole-body view, so it refits as the panels move */
  V.orb = { az: 0, el: 4, dist: 1, t: V.centre.clone(), goal: null, fit: true };
  V.orb.dist = fitDist();
  draw();
}
const homeGoal = () => ({ az: Math.round(V.orb.az / 360) * 360, el: 4, dist: fitDist(), t: V.centre.clone() });

/* Muscle `id` bright, the rest of `group` a soft glow of the same
   colour behind it (as primaries, which tint() fades to under a third
   beside the one in focus), never the darker tier colours, which read
   as shadow on skin. */
export function study(id, group = []) {
  if (!V) return;
  V.lit = new Map(id ? group.map(g => [g, 1]) : []);
  V.focusOn = id ? [id] : null;
  tint();
}

/* Fly round to face a muscle — the side of a pair nearer you — and in
   close enough to see it with what is round it. */
export function face(id) {
  if (!V?.orb) return;
  const a = facing(id, V.cams[0]);
  if (!a) return;
  const { H, h } = freeArea();
  const fitH = Math.max(a.size * 3, V.height * 0.42);
  const az = V.orb.az + wrap180(Math.atan2(a.n.x, a.n.z) * 180 / Math.PI - V.orb.az);
  V.orb.goal = { az, el: clamp(Math.asin(clamp(a.n.y, -1, 1)) * 180 / Math.PI, -30, 40), dist: clampDist(fitH * H / (2 * FOV_TAN * h)), t: a.c.clone() };
  V.orb.fit = false; V.idle = Date.now();
  draw();
}

/* Back to the whole body, from the front. */
export function home() {
  if (!V?.orb) return;
  V.orb.goal = homeGoal();
  V.orb.fit = true; V.idle = Date.now();
  draw();
}

/* The Anatomy tab's settings: { shorts, atlas: Map(id → CSS colour) or
   null, spin, holo }; any left out keep their value. */
export function setLook(look) {
  if (!V) return;
  const next = { ...V.look, ...look };
  if ('atlas' in look) next.atlas = look.atlas ? new Map([...look.atlas].map(([id, c]) => [id, new THREE.Color(c)])) : null;
  dress(next);
  tint();
}

/* How much of the screen the panels cover on each side, in CSS px. */
export function setInset(ins) {
  if (!V) return;
  Object.assign(V.insGoal, ins);
  if (V.orb?.fit) V.orb.goal = homeGoal();
  draw();
}

/* Where the label line meets muscle `id` on screen (CSS px within the
   canvas), and whether that point faces you; null off the orbit. */
export function anchorOf(id) {
  if (!V?.orb || !V.panes || !id) return null;
  const cam = V.panes[0].cam, el = V.renderer.domElement, a = facing(id, cam);
  if (!a) return null;
  const s = a.p.clone().project(cam);
  return { x: (s.x + 1) / 2 * el.clientWidth, y: (1 - s.y) / 2 * el.clientHeight, front: a.d > 0.05, on: s.z < 1 };
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
  V.near = true; V.yaw = 0;
  tint();
}

/* The card closed: stop drawing and let go of it. */
export function hide() {
  if (!V) return;
  V.ro?.disconnect(); V.ro = null;
  V.onTap = null; V.onFrame = null;
  clearTimeout(V.spinT);
  V.renderer.domElement.remove();
}
