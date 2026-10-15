/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE TRAINER: A REAL BODY ON THE RIG

   The figure in the 3D rep is a scanned-quality human, Male_Adult_01 from
   Microsoft's Rocketbox library (MIT; assets/models/trainer/LICENSE.md),
   skinned to 52 bones: spine, neck, head, clavicles, arms, every finger
   joint, legs and feet. rig.js still decides where everything is; this
   file only dresses that skeleton. Each frame every bone is placed on the
   rig's joint and turned so its bind-pose frame (the way it points, and
   which way its front faces) lands on the rig's frame for that segment.
   A planted hand or foot therefore stays exactly where the rig put it,
   and every check in tools/howto/check.mjs still holds.

   What the rig does not say, this file decides:
     palm     which way each palm faces, from what the hand holds (a press
              faces the feet, a curl the shoulder, a dumbbell at the side
              the thigh, a hand on the floor the floor) or the exercise's
              own `palm` in moves.js
     fingers  wrapped round a handle or bar, flat on the floor, or loose

   The model is in centimetres in its A-pose, y up, facing +z, its right
   side at −x. The rig's near side (L, +z) is the figure's right.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { SEG, v3 } from './rig.js?v=3d-oct14d';

/* Each model lives in assets/models/<name>/ as <name>.json + <name>.bin:
   'trainer' (the Rocketbox scan in a tee and shorts) and 'athlete' (a
   sculpted anatomical body in shorts with the scan's head and hands, built
   by tools/howto/trainer/). A model's json may list its own materials. */
const MODELS = new URL('../../assets/models/', import.meta.url);

const LOADING = new Map();
/* Loads a model's mesh and textures once; resolves to the shared data. */
export function loadTrainer(name = 'trainer') {
  if (LOADING.has(name)) return LOADING.get(name);
  const DIR = new URL(`${name}/`, MODELS);
  const job = (async () => {
    const [meta, bin] = await Promise.all([
      fetch(new URL(`${name}.json`, DIR)).then(r => { if (!r.ok) throw new Error(`${name}.json`); return r.json(); }),
      fetch(new URL(`${name}.bin`, DIR)).then(r => { if (!r.ok) throw new Error(`${name}.bin`); return r.arrayBuffer(); }),
    ]);
    const tl = new THREE.TextureLoader();
    const tex = async (f, srgb = true) => {
      const t = await tl.loadAsync(new URL(f, DIR).href);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.userData.shared = true;
      return t;
    };
    /* Materials: the model's own list, or the scan's three. */
    const MATS = meta.materials || {
      body: { map: 'body.jpg', normalMap: 'body_n.jpg', normalScale: 0.8, roughness: 0.78, paint: true },
      head: { map: 'head.jpg', normalMap: 'head_n.jpg', normalScale: 0.7, roughness: 0.6, paint: true },
      hair: { map: 'hair.png', alphaTest: 0.38, roughness: 0.85 },
    };
    const matNames = Object.keys(MATS);
    const mats = {};
    await Promise.all(matNames.map(async n => {
      const m = MATS[n];
      mats[n] = { ...m, map: m.map && await tex(m.map), normalMap: m.normalMap && await tex(m.normalMap, false) };
    }));
    const arr = (name, T) => new T(bin, meta.layout[name].offset, meta.layout[name].length);
    const pos16 = arr('position', Int16Array);
    const pos = new Float32Array(pos16.length);
    for (let i = 0; i < pos.length; i++) pos[i] = pos16[i] * meta.posScale;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(arr('normal', Int8Array), 3, true));
    geo.setAttribute('uv', new THREE.BufferAttribute(arr('uv', Uint16Array), 2, true));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(arr('skinIndex', Uint8Array), 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(arr('skinWeight', Uint8Array), 4, true));
    geo.setIndex(new THREE.BufferAttribute(arr('index', meta.layout.index.type === 'Uint32Array' ? Uint32Array : Uint16Array), 1));
    if (meta.layout.skinBlend) geo.setAttribute('aBlend', new THREE.BufferAttribute(arr('skinBlend', Uint8Array), 1, true));
    /* Baked ambient occlusion, stored here as how shut in each point is,
       so a model without it (an unset attribute reads 0) shades as open. */
    if (meta.layout.ao) geo.setAttribute('aOcc', new THREE.BufferAttribute(arr('ao', Uint8Array).map(a => 255 - a), 1, true));
    const legacy = { m002_body: 'body', m002_head: 'head', m002_opacity: 'hair' };
    for (const r of meta.ranges) geo.addGroup(r.start, r.count, Math.max(0, matNames.indexOf(legacy[r.mat] || r.mat)));
    const bones = meta.bones.map(b => ({ ...b, P: new THREE.Vector3(...b.p) }));
    const byName = Object.fromEntries(bones.map((b, i) => [b.name, i]));
    if (!meta.materials) athletic(geo, bones, BUILD);
    /* Scale: rig units per model unit, and how much higher the model's
       ankle sits above its sole than the rig's (3.7) does. */
    const cm = meta.rigPerUnit ?? 1 / 1.1;
    const ankleUp = bones[byName.R_Foot].P.y * cm - 3.7;
    return { name, meta, geo, bones, byName, matNames, mats, cm, ankleUp };
  })();
  job.catch(() => LOADING.delete(name));
  LOADING.set(name, job);
  return job;
}

/* ── an athletic build ──
   The scan is an average, slim man. A trainer carries more muscle, so on
   load the body's surface is pushed out where muscle sits: round
   shoulders, a full chest, lats that widen the back, traps, arms, quads,
   calves; and drawn in a little at the waist. Each point moves along the
   surface's own normal (averaged where seams split it, so no crack
   opens), by an amount from where it sits on its bone in the A-pose, in
   centimetres at BUILD 1. The head, face and hair are left alone. */
const BUILD = 0;   // 0 keeps the scan as it is; about 2.3 gives a clearly athletic build
const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
const ramp = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function athletic(geo, bones, k) {
  if (!k) return;
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const body = new Set();
  const idx = geo.index.array;
  for (const g of geo.groups) if (g.materialIndex === 0) for (let i = g.start; i < g.start + g.count; i++) body.add(idx[i]);
  const keyOf = i => `${P.getX(i).toFixed(2)},${P.getY(i).toFixed(2)},${P.getZ(i).toFixed(2)}`;
  /* One normal per position, so the copies of a seam vertex move together. */
  const nAt = new Map();
  for (const i of body) {
    const key = keyOf(i), n = nAt.get(key) || [0, 0, 0];
    n[0] += N.getX(i); n[1] += N.getY(i); n[2] += N.getZ(i);
    nAt.set(key, n);
  }
  const B = n => bones.find(b => b.name === n).P;
  const seg = (a, c) => { const A0 = B(a), C0 = B(c); const d = new THREE.Vector3().subVectors(C0, A0); const len = d.length(); return { A0, d: d.normalize(), len }; };
  const S = {};
  for (const s of ['R', 'L']) {
    S[`${s}_UpperArm`] = { ...seg(`${s}_UpperArm`, `${s}_Forearm`), out: s === 'R' ? -1 : 1, kind: 'ua' };
    S[`${s}_Clavicle`] = { ...S[`${s}_UpperArm`], kind: 'clav' };
    S[`${s}_Forearm`] = { ...seg(`${s}_Forearm`, `${s}_Hand`), out: s === 'R' ? -1 : 1, kind: 'fa' };
    S[`${s}_Thigh`] = { ...seg(`${s}_Thigh`, `${s}_Calf`), out: s === 'R' ? -1 : 1, kind: 'th' };
    S[`${s}_Calf`] = { ...seg(`${s}_Calf`, `${s}_Foot`), out: s === 'R' ? -1 : 1, kind: 'sh' };
  }
  const v = new THREE.Vector3(), r = new THREE.Vector3(), fr = new THREE.Vector3(), ou = new THREE.Vector3();
  const disp = new Map();
  for (const i of body) {
    let bi = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (w > bw) { bw = w; bi = SI.getComponent(i, j); } }
    const name = bones[bi].name;
    v.fromBufferAttribute(P, i);
    let d = 0;
    const s = S[name];
    if (s) {
      r.subVectors(v, s.A0);
      const t = r.dot(s.d) / s.len;
      fr.set(0, 0, 1).addScaledVector(s.d, -s.d.z).normalize();
      ou.set(s.out, 0, 0).addScaledVector(s.d, -s.d.x * s.out).normalize();
      const rr = r.clone().addScaledVector(s.d, -r.dot(s.d));
      const cf = rr.lengthSq() ? rr.dot(fr) / rr.length() : 0;   // +1 front, −1 back
      const co = rr.lengthSq() ? rr.dot(ou) / rr.length() : 0;   // +1 outside, −1 inside
      if (s.kind === 'ua' || s.kind === 'clav') {
        d += 1.7 * bump(t, 0.02, 0.2) * (0.55 + 0.45 * Math.max(0, co + 0.3));               // deltoid cap
        d += 1.3 * bump(t, 0.52, 0.22) * Math.max(0, cf) ** 0.7;                              // biceps
        d += 1.2 * bump(t, 0.4, 0.26) * Math.max(0, -cf) ** 0.7;                              // triceps
        d += 0.35 * ramp(-0.1, 0.2, t) * (1 - ramp(0.8, 1, t));
      } else if (s.kind === 'fa') {
        d += 0.75 * bump(t, 0.22, 0.22) * (0.6 + 0.4 * Math.max(0, co));
      } else if (s.kind === 'th') {
        d += 1.5 * bump(t, 0.42, 0.3) * (0.55 + 0.45 * Math.max(0, cf + co * 0.5));          // quads and sweep
        d += 0.7 * bump(t, 0.45, 0.3) * Math.max(0, -cf);                                     // hamstrings
        d *= 0.5 + 0.5 * ramp(-0.9, -0.2, co);                                                // less at the inner thigh
      } else if (s.kind === 'sh') {
        d += 1.25 * bump(t, 0.3, 0.17) * Math.max(0.15, -cf);                                 // calves
      }
    } else if (/Pelvis|Spine|Neck/.test(name)) {
      const x = Math.abs(v.x), y = v.y, z = v.z;
      const front = ramp(-1, 3, z), back = 1 - ramp(-3, 1, z);
      d += 1.7 * bump(y, 129, 8) * bump(x, 8.5, 6.5) * front;                                // chest
      d += 0.6 * bump(y, 121, 3.5) * bump(x, 9, 7) * front;                                  // lower pec line
      d += 1.4 * bump(y, 124, 11) * ramp(7, 15, x) * (0.5 + 0.5 * back);                     // lats: a wider back
      d += 0.9 * bump(y, 136, 8) * back;                                                     // upper back
      d += 1.1 * bump(y, 148, 5) * bump(x, 7, 5);                                            // traps
      d += 0.45 * (/Neck/.test(name) ? 1 : 0);                                               // a stronger neck
      d -= 0.5 * bump(y, 108, 4);                                                            // waist, above the hem
      d += 0.8 * bump(y, 86, 7) * back;                                                      // glutes
      d += 0.25 * bump(y, 112, 6) * front * bump(x, 4, 5);                                   // abs
    }
    if (d) disp.set(i, d * k);
  }
  for (const [i, d] of disp) {
    const n = nAt.get(keyOf(i)), l = Math.hypot(n[0], n[1], n[2]) || 1;
    P.setXYZ(i, P.getX(i) + (n[0] / l) * d, P.getY(i) + (n[1] / l) * d, P.getZ(i) + (n[2] / l) * d);
  }
  /* Fresh normals over the body, again one per position. */
  const acc = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const g of geo.groups) {
    if (g.materialIndex !== 0) continue;
    for (let f = g.start; f < g.start + g.count; f += 3) {
      a.fromBufferAttribute(P, idx[f]); b.fromBufferAttribute(P, idx[f + 1]); c.fromBufferAttribute(P, idx[f + 2]);
      const fn = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
      for (const i of [idx[f], idx[f + 1], idx[f + 2]]) { const key = keyOf(i), q = acc.get(key) || [0, 0, 0]; q[0] += fn.x; q[1] += fn.y; q[2] += fn.z; acc.set(key, q); }
    }
  }
  const NN = new Float32Array(N.count * 3);
  for (let i = 0; i < N.count; i++) { NN[i * 3] = N.getX(i); NN[i * 3 + 1] = N.getY(i); NN[i * 3 + 2] = N.getZ(i); }
  for (const i of body) {
    const q = acc.get(keyOf(i)); if (!q) continue;
    const l = Math.hypot(q[0], q[1], q[2]) || 1;
    /* keep the scan's own hard edges: only replace a normal that already
       agrees with the smoothed one */
    if ((q[0] * NN[i * 3] + q[1] * NN[i * 3 + 1] + q[2] * NN[i * 3 + 2]) / l > 0.6) { NN[i * 3] = q[0] / l; NN[i * 3 + 1] = q[1] / l; NN[i * 3 + 2] = q[2] / l; }
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(NN, 3));
}

/* ── small vector helpers on plain arrays ── */
const { add, sub, mul, dot, cross, norm, mad, lerp } = v3;
const perp = (h, a, alt) => {
  const p = sub(h, mul(a, dot(h, a)));
  return v3.len(p) > 1e-3 ? norm(p) : alt ? perp(alt, a) : norm(cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
};
const A = v => [v.x, v.y, v.z];
/* A frame from a direction and a front: columns dir, front, dir × front. */
const frame = (d, f) => { const D = norm(d), Fr = perp(f, D); return [D, Fr, cross(D, Fr)]; };
/* The rotation taking frame b onto frame t, as a THREE.Matrix4 (3×3 part). */
const rotBetween = (b, t) => {
  const m = new THREE.Matrix4();
  const e = m.elements;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    let s = 0;
    for (let k = 0; k < 3; k++) s += t[k][r] * b[k][c];
    e[c * 4 + r] = s;
  }
  return m;
};
const apply3 = (m, v) => { const e = m.elements; return [e[0] * v[0] + e[4] * v[1] + e[8] * v[2], e[1] * v[0] + e[5] * v[1] + e[9] * v[2], e[2] * v[0] + e[6] * v[1] + e[10] * v[2]]; };

/* ── muscle paint on the real body ── */

/* Per-vertex weights for the working (hi) and helper (hi2) muscles, from
   where each vertex sits on its bone in the bind pose: how far along the
   segment, and which way round it (0 front, 90 outside, 180 back), the
   same coordinates stage.js paints its own limbs with. */
function paintWeights(T, hi, hi2, paint) {
  const { geo, bones, byName } = T;
  const P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const n = P.count, w1 = new Float32Array(n), w2 = new Float32Array(n);
  const b = name => bones[byName[name]].P;
  const segs = {};
  for (const [side, sgn] of [['R', -1], ['L', 1]]) {
    const out = [sgn, 0, 0];
    const seg = (a, c, key) => ({ a: A(b(a)), d: norm(sub(A(b(c)), A(b(a)))), len: v3.len(sub(A(b(c)), A(b(a)))), key, out });
    segs[`${side}_UpperArm`] = segs[`${side}_Clavicle`] = segs[`${side}_ShoulderHelper`] = seg(`${side}_UpperArm`, `${side}_Forearm`, 'ua');
    segs[`${side}_Forearm`] = seg(`${side}_Forearm`, `${side}_Hand`, 'fa');
    segs[`${side}_Thigh`] = seg(`${side}_Thigh`, `${side}_Calf`, 'th');
    segs[`${side}_Calf`] = seg(`${side}_Calf`, `${side}_Foot`, 'sh');
  }
  const hip = A(b('Pelvis')), neckY = b('Neck').y;
  const trunkSpan = (neckY - hip[1]) / 0.98;
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = SW.getW ? [SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)][j] : 0; if (w > bw) { bw = w; best = [SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)][j]; } }
    const name = bones[best].name;
    const p = [P.getX(i), P.getY(i), P.getZ(i)];
    let a = 0, c = 0;
    const s = segs[name];
    if (s) {
      const r = sub(p, s.a), t = dot(r, s.d) / s.len;
      const fr = perp([0, 0, 1], s.d), ou = perp(s.out, s.d);
      const phi = Math.atan2(dot(r, ou), dot(r, fr)) * 180 / Math.PI;
      a = paint.limb(s.key, t, phi, hi); c = paint.limb(s.key, t, phi, hi2);
    }
    /* The trunk, and the tops of the thighs (glutes, hip flexors). */
    if (!s || s.key === 'th' || /Clavicle/.test(name)) {
      if (/Pelvis|Spine|Neck|Thigh|Head|Clavicle/.test(name)) {
        const t = (p[1] - hip[1]) / trunkSpan;
        const th = Math.atan2(p[2] - 0.5, -p[0]) * 180 / Math.PI;
        const thd = (th + 360) % 360;
        a = Math.max(a, paint.trunk(t, thd, hi)); c = Math.max(c, paint.trunk(t, thd, hi2));
      }
    }
    w1[i] = a; w2[i] = c;
  }
  return [w1, w2];
}

/* A soft studio for the kit's metal and the skin to reflect: a dim room
   with a broad light overhead and two at the sides, made once per
   renderer. On the skin it is the soft light from above that the baked
   occlusion shades, and the faint sheen along its edges. */
const ENV = new WeakMap(), ENV_K = 0.45;
export function studioEnv(r) {
  if (ENV.has(r)) return ENV.get(r);
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: '#2a2c30', side: THREE.BackSide }));
  sc.add(room);
  const panel = (w, h, pos, rot, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) })); m.position.set(...pos); m.rotation.set(...rot); sc.add(m); };
  panel(5, 2, [0, 2.9, 0], [Math.PI / 2, 0, 0], 4.0);
  panel(3, 3, [-4.9, 1, 1], [0, Math.PI / 2, 0], 1.6);
  panel(2, 4, [3, 0.5, -4.9], [0, 0, 0], 1.0);
  const pm = new THREE.PMREMGenerator(r);
  const env = pm.fromScene(sc, 0.04).texture;
  pm.dispose();
  ENV.set(r, env);
  return env;
}

/* ── how skin takes the light ──
   Shared by the rep (paintedMaterial) and the card's muscle map
   (muscleview.js). Three small changes to the standard shading:
     occlusion  the baked aOcc darkens the soft light (sky and studio) in
                the creases between muscles in full, and the lamps by half,
                for the fine shadow the shadow map is too coarse to draw
     wrap       on skin, light reaches a little past where a surface turns
                away from it, red furthest, the way it scatters under the
                skin: a softer, warmer edge to every shadow
     specular   held back in the creases too, so only the tops of the
                muscles catch a highlight */
const SKIN_PARTS = new Set(['skin', 'head', 'hands', 'bareskin', 'underskin', 'body']);
export const isSkin = name => SKIN_PARTS.has(name);
export function skinLook(sh, skin) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aOcc;\nvarying float vOcc;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOcc = aOcc;');
  let frag = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vOcc;')
    .replace('#include <aomap_fragment>', [
      '#include <aomap_fragment>',
      'float skOpen = 1.0 - vOcc;',
      /* in a skin crease the light that does get in comes back redder */
      skin ? 'vec3 skAO = pow(vec3(skOpen), vec3(1.15, 1.5, 1.65));' : 'vec3 skAO = vec3(skOpen * skOpen);',
      'reflectedLight.indirectDiffuse *= skAO;',
      'reflectedLight.indirectSpecular *= skOpen * skOpen;',
      'reflectedLight.directDiffuse *= mix(vec3(1.0), skAO, 0.6);',
      'reflectedLight.directSpecular *= skOpen;',
    ].join('\n'));
  if (skin) frag = frag.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
    'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    [
      'vec3 skW = vec3( 0.3, 0.15, 0.1 );',
      'vec3 skWrap = clamp( ( dot( geometryNormal, directLight.direction ) + skW ) / ( 1.0 + skW ), 0.0, 1.0 );',
      'reflectedLight.directDiffuse += skWrap * directLight.color * BRDF_Lambert( material.diffuseColor );',
    ].join('\n')));
  sh.fragmentShader = frag;
}

/* The texture materials with the muscle paint mixed in, glowing with
   the rep's effort, exactly as stage.js's own body materials do. aBlend
   fades a grafted part's edge into uNeck, the colour where it joins. */
export function paintedMaterial(opts, U, skin = false) {
  const m = opts.sheen ? new THREE.MeshPhysicalMaterial(opts) : new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = sh => {
    skinLook(sh, skin);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMus;\nattribute float aMus2;\nattribute float aBlend;\nvarying float vMus;\nvarying float vMus2;\nvarying float vBlend;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMus = aMus;\nvMus2 = aMus2;\nvBlend = aBlend;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uMusCol;\nuniform vec3 uMusCol2;\nuniform vec3 uNeck;\nuniform float uEffort;\nuniform float uMusOn;\nvarying float vMus;\nvarying float vMus2;\nvarying float vBlend;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uNeck, vBlend);',
        'float mE = clamp((uEffort - 0.45) / 0.55, 0.0, 1.0);',
        'float mA = vMus * uMusOn, mB = vMus2 * uMusOn;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol2, mB * 0.7);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol, min(1.0, mA * (0.82 + 0.18 * mE)));',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance += uMusCol * mA * (0.1 + 0.4 * mE) + uMusCol2 * mB * 0.05;',
      ].join('\n'));
  };
  m.customProgramCacheKey = () => (skin ? 'trainer-paint-skin' : 'trainer-paint');
  return m;
}

/* ── which way the palms face ── */

/* Keywords, in the body's frame: fwd / back / up / down / in / out, floor
   and ceiling in the world's, sup for a curl (toward the inside of the
   elbow's bend). 'in+down' adds two, so the palm turns from one to the
   other as the hand swings between them (a lateral raise: palms in at the
   sides, down at the top). */
function palmVec(kw, J, s) {
  if (typeof kw === 'string' && kw.includes('+')) return kw.split('+').reduce((a, k) => add(a, palmVec(k, J, s)), [0, 0, 0]);
  const { F, U, L } = J;
  switch (kw) {
    case 'fwd': return F;
    case 'back': return mul(F, -1);
    case 'up': return U;
    case 'down': return mul(U, -1);
    case 'in': return mul(L, -s.side);
    case 'out': return mul(L, s.side);
    case 'floor': return [0, -1, 0];
    case 'ceiling': return [0, 1, 0];
    case 'sup': return perp(mul(s.uaDir, -1), s.faDir, J.F);
    default: return Array.isArray(kw) ? kw : J.F;
  }
}
const HOLD_PALM = { db: 'fwd', 'db-side': 'in', 'db-fwd': 'in', 'db-axial': 'in', 'db-both': 'in', 'db-goblet': 'in', bb: 'back', 'bb-rack': 'up', wheel: 'floor', 'db-feet': 'in', hip: 'down' };
/* `isPlanted`, when the stage can say, tells a hand set on the kit or the
   floor from one placed on the body (both hands on the dumbbell across
   the hips), which holds what is there rather than bracing on it. */
function handState(J, m, p, s, isPlanted) {
  const far = s.side < 0, h = m.hold || {};
  const own = far ? h.f : h.n;
  const both = ['db-axial', 'db-both', 'db-goblet', 'bb', 'bb-rack', 'wheel'].includes(h.n) ? h.n : null;
  const target = p[far ? 'fhand' : 'hand'], tw = p[far ? 'fhandW' : 'handW'] ?? 1;
  const onKit = Array.isArray(target) && (!isPlanted || isPlanted(target, far ? 'fhand' : 'hand'));
  const held = own || both || (h.hip && Array.isArray(target) && !onKit ? 'hip' : null);
  const planted = onKit && tw > 0.5;
  /* A hand that carries the body high up is on the bar; low down, on the
     floor (a handstand, a planche). */
  const high = s.wri[1] > 60;
  const onBar = high && (p.root === 'wri' || p.root === 'fwri' || planted);
  const flat = !high && (planted || p.root === 'wri' || p.root === 'fwri') && Math.abs(dot(s.handDir, [0, 1, 0])) < 0.6;
  const ex = m.palm && (typeof m.palm === 'object' && !Array.isArray(m.palm) ? m.palm[far ? 'f' : 'n'] : m.palm);
  const kw = ex || (held ? HOLD_PALM[held] : onBar ? 'fwd' : flat ? 'floor' : 'in');
  const grip = held || onBar ? 1 : flat ? 0 : planted ? 0.6 : 0.3;
  return { palm: palmVec(kw, J, s), grip };
}

/* ══ ONE TRAINER IN ONE SCENE ══ */

export class Trainer {
  constructor(T, pal, m, paint) {
    this.T = T;
    this.m = m;
    this.CM = T.cm;
    this.ankleUp = T.ankleUp;
    const skinCol = T.mats.skin?.neck || T.mats.skin?.color || '#c39071';
    const U = this.uniforms = { uMusCol: { value: pal.muscle.clone() }, uMusCol2: { value: pal.muscle2.clone() }, uEffort: { value: 0.45 }, uMusOn: { value: 1 }, uNeck: { value: new THREE.Color(skinCol) } };
    const geo = T.geo.clone();
    const [w1, w2] = paint.weights ? paint.weights(T, m) : paintWeights(T, m.hi || [], m.hi2 || [], paint);
    geo.setAttribute('aMus', new THREE.BufferAttribute(w1, 1));
    geo.setAttribute('aMus2', new THREE.BufferAttribute(w2, 1));
    const mats = T.matNames.map(n => {
      const d = T.mats[n];
      const o = { roughness: d.roughness ?? 0.6, metalness: 0 };
      if (d.color) o.color = new THREE.Color(d.color);
      if (d.map) o.map = d.map;
      if (d.normalMap) { o.normalMap = d.normalMap; o.normalScale = new THREE.Vector2(d.normalScale ?? 0.8, d.normalScale ?? 0.8); }
      if (d.alphaTest) { o.alphaTest = d.alphaTest; o.side = THREE.DoubleSide; }
      if (d.doubleSide) o.side = THREE.DoubleSide;
      /* cloth: a soft sheen at grazing angles, the way knit fabric catches light */
      if (d.sheen) Object.assign(o, { sheen: d.sheen, sheenRoughness: 0.55, sheenColor: new THREE.Color('#9aa0a8') });
      const mat = d.paint ? paintedMaterial(o, U, isSkin(n)) : (o.sheen ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o));
      mat.visible = !d.hidden;   // a part kept only for tools (the skin under the shorts)
      mat.name = n;
      return mat;
    });
    this.group = new THREE.Group();
    this.bones = T.bones.map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; this.group.add(b); return b; });
    const mesh = this.mesh = new THREE.SkinnedMesh(geo, mats);
    mesh.bind(new THREE.Skeleton(this.bones, T.bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    this.prep();
  }

  /* The studio (studioEnv) on every part of the body, once the renderer
     is known. */
  useEnv(env, k = ENV_K) {
    for (const m of this.mesh.material) { m.envMap = env; m.envMapIntensity = k; m.needsUpdate = true; }
  }

  /* Bind-pose frames for every driven bone, worked out once. */
  prep() {
    const { bones, byName } = this.T;
    const P = n => A(bones[byName[n]].P);
    const Z = [0, 0, 1], Y = [0, 1, 0];
    const B = this.bind = {};
    B.Pelvis = frame(sub(P('Spine'), P('Pelvis')), Z);
    for (const n of ['Spine', 'Spine1', 'Spine2']) B[n] = frame(sub(P(n === 'Spine2' ? 'Neck' : n === 'Spine1' ? 'Spine2' : 'Spine1'), P(n)), Z);
    B.Neck = frame(sub(P('Head'), P('Neck')), Z);
    B.Head = frame(Y, Z);
    for (const S of ['R', 'L']) {
      const sgn = S === 'R' ? -1 : 1;
      B[`${S}_Clavicle`] = frame(sub(P(`${S}_UpperArm`), P(`${S}_Clavicle`)), Z);
      B[`${S}_UpperArm`] = frame(sub(P(`${S}_Forearm`), P(`${S}_UpperArm`)), Z);
      const hd = norm(sub(P(`${S}_Finger2`), P(`${S}_Hand`)));
      const across = norm(sub(P(`${S}_Finger1`), P(`${S}_Finger4`)));
      const palm = norm(mul(cross(hd, across), sgn));
      this[`palm${S}`] = palm;
      B[`${S}_Hand`] = frame(hd, palm);
      B[`${S}_Forearm`] = frame(sub(P(`${S}_Hand`), P(`${S}_Forearm`)), palm);
      B[`${S}_Thigh`] = frame(sub(P(`${S}_Calf`), P(`${S}_Thigh`)), Z);
      B[`${S}_Calf`] = frame(sub(P(`${S}_Foot`), P(`${S}_Calf`)), Z);
      const fwd = sub(P(`${S}_Toe0`), P(`${S}_Foot`)); fwd[1] = 0;
      B[`${S}_Foot`] = frame(fwd, Y);
      /* the tip of this foot: its skin point farthest along the foot */
      {
        const g = this.T.geo, Pp = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
        const fi = byName[`${S}_Foot`], ti = byName[`${S}_Toe0`], f0 = P(`${S}_Foot`), d = norm(fwd);
        let best = f0, bd = -1e9;
        for (let i = 0; i < Pp.count; i++) {
          let b = 0, bw = -1; for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (w > bw) { bw = w; b = SI.getComponent(i, j); } }
          if (b !== fi && b !== ti) continue;
          const q = [Pp.getX(i), Pp.getY(i), Pp.getZ(i)], t = dot(sub(q, f0), d) - 0.15 * Math.abs(q[1]);
          if (t > bd) { bd = t; best = q; }
        }
        (this.toeTip ||= {})[S] = best;
      }
      /* Fingers: each chain's bones in order, and the axis it curls about
         (square to the finger and the palm, so it closes into the palm). */
      this[`fingers${S}`] = [0, 1, 2, 3, 4].map(k => {
        const names = [`${S}_Finger${k}`, `${S}_Finger${k}1`, `${S}_Finger${k}2`].filter(n => byName[n] !== undefined);
        const d = norm(sub(P(names[1] || names[0]), P(names[0])));
        let axis = norm(cross(d, palm));
        if (k === 0) axis = norm(cross(d, add(palm, mul(hd, -0.4))));
        return { names, axis };
      });
    }
  }

  palmAt(side) { return this.palms?.[side] || null; }

  /* Where the vertices `ids` are in the pose just set, as x, y, z runs in
     `out`: the skinning sum worked out here directly, many times faster
     than one getVertexPosition call per vertex (the bind and inverse
     matrices are identity, so a bone's world matrix is its skinning). */
  skinAt(ids, out = new Float32Array(ids.length * 3)) {
    const g = this.mesh.geometry, P = g.attributes.position.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
    const E = this.bones.map(b => b.matrixWorld.elements);
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k], x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2];
      let ox = 0, oy = 0, oz = 0;
      for (let j = 0; j < 4; j++) {
        const w = SW[4 * i + j];
        if (!w) continue;
        const e = E[SI[4 * i + j]], s = w / 255;
        ox += s * (e[0] * x + e[4] * y + e[8] * z + e[12]);
        oy += s * (e[1] * x + e[5] * y + e[9] * z + e[13]);
        oz += s * (e[2] * x + e[6] * y + e[10] * z + e[14]);
      }
      out[3 * k] = ox; out[3 * k + 1] = oy; out[3 * k + 2] = oz;
    }
    return out;
  }
  /* A fixed sample of the vertices led by bones whose names match `re`. */
  sampleOf(re, every) {
    const g = this.mesh.geometry, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, n = g.attributes.position.count, ids = [];
    for (let i = 0; i < n; i += every) {
      let b = 0, bw = -1;
      for (let j = 0; j < 4; j++) if (SW[4 * i + j] > bw) { bw = SW[4 * i + j]; b = SI[4 * i + j]; }
      if (re.test(this.T.bones[b].name)) ids.push(i);
    }
    return ids;
  }
  /* Skin points for resting the body on a bench, in the pose just set, as
     x, y, z runs: 'trunk' (pelvis to head, the shoulders' tops), 'seat'
     (pelvis and thighs: what sits), or 'all' (those, the upper arms and
     thighs; shins hang off a bench's end and hands and feet are the
     rig's to plant). */
  restPoints(set = 'all') {
    const R = (this.restSets ||= {});
    if (!R[set]) {
      const re = { trunk: /^(Pelvis|Spine\d?|Neck|Head|[LR]_(Clavicle|ShoulderHelper))$/, seat: /^(Pelvis|[LR]_Thigh)$/,
        all: /^(Pelvis|Spine\d?|Neck|Head|[LR]_(Thigh|Clavicle|ShoulderHelper|UpperArm))$/ }[set];
      const ids = this.sampleOf(re, 25);   // about one point a unit over the back
      R[set] = { ids, out: new Float32Array(ids.length * 3) };
    }
    return this.skinAt(R[set].ids, R[set].out);
  }

  /* Each sole's points (the underside of the foot in the A-pose), in the
     pose just set, as x, y, z runs: { R, L }. For the contact shadows. */
  soles() {
    if (!this.soleIdx) {
      const P = this.mesh.geometry.attributes.position.array;
      this.soleIdx = {};
      for (const s of ['R', 'L']) {
        const ids = this.sampleOf(new RegExp(`^${s}_(Foot|Toe0)$`), 1).filter(i => P[3 * i + 1] < 2.5);
        const step = Math.max(1, Math.floor(ids.length / 40));
        const pick = ids.filter((_, k) => k % step === 0);
        this.soleIdx[s] = { ids: pick, out: new Float32Array(pick.length * 3) };
      }
    }
    const o = {};
    for (const s of ['R', 'L']) o[s] = this.skinAt(this.soleIdx[s].ids, this.soleIdx[s].out);
    return o;
  }

  /* The lowest point of the body, from a fixed sample of skin points, in
     the pose just set. Every part can rest on the floor; the small ones
     (hands, feet, head) are sampled densely so a fingertip or toe is not
     missed. */
  lowest() {
    if (!this.lowIdx) {
      const body = this.sampleOf(/^(?!.*(Hand|Finger|Foot|Toe|Head))/, 1), fine = this.sampleOf(/Hand|Finger|Foot|Toe|Head/, 1);
      const step = Math.max(1, Math.floor(body.length / 3000)), fstep = Math.max(1, Math.floor(fine.length / 3000));
      this.lowIdx = [...body.filter((_, k) => k % step === 0), ...fine.filter((_, k) => k % fstep === 0)];
      this.lowOut = new Float32Array(this.lowIdx.length * 3);
    }
    const o = this.skinAt(this.lowIdx, this.lowOut);
    let y = Infinity;
    for (let k = 1; k < o.length; k += 3) if (o[k] < y) y = o[k];
    return y;
  }

  /* Place every bone for the rig's skeleton J. */
  update(J, effort, p) {
    this.uniforms.uEffort.value = effort;
    const { bones, byName } = this.T;
    const P = n => A(bones[byName[n]].P);
    const CM = this.CM;
    const W = {};          // bone name → { R (Matrix4 rotation), p (rig units) }
    /* A bone's skinning matrix: its bind point lands on `at`, its bind frame
       turns by R, and (stretch k) it lengthens or shortens along its own
       axis so a model with other proportions still meets every rig joint. */
    const set = (name, R, at, k = 1) => {
      W[name] = { R, p: at };
      let M = R;
      if (Math.abs(k - 1) > 1e-3) {
        const d = this.bind[name][0], e3 = new THREE.Matrix4();
        e3.set(1 + (k - 1) * d[0] * d[0], (k - 1) * d[0] * d[1], (k - 1) * d[0] * d[2], 0,
          (k - 1) * d[1] * d[0], 1 + (k - 1) * d[1] * d[1], (k - 1) * d[1] * d[2], 0,
          (k - 1) * d[2] * d[0], (k - 1) * d[2] * d[1], 1 + (k - 1) * d[2] * d[2], 0, 0, 0, 0, 1);
        M = new THREE.Matrix4().multiplyMatrices(R, e3);
      }
      const e = new THREE.Matrix4().copy(M);
      const sR = e.elements;
      for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) sR[i] *= CM;
      const b0 = P(name);
      const t = sub(at, apply3(M, mul(b0, CM)));
      sR[12] = t[0]; sR[13] = t[1]; sR[14] = t[2]; sR[3] = sR[7] = sR[11] = 0; sR[15] = 1;
      const bone = this.bones[byName[name]];
      bone.matrix.copy(e);
      bone.matrixWorld.copy(e);
    };
    const CHILD = { UpperArm: 'Forearm', Forearm: 'Hand', Thigh: 'Calf', Calf: 'Foot', Clavicle: 'UpperArm' };
    const stretch = (name, len) => {
      const c = CHILD[name.slice(2)];
      if (!c || len == null) return 1;
      const bl = v3.len(sub(P(`${name[0]}_${c}`), P(name))) * CM;
      return Math.max(0.6, Math.min(1.6, len / (bl || 1)));
    };
    /* A child placed rigidly from its parent's transform, as in the bind pose. */
    const follow = (name, parent, extraR) => {
      const q = W[parent];
      const off = mul(sub(P(name), P(parent)), CM);
      const R = extraR ? new THREE.Matrix4().multiplyMatrices(q.R, extraR) : q.R;
      set(name, R, add(q.p, apply3(q.R, off)));
    };
    const drive = (name, at, d, f, len) => set(name, rotBetween(this.bind[name], frame(d, f)), at, stretch(name, len));

    /* The spine, along the rig's own arc. */
    const hipY = P('Pelvis')[1];
    const spineT = n => ((P(n)[1] - hipY) * CM) / SEG.torso;
    const S0 = J.spine(0);
    drive('Pelvis', S0.p, S0.T, S0.N);
    for (const n of ['Spine', 'Spine1', 'Spine2']) {
      const S = J.spine(spineT(n));
      drive(n, mad(S.p, S.N, P(n)[2] * CM), S.T, S.N);
    }
    const SN = J.spine(spineT('Neck'));
    const neckAt = mad(SN.p, SN.N, P('Neck')[2] * CM);
    const H = J.head;
    drive('Neck', neckAt, add(SN.T, H.dir), add(SN.N, H.face));
    drive('Head', add(neckAt, apply3(rotBetween(this.bind.Head, frame(H.dir, H.face)), mul(sub(P('Head'), P('Neck')), CM))), H.dir, H.face);

    for (const [S, s] of [['R', J.n], ['L', J.f]]) {
      const st = handState(J, this.m, p, s, this.isPlanted);
      /* Clavicle from the upper spine to the rig's shoulder. */
      const S2 = W.Spine2;
      const clavAt = add(S2.p, apply3(S2.R, mul(sub(P(`${S}_Clavicle`), P('Spine2')), CM)));
      drive(`${S}_Clavicle`, clavAt, sub(s.sho, clavAt), J.spine(0.9).N, v3.len(sub(s.sho, clavAt)));
      drive(`${S}_UpperArm`, s.sho, s.uaDir, s.uaFront, v3.len(sub(s.elb, s.sho)));
      /* The shoulder's helper joint swings half as far as the arm, from the
         chest's frame, so skin across the joint keeps its volume. Half of
         the arm's swing away from where it hangs in the bind pose, not half
         of its whole turn: the halfway turn takes the short way round, and
         with the arm overhead the short way flips sides from one frame to
         the next. The swing never nears 180°, so it never flips. */
      if (byName[`${S}_ShoulderHelper`] !== undefined) {
        const q0 = new THREE.Quaternion().setFromRotationMatrix(W.Spine2.R);
        const rest = new THREE.Vector3(...this.bind[`${S}_UpperArm`][0]).applyQuaternion(q0);
        const swing = new THREE.Quaternion().setFromUnitVectors(rest, new THREE.Vector3(...s.uaDir));
        const half = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), swing, 0.5).multiply(q0);
        set(`${S}_ShoulderHelper`, new THREE.Matrix4().makeRotationFromQuaternion(half), s.sho);
      }
      const palm = perp(st.palm, s.handDir, s.faFront);
      /* The forearm turns with the hand: the palm carried back through the
         wrist's bend by the smallest turn. Projecting the palm onto the
         forearm instead fails where the palm faces along it (a hand flat
         on the floor under a straight arm): what is left is tiny, points
         anywhere, and the forearm spun from one frame to the next. */
      const wristTurn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...s.handDir), new THREE.Vector3(...s.faDir));
      const faPalm = new THREE.Vector3(...palm).applyQuaternion(wristTurn);
      drive(`${S}_Forearm`, s.elb, s.faDir, perp([faPalm.x, faPalm.y, faPalm.z], s.faDir, s.faFront), v3.len(sub(s.wri, s.elb)));
      drive(`${S}_Hand`, s.wri, s.handDir, palm);
      /* Where a handle sits in this hand: across the palm, a little under
         halfway from the wrist to the fingertips and just off the skin, so
         the curled fingers close round it. */
      (this.palms ||= {})[s.side > 0 ? 'n' : 'f'] = mad(mad(s.wri, s.handDir, SEG.hand * 0.46), palm, 2.3);
      /* Fingers close round a handle, lie flat, or hang loose. */
      const curl = st.grip;
      for (const [k, f] of this[`fingers${S}`].entries()) {
        let parent = `${S}_Hand`;
        const per = k === 0 ? [0.25, 0.35, 0.3][0] * curl : curl;
        f.names.forEach((n, j) => {
          /* a flat hand lies flat: no resting curl, the thumb laid out
             along the floor rather than at its relaxed downward angle */
          const flatHand = curl < 0.05;
          const ang = (k === 0 ? [30, 25, 20][j] : [62, 85, 55][j]) * per + (flatHand ? (k === 0 ? -14 : -2) : (k === 0 ? 0 : 6));
          const R = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...f.axis), ang * Math.PI / 180);
          /* Curl is a turn about the joint, in the bind pose's frame: the
             parent's rotation, then this joint's own bend. */
          const q = W[parent];
          const off = mul(sub(P(n), P(parent)), CM);
          const prevBend = W[parent].bend || new THREE.Matrix4();
          const bend = new THREE.Matrix4().multiplyMatrices(prevBend, R);
          const hand = W[`${S}_Hand`];
          const Rw = new THREE.Matrix4().multiplyMatrices(hand.R, bend);
          const at = add(q.p, apply3(new THREE.Matrix4().multiplyMatrices(hand.R, prevBend), off));
          set(n, Rw, at);
          W[n].bend = bend;
          parent = n;
        });
      }
      /* Legs: the foot bone sits above the rig's ankle by the difference in
         ankle height, so the sole meets the floor where the rig's does. */
      drive(`${S}_Thigh`, s.hip, s.thDir, s.thFront, v3.len(sub(s.kne, s.hip)));
      /* The shin's front: with the knee bent it faces the way the thigh
         points (the rig's own shin front is undefined at a right angle);
         straight, the thigh adds nothing and the rig's front stands. */
      const front = sh => {
        const flex = -dot(sh, s.thFront);              // > 0: the shin swings toward the back of the thigh
        const kf = Math.max(0, Math.min(1, (flex - 0.04) / 0.12));
        const bentFront = perp(s.thDir, sh, s.shFront), straightFront = perp(s.shFront, sh, s.thFront);
        return perp(add(mul(straightFront, 1 - kf), mul(bentFront, kf)), sh, bentFront);
      };
      /* The top of the foot, from the ankle's hinge (the knee's own side to
         side axis) rather than from the shin: with the toes pointed the
         foot runs nearly in line with the shin and the shin alone cannot
         say which way the foot faces. Flexed, the top of the foot faces up;
         pointed, it faces the way the shin's front does. */
      const hinge = norm(cross(s.shDir, front(s.shDir)));
      let fd = s.footDir, up = norm(cross(hinge, fd));
      /* This foot is longer than the rig's: where its toes would go through
         the floor (a pointed foot hanging low, the toes of a push-up), the
         ankle turns just enough to keep the tips on top. */
      const floor = this.surfaceAt ? Math.max(this.surfaceAt(s.ank), this.surfaceAt(s.toe)) : (this.floorTop ?? 0), tipB = this.toeTip[S], fb = P(`${S}_Foot`);
      const tipY = (f2, u2) => {
        const R = rotBetween(this.bind[`${S}_Foot`], frame(f2, u2));
        return mad(s.ank, u2, this.ankleUp)[1] + apply3(R, mul(sub(tipB, fb), CM))[1];
      };
      if (tipY(fd, up) < floor - 0.3) {
        const turn = a => { const r = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...hinge), a * Math.PI / 180); return [norm(apply3(r, fd)), norm(apply3(r, up))]; };
        /* the way that lifts the toes faster; but a foot already being
           turned keeps its way while that still works, or one passing
           straight down would flip from one way to the other mid-rep */
        const last = (this.toeTurn ||= {})[S];
        const sgn = last && tipY(...turn(last * 80)) >= floor + 0.1 ? last : tipY(...turn(5)) > tipY(...turn(-5)) ? 1 : -1;
        let lo = 0, hi = 80;
        if (tipY(...turn(sgn * hi)) >= floor + 0.1) {
          for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (tipY(...turn(sgn * m)) >= floor + 0.1) hi = m; else lo = m; }
          [fd, up] = turn(sgn * hi);
          this.toeTurn[S] = sgn;
        } else this.toeTurn[S] = 0;
      } else if (this.toeTurn) this.toeTurn[S] = 0;
      const footAt = mad(s.ank, up, this.ankleUp);
      const shinDir = norm(sub(footAt, s.kne));
      drive(`${S}_Calf`, s.kne, shinDir, front(shinDir), v3.len(sub(footAt, s.kne)));
      drive(`${S}_Foot`, footAt, fd, up);
      follow(`${S}_Toe0`, `${S}_Foot`);
    }
  }
}
