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

   Every threshold below is a rate the body cannot plausibly
   beat, not a round number. The point is to flag the impossible
   rather than the merely surprising: a check that cries wolf at
   ordinary variation is one you learn to ignore, which is worse
   than not having it.

   Nothing here writes. It reads state and returns findings.
   ═══════════════════════════════════════════════════════════ */

import { load, todayStr } from '../../assets/js/storage.js?v=check-sep26';
import { weighed, taped, navyBF, prof } from './body.js?v=check-sep26';

const dOf = ds => new Date(ds + 'T00:00:00');
const between = (a, b) => Math.round((dOf(b) - dOf(a)) / 86400000);
const agoOf = ds => between(ds, todayStr());
const sinceCount = (log, ds) => log.filter(s => s.d >= ds).length;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/* Same shape the rest of the tab uses. A finding that says 2026-09-07 reads
   like a log line rather than a sentence about last Tuesday. */
const fmtD = ds => dOf(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* ── thresholds, each with the reason it is where it is ── */

/* Day-to-day scale movement is water, glycogen and what you ate, and lands
   inside about 2% of bodyweight. 5% and at least six pounds is well past
   anything a body does overnight, which leaves the keypad. */
const BW_DEV_PCT = 0.05, BW_DEV_MIN = 6;

/* An inch of waist is roughly five to eight pounds of fat. Two inches
   inside five weeks would be fifteen-odd pounds of pure fat, which beats
   an aggressive cut — so it is far likelier the tape sat at a different
   rib. Four points of body fat over the same stretch is the same argument:
   about three a month is the ceiling, and the method's own repeatability
   is one point. */
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

/* A weigh-in judged against its own neighbours rather than the whole
   series, so a genuine cut is never the anomaly — only a point that
   disagrees with the days either side of it. */
function bwOutliers(list) {
  const W = weighed(list);
  if (W.length < 5) return [];
  const out = [];
  W.forEach((e, i) => {
    const lo = Math.max(0, i - 3), hi = Math.min(W.length, i + 4);
    const nb = W.slice(lo, hi).filter((_, j) => lo + j !== i).map(x => x.w).sort((a, b) => a - b);
    if (nb.length < 3) return;
    const med = nb[Math.floor(nb.length / 2)];
    const diff = Math.abs(e.w - med);
    if (diff > med * BW_DEV_PCT && diff > BW_DEV_MIN) out.push({ d: e.d, w: e.w, med, diff });
  });
  return out;
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

/* The last date each lift's working weight went UP, counting only
   increases you have trained — the same proven-only rule the rest of the
   app scores on, so a weight you typed and never lifted cannot pass as
   progress here either. A baseline counts as a starting date. */
function lastRaise(prList) {
  const m = new Map();
  (prList || []).forEach(e => {
    if (e.k === 'void' || e.k === 'down') return;
    if (e.k === 'up' && !e.proven) return;
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
    add('bw-outlier', 'warn', `A weigh-in that does not fit its neighbours`,
      `${e.w} lbs on ${fmtD(e.d)} sits ${e.diff.toFixed(1)} lbs off the days around it, which were nearer ${e.med.toFixed(1)}. Bodies do not move that far overnight, so this is most likely a typo${odd.length > 1 ? ` — and it is one of ${odd.length}` : ''}. Worth correcting: the trend line, the rate and every calorie target read off it.`);
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
      add('tape-jump', 'warn', 'A waist measurement that moved too fast',
        `The tape on ${fmtD(j.d)} is ${j.delta.toFixed(1)}" from the one ${plural(j.gap, 'day')} before it. An inch is five to eight pounds of fat, so this is more likely a different spot on the torso than a real change. Measure at the navel, relaxed, and it should settle.`);
    else
      add('bf-jump', 'warn', 'A body fat estimate that jumped',
        `${j.delta.toFixed(1)} points in ${plural(j.gap, 'day')}. About three a month is the ceiling even on an aggressive cut, and this method repeats to within a point — so the tape probably moved, not you.`);
  });

  /* — progression — */
  const raises = lastRaise(cs.prList);
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

  const recentUps = (cs.prList || []).filter(e => e.k === 'up' && e.proven && agoOf(e.d) <= DRY_DAYS).length;
  const recentSessions = log.filter(s => agoOf(s.d) <= DRY_DAYS).length;
  if (!recentUps && recentSessions >= DRY_SESSIONS && !stalledLifts.length)
    add('no-prs', 'warn', 'Nothing has gone up in six weeks',
      `${plural(recentSessions, 'session')} in that time and no working weight raised. Attendance is not the problem, so the load is: if a lift is comfortable at the top of its rep range, it is time to add to it.`);

  const backoffs = (cs.prList || []).filter(e => e.k === 'down' && agoOf(e.d) <= BACKOFF_DAYS).length;
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
        `Not a judgment — the streak and the level both survive being told about it. But strength standards are relative to what you can do now, and two weeks off starts to show.`);

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
        `${Math.round(spread)} percentile points between your best and worst, with ${weak.name} at the bottom. The overall letter is an average, so the weakest movement is holding it down more than the strongest is lifting it.`);
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
