/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE PROGRESS CHART IN THE EXERCISE LAB

   One point per session: the best set, joined up, with the session's
   other sets as faint dots under it and the movement's target range as a
   band behind. Read left to right it answers the only question that
   matters between sessions — am I doing more than last time?

   AT ONE WEIGHT. Reps at 50 lbs and reps at 55 are different lifts, and
   the first session at a new weight always comes in lower, which on a
   single line reads as getting weaker at the exact moment you got
   stronger. So the chart is a run at one weight, and a new weight starts
   a new run — once you have done a set at it. Typing a heavier number is
   a plan; the run only moves over when the sets are on the board, and
   until then the old run stays up, greyed, with a line saying why.
   Earlier runs are kept underneath as one line each: where the reps
   started at that weight, where they got to, and how long it took.

   The history itself is bp_rephist (rank.js, REP HISTORY). This file only
   draws it, and touches nothing.
   ═══════════════════════════════════════════════════════════ */

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day = ds => new Date(ds + 'T00:00:00');
const fmtD = ds => { const d = day(ds); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* Split the sessions into runs at one weight. Bodyweight work is one run. */
function runsOf(hist, loaded) {
  const runs = [];
  for (const e of hist) {
    const sets = e.s.filter(n => n > 0);
    const p = { d: e.d, w: loaded ? (e.w ?? 0) : null, sets, best: Math.max(...sets) };
    const last = runs[runs.length - 1];
    if (last && last.w === p.w) last.pts.push(p);
    else runs.push({ w: p.w, pts: [p] });
  }
  return runs;
}

/* A step that gives three or four gridlines over the span. */
function niceStep(span) {
  for (const s of [1, 2, 5, 10, 15, 20, 30, 60, 120]) if (span / s <= 4) return s;
  return 300;
}

/* `opts`:
     hist   exHistory() — every counted session, oldest first
     wv     the weight set now (undefined when the lift has none)
     loaded whether the movement carries a weight at all
     unit   'r' reps, 's' seconds
     rng    [lo, hi] target, or null
     per    true on a one-side-at-a-time movement
     W      weight formatter, e.g. 50 → '50 lbs'
     width  the chart's width in px */
export function progressHTML({ hist, wv, loaded, unit, rng, per, W, width }) {
  if (unit === '-') return '';
  const secs = unit === 's';
  const noun = secs ? 'seconds' : 'reps';
  const u = secs ? 's' : '';
  const side = per ? ' per side' : '';

  if (!hist.length) {
    return `<div class="pg pg-empty">
      <div class="pg-t">Progress</div>
      <div class="pg-ghost" aria-hidden="true">${ghost()}</div>
      <p>Log your ${noun} above and each session lands here as a point, so you can see week by week whether you're doing more than last time.</p>
    </div>`;
  }

  const runs = runsOf(hist, loaded);
  const run = runs[runs.length - 1];
  const earlier = runs.slice(0, -1).reverse();
  /* a new weight set but not lifted yet: the old run stays up, greyed */
  const pending = loaded && wv !== undefined && (wv ?? 0) !== run.w;
  const at = loaded ? ` at ${W(run.w)}` : '';

  const pts = run.pts, first = pts[0], last = pts[pts.length - 1];
  const delta = last.best - first.best;
  const top = Math.max(...pts.map(p => p.best));
  const chip = pts.length < 2
    ? `<div class="pg-delta first"><b>1st</b><small>session${at}</small></div>`
    : `<div class="pg-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'even'}">
        <b>${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)}${u}</b><small>since ${fmtD(first.d)}</small></div>`;

  const note = pending
    ? `<div class="pg-note"><b>New weight · ${esc(W(wv))}</b> The chart starts fresh with your first set at it — fewer ${noun} at a heavier weight is progress, not a step back. Below is your run${at}.</div>`
    : '';

  const stats = `<div class="pg-stats">
      <div><span>Sessions</span><b>${pts.length}</b></div>
      <div><span>Top set</span><b>${top}${u}</b></div>
      <div><span>Last time</span><b>${last.sets.join('<i>·</i>')}</b></div>
    </div>`;

  const prev = earlier.length ? `<div class="pg-runs"><div class="pg-runs-h">Earlier weights</div>
    ${earlier.slice(0, 4).map(r => {
      const a = r.pts[0], b = r.pts[r.pts.length - 1], hi = Math.max(...r.pts.map(p => p.best));
      return `<div class="pg-run"><b>${esc(W(r.w))}</b><span class="pg-run-r">${a.best}${u} → ${hi}${u}</span><span class="pg-run-d">${r.pts.length} session${r.pts.length === 1 ? '' : 's'} · ${fmtD(a.d)}${b.d !== a.d ? ` – ${fmtD(b.d)}` : ''}</span></div>`;
    }).join('')}</div>` : '';

  return `<div class="pg${pending ? ' pending' : ''}">
    <div class="pg-head">
      <div class="pg-t">Progress<span>Best set each session${esc(at)} · ${noun}${side}</span></div>
      ${chip}
    </div>
    ${note}
    ${chart(pts, { rng, u, width, at })}
    <div class="pg-key" aria-hidden="true"><span><i class="k-best"></i>Best set</span><span><i class="k-set"></i>Other sets</span>${rng ? `<span><i class="k-band"></i>Target ${rng[0]}–${rng[1]}${u}</span>` : ''}</div>
    ${stats}
    ${prev}
  </div>`;
}

/* ── the chart ── */
function chart(pts, { rng, u, width, at }) {
  const Wd = Math.max(240, Math.round(width)), H = 176;
  const L = 30, R = 16, T = 22, B = 26;
  const iw = Wd - L - R, ih = H - T - B;

  const all = pts.flatMap(p => p.sets);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (rng) { lo = Math.min(lo, rng[0]); hi = Math.max(hi, rng[1]); }
  const step = niceStep(Math.max(hi - lo, 4) + 2);
  lo = Math.max(0, Math.floor((lo - 1) / step) * step);
  hi = Math.ceil((hi + 1) / step) * step;
  const y = v => T + ih - (v - lo) / (hi - lo) * ih;

  const t0 = day(pts[0].d).getTime(), t1 = day(pts[pts.length - 1].d).getTime();
  const x = ds => pts.length === 1 || t1 === t0 ? L + iw / 2 : L + (day(ds).getTime() - t0) / (t1 - t0) * iw;

  const grid = [];
  for (let v = lo; v <= hi + 1e-9; v += step)
    grid.push(`<line class="pg-grid" x1="${L}" x2="${L + iw}" y1="${y(v)}" y2="${y(v)}"/><text class="pg-yl" x="${L - 8}" y="${y(v) + 3.5}">${v}</text>`);

  const band = rng ? (() => {
    const a = y(rng[1]), b = y(rng[0]);
    return `<rect class="pg-band" x="${L}" y="${a}" width="${iw}" height="${Math.max(1, b - a)}"/>
      <line class="pg-band-e" x1="${L}" x2="${L + iw}" y1="${a}" y2="${a}"/><line class="pg-band-e" x1="${L}" x2="${L + iw}" y1="${b}" y2="${b}"/>`;
  })() : '';

  const P = pts.map(p => [x(p.d), y(p.best)]);
  const line = P.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
  const area = P.length > 1 ? `${line}L${P[P.length - 1][0].toFixed(1)},${T + ih}L${P[0][0].toFixed(1)},${T + ih}Z` : '';

  /* the other sets of each session, under its best */
  const rest = pts.map(p => {
    const left = [...p.sets]; left.splice(left.indexOf(p.best), 1);
    return left.map(v => `<circle class="pg-set" cx="${x(p.d)}" cy="${y(v)}" r="2.6"/>`).join('');
  }).join('');

  /* labels on every best when there is room, else the top and the latest */
  const room = iw / Math.max(1, pts.length - 1) > 26 || pts.length === 1;
  const topV = Math.max(...pts.map(p => p.best));
  const dots = pts.map((p, i) => {
    const [cx, cy] = P[i], lastPt = i === pts.length - 1;
    const tip = `${fmtD(p.d)}${at} · ${p.sets.join(', ')}${u} · best ${p.best}${u}`;
    const label = room || lastPt || p.best === topV
      ? `<text class="pg-v${lastPt ? ' now' : ''}" x="${cx}" y="${cy - (lastPt ? 12 : 9)}">${p.best}</text>` : '';
    return `<g class="pg-pt${lastPt ? ' now' : ''}"><title>${esc(tip)}</title>
      ${lastPt ? `<circle class="pg-halo" cx="${cx}" cy="${cy}" r="11"/>` : ''}
      <circle class="pg-dot" cx="${cx}" cy="${cy}" r="${lastPt ? 5.5 : 4.2}"/>${label}
      <circle cx="${cx}" cy="${cy}" r="14" fill="transparent"/></g>`;
  }).join('');

  /* Dates: all of them when they fit, else spaced out so none overlap.
     The latest session is the one you look for, so it always shows. */
  const GAP = 58, endX = x(pts[pts.length - 1].d);
  let prevX = -Infinity;
  const xl = pts.map((p, i) => {
    const cx = x(p.d), end = i === pts.length - 1;
    if (!end && (cx - prevX < GAP || endX - cx < GAP)) return '';
    prevX = cx;
    const anchor = pts.length < 2 ? 'middle' : i === 0 ? 'start' : end ? 'end' : 'middle';
    return `<text class="pg-xl" x="${cx}" y="${H - 6}" text-anchor="${anchor}">${fmtD(p.d)}</text>`;
  }).join('');

  return `<svg class="pg-svg" viewBox="0 0 ${Wd} ${H}" width="100%" role="img"
      aria-label="${esc(`Best set each session${at}: ${pts.map(p => `${fmtD(p.d)} ${p.best}${u}`).join(', ')}`)}">
    <defs><linearGradient id="pg-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" style="stop-color:var(--blue);stop-opacity:.32"/><stop offset="1" style="stop-color:var(--blue);stop-opacity:0"/>
    </linearGradient></defs>
    ${band}${grid.join('')}
    ${area ? `<path class="pg-area" d="${area}"/>` : ''}
    ${P.length > 1 ? `<path class="pg-line" d="${line}" pathLength="1"/>` : ''}
    ${rest}${dots}${xl}
  </svg>`;
}

/* A faint rising line for the empty state, so it reads as a chart to come. */
function ghost() {
  return `<svg viewBox="0 0 200 54" width="100%" height="54"><path d="M4,46 L40,40 L76,42 L112,30 L148,24 L196,10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 5"/>
    ${[[4,46],[40,40],[76,42],[112,30],[148,24],[196,10]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3" fill="currentColor"/>`).join('')}</svg>`;
}
