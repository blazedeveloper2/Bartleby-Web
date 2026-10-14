/* ═══════════════════════════════════════════════════════════
   WORKOUT — EXERCISE ANIMATION TIMELINE

   Turns an exercise's tempo — a loop of poses with a duration each, as
   moves.js writes them — into a pose for any moment of the rep. Pure
   arithmetic, no drawing, so the 3D renderer, the gallery and the
   checker all read the same motion.

   Three things it gets right that a straight blend between poses does not:

   - SMOOTH, NOT STOP-START. Every number moves on a monotone cubic
     (Fritsch–Butland) through the keyframes. A keyframe where the motion
     turns round or holds still gets zero speed, so a rep still eases in
     and out at the top and bottom; a keyframe the motion passes through
     — halfway up a wall walk — keeps its speed instead of stopping dead.
     Monotone means no overshoot: a limb never swings past where a pose
     puts it.
   - THE SHORT WAY ROUND. Angles take the shorter direction between two
     keyframes (276° to 30° goes +114°, not −246°), so a leg raise lifts
     the legs forward instead of spinning them backwards through the floor.
   - NOTHING SNAPS. A key one pose has and the next leaves out takes the
     default (DEFAULTS) rather than jumping when the pose changes. A
     planted hand or foot that one pose has and another lets go of
     (null, or absent) keeps its last position and fades a weight
     (handW, footW …) from 1 to 0, so the limb drifts off its target
     instead of jumping to wherever the free pose puts it.

   `effort` (0.45–1) rises toward the pose named `peak` — the contracted
   position — so the renderer can make the working muscle tighten and glow
   in time with the rep.
   ═══════════════════════════════════════════════════════════ */

/* Keys whose values are angles in degrees. */
const ANGLE = /^(f|a|b)?(torso|tilt|ua|fa|hd|th|sh|ft|twist|uab|fab|lab|sab|tab|toe)$/;
/* Keys that plant a hand or foot: an [x, y(, z)] target, or null/absent. */
const TARGET = /^(f|a|b)?(hand|foot)$/;
/* What a key means when a pose leaves it out. */
export const DEFAULTS = {
  flex: 0, tilt: 0, twist: 0, lean: 0, shrug: 0,
  ul: 1, ll: 1, al: 1, bl: 1, all: 1, bll: 1, ful: 1, fll: 1,
  uab: 0, fab: 0, lab: 0, sab: 0, ffab: 0, fuab: 0, flab: 0, fsab: 0,
};

const wrap = d => ((d + 180) % 360 + 360) % 360 - 180;

/* Fritsch–Butland tangent at a keyframe from the slopes either side:
   zero at a turning point or a hold, their harmonic mean otherwise. */
const tangent = (a, b) => (a * b <= 0 ? 0 : (2 * a * b) / (a + b));

const hermite = (p0, p1, m0, m1, u) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
};

/* m: an exercise from moves.js. normalize(pose) lets a renderer fill in
   what a pose implies but does not say (a far hand that follows the near
   one) before the keys are lined up. */
export function timeline(m, normalize = p => p) {
  const names = m.tempo.map(([n]) => n);
  const durs = m.tempo.map(([, s]) => s);
  const N = names.length;
  const total = durs.reduce((a, s) => a + s, 0);
  const peak = m.peak ?? m.still;
  const poses = names.map(n => {
    const p = normalize({ ...m.base, ...m.poses[n] });
    p.effort = n === peak ? 1 : 0.45;
    return p;
  });

  const keys = new Set();
  poses.forEach(p => Object.keys(p).forEach(k => keys.add(k)));

  /* One track per key: its value at each keyframe, and how to blend it. */
  const tracks = [];
  const fixed = {};
  for (const key of keys) {
    const raw = poses.map(p => p[key]);
    if (TARGET.test(key)) {
      const on = raw.map(v => Array.isArray(v));
      if (!on.some(Boolean)) continue;
      /* Off keyframes hold the nearest planted position, earlier first. */
      const val = raw.map((v, i) => {
        if (on[i]) return v;
        for (let d = 1; d < N; d++) {
          const back = (i - d + N) % N, fwd = (i + d) % N;
          if (on[back]) return raw[back];
          if (on[fwd]) return raw[fwd];
        }
        return null;
      });
      const dim = Math.max(...val.map(v => v.length));
      for (let c = 0; c < dim; c++) tracks.push({ key, c, vals: val.map(v => v[c] ?? 0), angle: false });
      tracks.push({ key: key + 'W', vals: on.map(o => (o ? 1 : 0)), angle: false });
      continue;
    }
    const first = raw.find(v => v !== undefined && v !== null);
    if (typeof first === 'number') {
      const base = key[0] === 'f' && poses.some(p => typeof p[key.slice(1)] === 'number') ? key.slice(1) : null;
      const vals = poses.map((p, i) => {
        if (typeof raw[i] === 'number') return raw[i];
        if (base && typeof p[base] === 'number') return p[base];   // a far limb with nothing of its own follows the near one
        return DEFAULTS[key] ?? first;
      });
      tracks.push({ key, vals, angle: ANGLE.test(key) });
    } else if (Array.isArray(first)) {
      for (let c = 0; c < first.length; c++) tracks.push({ key, c, vals: raw.map(v => (Array.isArray(v) ? v[c] : first[c])), angle: false });
    } else {
      fixed[key] = raw;   // strings and flags: whatever the pose being moved toward says
    }
  }

  /* The foot turns at the ankle, so its angle moves relative to the shin:
     ft is carried as (ft − sh), kept inside what an ankle can do (from
     toes fully pointed, 0, to pulled up, 130; 90 is a right angle; the
     top end stands in for the toes bending, which the foot has no joint for), and
     added back to the shin at each frame. Moving the absolute angle the
     short way round could swing the toes up over the top of the foot. */
  const ANKLE_MIN = 0, ANKLE_MAX = 130;
  const toRange = r => {
    r = ((r % 360) + 540) % 360 - 180;
    if (r >= ANKLE_MIN && r <= ANKLE_MAX) return r;
    const off = b => Math.abs(((r - b) % 360 + 540) % 360 - 180);
    return off(ANKLE_MIN) <= off(ANKLE_MAX) ? ANKLE_MIN : ANKLE_MAX;
  };
  for (const [ft, sh] of [['ft', 'sh'], ['fft', 'fsh']]) {
    const f = tracks.find(t => t.key === ft && t.c === undefined), b = tracks.find(t => t.key === sh && t.c === undefined);
    if (!f || !b) continue;
    f.vals = f.vals.map((x, i) => toRange(x - b.vals[i]));
    f.relTo = sh;
  }

  /* Per track: the step into each keyframe (shortest way for angles) and
     the speed at each keyframe. Segment i runs from keyframe i−1 to i. */
  for (const tr of tracks) {
    const v = tr.vals;
    tr.d = v.map((x, i) => {
      const d = x - v[(i - 1 + N) % N];
      return tr.angle ? wrap(d) : d;
    });
    const slope = tr.d.map((d, i) => d / durs[i]);
    tr.m = v.map((_, i) => tangent(slope[i], slope[(i + 1) % N]));
  }

  /* Which segment a moment falls in, and how far through it. */
  const step = t => {
    t = ((t % total) + total) % total;
    let i = 0;
    while (i < N - 1 && t > durs[i]) { t -= durs[i]; i++; }
    return { i, u: Math.min(1, t / durs[i]) };
  };

  const at = t => {
    const { i, u } = step(t);
    const prev = (i - 1 + N) % N, s = durs[i];
    const o = {};
    for (const tr of tracks) {
      const p0 = tr.vals[prev], p1 = p0 + tr.d[i];
      let v = hermite(p0, p1, tr.m[prev] * s, tr.m[i] * s, u);
      if (tr.key.endsWith('W')) v = Math.min(1, Math.max(0, v));
      if (tr.c === undefined) o[tr.key] = v;
      else (o[tr.key] ||= [])[tr.c] = v;
    }
    for (const tr of tracks) if (tr.relTo) o[tr.key] += o[tr.relTo];
    for (const [key, raw] of Object.entries(fixed)) o[key] = raw[i] ?? raw[prev];
    /* A target that has faded out entirely is no target at all. */
    for (const key of Object.keys(o)) if (TARGET.test(key) && !(o[key + 'W'] > 0.001)) o[key] = null;
    o.t = ((t % total) + total) % total;   // when in the rep (stage.js fits the body by it)
    return o;
  };

  /* The pose named `name` exactly as written, for still frames. */
  const pose = name => {
    const i = names.indexOf(name);
    if (i < 0) return null;
    const o = at(durs.slice(0, i + 1).reduce((a, s) => a + s, 0) - 1e-6);
    return o;
  };

  return { total, names, durs, step, at, pose };
}
