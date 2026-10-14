/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE ANIMATED REP IN THE EXERCISE LAB

   The lab's side of the exercise animations. Each exercise in moves.js is
   a loop of poses with a tempo; timeline.js turns that into a pose for
   any moment, rig.js into a body in 3D, and stage.js draws it with
   three.js. This file builds the figure the lab shows — the 3D view, the
   tempo bar under it, the pause button — and starts and stops it.

   stage.js (and three.js with it) is imported the first time a lab
   opens, so nothing 3D loads until someone looks at an exercise. With
   reduced motion on, the view holds the frame named `still` and can
   still be turned by hand.

   checkMotion() and motionNotes() are for tools/howto/check.mjs: they
   build every frame of a rep without drawing anything.
   ═══════════════════════════════════════════════════════════ */

import { MOTION } from './moves.js?v=3d-oct14';
import { timeline } from './timeline.js?v=3d-oct14';
import { skeleton, holds, points, normalize, W, v3 } from './rig.js?v=3d-oct14';
export { MOTION };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function animHTML(name) {
  const m = MOTION[name];
  if (!m) return '';
  const segs = m.tempo.map(([, s, label]) =>
    `<span class="rp-seg" style="flex:${Math.max(s, 1.1)}"><i></i><b>${esc(label)}</b><em>${s}s</em></span>`).join('');
  return `<figure class="mm-anim">
    <div class="rp-stage" role="img" aria-label="${esc(m.label || `${name}, one rep in 3D`)}"></div>
    <span class="rp-hint" aria-hidden="true">Drag to turn</span>
    <button type="button" class="rp-pp" aria-label="Pause animation" aria-pressed="false"></button>
    <figcaption class="rp-bar">${segs}</figcaption>
  </figure>`;
}

/* Starts the rep in a figure animHTML() built; returns the stop. */
export function playAnim(fig, name) {
  const m = MOTION[name];
  if (!fig || !m) return () => {};
  const segs = [...fig.querySelectorAll('.rp-seg')];
  const pp = fig.querySelector('.rp-pp');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = (i, k) => segs.forEach((el, j) => {
    el.classList.toggle('on', j === i);
    el.firstChild.style.width = `${j < i ? 100 : j === i ? k * 100 : 0}%`;
  });
  let handle = null, stopped = false, paused = false;
  if (still) { fig.classList.add('still'); pp.hidden = true; }
  pp.addEventListener('click', () => {
    paused = !paused;
    fig.classList.toggle('paused', paused);
    pp.setAttribute('aria-pressed', String(paused));
    pp.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
    handle?.pause(paused);
  });
  bar(0, 0);
  import('./stage.js?v=3d-oct14')
    .then(S => { if (!stopped) handle = S.mount(fig.querySelector('.rp-stage'), name, { still, onStep: bar }); })
    .catch(() => { fig.classList.add('no3d'); });
  return () => { stopped = true; handle?.stop(); };
}

/* ── checks for tools/howto/check.mjs ── */

const TL = new Map();
const tlOf = m => (TL.has(m) ? TL.get(m) : TL.set(m, timeline(m, normalize)).get(m));

/* Builds every frame once. A pose the tempo names but nobody wrote, or a
   frame with NaN in it, is caught here rather than in the lab. Returns
   an error string, or '' when sound. */
export function checkMotion(m) {
  if (!Array.isArray(m.tempo) || !m.tempo.length) return 'has no tempo';
  for (const [n] of m.tempo) if (!m.poses[n]) return `tempo names a pose that does not exist: "${n}"`;
  if (m.still && !m.poses[m.still]) return `still frame "${m.still}" is not a pose`;
  if (m.peak && !m.poses[m.peak]) return `peak "${m.peak}" is not a pose`;
  try {
    const tl = tlOf(m);
    for (let i = 0; i <= 48; i++) {
      const J = skeleton(tl.at((i / 48) * tl.total));
      if (points(J, holds(J, m)).some(q => q.some(Number.isNaN))) return 'builds a frame with NaN in it';
    }
  } catch (e) { return `throws: ${e.message}`; }
  return '';
}

/* What a careful eye would notice, frame by frame: a joint below the
   floor, a planted hand or foot that misses its mark, or a body part
   that jumps between frames. Returns short notes, worst first. */
export function motionNotes(m) {
  const tl = tlOf(m), notes = [];
  let prev = null;
  /* 120 frames a second: fine enough that a fast move shows as a small
     step and only a real discontinuity as a big one. */
  for (let f = 0; f <= tl.total * 120; f++) {
    const t = f / 120, p = tl.at(t), J = skeleton(p);
    const { i, u } = tl.step(t);
    const when = `${m.tempo[i][2]} ${Math.round(u * 100)}%`;
    const pts = points(J, []);
    const low = Math.min(...pts.map(q => q[1]));
    if (low < -2.5) notes.push([-low, `${when}: a joint ${(-low).toFixed(1)} below the floor`]);
    for (const [key, s, joint] of [['hand', J.n, 'wri'], ['fhand', J.f, 'wri'], ['foot', J.n, 'ank'], ['ffoot', J.f, 'ank']]) {
      if (!Array.isArray(p[key]) || (p[key + 'W'] ?? 1) < 0.99) continue;
      const goal = W(p[key], s.side * (key.includes('hand') ? Math.abs(s.sho[2] - J.H[2]) : 8.5));
      const miss = v3.len(v3.sub(goal, s[joint]));
      if (miss > 3) notes.push([miss, `${when}: ${key} misses its mark by ${miss.toFixed(1)}`]);
    }
    if (prev) {
      const jump = Math.max(...pts.map((q, k) => v3.len(v3.sub(q, prev[k]))));
      if (jump > 4.5) notes.push([jump * 3, `${when}: something jumps ${jump.toFixed(1)} between frames`]);
    }
    prev = pts;
  }
  notes.sort((a, b) => b[0] - a[0]);
  const seen = new Set();
  return notes.filter(([, s]) => { const k = s.replace(/\d+%|[\d.]+/g, ''); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 3).map(([, s]) => s);
}
