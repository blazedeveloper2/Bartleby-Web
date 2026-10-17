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

   The Anatomy tab borrows the same body full screen on an orbit camera
   (orbit() and below), where it can also stand in a few poses, show the
   muscles under the surface, breathe, flex the muscle in focus, and have
   its arms and legs bent by hand. The card always gets him back plain,
   standing at rest.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { loadTrainer, Trainer, skinLook, isSkin, studioEnv } from './avatar.js?v=3d-oct16g';
import { skeleton } from './rig.js?v=3d-oct14h';
import { REGIONS, regionsOf, regionsOfMuscle } from './muscles3d.js?v=3d-oct16g';
import { MMAP } from './data.js?v=3d-oct14d';
import { axisLock } from './drag.js?v=3d-oct14d';

const MODEL = 'athlete';
const TIER_ALPHA = [0, 0.9, 0.8, 0.55];   // by tier: primary, supporting, stabilizing
const DEG = Math.PI / 180;

let V = null;             // the one view: { T, regs, renderer, scene, body, … }
let building = null;

/* Motion that is only there to look alive (breathing, a flexing muscle's
   pulse) holds still for anyone whose system asks for less motion. */
const LESS = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const calm = () => !!LESS?.matches;

/* The model's own materials (copies, so they look as the rep's do), with
   a per-vertex tint laid over the skin and a little glow, so a lit muscle
   reads in shadow as well.

   On the shorts the tint is avatar.js's cloth tint: softer, with a clean
   edge where the muscle's own weight there (aTintW) crosses about half,
   and no glow, the muscle showing through the fabric rather than painted
   over it. At full strength the paint under the shorts, blurred from the
   skin beneath (muscles3d.js clothFromSkin), mixed to muddy blotches on
   the dark fabric.

   `H` switches the Anatomy tab's hologram skin in (uHolo 0 → 1): the
   body goes dark in the accent colour (uHoloCol), see-through except at
   its edges, with a glow round its outline and fine scan lines up it
   (uHoloK lines per unit of height), while the lit muscles glow solid
   inside it. A uniform, so turning it on or off recompiles nothing.

   `F` swells the muscle in focus for the Anatomy tab's flex: each point
   pushed out along its normal by its weight (aFlex) times uFlex, after
   skinning, so it swells the same in every pose. */
function tintMaterial(src, uNeck, H, F) {
  const m = src.clone();
  m.name = src.name; m.visible = src.visible; m.metalness = 0;
  const skin = isSkin(src.name), cloth = src.name === 'shorts';
  m.onBeforeCompile = sh => {
    skinLook(sh, skin);
    sh.uniforms.uNeck = uNeck;
    Object.assign(sh.uniforms, H, F);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nattribute float aTintW;\nattribute float aBlend;\nattribute float aFlex;\nuniform float uFlex;\nvarying vec4 vTint;\nvarying float vTintW;\nvarying float vBlend;\nvarying float vHoloY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvTintW = aTintW;\nvBlend = aBlend;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\ntransformed += normalize(objectNormal) * (aFlex * uFlex);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoloY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uNeck;\nuniform float uHolo;\nuniform vec3 uHoloCol;\nuniform float uHoloK;\nvarying vec4 vTint;\nvarying float vTintW;\nvarying float vBlend;\nvarying float vHoloY;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uNeck, vBlend);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uHoloCol * 0.12, uHolo * 0.92);',
        /* the tint's strength is its alpha over the region's weight there;
           a faint one (the glow round a muscle in focus) is left off the
           cloth, where a little orange on near-black reads as a stain */
        cloth ? 'float tS = min(1.0, vTint.a / max(vTintW, 0.05)), tA = smoothstep(0.35, 0.6, vTintW) * smoothstep(0.3, 0.55, tS) * tS * 0.6;' : 'float tA = vTint.a;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb, tA);',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float holoF = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);',
        'float holoL = smoothstep(0.8, 1.0, abs(fract(vHoloY * uHoloK) * 2.0 - 1.0));',
        `totalEmissiveRadiance += vTint.rgb * tA * mix(${cloth ? '0.0' : '0.3'}, 0.85, uHolo);`,
        'totalEmissiveRadiance += uHoloCol * uHolo * (holoF * 0.9 + holoL * 0.3) * (1.0 - tA * 0.7);',
      ].join('\n'))
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a = mix(gl_FragColor.a, max(tA, 0.22 + holoF * 0.75), uHolo);');
  };
  m.customProgramCacheKey = () => (skin ? 'mm-tint-skin' : cloth ? 'mm-tint-cloth' : 'mm-tint');
  return m;
}

/* How the Anatomy tab dresses the body; the exercise card always gets
   the plain one (show() puts it back). */
const PLAIN = { shorts: true, atlas: null, spin: false, holo: false, deep: false, flex: false, idle: false, bend: false };

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
  const F = { uFlex: { value: 0 } };
  body.mesh.material = old.map(o => tintMaterial(o, body.uniforms.uNeck, H, F));
  old.forEach(o => o.dispose());
  body.useEnv(studioEnv(renderer));
  const g = body.mesh.geometry, n = g.attributes.position.count;
  /* the tint as bytes: a quarter of the upload of floats, each time it changes */
  g.setAttribute('aTint', new THREE.BufferAttribute(new Uint8Array(n * 4), 4, true));
  g.setAttribute('aTintW', new THREE.BufferAttribute(new Uint8Array(n), 1, true));
  g.setAttribute('aFlex', new THREE.BufferAttribute(new Uint8Array(n), 1, true));
  body.mesh.frustumCulled = false;
  scene.add(body.group);

  /* Where every point is and which way it faces as he stands now (at
     rest to begin with; skinCPU keeps them up with a pose), and a plain
     copy of the mesh over them for finding what a tap lands on. */
  const P = T.geo.attributes.position.array, NA = T.geo.attributes.normal, rest = new Float32Array(P.length), nrm = new Float32Array(P.length);
  for (let i = 0; i < P.length; i++) rest[i] = P[i] * T.cm;
  for (let i = 0; i < n; i++) { nrm[3 * i] = NA.getX(i); nrm[3 * i + 1] = NA.getY(i); nrm[3 * i + 2] = NA.getZ(i); }
  const pickGeo = new THREE.BufferGeometry();
  pickGeo.setAttribute('position', new THREE.BufferAttribute(rest, 3));
  pickGeo.setIndex(T.geo.index);
  pickGeo.computeBoundingSphere(); pickGeo.computeBoundingBox();
  const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

  /* Each region as the points it has any paint on, so lighting one
     touches only its own part of the body, not every point. */
  const sparse = regs.w.map(w => {
    let c = 0;
    for (let i = 0; i < n; i++) if (w[i] > 0.004) c++;
    const idx = new Uint32Array(c), val = new Float32Array(c);
    for (let i = 0, j = 0; i < n; i++) if (w[i] > 0.004) { idx[j] = i; val[j++] = w[i]; }
    return { idx, val };
  });
  /* each point's main bone, for which limb a drag takes hold of */
  const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, boneOf = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let b = 0, bw = -1;
    for (let j = 0; j < 4; j++) if (SW[4 * i + j] > bw) { bw = SW[4 * i + j]; b = SI[4 * i + j]; }
    boneOf[i] = b;
  }

  const box = pickGeo.boundingBox, centre = box.getCenter(new THREE.Vector3()), height = box.max.y - box.min.y;
  const cams = [new THREE.PerspectiveCamera(30, 1, 1, 2000), new THREE.PerspectiveCamera(30, 1, 1, 2000)];
  const pane = k => ({ cam: cams[k], x: 0, w: 1, yaw: 0 });

  V = { T, regs, renderer, scene, body, pick, rest, nrm, centre, height, width: box.max.x - box.min.x, cams, key, rim, fill,
    yaw: 0, view: 'both', focusOn: null, near: true, lit: new Map(), box: null, raf: 0, tick: 0, ro: null, onTap: null, spots: new Map(),
    orb: null, ins: { l: 0, r: 0, t: 0, b: 0 }, insGoal: { l: 0, r: 0, t: 0, b: 0 }, onFrame: null, onBend: null, anchors: new Map(), last: 0,
    H, F, look: { ...PLAIN }, idle: 0, spinT: 0,
    sparse, kOf: new Map(regs.ids.map((id, k) => [id, k])), boneOf,
    /* the tint's working lists (paint()) */
    wa: new Float32Array(n), ww: new Float32Array(n), wc: new Uint8Array(n), pal: [], tintKey: '', dirty: false, sealed: false,
    cols: [null, new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()],
    flexIds: '', flexOn: false, flexK: 0,
    one: [pane(0)], two: [pane(0), pane(1)], panes: null };
  V.fk = fkOf(T);
  V.pz = poseState(V.fk);
  H.uHoloK.value = 90 / height;
  wire();
  return V;
}

/* Where a region sits on the body: its weighted centre, height, and which
   way it faces (+z is the front at rest). Worked out once per region and
   pose. */
function spot(id) {
  if (V.spots.has(id)) return V.spots.get(id);
  const k = V.kOf.get(id), R = V.rest, N = V.nrm;
  let sw = 0, x = 0, y = 0, z = 0, nz = 0, y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  if (k !== undefined) {
    const { idx, val } = V.sparse[k];
    for (let j = 0; j < idx.length; j++) {
      const a = val[j], i = idx[j];
      if (a < 0.4) continue;
      sw += a; x += R[3 * i] * a; y += R[3 * i + 1] * a; z += R[3 * i + 2] * a; nz += N[3 * i + 2] * a;
      y0 = Math.min(y0, R[3 * i + 1]); y1 = Math.max(y1, R[3 * i + 1]); x0 = Math.min(x0, R[3 * i]); x1 = Math.max(x1, R[3 * i]);
    }
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
  const k = V.kOf.get(id), R = V.rest, N = V.nrm, mid = V.centre.x;
  const half = () => ({ s: 0, x: 0, y: 0, z: 0, y0: Infinity, y1: -Infinity, x0: Infinity, x1: -Infinity, at: [] });
  let sides = [half(), half()];
  if (k !== undefined) {
    const { idx, val } = V.sparse[k];
    for (let j = 0; j < idx.length; j++) {
      const a = val[j], i = idx[j];
      if (a < 0.5) continue;
      const h = sides[R[3 * i] < mid ? 0 : 1], x = R[3 * i], y = R[3 * i + 1];
      h.s += a; h.x += x * a; h.y += y * a; h.z += R[3 * i + 2] * a; h.at.push(i);
      h.y0 = Math.min(h.y0, y); h.y1 = Math.max(h.y1, y); h.x0 = Math.min(h.x0, x); h.x1 = Math.max(h.x1, x);
    }
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
      n: new THREE.Vector3(N[3 * best], N[3 * best + 1], N[3 * best + 2]).normalize(),
      size: Math.max(h.y1 - h.y0, (h.x1 - h.x0) * 0.8), d: 0 };
  });
  V.anchors.set(id, out);
  return out;
}

/* Of a muscle's anchors, the one turned most towards the camera, with
   how far it is turned (d, kept on the anchor until the next call). */
const _to = new THREE.Vector3();
function facing(id, cam) {
  let best = null, bd = -Infinity;
  for (const a of anchors(id)) {
    const d = _to.copy(cam.position).sub(a.p).normalize().dot(a.n);
    if (d > bd) { bd = d; best = a; }
  }
  if (best) best.d = bd;
  return best;
}

/* Paint the lit regions: tier colours, or with one muscle in focus, that
   one bright and the rest faint. tint() asks for it, and the next frame
   does it once however many asked (setLook and study come in pairs);
   when nothing it reads has changed it does nothing at all. */
function tint() {
  if (!V) return;
  V.dirty = true;
  draw();
}

function paint() {
  V.dirty = false;
  const css = n2 => getComputedStyle(V.box || document.documentElement).getPropertyValue(n2).trim();
  const cp = css('--map-p') || '#4cc3ff', cs = css('--map-s') || '#f5a524', ct = css('--map-t') || '#8a8f98', cd = css('--map-deep') || '#a48bff';
  const deep = !!(V.orb && V.look.deep);
  const fk = V.focusOn ? V.focusOn.join() : '';
  flexPaint(V.orb && V.look.flex ? fk : '');
  const key = [cp, cs, ct, cd, deep, !!V.orb, V.orb ? V.look.atlasKey || '' : '', fk, [...V.lit].join(';')].join('|');
  if (key === V.tintKey) return;
  V.tintKey = key;
  const [, c1, c2, c3, c4] = V.cols;
  c1.set(cp); c2.set(cs); c3.set(ct); c4.set(cd);
  const col = V.cols, focus = V.focusOn ? new Set(V.focusOn) : null;
  const { wa, ww, wc, pal, sparse } = V;
  wa.fill(0);
  pal.length = 0;
  const put = (k, c, a) => {
    let slot = pal.indexOf(c);
    if (slot < 0) { slot = pal.length; pal.push(c); }
    const { idx, val } = sparse[k];
    for (let j = 0; j < idx.length; j++) {
      const i = idx[j], x = val[j] * a;
      if (x > wa[i] + 1e-3) { wa[i] = x; ww[i] = val[j]; wc[i] = slot; }
    }
  };
  /* every muscle in its own colour (the Anatomy tab's "show every
     muscle"): the one in focus solid, the rest softer; with the deep
     layer on, the deep ones too, a shade stronger so they show through */
  if (V.orb && V.look.atlas) for (const [id, c] of V.look.atlas) {
    const k = V.kOf.get(id);
    if (k === undefined || (REGIONS[k].deep && !deep)) continue;
    const a = focus ? (focus.has(id) ? 1 : 0.4) : 0.8;
    put(k, c, REGIONS[k].deep ? Math.min(1, a * 1.06) : a);
  }
  /* otherwise the deep layer is a faint wash of its own colour */
  else if (deep) REGIONS.forEach((r, k) => { if (r.deep) put(k, c4, 0.38); });
  for (const [id, tier] of V.lit) {
    const k = V.kOf.get(id);
    if (k === undefined || (REGIONS[k].deep && !deep)) continue;
    const c = focus && focus.has(id) ? col[1] : col[tier];
    put(k, c, focus ? (focus.has(id) ? 0.95 : TIER_ALPHA[tier] * 0.3) : TIER_ALPHA[tier]);
  }
  /* a focused muscle outside the exercise's list still shows, in the
     primary colour */
  if (focus) for (const id of focus) if (!V.lit.has(id)) {
    const k = V.kOf.get(id);
    if (k !== undefined) put(k, col[1], 0.95);
  }
  const g = V.body.mesh.geometry, A = g.attributes.aTint, AW = g.attributes.aTintW, out = A.array, ow = AW.array;
  for (let i = 0, n = wa.length; i < n; i++) {
    const a = wa[i];
    if (a > 0) {
      const c = pal[wc[i]];
      out[4 * i] = c.r * 255 + 0.5; out[4 * i + 1] = c.g * 255 + 0.5; out[4 * i + 2] = c.b * 255 + 0.5; out[4 * i + 3] = a * 255 + 0.5;
      ow[i] = ww[i] * 255 + 0.5;
    } else { out[4 * i + 3] = 0; ow[i] = 0; }
  }
  A.needsUpdate = true; AW.needsUpdate = true;
}

/* The muscle that flexes: the regions in focus, each point by its
   weight, eased to a soft dome at the edges. A new one starts from
   nothing and swells in (animate()); with none, the last one eases
   out where it was. */
function flexPaint(ids) {
  V.flexOn = !!ids;
  if (!ids || ids === V.flexIds) return;
  const A = V.body.mesh.geometry.attributes.aFlex, f = A.array;
  f.fill(0);
  for (const id of ids.split(',')) {
    const k = V.kOf.get(id);
    if (k === undefined) continue;
    const { idx, val } = V.sparse[k];
    for (let j = 0; j < idx.length; j++) { const v = val[j], s = v * v * (3 - 2 * v) * 255; if (s > f[idx[j]]) f[idx[j]] = s; }
  }
  A.needsUpdate = true;
  V.flexIds = ids; V.flexK = 0;
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
  V.panes = both ? V.two : V.one;
  V.panes.forEach((pn, k) => {
    const cam = cams[k], x = both ? k * W / 2 : 0, w = both ? W / 2 : W, aspect = w / H;
    const side = both ? k * 180 : (V.view === 'back' || (s && !s.front)) ? 180 : 0;
    const yaw = (side + V.yaw) * DEG;
    const target = s ? s.c : centre;
    const fitH = s ? Math.max(s.size * 2.2, height * 0.32) : height * 0.98;
    const tanV = Math.tan((cam.fov / 2) * DEG);
    const dist = Math.max(fitH / 2 / tanV, (fitH * 0.45) / (tanV * aspect));
    cam.aspect = aspect;
    cam.position.set(target.x + Math.sin(yaw) * dist, target.y + dist * 0.06, target.z + Math.cos(yaw) * dist);
    cam.lookAt(target);
    cam.near = Math.max(1, dist - height); cam.far = dist + height * 2;
    cam.updateProjectionMatrix();
    pn.cam = cam; pn.x = x; pn.w = w; pn.yaw = yaw;
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
const SIDES = ['l', 'r', 't', 'b'];

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
  const a = o.az * DEG, e = o.el * DEG;
  cam.aspect = W / H;
  cam.position.set(o.t.x + o.dist * Math.sin(a) * Math.cos(e), o.t.y + o.dist * Math.sin(e), o.t.z + o.dist * Math.cos(a) * Math.cos(e));
  cam.up.set(0, 1, 0);
  cam.lookAt(o.t);
  cam.near = Math.max(1, o.dist - V.height * 1.5); cam.far = o.dist + V.height * 2;
  cam.setViewOffset(W, H, (i.r - i.l) / 2, (i.b - i.t) / 2, W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const pn = V.one[0];
  pn.cam = cam; pn.x = 0; pn.w = W; pn.yaw = a;
  V.panes = V.one;
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
  for (const s of SIDES) {
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

/* A frame is drawn only when something asked for one (draw()). While
   something moves (a flight, the panels, spin, a pose easing in) the next
   is asked for at once; while he only breathes or a muscle flexes, about
   30 a second; when all is still, none. On the orbit, the picture is a
   little coarser while it moves (at most 1.5 pixels to the CSS pixel, for
   phones with dense screens) and sharp again the moment it stops. */
function draw() {
  if (!V || V.raf) return;
  V.raf = requestAnimationFrame(frame);
}
function frame(now) {
  V.raf = 0;
  clearTimeout(V.tick);
  const { renderer, scene } = V, el = renderer.domElement;
  if (!el.isConnected) return;
  const W = el.clientWidth, H = el.clientHeight;
  if (!W || !H) return;
  if (V.dirty) paint();
  let moving = V.orb ? ease(now) : false;
  if (posing(now)) moving = true;
  const live = animate(now);
  if (V.pz.dirty) pose();
  const pr = Math.min(window.devicePixelRatio || 1, V.orb && (moving || live || orbit3.busy()) ? 1.5 : 2);
  if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);
  if (el.width !== Math.round(W * pr) || el.height !== Math.round(H * pr)) renderer.setSize(W, H, false);
  aim();
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
  for (const p of V.panes) {
    /* lights follow the camera round, so whichever side is shown is lit:
       in the card round him only, on the orbit over and under him too
       (set in the camera's own right, up and back) */
    const c = p.cam.position, t = V.centre, R = V.height * 3;
    if (V.orb) {
      const e = p.cam.matrixWorld.elements;
      V.key.position.set(t.x + R * (0.6 * e[8] + 0.5 * e[0] + 1.1 * e[4]), t.y + R * (0.6 * e[9] + 0.5 * e[1] + 1.1 * e[5]), t.z + R * (0.6 * e[10] + 0.5 * e[2] + 1.1 * e[6]));
      V.rim.position.set(t.x + R * (-0.9 * e[8] - 0.4 * e[0] + 0.6 * e[4]), t.y + R * (-0.9 * e[9] - 0.4 * e[1] + 0.6 * e[5]), t.z + R * (-0.9 * e[10] - 0.4 * e[2] + 0.6 * e[6]));
    } else {
      const s = Math.sin(p.yaw), co = Math.cos(p.yaw);
      V.key.position.set(t.x + R * (0.6 * s + 0.5 * co), t.y + R * 1.1, t.z + R * (0.6 * co - 0.5 * s));
      V.rim.position.set(t.x - R * s * 0.9 - R * 0.4 * co, t.y + R * 0.6, t.z - R * co * 0.9 + R * 0.4 * s);
    }
    V.fill.position.set(c.x, c.y, c.z);
    renderer.setScissor(p.x, 0, p.w, H); renderer.setViewport(p.x, 0, p.w, H);
    renderer.render(scene, p.cam);
  }
  V.onFrame?.();
  if (moving) draw();
  /* the timer, then the next vsync: about every 33 ms on a 60 Hz screen */
  else if (live) V.tick = setTimeout(draw, Math.max(0, 22 - (performance.now() - now)));
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
   mid-gesture starts a new base, so nothing jumps. With `bend` on, one
   finger that starts on an arm or a leg bends it instead (bendStart). */
const orbit3 = (() => {
  const pts = new Map(), right = new THREE.Vector3(), up = new THREE.Vector3(), off = new THREE.Vector3();
  let g = null, moved = false, grab = null;
  const axes = () => {
    const m = V.cams[0].matrixWorld;
    right.setFromMatrixColumn(m, 0); up.setFromMatrixColumn(m, 1);
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
    const c = V.orb.t.clone().project(cam);
    axes();
    return V.orb.t.clone()
      .addScaledVector(right, (x - r.left - (c.x + 1) / 2 * r.width) * s)
      .addScaledVector(up, -(y - r.top - (1 - c.y) / 2 * r.height) * s);
  };
  /* zoom by `k` (new distance over old) towards point `P` */
  const towards = (P, from, k) => P.clone().add(from.clone().sub(P).multiplyScalar(k));
  /* the target at `from`, slid across the screen by dx, dy */
  const slide = (from, dx, dy) => {
    const o = V.orb, s = 2 * o.dist * FOV_TAN / (V.renderer.domElement.clientHeight || 1);
    axes();
    o.t.copy(from).addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
    /* never so far that he is lost off screen */
    off.copy(o.t).sub(V.centre);
    const lim = V.height * 0.6;
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
  const letGo = () => { if (grab) { bendEnd(grab); grab = null; } };
  return {
    down(e) {
      try { V.renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      if (!pts.size) moved = false;
      const pan = e.button === 2 || e.shiftKey;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, pan });
      V.orb.goal = null; V.orb.fit = false; V.idle = Date.now();
      /* a second finger ends a bend and pinches as usual */
      if (grab) letGo();
      else if (pts.size === 1 && V.look.bend && !pan) grab = bendStart(e);
      base();
    },
    move(e) {
      const q = pts.get(e.pointerId);
      if (!q || !g) return;
      const sx = e.clientX - q.x, sy = e.clientY - q.y;   // since the last move
      q.x = e.clientX; q.y = e.clientY; V.idle = Date.now();
      const o = V.orb;
      let p0 = null, p1 = null;
      for (const p of pts.values()) { if (!p0) p0 = p; else if (!p1) p1 = p; }
      if (!p1) {
        const dx = p0.x - g.p[0].x, dy = p0.y - g.p[0].y;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        if (grab) { bendMove(grab, moved ? sx : dx, moved ? sy : dy); moved = true; draw(); return; }
        moved = true;
        if (p0.pan) slide(g.t, dx, dy);
        else { o.az = g.az - dx * 0.45; o.el = clamp(g.el + dy * 0.35, -85, 85); }
      } else {
        moved = true;
        const span = Math.hypot(p0.x - p1.x, p0.y - p1.y) || 1;
        o.dist = clampDist(g.dist * g.span / span);
        slide(towards(g.P, g.t, o.dist / g.dist), (p0.x + p1.x) / 2 - g.mx, (p0.y + p1.y) / 2 - g.my);
      }
      draw();
    },
    up(e, cancel) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      V.idle = Date.now();
      letGo();
      if (pts.size) { base(); return; }
      if (!moved && !cancel) tap(e);
      g = null;
      draw();   /* wakes auto-spin's timer, and sharpens the picture */
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

/* ── poses ──

   The body is posed bone by bone here rather than by the rig alone, so
   it keeps its own proportions and its trunk stands exactly as at rest.
   rig.js and the Trainer (avatar.js) only say, for the poses below
   (written as rig.js poses), which way the arm's segments point, how
   the palm turns and how the fingers close. Each bone then turns from
   its rest pose (`rel`) on top of what it hangs from, and its joint lands
   where its parent carries it:
     trunk    Pelvis to Head: still but for breathing and sway (idle)
     clav     the collarbones, lifted by a pose's `shrug` (rig units at
              the shoulder) and a little with each breath
     arm      upper arm to fingertips: the pose's turn, then a bend by
              hand at the shoulder and at the elbow, all from the chest
     leg      thigh to toes: a bend at the hip and the knee, from the pelvis
     helper   the shoulder's helper joint, half the arm's swing from where
              it hangs as avatar.js does it (a little more with the arm
              overhead), so the skin over the shoulder keeps its volume
   Each bone's matrix takes the model's rest points to where they stand
   (× cm, as everything in this view). */
export const POSES = [{ id: 'rest', name: 'Standing' }, { id: 'up', name: 'Arms up' }, { id: 'out', name: 'Arms out' }, { id: 'flex', name: 'Flex' }];
const STAND = { hip: [100, 111.5], torso: 90, th: 270, sh: 270 };
/* The arms of each pose, in rig.js's terms (world directions, x the way
   he faces, z out to his right; the left arm is mirrored), how the palms
   turn (avatar.js's keywords), fists or not, and how far the shoulders
   lift. */
const POSE = {
  rest: null,
  /* overhead in a Y, palms in: lats, teres and serratus stretched long.
     Not straight up: past about 150° the model's skin weights fold the
     shoulder into a shelf. */
  up: { pose: { uav: [0.12, 1, 0.62], fav: [0.2, 1, 0.66] }, palm: 'in', shrug: 4 },
  /* straight out at the sides, palms down, elbows soft */
  out: { pose: { uav: [0.04, 0.02, 1], fav: [0.28, 0.03, 1] }, palm: 'down', shrug: 0.5 },
  /* a front double biceps: upper arms out level, fists up by the head */
  flex: { pose: { uav: [0.22, 0.12, 1], fav: [0.06, 1, -0.22] }, palm: 'sup', grip: true, shrug: 1.5 },
};
/* a fist's thumb, folded on across the fingers beyond the Trainer's grip
   (degrees at each of its joints, against the way the Trainer curls it,
   which for the thumb lifts it off the fist) */
const THUMB = [-18, -28, -24];

const PARENT = { Spine: 'Pelvis', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck', Clavicle: 'Spine2', UpperArm: '_Clavicle', ShoulderHelper: '_Clavicle', Forearm: '_UpperArm', Hand: '_Forearm', Thigh: 'Pelvis', Calf: '_Thigh', Foot: '_Calf', Toe0: '_Foot' };
function fkOf(T) {
  const { bones, byName } = T, nb = bones.length, parent = new Int16Array(nb).fill(-1), side = [], kind = [];
  bones.forEach((b, i) => {
    const m = /^([RL])_(.+)$/.exec(b.name), s = m ? m[1] : null, base = m ? m[2] : b.name;
    const f = /^Finger(\d)(\d?)$/.exec(base);
    const p = f ? (f[2] ? `_Finger${f[1]}${f[2] === '2' ? '1' : ''}` : '_Hand') : PARENT[base];
    parent[i] = p ? (byName[p[0] === '_' ? s + p : p] ?? -1) : -1;
    side[i] = s;
    kind[i] = !s ? 'trunk' : base === 'Clavicle' ? 'clav' : base === 'ShoulderHelper' ? 'helper' : /^(Thigh|Calf|Foot|Toe)/.test(base) ? 'leg' : 'arm';
  });
  const depth = i => (parent[i] < 0 ? 0 : 1 + depth(parent[i]));
  const all = [...bones.keys()], order = all.slice().sort((a, b) => depth(a) - depth(b));
  const P = bones.map(b => b.P.clone());
  const dir = (a, b) => new THREE.Vector3().subVectors(P[byName[b]], P[byName[a]]).normalize();
  const S = {};
  for (const s of ['R', 'L']) {
    const ua = dir(`${s}_UpperArm`, `${s}_Forearm`), fa = dir(`${s}_Forearm`, `${s}_Hand`);
    S[s] = {
      sg: s === 'L' ? 1 : -1,
      ua: byName[`${s}_UpperArm`], fa: byName[`${s}_Forearm`], hand: byName[`${s}_Hand`], clav: byName[`${s}_Clavicle`], helper: byName[`${s}_ShoulderHelper`] ?? -1,
      th: byName[`${s}_Thigh`], calf: byName[`${s}_Calf`], foot: byName[`${s}_Foot`],
      dUa: ua, dFa: fa, dTh: dir(`${s}_Thigh`, `${s}_Calf`), dSh: dir(`${s}_Calf`, `${s}_Foot`),
      elbow: new THREE.Vector3().crossVectors(ua, fa).normalize(),   // the elbow's hinge, as it bends at rest: + bends it further
      clavLen: P[byName[`${s}_UpperArm`]].distanceTo(P[byName[`${s}_Clavicle`]]),
      arm: all.filter(i => kind[i] === 'arm' && side[i] === s), leg: all.filter(i => kind[i] === 'leg' && side[i] === s),
    };
  }
  return { nb, order, parent, side, kind, P, S, pel: byName.Pelvis, sp1: byName.Spine1, sp2: byName.Spine2, neck: byName.Neck,
    pivot: P[S.R.foot].clone().add(P[S.L.foot]).multiplyScalar(0.5),   // between the ankles: what he sways over
    posed: all.filter(i => kind[i] === 'arm' || kind[i] === 'leg'),
    qW: bones.map(() => new THREE.Quaternion()), J: bones.map(() => new THREE.Vector3()) };
}
function poseState(F) {
  const qs = () => F.P.map(() => new THREE.Quaternion());
  const limb = () => ({ sh: new THREE.Quaternion(), shDir: null, el: 0, hip: new THREE.Quaternion(), hipDir: null, kn: 0 });
  return { id: 'rest', base: qs(), from: qs(), to: qs(), rel: qs(), local: qs(), anim: null, dirty: false,
    shrug: { R: 0, L: 0 }, s0: { R: 0, L: 0 }, s1: { R: 0, L: 0 }, bend: { R: limb(), L: limb() },
    root: new THREE.Quaternion(), lift: 0, idleK: 0, last: 0 };
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _w = new THREE.Vector3(), _ax = new THREE.Vector3(), _t = new THREE.Vector3();
const _d0 = new THREE.Vector3(), _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _b = new THREE.Vector3();
const X_AX = new THREE.Vector3(1, 0, 0), Z_AX = new THREE.Vector3(0, 0, 1);

/* Each arm and leg bone's turn from rest, relative to the chest (arms)
   or the pelvis (legs): the pose's, with the hand's bends on top.

   A shoulder or hip bent by hand points its segment along `shDir` /
   `hipDir`. The turn that takes it there goes by way of hanging straight
   down: back down from the pose the shortest way, then the shortest way
   up to where it points. However the drag wandered, the same direction
   always gives the same arm, turned as an arm is that was raised straight
   there: raised forward, its elbow bends up; out to the side, forward. */
const DOWN = new THREE.Vector3(0, -1, 0);
function swingVia(out, base, d, to) {
  if (!to) return out.identity();
  _v2.copy(d).applyQuaternion(base);
  return out.setFromUnitVectors(DOWN, to).multiply(_q2.setFromUnitVectors(_v2, DOWN));
}
function compose() {
  const F = V.fk, Z = V.pz;
  for (const s of ['R', 'L']) {
    const S = F.S[s], B = Z.bend[s];
    swingVia(B.sh, Z.base[S.ua], S.dUa, B.shDir);
    swingVia(B.hip, Z.base[S.th], S.dTh, B.hipDir);
    _ax.copy(S.elbow).applyQuaternion(Z.base[S.ua]);
    _q.setFromAxisAngle(_ax, B.el);
    for (const b of S.arm) { const r = Z.rel[b].copy(B.sh); if (b !== S.ua) r.multiply(_q); r.multiply(Z.base[b]); }
    _ax.copy(X_AX).applyQuaternion(Z.base[S.th]);
    _q.setFromAxisAngle(_ax, B.kn);
    for (const b of S.leg) { const r = Z.rel[b].copy(B.hip); if (b !== S.th) r.multiply(_q); r.multiply(Z.base[b]); }
  }
}

/* Every bone placed and its matrix set, with the idle motion (breathing,
   sway) or without it (for skinCPU, which keeps the still pose). */
function place(idle = true) {
  const F = V.fk, Z = V.pz, { qW, J, P } = F, cm = V.T.cm, live = idle && Z.idleK > 0;
  for (const b of F.order) {
    const p = F.parent[b], kd = F.kind[b];
    if (p < 0) {
      /* the pelvis, and with it everything: swaying over the ankles */
      if (live) qW[b].copy(Z.root); else qW[b].identity();
      J[b].copy(P[b]).sub(F.pivot).applyQuaternion(qW[b]).add(F.pivot);
      continue;
    }
    J[b].copy(P[b]).sub(P[p]).applyQuaternion(qW[p]).add(J[p]);
    if (kd === 'trunk') { qW[b].copy(qW[p]); if (live) qW[b].multiply(Z.local[b]); }
    else if (kd === 'clav') {
      const S = F.S[F.side[b]];
      const a = Math.asin(clamp(Z.shrug[F.side[b]] / cm / S.clavLen, -0.9, 0.9)) + (live ? Z.lift : 0);
      qW[b].copy(qW[p]).multiply(_q.setFromAxisAngle(Z_AX, a * S.sg));
    }
    else if (kd === 'arm') qW[b].copy(qW[F.sp2]).multiply(Z.rel[b]);
    else if (kd === 'leg') qW[b].copy(qW[F.pel]).multiply(Z.rel[b]);
  }
  for (const s of ['R', 'L']) {
    const S = F.S[s];
    if (S.helper < 0) continue;
    _v.copy(S.dUa).applyQuaternion(qW[F.sp2]);
    _v2.copy(S.dUa).applyQuaternion(qW[S.ua]);
    /* half the swing, and a little more of a big one (the arm overhead),
       so the deltoid goes up with the arm rather than staying out at the
       side like a pad */
    const sw = _v.angleTo(_v2), f = clamp((sw - 80 * DEG) / (70 * DEG), 0, 1);
    qW[S.helper].identity().slerp(_q.setFromUnitVectors(_v, _v2), 0.5 + 0.15 * f * f * (3 - 2 * f)).multiply(qW[F.sp2]);
  }
  const e = _m.elements;
  for (let b = 0; b < F.nb; b++) {
    _m.makeRotationFromQuaternion(qW[b]);
    _v.copy(P[b]).applyQuaternion(qW[b]);
    e[0] *= cm; e[1] *= cm; e[2] *= cm; e[4] *= cm; e[5] *= cm; e[6] *= cm; e[8] *= cm; e[9] *= cm; e[10] *= cm;
    e[12] = (J[b].x - _v.x) * cm; e[13] = (J[b].y - _v.y) * cm; e[14] = (J[b].z - _v.z) * cm;
    const bone = V.body.bones[b];
    bone.matrix.copy(_m); bone.matrixWorld.copy(_m);
  }
  Z.dirty = false;
}
const pose = (idle = true) => { compose(); place(idle); };

/* A pose's arm turns, from the Trainer posed on the rig: each bone's
   rotation in its matrix, less the stretch the Trainer adds along a bone
   to meet the rig's joints, turned from the rig's axes (x the way he
   faces, z his right) into the model's (z the way he faces, −x his
   right). */
const RIG_AXES = new THREE.Matrix4().set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
function rigTurns(def, out) {
  const F = V.fk, body = V.body, cm = V.T.cm;
  for (const b of F.posed) out[b].identity();
  if (!def) return;
  body.m = { hi: [], hi2: [], hold: def.grip ? { n: 'db', f: 'db' } : {}, palm: def.palm };
  const p = { ...STAND, ...def.pose };
  body.update(skeleton(p), 0, p);
  const L = new Float64Array(9);
  for (const b of F.posed) {
    if (F.kind[b] !== 'arm') continue;
    const s = body.bones[b].matrix.elements, d = body.bind[V.T.bones[b].name]?.[0];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) L[3 * r + c] = s[4 * c + r] / cm;
    if (d) {
      const Ld = [0, 1, 2].map(r => L[3 * r] * d[0] + L[3 * r + 1] * d[1] + L[3 * r + 2] * d[2]);
      const k = 1 / (Math.hypot(...Ld) || 1) - 1;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) L[3 * r + c] += k * Ld[r] * d[c];
    }
    _m.set(L[0], L[1], L[2], 0, L[3], L[4], L[5], 0, L[6], L[7], L[8], 0, 0, 0, 0, 1).premultiply(RIG_AXES);
    out[b].setFromRotationMatrix(_m);
  }
  /* a fist closes the thumb too, about the axis the Trainer curls it on */
  if (def.grip) for (const s of ['R', 'L']) {
    const f = body[`fingers${s}`][0];
    _ax.fromArray(f.axis);
    let a = 0;
    f.names.forEach((nm, j) => { a += (THUMB[j] || 0) * DEG; out[V.T.byName[nm]].multiply(_q.setFromAxisAngle(_ax, a)); });
  }
}

/* Everything that reads where the body's points are, brought up to the
   pose just set (without the idle motion): the points and their normals,
   skinned here once per pose rather than every frame; the tap mesh's
   bounds; the body's centre and size; and the muscles' cached spots. */
function skinCPU() {
  const g = V.body.mesh.geometry, P = g.attributes.position.array, NA = g.attributes.normal, N = NA.array;
  const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, n = g.attributes.position.count;
  const nk = N instanceof Int8Array ? 1 / 127 : 1;
  const E = V.body.bones.map(b => b.matrixWorld.elements), R = V.rest, O = V.nrm;
  for (let i = 0; i < n; i++) {
    const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2], nx = N[3 * i] * nk, ny = N[3 * i + 1] * nk, nz = N[3 * i + 2] * nk;
    let ox = 0, oy = 0, oz = 0, mx = 0, my = 0, mz = 0;
    for (let j = 0; j < 4; j++) {
      const w = SW[4 * i + j];
      if (!w) continue;
      const e = E[SI[4 * i + j]], s = w / 255;
      ox += s * (e[0] * x + e[4] * y + e[8] * z + e[12]);
      oy += s * (e[1] * x + e[5] * y + e[9] * z + e[13]);
      oz += s * (e[2] * x + e[6] * y + e[10] * z + e[14]);
      mx += s * (e[0] * nx + e[4] * ny + e[8] * nz);
      my += s * (e[1] * nx + e[5] * ny + e[9] * nz);
      mz += s * (e[2] * nx + e[6] * ny + e[10] * nz);
    }
    R[3 * i] = ox; R[3 * i + 1] = oy; R[3 * i + 2] = oz;
    const l = Math.hypot(mx, my, mz) || 1;
    O[3 * i] = mx / l; O[3 * i + 1] = my / l; O[3 * i + 2] = mz / l;
  }
  const pg = V.pick.geometry;
  pg.attributes.position.needsUpdate = true;
  pg.computeBoundingBox(); pg.computeBoundingSphere();
  const box = pg.boundingBox;
  box.getCenter(V.centre);
  V.height = box.max.y - box.min.y; V.width = box.max.x - box.min.x;
  V.spots.clear(); V.anchors.clear();
}

/* Points that share a place but not their bones' weights (the seams
   where the head and hands are grafted on, and a few others) split apart
   once those bones move differently: a crack round the neck as the
   shoulders lift. The first time he leaves the rest pose, each such
   group takes the average of its weights, in this view's own copy of the
   mesh. At rest every bone's matrix is the same, so nothing moves there. */
function seal() {
  if (V.sealed) return;
  V.sealed = true;
  const g = V.body.mesh.geometry, P = g.attributes.position.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
  const n = g.attributes.position.count, q = 1 / (V.T.meta?.posScale || 0.02), first = new Map(), lead = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = (Math.round(P[3 * i] * q) + 32768) * 4294967296 + (Math.round(P[3 * i + 1] * q) + 32768) * 65536 + (Math.round(P[3 * i + 2] * q) + 32768);
    const j = first.get(k);
    if (j === undefined) { first.set(k, i); lead[i] = i; } else lead[i] = j;
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) if (lead[i] !== i) (groups.get(lead[i]) || groups.set(lead[i], [lead[i]]).get(lead[i])).push(i);
  const acc = new Map();
  for (const vs of groups.values()) {
    const same = vs.every(i => { for (let j = 0; j < 4; j++) if (SI[4 * i + j] !== SI[4 * vs[0] + j] || SW[4 * i + j] !== SW[4 * vs[0] + j]) return false; return true; });
    if (same) continue;
    acc.clear();
    for (const i of vs) for (let j = 0; j < 4; j++) if (SW[4 * i + j]) acc.set(SI[4 * i + j], (acc.get(SI[4 * i + j]) || 0) + SW[4 * i + j]);
    const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((s, a) => s + a[1], 0);
    const w = top.map(a => Math.round(a[1] / tot * 255));
    w[0] += 255 - w.reduce((s, a) => s + a, 0);
    for (const i of vs) for (let j = 0; j < 4; j++) { SI[4 * i + j] = top[j] ? top[j][0] : 0; SW[4 * i + j] = top[j] ? w[j] : 0; }
  }
  g.attributes.skinIndex.needsUpdate = true; g.attributes.skinWeight.needsUpdate = true;
}

const bent = () => ['R', 'L'].some(s => { const B = V.pz.bend[s]; return B.el || B.kn || B.shDir || B.hipDir; });

/* Stand him in pose `id` (POSES), easing there over about 0.4 s from
   wherever he is, any bends included (which it clears). Taps, labels and
   face() know the new pose at once; in the whole-body view the camera
   refits to it as he moves. `snap` skips the ease. */
export function setPose(id, { snap = false } = {}) {
  if (!V) return;
  const Z = V.pz, F = V.fk;
  if (!(id in POSE)) id = 'rest';
  if (id === Z.id && !bent()) return;
  if (id !== 'rest') seal();
  compose();
  for (const b of F.posed) Z.from[b].copy(Z.rel[b]);
  Z.s0.R = Z.shrug.R; Z.s0.L = Z.shrug.L;
  for (const s of ['R', 'L']) { const B = Z.bend[s]; B.shDir = B.hipDir = null; B.el = B.kn = 0; }
  rigTurns(POSE[id], Z.to);
  Z.s1.R = Z.s1.L = POSE[id]?.shrug || 0;
  Z.id = id;
  /* where he will stand, skinned now */
  for (const b of F.posed) Z.base[b].copy(Z.to[b]);
  Z.shrug.R = Z.s1.R; Z.shrug.L = Z.s1.L;
  pose(false);
  skinCPU();
  if (snap) Z.anim = null;
  else {
    for (const b of F.posed) Z.base[b].copy(Z.from[b]);
    Z.shrug.R = Z.s0.R; Z.shrug.L = Z.s0.L;
    Z.anim = { t0: performance.now(), dur: 420 };
  }
  pose();
  if (V.orb?.fit) V.orb.goal = homeGoal();
  draw();
}
/* Undo the bends made by hand, back to the pose. */
export function resetBend() {
  if (V) setPose(V.pz.id);
}

/* One step of a pose easing in; true while it still is. */
function posing(now) {
  const Z = V.pz, a = Z.anim;
  if (!a) return false;
  const t = clamp((now - a.t0) / a.dur, 0, 1), k = t * t * (3 - 2 * t);
  for (const b of V.fk.posed) Z.base[b].slerpQuaternions(Z.from[b], Z.to[b], k);
  Z.shrug.R = Z.s0.R + (Z.s1.R - Z.s0.R) * k; Z.shrug.L = Z.s0.L + (Z.s1.L - Z.s0.L) * k;
  if (t >= 1) Z.anim = null;
  Z.dirty = true;
  return !!Z.anim;
}

/* ── idle life and flex (the Anatomy tab) ──

   Idle: he breathes, about every 5 s (the chest lifts a degree, the
   collarbones a little more, the head staying level), and shifts his
   weight now and then, swaying over his ankles by at most about 2 cm at
   the head. It eases in and out over half a second when turned on or
   off, rides on whatever pose he is in, and is left out of skinCPU: what
   a tap finds lags it by a centimetre or so, never more.

   Flex: the muscle in focus swells by up to FLEX_CM along its surface and
   relaxes once a second, as if contracting; held at a gentle swell for
   anyone who asks for less motion. */
const FLEX_CM = 0.6;
function animate(now) {
  const Z = V.pz, F = V.fk, L = V.look, dt = Z.last ? Math.min(100, now - Z.last) : 16, t = now / 1000;
  let live = false;
  const want = V.orb && L.idle && !calm() ? 1 : 0;
  if (want || Z.idleK) {
    Z.idleK = want ? Math.min(1, Z.idleK + dt / 600) : Math.max(0, Z.idleK - dt / 500);
    const k = Z.idleK * Z.idleK * (3 - 2 * Z.idleK), br = (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 5)) * k;
    Z.local[F.sp1].setFromAxisAngle(X_AX, -0.6 * DEG * br);
    Z.local[F.sp2].setFromAxisAngle(X_AX, -0.9 * DEG * br);
    Z.local[F.neck].setFromAxisAngle(X_AX, 1.5 * DEG * br);
    Z.lift = 1.4 * DEG * br;
    Z.root.setFromAxisAngle(Z_AX, 0.7 * DEG * k * Math.sin(t * 2 * Math.PI / 10.4))
      .multiply(_q2.setFromAxisAngle(X_AX, 0.35 * DEG * k * Math.sin(t * 2 * Math.PI / 7.7 + 1.1)));
    Z.dirty = true;
    live = Z.idleK > 0;
  }
  const fwant = V.orb && V.flexOn ? 1 : 0;
  if (fwant || V.flexK) {
    V.flexK = fwant ? Math.min(1, V.flexK + dt / 300) : Math.max(0, V.flexK - dt / 300);
    const k = V.flexK * V.flexK * (3 - 2 * V.flexK), pulse = calm() ? 0.6 : 0.5 - 0.5 * Math.cos(t * 2 * Math.PI);
    V.F.uFlex.value = FLEX_CM * V.T.cm * k * pulse;
    live = live || !calm() || V.flexK !== fwant;
  }
  Z.last = live ? now : 0;
  return live;
}

/* ── bending a limb by hand (the Anatomy tab, look.bend) ──

   A drag that starts on an arm or a leg moves that limb's joint: on the
   upper arm the shoulder, the forearm or hand the elbow, the thigh the
   hip, the shin or foot the knee. The end of the segment held (the elbow
   for the shoulder, the wrist for the elbow…) follows the finger across
   the screen, from any side: a ball joint (shoulder, hip) swings the
   shortest way after it, a hinge (elbow, knee) turns about its own axis
   by as much as the finger moved along the way it can go. Each stays in
   a joint's range: the elbow 0–145°, the knee 0–140°; a shoulder up to
   180° forward or out to the side but 50° back; a hip 120° forward, 45°
   out, 20° back. Ranges are by `e`, how far the segment is raised from
   hanging, for `p`, the plane it is raised in (0 out to the side, 90
   forward, −90 back, ±180 across the body). onBend hears what the joint
   is doing as it changes ('shoulder abduction', side 'L'), and null when
   the drag ends; then the body is skinned once so taps find it. */
const SH_MAX = [[-180, 40], [-90, 50], [-30, 180], [135, 180], [180, 40]];
const HIP_MAX = [[-180, 15], [-90, 20], [0, 45], [90, 120], [180, 15]];
function limitBall(d, sg, tab) {
  const e = Math.acos(clamp(-d.y, -1, 1)) / DEG, p = Math.atan2(d.z, sg * d.x) / DEG;
  let i = 1;
  while (i < tab.length - 1 && p > tab[i][0]) i++;
  /* (never quite straight up, where the way up from hanging is anyone's) */
  const a = tab[i - 1], b = tab[i], mx = Math.min(172, a[1] + (b[1] - a[1]) * (p - a[0]) / (b[0] - a[0]));
  if (e <= mx) return false;
  d.set(sg * Math.sin(mx * DEG) * Math.cos(p * DEG), -Math.cos(mx * DEG), Math.sin(mx * DEG) * Math.sin(p * DEG));
  return true;
}
const JOINT = { UpperArm: 'shoulder', ShoulderHelper: 'shoulder', Forearm: 'elbow', Hand: 'elbow', Finger: 'elbow', Thigh: 'hip', Calf: 'knee', Foot: 'knee', Toe: 'knee' };
function bendStart(e) {
  const r = V.renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, V.cams[0]);
  const h = ray.intersectObject(V.pick, false)[0];
  const m = h && /^([RL])_(UpperArm|ShoulderHelper|Forearm|Hand|Finger|Thigh|Calf|Foot|Toe)/.exec(V.T.bones[V.boneOf[h.face.a]].name);
  if (!m) return null;
  seal();
  return { joint: JOINT[m[2]], side: m[1], act: null, moved: false };
}
function bendMove(gb, dx, dy) {
  const F = V.fk, Z = V.pz, S = F.S[gb.side], B = Z.bend[gb.side], cm = V.T.cm, cam = V.cams[0];
  const arm = gb.joint === 'shoulder' || gb.joint === 'elbow', ball = gb.joint === 'shoulder' || gb.joint === 'hip';
  const pv = gb.joint === 'shoulder' ? S.ua : gb.joint === 'elbow' ? S.fa : gb.joint === 'hip' ? S.th : S.calf;
  const hd = gb.joint === 'shoulder' ? S.fa : gb.joint === 'elbow' ? S.hand : gb.joint === 'hip' ? S.calf : S.foot;
  /* the finger's move, as a move of the held end in the chest's (or
     pelvis's) own frame, in model units */
  const e = cam.matrixWorld.elements;
  _v.copy(F.J[hd]).multiplyScalar(cm).sub(cam.position);
  const depth = -(_v.x * e[8] + _v.y * e[9] + _v.z * e[10]);
  const k = 2 * depth * FOV_TAN / (V.renderer.domElement.clientHeight || 1) / cm;
  _w.set((e[0] * dx - e[4] * dy) * k, (e[1] * dx - e[5] * dy) * k, (e[2] * dx - e[6] * dy) * k);
  _qi.copy(F.qW[arm ? F.sp2 : F.pel]).invert();
  _w.applyQuaternion(_qi);
  _v.subVectors(F.J[hd], F.J[pv]).applyQuaternion(_qi);
  let act = null;
  if (ball) {
    const top = arm ? S.ua : S.th, d = arm ? S.dUa : S.dTh, key = arm ? 'shDir' : 'hipDir';
    compose();
    _d0.copy(d).applyQuaternion(Z.rel[top]);
    /* the segment swung after the held end's move, then kept in range */
    _v2.copy(_v).add(_w);
    _q.setFromUnitVectors(_v.normalize(), _v2.normalize());
    _d1.copy(_d0).applyQuaternion(_q);
    limitBall(_d1, S.sg, arm ? SH_MAX : HIP_MAX);
    B[key] = (B[key] || new THREE.Vector3()).copy(_d1);
    compose();
    _d1.copy(d).applyQuaternion(Z.rel[top]);
    /* what the move did: forward or back in the side view, out or in in
       the front view; level out at the side, forward and back */
    const mx = _d1.x - _d0.x, my = _d1.y - _d0.y, mz = _d1.z - _d0.z, mag = Math.hypot(mx, my, mz);
    if (mag > 1e-5) {
      const f = my * _d1.z - mz * _d1.y, a = S.sg * (-mx * _d1.y + my * _d1.x);
      act = Math.abs(f) < 0.25 * mag && Math.abs(a) < 0.25 * mag ? (mz > 0 ? 'flexion' : 'extension')
        : Math.abs(f) >= Math.abs(a) ? (f > 0 ? 'flexion' : 'extension') : (a > 0 ? 'abduction' : 'adduction');
    }
  } else {
    const top = arm ? S.ua : S.th, lo = arm ? S.fa : S.calf;
    compose();
    _ax.copy(arm ? S.elbow : X_AX).applyQuaternion(Z.rel[top]);
    _t.crossVectors(_ax, _v);
    /* The way the held end goes as the joint bends, on screen. Where it
       goes mostly towards or away from you (a hanging forearm seen from
       the front) that says little, so the drag reads more and more as
       "up bends it", and the rate never falls below that of a segment
       60% as long, square to you. */
    _r.set(e[0], e[1], e[2]).applyQuaternion(_qi); _u.set(e[4], e[5], e[6]).applyQuaternion(_qi); _b.set(e[8], e[9], e[10]).applyQuaternion(_qi);
    const tl = _t.length() || 1, tb = _t.dot(_b), tp = Math.sqrt(Math.max(0, tl * tl - tb * tb)), fore = 1 - tp / tl;
    const sx = (_t.dot(_r) / (tp || 1)) * (1 - fore), sy = (-_t.dot(_u) / (tp || 1)) * (1 - fore) - fore;
    const sl = Math.hypot(sx, sy) || 1;
    let da = ((dx * sx + dy * sy) / sl) * k / Math.max(tp, 0.6 * tl);
    _d0.copy(arm ? S.dUa : S.dTh).applyQuaternion(Z.rel[top]);
    _d1.copy(arm ? S.dFa : S.dSh).applyQuaternion(Z.rel[lo]);
    const now = Math.atan2(_d2.crossVectors(_d0, _d1).dot(_ax), _d0.dot(_d1));
    da = clamp(now + da, 0, (arm ? 145 : 140) * DEG) - now;
    if (arm) B.el += da; else B.kn += da;
    if (Math.abs(da) > 1e-4) act = da > 0 ? 'flexion' : 'extension';
  }
  pose();
  gb.moved = true;
  if (act && act !== gb.act) { gb.act = act; V.onBend?.({ action: `${gb.joint} ${act}`, side: gb.side }); }
}
function bendEnd(gb) {
  if (gb.moved) { pose(false); skinCPU(); pose(); draw(); }
  if (gb.act) V.onBend?.(null);
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
  V.orb = null; V.onFrame = null; V.onBend = null;
  dress({ ...PLAIN });
  /* standing at rest, still */
  const Z = V.pz;
  Z.idleK = 0; V.flexK = 0; V.F.uFlex.value = 0;
  if (Z.id !== 'rest' || bent() || Z.anim) setPose('rest', { snap: true });
  else pose();
  el.classList.remove('turned');
  tint();
}

/* Put the look on the body: shorts on or off (the athlete has the skin
   modelled under them, `bareskin`), the hologram skin in the theme's
   accent, and the atlas colours, the deep layer and the flex, which
   paint() lays down. Idle and bend are read as they are needed. */
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
   frame drawn, for the label line; `onBend` hears a limb being bent by
   hand (see bendMove). Rejects as show() does. */
export async function orbit(box, { onTap, onFrame, onBend, inset, look } = {}) {
  await show(box, '', { onTap });
  V.onFrame = onFrame || null;
  V.onBend = onBend || null;
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
   colour behind it (as primaries, which paint() fades to under a third
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
  const az = V.orb.az + wrap180(Math.atan2(a.n.x, a.n.z) / DEG - V.orb.az);
  V.orb.goal = { az, el: clamp(Math.asin(clamp(a.n.y, -1, 1)) / DEG, -30, 40), dist: clampDist(fitH * H / (2 * FOV_TAN * h)), t: a.c.clone() };
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

/* The Anatomy tab's settings, any left out keeping their value:
     shorts  on or off
     atlas   Map(id → CSS colour) to colour every muscle, or null
     spin    turn slowly on his own after a while untouched
     holo    the hologram skin
     deep    show the muscles under the surface (rhomboids, transversus,
             supraspinatus): in their atlas colours, else a faint wash
     flex    the muscle in focus swells and relaxes (study())
     idle    he breathes and shifts his weight
     bend    a drag on an arm or leg bends it (see bendMove)
   Cheap to call with nothing changed: the tint is only redone when what
   it shows has. */
export function setLook(look) {
  if (!V) return;
  const next = { ...V.look, ...look };
  if ('atlas' in look) {
    const key = look.atlas ? [...look.atlas].map(([id, c]) => `${id}=${c}`).join() : '';
    next.atlasKey = key;
    next.atlas = key === V.look.atlasKey ? V.look.atlas : look.atlas ? new Map([...look.atlas].map(([id, c]) => [id, new THREE.Color(c)])) : null;
  }
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
   canvas), and whether that point faces you; null off the orbit. The
   same object comes back each call (read it before asking again). */
const _s = new THREE.Vector3(), ANCHOR = { x: 0, y: 0, front: false, on: false };
export function anchorOf(id) {
  if (!V?.orb || !V.panes || !id) return null;
  const cam = V.panes[0].cam, el = V.renderer.domElement, a = facing(id, cam);
  if (!a) return null;
  _s.copy(a.p).project(cam);
  ANCHOR.x = (_s.x + 1) / 2 * el.clientWidth; ANCHOR.y = (1 - _s.y) / 2 * el.clientHeight;
  ANCHOR.front = a.d > 0.05; ANCHOR.on = _s.z < 1;
  return ANCHOR;
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
  V.onTap = null; V.onFrame = null; V.onBend = null;
  clearTimeout(V.spinT); clearTimeout(V.tick);
  V.renderer.domElement.remove();
}
