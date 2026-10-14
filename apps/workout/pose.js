/* ═══════════════════════════════════════════════════════════
   WORKOUT — EXERCISE ANIMATION ENGINE

   One rep of each exercise, drawn and moved in code: no video, no image
   files, nothing fetched. moves.js says what each exercise looks like —
   a few poses, the kit, the tempo — and this file turns that into a
   body, eases from pose to pose, and loops, so the lab shows the speed
   of a rep as well as its shape.

   TWO VIEWS. Most movements happen front-to-back and read best from the
   side. A few happen side-to-side — lateral raises, flyes, reverse
   flyes, pull-ups, the side plank, archer push-ups — and a side view
   would show their arms swinging straight at the camera, so those are
   drawn facing it (view: 'front').

   ANGLES. Degrees, counterclockwise from "pointing the way the figure
   faces" (side view) or from screen-right (front view): 0 forward, 90
   up, 180 back, 270 down. Every segment's angle is absolute, not
   relative to its parent, so a pose reads straight off as where each
   limb points. Interpolation is linear with no wrap-around: the numbers
   choose the direction a limb sweeps.

   PLANTED HANDS AND FEET. A push-up's hands do not slide while the body
   moves, so a pose can give a hand or foot a target instead of angles
   (`hand`, `foot`, as [x, y]) and the elbow or knee is solved to reach
   it (two-bone IK; `eb`/`kb` choose which way the joint bends). And a
   pose can hang from any joint instead of the hip (`root` + `at`): a
   handstand hangs from the hands, a push-up from the toes.

   SIDE-VIEW POSE KEYS
     hip            [x, y] of the hip, when there is no root
     root, at       a joint name ('wri', 'toe', 'ank', 'kne', 'sho', 'hip',
                    and 'f'-prefixed for the far side) and where it sits
     torso, tilt    spine angle at the hip; head tilt relative to the spine
     flex           how far the spine curls, in degrees from hip to neck:
                    positive rounds it forward (a crunch, a hollow body),
                    negative arches it (an arch hold)
     ua, fa, hd     upper arm, forearm, hand (hd defaults to fa)
     th, sh, ft     thigh, shin, foot
     ul, ll         upper-arm and leg length scales, for limbs that point
                    at the camera (a press's flared elbow, a straddle)
     hand, foot     IK targets instead of the angles above
     f…             the far-side limb (fua, ffa, fth, fhand …). A far limb
                    with nothing of its own copies the near one; a far
                    target defaults to the near one nudged for depth, and
                    `fhand: null` frees a far arm the near one would drag

   FRONT-VIEW POSE KEYS
     hip, torso, tlen   pelvis centre, spine angle, spine length scale
                        (below 1 when the torso points at the camera)
     aua afa ath ash    the screen-left arm and leg; b… the screen-right
     ahand bhand afoot bfoot   IK targets
     al, bl, all, bll   arm and leg length scales, for limbs pointing at
                        the camera
     face               'down' when only the back of the head shows

   The tempo is the how-to's own: an exercise whose cues say "lower over
   2 to 3 seconds" lowers over 2.5 here. Reduced motion gets the still
   frame named in `still`, the position the cues care most about.
   ═══════════════════════════════════════════════════════════ */

import { MOTION } from './moves.js?v=reps-oct14';
export { MOTION };

export const FLOOR = 194;
const SEG = { torso: 50, ua: 27, fa: 25, hand: 6, th: 38, sh: 41 };
const FAR = [-2.6, -1.4];

const D = Math.PI / 180;
const r1 = n => Math.round(n * 10) / 10;
const P = p => `${r1(p[0])} ${r1(p[1])}`;
const go = (p, deg, len) => [p[0] + len * Math.cos(deg * D), p[1] - len * Math.sin(deg * D)];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const angOf = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / D;
const ease = k => (1 - Math.cos(Math.PI * k)) / 2;

/* ── shapes ── */

/* A limb: two circles of radius ra and rb joined by their outer
   tangents, so it tapers like an arm rather than reading as a stick. */
function capsule(a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-3;
  const phi = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  const at = (c, r, t) => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
  const a1 = at(a, ra, phi + al), b1 = at(b, rb, phi + al), b2 = at(b, rb, phi - al), a2 = at(a, ra, phi - al);
  const bigB = 2 * al > Math.PI ? 1 : 0;
  return `M${P(a1)}L${P(b1)}A${r1(rb)} ${r1(rb)} 0 ${bigB} 0 ${P(b2)}L${P(a2)}A${r1(ra)} ${r1(ra)} 0 ${1 - bigB} 0 ${P(a1)}Z`;
}

/* A closed outline smoothed through its points (quadratic curves through
   the midpoints), for torsos, pelvises and muscle bellies. */
function blob(pts) {
  let d = `M${P(mid(pts[pts.length - 1], pts[0]))}`;
  pts.forEach((p, i) => { d += `Q${P(p)} ${P(mid(p, pts[(i + 1) % pts.length]))}`; });
  return d + 'Z';
}

/* A muscle on a limb: a lens on one side that bulges a little past the
   outline, the way a working muscle does. */
function lens(a, b, side, ra, rb, out) {
  const s = go(a, side, ra * 0.25), e = go(b, side, rb * 0.25), m = mid(a, b), rm = (ra + rb) / 2;
  return `M${P(s)}Q${P(go(m, side, rm + out))} ${P(e)}Q${P(go(m, side, -rm * 0.15))} ${P(s)}Z`;
}

const path = (d, cls) => `<path class="${cls}" d="${d}"/>`;
const circ = (c, r, cls) => `<circle class="${cls}" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}"/>`;

/* Two-bone IK: the joint between a and the target, bending to `bend`
   (+1 or −1, which side of the a→target line the elbow or knee falls).
   An unreachable target straightens the limb toward it. */
function ik(a, t, l1, l2, bend) {
  const dx = t[0] - a[0], dy = t[1] - a[1];
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy) || 0.01));
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = base + bend * off;
  const m = [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
  const md = Math.atan2(t[1] - m[1], t[0] - m[0]);
  return [m, [m[0] + l2 * Math.cos(md), m[1] + l2 * Math.sin(md)]];
}

/* The spine as an arc of constant curvature: its direction turns by
   `flex` degrees between the hip (t = 0) and the neck (t = 1). Returns a
   point at fraction t along it, pushed `off` toward the front (+) or the
   back (−) of the body. */
function spineAt(hip, u, flex) {
  const k = -(flex || 0) * D, u0 = u * D, L = SEG.torso;
  return (t, off = 0) => {
    const a = u0 + k * t;
    const pos = Math.abs(k) < 1e-4 ? go(hip, u, L * t)
      : [hip[0] + L / k * (Math.sin(a) - Math.sin(u0)), hip[1] + L / k * (Math.cos(a) - Math.cos(u0))];
    return off ? go(pos, a / D - 90, off) : pos;
  };
}

/* ══ SIDE VIEW ══ */

/* The torso's outline as offsets from the spine, front (+) and back (−),
   at fractions of its length from the hip. */
const FRONT = [[-0.1, 2], [0.06, 8.4], [0.38, 7.2], [0.62, 9.4], [0.84, 10], [1.01, 6.6], [1.1, 0]];
const BACK = [[1.01, -6.8], [0.8, -8.2], [0.46, -6.6], [0.14, -8.8], [-0.08, -6.4]];
const surf = (tbl, t) => {
  for (let i = 0; i < tbl.length - 1; i++) {
    const [t0, o0] = tbl[i], [t1, o1] = tbl[i + 1];
    if ((t - t0) * (t - t1) <= 0) return o0 + (o1 - o0) * ((t - t0) / ((t1 - t0) || 1));
  }
  return tbl.reduce((b, r) => (Math.abs(r[0] - t) < Math.abs(b[0] - t) ? r : b))[1];
};

const JOINTS = ['hip', 'sho', 'elb', 'wri', 'kne', 'ank', 'toe', 'heel'];

function sideJoints(p) {
  const g = (k, far) => (far && p['f' + k] != null ? p['f' + k] : p[k]);
  const limbs = (hip, far) => {
    const sho = spineAt(hip, p.torso, p.flex)(0.9, 0.6);
    const ua = g('ua', far) ?? 270, fa = g('fa', far) ?? 270, th = g('th', far) ?? 270, sh = g('sh', far) ?? 270;
    const ft = g('ft', far) ?? 0, ul = g('ul', far) ?? 1, ll = g('ll', far) ?? 1;
    const elb = go(sho, ua, SEG.ua * ul), wri = go(elb, fa, SEG.fa);
    const kne = go(hip, th, SEG.th * ll), ank = go(kne, sh, SEG.sh * ll);
    return { hip, sho, elb, wri, kne, ank, toe: go(ank, ft, 10.5), heel: go(ank, ft + 180, 2.6), ua, fa, th, sh, ft, ul, ll };
  };
  let n = limbs([0, 0], false), f = limbs(FAR, true);

  /* Hang the body from its root: the hip by default, or any named joint. */
  let shift = p.hip || [100, 150];
  if (p.root) {
    const far = p.root[0] === 'f';
    shift = sub(p.at, (far ? f : n)[far ? p.root.slice(1) : p.root]);
  }
  for (const j of [n, f]) for (const k of JOINTS) j[k] = add(j[k], shift);

  /* Planted hands and feet: solve the elbow and knee to reach them. */
  const solve = (j, far) => {
    const tgt = (key, own) => (!far ? p[key] : p[own] !== undefined ? p[own] : p[key] && add(p[key], FAR));
    const hand = tgt('hand', 'fhand'), foot = tgt('foot', 'ffoot');
    if (hand) {
      [j.elb, j.wri] = ik(j.sho, hand, SEG.ua * j.ul, SEG.fa, g('eb', far) ?? 1);
      j.ua = angOf(j.sho, j.elb); j.fa = angOf(j.elb, j.wri);
    }
    if (foot) {
      [j.kne, j.ank] = ik(j.hip, foot, SEG.th * j.ll, SEG.sh * j.ll, g('kb', far) ?? -1);
      j.th = angOf(j.hip, j.kne); j.sh = angOf(j.kne, j.ank);
      j.toe = go(j.ank, j.ft, 10.5); j.heel = go(j.ank, j.ft + 180, 2.6);
    }
    j.hd = g('hd', far) ?? j.fa;
    return j;
  };
  return { n: solve(n, false), f: solve(f, true) };
}

function sideLeg(j, far) {
  const t = far ? '-far' : '';
  return path(capsule(j.kne, j.ank, 4.9, 3.1), `rp-skin${t}`)
    + path(capsule(j.hip, j.kne, 7.2, 4.9), `rp-skin${t}`)
    + path(capsule(j.hip, go(j.hip, j.th, SEG.th * 0.52 * j.ll), 7.9, 6.6), `rp-shorts${t}`)
    + path(capsule(j.heel, j.toe, 3.7, 2.8), `rp-shoe${t}`)
    + path(capsule(go(j.heel, j.ft - 90, 2.5), go(j.toe, j.ft - 90, 1.9), 1.3, 1.1), 'rp-sole');
}

function sideArm(j, far) {
  const t = far ? '-far' : '';
  return path(capsule(j.elb, j.wri, 3.9, 2.8), `rp-skin${t}`)
    + path(capsule(j.wri, go(j.wri, j.hd, SEG.hand), 3.2, 2.7), `rp-skin${t}`)
    + path(capsule(j.sho, j.elb, 5.4, 3.9), `rp-skin${t}`)
    + path(capsule(j.sho, go(j.sho, j.ua, SEG.ua * 0.36 * j.ul), 6.4, 5.6), `rp-shirt${t}`);
}

function sideTrunk(j, p) {
  const u = p.torso;
  const at = spineAt(j.hip, u, p.flex);
  const shirt = blob([...FRONT, ...BACK].map(([t, o]) => at(t, o)));
  const shorts = blob([at(-0.12, 2), at(0.04, 8.5), at(0.2, 7.6), at(0.2, -7.8), at(0.06, -9.1), at(-0.1, -6.6)]);
  const tl = u - (p.flex || 0) + (p.tilt || 0);
  const nb = at(0.93, 0.6);
  const hc = go(go(nb, tl, 13.5), tl - 90, 1.6);
  const hr = 8.7, hp = a => go(hc, a, hr);
  const ear = go(go(hc, tl + 180, 1), tl + 270, 1.2);
  const eye = go(go(hc, tl - 90, 5.3), tl, 1.3);
  return { at, hc, body: path(shirt, 'rp-shirt') + path(shorts, 'rp-shorts'),
    head: path(capsule(at(0.86, 0.3), go(nb, tl, 9), 3.9, 3.4), 'rp-skin')
    + circ(hc, 8.2, 'rp-skin')
    + path(`M${P(go(hc, tl - 82, 7.9))}L${P(go(hc, tl - 93, 9.5))}L${P(go(hc, tl - 103, 7.9))}Z`, 'rp-skin')
    + path(`M${P(hp(tl - 22))}A${hr} ${hr} 0 0 0 ${P(hp(tl + 128))}Q${P(go(hc, tl + 62, 1.6))} ${P(hp(tl - 22))}Z`, 'rp-hair')
    + `<ellipse class="rp-ear" cx="${r1(ear[0])}" cy="${r1(ear[1])}" rx="1.4" ry="2.1" transform="rotate(${r1(90 - tl)} ${P(ear)})"/>`
    + circ(eye, 0.95, 'rp-eye') };
}

/* A muscle on the trunk: a band between two points along the spine,
   riding the front or back surface. */
function trunkBand(at, t0, t1, front, depth) {
  const tbl = front ? FRONT : BACK, sg = front ? 1 : -1;
  const ts = [0, 0.25, 0.5, 0.75, 1].map(k => t0 + (t1 - t0) * k);
  const outer = ts.map((t, i) => at(t, surf(tbl, t) + sg * (i === 0 || i === 4 ? -0.4 : 0.9)));
  const inner = ts.slice().reverse().map(t => at(t, surf(tbl, t) - sg * depth));
  return blob([...outer, ...inner]);
}

const TRUNK_HI = {
  chest:    at => trunkBand(at, 0.62, 0.95, true, 5.5),
  abs:      at => trunkBand(at, 0.12, 0.62, true, 4.5),
  obliques: at => blob([at(0.58, 4.5), at(0.4, 5.6), at(0.18, 4.8), at(0.16, -2.5), at(0.4, -3.2), at(0.6, -2.5)]),
  lats:     at => trunkBand(at, 0.42, 0.86, false, 5.5),
  traps:    at => trunkBand(at, 0.84, 1.08, false, 5),
  erectors: at => trunkBand(at, 0.04, 0.5, false, 4.5),
  glutes:   at => trunkBand(at, -0.14, 0.16, false, 6.5),
  serratus: at => blob([at(0.78, 7.5), at(0.62, 8.2), at(0.5, 6), at(0.56, 1.5), at(0.74, 2)]),
};

const LIMB_HI = {
  triceps:  n => lens(go(n.sho, n.ua, SEG.ua * n.ul * 0.24), go(n.sho, n.ua, SEG.ua * n.ul * 0.92), n.ua - 90, 5.1, 4, 4.2),
  biceps:   n => lens(go(n.sho, n.ua, SEG.ua * n.ul * 0.3), go(n.sho, n.ua, SEG.ua * n.ul * 0.9), n.ua + 90, 5.1, 4, 4),
  brachialis: n => lens(go(n.sho, n.ua, SEG.ua * n.ul * 0.5), go(n.sho, n.ua, SEG.ua * n.ul * 1.02), n.ua + 90, 4.6, 3.9, 3),
  forearms: n => capsule(go(n.elb, n.fa, 2), go(n.elb, n.fa, SEG.fa * 0.82), 4.1, 3),
  'front delts': n => lens(go(n.sho, n.ua, -3), go(n.sho, n.ua, SEG.ua * n.ul * 0.42), n.ua + 90, 6.2, 5, 3.2),
  'rear delts':  n => lens(go(n.sho, n.ua, -3), go(n.sho, n.ua, SEG.ua * n.ul * 0.42), n.ua - 90, 6.2, 5, 3.2),
  'side delts':  n => capsule(go(n.sho, n.ua, -2), go(n.sho, n.ua, SEG.ua * n.ul * 0.2), 5.6, 4.8),
  quads:    n => lens(go(n.hip, n.th, 5), go(n.hip, n.th, SEG.th * n.ll * 0.94), n.th + 90, 7, 5, 4.4),
  hamstrings: n => lens(go(n.hip, n.th, 6), go(n.hip, n.th, SEG.th * n.ll * 0.96), n.th - 90, 7, 5, 4),
  calves:   n => lens(go(n.kne, n.sh, 3), go(n.kne, n.sh, SEG.sh * n.ll * 0.62), n.sh - 90, 4.9, 3.8, 3.4),
  'hip flexors': n => lens(go(n.hip, n.th, -2), go(n.hip, n.th, SEG.th * 0.42), n.th + 90, 7.4, 6.6, 3),
};

/* ══ FRONT VIEW ══ */

const HALF = [[-0.14, 9.6], [0.1, 10.2], [0.36, 9], [0.62, 10.6], [0.86, 12.6], [1, 12.4], [1.06, 7]];

function frontJoints(p) {
  const u = p.torso ?? 90, tl = p.tlen ?? 1, c = p.hip || [100, 150];
  const at = (t, off) => go(go(c, u, SEG.torso * t * tl), u - 90, off);
  const side = s => {
    const k = key => p[s + key];
    const sg = s === 'b' ? 1 : -1;
    const sho = at(0.9, sg * 11.5), hip = at(0, sg * 6.5);
    const al = k('l') ?? 1, ll = k('ll') ?? 1;
    let elb = go(sho, k('ua') ?? 270, SEG.ua * al), wri = go(elb, k('fa') ?? 270, SEG.fa * al);
    let kne = go(hip, k('th') ?? 270, SEG.th * ll), ank = go(kne, k('sh') ?? 270, SEG.sh * ll);
    if (k('hand')) [elb, wri] = ik(sho, k('hand'), SEG.ua * al, SEG.fa * al, k('eb') ?? sg);
    if (k('foot')) [kne, ank] = ik(hip, k('foot'), SEG.th * ll, SEG.sh * ll, k('kb') ?? -sg);
    return { sho, hip, elb, wri, kne, ank, ua: angOf(sho, elb), fa: angOf(elb, wri), hd: k('hd') ?? angOf(elb, wri), sg, al };
  };
  return { at, u, tl, a: side('a'), b: side('b') };
}

function frontArm(j) {
  return path(capsule(j.elb, j.wri, 3.9, 2.8), 'rp-skin')
    + path(capsule(j.wri, go(j.wri, j.hd, SEG.hand * Math.max(0.5, j.al)), 3.2, 2.7), 'rp-skin')
    + path(capsule(j.sho, j.elb, 5.4, 3.9), 'rp-skin')
    + path(capsule(j.sho, go(j.sho, j.ua, SEG.ua * 0.34 * j.al), 6.6, 5.6), 'rp-shirt');
}

function frontLeg(j) {
  const sh = angOf(j.kne, j.ank), th = angOf(j.hip, j.kne);
  return path(capsule(j.kne, j.ank, 4.7, 3.1), 'rp-skin')
    + path(capsule(j.hip, j.kne, 7.4, 4.8), 'rp-skin')
    + path(capsule(j.hip, go(j.hip, th, SEG.th * 0.5), 8, 6.8), 'rp-shorts')
    + path(capsule(go(go(j.ank, sh, 1.5), sh + 90, 1.4), go(go(j.ank, sh, 1.5), sh - 90, 1.4), 3.7, 3.7), 'rp-shoe');
}

function frontTrunk(F, p) {
  const { at, u } = F;
  const right = HALF.map(([t, o]) => at(t, o)), left = HALF.slice().reverse().map(([t, o]) => at(t, -o));
  const nb = at(1.02, 0);
  const tl = u + (p.tilt || 0);
  const hc = go(nb, tl, 10.5 * Math.max(0.6, F.tl));
  const ear = s => go(go(hc, tl + s * 90, 8), tl + 180, 1);
  let head = path(capsule(at(0.95, 0), go(nb, tl, 5), 4.3, 3.9), 'rp-skin')
    + `<ellipse class="rp-ear" cx="${r1(ear(1)[0])}" cy="${r1(ear(1)[1])}" rx="1.7" ry="2.4" transform="rotate(${r1(90 - tl)} ${P(ear(1))})"/>`
    + `<ellipse class="rp-ear" cx="${r1(ear(-1)[0])}" cy="${r1(ear(-1)[1])}" rx="1.7" ry="2.4" transform="rotate(${r1(90 - tl)} ${P(ear(-1))})"/>`
    + circ(hc, 8.4, 'rp-skin');
  if (p.face === 'down') head += circ(hc, 8.9, 'rp-hair');
  else head += path(`M${P(go(hc, tl - 84, 8.9))}A8.9 8.9 0 0 0 ${P(go(hc, tl + 84, 8.9))}Q${P(go(hc, tl, 3.6))} ${P(go(hc, tl - 84, 8.9))}Z`, 'rp-hair')
    + circ(go(go(hc, tl - 90, 3.1), tl + 180, 1), 0.95, 'rp-eye') + circ(go(go(hc, tl + 90, 3.1), tl + 180, 1), 0.95, 'rp-eye');
  return { body: path(blob([...right, ...left]), 'rp-shirt')
      + path(blob([at(-0.2, 9.4), at(0.16, 10), at(0.16, -10), at(-0.2, -9.4), at(-0.3, 0)]), 'rp-shorts'), head };
}

const FRONT_HI = {
  'side delts': F => [F.a, F.b].map(j => capsule(go(j.sho, j.ua, -1.6), go(j.sho, j.ua, SEG.ua * 0.34 * j.al), 6.2, 4.8)).join(''),
  'rear delts': F => [F.a, F.b].map(j => capsule(go(j.sho, j.ua, -1.6), go(j.sho, j.ua, SEG.ua * 0.34 * j.al), 6.2, 4.8)).join(''),
  chest: F => [1, -1].map(s => blob([F.at(0.86, s * 1.5), F.at(0.9, s * 10.5), F.at(0.66, s * 10), F.at(0.6, s * 3)])).join(''),
  abs: F => blob([F.at(0.58, 4.5), F.at(0.12, 4), F.at(0.12, -4), F.at(0.58, -4.5)]),
  obliques: F => [1, -1].map(s => blob([F.at(0.6, s * 10.4), F.at(0.1, s * 10), F.at(0.18, s * 5.5), F.at(0.55, s * 6.5)])).join(''),
  lats: F => [1, -1].map(s => blob([F.at(0.88, s * 12.4), F.at(0.42, s * 9.4), F.at(0.6, s * 5.5), F.at(0.84, s * 7)])).join(''),
  traps: F => blob([F.at(1.05, 6), F.at(0.95, 11.5), F.at(0.86, 4), F.at(0.86, -4), F.at(0.95, -11.5), F.at(1.05, -6)]),
  biceps: F => [F.a, F.b].map(j => capsule(go(j.sho, j.ua, SEG.ua * 0.28 * j.al), go(j.sho, j.ua, SEG.ua * 0.86 * j.al), 4.4, 3.5)).join(''),
};

/* ══ KIT ══ */

/* The barbell is the dumbbell-to-barbell converter data.js plans for, so
   its plates are dumbbell-sized, not 45 cm Olympic ones. */

/* An adjustable dumbbell: two blocks of plates on a short handle.
   'end' is seen down its handle (a press or a curl from the side); 'side'
   shows its length (a hammer curl, or held by one end). */
function dumbbell(c, ang, kind, far) {
  const t = far ? ' rp-far' : '';
  if (kind === 'end') return `<g class="rp-db${t}" transform="translate(${P(c)}) rotate(${r1(-ang)})">
      <rect class="rp-plate" x="-7.6" y="-7.6" width="15.2" height="15.2" rx="4"/>
      <rect class="rp-plate-in" x="-4.6" y="-4.6" width="9.2" height="9.2" rx="2.4"/>
      <circle class="rp-hub" r="1.8"/></g>`;
  const block = x => `<rect class="rp-plate" x="${x}" y="-8.2" width="8.4" height="16.4" rx="2.2"/>
    <path class="rp-groove" d="M${r1(x + 2.8)} -7V7M${r1(x + 5.6)} -7V7"/>`;
  return `<g class="rp-db${t}" transform="translate(${P(c)}) rotate(${r1(-ang)})">
    <rect class="rp-handle" x="-7.5" y="-1.8" width="15" height="3.6" rx="1.3"/>
    ${block(6.5)}${block(-14.9)}</g>`;
}

function barbell(c, far) {
  return `<g class="rp-bb${far ? ' rp-far' : ''}" transform="translate(${P(c)})">
    <circle class="rp-bb-plate" r="10"/><circle class="rp-bb-ring" r="6.8"/>
    <circle class="rp-bb-sleeve" r="2.2"/></g>`;
}

/* The wheel rolls: its spokes turn with how far the hands have travelled. */
function wheel(c) {
  const rot = -(c[0] / 8.5) / D;
  return `<g class="rp-wheel" transform="translate(${P(c)})">
    <circle class="rp-tyre" r="8.5"/><circle class="rp-rim" r="5.6"/>
    <path class="rp-spoke" transform="rotate(${r1(rot % 360)})" d="M-5.6 0H5.6M0 -5.6V5.6"/>
    <circle class="rp-hub" r="1.9"/></g>`;
}

/* What a hand (or the hips, or the feet) is holding. 'under' kit sits
   between the hands, so the near arm is drawn over it. */
const UNDER = new Set(['wheel', 'db-goblet', 'db-axial', 'db-feet']);
function holdSide(spec, j, p, far) {
  if (!spec) return '';
  const grip = go(j.wri, j.hd, 3.4);
  const fwd = p.torso - 90;
  switch (spec) {
    case 'db': return dumbbell(grip, j.hd, 'end', far);
    case 'db-side': return dumbbell(grip, j.hd + 90, 'side', far);
    case 'db-axial': return dumbbell(go(go(j.wri, j.fa, 4.6), j.fa, 4.2), j.fa, 'side', far);
    case 'db-goblet': return dumbbell(go(go(j.wri, j.hd, 3), 270, 8), 90, 'side', far);
    case 'db-feet': return dumbbell(go(mid(j.ank, j.toe), j.sh, 6), j.sh + 90, 'side', far);
    case 'db-hip': return dumbbell(go(go(j.hip, fwd, 13), p.torso, 3), j.hd, 'end', far);
    case 'bb': return barbell(grip, far);
    case 'bb-hip': return barbell(go(go(j.hip, fwd, 14), p.torso, 3), far);
    case 'bb-rack': return barbell(go(go(j.sho, fwd, 9), p.torso, 2), far);
    case 'wheel': return wheel([j.wri[0], j.wri[1] + 2]);
    default: return '';
  }
}

/* ── the scene ── */

/* An adjustable bench from the side: a seat pad and a back pad at `back`
   degrees (positive inclines toward the head end, 0 is flat, negative
   declines), the steel frame, the incline ladder and its pop pin. */
function bench(b) {
  const x = b.x, y = b.y ?? 161, back = b.back ?? 0, len = b.len ?? 72;
  const pad = (o, dir, l) => `<g transform="translate(${P(o)}) rotate(${r1(-dir)})">
      <rect class="rp-pad" x="0" y="-4.2" width="${l}" height="8.4" rx="3.6"/>
      <path class="rp-pad-sheen" d="M3.5 -2.4H${l - 3.5}"/></g>`;
  const dir = 180 - back, o = [x - 23, y], top = go(o, dir, len);
  const rearX = Math.min(x - 31, top[0] + 8);
  let s = `<path class="rp-steel" d="M${r1(rearX - 2)} 187H${x + 31}"/>
    <path class="rp-steel" d="M${x + 29} 187V192M${r1(rearX)} 187V192"/>
    <rect class="rp-foot" x="${x + 20}" y="191.2" width="18" height="3" rx="1.5"/>
    <rect class="rp-foot" x="${r1(rearX - 9)}" y="191.2" width="18" height="3" rx="1.5"/>
    <path class="rp-steel" d="M${x + 3} ${y + 4}V187"/>
    <path class="rp-steel-thin" d="M${x - 19} ${y + 5}H${x + 19}"/>`;
  if (back > 8) {
    const rear = q => go(q, dir + 90, 5.4), brace = rear(go(o, dir, len * 0.42));
    s += `<path class="rp-ladder" d="M${x - 24} 183.6H${x - 7}"/>
      <path class="rp-steel" d="M${x - 25} 187L${P(brace)}"/>
      <path class="rp-steel-thin" d="M${P(rear(go(o, dir, 4)))}L${P(rear(go(o, dir, len - 6)))}"/>
      ${circ(mid([x - 25, 187], brace), 2.1, 'rp-pin')}`;
  } else {
    s += `<path class="rp-steel" d="M${P(go(go(top, dir + 180, 8), dir + 90, 4))}L${r1(top[0] + 6)} 187"/>`;
  }
  s += pad(o, dir, len) + pad([x - 23, y], 0, 46);
  return b.flip ? `<g transform="translate(${2 * x} 0) scale(-1 1)">${s}</g>` : s;
}

function wall(w) {
  const x = w.x, left = w.side === 'l';
  return `<rect class="rp-wall" x="${left ? x - 12 : x}" y="-60" width="12" height="${FLOOR + 60}"/>
    <rect class="rp-base" x="${left ? x - 2.4 : x}" y="${FLOOR - 7}" width="2.4" height="7"/>`;
}

/* A wall-mounted pull-up bar from the side: the bar end-on on its arm. */
function bar(b) {
  return `<path class="rp-steel-thin" d="M${b.x} ${b.y}L${b.x - 26} ${b.y - 10}"/>
    <rect class="rp-wall" x="${b.x - 38}" y="-60" width="12" height="${FLOOR + 60}"/>
    ${circ([b.x, b.y], 2.8, 'rp-pullbar')}`;
}

const SCENE = {
  bench,
  wall,
  bar,
  hbar: b => `<rect class="rp-pullbar" x="${b.x0}" y="${b.y - 2.4}" width="${b.x1 - b.x0}" height="4.8" rx="2.4"/>
    <path class="rp-steel" d="M${b.x0 + 3} ${b.y}V-60M${b.x1 - 3} ${b.y}V-60"/>`,
  mat: m => `<rect class="rp-mat" x="${m.x0}" y="${FLOOR - 2.2}" width="${m.x1 - m.x0}" height="2.6" rx="1.2"/>`,
  wedge: w => `<path class="rp-wedge" d="M${w.x - w.w / 2} ${FLOOR}H${w.x + w.w / 2}V${FLOOR - w.h}L${w.x - w.w / 2} ${FLOOR - w.h * 0.3}Z"/>`,
  books: k => k.xs.map(x => [0, 1, 2].slice(0, k.n ?? 2).map(i =>
    `<rect class="rp-book${i % 2 ? ' alt' : ''}" x="${x - 9 + (i % 2)}" y="${r1(FLOOR - 3.4 * (i + 1))}" width="18" height="3.2" rx=".8"/>`).join('')).join(''),
  anchor: a => `<rect class="rp-pad" x="${a.x - 18}" y="${a.y - 9}" width="36" height="13" rx="4"/>
    <rect class="rp-foot" x="${a.x - 15}" y="${a.y + 4}" width="4" height="${FLOOR - a.y - 4}"/>
    <rect class="rp-foot" x="${a.x + 11}" y="${a.y + 4}" width="4" height="${FLOOR - a.y - 4}"/>`,
  /* A flat bench seen end-on (front view): the pad, its post and foot. */
  benchEnd: b => `<path class="rp-steel" d="M${b.x} ${b.y + 4}V${FLOOR - 2}"/>
    <rect class="rp-foot" x="${b.x - 16}" y="${FLOOR - 3}" width="32" height="3" rx="1.5"/>
    <rect class="rp-pad" x="${b.x - 12}" y="${b.y - 4.5}" width="24" height="9" rx="3.6"/>`,
  /* A flat bench from above (front view of someone lying on it). */
  benchTop: b => `<rect class="rp-pad" x="${b.x - 12}" y="${b.y0}" width="24" height="${b.y1 - b.y0}" rx="5"/>
    <path class="rp-pad-sheen" d="M${b.x - 7} ${b.y0 + 4}V${b.y1 - 4}"/>`,
};

const sceneBox = s => {
  switch (s.k) {
    case 'bench': {
      const len = s.len ?? 72, top = go([s.x - 23, s.y ?? 161], 180 - (s.back ?? 0), len);
      const b = [Math.min(s.x - 42, top[0] - 6), Math.min((s.y ?? 161) - 6, top[1] - 6), s.x + 40, FLOOR];
      return s.flip ? [2 * s.x - b[2], b[1], 2 * s.x - b[0], b[3]] : b;
    }
    case 'wall': return s.side === 'l' ? [s.x - 6, null, s.x, FLOOR] : [s.x, null, s.x + 6, FLOOR];
    case 'bar': return [s.x - 30, s.y - 12, s.x + 6, s.y + 4];
    case 'hbar': return [s.x0, s.y - 8, s.x1, s.y + 4];
    case 'mat': return [s.x0, FLOOR - 3, s.x1, FLOOR];
    case 'wedge': return [s.x - s.w / 2, FLOOR - s.h, s.x + s.w / 2, FLOOR];
    case 'books': return [Math.min(...s.xs) - 10, FLOOR - 11, Math.max(...s.xs) + 10, FLOOR];
    case 'anchor': return [s.x - 18, s.y - 9, s.x + 18, FLOOR];
    case 'benchEnd': return [s.x - 16, s.y - 5, s.x + 16, FLOOR];
    case 'benchTop': return [s.x - 12, s.y0, s.x + 12, s.y1];
    default: return null;
  }
};

/* ══ RENDER ══ */

function render(p, m) {
  return m.view === 'front' ? renderFront(p, m) : renderSide(p, m);
}

function renderSide(p, m) {
  const { n, f } = sideJoints(p);
  const T = sideTrunk(n, p);
  const hold = m.hold || {};
  const trunkHi = (list, cls) => (list || []).map(k => TRUNK_HI[k] ? path(TRUNK_HI[k](T.at), cls) : '').join('');
  const limbHi = (list, cls) => (list || []).map(k => LIMB_HI[k] ? path(LIMB_HI[k](n), cls) : '').join('');
  const nh = holdSide(hold.n, n, p, false), fh = holdSide(hold.f, f, p, true);
  const hip = hold.hip ? holdSide(hold.hip, n, p, false) : '';
  const under = UNDER.has(hold.n);
  const back = sideLeg(f, true) + sideArm(f, true) + fh;
  const front = T.body + (hold.pack ? pack(T.at) : '') + trunkHi(m.hi2, 'rp-hi2') + trunkHi(m.hi, 'rp-hi') + T.head
    + (under ? nh : '') + sideLeg(n, false) + sideArm(n, false) + (under ? '' : nh) + hip
    + limbHi(m.hi2, 'rp-hi2') + limbHi(m.hi, 'rp-hi');
  return { back, front, pts: [n.hip, n.sho, n.elb, n.wri, n.kne, n.ank, n.toe, n.heel, f.wri, f.ank, f.toe, T.hc,
    go(n.wri, n.hd, 9), go(f.wri, f.hd, 9)], j: n };
}

function pack(at) {
  return path(blob([at(0.4, -7), at(0.9, -7.6), at(0.92, -16.5), at(0.62, -18.5), at(0.38, -16)]), 'rp-pack')
    + path(`M${P(at(0.86, -7.4))}Q${P(at(0.98, -1.5))} ${P(at(0.9, 4.5))}`, 'rp-strap');
}

function renderFront(p, m) {
  const F = frontJoints(p);
  const T = frontTrunk(F, p);
  const hold = m.hold || {};
  const db = j => (hold.n === 'db' ? dumbbell(go(j.wri, j.hd, 3.4), j.hd, 'end') : hold.n === 'db-side' ? dumbbell(go(j.wri, j.hd, 3.4), j.hd + 90, 'side') : '');
  const one = hold.one === 'a' ? [F.a] : hold.one === 'b' ? [F.b] : [F.a, F.b];
  const hi = (list, cls) => (list || []).map(k => FRONT_HI[k] ? path(FRONT_HI[k](F), cls) : '').join('');
  const legs = m.noLegs ? '' : frontLeg(F.a) + frontLeg(F.b);
  const arms = frontArm(F.a) + frontArm(F.b);
  const body = T.body + hi(m.hi2, 'rp-hi2') + hi(m.hi, 'rp-hi');
  const front = m.armsBehind
    ? legs + arms + one.map(db).join('') + body + T.head
    : m.headFirst ? legs + body + T.head + arms + one.map(db).join('')
    : legs + body + T.head + arms + one.map(db).join('');
  const pts = [F.a.wri, F.b.wri, F.a.elb, F.b.elb, F.at(1.3, 0), F.a.sho, F.b.sho, go(F.a.wri, F.a.hd, 9), go(F.b.wri, F.b.hd, 9)];
  if (!m.noLegs) pts.push(F.a.ank, F.b.ank, F.at(-0.25, 0));
  return { back: '', front, pts, j: F.b };
}

function lerp(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    /* null switches something off (a planted foot leaving the floor): it
       cannot blend, so it changes over halfway through the move. */
    if (a[key] === null || b[key] === null) { o[key] = k < 0.5 ? a[key] : b[key]; continue; }
    const x = a[key] ?? b[key], y = b[key] ?? a[key];
    if (Array.isArray(x) && Array.isArray(y)) o[key] = x.map((v, i) => v + (y[i] - v) * k);
    else if (typeof x === 'number' && typeof y === 'number') o[key] = x + (y - x) * k;
    else o[key] = k < 0.5 ? a[key] : b[key];
  }
  return o;
}

const poseOf = (m, name) => ({ ...m.base, ...m.poses[name] });

/* Every frame the loop can draw, coarsely: the tempo's poses and the
   points between them. */
function frames(m) {
  const steps = m.tempo.map(([n]) => poseOf(m, n));
  const out = [];
  steps.forEach((s, i) => {
    const prev = steps[(i + steps.length - 1) % steps.length];
    for (const k of [0.25, 0.5, 0.75]) out.push(lerp(prev, s, k));
    out.push(s);
  });
  return out;
}

/* The view box: whatever the body, its kit and the scene reach across the
   whole rep, padded, and never so tall and thin it shrinks to a sliver. */
function viewBox(m) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  for (const p of frames(m)) for (const q of render(p, m).pts) take(q[0] - 11, q[1] - 11, q[0] + 11, q[1] + 11);
  for (const s of m.scene || []) {
    const b = sceneBox(s);
    if (b) take(b[0], b[1] ?? y0, b[2], b[3]);
  }
  if (!m.noFloor) take(x0, y0, x1, FLOOR + 3);
  x0 -= 5; x1 += 5; y0 -= 4; y1 += 1;
  let w = x1 - x0, h = y1 - y0;
  if (w < h * 0.9) { x0 -= (h * 0.9 - w) / 2; w = h * 0.9; }
  if (h < w * 0.56) { y0 -= w * 0.56 - h; h = w * 0.56; }
  return [x0, y0, w, h].map(r1);
}

function trace(m) {
  if (!m.trace) return '';
  const steps = m.tempo.map(([n]) => poseOf(m, n));
  const pts = [];
  steps.forEach((s, i) => {
    const prev = steps[(i + steps.length - 1) % steps.length];
    for (let k = 0; k <= 12; k++) {
      const r = render(lerp(prev, s, k / 12), m);
      const j = r.j;
      pts.push(P(m.trace === 'toe' ? j.toe : m.trace === 'hip' ? j.hip : go(j.wri, j.hd, 3.4)));
    }
  });
  return `<polyline class="rp-trace" points="${pts.join(' ')}"/>`;
}

/* ── the lab ── */

export function animHTML(name) {
  const m = MOTION[name];
  if (!m) return '';
  const vb = viewBox(m);
  const segs = m.tempo.map(([, s, label]) =>
    `<span class="rp-seg" style="flex:${Math.max(s, 1.1)}"><i></i><b>${label}</b><em>${s}s</em></span>`).join('');
  const scene = (m.scene || []).map(s => SCENE[s.k](s)).join('');
  return `<figure class="mm-anim">
    <svg viewBox="${vb.join(' ')}" role="img" aria-label="${m.label || name}">
      ${m.noFloor ? '' : `<ellipse class="rp-shadow" cx="${r1(vb[0] + vb[2] / 2)}" cy="${FLOOR}" rx="${r1(vb[2] * 0.3)}" ry="2.8"/>
      <path class="rp-floor" d="M${vb[0]} ${FLOOR + 0.6}H${r1(vb[0] + vb[2])}"/>`}
      ${m.sceneFront || m.sceneMid ? '' : scene}
      <g class="rp-back"></g>
      ${m.sceneMid ? scene : ''}
      ${trace(m)}
      <g class="rp-front"></g>
      ${m.sceneFront ? scene : ''}
    </svg>
    <button type="button" class="rp-pp" aria-label="Pause animation" aria-pressed="false"></button>
    <figcaption class="rp-bar">${segs}</figcaption>
  </figure>`;
}

/* Builds every frame once, for tools/howto/check.mjs: a pose the tempo
   names but nobody wrote, or a frame with NaN in it, is caught there
   rather than in the lab. Returns an error string, or '' when sound. */
export function checkMotion(m) {
  if (!Array.isArray(m.tempo) || !m.tempo.length) return 'has no tempo';
  for (const [n] of m.tempo) if (!m.poses[n]) return `tempo names a pose that does not exist: "${n}"`;
  if (m.still && !m.poses[m.still]) return `still frame "${m.still}" is not a pose`;
  for (const s of m.scene || []) if (!SCENE[s.k]) return `unknown scene item "${s.k}"`;
  try {
    for (const p of frames(m)) {
      const r = render(p, m);
      if (/NaN|undefined/.test(r.back + r.front)) return 'draws a frame with NaN coordinates';
    }
    if (/NaN/.test(viewBox(m).join())) return 'has no sensible view box';
  } catch (e) { return `throws: ${e.message}`; }
  return '';
}

/* One frame on its own, for the gallery in tools/howto/anim.html. */
export function stillSVG(name, pose) {
  const m = MOTION[name];
  const r = render(poseOf(m, pose), m);
  return animHTML(name).replace('<g class="rp-back"></g>', `<g class="rp-back">${r.back}</g>`)
    .replace('<g class="rp-front"></g>', `<g class="rp-front">${r.front}</g>`);
}

/* Starts the loop in a figure animHTML() built; returns the stop. */
export function playAnim(fig, name) {
  const m = MOTION[name];
  if (!fig || !m) return () => {};
  const back = fig.querySelector('.rp-back'), front = fig.querySelector('.rp-front');
  const segs = [...fig.querySelectorAll('.rp-seg')];
  const pp = fig.querySelector('.rp-pp');
  const steps = m.tempo.map(([pose, s]) => ({ pose: poseOf(m, pose), s }));
  const total = steps.reduce((a, x) => a + x.s, 0);

  /* A held position is not frozen: `sway` adds a slow wobble to the keys
     it names, the way a handstand balances. */
  const paint = (p, t) => {
    for (const [k, amp, hz] of m.sway || []) if (typeof p[k] === 'number') p[k] += amp * Math.sin(2 * Math.PI * hz * t);
    const r = render(p, m);
    back.innerHTML = r.back; front.innerHTML = r.front;
  };
  const bar = (i, k) => segs.forEach((el, j) => {
    el.classList.toggle('on', j === i);
    el.firstChild.style.width = `${j < i ? 100 : j === i ? k * 100 : 0}%`;
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const i = Math.max(0, m.tempo.findIndex(([pose]) => pose === m.still));
    paint({ ...steps[i].pose }, 0);
    fig.classList.add('still');
    pp.hidden = true;
    return () => {};
  }

  let raf = 0, clock = 0, last = 0, paused = false;
  const tick = now => {
    clock += last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    let t = clock % total, i = 0;
    while (i < steps.length - 1 && t > steps[i].s) { t -= steps[i].s; i++; }
    const k = Math.min(1, t / steps[i].s);
    paint(lerp(steps[(i + steps.length - 1) % steps.length].pose, steps[i].pose, ease(k)), clock);
    bar(i, k);
    raf = requestAnimationFrame(tick);
  };
  const toggle = () => {
    paused = !paused;
    fig.classList.toggle('paused', paused);
    pp.setAttribute('aria-pressed', String(paused));
    pp.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
    if (paused) cancelAnimationFrame(raf);
    else { last = 0; raf = requestAnimationFrame(tick); }
  };
  pp.addEventListener('click', toggle);
  /* Draw the opening frame now: a backgrounded tab does not run animation
     frames, and the figure should never open empty. */
  paint({ ...steps[steps.length - 1].pose }, 0);
  bar(0, 0);
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
