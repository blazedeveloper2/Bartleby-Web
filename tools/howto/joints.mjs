// Names joints in the animations that bend past what a body can do:
// knees and elbows bending the wrong way, hips bent back past ~45° or
// folded past ~150°. Run it on any exercise you add or change:
//
//   node tools/howto/joints.mjs                   every exercise
//   node tools/howto/joints.mjs "Pull-Ups" planche  names containing these
//
// It reads the rig alone (no 3D body), so it is instant. Knees and elbows
// are judged only while the limb is in the body's front-to-back plane:
// out of it, the upper arm or thigh can roll to make a bend look right.
// A flag is a prompt to look in the gallery, not a verdict: a few are
// fine as they are (a frog stand folds the hips that far; a handstand
// push-up's elbows read backward for a moment while they flare out).
process.removeAllListeners('warning');
const R = await import('../../apps/workout/rig.js');
const { timeline } = await import('../../apps/workout/timeline.js');
const { MOTION } = await import('../../apps/workout/moves.js');

const { dot, sub, mul, norm } = R.v3;
const DEG = 180 / Math.PI;
const LIMIT = { bendWrong: 30, hipBack: -45, hipFold: 150 };
const ang = (v, a, b) => Math.atan2(dot(v, b), dot(v, a)) * DEG;
const wrap = a => ((a % 360) + 540) % 360 - 180;
const want = process.argv.slice(2).map(s => s.toLowerCase());

const out = [];
for (const [name, m] of Object.entries(MOTION)) {
  if (want.length && !want.some(w => name.toLowerCase().includes(w))) continue;
  const tl = timeline(m, R.normalize), worst = {};
  const note = (k, v, t) => { if (!worst[k] || Math.abs(v) > Math.abs(worst[k][0])) worst[k] = [Math.round(v), +t.toFixed(2)]; };
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * tl.total, J = R.skeleton(tl.at(t));
    const S0 = J.spine(0), T0 = S0.T, N0 = S0.N, L = J.L;
    for (const s of [J.n, J.f]) {
      const side = s.side > 0 ? 'near' : 'far';
      /* hip: + folded forward of the straight-leg line, − bent back behind it */
      const th = norm(sub(s.thDir, mul(L, dot(s.thDir, L))));
      const hip = Math.atan2(dot(th, N0), -dot(th, T0)) * DEG;
      if (hip < LIMIT.hipBack) note(`${side} hip bent back`, hip, t);
      if (hip > LIMIT.hipFold) note(`${side} hip folded`, hip, t);
      /* in the body's plane a shin turns toward the back of the thigh, a
         forearm toward the front of the upper arm */
      if (Math.abs(dot(s.thDir, L)) < 0.5 && Math.abs(dot(s.shDir, L)) < 0.5) {
        const k = wrap(ang(s.thDir, T0, N0) - ang(s.shDir, T0, N0));
        if (k > LIMIT.bendWrong) note(`${side} knee bends the wrong way`, k, t);
      }
      if (Math.abs(dot(s.uaDir, L)) < 0.5 && Math.abs(dot(s.faDir, L)) < 0.5) {
        const e = wrap(ang(s.faDir, T0, N0) - ang(s.uaDir, T0, N0));
        if (e > LIMIT.bendWrong) note(`${side} elbow bends the wrong way`, e, t);
      }
    }
  }
  const w = Object.entries(worst);
  if (w.length) out.push(`${name}\n` + w.map(([k, [v, t]]) => `  ${k}: ${v}° at ${t}s`).join('\n'));
}
console.log(out.join('\n') || 'no joint past its range');
