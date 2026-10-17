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
  ['scm', 'Sternocleidomastoid', 'Neck'],
  ['pec-up', 'Upper Chest', 'Chest'], ['pec', 'Chest', 'Chest'],
  ['delt-a', 'Front Delt', 'Shoulders'], ['delt-s', 'Side Delt', 'Shoulders'], ['rdelt', 'Rear Delt', 'Shoulders'],
  ['supra', 'Supraspinatus', 'Shoulders', true], ['infra', 'Infraspinatus · Teres Minor', 'Shoulders'],
  ['trap', 'Upper Traps', 'Back'], ['trap-m', 'Mid Traps', 'Back'], ['rhom', 'Rhomboids', 'Back', true],
  ['lat', 'Lats', 'Back'], ['erec', 'Erectors', 'Back'],
  ['bi', 'Biceps', 'Arms'], ['brach', 'Brachialis', 'Arms'], ['tri-long', 'Triceps · Long Head', 'Arms'], ['tri-lat', 'Triceps · Lateral Head', 'Arms'],
  ['brad', 'Brachioradialis', 'Forearms'], ['fore-f', 'Wrist Flexors', 'Forearms'], ['fore-b', 'Wrist Extensors', 'Forearms'],
  ['abs-1', 'Upper Abs', 'Core'], ['abs-2', 'Mid Abs', 'Core'], ['abs-3', 'Lower Abs', 'Core'], ['obli', 'Obliques', 'Core'],
  ['serra', 'Serratus Anterior', 'Core'], ['tva', 'Transverse Abdominis', 'Core', true],
  ['hipflex', 'Hip Flexors', 'Hips'], ['glute', 'Glutes', 'Hips'], ['gmed', 'Glute Medius', 'Hips'], ['tfl', 'Tensor Fasciae Latae', 'Hips'],
  ['addu', 'Adductors', 'Hips'],
  ['quad-rf', 'Quads · Rectus Femoris', 'Legs'], ['quad-vl', 'Quads · Vastus Lateralis', 'Legs'], ['quad-vm', 'Quads · Vastus Medialis', 'Legs'],
  ['ham', 'Hamstrings', 'Legs'], ['gastro', 'Gastrocnemius', 'Legs'], ['soleus', 'Soleus', 'Legs'], ['tib', 'Tibialis Anterior', 'Legs'],
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

/* The sternocleidomastoid's line up the neck (see regionsFor): x, y, z
   from the neck joint in trunk heights, and the band's half width there. */
const SCM = [[0.074, -0.032, 0.122, 0.042], [0.096, 0.087, 0.062, 0.04], [0.092, 0.206, -0.01, 0.032]];

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
      /* tibialis anterior: the front of the shin just outside the tibia's
         sharp crest (0°), its belly the upper two-thirds; the bare bone of
         the inner shin stays bare, and the peroneals at the side too */
      put('tib', i, win(t, 0.05, 0.62, 0.06) * ang(phi, 12, 72, 10));
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
      /* Sternocleidomastoid: a band from the top of the breastbone and the
         inner collarbone (C0) up the front of the neck, turning round its
         side (C1) to the bump behind the ear (C2). Points are from the neck
         joint in trunk heights (x out from the midline, y up, z forward);
         at each height the band is the skin within `hw` of the line, so it
         narrows from its two heads at the bottom to the tendon at the top.
         Upper traps take the side of the neck behind it. */
      const k = ((p[1] - neck[1]) / span + 0.032) / 0.238;   // 0 at the breastbone, 1 behind the ear
      if (k > -0.07 && k < 1.07) {
        const x = u * xs / span, z = (p[2] - neck[2]) / span;
        const [a, b, f] = k < 0.5 ? [SCM[0], SCM[1], k * 2] : [SCM[1], SCM[2], k * 2 - 1];
        const d = Math.hypot(x - (a[0] + (b[0] - a[0]) * f), z - (a[2] + (b[2] - a[2]) * f));
        put('scm', i, win(k, 0, 1, 0.07) * win(d, -1, a[3] + (b[3] - a[3]) * f, 0.012));
      }
      /* upper traps: the slope from the neck to the shoulder and the top of
         the back, never the front of the chest or neck */
      const upperBack = win(tt, 0.84, 1.12, 0.05) * win(u, -1, 0.72, 0.08) * win(nz, -1.1, 0.12, 0.18) * win(N.getY(i) - nz * 0.4, 0.05, 1.5, 0.25);
      put('trap', i, upperBack);
      /* The shoulder blade, either side of its spine, which climbs from
         the blade's inner edge (u 0.35, tt 0.78) out to the point of the
         shoulder: supraspinatus in the hollow above it, under the upper
         traps (deep); infraspinatus and teres minor on the blade below it,
         between the mid traps, the rear delt and the top of the lats. The
         rear delt's cap, worked out round the arm, would run on over the
         blade, so it gives way to them there. */
      const spineAt = 0.78 + (u - 0.35) * 0.2;
      put('supra', i, win(tt, spineAt + 0.01, spineAt + 0.1, 0.03) * win(u, 0.3, 0.82, 0.06) * win(nz, -1.1, 0.3, 0.2));
      const infra = win(tt, 0.65, spineAt, 0.03) * win(u, 0.47, 0.8, 0.05) * back;
      put('infra', i, infra);
      w[ri.rdelt][i] *= 1 - infra;
      /* Back: mid traps between the shoulder blades, rhomboids under them,
         lats from the lower ribs and lumbar fascia up to the armpit, the
         erectors either side of the lumbar spine, and gluteus maximus from
         the iliac crest down to the gluteal fold. */
      put('trap-m', i, win(tt, 0.52, 0.8, 0.04) * win(u, -1, 0.44, 0.06) * back);
      put('rhom', i, win(tt, 0.55, 0.76, 0.04) * win(u, 0.08, 0.36, 0.05) * back);
      put('lat', i, win(tt, 0.25, 0.68, 0.04) * win(u, 0.3, 0.98, 0.06) * win(nz, -1.1, 0.05, 0.2) * (1 - win(tt, 0.52, 1, 0.02) * win(u, -1, 0.44, 0.04)) * (1 - infra));
      put('erec', i, win(tt, 0.02, 0.5, 0.04) * win(u, -1, 0.3, 0.05) * back);
      /* gluteus maximus wraps round to the side of the hip low down, by
         the top of the thigh bone, but higher up keeps to the back: its
         front edge runs up and back from there to the crest by the sacrum */
      put('glute', i, win(tt, -0.12, 0.27, 0.04) * win(u, -1, 0.9, 0.06) * win(nz, -1.1, -0.1 - 0.6 * Math.min(1, Math.max(0, tt / 0.13)), 0.2));
      /* The side of the hip: gluteus medius above that edge, from the
         iliac crest (under the obliques' overhang at the side) down to the
         top of the thigh bone, and in front of it tensor fasciae latae,
         from the front of the crest down and back towards the outside of
         the thigh, in the thigh's own frame: from beside the hip flexors at
         its top (30°) to the side (75°) a quarter of the way down. */
      put('gmed', i, win(tt, -0.02, 0.27, 0.04) * win(u, 0.5, 1.05, 0.06) * win(nxo, 0.3, 1.1, 0.2) * win(nz, -1.1, 0.3, 0.2));
      {
        const [t, phi] = at(S.th, p), c = 30 + 45 * Math.min(1, Math.max(0, (t + 0.12) / 0.36));
        put('tfl', i, win(t, -0.12, 0.22, 0.05) * ang(phi, c - 15, c + 15, 10));
      }
    }
  }
  /* A vertex belongs mostly to one surface muscle: the strongest keeps its
     weight, the rest are scaled down so tiles don't double up. Deep
     muscles (tva, rhomboids, supraspinatus) stay as overlays. */
  const surf = REGIONS.map((r, k) => (r.deep ? -1 : k)).filter(k => k >= 0);
  for (let i = 0; i < n; i++) {
    let best = -1, bv = 0;
    for (const k of surf) if (w[k][i] > bv) { bv = w[k][i]; best = k; }
    for (const k of surf) if (k !== best) w[k][i] *= 0.25;
  }
  /* Hand-painted corrections: { regionId: { vertexIndex: weight } } */
  const touched = new Set();
  if (overrides) for (const [id, m] of Object.entries(overrides)) {
    const k = ri[id]; if (k === undefined) continue;
    for (const [vi, val] of Object.entries(m)) {
      if (val > 0 && !REGIONS[k].deep) for (const s2 of surf) w[s2][vi] = Math.min(w[s2][vi], 1 - val);
      w[k][vi] = val;
      touched.add(+vi);
    }
  }
  clothFromSkin(T, w, touched, span);
  return { ids: REGIONS.map(r => r.id), w };
}

/* The rules above read a point's bone and which way its surface faces.
   Loose shorts break both — folds turn the cloth every which way and its
   points swap between hip and thigh bones — so painted by the rules the
   glutes came out in hard-edged blocks. The skin under the shorts (the
   athlete's hidden "bareskin", the body as it is) paints cleanly, so each
   shorts point takes the regions of the skin under it: the nearest skin
   point, blurred over a few centimetres round it, since the skin's own
   steps that read as a faint wash on skin show as hard brown bands on
   dark fabric. avatar.js then draws the paint on cloth with a clean edge.
   A point hand-painted in the anatomy bench keeps its own paint. */
function clothFromSkin(T, w, touched, span) {
  const { geo, matNames } = T;
  const cloth = matNames?.indexOf('shorts'), skin = matNames?.indexOf('bareskin');
  if (!(cloth >= 0 && skin >= 0)) return;
  const idx = geo.index.array, X = geo.attributes.position.array;
  const verts = mi => {
    const s = new Set();
    for (const g of geo.groups) if (g.materialIndex === mi) for (let i = g.start; i < g.start + g.count; i++) s.add(idx[i]);
    return [...s];
  };
  const from = verts(skin), to = verts(cloth).filter(i => !touched.has(i));
  if (!from.length || !to.length) return;
  const R = span * 0.07, s2 = 2 * (R / 2) ** 2;   // blur radius, about 3.5 cm on the athlete
  /* a grid of R-sized cells over the skin */
  const c = i => [Math.floor(X[3 * i] / R), Math.floor(X[3 * i + 1] / R), Math.floor(X[3 * i + 2] / R)];
  const key = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  const grid = new Map();
  for (const i of from) { const k = key(...c(i)); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const d2 = (i, j) => { const a = 3 * i, b = 3 * j, dx = X[a] - X[b], dy = X[a + 1] - X[b + 1], dz = X[a + 2] - X[b + 2]; return dx * dx + dy * dy + dz * dz; };
  const live = w.filter(a => from.some(i => a[i] > 0));   // regions with any paint under the shorts
  const js = [], ks = [];
  for (const i of to) {
    const [cx, cy, cz] = c(i);
    /* the skin point under this one */
    let q = -1, bd = Infinity;
    for (let r = 1; r <= 4 && q < 0; r++)
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++)
        for (const j of grid.get(key(x, y, z)) || []) { const d = d2(i, j); if (d < bd) { bd = d; q = j; } }
    for (const a of w) a[i] = 0;
    if (q < 0) continue;
    /* and the skin round it */
    const [qx, qy, qz] = c(q);
    let sum = 0;
    js.length = ks.length = 0;
    for (let x = qx - 1; x <= qx + 1; x++) for (let y = qy - 1; y <= qy + 1; y++) for (let z = qz - 1; z <= qz + 1; z++)
      for (const j of grid.get(key(x, y, z)) || []) { const d = d2(q, j); if (d <= R * R) { const k = Math.exp(-d / s2); js.push(j); ks.push(k); sum += k; } }
    for (const a of live) {
      let v = 0;
      for (let n = 0; n < js.length; n++) v += a[js[n]] * ks[n];
      a[i] = v / sum;
    }
  }
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
/* Muscles the 2D map has no shape for, straight to their regions, ahead
   of the map's table (whose loose matching would otherwise reach for the
   nearest name it has). The abductors are both muscles at the side of
   the hip; medius alone is just itself. */
const DIRECT = {
  'rotator cuff': ['infra', 'supra'], infraspinatus: ['infra'], 'teres minor': ['infra'], 'external rotators': ['infra'],
  supraspinatus: ['supra'],
  'glute medius': ['gmed'], 'gluteus medius': ['gmed'], 'glute med': ['gmed'], 'hip abductors': ['gmed', 'tfl'], abductors: ['gmed', 'tfl'],
  tfl: ['tfl'], 'tensor fasciae latae': ['tfl'],
  tibialis: ['tib'], 'tibialis anterior': ['tib'],
  neck: ['scm'], sternocleidomastoid: ['scm'],
};
export function regionsOfMuscle(name, MMAP) {
  const k = name.toLowerCase().replace(/\(.*?\)/g, '').trim();
  if (DIRECT[k]) return [...DIRECT[k]];
  const keys = (ALIAS[k] || k).split('|');
  const out = new Set();
  for (const key of keys) {
    let ids = MMAP[key];
    if (!ids) { const hit = Object.keys(MMAP).find(m => key.includes(m) || m.includes(key)); ids = hit ? MMAP[hit] : []; }
    for (const mid of ids) out.add(regionOfMapId(mid));
  }
  return [...out];
}
