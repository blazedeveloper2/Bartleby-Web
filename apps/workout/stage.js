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
import { MOTION } from './moves.js?v=3d-oct14';
import { timeline } from './timeline.js?v=3d-oct14';
import { skeleton, holds, points, normalize, SEG, BODY, v3 } from './rig.js?v=3d-oct14';

const D = Math.PI / 180;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* ── theme ── */

function palette(el) {
  const cs = getComputedStyle(el || document.documentElement);
  const c = name => new THREE.Color((cs.getPropertyValue(name) || '#888').trim() || '#888');
  const mix = (a, b, k) => a.clone().lerp(b, k);
  const bg = c('--bg'), card = c('--bg-card'), text = c('--text'), t2 = c('--text-2'), t3 = c('--text-3');
  const light = bg.getHSL({}).l > 0.5;
  return {
    light,
    skin: light ? mix(t2, t3, 0.15) : mix(t2, t3, 0.12),
    shirt: mix(t3, card, light ? 0.1 : 0.05),
    shorts: mix(t3, bg, light ? 0.35 : 0.45),
    shoe: mix(t3, bg, 0.6),
    sole: mix(t3, bg, 0.75),
    hair: mix(t3, bg, 0.55),
    steel: mix(t3, t2, 0.4),
    pad: mix(t3, card, light ? 0.35 : 0.62),
    plate: mix(t2, t3, 0.35),
    plateDark: mix(t3, bg, 0.3),
    wall: mix(t3, bg, light ? 0.72 : 0.8),
    mat: mix(mix(t3, bg, 0.62), c('--blue'), 0.08),
    book: mix(t3, card, 0.3),
    book2: mix(c('--blue'), card, 0.55),
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
function roundBox(w, h, d, r, seg = 3) {
  r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  s.moveTo(x, y - r);
  s.lineTo(x + ww, y - r); s.quadraticCurveTo(x + ww + r, y - r, x + ww + r, y);
  s.lineTo(x + ww + r, y + hh); s.quadraticCurveTo(x + ww + r, y + hh + r, x + ww, y + hh + r);
  s.lineTo(x, y + hh + r); s.quadraticCurveTo(x - r, y + hh + r, x - r, y + hh);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
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

const PROF = {
  ua: [[0, 5.6], [0.22, 5.7], [0.45, 5.4], [0.8, 4.4], [1, 4.0]],
  fa: [[0, 4.1], [0.2, 4.6], [0.6, 3.6], [1, 2.9]],
  th: [[0, 7.8], [0.25, 7.5], [0.7, 6.0], [1, 4.9]],
  sh: [[0, 4.9], [0.22, 5.5], [0.55, 4.3], [1, 3.2]],
};
/* The torso's cross-section along the spine: half-width, half-depth, and
   how far the section's centre sits in front of the spine. */
const TORSO = [[-0.18, 7.4, 6.0, -0.6], [-0.08, 12.2, 8.6, -1.1], [0.05, 12.9, 9.2, -1.4], [0.22, 12.0, 8.0, -0.3],
  [0.38, 11.2, 7.6, 0.4], [0.55, 12.3, 8.9, 0.9], [0.72, 13.8, 9.8, 1.1], [0.86, 15.0, 8.8, 0.5], [0.95, 11.6, 6.8, 0.1], [1.01, 5.6, 4.8, 0.2]];
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
      .replace('#include <common>', '#include <common>\nuniform vec3 uMusCol;\nuniform vec3 uMusCol2;\nuniform float uEffort;\nvarying float vMus;\nvarying float vMus2;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float mE = clamp((uEffort - 0.45) / 0.55, 0.0, 1.0);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol2, vMus2 * 0.8);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uMusCol, min(1.0, vMus * (0.9 + 0.2 * mE)));',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance += uMusCol * vMus * (0.12 + 0.42 * mE) + uMusCol2 * vMus2 * 0.06;',
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
      idx.push(i, i + around, j, j, i + around, j + around);
    }
    const b = (rings + 1) * around, top = b + 1;
    for (let a = 0; a < around; a++) {
      idx.push(b, a, (a + 1) % around);
      idx.push(top, rings * around + (a + 1) % around, rings * around + a);
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
    this.uniforms = { uMusCol: { value: pal.muscle.clone() }, uMusCol2: { value: pal.muscle2.clone() }, uEffort: { value: 0.45 } };
    const U = this.uniforms;
    const std = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    this.mat = {
      skin: bodyMaterial(pal.skin, 0.5, U),
      shirt: bodyMaterial(pal.shirt, 0.8, U),
      shorts: bodyMaterial(pal.shorts, 0.82, U),
      shoe: std(pal.shoe, 0.55),
      sole: std(pal.sole, 0.7),
      hair: std(pal.hair, 0.88),
    };
    this.group = new THREE.Group();
    const add = (geo, mat) => { const mm = new THREE.Mesh(geo, mat); mm.castShadow = mm.receiveShadow = true; this.group.add(mm); return mm; };
    const base = {
      ua: limbGeo(SEG.ua, PROF.ua), fa: limbGeo(SEG.fa, PROF.fa), th: limbGeo(SEG.th, PROF.th), sh: limbGeo(SEG.sh, PROF.sh),
      sleeve: limbGeo(SEG.ua * 0.4, [[0, 6.6], [1, 6.2]]),
      legShort: limbGeo(SEG.th * 0.48, [[0, 8.4], [1, 7.4]]),
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
        delt: add(paintDelt(new THREE.SphereGeometry(6.4, 24, 16), sg, hi, hi2), this.mat.shirt),
        elbow: add(new THREE.SphereGeometry(4.0, 18, 12), this.mat.skin),
        knee: add(new THREE.SphereGeometry(5.0, 18, 12), this.mat.skin),
        wrist: add(new THREE.SphereGeometry(2.9, 14, 10), this.mat.skin),
        hand: add(roundBox(3.3, SEG.hand, 6.0, 1.5), this.mat.skin),
        thumb: add(limbGeo(3.4, [[0, 1.35], [1, 1.1]], 10), this.mat.skin),
        shoe: add(limbGeo(SEG.toe + SEG.heel + 2.4, [[0, 3.0], [0.3, 3.3], [0.75, 3.4], [1, 2.9]], 18), this.mat.shoe),
        sole: add(limbGeo(SEG.toe + SEG.heel + 3.0, [[0, 3.1], [0.5, 3.5], [1, 3.1]], 18), this.mat.sole),
      };
    }
    this.shirt = new TorsoTube(0.15, 1.01, 0.35, this.mat.shirt, hi, hi2);
    this.shorts = new TorsoTube(-0.18, 0.24, 0.55, this.mat.shorts, hi, hi2, 7);
    this.group.add(this.shirt.mesh, this.shorts.mesh);
    this.neck = add(limbGeo(9.5, [[0, 4.0], [1, 3.7]]), this.mat.skin);
    this.head = add(new THREE.SphereGeometry(BODY.headR, 36, 28), this.mat.skin);
    this.head.scale.set(0.88, 1.05, 0.98);
    this.hair = add(new THREE.SphereGeometry(BODY.headR + 0.45, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), this.mat.hair);
    this.hair.scale.set(0.9, 1.05, 1.0);
    this.nose = add(new THREE.SphereGeometry(1.4, 12, 8), this.mat.skin);
    this.nose.scale.set(0.8, 1.3, 1);
    this.ears = [0, 1].map(() => { const e = add(new THREE.SphereGeometry(1.7, 12, 8), this.mat.skin); e.scale.set(0.55, 1.2, 0.9); return e; });
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
      const heel = v3.mad(s.ank, s.footDir, -(SEG.heel + 1.2));
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
    this.head.position.copy(V(H.centre));
    orient(this.head, H.dir, H.face);
    /* Hair over the crown and the back of the head. */
    this.hair.position.copy(V(v3.mad(H.centre, H.face, -0.7)));
    orient(this.hair, v3.norm(v3.sub(H.dir, v3.mul(H.face, 0.5))), H.face);
    this.nose.position.copy(V(v3.mad(v3.mad(H.centre, H.face, BODY.headR * 0.95), H.dir, -1.2)));
    orient(this.nose, H.dir, H.face);
    this.ears.forEach((e, i) => { e.position.copy(V(v3.mad(v3.mad(H.centre, H.side, (i ? 1 : -1) * BODY.headR * 0.86), H.face, -0.8))); orient(e, H.dir, H.side); });
  }
}

/* ══ KIT ══ */

function kitMaterials(pal) {
  const std = (color, rough, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  return {
    steel: std(pal.steel, 0.32, 0.65), pad: std(pal.pad, 0.62), plate: std(pal.plate, 0.42, 0.1),
    plateDark: std(pal.plateDark, 0.5, 0.2), wall: std(pal.wall, 0.95), mat: std(pal.mat, 0.9),
    book: std(pal.book, 0.8), book2: std(pal.book2, 0.8), rubber: std(pal.plateDark, 0.85),
    pack: std(pal.shorts.clone().lerp(pal.accent, 0.18), 0.85),
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
  const pad = (cx, cy, angle, l) => {
    const m = new THREE.Mesh(roundBox(l, 8.4, Wd, 3.2), K.pad);
    m.position.set(cx, cy, 0);
    m.rotation.z = angle * D;
    return m;
  };
  const dir = 180 - back;
  const o = [-23, y];
  const c = [o[0] + Math.cos(dir * D) * len / 2, o[1] + Math.sin(dir * D) * len / 2];
  g.add(pad(0, y, 0, 46), pad(c[0], c[1], dir - 180, len));
  const top = [o[0] + Math.cos(dir * D) * len, o[1] + Math.sin(dir * D) * len];
  const rearX = Math.min(-31, top[0] + 8);
  const r = 1.7, rail = 7;
  g.add(rod([rearX - 2, rail, 0], [31, rail, 0], r * 1.15, K.steel));
  for (const fx of [29, rearX]) {
    g.add(rod([fx, rail, 0], [fx, 2.2, 0], r, K.steel));
    g.add(rod([fx, 1.6, -15], [fx, 1.6, 15], 1.6, K.steel));
    for (const z of [-15, 15]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), K.rubber); cap.position.set(fx, 1.6, z); g.add(cap); }
  }
  g.add(rod([3, y - 4.2, 0], [3, rail, 0], r * 1.15, K.steel));
  g.add(rod([-19, y - 5, 0], [19, y - 5, 0], 1.3, K.steel));
  if (back > 8) {
    const n = [Math.cos((dir + 90) * D), Math.sin((dir + 90) * D)];
    const brace = [o[0] + Math.cos(dir * D) * len * 0.42 + n[0] * 5.4, o[1] + Math.sin(dir * D) * len * 0.42 + n[1] * 5.4];
    g.add(rod([-25, rail, 0], [brace[0], brace[1], 0], r, K.steel));
    for (let i = 0; i < 5; i++) g.add(rod([-24 + i * 3.6, rail + 1.2, -2.4], [-24 + i * 3.6, rail + 1.2, 2.4], 0.6, K.steel, 6));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 12), K.rubber);
    pin.position.set((-25 + brace[0]) / 2, (rail + brace[1]) / 2, 3);
    pin.rotation.x = Math.PI / 2;
    g.add(pin);
  } else {
    g.add(rod([top[0] + 6, top[1] - 3, 0], [top[0] + 6, rail, 0], r, K.steel));
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
      const x = s.x ?? 100, y = 194 - s.y, wx = x - 34;
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
      sh.moveTo(-s.w / 2, 0); sh.lineTo(s.w / 2, 0); sh.lineTo(s.w / 2, s.h); sh.lineTo(-s.w / 2, s.h * 0.3); sh.closePath();
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
      const p = new THREE.Mesh(roundBox(15 * s, 2.4, 15 * s, 3.2 * s), i === 1 ? K.plateDark : K.plate);
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
    const b = new THREE.Mesh(roundBox(22, 26, 10, 4), K.pack);
    g.add(b);
  }
  return shadow(g);
}

/* ══ STAGE ══ */

/* One renderer is shared, its canvas moved into whichever lab is open.
   A second view open at the same time (the gallery's live mode) gets its
   own, released when it stops. */
let RENDERER = null, BUSY = false;
function renderer(own = false) {
  if (RENDERER && !own) return RENDERER;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.18;
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

export class Stage {
  constructor(name, el) {
    const m = MOTION[name];
    this.m = m;
    this.tl = timeline(m, normalize);
    const pal = palette(el);
    this.pal = pal;
    const S = this.scene = new THREE.Scene();
    const K = kitMaterials(pal);
    this.body = new Mannequin(pal, m);
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

    S.add(new THREE.HemisphereLight(0xffffff, pal.floor, pal.light ? 1.7 : 1.9));
    const key = new THREE.DirectionalLight(0xffffff, pal.light ? 2.1 : 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.4;
    key.shadow.radius = 4;
    const r = this.radius * 1.3;
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 6 });
    this.key = key;
    S.add(key, key.target);
    const rim = new THREE.DirectionalLight(pal.accent.clone().lerp(new THREE.Color(0xffffff), 0.55), pal.light ? 0.9 : 1.6);
    this.rim = rim;
    S.add(rim, rim.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    this.fill = fill;
    S.add(fill, fill.target);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: pal.light ? 0.16 : 0.32 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    S.add(floorDisc(pal, Math.max(120, this.radius * 1.6)), floor);
    this.aim();
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
    dist *= 1.04;
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
    const J = skeleton(p);
    this.body.update(J, p.effort ?? 0.45);
    holds(J, this.m).forEach((it, i) => {
      const o = this.held[i];
      if (!o) return;
      o.position.copy(V(it.pos));
      orient(o, it.axis, it.up || [0, 1, 0]);
    });
    return J;
  }

  draw(r) { r.render(this.scene, this.camera); }

  dispose() {
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(mm => { mm.map?.dispose(); mm.dispose(); });
    });
  }
}

/* ── the lab ── */

/* Runs the rep in `box` (an element sized by CSS); returns the stop. */
export function mount(box, name, { onStep, still = false } = {}) {
  const own = BUSY;
  const r = renderer(own);
  if (!own) BUSY = true;
  const stage = new Stage(name, box);
  box.appendChild(r.domElement);
  let raf = 0, clock = 0, last = 0, paused = still, dirty = true, visible = true;

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
    if (!still) { const s = stage.tl.step(clock); onStep?.(s.i, s.u); }
    dirty = false;
  };
  const tick = now => {
    raf = requestAnimationFrame(tick);
    if (!visible) { last = 0; return; }
    if (!paused) { clock += last ? Math.min(0.1, (now - last) / 1000) : 0; dirty = true; }
    last = now;
    if (dirty) frame();
  };

  /* Drag to turn the camera; double-click puts it back. */
  const cv = r.domElement;
  let drag = null;
  const down = e => { drag = { x: e.clientX, y: e.clientY, az: stage.az, el: stage.el }; cv.setPointerCapture(e.pointerId); box.classList.add('turned'); };
  const move = e => {
    if (!drag) return;
    stage.az = drag.az - (e.clientX - drag.x) * 0.45;
    stage.el = Math.max(-4, Math.min(70, drag.el + (e.clientY - drag.y) * 0.3));
    stage.aim(); dirty = true;
  };
  const up = () => { drag = null; };
  const reset = () => { stage.az = stage.az0; stage.el = stage.el0; stage.aim(); dirty = true; };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', reset);

  const io = new IntersectionObserver(es => { visible = es[0]?.isIntersecting ?? true; });
  io.observe(box);

  frame();
  raf = requestAnimationFrame(tick);
  return {
    pause(on) { paused = on; last = 0; },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
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
  if (opts.az != null) stage.az = opts.az;
  if (opts.el != null) stage.el = opts.el;
  r.setSize(w, h, false);
  stage.aim(w / h);
  stage.pose(stage.tl.pose(poseName) || stage.tl.at(0));
  stage.draw(r);
  const url = r.domElement.toDataURL('image/png');
  stage.dispose();
  return url;
}
