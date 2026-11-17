/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE PROGRESS CHART IN THE EXERCISE LAB

   Kept deliberately plain: one line, one point per session, each point
   your best set that day with its number on it, and one figure in the
   corner for how far it has moved since the first session.

   AT ONE WEIGHT. Reps at 50 lbs and reps at 55 are different lifts, and
   the first session at a heavier weight always comes in lower, which on
   one line would read as getting weaker at the moment you got stronger.
   So a new weight starts the chart over — once you have done a set at
   it. Until then the old line stays, with one line of text saying so.

   The history itself is bp_rephist (rank.js, REP HISTORY). This file only
   draws it, and touches nothing.
   ═══════════════════════════════════════════════════════════ */

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day = ds => new Date(ds + 'T00:00:00');
const fmtD = ds => { const d = day(ds); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* The sessions since the weight last changed. Bodyweight work never resets.

   `soft` is a loaded lift whose weight was not always saved (the '4×F'
   lifts with nothing to score — see mmTrack in index.js). A session with
   no weight on record is one whose weight is unknown, not one at zero: it
   joins the run it falls in rather than breaking it, and the run's weight
   is the first one that is known. So the old sessions draw the line they
   always drew, and once weights are saved a change starts it over. */
function currentRun(hist, loaded, soft) {
  let run = [];
  for (const e of hist) {
    const sets = e.s.filter(n => n > 0);
    const p = { d: e.d, w: loaded ? (soft ? e.w ?? null : e.w ?? 0) : null, best: Math.max(...sets) };
    const rw = soft ? runW(run) : run.length ? run[0].w : null;
    if (run.length && !(soft && (p.w === null || rw === null)) && rw !== p.w) run = [];
    run.push(p);
  }
  return run;
}
const runW = run => { const k = run.find(p => p.w !== null); return k ? k.w : null; };

/* `opts`:
     hist   exHistory() — every counted session, oldest first
     wv     the weight set now (undefined when the lift has none)
     soft   sessions may have no weight on record (currentRun)
     loaded whether the movement carries a weight at all
     unit   'r' reps, 's' seconds
     W      weight formatter, e.g. 50 → '50 lbs'
     width  the chart's width in px */
export function progressHTML({ hist, wv, loaded, soft = false, unit, W, width }) {
  if (unit === '-') return '';
  const u = unit === 's' ? 's' : '';
  const noun = unit === 's' ? 'seconds' : 'reps';

  if (!hist.length) return `<div class="xp"><div class="xp-head"><div class="xp-t">Progress</div></div>
    <p class="xp-msg">No sessions logged yet.</p></div>`;

  const pts = currentRun(hist, loaded, soft);
  const w = soft ? runW(pts) : pts[0].w;
  /* an unknown weight is not a different one, and has no label to show */
  const pending = loaded && wv !== undefined && (soft ? w !== null && wv !== w : (wv ?? 0) !== w);
  const showW = loaded && !(soft && w === null);
  const delta = pts[pts.length - 1].best - pts[0].best;
  const chip = pts.length < 2 ? ''
    : `<div class="xp-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)} ${noun}</div>`;

  return `<div class="xp${pending ? ' pending' : ''}">
    <div class="xp-head"><div class="xp-t">Progress${showW ? `<span>${esc(W(w))}</span>` : ''}</div>${chip}</div>
    ${pending ? `<p class="xp-msg">Starts over at ${esc(W(wv))} after your first set.</p>` : ''}
    ${pts.length < 2
      /* One session is a dot, not a line, and a chart's worth of card for
         one dot told you nothing its number does not. */
      ? `<p class="xp-msg">One session so far, best set <b>${pts[0].best}${u}</b> on ${fmtD(pts[0].d)}.</p>`
      : chart(pts, u, width)}
  </div>`;
}

function chart(pts, u, width) {
  const Wd = Math.max(240, Math.round(width)), H = 120;
  const L = 14, R = 14, T = 24, B = 22;
  const iw = Wd - L - R, ih = H - T - B;

  const vals = pts.map(p => p.best);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
  const y = v => T + ih - (v - lo) / (hi - lo) * ih;

  const t0 = day(pts[0].d).getTime(), t1 = day(pts[pts.length - 1].d).getTime();
  const x = ds => t1 === t0 ? L + iw / 2 : L + (day(ds).getTime() - t0) / (t1 - t0) * iw;

  const P = pts.map(p => [x(p.d), y(p.best)]);
  const line = P.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');

  /* numbers on every point when they fit, else just the latest */
  const room = pts.length === 1 || iw / (pts.length - 1) > 24;
  const dots = pts.map((p, i) => {
    const [cx, cy] = P[i], now = i === pts.length - 1;
    return `<g class="xp-pt${now ? ' now' : ''}"><title>${fmtD(p.d)}, ${p.best}${u}</title>
      <circle cx="${cx}" cy="${cy}" r="${now ? 5 : 3.5}"/>
      ${room || now ? `<text x="${cx}" y="${cy - 10}">${p.best}</text>` : ''}</g>`;
  }).join('');

  /* first and latest date only */
  const first = pts[0], last = pts[pts.length - 1];
  const dates = pts.length < 2
    ? `<text class="xp-x" x="${x(first.d)}" y="${H - 4}" text-anchor="middle">${fmtD(first.d)}</text>`
    : `<text class="xp-x" x="${L}" y="${H - 4}" text-anchor="start">${fmtD(first.d)}</text>
       <text class="xp-x" x="${L + iw}" y="${H - 4}" text-anchor="end">${fmtD(last.d)}</text>`;

  return `<svg class="xp-svg" viewBox="0 0 ${Wd} ${H}" width="100%" role="img"
      aria-label="${esc(`Best set each session: ${pts.map(p => `${fmtD(p.d)} ${p.best}${u}`).join(', ')}`)}">
    ${P.length > 1 ? `<path class="xp-line" d="${line}"/>` : ''}${dots}${dates}
  </svg>`;
}
