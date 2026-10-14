/* ═══════════════════════════════════════════════════════════
   WORKOUT — 3D RIG

   A pose from moves.js (via timeline.js) in, a body in 3D space out:
   every joint's position, every segment's frame, and where each piece of
   kit sits. Pure arithmetic and no drawing, so stage.js renders from it,
   tools/howto/check.mjs tests it (nothing through the floor, every
   planted hand on its mark), and both read exactly the same body.

   SPACE. Units are the drawing's own, about 1.1 cm each. x runs the way
   the figure faces, y is height above the floor, z is sideways: +z is the
   figure's near side (the one a side-on camera sees) and −z its far side.
   moves.js was first written as side views, so a 2D point [x, y] in it
   is read as x forward and y down the screen from a floor at 194 — the
   rig converts — and a third number, when given, is z.

   THE BODY FRAME. F (facing), U (head-up) and L (near side) are world
   x, y and z unless a pose turns the whole body with `bodyF`/`bodyU`
   (a side plank lies on its side). Every angle in a pose is measured in
   the body's sagittal plane — the F–U plane — exactly as the side views
   were: 0 forward, 90 up, 180 back, 270 down. Then:

     uab, fab   upper arm / forearm abduction: degrees out to the side,
                away from the body (a lateral raise is ua 270 → uab 85)
     lab, sab   the same for thigh and shin (a straddle)
     tab        toe-out
     twist      shoulders turn about the spine: + brings the near
                shoulder forward
     shrug      shoulders lifted (+) or pulled down (−) along the spine
     …v         an explicit world direction [x, y, z] for a segment
                (uav, fav, thv, shv) when angles will not say it
     ep, kp     the way an elbow or knee points while it reaches a
                planted target, as a world vector, for reaches out of the
                sagittal plane; in-plane reaches use eb/kb (±1) as the
                side views did
   ═══════════════════════════════════════════════════════════ */

/* Segment lengths are the trainer's own (avatar.js; a 1.8 m adult, so in
   line with standard proportions): hip joint to shoulder joint 47 units,
   upper arm 26.5, forearm 24.5, shoulder joints 37 apart, the head's
   centre about 71 above the hip joint. */
export const SEG = { torso: 54, ua: 26.5, fa: 24.5, hand: 8.8, th: 38, sh: 41, toe: 10.5, heel: 2.6 };
export const BODY = { shoW: 18.5, hipW: 8.5, headR: 9.2, neck: 19.5 };
const SCREEN_FLOOR = 194;
const D = Math.PI / 180;

/* ── vectors ── */
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  mad: (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
};
const { add, sub, mul, dot, cross, len, norm, lerp, mad } = v3;

/* Rotate v about the unit axis k by deg (Rodrigues). */
const rot = (v, k, deg) => {
  const c = Math.cos(deg * D), s = Math.sin(deg * D), kv = dot(k, v), kx = cross(k, v);
  return [v[0] * c + kx[0] * s + k[0] * kv * (1 - c), v[1] * c + kx[1] * s + k[1] * kv * (1 - c), v[2] * c + kx[2] * s + k[2] * kv * (1 - c)];
};
/* The part of h perpendicular to unit a, normalised; `alt` if h lies along a. */
const perp = (h, a, alt) => {
  const p = sub(h, mul(a, dot(h, a)));
  return len(p) > 1e-3 ? norm(p) : alt ? perp(alt, a) : norm(cross(a, [0, 0, 1]));
};

/* A 2D point from moves.js to world space; z when it has one. */
export const W = (p, z = 0) => [p[0], SCREEN_FLOOR - p[1], p[2] ?? z];

/* Two-bone IK in 3D: from a toward target t, the middle joint bending
   toward `pole`. An unreachable target straightens the limb toward it. */
function ik(a, t, l1, l2, pole) {
  const to = sub(t, a);
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, len(to) || 0.01));
  const dir = norm(to);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const up = perp(pole, dir, [0, 1, 0]);
  const mid = add(a, add(mul(dir, l1 * cosA), mul(up, l1 * Math.sqrt(1 - cosA * cosA))));
  const end = mad(mid, norm(sub(t, mid)), l2);
  return [mid, end];
}

/* ══ THE SKELETON ══ */

export function skeleton(p) {
  const F = norm(p.bodyF || [1, 0, 0]);
  const U = perp(p.bodyU || [0, 1, 0], F);
  const L = cross(F, U);
  const sag = deg => add(mul(F, Math.cos(deg * D)), mul(U, Math.sin(deg * D)));

  /* The spine: an arc of constant curvature in the sagittal plane (flex),
     turned about itself by twist toward the top. */
  const torso = p.torso ?? 90, flex = p.flex || 0, twist = p.twist || 0;
  const spineAt = (H, t) => {
    const k = -flex * D, a0 = torso * D, a = a0 + k * t;
    let off;
    if (Math.abs(k) < 1e-5) off = mul(sag(torso), SEG.torso * t);
    else off = add(mul(F, (SEG.torso / k) * (Math.sin(a) - Math.sin(a0))), mul(U, -(SEG.torso / k) * (Math.cos(a) - Math.cos(a0))));
    const T = sag(a / D), N = sag(a / D - 90);
    const tw = twist * Math.min(1, Math.max(0, t));
    return { p: add(H, off), T, N: rot(N, T, tw), L: rot(L, T, tw) };
  };

  /* A key for one side: the far side's own (f…) when the pose has one,
     else the near side's — and a direction borrowed from the near side
     is mirrored across the body, so one pole or vector serves both. */
  const getter = side => key => {
    if (side > 0) return p[key];
    if (p['f' + key] != null) return p['f' + key];
    const v = p[key];
    return Array.isArray(v) && v.length === 3 ? sub(v, mul(L, 2 * dot(v, L))) : v;
  };

  const build = H => {
    const S = t => spineAt(H, t);
    const top = S(0.9);
    const J = { H, spine: S, F, U, L };
    for (const side of [1, -1]) {
      const k = side > 0 ? '' : 'f';
      const g = getter(side);
      const s = {};
      s.side = side;
      s.sho = add(add(add(top.p, mul(top.N, 0.4)), mul(top.L, side * BODY.shoW)), mul(top.T, (p.shrug || 0) - 1.5));
      s.hip = add(H, mul(L, side * BODY.hipW));
      const dirOf = (vec, ang, ab, def) => {
        if (vec) return norm(vec);
        const a = ang ?? def;
        return add(mul(sag(a), Math.cos((ab || 0) * D)), mul(L, side * Math.sin((ab || 0) * D)));
      };
      s.uaDir = dirOf(g('uav'), g('ua'), g('uab'), 270);
      s.faDir = dirOf(g('fav'), g('fa'), g('fab') ?? g('uab'), 270);
      s.thDir = dirOf(g('thv'), g('th'), g('lab'), 270);
      s.shDir = dirOf(g('shv'), g('sh'), g('sab') ?? g('lab'), 270);
      s.ul = g('ul') ?? 1;
      s.elb = mad(s.sho, s.uaDir, SEG.ua * s.ul);
      s.wri = mad(s.elb, s.faDir, SEG.fa);
      s.kne = mad(s.hip, s.thDir, SEG.th);
      s.ank = mad(s.kne, s.shDir, SEG.sh);
      s.key = k;
      J[side > 0 ? 'n' : 'f'] = s;
    }
    return J;
  };

  /* Hang the body from its root: the hip by default, or a named joint. */
  let H = p.hip ? W(p.hip) : [100, 44, 0];
  if (p.root) {
    const J0 = build([0, 0, 0]);
    const far = p.root[0] === 'f';
    const s = far ? J0.f : J0.n, key = far ? p.root.slice(1) : p.root;
    const at = W(p.at);
    const j = key === 'toe' ? toeOf(s, p, far, F, U, L, sag) : s[key];
    H = sub(at, j);
    if (p.at[2] === undefined) H[2] = 0;
  }
  const J = build(H);

  /* Planted hands and feet: solve the elbow and knee, fading in and out
     with the target's weight (timeline.js). */
  for (const s of [J.n, J.f]) {
    const far = s.side < 0;
    const g = getter(s.side);
    const tgt = (key, zdef) => {
      const t = p[(far ? 'f' : '') + key];
      if (!Array.isArray(t)) return null;
      return W(t, s.side * zdef);
    };
    const pole = (vecKey, signKey, def) => {
      const v = g(vecKey);
      return v ? norm(v) : null;
    };
    const hand = tgt('hand', Math.abs(s.sho[2] - J.H[2]) || BODY.shoW);
    const hw = p[(far ? 'fhand' : 'hand') + 'W'] ?? 1;
    if (hand && hw > 0.001) {
      const goal = lerp(s.wri, hand, hw);
      const dir = norm(sub(goal, s.sho));
      const sign = g('eb') ?? 1;
      const pl = pole('ep') || (sign > 0 ? cross(dir, L) : cross(L, dir));
      const [e, w] = ik(s.sho, goal, SEG.ua * s.ul, SEG.fa, pl);
      s.armIn = hw > 0.5 ? mul(perp(pl, dir, [0, 1, 0]), -1) : null;   // the inside of the elbow's bend, even when straight
      s.uaDir = norm(lerp(s.uaDir, norm(sub(e, s.sho)), hw));
      s.elb = mad(s.sho, s.uaDir, SEG.ua * s.ul);
      s.faDir = norm(lerp(s.faDir, norm(sub(w, e)), hw));
      s.wri = mad(s.elb, s.faDir, SEG.fa);
    }
    const foot = tgt('foot', BODY.hipW);
    const fw = p[(far ? 'ffoot' : 'foot') + 'W'] ?? 1;
    if (foot && fw > 0.001) {
      const goal = lerp(s.ank, foot, fw);
      const dir = norm(sub(goal, s.hip));
      const sign = g('kb') ?? -1;
      const pl = pole('kp') || (sign > 0 ? cross(dir, L) : cross(L, dir));
      const [k, a] = ik(s.hip, goal, SEG.th, SEG.sh, pl);
      s.legOut = fw > 0.5 ? perp(pl, dir, [0, 1, 0]) : null;   // the way the knee points, even when straight
      s.thDir = norm(lerp(s.thDir, norm(sub(k, s.hip)), fw));
      s.kne = mad(s.hip, s.thDir, SEG.th);
      s.shDir = norm(lerp(s.shDir, norm(sub(a, k)), fw));
      s.ank = mad(s.kne, s.shDir, SEG.sh);
    }

    /* Hands follow the forearm unless the pose turns them (hd); feet
       point along ft, toed out by tab. */
    const hd = g('hd');
    s.handDir = g('hdv') ? norm(g('hdv')) : hd == null ? s.faDir
      : add(mul(sag(hd), Math.cos((g('fab') ?? g('uab') ?? 0) * D)), mul(L, s.side * Math.sin((g('fab') ?? g('uab') ?? 0) * D)));
    s.footDir = g('ftv') ? norm(g('ftv')) : (() => {
      const ab = g('tab') ?? 6;
      return norm(add(mul(sag(g('ft') ?? 0), Math.cos(ab * D)), mul(L, s.side * Math.sin(ab * D))));
    })();
    s.grip = mad(s.wri, s.handDir, 3.6);
    s.handEnd = mad(s.wri, s.handDir, SEG.hand);
    s.toe = mad(s.ank, s.footDir, SEG.toe);
    s.heel = mad(s.ank, s.footDir, -SEG.heel);

    /* Segment frames for the meshes and the muscles on them: `front` is
       the biceps / quads side. A bent elbow sets it (the inside of the
       bend); a straight one falls back to the sagittal front. */
    const bendFront = (a, b, fallback, flipSign) => {
      /* Blend from the sagittal front to the bend's inside as the joint
         bends, so the frame never flips at a threshold. */
      const k = Math.min(1, Math.max(0, (len(cross(a, b)) - 0.04) / 0.2));
      const fb = perp(fallback, a);
      if (k <= 0) return fb;
      const bf = mul(perp(b, a), flipSign);
      const m = add(mul(fb, 1 - k), mul(bf, k));
      return len(m) > 1e-3 ? norm(m) : bf;
    };
    const sagFront = d => sag(Math.atan2(dot(d, U), dot(d, F)) / D + 90);
    /* Keep the ankle inside what an ankle can do, whatever the pose or a
       planted foot asks: the foot's angle from the shin, toward the shin's
       front (the side the knee bends away from), between fully pointed
       (0°) and pulled up (130°; 90° is a right angle). Its toe-out stays. */
    {
      const flexK = -dot(s.shDir, perp(sagFront(s.thDir), s.thDir));
      const kf = Math.min(1, Math.max(0, (flexK - 0.04) / 0.12));
      const bent = perp(s.thDir, s.shDir, F), straight = perp(sagFront(s.shDir), s.shDir, F);
      const fr = perp(add(mul(straight, 1 - kf), mul(bent, kf)), s.shDir, bent);
      const side = cross(s.shDir, fr), out = dot(s.footDir, side);
      const inPlane = sub(s.footDir, mul(side, out));
      const a = Math.atan2(dot(inPlane, fr), dot(inPlane, s.shDir)) / D;
      const c = Math.min(130, Math.max(0, a));
      const r = len(inPlane);
      const dirAt = c2 => norm(add(add(mul(s.shDir, r * Math.cos(c2 * D)), mul(fr, r * Math.sin(c2 * D))), mul(side, out)));
      if (Math.abs(c - a) > 0.01) {
        s.footDir = dirAt(c);
        s.toe = mad(s.ank, s.footDir, SEG.toe);
        s.heel = mad(s.ank, s.footDir, -SEG.heel);
      }
    }
    /* A limb reaching a planted mark falls back to its IK pole rather
       than the sagittal front as it straightens: a push-up's elbows lock
       out within a frame, and switching fronts there twisted the arm. */
    s.uaFront = bendFront(s.uaDir, s.faDir, s.armIn || sagFront(s.uaDir), 1);
    s.faFront = perp(s.uaFront, s.faDir);
    s.thFront = bendFront(s.thDir, s.shDir, s.legOut || sagFront(s.thDir), -1);
    s.shFront = perp(s.thFront, s.shDir);
  }

  J.head = headOf(J, p);
  return J;
}

function toeOf(s, p, far, F, U, L, sag) {
  const g = key => (far && p['f' + key] != null ? p['f' + key] : p[key]);
  const ab = g('tab') ?? 6;
  const d = norm(add(mul(sag(g('ft') ?? 0), Math.cos(ab * D)), mul(L, s.side * Math.sin(ab * D))));
  return mad(s.ank, d, SEG.toe);
}

function headOf(J, p) {
  const top = J.spine(1);
  const nb = add(J.spine(0.95).p, mul(J.spine(0.95).N, 0.6));
  const tilt = p.tilt || 0;
  const dir = norm(add(mul(top.T, Math.cos(tilt * D)), mul(top.N, -Math.sin(tilt * D))));
  const face = perp(top.N, dir);
  const centre = add(mad(nb, dir, BODY.neck), mul(face, 1.2));
  return { nb, dir, face, centre, side: cross(dir, face) };
}

/* The far hand and foot follow the near ones unless a pose says otherwise:
   the same point, mirrored to the far side. timeline.js runs this on
   every pose before lining the keys up. */
export function normalize(p) {
  const mirror = t => (t.length > 2 ? [t[0], t[1], -t[2]] : t.slice());
  if (p.fhand === undefined && Array.isArray(p.hand)) p.fhand = mirror(p.hand);
  if (p.ffoot === undefined && Array.isArray(p.foot)) p.ffoot = mirror(p.foot);
  return p;
}

/* ══ KIT IN THE HANDS ══ */

/* Where each held thing sits and which way it points: an object per
   item, { kind, pos, axis, up? }. */
export function holds(J, m) {
  const h = m.hold || {}, out = [];
  const { n, f } = J;
  const mid = (a, b) => lerp(a, b, 0.5);
  const sideAxis = s => perp(cross(s.faDir, J.L), s.handDir, J.U);
  const one = (spec, s) => {
    switch (spec) {
      case 'db': return { kind: 'db', pos: s.grip, axis: J.L, up: s.handDir };
      case 'db-side': return { kind: 'db', pos: s.grip, axis: sideAxis(s), up: s.handDir };
      case 'db-fwd': return { kind: 'db', pos: s.grip, axis: J.F, up: s.handDir };
      default: return null;
    }
  };
  for (const [spec, s] of [[h.n, n], [h.f, f]]) {
    const o = spec && one(spec, s);
    if (o) { o.side = s.side > 0 ? 'n' : 'f'; out.push(o); }
  }
  const both = h.n;
  if (both === 'db-axial') {
    const g = mid(n.wri, f.wri), d = norm(lerp(n.faDir, f.faDir, 0.5));
    out.push({ kind: 'db', pos: mad(g, d, 8.8), axis: d, up: J.L });
  }
  if (both === 'db-both') out.push({ kind: 'db', pos: mid(n.grip, f.grip), axis: J.L, up: norm(lerp(n.handDir, f.handDir, 0.5)) });
  if (both === 'db-goblet') out.push({ kind: 'db', pos: add(mid(n.grip, f.grip), [0, -7, 0]), axis: J.U, up: J.F });
  if (both === 'db-feet') {
    const a = mid(n.ank, f.ank), t = mid(n.toe, f.toe), d = norm(lerp(n.shDir, f.shDir, 0.5));
    out.push({ kind: 'db', pos: mad(mid(a, t), d, 5), axis: perp(cross(d, J.L), d, J.F), up: d });
  }
  if (both === 'bb') out.push({ kind: 'bb', pos: mid(n.grip, f.grip), axis: J.L });
  if (both === 'wheel') out.push({ kind: 'wheel', pos: add(mid(n.wri, f.wri), [0, -2, 0]), axis: J.L });
  const S0 = J.spine(0), S9 = J.spine(0.9);
  if (both === 'bb-rack') out.push({ kind: 'bb', pos: add(add(S9.p, mul(S9.N, 9.5)), mul(S9.T, 2)), axis: J.L });
  if (h.hip === 'bb-hip') out.push({ kind: 'bb', pos: add(add(S0.p, mul(S0.N, 14)), mul(S0.T, 3)), axis: J.L });
  if (h.hip === 'db-hip') out.push({ kind: 'db', pos: add(add(S0.p, mul(S0.N, 12.5)), mul(S0.T, 3)), axis: J.L, up: S0.N });
  if (h.pack) {
    const s = J.spine(0.68);
    out.push({ kind: 'pack', pos: add(s.p, mul(s.N, -19)), axis: s.T, up: mul(s.N, -1) });
  }
  return out;
}

/* Every point the body and its kit reach, for framing and for checks. */
export function points(J, items) {
  const pts = [J.head.centre, mad(J.head.centre, J.head.dir, BODY.headR)];
  for (const s of [J.n, J.f]) pts.push(s.sho, s.elb, s.wri, s.handEnd, s.hip, s.kne, s.ank, s.toe, s.heel);
  for (const t of [0, 0.5, 1]) pts.push(J.spine(t).p);
  for (const it of items) pts.push(it.pos);
  return pts;
}
