/* ═══════════════════════════════════════════════════════════
   WORKOUT — 3D STAGE

   Draws an exercise's rep in 3D with three.js: a clay-style mannequin
   (shirt, shorts, shoes), the working muscles as raised shapes on it that
   tighten and glow through the rep, the program's own kit, studio light
   with real shadows, and a camera that frames the whole rep and can be
   dragged round. rig.js says where everything is; this file only makes
   it visible.

   Loaded on demand (pose.js imports it the first time a lab opens), so
   three.js costs nothing until someone looks at an exercise. One WebGL
   renderer is shared and its canvas moves into whichever lab is open.

   Every colour comes from the theme's tokens, read when the lab opens:
   the figure is the text greys, the working muscle the body map's
   primary, the helpers its secondary.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { MOTION } from './moves.js?v=3d-oct14d';
import { timeline } from './timeline.js?v=3d-oct14d';
import { skeleton, holds, points, normalize, SEG, BODY, v3, W } from './rig.js?v=3d-oct14d';
import { loadTrainer, Trainer, studioEnv } from './avatar.js?v=3d-oct14f';
import { axisLock } from './drag.js?v=3d-oct14d';
import { regionPaint } from './muscles3d.js?v=3d-oct14d';
import { MMAP } from './data.js?v=3d-oct14d';

const D = Math.PI / 180;
/* A pose's planted marks: hands and feet (timeline.js's targets). */
const MARK = /^(f|a|b)?(hand|foot)$/;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* ── theme ── */

function palette(el) {
  const cs = getComputedStyle(el || document.documentElement);
  const c = name => new THREE.Color((cs.getPropertyValue(name) || '#888').trim() || '#888');
  const hex = h => new THREE.Color(h);
  const mix = (a, b, k) => a.clone().lerp(b, k);
  const bg = c('--bg'), t3 = c('--text-3');
  const light = bg.getHSL({}).l > 0.5;
  /* The person and the kit look like a person and kit, whatever the
     theme: a young, fit trainer with fair skin, short dark hair, a
     fitted blue tee, grey shorts and white trainers;
     a black-vinyl bench on a steel frame, black dumbbells with red
     plates. Distinct hues, so clothes never melt into the bench. Only
     the room (floor, wall, mat) and the muscle paint follow the theme. */
  return {
    light,
    skin: hex('#e8b995'),
    shirt: hex('#2f6db5'),
    shorts: hex('#5a6170'),
    shoe: hex('#eef0f2'),
    sole: hex('#2c2e33'),
    hair: hex('#3a2618'),
    steel: hex('#a9afb7'),
    pad: hex('#2a2a2f'),
    plate: hex('#2a2c31'),
    plateDark: hex('#b0352b'),
    wall: mix(t3, bg, light ? 0.72 : 0.8),
    mat: light ? hex('#c9cfd6') : hex('#30363c'),
    book: hex('#6b4f3a'),
    book2: hex('#3f5f7a'),
    floor: c('--bg-alt'),
    muscle: c('--map-p'),
    muscle2: c('--map-s'),
    accent: c('--blue'),
  };
}

/* ── geometry helpers ── */

/* A limb: a lathe along +Y from 0 to len with rounded ends, its radius
   following `prof` ([t, r] pairs) so muscles swell and joints narrow. */
function limbGeo(len, prof, seg = 20) {
  const pts = [];
  const r0 = prof[0][1], r1 = prof[prof.length - 1][1];
  for (let i = 0; i <= 6; i++) { const a = -90 + i * 15; pts.push(new THREE.Vector2(r0 * Math.cos(a * D), r0 * 0.85 * Math.sin(a * D))); }
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    let r = r1;
    for (let k = 0; k < prof.length - 1; k++) {
      const [ta, ra] = prof[k], [tb, rb] = prof[k + 1];
      if (t >= ta && t <= tb) { const u = (t - ta) / (tb - ta || 1); r = ra + (rb - ra) * (0.5 - 0.5 * Math.cos(Math.PI * u)); break; }
    }
    pts.push(new THREE.Vector2(r, t * len));
  }
  for (let i = 0; i <= 6; i++) { const a = i * 15; pts.push(new THREE.Vector2(r1 * Math.cos(a * D), len + r1 * 0.85 * Math.sin(a * D))); }
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

/* A box with rounded edges (pads, plates, blocks), centred on the origin. */
function roundBox(w, h, d, r, seg = 3, exact = true) {
  r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  /* The bevel grows the outline by r all round, so for a box of exactly
     w × h × d (a pad or mat the body rests on) the outline is drawn r in
     from each side. Without `exact` the outline is the full size and the
     box comes out 2r bigger, as the held kit's shapes were drawn. */
  const b = exact ? r * 0.98 : 0;
  const ow = w - 2 * b, oh = h - 2 * b, c = exact ? Math.max(0.001, Math.min(r * 0.6, ow / 2 - 0.001, oh / 2 - 0.001)) : r;
  const s = new THREE.Shape();
  const x = -ow / 2 + c, y = -oh / 2 + c, ww = ow - 2 * c, hh = oh - 2 * c;
  s.moveTo(x, y - c);
  s.lineTo(x + ww, y - c); s.quadraticCurveTo(x + ww + c, y - c, x + ww + c, y);
  s.lineTo(x + ww + c, y + hh); s.quadraticCurveTo(x + ww + c, y + hh + c, x + ww, y + hh + c);
  s.lineTo(x, y + hh + c); s.quadraticCurveTo(x - c, y + hh + c, x - c, y + hh);
  s.lineTo(x - c, y); s.quadraticCurveTo(x - c, y - c, x, y - c);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  g.computeVertexNormals();
  return g;
}

/* Orient an object so its +Y runs along `axis` and +Z faces `front`. */
const BASIS = new THREE.Matrix4();
function orient(obj, axis, front) {
  const y = V(axis).normalize();
  let z = V(front);
  z.sub(y.clone().multiplyScalar(z.dot(y)));
  /* A front that runs along the axis says nothing: pick any direction
     square to the axis instead, so the object is never left unoriented. */
  if (z.lengthSq() < 1e-6) {
    const ref = Math.abs(y.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    z = ref.sub(y.clone().multiplyScalar(ref.dot(y)));
  }
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  BASIS.makeBasis(x, y, z);
  obj.quaternion.setFromRotationMatrix(BASIS);
}
/* A cylinder between two points. */
function rod(a, b, r, mat, seg = 12) {
  const len = v3.len(v3.sub(b, a));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(V(v3.lerp(a, b, 0.5)));
  orient(m, v3.sub(b, a), [0, 0, 1]);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ══ THE MANNEQUIN ══ */

/* An athletic build: full shoulders and arms, a V from the chest to a
   narrow waist, quads that sweep out and calves high on the shin. */
const PROF = {
  ua: [[0, 6.3], [0.2, 6.4], [0.47, 6.0], [0.8, 4.7], [1, 4.1]],
  fa: [[0, 4.4], [0.18, 5.0], [0.6, 3.8], [1, 2.9]],
  th: [[0, 8.4], [0.25, 8.3], [0.7, 6.6], [1, 5.0]],
  sh: [[0, 5.0], [0.22, 6.0], [0.55, 4.5], [1, 3.2]],
};
/* The torso's cross-section along the spine: half-width, half-depth, and
   how far the section's centre sits in front of the spine. */
const TORSO = [[-0.18, 8.6, 6.4, -0.6], [-0.08, 13.0, 8.6, -1.4], [0.05, 12.8, 8.8, -1.6], [0.22, 12.0, 7.6, -0.2],
  [0.38, 11.4, 7.2, 0.3], [0.55, 12.8, 8.6, 0.8], [0.72, 14.9, 10.2, 1.3], [0.86, 16.3, 9.4, 0.8], [0.95, 12.9, 7.2, 0.0], [1.01, 6.2, 5.0, 0.2]];
const torsoAt = t => {
  for (let i = 0; i < TORSO.length - 1; i++) {
    const a = TORSO[i], b = TORSO[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const u = (t - a[0]) / (b[0] - a[0]), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      return [a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e, a[3] + (b[3] - a[3]) * e];
    }
  }
  const z = t < TORSO[0][0] ? TORSO[0] : TORSO[TORSO.length - 1];
  return [z[1], z[2], z[3]];
};

/* ── painted muscles ──
   The working muscles are painted onto the body's own surface rather
   than stuck on top of it: every body mesh carries two per-vertex weights
   (aMus for the working muscles, aMus2 for the helpers), worked out once
   from where each vertex sits on its segment. The body's materials blend
   the muscle colour in by those weights and add a glow that rises with
   the rep's effort, so the muscle tightens into colour as the rep peaks. */

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const band = (t, t0, t1, fade = 0.08) => smooth(t0 - fade * 0.3, t0 + fade, t) * (1 - smooth(t1 - fade, t1 + fade * 0.3, t));
const angDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const arc = (phi, centre, hw) => 1 - smooth(hw * 0.6, hw + 12, angDist(phi, centre));

/* Limb muscles: segment, t range, centre angle round the limb (0 is the
   segment's front, 180 its back, 90 the outside), half-width. */
const LIMB_MUS = {
  biceps: [['ua', 0.26, 0.88, 0, 58]],
  brachialis: [['ua', 0.55, 0.98, 62, 36]],
  triceps: [['ua', 0.14, 0.9, 180, 72]],
  'front delts': [['ua', -0.2, 0.26, 20, 55], ['delt', 0, 0, 0, 0]],
  'side delts': [['ua', -0.2, 0.26, 90, 50], ['delt', 0, 0, 90, 0]],
  'rear delts': [['ua', -0.2, 0.26, 160, 55], ['delt', 0, 0, 180, 0]],
  forearms: [['fa', 0.02, 0.72, 0, 180]],
  quads: [['th', 0.06, 0.93, 0, 72]],
  hamstrings: [['th', 0.1, 0.93, 180, 72]],
  'hip flexors': [['th', -0.1, 0.3, 10, 50]],
  calves: [['sh', 0.0, 0.58, 180, 78]],
};
/* Trunk muscles: t range along the spine, centre angles round the torso
   (90 front, 270 back, 0 and 180 the sides), half-width, and a pattern. */
const TRUNK_MUS = {
  chest: [[0.6, 0.93, [63, 117], 27]],
  abs: [[0.1, 0.6, [90], 23, 'pack']],
  obliques: [[0.17, 0.57, [30, 150], 19]],
  serratus: [[0.54, 0.72, [20, 160], 12, 'ribs']],
  lats: [[0.44, 0.88, [312, 228], 34, 'taper']],
  traps: [[0.83, 1.02, [270], 72]],
  erectors: [[0.0, 0.52, [261, 279], 8]],
  glutes: [[-0.14, 0.2, [248, 292], 30]],
  'hip flexors': [[-0.08, 0.16, [62, 118], 16]],
};

function limbWeight(segName, t, phi, keys) {
  let w = 0;
  for (const k of keys) for (const [s, t0, t1, c, hw] of LIMB_MUS[k] || []) {
    if (s !== segName) continue;
    w = Math.max(w, band(t, t0, t1) * (hw >= 180 ? 1 : arc(phi, c, hw)));
  }
  return w;
}
function trunkWeight(t, th, keys) {
  let w = 0;
  for (const k of keys) for (const [t0, t1, cs, hw, pat] of TRUNK_MUS[k] || []) {
    const b = band(t, t0, t1, 0.06);
    if (!b) continue;
    let h = hw;
    if (pat === 'taper') h = hw * (0.35 + 0.65 * smooth(t0, t1, t));
    let a = Math.max(...cs.map(c => arc(th, c, h)));
    if (pat === 'pack') a *= (1 - 0.65 * Math.exp(-((angDist(th, 90) / 2.6) ** 2)))
      * (1 - 0.5 * Math.exp(-(((t - 0.27) / 0.02) ** 2)) - 0.5 * Math.exp(-(((t - 0.43) / 0.02) ** 2)));
    if (pat === 'ribs') a *= 0.6 + 0.4 * Math.cos((t - t0) * 60);
    w = Math.max(w, b * a);
  }
  return w;
}
/* Paint a limb geometry: y along the segment from 0 to len, angle round
   it from +z (the front), +x the outside on the near side. */
function paintLimb(geo, segName, len, side, hi, hi2, offset = 0) {
  const p = geo.attributes.position, n = p.count;
  const a1 = new Float32Array(n), a2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (p.getY(i) + offset) / len;
    const phi = Math.atan2(p.getX(i) * side, p.getZ(i)) / D;
    a1[i] = limbWeight(segName, t, phi, hi);
    a2[i] = limbWeight(segName, t, phi, hi2);
  }
  geo.setAttribute('aMus', new THREE.BufferAttribute(a1, 1));
  geo.setAttribute('aMus2', new THREE.BufferAttribute(a2, 1));
  return geo;
}
/* The shoulder cap: front, outside or back of a sphere turned with the arm. */
function paintDelt(geo, side, hi, hi2) {
  const p = geo.attributes.position, n = p.count, r = geo.parameters.radius;
  const w = keys => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (p.getX(i) * side) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
      let v = 0;
      for (const k of keys) for (const [s, , , c] of LIMB_MUS[k] || []) {
        if (s !== 'delt') continue;
        const along = c === 0 ? z : c === 180 ? -z : x;
        v = Math.max(v, smooth(0.05, 0.55, along) * smooth(-0.85, -0.35, y));
      }
      out[i] = v;
    }
    return out;
  };
  geo.setAttribute('aMus', new THREE.BufferAttribute(w(hi), 1));
  geo.setAttribute('aMus2', new THREE.BufferAttribute(w(hi2), 1));
  return geo;
}

/* Body materials that blend the muscle paint in. One set of uniforms is
   shared by them all, so a single effort value drives every muscle. */
function bodyMaterial(color, rough, U) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMus;\nattribute float aMus2;\nvarying float vMus;\nvarying float vMus2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMus = aMus;\nvMus2 = aMus2;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uMusCol;\nuniform vec3 uMusCol2;\nuniform float uEffort;\nuniform float uMusOn;\nvarying float vMus;\nvarying float vMus2;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float mE = clamp((uEffort - 0.45) / 0.55, 0.0, 1.0);',
        'float mA = vMus * uMusOn, mB = vMus2 * uMusOn;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol2, mB * 0.8);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol, min(1.0, mA * (0.9 + 0.2 * mE)));',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance += uMusCol * mA * (0.12 + 0.42 * mE) + uMusCol2 * mB * 0.06;',
      ].join('\n'));
  };
  m.customProgramCacheKey = () => 'muscle-paint';
  return m;
}

/* A tube along the spine whose rings are rounded rectangles (a
   superellipse), rebuilt every frame as the spine bends and turns. Its
   muscle paint is fixed: each vertex keeps its place on the torso. */
class TorsoTube {
  constructor(t0, t1, grow, mat, hi, hi2, rings = 18, around = 32) {
    Object.assign(this, { t0, t1, grow, rings, around });
    const n = (rings + 1) * around + 2;
    this.pos = new Float32Array(n * 3);
    const m1 = new Float32Array(n), m2 = new Float32Array(n);
    const idx = [];
    for (let r = 0; r <= rings; r++) {
      const t = t0 + (t1 - t0) * (r / rings);
      for (let a = 0; a < around; a++) {
        const th = (a / around) * 360;
        m1[r * around + a] = trunkWeight(t, th, hi);
        m2[r * around + a] = trunkWeight(t, th, hi2);
      }
    }
    for (let r = 0; r < rings; r++) for (let a = 0; a < around; a++) {
      const i = r * around + a, j = r * around + (a + 1) % around;
      idx.push(i, j, i + around, j, j + around, i + around);
    }
    /* Wound so every face points outward: with the ring running from the
       near side (L) toward the front (N) and the rings climbing the spine
       (T), counter-clockwise from outside is ring-then-around. */
    const b = (rings + 1) * around, top = b + 1;
    for (let a = 0; a < around; a++) {
      idx.push(b, (a + 1) % around, a);
      idx.push(top, rings * around + a, rings * around + (a + 1) % around);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aMus', new THREE.BufferAttribute(m1, 1));
    this.geo.setAttribute('aMus2', new THREE.BufferAttribute(m2, 1));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
  }
  update(J) {
    const { rings, around, pos } = this;
    let k = 0;
    const put = p => { pos[k++] = p[0]; pos[k++] = p[1]; pos[k++] = p[2]; };
    for (let r = 0; r <= rings; r++) {
      const t = this.t0 + (this.t1 - this.t0) * (r / rings);
      const S = J.spine(t);
      const [w, d, c] = torsoAt(t);
      const ww = w + this.grow, dd = d + this.grow;
      const centre = v3.mad(S.p, S.N, c);
      for (let a = 0; a < around; a++) {
        const th = (a / around) * Math.PI * 2;
        const cs = Math.cos(th), sn = Math.sin(th);
        const ex = 2 / 2.3;   // superellipse: a little squarer than an ellipse, like a ribcage
        const x = Math.sign(cs) * Math.pow(Math.abs(cs), ex) * ww;
        const y = Math.sign(sn) * Math.pow(Math.abs(sn), ex) * dd;
        put(v3.add(centre, v3.add(v3.mul(S.L, x), v3.mul(S.N, y))));
      }
    }
    const S0 = J.spine(this.t0), S1 = J.spine(this.t1);
    put(v3.mad(v3.mad(S0.p, S0.N, torsoAt(this.t0)[2]), S0.T, -2));
    put(v3.mad(v3.mad(S1.p, S1.N, torsoAt(this.t1)[2]), S1.T, 1.5));
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}

class Mannequin {
  constructor(pal, m) {
    const hi = m.hi || [], hi2 = m.hi2 || [];
    this.uniforms = { uMusCol: { value: pal.muscle.clone() }, uMusCol2: { value: pal.muscle2.clone() }, uEffort: { value: 0.45 }, uMusOn: { value: 1 } };
    const U = this.uniforms;
    const std = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    this.mat = {
      skin: bodyMaterial(pal.skin, 0.62, U),
      shirt: bodyMaterial(pal.shirt, 0.85, U),
      shorts: bodyMaterial(pal.shorts, 0.8, U),
      shoe: std(pal.shoe, 0.55),
      sole: std(pal.sole, 0.7),
      hair: std(pal.hair, 0.88),
    };
    this.group = new THREE.Group();
    const add = (geo, mat) => { const mm = new THREE.Mesh(geo, mat); mm.castShadow = mm.receiveShadow = true; this.group.add(mm); return mm; };
    const base = {
      ua: limbGeo(SEG.ua, PROF.ua), fa: limbGeo(SEG.fa, PROF.fa), th: limbGeo(SEG.th, PROF.th), sh: limbGeo(SEG.sh, PROF.sh),
      sleeve: limbGeo(SEG.ua * 0.36, [[0, 7.1], [1, 6.7]]),
      legShort: limbGeo(SEG.th * 0.46, [[0, 9.9], [0.5, 9.6], [1, 9.1]]),
    };
    this.side = {};
    for (const [s, sg] of [['n', 1], ['f', -1]]) {
      const paint = (key, seg, len, off) => paintLimb(base[key].clone(), seg, len, sg, hi, hi2, off);
      this.side[s] = {
        ua: add(paint('ua', 'ua', SEG.ua), this.mat.skin),
        fa: add(paint('fa', 'fa', SEG.fa), this.mat.skin),
        th: add(paint('th', 'th', SEG.th), this.mat.skin),
        sh: add(paint('sh', 'sh', SEG.sh), this.mat.skin),
        sleeve: add(paint('sleeve', 'ua', SEG.ua, -1.5), this.mat.shirt),
        legShort: add(paint('legShort', 'th', SEG.th, -2), this.mat.shorts),
        delt: add(paintDelt(new THREE.SphereGeometry(7.0, 24, 16), sg, hi, hi2), this.mat.shirt),
        elbow: add(new THREE.SphereGeometry(4.2, 18, 12), this.mat.skin),
        knee: add(new THREE.SphereGeometry(5.2, 18, 12), this.mat.skin),
        wrist: add(new THREE.SphereGeometry(2.9, 14, 10), this.mat.skin),
        hand: add(roundBox(3.4, SEG.hand, 6.8, 1.5, 3, false), this.mat.skin),
        thumb: add(limbGeo(3.4, [[0, 1.35], [1, 1.1]], 10), this.mat.skin),
        shoe: add(limbGeo(SEG.toe + SEG.heel + 4.2, [[0, 3.0], [0.3, 3.3], [0.75, 3.4], [1, 2.9]], 18), this.mat.shoe),
        sole: add(limbGeo(SEG.toe + SEG.heel + 4.8, [[0, 3.1], [0.5, 3.5], [1, 3.1]], 18), this.mat.sole),
      };
    }
    this.shirt = new TorsoTube(0.15, 1.01, 0.35, this.mat.shirt, hi, hi2);
    this.shorts = new TorsoTube(-0.18, 0.24, 0.55, this.mat.shorts, hi, hi2, 7);
    this.group.add(this.shirt.mesh, this.shorts.mesh);
    this.neck = add(limbGeo(9.5, [[0, 4.9], [1, 4.4]]), this.mat.skin);
    /* The head: narrower than it is deep and tall (about 15 x 18 x 21 cm),
       with a jaw, short hair with a hairline over the forehead, brows,
       eyes, nose and ears, so it reads as a young face from any side. */
    const HS = [0.78, 1.1, 0.96];
    this.head = add(new THREE.SphereGeometry(BODY.headR, 36, 28), this.mat.skin);
    this.head.scale.set(...HS);
    this.jaw = add(new THREE.SphereGeometry(BODY.headR * 0.56, 24, 16), this.mat.skin);
    this.jaw.scale.set(1.0, 0.8, 1.05);
    const hairCap = (theta, k) => { const h = add(new THREE.SphereGeometry(BODY.headR + 0.55, 36, 14, 0, Math.PI * 2, 0, theta), this.mat.hair); h.scale.set(HS[0] * k, HS[1] * k, HS[2] * k); return h; };
    this.hairTop = hairCap(Math.PI * 0.4, 1.03);
    this.hairBack = hairCap(Math.PI * 0.5, 1.0);
    this.nose = add(new THREE.SphereGeometry(1.35, 12, 8), this.mat.skin);
    this.nose.scale.set(0.75, 1.35, 1);
    this.ears = [0, 1].map(() => { const e = add(new THREE.SphereGeometry(1.7, 12, 8), this.mat.skin); e.scale.set(0.5, 1.2, 0.85); return e; });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#241a14'), roughness: 0.5 });
    this.eyes = [0, 1].map(() => { const e = add(new THREE.SphereGeometry(0.6, 10, 8), dark); e.castShadow = false; return e; });
    this.brows = [0, 1].map(() => { const b = add(roundBox(2.8, 0.5, 0.55, 0.2, 1, false), this.mat.hair); b.castShadow = false; return b; });
  }

  update(J, effort) {
    this.uniforms.uEffort.value = effort;
    const seg = (mesh, a, dir, front) => { mesh.position.copy(V(a)); orient(mesh, dir, front); };
    for (const key of ['n', 'f']) {
      const s = J[key], m = this.side[key];
      seg(m.ua, s.sho, s.uaDir, s.uaFront);
      seg(m.sleeve, v3.mad(s.sho, s.uaDir, -1.5), s.uaDir, s.uaFront);
      seg(m.delt, v3.mad(s.sho, s.uaDir, 1.2), s.uaDir, s.uaFront);
      seg(m.fa, s.elb, s.faDir, s.faFront);
      seg(m.th, s.hip, s.thDir, s.thFront);
      seg(m.legShort, v3.mad(s.hip, s.thDir, -2), s.thDir, s.thFront);
      seg(m.sh, s.kne, s.shDir, s.shFront);
      m.elbow.position.copy(V(s.elb));
      m.knee.position.copy(V(s.kne));
      m.wrist.position.copy(V(s.wri));
      /* The hand: flat across the palm, its back to the forearm's front. */
      const palm = v3.norm(v3.cross(s.handDir, v3.cross(s.faFront, s.handDir)));
      m.hand.position.copy(V(v3.mad(s.wri, s.handDir, SEG.hand / 2 + 0.6)));
      orient(m.hand, s.handDir, v3.cross(palm, s.handDir));
      m.thumb.position.copy(V(v3.mad(v3.mad(s.wri, s.handDir, 1.5), palm, 2)));
      orient(m.thumb, v3.norm(v3.add(s.handDir, v3.mul(palm, 0.6))), palm);
      /* The shoe: a rounded last along the foot, flattened, its sole
         toward the floor side of the shin. */
      const up = v3.norm(v3.sub(v3.mul(s.shDir, -1), v3.mul(s.footDir, v3.dot(v3.mul(s.shDir, -1), s.footDir))));
      const heel = v3.mad(s.ank, s.footDir, -(SEG.heel + 1.8));
      seg(m.shoe, v3.mad(heel, up, -0.9), s.footDir, up);
      m.shoe.scale.set(1.05, 1, 0.78);
      seg(m.sole, v3.mad(v3.mad(heel, up, -2.9), s.footDir, -0.3), s.footDir, up);
      m.sole.scale.set(1.08, 1, 0.32);
    }
    this.shirt.update(J);
    this.shorts.update(J);
    const H = J.head;
    const nb = v3.mad(J.spine(0.92).p, J.spine(0.92).N, 0.4);
    seg(this.neck, nb, v3.sub(H.centre, nb), H.face);
    const R = BODY.headR;
    const at = (up, fwd, side = 0) => V(v3.mad(v3.mad(v3.mad(H.centre, H.dir, up), H.face, fwd), H.side, side));
    this.head.position.copy(V(H.centre));
    orient(this.head, H.dir, H.face);
    this.jaw.position.copy(at(-R * 0.42, R * 0.2));
    orient(this.jaw, H.dir, H.face);
    /* Short hair: a cap over the crown down to a hairline on the
       forehead, and one tipped back over the back of the head to the
       nape. */
    this.hairTop.position.copy(at(0.5, -0.3));
    orient(this.hairTop, v3.norm(v3.sub(H.dir, v3.mul(H.face, 0.14))), H.face);
    this.hairBack.position.copy(at(0, -0.5));
    orient(this.hairBack, v3.norm(v3.sub(H.dir, v3.mul(H.face, 1.05))), H.face);
    this.nose.position.copy(at(-1.6, R * 0.95));
    orient(this.nose, H.dir, H.face);
    this.ears.forEach((e, i) => { e.position.copy(at(-0.6, -0.6, (i ? 1 : -1) * R * 0.78)); orient(e, H.dir, H.side); });
    this.eyes.forEach((e, i) => e.position.copy(at(0.9, R * 0.83, (i ? 1 : -1) * 2.6)));
    this.brows.forEach((b, i) => { b.position.copy(at(2.4, R * 0.88, (i ? 1 : -1) * 2.6)); orient(b, H.face, H.dir); });
  }
}

/* ══ KIT ══ */

/* ── surfaces for the kit, drawn once in code ──
   Small tiling height fields turned into normal maps: pebbled leather for
   the pads, orange-peel powder coat for the frame, diamond knurling for the
   handles, a fine rubber grain for the plates. Nothing to download. */
const TEX = {};
function noiseField(n, cells, seed) {
  let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const g = Array.from({ length: cells * cells }, rnd);
  const at = (i, j) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const f = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    const u = (xx / n) * cells, v = (y / n) * cells, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    f[y * n + xx] = (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
  }
  return f;
}
function normalTexture(name, n, height, strength, repeat) {
  if (TEX[name]) return TEX[name];
  const c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  const h = (x, y) => height[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), k = (y * n + x) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.userData.shared = true;
  return (TEX[name] = t);
}
const leather = () => {
  const n = 256, a = noiseField(n, 32, 3), b = noiseField(n, 64, 7), h = new Float32Array(n * n);
  /* pebbles: the fine noise, pinched into rounded cells by the coarse */
  for (let i = 0; i < h.length; i++) h[i] = Math.pow(Math.abs(Math.sin(a[i] * 9.0)), 0.6) * 0.7 + b[i] * 0.3;
  return normalTexture('leather', n, h, 3.2, [0.16, 0.16]);
};
const powder = () => { const n = 128, a = noiseField(n, 24, 11); return normalTexture('powder', n, a, 1.2, [0.35, 0.35]); };
const rubber = () => { const n = 128, a = noiseField(n, 48, 5), b = noiseField(n, 12, 2); const h = a.map((v, i) => v * 0.7 + b[i] * 0.3); return normalTexture('rubber', n, h, 1.6, [0.3, 0.3]); };
const plaster = () => { const n = 128, a = noiseField(n, 10, 17), b = noiseField(n, 40, 19); return normalTexture('plaster', n, a.map((v, i) => v * 0.6 + b[i] * 0.4), 0.9, [14, 20]); };
/* a foam mat: fine pebbles with shallow grooves across it every few cm */
const matGrain = () => { const n = 128, a = noiseField(n, 40, 23); const h = a.map((v, i) => v * 0.6 + 0.4 * Math.pow(Math.abs(Math.sin(((i % n) / n) * Math.PI * 4)), 6)); return normalTexture('matGrain', n, h, 1.4, [0.12, 0.12]); };
/* book cloth: a fine woven cross-grain */
const cloth = () => { const n = 64, h = new Float32Array(n * n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = 0.5 + 0.25 * Math.sin(x / n * Math.PI * 32) + 0.25 * Math.sin(y / n * Math.PI * 32); return normalTexture('cloth', n, h, 1.2, [0.5, 0.5]); };
const knurl = () => {
  const n = 128, h = new Float32Array(n * n);
  /* two sets of grooves crossing at 60 degrees leave a field of diamonds */
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = Math.abs(Math.sin(((x + y) / n) * Math.PI * 8)), b = Math.abs(Math.sin(((x - y) / n) * Math.PI * 8));
    h[y * n + x] = Math.min(a, b);
  }
  return normalTexture('knurl', n, h, 4.0, [3, 4]);
};

function kitMaterials(pal) {
  const std = (color, rough, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  /* bench pads: black vinyl over a pebbled leather grain, a little satin */
  const pad = new THREE.MeshPhysicalMaterial({ color: pal.pad, roughness: 0.62, metalness: 0, normalMap: leather(), normalScale: new THREE.Vector2(0.55, 0.55), clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color('#5a5d66') });
  /* the frame: dark powder-coated steel */
  const frame = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e3035'), roughness: 0.48, metalness: 0.55, normalMap: powder(), normalScale: new THREE.Vector2(0.35, 0.35) });
  /* handles and bars: knurled bright steel */
  const steel = new THREE.MeshStandardMaterial({ color: pal.steel, roughness: 0.32, metalness: 0.9, normalMap: knurl(), normalScale: new THREE.Vector2(0.9, 0.9) });
  /* plates: matte rubber with a fine grain */
  const rub = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0, normalMap: rubber(), normalScale: new THREE.Vector2(0.5, 0.5) });
  return {
    steel, frame, pad, plate: rub(pal.plate), stitch: std(new THREE.Color('#4a4c52'), 0.7),
    plateDark: rub(pal.plateDark),
    wall: new THREE.MeshStandardMaterial({ color: pal.wall, roughness: 0.95, normalMap: plaster(), normalScale: new THREE.Vector2(0.5, 0.5) }),
    mat: new THREE.MeshStandardMaterial({ color: pal.mat, roughness: 0.88, normalMap: matGrain(), normalScale: new THREE.Vector2(0.7, 0.7) }),
    book: new THREE.MeshStandardMaterial({ color: pal.book, roughness: 0.82, normalMap: cloth(), normalScale: new THREE.Vector2(0.4, 0.4) }),
    book2: new THREE.MeshStandardMaterial({ color: pal.book2, roughness: 0.82, normalMap: cloth(), normalScale: new THREE.Vector2(0.4, 0.4) }),
    rubber: new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1d20'), roughness: 0.8, normalMap: rubber(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    pack: std(new THREE.Color('#3b4a3a'), 0.85),
  };
}
const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };

/* The adjustable bench, from the same numbers the side views used: seat
   centre x, seat height y (screen), back pad angle, length, mirrored by
   flip, turned end-on by yaw. */
function bench(b, K) {
  const g = new THREE.Group();
  const y = 194 - (b.y ?? 161), back = b.back ?? 0, len = b.len ?? 72;
  const Wd = 24;
  const pad = (cx, cy, angle, l, name) => {
    /* 14.7 deep and 6.3 longer than the side views' outline, as the
       poses were drawn against */
    const L = l + 6.3, T = 14.7;
    const m = new THREE.Mesh(roundBox(L, T, Wd, 3.2), K.pad);
    m.position.set(cx, cy, 0);
    m.rotation.z = angle * D;
    m.userData.support = name;   // the body rests on it (Stage.fit): 'seat' or 'back'
    /* stitching: a row of short stitches round the top, inside the edge */
    const inset = 5.2, w = L / 2 - inset, d = Wd / 2 - inset, step = 0.9;   // on the flat of the top, inside its rounded edge
    const pts = [];
    for (let x = -w; x < w; x += step) pts.push([x, d, 0], [x, -d, 0]);
    for (let z = -d; z < d; z += step) pts.push([w, z, Math.PI / 2], [-w, z, Math.PI / 2]);
    const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.12, 0.14), K.stitch, pts.length);
    const q = new THREE.Object3D();
    pts.forEach(([x, z, r], i) => { q.position.set(x, T / 2 + 0.01, z); q.rotation.set(0, r, 0); q.updateMatrix(); st.setMatrixAt(i, q.matrix); });
    st.castShadow = false;
    m.add(st);
    return m;
  };
  const dir = 180 - back;
  const o = [-23, y];
  const c = [o[0] + Math.cos(dir * D) * len / 2, o[1] + Math.sin(dir * D) * len / 2];
  g.add(pad(0, y, 0, 46, 'seat'), pad(c[0], c[1], dir - 180, len, 'back'));
  const top = [o[0] + Math.cos(dir * D) * len, o[1] + Math.sin(dir * D) * len];
  const rearX = Math.min(-31, top[0] + 8);
  const r = 1.7, rail = 7;
  g.add(rod([rearX - 2, rail, 0], [31, rail, 0], r * 1.15, K.frame));
  for (const fx of [29, rearX]) {
    g.add(rod([fx, rail, 0], [fx, 2.2, 0], r, K.frame));
    g.add(rod([fx, 1.6, -15], [fx, 1.6, 15], 1.6, K.frame));
    for (const z of [-15, 15]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), K.rubber); cap.position.set(fx, 1.6, z); g.add(cap); }
  }
  g.add(rod([3, y - 4.2, 0], [3, rail, 0], r * 1.15, K.frame));
  g.add(rod([-19, y - 5, 0], [19, y - 5, 0], 1.3, K.frame));
  if (back > 8) {
    const n = [Math.cos((dir + 90) * D), Math.sin((dir + 90) * D)];
    const brace = [o[0] + Math.cos(dir * D) * len * 0.42 + n[0] * 5.4, o[1] + Math.sin(dir * D) * len * 0.42 + n[1] * 5.4];
    g.add(rod([-25, rail, 0], [brace[0], brace[1], 0], r, K.frame));
    for (let i = 0; i < 5; i++) g.add(rod([-24 + i * 3.6, rail + 1.2, -2.4], [-24 + i * 3.6, rail + 1.2, 2.4], 0.6, K.frame, 6));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 12), K.rubber);
    pin.position.set((-25 + brace[0]) / 2, (rail + brace[1]) / 2, 3);
    pin.rotation.x = Math.PI / 2;
    g.add(pin);
  } else {
    g.add(rod([top[0] + 6, top[1] - 3, 0], [top[0] + 6, rail, 0], r, K.frame));
  }
  if (b.flip) g.scale.x = -1;
  g.rotation.y = (b.yaw || 0) * D;
  g.position.set(b.x, 0, b.z || 0);
  return shadow(g);
}

function scene(s, K) {
  const g = new THREE.Group();
  switch (s.k) {
    case 'bench': return bench(s, K);
    case 'benchEnd': return bench({ ...s, yaw: s.yaw ?? 90 }, K);
    case 'wall': {
      const left = s.side === 'l';
      const w = new THREE.Mesh(new THREE.BoxGeometry(10, 300, 220), K.wall.clone());
      w.position.set(left ? s.x - 5 : s.x + 5, 150, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 220), K.pad.clone());
      base.position.set(left ? s.x + 1 : s.x - 1, 3.5, 0);
      g.add(w, base);
      g.userData.wallX = s.x;
      return shadow(g);
    }
    case 'bar': case 'hbar': {
      const x = s.x ?? 100, y = 194 - s.y, wx = x - (s.off ?? 52);   // a wall-mounted bar stands about 57 cm off the wall
      g.add(rod([x, y, -48], [x, y, 48], 2.3, K.steel, 20));
      for (const z of [-44, 44]) {
        g.add(rod([wx, y + 8, z], [x, y, z], 1.5, K.steel));
        g.add(rod([wx, y + 14, z], [wx, y - 6, z], 2.2, K.steel));
      }
      const w = new THREE.Mesh(new THREE.BoxGeometry(10, 300, 220), K.wall.clone());
      w.position.set(wx - 5, 150, 0);
      w.userData.wallX = wx;
      g.add(w);
      return shadow(g);
    }
    case 'mat': {
      const m = new THREE.Mesh(roundBox(s.x1 - s.x0, 1.2, s.w || 56, 0.55), K.mat);
      m.position.set((s.x0 + s.x1) / 2, 0.6, s.z || 0);
      m.receiveShadow = true;
      return m;
    }
    case 'wedge': {
      const sh = new THREE.Shape();
      /* high under the heels (the figure faces +x), low under the toes */
      sh.moveTo(-s.w / 2, 0); sh.lineTo(s.w / 2, 0); sh.lineTo(s.w / 2, s.h * 0.3); sh.lineTo(-s.w / 2, s.h); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 44, bevelEnabled: false });
      geo.translate(0, 0, -22);
      const m = new THREE.Mesh(geo, K.pad);
      m.position.set(s.x, 0, 0);
      return shadow(m);
    }
    case 'books': {
      for (const x of s.xs) for (const z of [-BODY.shoW - 1, BODY.shoW + 1]) for (let i = 0; i < (s.n ?? 2); i++) {
        const b = new THREE.Mesh(roundBox(17, 3.2, 12, 0.5), i % 2 ? K.book2 : K.book);
        b.position.set(x + (i % 2 ? 0.8 : -0.5), 1.6 + 3.4 * i, z);
        b.rotation.y = (i % 2 ? 4 : -3) * D;
        g.add(b);
      }
      return shadow(g);
    }
    case 'anchor': {
      const top = 194 - (s.y - 9), bot = 194 - (s.y + 4);
      const b = new THREE.Mesh(roundBox(36, top - bot, 56, 4), K.pad);
      b.position.set(s.x, (top + bot) / 2, 0);
      g.add(b);
      for (const dx of [-13, 13]) for (const z of [-24, 24]) g.add(rod([s.x + dx, bot, z], [s.x + dx, 0, z], 1.8, K.steel));
      return shadow(g);
    }
    default: return g;
  }
}

/* Held kit, built once and moved every frame. */
function heldMesh(kind, K) {
  const g = new THREE.Group();
  if (kind === 'db') {
    /* An adjustable dumbbell: a knurled handle between two stacks of
       rounded plates, the outer plates a size smaller. */
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 13.5, 14), K.steel));
    for (const sgn of [1, -1]) for (let i = 0; i < 3; i++) {
      const s = 1 - i * 0.07;
      const p = new THREE.Mesh(roundBox(15 * s, 2.4, 15 * s, 3.2 * s, 3, false), i === 1 ? K.plateDark : K.plate);
      p.position.y = sgn * (7.6 + i * 2.6);
      g.add(p);
    }
  } else if (kind === 'bb') {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 112, 14), K.steel));
    for (const sgn of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(10 - i * 1.2, 10 - i * 1.2, 2.6, 28), i === 1 ? K.plateDark : K.plate);
        p.position.y = sgn * (38 + i * 2.9);
        g.add(p);
      }
      const col = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.4, 14), K.steel);
      col.position.y = sgn * 34.5;
      g.add(col);
    }
  } else if (kind === 'wheel') {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(6.6, 2.1, 14, 40), K.rubber);
    tyre.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 3.2, 32), K.plate);
    g.add(tyre, rim);
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.6, 11), K.steel);
      sp.rotation.y = i * Math.PI / 4;
      g.add(sp);
    }
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 34, 12), K.steel));
    for (const sgn of [1, -1]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 9, 14), K.rubber);
      grip.position.y = sgn * 12.5;
      g.add(grip);
    }
  } else if (kind === 'pack') {
    const b = new THREE.Mesh(roundBox(22, 26, 10, 4, 3, false), K.pack);
    g.add(b);
  }
  return shadow(g);
}

/* ══ STAGE ══ */

/* One renderer is shared, its canvas moved into whichever lab is open.
   A second view open at the same time (the gallery's live mode) gets its
   own, released when it stops. */
let RENDERER = null, BUSY = false;

/* The trainer (avatar.js) loads once; until it has, or if it cannot, the
   drawn mannequin stands in. Await ready() before the first Stage. */
let TRAINER = null;
export const ready = (model = 'athlete') => loadTrainer(model).catch(() => loadTrainer('trainer')).then(t => (TRAINER = t)).catch(() => null);
function renderer(own = false) {
  if (RENDERER && !own) return RENDERER;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.domElement.className = 'rp-canvas';
  if (!own) RENDERER = r;
  return r;
}

/* A soft round floor that fades out instead of ending in an edge. */
function floorDisc(pal, radius) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  const col = `#${pal.floor.getHexString()}`;
  gr.addColorStop(0, col); gr.addColorStop(0.55, col + 'cc'); gr.addColorStop(1, col + '00');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.05;
  return m;
}

/* A soft round shadow (dark in the middle, gone at the edge) for the
   contact shadows, made once. */
let BLOB = null;
function blobTexture() {
  if (BLOB) return BLOB;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  BLOB = new THREE.CanvasTexture(c);
  BLOB.userData.shared = true;
  return BLOB;
}

export class Stage {
  constructor(name, el) {
    const m = MOTION[name];
    this.m = m;
    this.tl = timeline(m, normalize);
    const pal = palette(el);
    this.pal = pal;
    const S = this.scene = new THREE.Scene();
    const K = this.K = kitMaterials(pal);
    /* the working muscles painted from the same regions as the card's
       muscle map (muscles3d.js), so both light the same places */
    this.body = TRAINER ? new Trainer(TRAINER, pal, m, { limb: limbWeight, trunk: trunkWeight, weights: (T, mm) => regionPaint(T, mm.hi, mm.hi2, MMAP) }) : new Mannequin(pal, m);
    S.add(this.body.group);
    this.kit = (m.scene || []).map(s => { const o = scene(s, K); if (['wall', 'mat'].includes(s.k)) o.userData.noFit = true; S.add(o); return o; });

    /* The held kit for this exercise, one mesh per item, moved each frame. */
    const J0 = skeleton(this.tl.at(0));
    this.held = holds(J0, m).map(it => { const o = heldMesh(it.kind, K); S.add(o); return o; });

    /* Frame the whole rep: every point the body and its kit reach across
       it, plus the corners of the kit around it (not the walls, which
       run off the picture on purpose). aim() fits these exactly. */
    const pts = [];
    const around = (q, pad) => { for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) pts.push(V(q).add(new THREE.Vector3(dx * pad, dy * pad, dz * pad))); };
    for (let i = 0; i < 48; i++) {
      const J = skeleton(this.tl.at((i / 48) * this.tl.total));
      for (const q of points(J, [])) around(q, 7.5);
      for (const it of holds(J, m)) around(it.pos, it.kind === 'bb' ? 12 : it.kind === 'db' ? 13 : 10);
    }
    this.fitPts = pts;
    this.scene.updateMatrixWorld(true);
    this.kit.forEach(o => {
      if (o.userData.noFit) return;
      o.traverse(mm => {
        if (!mm.isMesh || mm.userData.wallX !== undefined || mm.parent?.userData.wallX !== undefined) return;
        const b = new THREE.Box3().setFromObject(mm);
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) this.fitPts.push(new THREE.Vector3(x, y, z));
      });
    });
    const box = new THREE.Box3().setFromPoints(this.fitPts);
    this.box = box;
    this.target = box.getCenter(new THREE.Vector3());
    this.radius = box.getSize(new THREE.Vector3()).length() / 2;

    const cam = m.cam || {};
    this.az0 = cam.az ?? 38; this.el0 = cam.el ?? 12;
    this.az = this.az0; this.el = this.el0;
    this.camera = new THREE.PerspectiveCamera(30, 2, 1, 4000);

    /* Soft light from the room (most of it now from the studio the body
       and kit reflect, see useEnv), a warm key that casts the shadows, a
       cool rim from behind that draws the silhouette, and a faint fill. */
    S.add(new THREE.HemisphereLight(0xffffff, pal.floor, pal.light ? 1.15 : 1.25));
    const key = new THREE.DirectionalLight(0xfff0e0, pal.light ? 2.4 : 2.7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.4;
    key.shadow.radius = 4;
    const r = this.radius * 1.3;
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 6 });
    this.key = key;
    S.add(key, key.target);
    const rim = new THREE.DirectionalLight(pal.accent.clone().lerp(new THREE.Color(0xffffff), 0.55), pal.light ? 1.5 : 2.3);
    this.rim = rim;
    S.add(rim, rim.target);
    const fill = new THREE.DirectionalLight(0xe6eeff, 0.4);
    this.fill = fill;
    S.add(fill, fill.target);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: pal.light ? 0.16 : 0.32 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    S.add(floorDisc(pal, Math.max(120, this.radius * 1.6)), floor);
    if (this.body.soles) {
      this.printK = pal.light ? 0.38 : 0.6;
      this.prints = Object.fromEntries(['R', 'L'].map(s => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, map: blobTexture(), transparent: true, depthWrite: false }));
        m.renderOrder = 1;
        S.add(m);
        return [s, m];
      }));
    }
    this.aim();
  }

  /* The bench pads the body can rest on, with their frames. */
  supportPads() {
    if (this._pads) return this._pads;
    this.scene.updateMatrixWorld(true);
    const pads = [];
    for (const o of this.kit) o.traverse(c => {
      if (!c.isMesh || !c.userData.support) return;
      c.geometry.computeBoundingBox();
      const inv = c.matrixWorld.clone().invert(), nrm = new THREE.Vector3(0, 1, 0).transformDirection(c.matrixWorld);
      pads.push({ m: c, bb: c.geometry.boundingBox, inv, nrm });
    });
    return (this._pads = pads);
  }
  /* The top of whatever a foot stands over: a level pad under it, or the floor. */
  surfaceAt(q) {
    let top = this.floorTop ?? 0;
    const v = new THREE.Vector3();
    for (const P of this.supportPads()) {
      if (P.nrm.y < 0.9) continue;
      v.set(q[0], q[1], q[2]).applyMatrix4(P.inv);
      if (v.x < P.bb.min.x - 0.5 || v.x > P.bb.max.x + 0.5 || v.z < P.bb.min.z - 0.5 || v.z > P.bb.max.z + 0.5) continue;
      v.y = P.bb.max.y; v.applyMatrix4(P.m.matrixWorld);
      if (v.y < q[1] + 3) top = Math.max(top, v.y);
    }
    return top;
  }
  /* ── Fitting the body to the kit ──
     The poses in moves.js were drawn for the rig's thin figure; this body
     is thicker, so as drawn it can sink into the floor or a pad, or hover
     over the pad it should lie on. For each moment of the rep the body is
     moved to fit before the pose is solved: the whole of it up off the
     floor (its planted marks too), then the trunk alone onto or out of a
     pad, the hands and feet staying on their marks while the elbows and
     knees bend to reach them. The fit is worked out at a few dozen
     moments across the rep and smoothed, so the body never jumps from
     one frame to the next. */

  /* Whether the hand or foot mark `key` (hand, fhand, foot, ffoot) at t is
     planted on something — the floor, a pad, the bar, a wall — rather
     than a place on the body (a dumbbell on the hips, hands at the
     chest), which moves when the body does. Each part of the kit is
     tested on its own, at the mark's own sideways place. */
  planted(t, key = 'hand') {
    const far = key[0] === 'f', foot = key.endsWith('foot');
    const q = W(t, (far ? -1 : 1) * (foot ? BODY.hipW : BODY.shoW)), v = new THREE.Vector3(...q);
    if (q[1] < (this.floorTop ?? 0) + 18) return true;   // an ankle up on its toes, a wrist on the floor
    if (!this._kitBoxes) {
      this.scene.updateMatrixWorld(true);
      this._kitBoxes = [];
      for (const o of this.kit) o.traverse(c => { if (c.isMesh && !c.isInstancedMesh) this._kitBoxes.push(new THREE.Box3().setFromObject(c)); });
    }
    return this._kitBoxes.some(b => b.distanceToPoint(v) < 4);
  }

  /* The pose p, moved: up by `lift` with its marks, then the trunk by d,
     taking the marks that are not planted with it. */
  shifted(p, lift, d) {
    if (!lift && !d) return p;
    const q = { ...p };
    const mv = (t, dx, dy, dz) => { const o = t.slice(); o[0] += dx; o[1] -= dy; if (dz) o[2] = (o[2] ?? 0) + dz; return o; };
    for (const k of Object.keys(q)) {
      if (!MARK.test(k) || !Array.isArray(q[k])) continue;
      const free = d && !this.planted(q[k], k.replace(/^[ab]/, ''));
      q[k] = mv(q[k], free ? d[0] : 0, lift + (free ? d[1] : 0), free && q[k].length > 2 ? d[2] : 0);
    }
    /* the body hangs from its hip, or from the joint a pose roots it at */
    const [dx, dy, dz] = d || [0, 0, 0];
    if (q.root) q.at = mv(q.at, dx, lift + dy, q.at.length > 2 ? dz : 0);
    else q.hip = mv(q.hip || [100, 150], dx, lift + dy, dz);
    return q;
  }

  /* One step toward the body resting on the kit, from its skin points
     `pts` (x, y, z runs): a world move, or null when it already fits.
     Where m.rest names a pad ('back', 'seat', or 'pad' for whichever the
     trunk is over), the trunk (`pts`) is brought to touch that pad, nearer
     or farther; every other pad only pushes skin (`all`: the trunk, upper
     arms and thighs) out through its top. */
  contact(pts, all = pts) {
    const pads = this.supportPads(), want = this.m.rest, v = new THREE.Vector3();
    let push = null, hold = null;
    /* over the pad's face: how far the lowest point is above its top (gap),
       how deep the deepest is below it (pen), how many are near it (n);
       skin under the pad's top half is passing its end or underside, not
       resting on it */
    const measure = (P, set) => {
      const bb = P.bb, half = (bb.max.y - bb.min.y) / 2;
      let pen = 0, gap = Infinity, n = 0;
      for (let k = 0; k < set.length; k += 3) {
        v.set(set[k], set[k + 1], set[k + 2]).applyMatrix4(P.inv);
        if (v.x <= bb.min.x || v.x >= bb.max.x || v.z <= bb.min.z || v.z >= bb.max.z) continue;
        const h = v.y - bb.max.y;
        if (h < -half) continue;
        if (h < 10) n++;
        if (h < gap) gap = h;
        if (-h > pen) pen = -h;
      }
      return { pen, gap, n };
    };
    for (const P of pads) {
      const named = want && (want === 'pad' || want === P.m.userData.support);
      const m = named ? measure(P, pts) : null;
      if (named && m.n > 12 && (!hold || m.n > hold.n)) { hold = { ...m, P }; continue; }
      const { pen } = measure(P, all);
      if (pen > 0.3 && (!push || pen > push.pen)) push = { pen, P };
    }
    const d = new THREE.Vector3();
    /* resting on a pad sinks it a little */
    if (hold && Math.abs(hold.gap + 0.4) > 0.15) d.addScaledVector(hold.P.nrm, Math.max(-6, -0.4 - hold.gap));
    if (push && push.P !== hold?.P) d.addScaledVector(push.P.nrm, push.pen + 0.15);
    return d.lengthSq() > 0.01 ? d : null;
  }

  /* How far to move the body for pose p: { lift, d }. Leaves the body in
     that pose. */
  solveFit(p) {
    const B = this.body, top = this.floorTop;
    const place = (lift, d) => { const q = this.shifted(p, lift, d); B.update(skeleton(q), p.effort ?? 0.45, q); };
    place(0, null);
    const lift = Math.max(0, top + 0.2 - B.lowest());
    let d = null;
    if (this.supportPads().length) {
      const set = this.m.rest ? (this.m.rest === 'seat' ? 'seat' : 'trunk') : 'all';
      for (let it = 0; it < 6; it++) {
        if (it || lift) place(lift, d);
        const pts = B.restPoints(set), step = this.contact(pts, set === 'all' ? pts : B.restPoints('all'));
        if (!step) break;
        d = d ? [d[0] + step.x, d[1] + step.y, d[2] + step.z] : [step.x, step.y, step.z];
        if (step.length() < 0.2) break;
      }
    }
    return { lift, d };
  }

  /* The fit at time t of the rep, from samples across it: the lift kept
     at or above what each sample needs, both smoothed round the loop. */
  fitAt(t) {
    const total = this.tl.total;
    if (!this._fit) {
      const K = Math.max(12, Math.min(32, Math.round(total * 4)));
      const raw = [];
      for (let k = 0; k < K; k++) { const f = this.solveFit(this.tl.at((k / K) * total)); raw.push([f.lift, ...(f.d || [0, 0, 0])]); }
      const at = k => raw[((k % K) + K) % K];
      const lift = raw.map((_, k) => Math.max(at(k - 1)[0], at(k)[0], at(k + 1)[0]));
      let sm = raw.map((r, k) => [lift[k], r[1], r[2], r[3]]);
      for (let pass = 0; pass < 2; pass++) {
        const s0 = sm;
        sm = s0.map((_, k) => s0[k].map((x, c) => (s0[(k - 1 + K) % K][c] + 2 * x + s0[(k + 1) % K][c]) / 4));
      }
      this._fit = { K, s: sm };
    }
    const { K, s } = this._fit;
    const u = (((t / total) % 1 + 1) % 1) * K, k = Math.floor(u), f = u - k;
    const g = j => s[((j % K) + K) % K];
    /* Catmull-Rom through the samples */
    const out = [0, 0, 0, 0].map((_, c) => {
      const p0 = g(k - 1)[c], p1 = g(k)[c], p2 = g(k + 1)[c], p3 = g(k + 2)[c];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    });
    return { lift: Math.max(0, out[0]), d: [out[1], out[2], out[3]] };
  }

  /* The studio for the kit's metal and vinyl to reflect, once the renderer
     is known. */
  useEnv(r) {
    const e = studioEnv(r);
    for (const [m, k] of [[this.K.steel, 1], [this.K.frame, 0.8], [this.K.pad, 0.6], [this.K.plate, 0.5], [this.K.plateDark, 0.5]]) { m.envMap = e; m.envMapIntensity = k; m.needsUpdate = true; }
    this.body.useEnv?.(e);
  }

  /* Camera and lights from the current orbit angles. */
  aim(aspect = this.aspect || 2) {
    this.aspect = aspect;
    const c = this.camera;
    c.aspect = aspect;
    const tv = Math.tan((c.fov / 2) * D), th = tv * aspect;
    const az = this.az * D, el = this.el * D;
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    /* Fit exactly: the nearest camera distance at which every framing
       point is inside the view, then shift the aim so the picture is
       centred, and fit once more. */
    let t = this.target.clone(), dist = 100;
    for (let pass = 0; pass < 3; pass++) {
      dist = 0;
      for (const q of this.fitPts) {
        const r = q.clone().sub(t);
        const along = r.dot(dir);
        dist = Math.max(dist, along + Math.abs(r.dot(right)) / th, along + Math.abs(r.dot(up)) / tv);
      }
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of this.fitPts) {
        const r = q.clone().sub(t), depth = dist - r.dot(dir);
        const sx = r.dot(right) / (depth * th), sy = r.dot(up) / (depth * tv);
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      t.addScaledVector(right, ((x0 + x1) / 2) * dist * th * 0.9).addScaledVector(up, ((y0 + y1) / 2) * dist * tv * 0.9);
    }
    dist *= 1.04 * (this.zoom || 1);
    this.aimAt = t;
    c.position.copy(t).addScaledVector(dir, dist);
    /* A wall between the camera and the figure turns to a faint ghost,
       so turning the view never hides the rep behind it. */
    this.scene.traverse(o => {
      const x = o.userData.wallX;
      if (x === undefined) return;
      const between = (c.position.x - x) * (t.x - x) < 0;
      o.traverse(mm => {
        if (!mm.isMesh) return;
        mm.material.transparent = between;
        mm.material.opacity = between ? 0.12 : 1;
        mm.material.depthWrite = !between;
        mm.castShadow = !between;
      });
    });
    c.lookAt(t);
    c.near = Math.max(1, dist - this.radius * 2.5);
    c.far = dist + this.radius * 4;
    c.updateProjectionMatrix();
    const at = (l, dx, dy, dz) => { l.position.set(t.x + dx, t.y + dy, t.z + dz); l.target.position.copy(t); };
    const s = Math.sin(az), co = Math.cos(az), R = this.radius * 2.4;
    at(this.key, R * (0.55 * s + 0.6 * co), R * 1.25, R * (0.55 * co - 0.6 * s));
    at(this.rim, -R * s * 0.9 - R * 0.3 * co, R * 0.7, -R * co * 0.9 + R * 0.3 * s);
    at(this.fill, R * (s - 0.8 * co), R * 0.3, R * (co + 0.8 * s));
  }

  /* Pose the scene at time t (seconds into the rep). */
  pose(p) {
    this.body.floorTop = this.floorTop ??= Math.max(0, ...(this.m.scene || []).filter(s => s.k === 'mat').map(() => 1.2));
    this.body.surfaceAt = q => this.surfaceAt(q);
    this.body.isPlanted = (t, key) => this.planted(t, key);
    /* A body thicker than the rig's (the athlete) is fitted to the floor
       and the kit (see fitAt); the rig's own figure is drawn as posed. */
    if (this.body.lowest) {
      const f = p.t != null ? this.fitAt(p.t) : this.solveFit(p);
      p = this.shifted(p, f.lift, f.d);
    }
    const J = skeleton(p);
    this.body.update(J, p.effort ?? 0.45, p);
    if (this.prints) this.placePrints();
    holds(J, this.m).forEach((it, i) => {
      const o = this.held[i];
      if (!o) return;
      /* a one-hand dumbbell sits where that hand's fingers close, when the
         body can say (the trainer's palm); otherwise at the rig's grip */
      const palm = it.side && this.body.palmAt?.(it.side);
      o.position.copy(V(palm || it.pos));
      orient(o, it.axis, it.up || [0, 1, 0]);
    });
    return J;
  }

  /* The contact shadow under each foot: a soft dark print the size and
     heading of the sole, on the floor or the pad under it, fading as the
     foot lifts. The key light's shadow is too soft and too far to the side
     to show where a foot meets the ground; this does. */
  placePrints() {
    const S = this.body.soles();
    for (const [s, m] of Object.entries(this.prints)) {
      const o = S[s], n = o.length / 3;
      let cx = 0, cz = 0, y0 = Infinity;
      for (let k = 0; k < n; k++) { cx += o[3 * k]; cz += o[3 * k + 2]; y0 = Math.min(y0, o[3 * k + 1]); }
      cx /= n; cz /= n;
      let xx = 0, zz = 0, xz = 0;
      for (let k = 0; k < n; k++) { const dx = o[3 * k] - cx, dz = o[3 * k + 2] - cz; xx += dx * dx; zz += dz * dz; xz += dx * dz; }
      const a = 0.5 * Math.atan2(2 * xz, xx - zz), ca = Math.cos(a), sa = Math.sin(a);
      let l = 0, w = 0;
      for (let k = 0; k < n; k++) { const dx = o[3 * k] - cx, dz = o[3 * k + 2] - cz; l = Math.max(l, Math.abs(dx * ca + dz * sa)); w = Math.max(w, Math.abs(-dx * sa + dz * ca)); }
      const top = this.surfaceAt([cx, y0, cz]), h = Math.max(0, y0 - top);
      m.position.set(cx, top + 0.15, cz);
      m.rotation.set(-Math.PI / 2, 0, -a);
      m.scale.set(2 * l + 7, 2 * w + 6, 1);
      m.material.opacity = this.printK * Math.max(0, 1 - h / 9);
      m.visible = m.material.opacity > 0.01;
    }
  }

  draw(r) { r.render(this.scene, this.camera); }

  dispose() {
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(mm => { if (!mm.map?.userData.shared) mm.map?.dispose(); mm.dispose(); });
    });
  }
}

/* ── the lab ── */

/* Runs the rep in `box` (an element sized by CSS); returns its handle.
   `free` is for the full-screen viewer (pose.js), which has no page to
   scroll: every drag turns, a plain wheel zooms and the camera can look
   straight down. onFrame hears where in the rep each drawn frame is. */
export function mount(box, name, { onStep, onFrame, still = false, free = false } = {}) {
  const own = BUSY;
  const r = renderer(own);
  if (!own) BUSY = true;
  const stage = new Stage(name, box);
  stage.useEnv(r);
  box.appendChild(r.domElement);
  let raf = 0, clock = 0, last = 0, paused = still, dirty = true, visible = true;
  let speed = 1, spin = false, glide = null;
  const total = stage.tl.total;

  const size = () => {
    const w = box.clientWidth || 300, h = box.clientHeight || 200;
    r.setSize(w, h, false);
    r.domElement.style.width = w + 'px';
    r.domElement.style.height = h + 'px';
    stage.aim(w / h);
    dirty = true;
  };
  const ro = new ResizeObserver(size);
  ro.observe(box);
  size();

  const frame = () => {
    const p = still ? (stage.tl.pose(stage.m.still) || stage.tl.at(0)) : stage.tl.at(clock);
    /* A held balance is not frozen: sway wobbles the keys it names. */
    if (!still) for (const [k, amp, hz] of stage.m.sway || []) if (typeof p[k] === 'number') p[k] += amp * Math.sin(2 * Math.PI * hz * clock);
    stage.pose(p);
    stage.draw(r);
    if (!still) { const s = stage.tl.step(clock); onStep?.(s.i, s.u); onFrame?.(((clock % total) + total) % total); }
    dirty = false;
  };
  const tick = now => {
    raf = requestAnimationFrame(tick);
    if (!visible) { last = 0; return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    if (!paused) { clock += dt * speed; dirty = true; }
    /* a camera move asked for by a button eases there rather than cutting */
    if (glide) {
      const k = Math.min(1, (now - glide.t0) / 450), e = k * k * (3 - 2 * k);
      stage.az = glide.az0 + (glide.az - glide.az0) * e;
      stage.el = glide.el0 + (glide.el - glide.el0) * e;
      stage.zoom = glide.z0 + (glide.z - glide.z0) * e;
      stage.aim(); dirty = true;
      if (k >= 1) glide = null;
    } else if (spin && !drag) { stage.az += dt * 24; stage.aim(); dirty = true; }
    last = now;
    if (dirty) frame();
  };

  /* One finger or the mouse turns the camera; two fingers pinch to zoom,
     and so do ctrl+wheel and a trackpad pinch (which browsers send as
     ctrl+wheel). A plain wheel is left to scroll the page. Double-click
     or double-tap puts the view back. */
  const cv = r.domElement;
  const ptrs = new Map();
  let drag = null, pinch = null;
  const ZMIN = 0.42, ZMAX = 1.8, ELMAX = free ? 88 : 70;
  const zoomTo = z => { glide = null; stage.zoom = Math.max(ZMIN, Math.min(ZMAX, z)); stage.aim(); dirty = true; box.classList.add('turned'); };
  const spread = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  /* one finger: sideways turns, up and down scrolls the page (drag.js) */
  const lock = axisLock();
  const down = e => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cv.setPointerCapture(e.pointerId);
    if (ptrs.size === 2) { drag = null; pinch = { d: spread(), z: stage.zoom || 1 }; }
    else if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, az: stage.az, el: stage.el }; lock.down(e); }
  };
  const move = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { zoomTo(pinch.z * (pinch.d / spread())); return; }
    if (!drag || (!free && lock.move(e) !== 'turn')) return;
    glide = null;
    stage.az = drag.az - (e.clientX - drag.x) * 0.45;
    stage.el = Math.max(-4, Math.min(ELMAX, drag.el + (e.clientY - drag.y) * 0.3));
    box.classList.add('turned');
    stage.aim(); dirty = true;
  };
  const up = e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { const [p] = [...ptrs.values()]; drag = { x: p.x, y: p.y, az: stage.az, el: stage.el }; }
    if (!ptrs.size) { drag = null; lock.up(); }
  };
  const wheel = e => {
    if (!e.ctrlKey && !free) return;
    e.preventDefault();
    zoomTo((stage.zoom || 1) * Math.exp(e.deltaY * 0.01));
  };
  const reset = () => { glide = null; stage.az = stage.az0; stage.el = stage.el0; stage.zoom = 1; stage.aim(); dirty = true; };
  /* the short way round to a heading, so "Front" from 350° turns 100°, not 260° */
  const glideTo = (az, el, z = stage.zoom || 1) => {
    const from = stage.az, to = from + ((((az - from) % 360) + 540) % 360 - 180);
    glide = { t0: performance.now(), az0: from, el0: stage.el, z0: stage.zoom || 1, az: to, el: Math.max(-4, Math.min(ELMAX, el)), z: Math.max(ZMIN, Math.min(ZMAX, z)) };
    box.classList.add('turned');
  };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', wheel, { passive: false });
  cv.addEventListener('dblclick', reset);

  const io = new IntersectionObserver(es => { visible = es[0]?.isIntersecting ?? true; });
  io.observe(box);

  frame();
  raf = requestAnimationFrame(tick);
  return {
    total,
    az0: stage.az0, el0: stage.el0,
    pause(on) { paused = on; last = 0; },
    get paused() { return paused; },
    get time() { return ((clock % total) + total) % total; },
    seek(t) { clock = t; dirty = true; },
    speed(x) { speed = x; },
    spin(on) { spin = on; },
    /* the working muscles painted on, or a plain body */
    muscles(on) { const u = stage.body.uniforms?.uMusOn; if (u) { u.value = on ? 1 : 0; dirty = true; } },
    view(az, el, z) { glideTo(az, el, z); },
    zoom(k) { zoomTo((stage.zoom || 1) * k); },
    reset() { glideTo(stage.az0, stage.el0, 1); },
    /* where the camera is, to carry between the card and the viewer */
    get camera() { return { az: stage.az, el: stage.el, zoom: stage.zoom || 1 }; },
    set camera(c) { glide = null; stage.az = c.az; stage.el = c.el; stage.zoom = c.zoom; stage.aim(); dirty = true; },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      cv.removeEventListener('wheel', wheel);
      cv.removeEventListener('dblclick', reset);
      if (cv.parentNode === box) box.removeChild(cv);
      stage.dispose();
      if (own) r.dispose(); else BUSY = false;
    },
  };
}

/* A single frame as an image, for the gallery in tools/howto/anim.html. */
export function stillImage(name, poseName, w = 360, h = 240, opts = {}) {
  const r = renderer();
  const stage = new Stage(name, document.documentElement);
  stage.useEnv(r);
  if (opts.az != null) stage.az = opts.az;
  if (opts.el != null) stage.el = opts.el;
  if (opts.zoom != null) stage.zoom = opts.zoom;
  r.setSize(w, h, false);
  stage.aim(w / h);
  stage.pose(stage.tl.pose(poseName) || stage.tl.at(0));
  stage.draw(r);
  const url = r.domElement.toDataURL('image/png');
  stage.dispose();
  return url;
}
