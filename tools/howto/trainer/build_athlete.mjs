// node tools/howto/trainer/build_athlete.mjs <body.json> assets/models/trainer assets/models/athlete
//   body.json: the sculpt reduced by reduce.mjs. Set HEAT_WEIGHTS to Blender's
//   weights (blender_weights.py) to use them; see tools/howto/README.md.
// The sculpted body (CC-BY "Male body" by Chin Eeyang) with the Rocketbox
// trainer's head and hands grafted on, a skeleton placed inside it, skin
// weights, and fitted shorts. Writes athlete.json + athlete.bin in the same
// layout avatar.js reads.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadRB, dominant } from './rb.mjs';
const [, , bodySrc, rbDir, outDir] = process.argv;

/* ── tiny vector kit ── */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(...a), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const perp = (h, a) => norm(sub(h, mul(a, dot(h, a))));
const frame = (d, f) => { const D = norm(d), F = perp(f, D); return [D, F, cross(D, F)]; };
const rotBetween = (b, t) => { const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) M[r][c] += t[k][r] * b[k][c]; return M; };
const app = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
function segDist(p, a, b) { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab))); return [len(sub(p, add(a, mul(ab, t)))), t]; }

/* ── the sculpt ── */
const S = JSON.parse(readFileSync(bodySrc, 'utf8'));
const SV = []; for (let i = 0; i < S.pos.length; i += 3) SV.push([S.pos[i], S.pos[i + 1], S.pos[i + 2]]);
let STri = []; for (let i = 0; i < S.idx.length; i += 3) { const t = [S.idx[i], S.idx[i + 1], S.idx[i + 2]]; t.orig = i / 3; STri.push(t); }

/* Joints, measured from cross-sections of the sculpt (units ≈ cm, y up,
   facing +z, its right side at −x). */
const J = {
  Pelvis: [0, 100, -9], Spine: [0, 111.5, -8], Spine1: [0, 126, -4.5], Spine2: [0, 141, -4.5], Neck: [0, 163, -5.5],
};
for (const [s, k] of [['R', -1], ['L', 1]]) {
  const X = v => [v[0] * k, v[1], v[2]];
  Object.assign(J, {
    [`${s}_Clavicle`]: X([6, 155, -3]), [`${s}_UpperArm`]: X([23, 151, -5.5]), [`${s}_Forearm`]: X([37.5, 128, -7.4]),
    [`${s}_HandWrist`]: X([45.3, 105, 4.6]),
    [`${s}_Thigh`]: X([9.5, 100, -8.5]), [`${s}_Calf`]: X([14.6, 57, -9.4]), [`${s}_Foot`]: X([19.2, 8.5, -11.8]), [`${s}_Toe0`]: X([19.6, 2, 2.5]),
  });
}
const NECK_CUT = 172.3;

/* Head and hair: the head mesh above the base of the neck, moved so its
   neck sits on the sculpt's, a touch smaller so the join closes. */
const RB_CUT = 153.6, HEAD_K = 0.96;
const rbNeckC = [0, RB_CUT, 0.3], sNeckC = [0, NECK_CUT - 0.8, -3.3];
/* The cut runs lower at the throat than at the nape, the way a neck
   meets the jaw, so the head keeps its own throat. */
const rbCutY = z => RB_CUT - 0.3 * (z - 0.3);
const headX = p => add(sNeckC, mul(sub(p, rbNeckC), HEAD_K));
const sculptCut = z => sNeckC[1] + HEAD_K * (rbCutY((z - sNeckC[2]) / HEAD_K + rbNeckC[2]) - RB_CUT) + 0.8;
/* Which side of the wrist plane a point is on (+ toward the hand). */
const wristPlane = s => { const e = J[`${s}_Forearm`], w = J[`${s}_HandWrist`]; return { w, d: norm(sub(w, e)) }; };
const WP = { R: wristPlane('R'), L: wristPlane('L') };
/* The head's mesh starts HEAD_LIFT above its cut; the body, glued to the
   head's shape, covers the rest, so the head's ragged lowest edge never shows. */
const HEAD_LIFT = 2;
const NECK_GAP = -4;   // negative: the body runs on this far under the head
const removed = SV.map(v => v[1] > sculptCut(v[2]) - NECK_GAP || ['R', 'L'].some(s => (s === 'R' ? v[0] < -30 : v[0] > 30) && dot(sub(v, WP[s].w), WP[s].d) > 0));
STri = STri.filter(t => !t.some(i => removed[i]));

/* ── the Rocketbox parts ── */
const R = loadRB(rbDir);
const RBp = i => [R.pos[i * 3], R.pos[i * 3 + 1], R.pos[i * 3 + 2]];
const RBn = i => [R.nor[i * 3] / 127, R.nor[i * 3 + 1] / 127, R.nor[i * 3 + 2] / 127];
const RBbone = n => R.bones.find(b => b.name === n).p;
const range = m => R.ranges.find(r => r.mat === m);
const tris = (r, keep) => { const out = []; for (let k = r.start; k < r.start + r.count; k += 3) { const t = [R.idx[k], R.idx[k + 1], R.idx[k + 2]]; if (t.every(keep)) out.push(t); } return out; };

const headTris = []; { const r = range('m002_head'); for (let k = r.start; k < r.start + r.count; k += 3) { const t = [R.idx[k], R.idx[k + 1], R.idx[k + 2]]; const ys = t.map(i => R.pos[i * 3 + 1]); const cuts = t.map(i => rbCutY(R.pos[i * 3 + 2])); if (ys.every((y, j) => y >= cuts[j] + HEAD_LIFT)) headTris.push(t); } }
const hairTris = tris(range('m002_opacity'), () => true);

/* Hands: the hand and fingers, plus 1.5 cm of wrist, turned so the
   trainer's forearm and palm line up with the sculpt's (palms toward the
   thighs in its A-pose). */
const handXf = s => {
  const sg = s === 'R' ? -1 : 1;
  const H = RBbone(`${s}_Hand`), Fo = RBbone(`${s}_Forearm`), F2 = RBbone(`${s}_Finger2`), F1 = RBbone(`${s}_Finger1`), F4 = RBbone(`${s}_Finger4`);
  const hd = norm(sub(F2, H)), across = norm(sub(F1, F4)), palm = norm(mul(cross(hd, across), sg));
  const rbFa = norm(sub(H, Fo));
  const scFa = WP[s].d;
  const scPalm = perp([-sg, 0, 0.15], scFa);
  const M = rotBetween(frame(rbFa, palm), frame(scFa, scPalm));
  const k = 0.97;
  return { M, k, H, at: J[`${s}_HandWrist`], fwd: rbFa, f: p => add(J[`${s}_HandWrist`], mul(app(M, sub(p, H)), k)) };
};
const HX = { R: handXf('R'), L: handXf('L') };
const handOf = {};
const handTris = { R: [], L: [] };
for (const s of ['R', 'L']) {
  const X = HX[s];
  const keep = i => {
    const n = R.bones[dominant(R, i)].name;
    if (n.startsWith(`${s}_Hand`) || n.startsWith(`${s}_Finger`)) return true;
    return n === `${s}_Forearm` && dot(sub(RBp(i), X.H), X.fwd) > -1.5;
  };
  handTris[s] = tris(range('m002_body'), keep);
}

/* ── bones ── */
const bones = [];
const addBone = (name, p) => bones.push({ name, p: p.map(v => +v.toFixed(3)) });
for (const n of ['Pelvis', 'Spine', 'Spine1', 'Spine2', 'Neck']) addBone(n, J[n]);
addBone('Head', headX(RBbone('Head')));
for (const s of ['R', 'L']) {
  for (const n of ['Clavicle', 'UpperArm', 'Forearm']) addBone(`${s}_${n}`, J[`${s}_${n}`]);
  addBone(`${s}_Hand`, HX[s].f(RBbone(`${s}_Hand`)));
  for (const b of R.bones) if (b.name.startsWith(`${s}_Finger`)) addBone(b.name, HX[s].f(b.p));
  for (const n of ['Thigh', 'Calf', 'Foot', 'Toe0']) addBone(`${s}_${n}`, J[`${s}_${n}`]);
}
/* A helper joint at each shoulder that turns half as far as the arm
   (avatar.js drives it). Skin that blends between torso and arm follows
   it instead, so a raised arm keeps the shoulder's volume. */
for (const s of ['R', 'L']) addBone(`${s}_ShoulderHelper`, J[`${s}_UpperArm`]);
const BI = Object.fromEntries(bones.map((b, i) => [b.name, i]));

/* ── skin weights for the sculpt ──
   Each point weighs every bone of its own region by inverse distance to
   the bone's segment, then the weights are smoothed over the surface so
   joints bend in a soft band. */
const segs = [
  ['Pelvis', J.Pelvis, J.Spine], ['Spine', J.Spine, J.Spine1], ['Spine1', J.Spine1, J.Spine2], ['Spine2', J.Spine2, J.Neck], ['Neck', J.Neck, [0, 178, -3]],
];
for (const s of ['R', 'L']) segs.push(
  [`${s}_Clavicle`, J[`${s}_Clavicle`], J[`${s}_UpperArm`]], [`${s}_UpperArm`, J[`${s}_UpperArm`], J[`${s}_Forearm`]], [`${s}_Forearm`, J[`${s}_Forearm`], J[`${s}_HandWrist`]],
  [`${s}_Thigh`, J[`${s}_Thigh`], J[`${s}_Calf`]], [`${s}_Calf`, J[`${s}_Calf`], J[`${s}_Foot`]], [`${s}_Foot`, J[`${s}_Foot`], J[`${s}_Toe0`]], [`${s}_Toe0`, J[`${s}_Toe0`], add(J[`${s}_Toe0`], [0, 0, 5])]);
const allowed = v => {
  const x = v[0], y = v[1], side = x < 0 ? 'R' : 'L', ax = Math.abs(x);
  const ok = new Set(['Pelvis', 'Spine', 'Spine1', 'Spine2', 'Neck']);
  /* Arm or torso: a line that follows the inside of the arm in the A-pose
     (the armpit), and at the shoulder a little inside the deltoid. Past it
     is arm, inside it torso, with a 4 cm band across the joint that may
     take both. The side of the chest and the lats stay with the torso. */
  const shoY = J[`${side}_UpperArm`][1];
  const thr = y >= shoY - 4 ? 18.5 : Math.min(23.5, 20 + 0.45 * (shoY - 4 - y));
  const dArm = y > 98 ? ax - thr : -99;
  const legReg = y < 108;
  if (dArm > 2) { ok.clear(); ok.add(`${side}_UpperArm`).add(`${side}_Forearm`); if (y > shoY - 6 && dArm < 7) ok.add(`${side}_Clavicle`); }
  else if (dArm > -2) { ok.add(`${side}_Clavicle`).add(`${side}_UpperArm`); }
  if (y > 145 && ax > 4) ok.add(`${side}_Clavicle`);
  if (legReg) for (const n of ['Thigh', 'Calf', 'Foot', 'Toe0']) ok.add(`${side}_${n}`);
  if (y < 90 && ax > 3) { ok.delete('Spine'); ok.delete('Spine1'); ok.delete('Spine2'); ok.delete('Neck'); if (y < 80) ok.delete('Pelvis'); }
  if (y < 60) { ok.delete('Pelvis'); }
  return ok;
};
const NB = bones.length;
/* Skin weights can come from Blender's heat diffusion (blender_weights.py
   writes heat_weights.json from the dump below); without it, the
   distance rules that follow stand in. */
if (process.env.DUMP_FOR_BLENDER) {
  writeFileSync(process.env.DUMP_FOR_BLENDER, JSON.stringify({ verts: SV, tris: STri, bones: segs.map(([n, a, b]) => ({ name: n, head: a, tail: b })) }));
  console.log('dumped'); process.exit(0);
}
const HEAT = process.env.HEAT_WEIGHTS ? JSON.parse(readFileSync(process.env.HEAT_WEIGHTS, 'utf8')) : null;
const OK = SV.map(allowed);
let W = SV.map((v, vi) => {
  const ok = OK[vi], w = new Float32Array(NB);
  for (const [n, a, b] of segs) {
    if (!ok.has(n)) continue;
    const [d] = segDist(v, a, b);
    w[BI[n]] = 1 / Math.pow(Math.max(d, 0.5), 5);
  }
  let t = 0; for (const x of w) t += x; for (let k = 0; k < NB; k++) w[k] /= t || 1;
  return w;
});
// smooth over the surface (neighbours from the triangles)
const nbr = SV.map(() => new Set());
for (const [a, b, c] of STri) { nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b); }
if (HEAT) {
  /* Blender's weights, by bone name, for every vertex it could reach;
     anything it left out keeps the distance rule's answer. */
  const hb = HEAT.bones.map(n => BI[n]);
  W = W.map((w, vi) => {
    const h = HEAT.w[vi]; if (!h || !h.length) return w;
    const o = new Float32Array(NB); let t = 0;
    for (const [k, x] of h) { o[hb[k]] += x; t += x; }
    if (t < 0.5) return w;
    for (let k = 0; k < NB; k++) o[k] /= t;
    return o;
  });
}
for (let it = 0; it < (HEAT ? 0 : 6); it++) {
  W = W.map((w, i) => {
    if (!nbr[i].size) return w;
    const o = new Float32Array(NB);
    for (let k = 0; k < NB; k++) o[k] = 0.5 * w[k];
    for (const j of nbr[i]) for (let k = 0; k < NB; k++) o[k] += 0.5 * W[j][k] / nbr[i].size;
    /* smoothing never carries a bone where it isn't allowed */
    let t = 0;
    for (let k = 0; k < NB; k++) { if (!OK[i].has(bones[k].name)) o[k] = 0; t += o[k]; }
    if (t > 0) for (let k = 0; k < NB; k++) o[k] /= t;
    return o;
  });
}
/* Hand the torso/arm blend at each shoulder to its helper. */
W.forEach((w, vi) => { for (const s of ['R', 'L']) {
  const ua = BI[`${s}_UpperArm`], torso = [BI.Spine2, BI.Spine1, BI[`${s}_Clavicle`]];
  /* only over the top, front and back of the shoulder: skin under the
     joint (the armpit) would swing out if it followed a turning joint */
  const below = J[`${s}_UpperArm`][1] - SV[vi][1];
  const keep = Math.max(0, Math.min(1, (3 - below) / 3));
  const t = torso.reduce((a, k) => a + w[k], 0), m = Math.min(w[ua], t) * 0.9 * keep;
  if (m < 0.03) continue;
  w[ua] -= m;
  for (const k of torso) w[k] -= m * (w[k] / t);
  w[BI[`${s}_ShoulderHelper`]] += 2 * m;
} });
const top4 = w => { const p = [...w].map((x, k) => [k, x]).filter(([, x]) => x > 0.002).sort((a, b) => b[1] - a[1]).slice(0, 4); const t = p.reduce((a, [, x]) => a + x, 0) || 1; return p.map(([k, x]) => [k, x / t]); };

/* Sculpt normals (area-weighted). */
const SN = SV.map(() => [0, 0, 0]);
for (const [a, b, c] of STri) { const n = cross(sub(SV[b], SV[a]), sub(SV[c], SV[a])); for (const i of [a, b, c]) { SN[i][0] += n[0]; SN[i][1] += n[1]; SN[i][2] += n[2]; } }
for (let i = 0; i < SN.length; i++) SN[i] = norm(SN[i]);
/* the sculpt's own smooth normals, when the reduction kept them */
if (S.nor) for (let i = 0; i < SN.length; i++) SN[i] = norm([S.nor[i * 3], S.nor[i * 3 + 1], S.nor[i * 3 + 2]]);

/* ── assemble ── */
const OV = []; // {p, n, uv, w:[[bone,w]]}
const groups = []; // {mat, tris:[[a,b,c]]}
const sMap = new Map();
const sculptVert = i => { if (!sMap.has(i)) { sMap.set(i, OV.length); OV.push({ p: SV[i], n: SN[i], uv: [0, 0], w: top4(W[i]) }); } return sMap.get(i); };
groups.push({ mat: 'skin', tris: STri.map(t => { const o = t.map(sculptVert); o.orig = t.orig; return o; }) });

const rbVert = (cache, i, X, NX) => {
  if (!cache.has(i)) {
    cache.set(i, OV.length);
    const w = []; for (let j = 0; j < 4; j++) { const wt = R.sw[i * 4 + j] / 255; if (wt > 0) { const nm = R.bones[R.si[i * 4 + j]].name; const bi = BI[nm] ?? BI.Head; w.push([bi, wt]); } }
    const y0 = R.pos[i * 3 + 1];
    OV.push({ p: X(RBp(i)), n: norm(NX(RBn(i))), uv: [R.uv[i * 2] / 65535, R.uv[i * 2 + 1] / 65535], w, blend: X === headX ? Math.max(0, Math.min(1, (160 - y0) / 4.4)) : 0 });
  }
  return cache.get(i);
};
const hc = new Map(), idn = n => n;
// head bones other than Head/Neck fold into Head; Spine2-weighted collar points move with the neck
const headW = w => w.map(([b, x]) => [bones[b].name === 'Spine2' ? BI.Neck : b, x]);
groups.push({ mat: 'head', tris: headTris.map(t => t.map(i => rbVert(hc, i, headX, idn))) });
groups.push({ mat: 'hair', tris: [] });   // the painted short cut reads better than the hair cards

for (const v of OV.slice(OV.length - hc.size)) v.w = headW(v.w);
for (const s of ['R', 'L']) {
  const c = new Map(), X = HX[s];
  groups.push({ mat: 'hands', tris: handTris[s].map(t => t.map(i => rbVert(c, i, X.f, n => app(X.M, n)))) });
}

/* The wrists: each open edge point of the sculpt there moves onto the
   nearest point of the grafted hand. */
const edgeCount = new Map();
for (const [a, b, c] of groups[0].tris) for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = x < y ? `${x},${y}` : `${y},${x}`; edgeCount.set(k, (edgeCount.get(k) || 0) + 1); }
const border = new Set(); for (const [k, n] of edgeCount) if (n === 1) for (const v of k.split(',')) border.add(+v);
const atNeck = p => Math.abs(p[0]) < 14 && p[1] > 150;
const handVerts = OV.map((v, i) => i).filter(i => i >= sMap.size && !atNeck(OV[i].p));
let snapped = 0;
for (const i of border) {
  const p = OV[i].p;
  if (p[1] < 95 || atNeck(p) || Math.abs(p[0]) < 30) continue;
  let best = -1, bd = 1e9;
  for (const j of handVerts) { const d = len(sub(OV[j].p, p)); if (d < bd) { bd = d; best = j; } }
  if (best >= 0 && bd < 6) { OV[i].p = OV[best].p.slice(); OV[i].n = OV[best].n.slice(); snapped++; }
}

/* The neck: over the last 6 cm below the head the body's neck is drawn
   onto the head's own surface (the nearest point on it, not the nearest
   corner, so nothing pinches into slivers), all the way on at the cut;
   above the cut it runs on just under the head's skin, so no gap can open
   at the head's edge. Its normals follow the head's there too. */
{
  const HT = groups[1].tris;
  const closest = (p, a, b, c) => {
    const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
    const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return [a, [1, 0, 0]];
    const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return [b, [0, 1, 0]];
    const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [add(a, mul(ab, v)), [1 - v, v, 0]]; }
    const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return [c, [0, 0, 1]];
    const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [add(a, mul(ac, w)), [1 - w, 0, w]]; }
    const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [add(b, mul(sub(c, b), w)), [0, 1 - w, w]]; }
    const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [add(a, add(mul(ab, v), mul(ac, w))), [1 - v - w, v, w]];
  };
  const near = HT.filter(t => t.some(k => OV[k].p[1] < sculptCut(OV[k].p[2]) + 12));
  let moved = 0;
  for (const [, o] of sMap) {
    const p = OV[o].p; if (!atNeck(p)) continue;
    const c = sculptCut(p[2]), w = Math.max(0, Math.min(1, (p[1] - (c - 6)) / 6));
    if (w <= 0) continue;
    let best = null, bd = 1e9;
    for (const t of near) { const [q, bc] = closest(p, OV[t[0]].p, OV[t[1]].p, OV[t[2]].p); const d = len(sub(q, p)); if (d < bd) { bd = d; best = [q, t, bc]; } }
    if (!best || bd > 8) continue;
    const [q, t, bc] = best, hn = norm(add(add(mul(OV[t[0]].n, bc[0]), mul(OV[t[1]].n, bc[1])), mul(OV[t[2]].n, bc[2])));
    const e = w * w * (3 - 2 * w);
    const target = p[1] > c ? add(q, mul(hn, -0.12)) : q;   // above the cut: just under the head's skin
    OV[o].p = add(mul(p, 1 - e), mul(target, e));
    OV[o].n = norm(add(mul(OV[o].n, 1 - e), mul(hn, e)));
    moved++;
  }
  console.log(`neck: ${moved} body points drawn onto the head`);
}

/* The body's side of the neck takes the colour the head has at the join,
   fading back to the body's own tone over 9 cm, so the two meet without
   a step in colour. */
for (const [si, o] of sMap) {
  const p = OV[o].p, d = sculptCut(p[2]) - p[1];
  if (Math.abs(p[0]) > 15 || d > 9) continue;
  const t = Math.max(0, Math.min(1, d / 9)); OV[o].blend = 1 - t * t * (3 - 2 * t);
}

/* Shorts: the sculpt's own surface from the waist to mid-thigh, smoothed
   into cloth (the anatomy underneath is softened away) and lifted off the
   skin. The waistband and hems are cut on clean lines, and the skin they
   cover is removed so nothing can show through. */
const WAIST = 113, HEM = 78.5;
const inShortsV = v => v[1] < WAIST + 1.2 && v[1] > HEM - 1.2 && Math.abs(v[0]) < 26 && !(Math.abs(v[0]) > 21 && v[1] > 96);
const shTris = STri.filter(t => { const c = mul(add(add(SV[t[0]], SV[t[1]]), SV[t[2]]), 1 / 3); return inShortsV(c) && c[1] < WAIST && c[1] > HEM; });
const shIdx = [...new Set(shTris.flat())];
const shSet = new Set(shIdx);
const ec = new Map();
for (const [a, b, c] of shTris) for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = x < y ? `${x},${y}` : `${y},${x}`; ec.set(k, (ec.get(k) || 0) + 1); }
const shBorder = new Set(); for (const [k, n] of ec) if (n === 1) for (const v of k.split(',')) shBorder.add(+v);
let SP = new Map(shIdx.map(i => [i, SV[i].slice()]));
// clean edges: border points snap to the waist or hem line
for (const i of shBorder) { const p = SP.get(i); p[1] = p[1] > (WAIST + HEM) / 2 ? WAIST : HEM; }
const shN = new Map(shIdx.map(i => [i, [...nbr[i]].filter(j => shSet.has(j))]));
for (let it = 0; it < 70; it++) {
  const next = new Map();
  for (const i of shIdx) {
    const ns = shN.get(i);
    if (shBorder.has(i) || ns.length < 3) { next.set(i, SP.get(i)); continue; }
    const avg = ns.reduce((a, j) => add(a, SP.get(j)), [0, 0, 0]).map(x => x / ns.length);
    next.set(i, add(mul(SP.get(i), 0.35), mul(avg, 0.65)));
  }
  SP = next;
}
// rings of distance from the edge, so the cloth eases off the skin near the hems
const bulge = i => { const v = SV[i]; return Math.abs(v[0]) < 8.5 && v[1] > 83 && v[1] < 103 && v[2] > -6; };
for (let it = 0; it < 160; it++) {
  for (const i of shIdx) {
    if (!bulge(i) || shBorder.has(i)) continue;
    const ns = shN.get(i); if (ns.length < 3) continue;
    const avg = ns.reduce((a, j) => add(a, SP.get(j)), [0, 0, 0]).map(x => x / ns.length);
    SP.set(i, add(mul(SP.get(i), 0.3), mul(avg, 0.7)));
  }
}
const ring = new Map([...shBorder].map(i => [i, 0]));
for (let r = 1; r < 4; r++) for (const [i, d] of [...ring]) if (d === r - 1) for (const j of shN.get(i)) if (!ring.has(j)) ring.set(j, r);
const shMap = new Map();
for (const i of shIdx) {
  const n = SN[i], orig = SP.get(i), raw = SV[i];
  /* snug at the waistband, easing out toward the hems like loose
     athletic shorts */
  const vh = (raw[1] - HEM) / (WAIST - HEM);
  const sxl = raw[0] < 0 ? -1 : 1, outward = (1 + Math.cos(Math.atan2(raw[2] + 8, raw[0] * sxl - 10))) / 2;   // 1 outside of the thigh, 0 inside
  const loose = 1.5 * Math.max(0, Math.min(1, (0.85 - vh) / 0.85)) ** 1.4 * (0.2 + 0.8 * outward);
  const lift = 1.0 + loose + 0.15 * Math.min(1, (ring.get(i) ?? 4) / 4);
  // never inside the skin: at least `lift` out from the skin point along its normal
  const along = dot(sub(orig, raw), n);
  const deepPt = (ring.get(i) ?? 9) >= 3;
  const free = bulge(i) && (ring.get(i) ?? 9) >= 2;
  const minLift = free ? -99 : deepPt ? Math.max(0.9, lift - 0.3) : lift;
  const p = along < minLift ? add(orig, mul(n, minLift - along)) : free ? add(orig, mul(n, 0.6)) : orig;
  shMap.set(i, OV.length);
  /* UVs: round each leg from the outside of the thigh (u 0.5), up from
     the hem (v 0) to the waistband (v 1) */
  const sx = raw[0] < 0 ? -1 : 1, ang = Math.atan2(raw[2] + 8, (raw[0] * sx) - 10);
  OV.push({ p, n, uv: [0.5 + ang / (2 * Math.PI), Math.max(0, Math.min(1, vh))], w: top4(W[i]) });
}
groups.push({ mat: 'shorts', tris: shTris.map(t => t.map(i => shMap.get(i))) });
// the skin under the shorts (away from the hems) goes
const deep = new Set(shIdx.filter(i => (ring.get(i) ?? 9) >= 1));
const outToSculpt = new Map([...sMap].map(([si, o]) => [o, si]));
/* and the skin in the crotch, which the two legs of the shorts leave in
   view from below (real shorts bridge it with a gusset) */
const crotch = p => Math.abs(p[0]) < 7 && p[1] > 82 && p[1] < 104 && p[2] > -14;
/* The covered skin is kept as its own part: it shows through the shorts'
   leg openings, and the anatomy bench can take the shorts off over it. */
const covered = t => t.every(v => deep.has(outToSculpt.get(v)) || crotch(OV[v].p));
groups.push({ mat: 'underskin', tris: groups[0].tris.filter(covered) });
groups[0].tris = groups[0].tris.filter(t => !covered(t));
/* It sits just under the shorts, on its own copy of the points so the
   visible skin's edge stays put: 0.8 in, and deeper where the shorts' front
   is smoothed over the crotch, so it can never show through them. */
{
  const ug = groups[groups.length - 1], copy = new Map();
  /* the skin as it is, for taking the shorts off in the anatomy bench */
  groups.push({ mat: 'bareskin', tris: ug.tris.map(t => { const o = [...t]; o.orig = t.orig; return o; }) });
  ug.tris = ug.tris.map(t => { const o = t.map(v => { if (!copy.has(v)) { const c = { ...OV[v] }; const d = crotch(c.p) ? 3 : 0.8; c.p = add(c.p, mul(c.n, -d)); copy.set(v, OV.length); OV.push(c); } return copy.get(v); }); o.orig = t.orig; return o; });
}

/* The hand-edited shorts (shorts_shape.json): each shorts point moves
   to its edited place. Where the build no longer has the same points (a
   different reduction of the sculpt), the edit is carried by position:
   each point takes the movement of the nearest edited points. */
{
  const f = new URL('./shorts_shape.json', import.meta.url);
  let edit = null; try { edit = JSON.parse(readFileSync(f, 'utf8')); } catch {}
  const sh = groups.find(g => g.mat === 'shorts');
  if (edit && sh) {
    const ids = [...new Set(sh.tris.flat())];
    const same = edit.v.length === ids.length && edit.v.every(([i, bx, by, bz]) => OV[i] && len(sub(OV[i].p, [bx, by, bz])) < 0.06);
    if (same) {
      for (const [i, , , , ex, ey, ez, nx, ny, nz] of edit.v) { OV[i].p = [ex, ey, ez]; OV[i].n = [nx / 127, ny / 127, nz / 127]; }
      console.log(`shorts edit: ${edit.v.length} points applied`);
    } else {
      const E = edit.v.map(([, bx, by, bz, ex, ey, ez, nx, ny, nz]) => ({ b: [bx, by, bz], d: [ex - bx, ey - by, ez - bz], n: [nx / 127, ny / 127, nz / 127] }));
      for (const i of ids) {
        const p = OV[i].p, near = [];
        for (const e of E) { const d = len(sub(e.b, p)); if (near.length < 4 || d < near[3][0]) { near.push([d, e]); near.sort((x, y) => x[0] - y[0]); if (near.length > 4) near.pop(); } }
        let wt = 0, dd = [0, 0, 0], nn = [0, 0, 0];
        for (const [d, e] of near) { const w = 1 / Math.max(0.05, d) ** 2; wt += w; dd = add(dd, mul(e.d, w)); nn = add(nn, mul(e.n, w)); }
        OV[i].p = add(p, mul(dd, 1 / wt)); OV[i].n = norm(nn);
      }
      console.log(`shorts edit: carried by position onto ${ids.length} points`);
    }
  }
}

/* Body UVs from Blender's unwrap (BODY_UV, from blender_bake.py): the
   normal map's coordinates for every corner of every body triangle. A point
   on a seam of the unwrap is split into one copy per side. */
if (process.env.BODY_UV) {
  const U = JSON.parse(readFileSync(process.env.BODY_UV, 'utf8')).uv;
  const done = new Map();
  let split = 0;
  for (const g of groups) {
    if (g.mat !== 'skin' && g.mat !== 'underskin') continue;
    for (const t of g.tris) {
      if (t.orig === undefined) continue;
      for (let k = 0; k < 3; k++) {
        const v = t[k], u = [U[t.orig * 6 + k * 2], U[t.orig * 6 + k * 2 + 1]];
        const key = `${v}|${u[0]},${u[1]}`;
        if (done.has(key)) { t[k] = done.get(key); continue; }
        if (!OV[v].uvSet) { OV[v].uv = u; OV[v].uvSet = true; done.set(key, v); continue; }
        const c = { ...OV[v], uv: u }; OV.push(c); done.set(key, OV.length - 1); t[k] = OV.length - 1; split++;
      }
    }
  }
  console.log(`body uvs: ${split} seam copies`);
}

/* ── pack ── */
const V = OV.length;
const PS = 50;
const blend = new Uint8Array(V), pos = new Int16Array(V * 3), nor = new Int8Array(V * 3), uv = new Uint16Array(V * 2), si = new Uint8Array(V * 4), sw = new Uint8Array(V * 4);
OV.forEach((v, i) => {
  for (let k = 0; k < 3; k++) { pos[i * 3 + k] = Math.round(v.p[k] * PS); nor[i * 3 + k] = Math.round(v.n[k] * 127); }
  uv[i * 2] = Math.round(v.uv[0] * 65535); uv[i * 2 + 1] = Math.round(v.uv[1] * 65535);
  const w = [...v.w].sort((a, b) => b[1] - a[1]).slice(0, 4); const t = w.reduce((a, [, x]) => a + x, 0) || 1;
  let acc = 0; w.forEach(([b, x], j) => { si[i * 4 + j] = b; const q = Math.round(x / t * 255); sw[i * 4 + j] = q; acc += q; });
  sw[i * 4] += 255 - acc;
  blend[i] = Math.round((v.blend || 0) * 255);
});
const index = [], ranges = [];
for (const g of groups) { ranges.push({ mat: g.mat, start: index.length, count: g.tris.length * 3 }); for (const t of g.tris) index.push(...t); }
const parts = [['position', pos], ['normal', nor], ['uv', uv], ['skinIndex', si], ['skinWeight', sw], ['index', V > 65535 ? new Uint32Array(index) : new Uint16Array(index)], ['skinBlend', blend]];
let off = 0; const layout = {}, chunks = [];
for (const [name, a] of parts) { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } layout[name] = { offset: off, length: a.length, type: a.constructor.name }; chunks.push(Buffer.from(a.buffer)); off += a.byteLength; }
mkdirSync(outDir, { recursive: true });
writeFileSync(outDir + '/athlete.bin', Buffer.concat(chunks));
writeFileSync(outDir + '/athlete.json', JSON.stringify({
  source: 'Body: "Male body" by Chin Eeyang (CC-BY-4.0). Head and hands: Microsoft Rocketbox Male_Adult_01 (MIT).',
  units: 'sculpt (about 1 cm)', rigPerUnit: 47.1 / 51, posScale: 1 / PS, vertices: V, layout, ranges,
  materials: {
    skin: { color: '#be8c70', neck: '#be8c70', roughness: 0.72, paint: true, ...(process.env.BODY_UV ? { normalMap: 'body_n.jpg', normalScale: 1 } : {}) },
    head: { map: '../trainer/head.jpg', normalMap: '../trainer/head_n.jpg', normalScale: 0.18, roughness: 0.72, paint: true },
    hair: { map: 'hair.png', alphaTest: 0.5, roughness: 0.85 },
    hands: { map: '../trainer/body.jpg', roughness: 0.72, paint: true },
    bareskin: { color: '#be8c70', roughness: 0.72, paint: true, hidden: true, ...(process.env.BODY_UV ? { normalMap: 'body_n.jpg', normalScale: 1 } : {}) },
    underskin: { color: '#be8c70', roughness: 0.72, paint: true, ...(process.env.BODY_UV ? { normalMap: 'body_n.jpg', normalScale: 1 } : {}) },
    shorts: { map: 'shorts.jpg', normalMap: 'shorts_n.jpg', normalScale: 0.14, color: '#ffffff', roughness: 0.83, sheen: 0.22, doubleSide: true, paint: true },
  },
  bones,
}));
console.log('verts', V, 'tris', index.length / 3, 'bytes', off, 'snapped', snapped, 'border', border.size, 'ranges', JSON.stringify(ranges));
