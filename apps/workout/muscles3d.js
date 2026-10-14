/* ═══════════════════════════════════════════════════════════
   WORKOUT — WHERE EACH MUSCLE IS ON THE 3D BODY

   The same regions as the 2D body map (bodymap.js, data.js MMAP), laid
   onto a 3D model's own surface: for every vertex, how much of it belongs
   to each muscle. Worked out from where the vertex sits in the model's
   rest pose, relative to its own bones, so the rules read like anatomy:
   "biceps: the front of the upper arm from a third of the way down to the
   elbow". A model may also carry hand-painted corrections (made in
   tools/anatomy/) that override the rules vertex by vertex.

   regionsFor(T) → { ids, w } where w[r] is a Float32Array over vertices.
   ═══════════════════════════════════════════════════════════ */

/* id (as in bodymap.js without f-/b- and -l/-r), name, group, and whether
   the region sits under the skin (shown as an overlay, not a tile). */
export const REGIONS = [
  ['pec-up', 'Upper Chest', 'Chest'], ['pec', 'Chest', 'Chest'],
  ['delt-a', 'Front Delt', 'Shoulders'], ['delt-s', 'Side Delt', 'Shoulders'], ['rdelt', 'Rear Delt', 'Shoulders'],
  ['trap', 'Upper Traps', 'Back'], ['trap-m', 'Mid Traps', 'Back'], ['rhom', 'Rhomboids', 'Back', true],
  ['lat', 'Lats', 'Back'], ['erec', 'Erectors', 'Back'],
  ['bi', 'Biceps', 'Arms'], ['brach', 'Brachialis', 'Arms'], ['tri-long', 'Triceps · Long Head', 'Arms'], ['tri-lat', 'Triceps · Lateral Head', 'Arms'],
  ['brad', 'Brachioradialis', 'Forearms'], ['fore-f', 'Wrist Flexors', 'Forearms'], ['fore-b', 'Wrist Extensors', 'Forearms'],
  ['abs-1', 'Upper Abs', 'Core'], ['abs-2', 'Mid Abs', 'Core'], ['abs-3', 'Lower Abs', 'Core'], ['obli', 'Obliques', 'Core'],
  ['serra', 'Serratus Anterior', 'Core'], ['tva', 'Transverse Abdominis', 'Core', true],
  ['hipflex', 'Hip Flexors', 'Hips'], ['glute', 'Glutes', 'Hips'], ['addu', 'Adductors', 'Hips'],
  ['quad-rf', 'Quads · Rectus Femoris', 'Legs'], ['quad-vl', 'Quads · Vastus Lateralis', 'Legs'], ['quad-vm', 'Quads · Vastus Medialis', 'Legs'],
  ['ham', 'Hamstrings', 'Legs'], ['gastro', 'Gastrocnemius', 'Legs'], ['soleus', 'Soleus', 'Legs'],
].map(([id, name, group, deep]) => ({ id, name, group, deep: !!deep }));

/* A 2D body-map id (f-pec-up-l, b-trap-m …) → region id. */
export const regionOfMapId = mid => {
  if (/^f-fore/.test(mid)) return 'fore-f';
  if (/^b-fore/.test(mid)) return 'fore-b';
  const s = mid.replace(/^[fb]-/, '').replace(/-[lr]$/, '');
  return s === 'trap-u' ? 'trap' : s;
};

/* Soft window: 1 inside [a, b], easing to 0 over `f` outside. */
const win = (x, a, b, f) => {
  if (x < a - f || x > b + f) return 0;
  const s = t => t * t * (3 - 2 * t);
  return Math.min(x < a ? s((x - (a - f)) / f) : 1, x > b ? s(((b + f) - x) / f) : 1);
};
/* The same round a limb, in degrees, wrapping. */
const wd = d => ((d + 540) % 360) - 180;
const ang = (phi, a, b, f = 14) => { const c = (a + b) / 2, h = (b - a) / 2; return win(Math.abs(wd(phi - c)), -1, h, f); };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const perp = (h, a) => norm(sub(h, a.map(x => x * dot(h, a))));

export function regionsFor(T, overrides) {
  const { geo, bones, byName } = T;
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const n = P.count, R = REGIONS.length, ri = Object.fromEntries(REGIONS.map((r, i) => [r.id, i]));
  const w = REGIONS.map(() => new Float32Array(n));
  const B = name => { const v = bones[byName[name]].P; return [v.x, v.y, v.z]; };
  const pel = B('Pelvis'), neck = B('Neck'), span = neck[1] - pel[1];
  const xs = Math.abs(B('R_UpperArm')[0]);
  /* limb frames: axis, front (+z), outside (away from the body) */
  const limb = (side, a, b, front, outHint) => {
    const A = B(`${side}_${a}`), C = B(`${side}_${b}`), d = norm(sub(C, A));
    const sg = side === 'R' ? -1 : 1;
    const fr = perp(front || [0, 0, 1], d);
    const ou = norm([fr[1] * d[2] - fr[2] * d[1], fr[2] * d[0] - fr[0] * d[2], fr[0] * d[1] - fr[1] * d[0]]);
    const out = dot(ou, outHint || [sg, 0, 0]) >= 0 ? ou : ou.map(x => -x);
    return { A, d, L: len(sub(C, A)), fr, out };
  };
  const L = {};
  for (const s of ['R', 'L']) {
    const sg = s === 'R' ? -1 : 1;
    L[s] = {
      ua: limb(s, 'UpperArm', 'Forearm'),
      /* the forearm's front is its palm side (flexors); "outside" is the
         thumb side, where brachioradialis runs. In the rest pose the palms
         face the thighs and the thumbs point forward. */
      fa: limb(s, 'Forearm', 'Hand', [-sg, 0, 0], [0, 0, 1]),
      th: limb(s, 'Thigh', 'Calf'),
      sh: limb(s, 'Calf', 'Foot'),
    };
  }
  const at = (lf, p) => { const r = sub(p, lf.A), t = dot(r, lf.d) / lf.L; const q = sub(r, lf.d.map(x => x * dot(r, lf.d))); return [t, Math.atan2(dot(q, lf.out), dot(q, lf.fr)) * 180 / Math.PI]; };
  const put = (id, i, v) => { if (v > w[ri[id]][i]) w[ri[id]][i] = v; };

  for (let i = 0; i < n; i++) {
    let bi = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const x = SW.getComponent(i, j); if (x > bw) { bw = x; bi = SI.getComponent(i, j); } }
    const bone = bones[bi].name, p = [P.getX(i), P.getY(i), P.getZ(i)], nz = N.getZ(i), side = p[0] < 0 ? 'R' : 'L';
    const nxo = N.getX(i) * (p[0] < 0 ? -1 : 1);
    if (/Hand|Finger|Head|Toe|Foot/.test(bone)) continue;
    const tt = (p[1] - pel[1]) / span, u = Math.abs(p[0]) / xs;
    const front = win(nz, 0.25, 1.1, 0.25), back = win(-nz, 0.2, 1.1, 0.25), sideOn = win(nxo, 0.35, 1.1, 0.25);
    const S = L[side];

    if (/UpperArm|Clavicle|ShoulderHelper/.test(bone) || (/Spine2/.test(bone) && u > 0.75)) {
      const [t, phi] = at(S.ua, p);
      const cap = win(t, -0.35, 0.44, 0.07);
      put('delt-a', i, cap * ang(phi, -70, 32));
      put('delt-s', i, cap * ang(phi, 32, 128));
      put('rdelt', i, cap * ang(phi, 128, 218));
      put('bi', i, win(t, 0.4, 0.9, 0.06) * ang(phi, -55, 40));
      put('brach', i, win(t, 0.58, 0.98, 0.06) * ang(phi, 40, 98));
      put('tri-lat', i, win(t, 0.42, 0.82, 0.06) * ang(phi, 98, 165));
      put('tri-long', i, win(t, 0.24, 0.9, 0.07) * ang(phi, 165, 285));
    }
    if (/Forearm/.test(bone)) {
      const [t, phi] = at(S.fa, p);
      const fore = win(t, -0.05, 0.78, 0.08);
      put('brad', i, win(t, -0.08, 0.55, 0.08) * ang(phi, 58, 122));
      put('fore-f', i, fore * ang(phi, -95, 58));
      put('fore-b', i, fore * ang(phi, 122, 265));
    }
    if (/Thigh/.test(bone)) {
      const [t, phi] = at(S.th, p);
      put('quad-rf', i, win(t, 0.08, 0.84, 0.06) * ang(phi, -26, 26, 10));
      put('quad-vl', i, win(t, 0.16, 0.92, 0.06) * ang(phi, 26, 108, 10));
      put('quad-vm', i, win(t, 0.55, 0.96, 0.05) * ang(phi, -82, -26, 10));
      put('addu', i, win(t, 0.0, 0.62, 0.08) * ang(phi, -158, -82, 12));
      put('ham', i, win(t, 0.14, 0.93, 0.06) * ang(phi, 122, 238, 12));
    }
    if (/Calf/.test(bone)) {
      const [t, phi] = at(S.sh, p);
      const g = win(t, 0.02, 0.55, 0.06) * ang(phi, 128, 232, 12);
      put('gastro', i, g);
      put('soleus', i, (1 - g) * win(t, 0.3, 0.84, 0.06) * ang(phi, 98, 262, 12));
    }
    if (/Pelvis|Spine|Neck|Clavicle|ShoulderHelper|Thigh/.test(bone)) {
      /* the trunk, by height between hip joint and neck (tt), distance out
         from the midline in shoulder widths (u), and which way the skin faces */
      /* Heights in tt (0 at the hip joint, 1 at the base of the neck),
         from landmarks on the athlete: the pec's lower border at 0.57, its
         peak at 0.70, the collarbone at 0.92; the navel at 0.30; the lowest
         ribs at 0.48 at the side; the iliac crest at 0.26; the gluteal fold
         at -0.11. Rectus abdominis rows: upper between the pecs and the
         lowest rib line, middle down to the navel, lower to the pubis. */
      put('pec-up', i, win(tt, 0.79, 0.94, 0.04) * win(u, 0.06, 0.82, 0.08) * front);
      put('pec', i, win(tt, 0.57, 0.79, 0.03) * win(u, 0.04, 0.86, 0.08) * front);
      const abs = win(u, -1, 0.32, 0.05) * front;
      put('abs-1', i, win(tt, 0.43, 0.57, 0.03) * abs);
      put('abs-2', i, win(tt, 0.28, 0.43, 0.03) * abs);
      put('abs-3', i, win(tt, -0.07, 0.28, 0.03) * abs);
      put('obli', i, win(tt, 0.12, 0.52, 0.05) * win(u, 0.32, 0.8, 0.06) * win(nz, -0.35, 1.1, 0.2));
      put('serra', i, win(tt, 0.44, 0.65, 0.04) * win(u, 0.55, 0.88, 0.06) * sideOn);
      put('tva', i, win(tt, -0.04, 0.32, 0.05) * win(u, -1, 0.62, 0.08) * win(nz, 0.1, 1.1, 0.2));
      put('hipflex', i, win(tt, -0.17, 0.03, 0.03) * win(u, 0.2, 0.6, 0.06) * front);
      /* upper traps: the slope from the neck to the shoulder and the top of
         the back, never the front of the chest or neck */
      const upperBack = win(tt, 0.84, 1.12, 0.05) * win(u, -1, 0.72, 0.08) * win(nz, -1.1, 0.12, 0.18) * win(N.getY(i) - nz * 0.4, 0.05, 1.5, 0.25);
      put('trap', i, upperBack);
      /* Back: mid traps between the shoulder blades, rhomboids under them,
         lats from the lower ribs and lumbar fascia up to the armpit, the
         erectors either side of the lumbar spine, the glutes from the iliac
         crest down to the gluteal fold (and round the upper side of the hip,
         gluteus medius). */
      put('trap-m', i, win(tt, 0.52, 0.8, 0.04) * win(u, -1, 0.44, 0.06) * back);
      put('rhom', i, win(tt, 0.55, 0.76, 0.04) * win(u, 0.08, 0.36, 0.05) * back);
      put('lat', i, win(tt, 0.25, 0.68, 0.04) * win(u, 0.3, 0.98, 0.06) * win(nz, -1.1, 0.05, 0.2) * (1 - win(tt, 0.52, 1, 0.02) * win(u, -1, 0.44, 0.04)));
      put('erec', i, win(tt, 0.02, 0.5, 0.04) * win(u, -1, 0.3, 0.05) * back);
      put('glute', i, Math.max(
        win(tt, -0.12, 0.27, 0.04) * win(u, -1, 0.9, 0.06) * win(nz, -1.1, -0.05, 0.2),
        win(tt, 0.06, 0.27, 0.04) * win(u, 0.55, 1.05, 0.06) * win(nxo, 0.3, 1.1, 0.2)));
    }
  }
  /* A vertex belongs mostly to one surface muscle: the strongest keeps its
     weight, the rest are scaled down so tiles don't double up. Deep
     muscles (tva, rhomboids) stay as overlays. */
  const surf = REGIONS.map((r, k) => (r.deep ? -1 : k)).filter(k => k >= 0);
  for (let i = 0; i < n; i++) {
    let best = -1, bv = 0;
    for (const k of surf) if (w[k][i] > bv) { bv = w[k][i]; best = k; }
    for (const k of surf) if (k !== best) w[k][i] *= 0.25;
  }
  /* Hand-painted corrections: { regionId: { vertexIndex: weight } } */
  if (overrides) for (const [id, m] of Object.entries(overrides)) {
    const k = ri[id]; if (k === undefined) continue;
    for (const [vi, val] of Object.entries(m)) {
      if (val > 0 && !REGIONS[k].deep) for (const s2 of surf) w[s2][vi] = Math.min(w[s2][vi], 1 - val);
      w[k][vi] = val;
    }
  }
  return { ids: REGIONS.map(r => r.id), w };
}

/* regionsFor(T) worked out once per model (about 0.2 s) and shared by
   everything that lights muscles on it. */
const MEMO = new WeakMap();
export const regionsOf = T => MEMO.get(T) || MEMO.set(T, regionsFor(T)).get(T);

/* Per-vertex paint for an exercise's working muscles (hi) and helpers
   (hi2), from the regions: [primary, secondary] Float32Arrays, as
   avatar.js's Trainer takes them. */
export function regionPaint(T, hi = [], hi2 = [], MMAP) {
  const { ids, w } = regionsOf(T), n = T.geo.attributes.position.count;
  const out = [new Float32Array(n), new Float32Array(n)];
  [hi, hi2].forEach((names, j) => {
    for (const id of new Set(names.flatMap(x => regionsOfMuscle(x, MMAP)))) {
      const k = ids.indexOf(id);
      if (k < 0 || REGIONS[k].deep) continue;
      const a = w[k], o = out[j];
      for (let i = 0; i < n; i++) if (a[i] > o[i]) o[i] = a[i];
    }
  });
  /* where a working muscle lies, a helper's paint gives way */
  for (let i = 0; i < n; i++) out[1][i] = Math.min(out[1][i], 1 - out[0][i]);
  return out;
}

/* Exercise muscle names (moves.js hi/hi2, data.js m: strings) → region ids,
   through the 2D map's own table so both agree on what "chest" is. */
const ALIAS = { abs: 'rectus abdominis', serratus: 'serratus anterior', calves: 'gastrocnemius|soleus', 'upper chest': 'upper chest' };
export function regionsOfMuscle(name, MMAP) {
  const k = name.toLowerCase().replace(/\(.*?\)/g, '').trim();
  const keys = (ALIAS[k] || k).split('|');
  const out = new Set();
  for (const key of keys) {
    let ids = MMAP[key];
    if (!ids) { const hit = Object.keys(MMAP).find(m => key.includes(m) || m.includes(key)); ids = hit ? MMAP[hit] : []; }
    for (const mid of ids) out.add(regionOfMapId(mid));
  }
  return [...out];
}
