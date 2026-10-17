/* The anatomy bench (see index.html). Uses the app's own modules, so the
   body, its posing and its muscle regions are exactly what the app draws. */
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import * as STAGE from '../../apps/workout/stage.js?v=3d-oct16h';
import { Trainer, studioEnv, skinLook, isSkin } from '../../apps/workout/avatar.js?v=3d-oct16h';
import { MOTION } from '../../apps/workout/moves.js?v=3d-oct16g';
import { skeleton } from '../../apps/workout/rig.js?v=3d-oct14h';
import { MMAP, PROGRAM } from '../../apps/workout/data.js?v=3d-oct14d';
import { REGIONS, regionsFor, regionsOfMuscle } from '../../apps/workout/muscles3d.js?v=3d-oct16g';

const $ = s => document.querySelector(s);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

/* ── renderer, camera, orbit ── */
const canvas = $('#gl');
const R = new THREE.WebGLRenderer({ canvas, antialias: true });
R.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.05;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
const cam = new THREE.PerspectiveCamera(32, 1, 1, 5000);
const orbit = { az: 25, el: 8, dist: 260, target: new THREE.Vector3(0, 90, 0), home: null };
const aimCam = () => {
  const a = orbit.az * Math.PI / 180, e = orbit.el * Math.PI / 180;
  cam.position.set(orbit.target.x + orbit.dist * Math.sin(a) * Math.cos(e), orbit.target.y + orbit.dist * Math.sin(e), orbit.target.z + orbit.dist * Math.cos(a) * Math.cos(e));
  cam.lookAt(orbit.target);
  /* a wall between the camera and the body fades to a ghost, as in the app */
  scene?.traverse(o => {
    const x = o.userData.wallX; if (x === undefined) return;
    const between = (cam.position.x - x) * (orbit.target.x - x) < 0;
    o.traverse(mm => { if (!mm.isMesh) return; mm.material.transparent = between; mm.material.opacity = between ? 0.12 : 1; mm.material.depthWrite = !between; });
  });
  dirty = true;
};
let dirty = true;

/* ── state ── */
/* distinct hues, none in the skin's own range (about 0–50°) */
const COLORS = REGIONS.map((r, i) => new THREE.Color().setHSL((55 + ((i * 137.508) % 290)) / 360, 0.72, 0.55));
const st = {
  model: store.get('anat.model', 'athlete'), tab: 'atlas', shorts: store.get('anat.shorts', true),
  sel: new Set(REGIONS.filter(r => !r.deep).map(r => r.id)), deep: false,   // the muscles coloured in the atlas
  ex: store.get('anat.ex', 'Incline Dumbbell Press'), src: 'anim', pose: 'rest', t: 0, playing: false,
  paint: { reg: 'pec', erase: false, orbitOnly: false, size: 3.5 },
  rig: { weights: false, wire: false, joints: false },
};
let T = null, regs = null, baseRegs = null, overrides = {}, scene = null, view = null;
/* The rule-based regions are worked out once per model (about 0.2 s);
   painted corrections are laid on a copy, and a brush stroke only touches
   the points under it. */
const SURF = REGIONS.map((r, k) => (r.deep ? -1 : k)).filter(k => k >= 0);
function applyOne(w, k, i, val) {
  if (val > 0 && !REGIONS[k].deep) for (const s2 of SURF) if (s2 !== k) w[s2][i] = Math.min(w[s2][i], 1 - val);
  w[k][i] = val;
}
function withOverrides() {
  const w = baseRegs.w.map(a => a.slice());
  for (const [id, m] of Object.entries(overrides)) { const k = baseRegs.ids.indexOf(id); if (k >= 0) for (const [vi, val] of Object.entries(m)) applyOne(w, k, +vi, val); }
  return { ids: baseRegs.ids, w };
}   // view: { trainer, stage?, tl? }

/* ── materials: the model's own, with a per-vertex tint and glow ── */
function tintMaterial(src) {
  const m = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, color: src.color.clone(), roughness: src.roughness, metalness: 0, alphaTest: src.alphaTest, side: src.side });
  if (src.normalScale) m.normalScale = src.normalScale.clone();
  m.name = src.name; m.visible = src.visible;
  m.userData.U = { uNeck: view?.trainer.uniforms.uNeck || { value: new THREE.Color('#c39071') }, uGlow: { value: 0.4 } };
  /* the app's own skin shading and studio (avatar.js) */
  const skin = isSkin(src.name);
  m.envMap = src.envMap; m.envMapIntensity = src.envMapIntensity;
  m.onBeforeCompile = sh => {
    skinLook(sh, skin);
    Object.assign(sh.uniforms, m.userData.U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nattribute float aBlend;\nvarying vec4 vTint;\nvarying float vBlend;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvBlend = aBlend;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uNeck;\nuniform float uGlow;\nvarying vec4 vTint;\nvarying float vBlend;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uNeck, vBlend);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb, vTint.a);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vTint.rgb * vTint.a * uGlow;');
  };
  m.customProgramCacheKey = () => (skin ? 'anat-tint-skin' : 'anat-tint');
  return m;
}
function dressTrainer(tr) {
  const old = tr.mesh.material;
  tr.mesh.material = old.map(tintMaterial);
  old.forEach(o => o.dispose());
  const n = tr.mesh.geometry.attributes.position.count;
  tr.mesh.geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  applyShorts();
}
/* The shorts on or off; the skin under them is always there. Only the
   athlete's shorts come off: the trainer's are part of its texture. */
function applyShorts() {
  const mats = view?.trainer.mesh.material || [];
  const has = mats.some(m => m.name === 'bareskin');
  for (const m of mats) {
    if (m.name === 'shorts' || m.name === 'underskin') m.visible = !has || st.shorts;
    if (m.name === 'bareskin') m.visible = has && !st.shorts;
  }
  const b = $('#shorts');
  b.disabled = !has; b.setAttribute('aria-pressed', String(!has || st.shorts));
  b.title = has ? 'Show or hide the shorts' : "This model's shorts are part of its texture";
  dirty = true;
}

/* ── the scene ── */
function baseScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#0d0f12');
  /* the app's light (stage.js, muscleview.js): soft light mostly from the
     studio the body reflects, a warm key, a cool rim, a faint fill */
  s.add(new THREE.HemisphereLight(0xffffff, 0x2a2622, 0.95));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.5);
  key.position.set(140, 260, 180); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 900 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.5;
  const rim = new THREE.DirectionalLight(0xbfd8ff, 1.7); rim.position.set(-200, 160, -220);
  const fill = new THREE.DirectionalLight(0xe6eeff, 0.45); fill.position.set(-120, 80, 200);
  s.add(key, rim, fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ color: '#16191e', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  return s;
}
const pal = () => ({ muscle: new THREE.Color(css('--map-p') || '#ff7a18'), muscle2: new THREE.Color(css('--map-s') || '#9c4d11') });
const zeroPaint = { weights: Tm => { const n = Tm.geo.attributes.position.count; return [new Float32Array(n), new Float32Array(n)]; } };

function buildRest() {
  scene = baseScene();
  const tr = new Trainer(T, pal(), { hi: [], hi2: [] }, zeroPaint);
  tr.useEnv(studioEnv(R));
  view = { trainer: tr };
  dressTrainer(tr);
  /* the rest pose: every bone at its bind transform, scaled to rig units */
  const M = new THREE.Matrix4().makeScale(T.cm, T.cm, T.cm);
  for (const b of tr.bones) { b.matrix.copy(M); b.matrixWorld.copy(M); }
  scene.add(tr.group);
  tr.mesh.computeBoundingSphere();
  const bs = tr.mesh.boundingSphere;
  orbit.target.copy(bs.center); orbit.dist = bs.radius * 3.9; orbit.home = { az: 25, el: 8, dist: orbit.dist, target: bs.center.clone() };
}
function buildRep() {
  const stage = new STAGE.Stage(st.ex, document.documentElement);
  stage.useEnv(R);
  scene = stage.scene;
  scene.background = new THREE.Color('#0d0f12');
  stage.aim(canvas.clientWidth / Math.max(1, canvas.clientHeight));
  view = { trainer: stage.body, stage, tl: stage.tl };
  dressTrainer(stage.body);
  orbit.target.copy(stage.target); orbit.dist = stage.radius * 3.2;
  orbit.az = stage.az0 ?? 38; orbit.el = stage.el0 ?? 12;
  orbit.home = { az: orbit.az, el: orbit.el, dist: orbit.dist, target: stage.target.clone() };
  poseAt(st.t);
}
function rebuild() {
  if (!T) return;
  if (st.pose === 'rep' && MOTION[st.ex]) buildRep(); else buildRest();
  if (orbit.home) Object.assign(orbit, { az: orbit.home.az, el: orbit.home.el, dist: orbit.home.dist }), orbit.target.copy(orbit.home.target);
  joints.build();
  retint(); aimCam();
}

/* rest-pose rig units → the athlete faces +z at rest, +x in a rep (the rig's frame) */
function poseAt(t) {
  if (!view?.stage) return;
  const p = view.tl.at(t * view.tl.total);
  view.stage.pose(p);
  view.effort = p.effort ?? 0.45;
  const { i } = view.tl.step(t * view.tl.total);
  if (i !== view.phase) { view.phase = i; [...$('#phases').children].forEach((el, k) => el.classList.toggle('on', k === i)); }
  $('#effortBar').style.width = `${Math.round(Math.max(0, Math.min(1, ((view.effort ?? 0.45) - 0.3) / 0.7)) * 100)}%`;
  $('#timeV').textContent = `${(t * view.tl.total).toFixed(1)} / ${view.tl.total.toFixed(1)} s`;
  if (st.rig.joints) joints.update(p);
  setGlow();
  dirty = true;
}

/* ── tint: what each vertex shows ── */
const BONE_COL = n => new THREE.Color().setHSL(((n * 0.618034) % 1), 0.7, 0.55);
function exerciseSets() {
  const m = MOTION[st.ex] || {};
  const anim = { p: new Set((m.hi || []).flatMap(x => regionsOfMuscle(x, MMAP))), s: new Set((m.hi2 || []).flatMap(x => regionsOfMuscle(x, MMAP))) };
  const mapStr = PROG.get(st.ex) || '';
  const names = mapStr.split(',').map(s => s.trim()).filter(Boolean);
  const map = { p: new Set(names.slice(0, 1).flatMap(x => regionsOfMuscle(x, MMAP))), s: new Set(names.slice(1).flatMap(x => regionsOfMuscle(x, MMAP))) };
  return { anim, map, names, m };
}
function retint() {
  if (!view || !regs) return;
  const g = view.trainer.mesh.geometry, A = g.attributes.aTint, n = A.count, out = A.array;
  out.fill(0);
  const add = (k, col, a) => { const w = regs.w[k]; for (let i = 0; i < n; i++) { const x = w[i] * a; if (x > out[i * 4 + 3] + 1e-3) { out[i * 4] = col.r; out[i * 4 + 1] = col.g; out[i * 4 + 2] = col.b; out[i * 4 + 3] = Math.min(0.92, x); } } };
  let glow = 0.25;
  if (st.rig.weights) {
    const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    for (let i = 0; i < n; i++) {
      let r = 0, gg = 0, b = 0;
      for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; const c = BONE_COL(SI.getComponent(i, j)); r += c.r * w; gg += c.g * w; b += c.b * w; }
      out.set([r, gg, b, 0.9], i * 4);
    }
    glow = 0.1;
  } else if (st.tab === 'exercise' && MOTION[st.ex]) {
    const { anim, map } = exerciseSets();
    const P = pal();
    const eff = Math.max(0, Math.min(1, ((view.effort ?? 0.45) - 0.45) / 0.55));
    const ids = regs.ids;
    if (st.src === 'none') {
      glow = 0;   // the bare body, for checking the pose and the skin
    } else if (st.src === 'diff') {
      const A1 = new Set([...anim.p, ...anim.s]), M1 = new Set([...map.p, ...map.s]);
      ids.forEach((id, k) => {
        if (A1.has(id) && M1.has(id)) add(k, new THREE.Color('#4ade80'), 0.8);
        else if (A1.has(id)) add(k, new THREE.Color('#4cc3ff'), 0.85);
        else if (M1.has(id)) add(k, new THREE.Color('#f87171'), 0.85);
      });
    } else {
      const S = st.src === 'map' ? map : anim;
      ids.forEach((id, k) => { if (S.s.has(id)) add(k, P.muscle2, 0.7); });
      ids.forEach((id, k) => { if (S.p.has(id)) add(k, P.muscle, 0.9); });
      glow = null;   // follows the effort, frame by frame (setGlow)
    }
  } else if (st.tab === 'paint') {
    const k = regs.ids.indexOf(st.paint.reg);
    regs.ids.forEach((id, j) => { if (j !== k && !REGIONS[j].deep) add(j, COLORS[j], 0.22); });
    add(k, new THREE.Color('#ff7a18'), 1);
    glow = 0.3;
  } else {
    regs.ids.forEach((id, k) => {
      const r = REGIONS[k];
      if (!st.sel.has(id) || (r.deep && !st.deep && st.sel.size > 1)) return;
      add(k, COLORS[k], st.sel.size === 1 ? 1 : r.deep ? 0.95 : 0.85);
    });
  }
  A.needsUpdate = true;
  view.glowFixed = glow;
  for (const mm of view.trainer.mesh.material) mm.wireframe = st.rig.wire;
  setGlow();
}
/* the working muscles glow with the rep's effort; everything else is fixed */
function setGlow() {
  if (!view) return;
  const eff = Math.max(0, Math.min(1, ((view.effort ?? 0.45) - 0.45) / 0.55));
  const g = view.glowFixed ?? (0.1 + 0.4 * eff);
  for (const mm of view.trainer.mesh.material) mm.userData.U.uGlow.value = g;
  dirty = true;
}

/* ── joints overlay (the rig's own skeleton) ── */
const joints = {
  group: null,
  build() {
    this.group = new THREE.Group(); this.group.visible = st.rig.joints; scene.add(this.group);
    this.dots = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: '#4cc3ff', depthTest: false })); m.renderOrder = 10; this.group.add(m); return m; });
    if (!view.stage) { this.group.visible = false; }
  },
  update(p) {
    if (!this.group || !view.stage) return;
    const J = skeleton(p), pts = [J.H, J.spine(0.5).p, J.spine(0.9).p, J.head.centre];
    for (const s of [J.n, J.f]) pts.push(s.sho, s.elb, s.wri, s.hip, s.kne, s.ank, s.toe);
    this.dots.forEach((d, i) => { d.visible = i < pts.length; if (pts[i]) d.position.set(...pts[i]); });
    this.group.visible = st.rig.joints;
  },
};

/* ── picking ──
   On the GPU: the body alone is drawn into one float pixel under the
   pointer, each fragment writing its rest-pose position (rgb; a = 1 where
   the body is), and the nearest vertex to that position is looked up.
   Ray-casting the posed body in JavaScript cost 70–110 ms and stalled
   the view whenever the pointer crossed it. Falls back to the ray-cast
   where float targets are missing.
   A hit is { v: vertex index, bind: [x, y, z] in the rest pose }. */
const PICK_LAYER = 5;
const pickRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
const pickBuf = new Float32Array(4);
const pickMat = new THREE.MeshBasicMaterial();
pickMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
    .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor = vec4(vBind, 1.0);');
};
pickMat.customProgramCacheKey = () => 'anat-pick';
const gpuPick = R.capabilities.isWebGL2 && R.extensions.has('EXT_color_buffer_float');
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  const mesh = view.trainer.mesh;
  if (gpuPick) {
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x < 0 || y < 0 || x >= r.width || y >= r.height) return null;
    pickBuf.fill(-7);   // a value no real read can give: if it survives, the read failed
    pickDraw(mesh, r, x, y);
    R.readRenderTargetPixels(pickRT, 0, 0, 1, 1, pickBuf);
    if (DEBUG) lastPick = { x: +x.toFixed(1), y: +y.toFixed(1), rect: [Math.round(r.width), Math.round(r.height)], dpr: devicePixelRatio,
      raw: [...pickBuf].map(v => +v.toFixed(3)), stale: pickBuf[3] === -7, glError: gl.getError(),
      fb: (() => { R.setRenderTarget(pickRT); const st3 = gl.checkFramebufferStatus(gl.FRAMEBUFFER); R.setRenderTarget(null); return st3 === gl.FRAMEBUFFER_COMPLETE ? 'complete' : st3; })() };
    return pickHit();
  }
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  cam.updateMatrixWorld(); mesh.updateMatrixWorld(true); mesh.computeBoundingSphere();
  ray.setFromCamera(ndc, cam);
  const h = ray.intersectObject(mesh, false)[0];
  if (!h) return null;
  const f = h.face, pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), bc = new THREE.Vector3();
  mesh.getVertexPosition(f.a, pa); mesh.getVertexPosition(f.b, pb); mesh.getVertexPosition(f.c, pc);
  new THREE.Triangle(pa, pb, pc).getBarycoord(h.point, bc);
  const P = T.geo.attributes.position;
  return { v: f.a, bind: [0, 1, 2].map(k => P.getComponent(f.a, k) * bc.x + P.getComponent(f.b, k) * bc.y + P.getComponent(f.c, k) * bc.z) };
}
/* Draws the body into the 1-pixel target under the pointer. */
function pickDraw(mesh, r, x, y) {
  const mats = mesh.material, bg = scene.background, cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha();
  mesh.material = mats.map(() => pickMat);
  mesh.layers.enable(PICK_LAYER); cam.layers.set(PICK_LAYER);
  scene.background = null; R.setClearColor(0, 0);
  cam.setViewOffset(r.width, r.height, x, y, 1, 1);
  const sm = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
  R.setRenderTarget(pickRT); R.clear(); R.render(scene, cam); R.setRenderTarget(null);
  R.shadowMap.autoUpdate = sm;
  cam.clearViewOffset(); cam.layers.set(0); mesh.layers.disable(PICK_LAYER);
  scene.background = bg; R.setClearColor(cc, ca); mesh.material = mats;
}
/* The same pick without waiting on the GPU, for hover: the pixel is copied
   into a buffer the GPU fills in its own time, and read a few
   milliseconds later once a fence says it is done. A plain read makes the page wait
   for every frame the GPU still has queued, which showed as a stutter
   each time the pointer came to rest. A newer pick cancels an older one. */
let pbo = null, pickSeq = 0;
function pickLater(ev, done) {
  const id = ++pickSeq;
  if (!gpuPick) { done(pick(ev)); return; }
  const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) { done(null); return; }
  if (!pbo) { pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); }
  pickDraw(view.trainer.mesh, r, x, y);
  R.setRenderTarget(pickRT);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  R.setRenderTarget(null);
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    if (id !== pickSeq) { gl.deleteSync(sync); return; }
    if (gl.clientWaitSync(sync, 0, 0) === gl.TIMEOUT_EXPIRED) { setTimeout(poll, 4); return; }
    gl.deleteSync(sync);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pickBuf);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    done(pickHit());
  };
  setTimeout(poll, 4);
}
/* The vertex under the pointer, from the rest-pose position the pick read
   back (not from a vertex-id channel: some GPUs never pass it through, and
   every pick then named vertex 0). A grid of rest positions, built once. */
let grid = null;
const GC = 1.5, cellKey = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
/* Every vertex's index sorted by cell, and where each cell's run starts;
   built once per model, ahead of the first hover (load()). */
function buildGrid() {
  const P = T.geo.attributes.position.array, n = P.length / 3;
  const keys = new Float64Array(n), order = new Uint32Array(n);
  for (let i = 0; i < n; i++) { keys[i] = cellKey(Math.floor(P[3 * i] / GC), Math.floor(P[3 * i + 1] / GC), Math.floor(P[3 * i + 2] / GC)); order[i] = i; }
  order.sort((a, b) => keys[a] - keys[b]);
  const start = new Map();
  for (let k = 0; k < n; k++) { const key = keys[order[k]]; if (k === 0 || key !== keys[order[k - 1]]) start.set(key, k); }
  grid = { geo: T.geo, keys, order, start };
}
function nearestVertex(p) {
  if (!grid || grid.geo !== T.geo) buildGrid();
  const P = T.geo.attributes.position.array, { keys, order, start } = grid;
  const cx = Math.floor(p[0] / GC), cy = Math.floor(p[1] / GC), cz = Math.floor(p[2] / GC);
  let best = -1, bd = Infinity;
  for (let r = 1; r <= 3 && best < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
    const key = cellKey(cx + dx, cy + dy, cz + dz), k0 = start.get(key);
    if (k0 === undefined) continue;
    for (let k = k0; k < order.length && keys[order[k]] === key; k++) {
      const i = order[k], d = (P[3 * i] - p[0]) ** 2 + (P[3 * i + 1] - p[1]) ** 2 + (P[3 * i + 2] - p[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}
const pickHit = () => { if (pickBuf[3] < 1) return null; const bind = [pickBuf[0], pickBuf[1], pickBuf[2]], v = nearestVertex(bind); return v < 0 ? null : { v, bind }; };
function regionAt(hit) {
  let best = -1, bv = 0.08;
  regs.w.forEach((w, k) => { if (!REGIONS[k].deep && w[hit.v] > bv) { bv = w[hit.v]; best = k; } });
  return best;
}
const bindPoint = hit => hit.bind;

/* ── painting ── */
let strokeDirty = false;
function paintAt(hit, erase) {
  const c = bindPoint(hit), P = T.geo.attributes.position, n = P.count, r = st.paint.size * 1.0;
  const reg = st.paint.reg, o = (overrides[reg] ||= {}), k = regs.ids.indexOf(reg);
  let touched = 0;
  for (let i = 0; i < n; i++) {
    const dx = P.getX(i) - c[0], dy = P.getY(i) - c[1], dz = P.getZ(i) - c[2], d = Math.hypot(dx, dy, dz);
    if (d > r) continue;
    const fall = 1 - Math.pow(d / r, 2);
    const cur = o[i] ?? regs.w[k][i];
    o[i] = erase ? Math.min(cur, 1 - fall) : Math.max(cur, Math.min(1, fall * 1.4));
    applyOne(regs.w, k, i, o[i]);
    touched++;
  }
  if (touched) { strokeDirty = true; retint(); }
}
const okey = () => `anat.overrides.${st.model}`;
function saveOverrides() {
  store.set(okey(), overrides);
  const total = Object.values(overrides).reduce((a, m) => a + Object.keys(m).length, 0);
  $('#pCount').textContent = total ? `${total} painted points across ${Object.keys(overrides).filter(k => Object.keys(overrides[k]).length).length} muscles` : 'No edits';
}

/* ── pointer: orbit, pan, zoom, hover, paint ── */
const ptrs = new Map(); let drag = null, pinch = null, painting = false, lastHover = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist }; drag = null; painting = false; return; }
  if (st.tab === 'paint' && !st.paint.orbitOnly && e.button === 0 && !e.altKey) {
    const hit = pick(e); if (hit) { painting = true; paintAt(hit, st.paint.erase || e.shiftKey); return; }
  }
  drag = { x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el, pan: e.button === 2 || e.ctrlKey, t: orbit.target.clone(), moved: false };
});
canvas.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; orbit.dist = Math.max(40, Math.min(900, pinch.dist * pinch.d / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)))); aimCam(); return; }
  if (painting) { const hit = pick(e); if (hit) paintAt(hit, st.paint.erase || e.shiftKey); return; }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.pan) {
      const k = orbit.dist / canvas.clientHeight * 0.9;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
      orbit.target.copy(drag.t).addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    } else { orbit.az = drag.az - dx * 0.4; orbit.el = Math.max(-25, Math.min(85, drag.el + dy * 0.3)); }
    aimCam(); return;
  }
  const now = performance.now();
  if (now - lastHover < 16 || !view) return;
  lastHover = now;
  hover(e);
});
const end = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (drag && !drag.moved && st.tab === 'atlas') { const hit = pick(e); if (hit) { const k = regionAt(hit); if (k >= 0) choose(regs.ids[k], e.shiftKey || e.ctrlKey || e.metaKey); } }
  if (strokeDirty) { strokeDirty = false; saveOverrides(); }
  drag = null; painting = false;
};
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
canvas.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = Math.max(40, Math.min(900, orbit.dist * Math.exp(e.deltaY * 0.0012))); aimCam(); }, { passive: false });
canvas.addEventListener('dblclick', () => { if (orbit.home) { Object.assign(orbit, { az: orbit.home.az, el: orbit.home.el, dist: orbit.home.dist }); orbit.target.copy(orbit.home.target); aimCam(); } });

/* Hover names the muscle once the pointer rests (70 ms): one pick, no
   work at all while it moves. */
let hoverTimer = 0;
function hover(e) {
  const at = { clientX: e.clientX, clientY: e.clientY };
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => { if (view) pickLater(at, hit => showHover(at, hit)); }, 70);
}
/* Debug: every hover prints what the GPU pick read and what a CPU
   ray-cast finds at the same spot. On by default for now; D toggles it. */
let DEBUG = false, lastPick = null;
const gl = R.getContext();
function debugHover(e, hit) {
  if (!DEBUG || !view) return;
  const gpuOn = gpuPick;
  let cpu = null;
  try {
    const r = canvas.getBoundingClientRect(), mesh = view.trainer.mesh;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    cam.updateMatrixWorld(); mesh.updateMatrixWorld(true); mesh.computeBoundingSphere();
    ray.setFromCamera(ndc, cam);
    const h = ray.intersectObject(mesh, false)[0];
    cpu = h ? { v: h.face.a, region: (k => (k >= 0 ? REGIONS[k].id : null))(regionAt({ v: h.face.a })), point: h.point.toArray().map(v => +v.toFixed(1)) } : null;
  } catch (err) { cpu = 'error: ' + err.message; }
  const out = {
    mode: gpuOn ? 'gpu' : 'cpu', gpuPick: lastPick, hit: hit && { v: hit.v, bind: hit.bind.map(v => +v.toFixed(1)), region: (k => (k >= 0 ? REGIONS[k].id : null))(regionAt(hit)) },
    cpuRay: cpu, verts: view.trainer.mesh.geometry.attributes.position.count, model: st.model, tab: st.tab, pose: st.pose,
  };
  console.log('[pick]', JSON.stringify(out));
  const box = $('#dbg'); box.hidden = false; box.textContent = JSON.stringify(out, null, 1);
}
document.addEventListener('keydown', e => { if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey && !(e.target instanceof Element && e.target.closest('input:not([type=range]), select, textarea'))) { DEBUG = !DEBUG; $('#dbg').hidden = !DEBUG; } });
function showHover(e, hit) {
  debugHover(e, hit);
  const tip = $('#tip');
  if (!hit) { tip.hidden = true; return; }
  const k = regionAt(hit);
  const f = { a: hit.v }, SI = T.geo.attributes.skinIndex, SW = T.geo.attributes.skinWeight;
  const inf = []; for (let j = 0; j < 4; j++) { const w = SW.getComponent(f.a, j); if (w > 0.02) inf.push(`${T.bones[SI.getComponent(f.a, j)].name} ${(w * 100).toFixed(0)}%`); }
  const deep = REGIONS.filter((r, j) => r.deep && regs.w[j][f.a] > 0.3).map(r => r.name);
  tip.innerHTML = k >= 0 ? `<b>${REGIONS[k].name}</b>${deep.length ? ` · over ${deep.join(', ')}` : ''}` : '<span style="color:var(--txt-3)">no mapped muscle here</span>';
  const rr = canvas.getBoundingClientRect();
  tip.style.left = `${e.clientX - rr.left}px`; tip.style.top = `${e.clientY - rr.top}px`; tip.hidden = false;
  $('#rInfo').textContent = `vertex ${f.a} · ${inf.join(' · ')}`;
}

/* ── panels ── */
const PROG = new Map();
(function walk(o) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (o.n && typeof o.m === 'string' && !PROG.has(o.n)) PROG.set(o.n, o.m); Object.values(o).forEach(walk); })(PROGRAM);

/* Selecting: with every muscle showing, a click shows just that one; with
   a selection, a click on another muscle switches to it, Shift-click adds
   or removes it, and clicking the only selected muscle shows all again. */
const allIds = () => REGIONS.filter(r => !r.deep || st.deep).map(r => r.id);
function choose(id, add) {
  const all = st.sel.size >= allIds().length;
  if (add && !all) { st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id); }
  else if (!all && st.sel.size === 1 && st.sel.has(id)) st.sel = new Set(allIds());
  else st.sel = new Set([id]);
  renderList(); retint();
}
function renderList() {
  const box = $('#regList'); box.innerHTML = '';
  const groups = [...new Set(REGIONS.map(r => r.group))];
  for (const g of groups) {
    const sec = document.createElement('div'); sec.className = 'group';
    sec.innerHTML = `<h3>${g}</h3>`;
    REGIONS.forEach((r, k) => {
      if (r.group !== g) return;
      const row = document.createElement('div');
      const on = st.sel.has(r.id) && (st.sel.size < allIds().length);
      row.className = 'reg' + (on ? ' on' : '');
      const q = ($('#regQ').value || '').trim().toLowerCase();
      if (q && !r.name.toLowerCase().includes(q) && !r.group.toLowerCase().includes(q)) return;
      row.innerHTML = `<span class="sw" style="background:#${COLORS[k].getHexString()};opacity:${st.sel.has(r.id) ? 1 : 0.25}"></span><span>${r.name}${r.deep ? ' <small>deep</small>' : ''}</span><small></small>`;
      row.title = 'Click to show only this muscle · Shift-click to add or remove it';
      row.onclick = ev => choose(r.id, ev.shiftKey || ev.ctrlKey || ev.metaKey);
      sec.appendChild(row);
    });
    box.appendChild(sec);
  }
}
/* The program's days, in order, for grouping the exercise list. */
const DAY_NAME = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const GROUPS = (() => {
  const seen = new Set(), out = [];
  for (const d of PROGRAM) {
    const names = [];
    (function walk(o) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (o.n && MOTION[o.n] && !seen.has(o.n)) { seen.add(o.n); names.push(o.n); } Object.values(o).forEach(walk); })(d);
    if (names.length) out.push({ label: `${DAY_NAME[d.day] || d.day} · ${d.label || ''}`, names });
  }
  const rest = Object.keys(MOTION).filter(n => !seen.has(n));
  if (rest.length) out.push({ label: 'Other', names: rest });
  return out;
})();
function renderExercise() {
  const q = $('#exQ').value.trim().toLowerCase();
  const list = $('#exList');
  list.innerHTML = '';
  let shown = 0;
  for (const g of GROUPS) {
    const names = g.names.filter(n => n.toLowerCase().includes(q));
    if (!names.length) continue;
    const h = document.createElement('h3'); h.textContent = g.label; list.appendChild(h);
    for (const n of names) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = n; b.setAttribute('role', 'option');
      if (n === st.ex) { b.setAttribute('aria-current', 'true'); b.setAttribute('aria-selected', 'true'); }
      b.onclick = () => pickExercise(n);
      list.appendChild(b); shown++;
    }
  }
  if (!shown) list.innerHTML = '<div class="empty">No exercise matches.</div>';
  const cur = list.querySelector('[aria-current="true"]');
  if (cur && !q) cur.scrollIntoView({ block: 'nearest' });
  const { anim, map, names: mnames, m } = exerciseSets();
  const chip = (txt, cls) => `<span class="chip ${cls}">${txt}</span>`;
  $('#chipsAnim').innerHTML = [...(m.hi || []).map(x => chip(x, 'p')), ...(m.hi2 || []).map(x => chip(x, 's'))].join('') || '<span class="note">none</span>';
  $('#chipsMap').innerHTML = mnames.map((x, i) => chip(x, (i ? 's' : 'p') + (regionsOfMuscle(x, MMAP).length ? '' : ' miss'))).join('') || '<span class="note">not in the program list</span>';
  const A1 = new Set([...anim.p, ...anim.s]), M1 = new Set([...map.p, ...map.s]);
  const onlyA = [...A1].filter(x => !M1.has(x)), onlyM = [...M1].filter(x => !A1.has(x));
  const nm = id => REGIONS.find(r => r.id === id)?.name || id;
  $('#diffNote').innerHTML = !mnames.length ? '' : (!onlyA.length && !onlyM.length ? 'Both sources light the same muscles.' :
    `${onlyA.length ? `<span style="color:var(--cool)">Only the animation:</span> ${onlyA.map(nm).join(', ')}. ` : ''}${onlyM.length ? `<span style="color:var(--bad)">Only the body map:</span> ${onlyM.map(nm).join(', ')}.` : ''}`);
  const tl = view?.tl;
  $('#phases').innerHTML = tl ? MOTION[st.ex].tempo.map(([, s, l]) => `<span style="flex:${s}">${l}</span>`).join('') : '';
}
function renderPaint() {
  $('#pReg').innerHTML = REGIONS.map(r => `<option value="${r.id}"${r.id === st.paint.reg ? ' selected' : ''}>${r.name}</option>`).join('');
  saveOverrides();
}
function setTab(t) {
  st.tab = t;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  document.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
  if (t === 'exercise' && st.pose !== 'rep') setPose('rep');
  renderExercise(); retint();
}

/* ── wiring ── */
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('#allOn').onclick = () => { st.sel = new Set(allIds()); renderList(); retint(); };
$('#soloOff').onclick = () => { st.sel = new Set(); renderList(); retint(); };
$('#deep').onclick = e => { const all = st.sel.size >= allIds().length; st.deep = !st.deep; if (all) st.sel = new Set(allIds()); else if (!st.deep) REGIONS.forEach(r => r.deep && st.sel.delete(r.id)); e.target.setAttribute('aria-pressed', String(st.deep)); renderList(); retint(); };
$('#exQ').oninput = renderExercise;
$('#regQ').oninput = () => renderList();
function pickExercise(n) { st.ex = n; store.set('anat.ex', n); st.t = 0; $('#scrub').value = 0; setPose('rep'); renderExercise(); }
function setPose(p) { st.pose = p; document.querySelectorAll('#poseSel button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pose === p))); rebuild(); }
document.querySelectorAll('.src').forEach(b => b.onclick = () => { st.src = b.dataset.src; document.querySelectorAll('.src').forEach(x => x.setAttribute('aria-pressed', String(x === b))); retint(); });
document.querySelectorAll('#poseSel button').forEach(b => b.onclick = () => { setPose(b.dataset.pose); renderExercise(); });
$('#scrub').oninput = e => { st.t = e.target.value / 1000; if (st.pose !== 'rep') setPose('rep'); poseAt(st.t); };
function setPlaying(on) {
  st.playing = on;
  const b = $('#play'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Pause' : 'Play');
  $('#playIcon').setAttribute('d', on ? 'M4 2.5h3v11H4zM9 2.5h3v11H9z' : 'M4 2.5v11l9-5.5z');
  if (on && st.pose !== 'rep') setPose('rep');
}
$('#play').onclick = () => setPlaying(!st.playing);
$('#pReg').onchange = e => { st.paint.reg = e.target.value; retint(); };
const toggle3 = (on) => { $('#pAdd').setAttribute('aria-pressed', String(on === 'add')); $('#pErase').setAttribute('aria-pressed', String(on === 'erase')); $('#pOrbit').setAttribute('aria-pressed', String(on === 'orbit')); st.paint.erase = on === 'erase'; st.paint.orbitOnly = on === 'orbit'; };
$('#pAdd').onclick = () => toggle3('add'); $('#pErase').onclick = () => toggle3('erase'); $('#pOrbit').onclick = () => toggle3('orbit');
$('#pSize').oninput = e => { st.paint.size = +e.target.value; $('#pSizeV').textContent = e.target.value; };
$('#pExport').onclick = () => {
  const blob = new Blob([JSON.stringify({ model: st.model, regions: overrides })], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `muscles.${st.model}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#pImport').onchange = async e => { const f = e.target.files[0]; if (!f) return; const d = JSON.parse(await f.text()); overrides = d.regions || d; regs = withOverrides(); saveOverrides(); renderList(); retint(); };
$('#pClearReg').onclick = () => { delete overrides[st.paint.reg]; regs = withOverrides(); saveOverrides(); retint(); };
$('#rWeights').onclick = e => { st.rig.weights = !st.rig.weights; e.target.setAttribute('aria-pressed', String(st.rig.weights)); retint(); };
$('#rWire').onclick = e => { st.rig.wire = !st.rig.wire; e.target.setAttribute('aria-pressed', String(st.rig.wire)); retint(); };
$('#rJoints').onclick = e => { st.rig.joints = !st.rig.joints; e.target.setAttribute('aria-pressed', String(st.rig.joints)); if (joints.group) joints.group.visible = st.rig.joints && !!view.stage; dirty = true; };
const showModel = () => document.querySelectorAll('#model button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.model === st.model)));
showModel();
/* Keyboard (ignored while typing in a field): Space play or pause, ← →
   step the rep, 1–4 camera views, R reset, S shorts, D debug, ? help. */
const VIEWS = { front: [90, 6], side: [0, 6], back: [270, 6], top: [90, 80] };
function viewTo(name) {
  const [az, el] = VIEWS[name];
  /* in a rep the body faces +x (az 90); at rest it faces +z (az 0) */
  orbit.az = view?.stage ? az : az - 90; orbit.el = el; aimCam();
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => viewTo(b.dataset.view));
const resetView = () => { if (orbit.home) { Object.assign(orbit, { az: orbit.home.az, el: orbit.home.el, dist: orbit.home.dist }); orbit.target.copy(orbit.home.target); aimCam(); } };
$('#resetView').onclick = resetView;
const toggleHelp = () => { const h = $('#help'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)); };
$('#helpBtn').onclick = toggleHelp;
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof Element && e.target.closest('input:not([type=range]), select, textarea, [contenteditable]')) return;
  const k = e.key;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) setPlaying(!st.playing); }
  else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); if (st.pose !== 'rep') setPose('rep'); st.t = (st.t + (k === 'ArrowRight' ? 0.02 : -0.02) + 1) % 1; $('#scrub').value = Math.round(st.t * 1000); poseAt(st.t); }
  else if ('1234'.includes(k) && k.length === 1) viewTo(['front', 'side', 'back', 'top'][+k - 1]);
  else if (k === 'r' || k === 'R') resetView();
  else if (k === 's' || k === 'S') $('#shorts').click();
  else if (k === '?') toggleHelp();
});
$('#shorts').onclick = () => { st.shorts = !st.shorts; store.set('anat.shorts', st.shorts); applyShorts(); };
document.querySelectorAll('#model button').forEach(b => b.onclick = () => { if (st.model === b.dataset.model) return; st.model = b.dataset.model; store.set('anat.model', st.model); showModel(); load(); });

/* ── size and loop ── */
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  R.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); dirty = true;
}
new ResizeObserver(resize).observe(canvas);
let last = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (st.playing && view?.stage) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    st.t = (st.t + dt / view.tl.total) % 1;
    $('#scrub').value = Math.round(st.t * 1000);
    poseAt(st.t);
  }
  last = now;
  if (dirty && scene) { R.render(scene, cam); dirty = false; }
}

async function load() {
  $('#loading').hidden = false;
  T = await STAGE.ready(st.model);
  if (!T) { $('#loading').textContent = 'Could not load the model.'; return; }
  overrides = store.get(okey(), {});
  baseRegs = regionsFor(T);
  regs = withOverrides();
  rebuild(); renderList(); renderExercise(); renderPaint();
  $('#loading').hidden = true;
  /* ready the first hover: the lookup grid, and the pick shader compiled */
  setTimeout(() => {
    buildGrid();
    if (gpuPick && view) { const r = canvas.getBoundingClientRect(); pickDraw(view.trainer.mesh, r, r.width / 2, r.height / 2); }
  }, 50);
}
/* URL parameters, for links and for screenshots: ?tab=exercise&ex=Pull-Ups
   &t=0.5&src=diff&solo=lat&az=0&el=5&zoom=1&rig=weights,wire,joints */
const qs = new URLSearchParams(location.search);
if (qs.get('model')) st.model = qs.get('model');
if (qs.has('shorts')) st.shorts = qs.get('shorts') !== '0';
if (qs.get('ex')) st.ex = qs.get('ex');
if (qs.get('t')) { st.t = +qs.get('t'); st.pose = 'rep'; }
if (qs.get('src')) st.src = qs.get('src');
if (qs.get('solo')) st.sel = new Set(qs.get('solo') === 'none' ? [] : qs.get('solo').split(','));
if (qs.get('reg')) st.paint.reg = qs.get('reg');
for (const k of (qs.get('rig') || '').split(',').filter(Boolean)) st.rig[k] = true;
resize();
await load();
if (qs.get('tab')) setTab(qs.get('tab'));
if (st.pose === 'rep') { setPose('rep'); renderExercise(); }
$('#scrub').value = Math.round(st.t * 1000);
if (qs.has('ty')) orbit.target.y = +qs.get('ty');
if (qs.has('tx')) orbit.target.x = +qs.get('tx');
if (qs.has('az')) orbit.az = +qs.get('az');
if (qs.has('el')) orbit.el = +qs.get('el');
if (qs.has('zoom')) orbit.dist /= +qs.get('zoom');
aimCam(); retint();
requestAnimationFrame(loop);
window.__anat = { regionsFor, get T() { return T; }, st, orbit, aimCam, cam, pick, ray, get regs() { return regs; }, get view() { return view; }, rebuild, retint, setTab };
