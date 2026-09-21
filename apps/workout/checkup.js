/* ═══════════════════════════════════════════════════════════
   CHECKUP — is this going as it should, and does anything in
   the data look wrong?

   Two different questions that happen to want the same card.

   The first is about training: a lift that has not moved in two
   months, a run of back-offs, attendance quietly halving. None
   of that announces itself — the Rank tab will happily show a
   steady C while one lift has been stuck since July.

   The second is about the numbers themselves. Every figure in
   this app is typed by hand, and a typo does not look like a
   typo once it is a point on a chart. 108 lbs instead of 180
   drags a trend line for weeks; a waist read at the wrong rib
   moves body fat four points and with it the calorie target and
   the call. Those are worth catching, and they are catchable,
   because a real body does not move that fast.

   Every threshold below is a rate a body rarely beats, not a
   round number, and the wording is careful about the difference
   between rarely and never. A check that cries wolf at ordinary
   variation is one you learn to ignore, which is worse than not
   having it — but a check that calls a real measurement
   impossible is worse still, because the one number you most
   need to keep is the surprising one that turns out to be true.

   So: these findings say "verify this", never "this is wrong".
   They account for how far apart the measurements actually are,
   they never propose editing the record for you, and where a
   large real change would matter for reasons beyond a trend
   line, they say that too.

   Nothing here writes. It reads state and returns findings.
   ═══════════════════════════════════════════════════════════ */

import { load, todayStr } from '../../assets/js/storage.js?v=niv-sep26';
import { weighed, taped, navyBF, prof } from './body.js?v=niv-sep26';

const dOf = ds => new Date(ds + 'T00:00:00');
const between = (a, b) => Math.round((dOf(b) - dOf(a)) / 86400000);
const agoOf = ds => between(ds, todayStr());
const sinceCount = (log, ds) => log.filter(s => s.d >= ds).length;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/* Same shape the rest of the tab uses. A finding that says 2026-09-07 reads
   like a log line rather than a sentence about last Tuesday. */
const fmtD = ds => dOf(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* ── thresholds, each with the reason it is where it is ── */

/* What the scale can honestly do between two weigh-ins, split into the part
   that does not depend on how far apart they are and the part that does.

   NOISE_PCT is water, glycogen and what you ate: about 2% of bodyweight is
   there on any two days, including two consecutive ones. REAL_PCT_WK is the
   fastest sustained change a body actually manages — 1%/wk, which is the
   ceiling body.js already marks as the point where a cut starts costing
   lean mass. Together they give a budget that GROWS WITH THE GAP, which is
   the whole point: eight pounds between Tuesday and Thursday is a typo,
   and eight pounds between March and May is a cut.

   This used to be a flat 5%-of-bodyweight test against the median of the
   six nearest weigh-ins, with no notion of when those weigh-ins happened.
   On a monthly logging habit that flagged an ordinary cut, and then told
   the user "bodies do not move that far overnight" about two measurements
   eight weeks apart. BW_DEV_MIN survives as an absolute floor so a very
   short gap cannot make the budget so tight that ordinary water weight
   trips it. */
const NOISE_PCT = 0.02, REAL_PCT_WK = 0.01, BW_DEV_MIN = 6;

/* Two inches of waist inside five weeks is a lot of waist, and four points
   of estimated body fat over the same stretch is a lot of body fat.

   Neither is a conversion. "An inch of waist is five to eight pounds of
   fat" is a gym rule of thumb with no published basis, and it used to be
   stated here as arithmetic; it is gone. Waist-to-fat depends on height,
   frame, where you carry it and where the tape sat, and the honest version
   of the claim is just "waists do not usually move that fast".

   The body-fat threshold is the one with something behind it: the
   circumference method reproduces to about a point even in careful hands,
   so four points is several times its own repeatability — which makes it
   far more likely the tape moved than that the body did. That is an
   argument about the measurement's precision, not a physiological ceiling
   on fat loss, and the message says it that way. */
const TAPE_WINDOW = 35, WAIST_JUMP = 2, BF_JUMP = 4;

/* Eight weeks without a working weight moving, while you have actually
   been training, is a stall rather than a plateau you are riding out.
   Six sessions is the "actually been training" part — without it this
   fires at everyone who took a holiday. */
const STALL_DAYS = 56, STALL_SESSIONS = 6;

/* No increase on ANY lift in six weeks, with a dozen sessions behind it. */
const DRY_DAYS = 42, DRY_SESSIONS = 8;

/* Backing off once is honest. Three times in two months is a weight
   selection problem, not a run of bad days. */
const BACKOFF_DAYS = 56, BACKOFF_N = 3;

const GAP_DAYS = 10;                      // silence worth naming
const WINDOW = 21;                        // attendance comparison window
const DROP_RATIO = 0.6;                   // "meaningfully fewer than before"

/* ── data sanity ── */

/* A weigh-in judged against the straight line between the weigh-ins either
   side of it, so a genuine cut is never the anomaly — a steady trend
   predicts its own next point and every point sits on it. Comparing to a
   median instead, as this did, means a trending series disagrees with its
   own middle and the honest cut gets flagged.

   The ends of the series have no line to sit on, and they are also where
   the worst typo lives: the most recent weigh-in is both the likeliest to
   be mistyped and the one dragging the trend everything else is read off.
   So they are judged, but not by carrying the slope out from the two
   nearest points — that was the first attempt and it is exactly wrong. A
   two-point slope run through a typo projects the typo: 180, 108, 180
   extrapolates to 252, and the finding then points at a perfectly good
   weigh-in and calls it 72 lbs out.

   Theil–Sen instead: the median of every pairwise slope among the
   neighbours, with the median intercept to match. A single bad point can
   move a median slope one position along the sorted list and no further,
   so the estimate survives the thing it is being used to detect. */
const ptAt = (W, j) => (W[j] ? { t: dOf(W[j].d).getTime() / 86400000, w: W[j].w } : null);

function theilSen(pts, t) {
  const slopes = [];
  for (let a = 0; a < pts.length; a++)
    for (let b = a + 1; b < pts.length; b++)
      if (pts[b].t !== pts[a].t) slopes.push((pts[b].w - pts[a].w) / (pts[b].t - pts[a].t));
  if (!slopes.length) return null;
  const med = xs => { const s = [...xs].sort((x, y) => x - y), m = s.length >> 1;
                      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const k = med(slopes);
  return med(pts.map(p => p.w - k * p.t)) + k * t;
}

/* How many neighbours an endpoint is judged against. Three is the fewest
   that gives Theil–Sen a majority to be robust with. */
const EDGE_N = 4;

function expectedAt(W, i) {
  const here = ptAt(W, i), prev = ptAt(W, i - 1), next = ptAt(W, i + 1);
  /* Bracketed: the local line between the two points either side. Most
     local, so the most sensitive to a point that does not belong. */
  if (prev && next)
    return next.t === prev.t ? (prev.w + next.w) / 2
      : prev.w + (next.w - prev.w) * (here.t - prev.t) / (next.t - prev.t);
  /* An end. Fit the neighbours on the one side available and read the
     fit at this date. */
  const side = [];
  for (let k = 1; k <= EDGE_N; k++) {
    const p = ptAt(W, prev ? i - k : i + k);
    if (p) side.push(p);
  }
  return side.length >= 3 ? theilSen(side, here.t) : null;
}

function bwOutliers(list) {
  const W = weighed(list);
  if (W.length < 4) return [];
  const cand = [];
  W.forEach((e, i) => {
    const expect = expectedAt(W, i);
    if (expect === null || !(expect > 0)) return;
    /* The tightest real constraint is the CLOSEST weigh-in. A reading two
       days after a known one cannot have moved a month's worth, however
       far away the other side of the gap happens to be. */
    const gaps = [i > 0 ? between(W[i - 1].d, e.d) : null,
                  i < W.length - 1 ? between(e.d, W[i + 1].d) : null].filter(v => v !== null);
    const gap = Math.max(1, Math.min(...gaps));
    const budget = Math.max(BW_DEV_MIN, expect * (NOISE_PCT + REAL_PCT_WK * gap / 7));
    const diff = Math.abs(e.w - expect);
    if (diff > budget) cand.push({ d: e.d, w: e.w, med: expect, diff, gap, ratio: diff / budget,
                                   dir: e.w > expect ? 'up' : 'down', i });
  });
  /* One bad number also drags the line its NEIGHBOURS are judged against,
     so a single typo can surface as three findings. The typo always misses
     by the widest margin, so an entry next to a worse one is dropped —
     which leaves the finding pointing at the number to actually fix. */
  return cand.filter(c => !cand.some(o => Math.abs(o.i - c.i) === 1 && o.ratio > c.ratio));
}

function tapeJumps(list, h) {
  const T = taped(list), out = [];
  for (let i = 1; i < T.length; i++) {
    const gap = between(T[i - 1].d, T[i].d);
    if (gap <= 0 || gap > TAPE_WINDOW) continue;
    const dWa = Math.abs(T[i].wa - T[i - 1].wa);
    if (dWa > WAIST_JUMP) out.push({ kind: 'waist', d: T[i].d, delta: dWa, gap });
    const a = navyBF(T[i - 1].wa, T[i - 1].nk, h), b = navyBF(T[i].wa, T[i].nk, h);
    if (a !== null && b !== null && Math.abs(b - a) > BF_JUMP)
      out.push({ kind: 'bf', d: T[i].d, delta: Math.abs(b - a), gap });
  }
  return out;
}

/* ── progression ── */

/* The last date each lift's working weight CHANGED — in either direction.

   Not "went up", which is what this asked before and got wrong twice over.
   A lift you deliberately lowered last week has not been neglected for
   months; it is the lift you have thought about most recently. Somebody who
   discovers they have been doing an exercise wrong and drops it from 52.5
   to 20 is doing the single most useful thing on offer, and being told they
   have stalled for it is the opposite of helpful.

   Unproven increases count too. You moved the weight; whether you have
   trained it yet is a different question, and the pending finding below
   already asks it. */
function lastMove(prList) {
  const m = new Map();
  (prList || []).forEach(e => {
    if (e.kind === 'void') return;
    const cur = m.get(e.ex);
    if (!cur || e.d > cur) m.set(e.ex, e.d);
  });
  return m;
}

/* ── the report ── */

export function checkup(cs, st) {
  const out = [];
  const log = cs.log || [];
  const list = load('bp_bw', []);
  const h = (() => { try { return prof().h; } catch { return null; } })();

  const add = (id, sev, t, d) => out.push({ id, sev, t, d });

  /* — numbers that cannot be right — */
  const odd = bwOutliers(list);
  if (odd.length) {
    const e = odd[odd.length - 1];
    const also = odd.length > 1 ? ` It is one of ${odd.length} worth checking.` : '';
    /* Three days is the line between "the keypad" and "something happened".
       Inside it, nothing a body does explains the number. Outside it, plenty
       does — so the finding asks rather than concludes. */
    const tight = e.gap <= 3;
    const body = tight
      ? `Nothing moves that far in ${plural(e.gap, 'day')}, so most likely the keypad. If it is right, leave it.`
      : `Fast for ${plural(e.gap, 'day')}, but possible — illness, salt, carbs, or a gap you did not log. Check it; if it is real, keep it.`;
    /* Rapid unexplained GAIN is the one direction with a reason to say
       more, because fluid retention is how several conditions announce
       themselves. A prompt to see someone, not a finding about the user —
       an app that flags typos cannot diagnose anything. */
    const health = (!tight && e.dir === 'up' && e.gap <= 14)
      ? ` A quick unexplained gain with swelling or breathlessness is one for a doctor.`
      : '';
    add('bw-outlier', tight ? 'warn' : 'note', 'A weigh-in worth verifying',
      `${e.w} lbs on ${fmtD(e.d)} is ${e.diff.toFixed(1)} lbs off the ${e.med.toFixed(1)} its neighbours point to. ${body}${health}${also}`);
  }

  /* A waist that moved too far and the body fat jump it caused are one
     problem, not two, and the waist is the half you can actually go and
     re-measure. So: most recent flagged pair only, and the cause beats the
     consequence when both are on it. */
  const jumps = tapeJumps(list, h);
  const lastJumpDate = jumps.length ? jumps[jumps.length - 1].d : null;
  const onThatDate = jumps.filter(j => j.d === lastJumpDate);
  (onThatDate.find(j => j.kind === 'waist') ? [onThatDate.find(j => j.kind === 'waist')] : onThatDate.slice(-1)).forEach(j => {
    if (j.kind === 'waist')
      add('tape-jump', 'warn', 'A waist measurement worth repeating',
        `${j.delta.toFixed(1)}" in ${plural(j.gap, 'day')}. Usually the tape sitting at a different height, not the torso changing. Re-measure at the navel, relaxed — if it reads the same, keep it.`);
    else
      add('bf-jump', 'warn', 'A body fat estimate worth repeating',
        `${j.delta.toFixed(1)} points in ${plural(j.gap, 'day')}. This method repeats to within about a point, so a jump this size says more about the tape than about you — and the calorie target reads off it.`);
  });

  /* — progression — */
  const raises = lastMove(cs.prList);
  const stalledLifts = [];
  raises.forEach((d, ex) => {
    const age = agoOf(d);
    if (age >= STALL_DAYS && sinceCount(log, d) >= STALL_SESSIONS)
      stalledLifts.push({ ex, age });
  });
  if (stalledLifts.length) {
    stalledLifts.sort((a, b) => b.age - a.age);
    const names = stalledLifts.slice(0, 3).map(l => `${l.ex} (${Math.round(l.age / 7)}w)`).join(', ');
    add('stalled', 'warn', `${stalledLifts.length === 1 ? 'A lift has' : `${stalledLifts.length} lifts have`} not moved in months`,
      `${names}${stalledLifts.length > 3 ? ', and others' : ''}. You have trained through it, so this is a stall rather than a break. Something has to change — more reps before you add weight, a smaller jump, or more food.`);
  }

  const inWindow = e => agoOf(e.d) <= DRY_DAYS;
  const ups = (cs.prList || []).filter(e => e.kind === 'up' && inWindow(e));
  const recentUps = ups.filter(e => e.proven).length;
  const untested = ups.length - recentUps;
  const recentSessions = log.filter(s => inWindow(s)).length;
  if (!ups.length && recentSessions >= DRY_SESSIONS && !stalledLifts.length)
    add('no-prs', 'warn', 'Nothing has gone up in six weeks',
      `${plural(recentSessions, 'session')} in that time and no working weight raised. Attendance is not the problem, so the load is: if a lift is comfortable at the top of its rep range, it is time to add to it.`);

  const backoffs = (cs.prList || []).filter(e => e.kind === 'down' && agoOf(e.d) <= BACKOFF_DAYS).length;
  if (backoffs >= BACKOFF_N)
    add('backoffs', 'note', `${plural(backoffs, 'back-off')} in the last two months`,
      `Backing off once is honest. This often means the jumps are too big — with dumbbells the next pair up can be a 10% increase, which is a lot. Try holding a weight for an extra session before moving.`);

  const pending = (st.pendingAll || []).length;
  if (pending >= 3)
    add('pending', 'note', `${plural(pending, 'weight')} set but never trained`,
      `These move the estimated letter and earn nothing — no milestone, no load added — until a session that trains them is logged. If they are aspirational rather than real, the rank is reading high.`);

  /* — consistency — */
  if (log.length) {
    const gap = agoOf(log[log.length - 1].d);
    if (gap >= GAP_DAYS)
      add('gap', 'warn', `${plural(gap, 'day')} since the last session`,
        `Not a judgment, and the streak and level survive it. But the standards are relative to what you can do now.`);

    const recent = log.filter(s => agoOf(s.d) <= WINDOW).length;
    const prior = log.filter(s => agoOf(s.d) > WINDOW && agoOf(s.d) <= WINDOW * 2).length;
    if (prior >= 4 && recent < prior * DROP_RATIO)
      add('attendance', 'note', 'Training less than you were',
        `${recent} sessions in the last three weeks against ${prior} in the three before. Worth noticing early — this is the shape a lapse has before it becomes one.`);
  }

  /* — balance — */
  const pcts = (st.lifts || []).map(l => l.pct);
  if (pcts.length >= 6) {
    const spread = Math.max(...pcts) - Math.min(...pcts);
    if (spread > 30) {
      const weak = st.lifts.reduce((a, l) => (l.pct < a.pct ? l : a));
      add('spread', 'note', 'Your lifts are a long way apart',
        `${Math.round(spread)} points between best and worst, ${weak.name} at the bottom. The score is an average, so the weakest lift drags hardest.`);
    }
  }

  /* — the good case, with its evidence — */
  const steady = !out.length;
  const evidence = [];
  if (steady) {
    if (recentUps) evidence.push(`${plural(recentUps, 'working weight')} raised in the last six weeks`);
    const r3 = log.filter(s => agoOf(s.d) <= WINDOW).length;
    if (r3) evidence.push(`${plural(r3, 'session')} in the last three weeks`);
    if (cs.streak >= 3) evidence.push(`a ${cs.streak}-day streak running`);
    if (odd.length === 0 && weighed(list).length >= 5) evidence.push('no weigh-ins that disagree with their neighbours');
  }
  return { findings: out, steady, evidence,
           warns: out.filter(f => f.sev === 'warn').length };
}
