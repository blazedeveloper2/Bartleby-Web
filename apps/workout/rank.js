/* ═══════════════════════════════════════════════════════════
   WORKOUT — RANK

   Two independent things live here, on purpose:

   1. STRENGTH RANK (the letter). Derived entirely from your working
      weights vs published population standards, relative to your
      bodyweight. It cannot be farmed by showing up — only by lifting
      more. See standards.js for the data and its source.

   2. CONSISTENCY (streak, heatmap, milestones, level). Derived from
      the logs this module maintains:

        bp_log  [{d,di,ex,sets}]     completed sessions
        bp_pr   [{d,ex,from,to,k,p}] every working-weight change
        bp_ach  {id:'YYYY-MM-DD'}    the date each milestone was earned

   3. PROOF, which is what keeps the other two honest. A working weight
      you have typed in is a claim; it becomes a fact when you finish a
      session that trains it (`p:1`). Until then that lift is PENDING —
      it moves the estimated letter on screen, but it earns nothing: no
      milestone, no rank-up, no lbs in the load total.

      That is what makes backing off read correctly. Set 100, find you
      can't do it, drop to 90: the 100 was never trained, so the increase
      is rolled back and everything it briefly implied goes with it.
      Train at 100 for a month and then drop to 90: that increase is
      history, so it stands, the drop is logged as a back-off which
      subtracts from the load total, and the milestones you earned stay
      earned — shown as no longer held rather than quietly deleted.

   The level is attendance and says so: one step per finished session
   on a curve that widens as it goes, computed from bp_log and nothing
   else. It never reads a weight, so showing up can't move the letter
   and the letter can't be farmed by showing up — two scores for two
   different things, and neither can stand in for the other.
   ═══════════════════════════════════════════════════════════ */

import { PROGRAM, LADDERS, GYM_STEP } from './data.js?v=gripsrc-sep24';
import { LIFTS, DB_LADDER, onLadder, SRC_LABEL, TIER_PCT, rankFor, ord, verseFor, VERSE_NOTICE } from './standards.js?v=gripsrc-sep24';
import { load, save, remove, todayStr, dateStr } from './store.js?v=gripsrc-sep24';
/* An entry in bp_bw can now carry a waist and neck but no weight, so the
   last entry is no longer reliably the last bodyweight. Everything here that
   wants a weight goes through weighed(). */
import { weighed, taped, navyBF, prof, snapshot as bodySnap, scoringRef } from './body.js?v=gripsrc-sep24';
import { checkup } from './checkup.js?v=gripsrc-sep24';
import { gripOn, gripStanding, gripUnit, toGU, GRIP_UNITS, GRIP_HOW } from './grip.js?v=gripsrc-sep24';

/* ── storage ── */
const logAll = () => load('bp_log', []);
const logSv  = l => save('bp_log', sortByDate(l));
const prAll  = () => load('bp_pr', []);
const prSv   = l => save('bp_pr', sortByDate(l));
const achAll = () => load('bp_ach', {});
const achSv  = a => save('bp_ach', a);
const wts    = () => load('bp_wt', {});
const sortByDate = l => [...l].sort((a, b) => a.d.localeCompare(b.d));

/* Equipment flags, owned by Settings. An exercise names the kit it needs in
   `req` (see data.js); when that kit is off, it resolves to its `alt`. Every
   consumer goes through resEx(), so rendering, scoring and the badge counts
   all agree on which exercises are actually in play.

   An unknown or absent `req` resolves as owned — a new `alt` added without
   naming its equipment shows the main movement rather than silently hiding
   it behind a flag nothing can turn on.

   The barbell is the one flag that defaults OFF: the program is written for
   dumbbells, and the bar versions are the upgrade, not the baseline. Its
   default here and in shell.js's EQUIP must agree, or Settings will paint
   one thing while the program renders another. */
const OWNED = {
  bar:     () => load('bp_bar', true),
  wheel:   () => load('bp_wheel', true),
  barbell: () => load('bp_barbell', false),
};
export const owns = k => (OWNED[k] || (() => true))();

/* Skill levels, also owned by Settings. An exercise naming a `line` (see
   LADDERS in data.js) is whichever step of that ladder you are on, so
   Saturday and the two practice days always agree on what you are
   practising. `dose` picks the prescription: Saturday's test dose by
   default, or the practice ('p') and lighter ('l') doses, each falling
   back to the heavier one when a step does not name its own.

   Equipment resolves first, then the level: a slot that swaps to its
   `alt` without a bar lands on the alt's own line, or on a fixed movement
   when the alt has none. An unknown line is not a ladder at all — the
   entry reads as written rather than as a blank row. */
const lvlAll = () => load('bp_lvl', {});
export function lvlOf(line) {
  const L = LADDERS[line], i = lvlAll()[line];
  if (!L) return 0;
  return Number.isInteger(i) ? Math.max(0, Math.min(L.steps.length - 1, i)) : (L.start || 0);
}
export function setLvl(line, i) {
  const L = LADDERS[line];
  if (!L || !Number.isInteger(i) || i < 0 || i >= L.steps.length) return false;
  save('bp_lvl', { ...lvlAll(), [line]: i });
  return true;
}
const DOSE = { s:['s'], p:['p', 's'], l:['l', 'p', 's'] };
function stepEx(ex) {
  const st = LADDERS[ex.line].steps[lvlOf(ex.line)];
  const dk = (DOSE[ex.dose] || DOSE.s).find(d => st[d]);
  return { n: st.n, m: st.m, s: st[dk], b: st.b, bc: st.bc, k: st.k, ld: st.ld,
           line: ex.line, dose: ex.dose || 's' };
}
export const resKit = ex => (ex.alt && !owns(ex.req)) ? ex.alt : ex;
export const resEx = ex => {
  const e = resKit(ex);
  return e.line && LADDERS[e.line] ? stepEx(e) : e;
};

/* ═══════════════════ WHAT AN EXERCISE TRACKS ═══════════════════

   The exercise lab used to offer every movement the same thing — a
   working-weight box — whether or not the movement could carry a weight,
   and counted sets only on the scored lifts. A wall handstand had a weight
   field and nowhere to put the thirty seconds it is actually measured in.

     load   'set'    a weight you choose: every scored lift, and `ld:1`
            'added'  optional weight on a belt — bodyweight counts, and
                     the reps are what say when to start adding
            null     bodyweight; no weight field at all
     unit   'r' reps, 's' seconds, '-' nothing worth counting
     rng    [lo, hi] the target, from LIFTS where the lift is scored and
            otherwise from the prescription itself; null for '2×F' */
const TARGET = /^\d+×(\d+)(?:-(\d+))?(s?)(?=\s|$)/;
export function trackOf(ex) {
  const spec = LIFTS[ex.n];
  const unit = ex.k || (/\beasy\b/.test(ex.s || '') ? '-' : /^\d+×[\d-]+s(?=\s|$)/.test(ex.s || '') ? 's' : 'r');
  const m = TARGET.exec(ex.s || '');
  /* the prescription's own range only counts in the unit being tracked —
     a kick-up set of "3 attempts" is counted in seconds held */
  const own = m && (m[3] === 's') === (unit === 's') ? [+m[1], +(m[2] || m[1])] : null;
  return {
    load: spec ? (spec.mode === 'added' ? 'added' : 'set') : ex.ld ? 'set' : null,
    unit, rng: spec?.rng || own,
  };
}

/* ── counted bodyweight sets ──

   bp_xsets  { [key]: { s:[30, 25, 22], d:'YYYY-MM-DD' } }

   The same record bp_xreps keeps for a loaded lift, minus the weight it
   was counted at — there is none, so nothing makes it stale but a newer
   count. Seconds or reps by the exercise's unit. Keyed by name plus the
   dose when it is not Saturday's: five practice holds on a Wednesday are
   not a failed attempt at Saturday's three, and must not overwrite them. */
const xsetsAll = () => load('bp_xsets', {});
const xsKey = ex => (ex.dose && ex.dose !== 's') ? `${ex.n}·${ex.dose}` : ex.n;
export const exSets = ex => xsetsAll()[xsKey(ex)] || null;
export function setExSets(ex, sets) {
  const m = xsetsAll();
  const clean = (sets || []).map(n => (Number.isFinite(+n) && +n > 0 ? Math.round(+n) : null));
  if (!clean.some(n => n !== null)) delete m[xsKey(ex)];
  else m[xsKey(ex)] = { s: clean, d: todayStr() };
  save('bp_xsets', m);
}

/* A ladder step's `up` read as a test: "3×30s in a straight line" is three
   sets of at least 30 seconds, "15-20s off the wall" is one hold of 15, and
   "3×8 /side" is three sets of eight. The words after the number are form,
   which only you can judge — the number is the part a count can check. */
export function passOf(up) {
  let m = /^(\d+)×(\d+)(s?)/.exec(up || '');
  if (m) return { n: +m[1], min: +m[2], unit: m[3] ? 's' : 'r' };
  m = /^(\d+)(?:-\d+)?s\b/.exec(up || '');
  return m ? { n: 1, min: +m[1], unit: 's' } : null;
}
const passed = (pass, vals) => vals.filter(v => v >= pass.min).length;

/* Whether the step you are on has been passed, read off Saturday's count
   (Tuesday's rollouts share it — same step, same dose). */
export function lineReady(line) {
  const L = LADDERS[line];
  if (!L) return false;
  const i = lvlOf(line), st = L.steps[i], pass = L.steps[i + 1] ? passOf(st.up) : null;
  const rec = pass && xsetsAll()[st.n];
  return !!rec && passed(pass, rec.s.filter(v => v > 0)) >= pass.n;
}

/* ── what a bodyweight count says ──

   The bodyweight counterpart of loadAdvice(). There is no weight to move,
   so the answers are about the movement instead:

     pass       Saturday's count clears the step's `up` — move up the ladder
     short      counted, not there yet; says how many sets are
     over       a practice day's sets ran past the practice range — those
                days are meant to stop short of the Saturday test
     top        past the top of the range with no step above to go to
     under      short of the range's floor — normal on a new step
     in         inside the range; nothing to change
     uncounted  nothing counted yet */
export function skillAdvice(ex) {
  const t = trackOf(ex);
  if (t.load || t.unit === '-') return null;
  const rec = exSets(ex);
  const vals = rec ? rec.s.filter(v => v > 0) : [];
  const best = vals.length ? Math.max(...vals) : null;
  const out = { unit: t.unit, rng: t.rng, best, d: rec ? rec.d : null };
  const test = !ex.dose || ex.dose === 's';

  const L = ex.line && LADDERS[ex.line];
  if (L) {
    const i = lvlOf(ex.line), st = L.steps[i], nx = L.steps[i + 1];
    const pass = nx ? passOf(st.up) : null;
    if (pass) {
      Object.assign(out, { pass, need: st.up, next: nx.n });
      /* A practice day carries Saturday's verdict once it is a pass, so the
         way up is on whichever day you open it. */
      if (lineReady(ex.line)) return { ...out, state: 'pass' };
      if (test) {
        if (!vals.length) return { ...out, state: 'uncounted' };
        return { ...out, state: 'short', hit: passed(pass, vals) };
      }
    }
  }
  if (!vals.length) return { ...out, state: 'uncounted' };
  if (!t.rng) return { ...out, state: 'in' };
  const [lo, hi] = t.rng;
  if (best > hi) return { ...out, state: test ? 'top' : 'over' };
  if (best < lo) return { ...out, state: 'under' };
  return { ...out, state: 'in' };
}

/* Reps-to-failure ASSUMPTION behind the 1RM estimate — the fallback for a
   lift whose reps have not been counted. See RECORDED REPS below. */
export const REP_OPTS = [5, 8, 10, 12, 15];
const reps  = () => { const r = load('bp_reps', 10); return REP_OPTS.includes(r) ? r : 10; };
const sReps = r => save('bp_reps', r);

/* ═══════════════════ RECORDED REPS ═══════════════════

   bp_xreps  { [lift]: { s:[15,13], w:50, d:'YYYY-MM-DD' } }

   What you actually counted, per set, at the weight you counted it at.

   The dial above is one number for the whole sheet and the `reps` field in
   LIFTS is a second guess layered on top of it, and Epley cannot tell the
   difference between a guess and a count: at 50 lbs it returns 58 at five
   reps and 75 at fifteen, and both are printed with the same confidence.
   Counting the set is the only thing that turns that number into a
   measurement of anything.

   THE BEST SET SCORES, and the others are deliberately ignored.

   Epley is calibrated on one set taken to failure in a fresh state. A
   second set at the same load comes in lower because of accumulated
   fatigue, not because you got weaker between them — 15 then 13 is one
   performance with a rest interval in the middle, not two measurements
   that disagree. Averaging them would produce a 1RM belonging to nobody,
   and taking the last would let the rank fall every time you added a set.
   So: max.

   `w` is what makes a recording expire. Reps counted at 50 lbs say nothing
   about the same lift at 60, so a recording whose weight no longer matches
   is stale and scoring falls back to the assumption rather than carrying
   the old count forward onto a new load. Stale is shown, not silently
   dropped — it is the prompt to count again.

   The spread between sets is not strength data, but it is data: see
   dropOff() for what it is worth and what it is not. */
const xrepsAll = () => load('bp_xreps', {});
const xrepsSv  = m => save('bp_xreps', m);

/* Sets a recording, or clears it when nothing usable is passed. `w` is
   stamped at write time so staleness is decidable later. */
export function setExReps(name, sets, w) {
  const m = xrepsAll();
  const clean = (sets || []).map(n => (Number.isFinite(+n) && +n > 0 ? Math.round(+n) : null));
  /* An 'added' lift is counted at bodyweight too — nothing on the belt is
     a weight of zero, not the absence of one. */
  const ok = w > 0 || (w === 0 && LIFTS[name]?.mode === 'added');
  if (!clean.some(n => n !== null) || !ok) delete m[name];
  else m[name] = { s: clean, w, d: todayStr() };
  xrepsSv(m);
}
export const exReps = name => xrepsAll()[name] || null;

/* How many reps to read one lift at, and how much that number is worth.
   `logged` is the flag every label on the tab hangs off: it is the
   difference between "your 1RM" and "your 1RM if the dial is right". */
export function repsRead(name, spec, wv, dial, all) {
  const e = (all || xrepsAll())[name];
  const counted = e && Array.isArray(e.s) ? e.s.filter(n => n > 0) : [];
  if (counted.length && e.w === wv)
    return { n: Math.max(...counted), logged: true, stale: false, sets: e.s, d: e.d };
  return { n: spec.reps || dial, logged: false, stale: counted.length > 0,
           sets: counted.length ? e.s : null, staleW: counted.length ? e.w : null,
           d: counted.length ? e.d : null };
}

/* Above this, Epley is extrapolating rather than interpolating and the
   error grows with every rep — a 15-rep set implies a 1.5× multiplier off
   a single linear term. The lifts carrying reps:15 in LIFTS live here by
   design, so the flag is common rather than exceptional, and it marks the
   1RM approximate rather than hiding it. */
const EPLEY_SOFT_MAX = 12;

/* What the spread between sets says. Not strength — the drop is fatigue,
   and fatigue is what the second set is for. What it does say is whether
   the FIRST set was the honest max the 1RM is being read off:

     no drop at all  a set that repeats exactly is usually a set that
                     stopped short of failure on the way, so the best set
                     understates and so does the rank
     a huge drop     either the first set went well past failure or the
                     rest between them was too short to call them the same
                     effort; either way the pair is not one clean reading

   Both are reasons to trust the estimate less. Neither is a reason to
   change the number, so this only ever annotates. */
export function dropOff(sets) {
  const s = (sets || []).filter(n => n > 0);
  if (s.length < 2) return null;
  const best = Math.max(...s), worst = Math.min(...s);
  const lost = (best - worst) / best;
  if (best - worst === 0) return { kind:'flat', best, worst,
    t:'Identical sets usually mean the first stopped short — the estimate is probably low.' };
  if (lost > 0.4) return { kind:'steep', best, worst,
    t:`${best}→${worst} is a steep fall: too little rest, or a first set taken past failure. Trust the estimate less.` };
  return { kind:'normal', best, worst,
    t:`${best}→${worst} is ordinary fatigue. Only the ${best} scores.` };
}

/* ── when the reps say the weight is wrong ──

   Every working set in this program is taken to failure, which makes the
   rep count the load's own report card. Each lift declares the range it
   is meant to fail in — `rng` in LIFTS, per movement, because a press and
   a lateral raise do not fail in the same place and never did. Inside the
   range this says nothing at all. Outside it, in either direction, the
   weight and not the effort is what needs changing:

     over the top     the load stopped being the limiting factor
     under the floor  it is heavier than the slot is asking for

   The range is its own dead band, which is why there is no extra slack
   bolted on: five or six reps of width already absorbs the rep a good day
   is worth, so falling outside is a reading rather than noise.

   How much: the load Epley says holds the SAME estimated 1RM at the near
   edge of the range — base·(30+best)/(30+edge). The NEAR edge, not the
   middle, so this always asks for the smallest move that makes the set
   land back inside; if the next count is still outside, it simply asks
   again. On a weighted pull-up the whole system scales, bodyweight
   included, not just the plate hanging off you — the same distinction
   ratioOf() makes. Rounded to the weight field's own 2.5 lb step, and
   never less than one of them, since a smaller move is not expressible.

   Advisory only, and deliberately not automatic: taking it makes the
   count that produced it stale, which is the app asking you to count
   again at the new load rather than carrying the old reps onto it. */
const LOAD_STEP = 2.5;

/* `rng` stands in for LIFTS on a loaded lift that is not scored — the range
   is read off its prescription instead (trackOf), and the maths is the same
   Epley either way. An 'added' lift reads at zero: that is bodyweight
   chin-ups, and the verdict that matters there is when to start adding. */
export function loadAdvice(name, wv, rng) {
  const spec = LIFTS[name] || (rng ? { rng } : null);
  if (!spec || !spec.rng) return null;
  if (spec.mode === 'added') wv = wv > 0 ? wv : 0;
  else if (!(wv > 0)) return null;
  const [lo, hi] = spec.rng;
  const out = { lo, hi, best: null, to: null };

  /* Nothing counted AT THIS WEIGHT. There is no verdict to give, but the
     range is worth showing anyway — it is what you are aiming at on the
     set you are about to do, and it was previously only discoverable by
     overshooting it. Stale is its own answer and says so. */
  const rec = exReps(name);
  if (!rec || rec.w !== wv || !(rec.s || []).some(n => n > 0))
    return { ...out, state: 'uncounted', staleW: rec && rec.w !== wv ? rec.w : null,
             d: rec ? rec.d : null };

  /* The best set is the one that scores (see RECORDED REPS), so it is also
     the one the load is judged on — reading the advice off a fatigued
     second set would have the app recommend a drop after every hard day. */
  const best = Math.max(...rec.s.filter(n => n > 0));
  Object.assign(out, { best, d: rec.d });
  if (best >= lo && best <= hi) return { ...out, state: 'hold' };
  const up = best > hi, edge = up ? hi : lo;

  /* what the reps are actually lifting, which on an 'added' lift is you */
  let base = wv;
  if (spec.mode === 'added') {
    const bw = bodySnap().w;
    if (!(bw > 0)) return { ...out, state: 'hold' };
    base = bw + wv;
  }
  const ideal = up ? wv + base * (best - edge) / (30 + edge)
                   : wv - base * (edge - best) / (30 + edge);
  const to = snapLoad(spec, wv, ideal, up);
  /* The dumbbells have run out at the top, or below zero the answer is
     not a weight at all — it is "take the belt off" or "use a lighter
     pair", neither of which this field can say. The reading still stands
     and the range still shows; only the button goes. */
  if (to === null || !(to > 0)) return { ...out, state: 'capped', up, edge };
  return { ...out, state: up ? 'up' : 'down', up, edge, to, by: Math.abs(to - wv) };
}

/* The top of the ladder, for saying where the dumbbells stop. */
export const DB_MAX = DB_LADDER[DB_LADDER.length - 1];

/* The nearest weight you can actually set, in the direction asked for.

   On a dumbbell lift that is a rung of DB_LADDER, which is uneven on
   purpose — 2.5 lb apart at the bottom and 5 lb apart above 25, because
   that is how the hardware is built. Everything else rounds to the plain
   2.5 lb step: a loaded bar and a pull-up belt are whatever plates are to
   hand, and a weight already past the top rung is proof of equipment the
   ladder does not describe, so both are left to the generic step.

   Always at least one increment, never zero — a suggestion to change the
   weight to the weight it already is would be no suggestion at all.

   In a gym (GYM_STEP in data.js) there is no ladder: the rack and the
   stacks carry on past it, in steps of their own. */
function snapLoad(spec, wv, ideal, up) {
  const top = DB_LADDER[DB_LADDER.length - 1];
  if (GYM_STEP) {
    const step = Math.max(GYM_STEP, Math.round(Math.abs(ideal - wv) / GYM_STEP) * GYM_STEP);
    return up ? wv + step : wv - step;
  }
  if (onLadder(spec) && wv <= top) {
    const side = DB_LADDER.filter(v => up ? v > wv : v < wv);
    if (!side.length) return null;                      // out of dumbbells
    /* the rung closest to what Epley asked for, and if it asked for more
       than the ladder has, the last rung */
    return side.reduce((a, b) => Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a);
  }
  const step = Math.max(LOAD_STEP, Math.round(Math.abs(ideal - wv) / LOAD_STEP) * LOAD_STEP);
  return up ? wv + step : wv - step;
}

/* What the standards get divided by. There is no longer a choice here:
   lean mass is the better read in both directions — a cut stops flattering
   the letter and a bulk stops hiding it — so it is simply what the tab
   scores against. Bodyweight survives only as the fallback, because lean
   mass needs a tape measurement and there is nothing else to divide by
   until one exists. `usingLean` is what tells the UI which happened. */

/* ── schedule ── */
const DOW = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
const DI_OF_DOW = {};
PROGRAM.forEach((d, i) => { DI_OF_DOW[DOW[d.day]] = i; });
const WEEK_TARGET = PROGRAM.length;

/* Whether a program day existed on a given date. A day added mid-history
   (its `since` in data.js) only exists from that date on — before it, the
   weekday was genuinely a rest day, and streaks, the heatmap and perfect
   weeks must all read it that way rather than rewriting the past. */
function schedOn(ds, dow) {
  const di = DI_OF_DOW[dow];
  if (di === undefined) return false;
  const s = PROGRAM[di].since;
  return !s || ds >= s;
}

/* How many days the program asked of the week starting `wkStart` (Monday).
   A day with a `since` counts only in weeks whose occurrence of that
   weekday falls on or after it. */
function weekTargetFor(wkStart) {
  return PROGRAM.filter(day => !day.since ||
    dateStr(addDays(dOf(wkStart), (DOW[day.day] + 6) % 7)) >= day.since).length;
}

const ICO = {
  bolt:   '<polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/>',
  flame:  '<path d="M12 2c.8 4.5 4.5 5.8 4.5 10a4.5 4.5 0 0 1-9 0c0-2 .9-3.2 1.8-4 0 1.8.9 2.7 1.8 2.7 0-3.6.9-5.6.9-8.7z"/>',
  medal:  '<circle cx="12" cy="15" r="6"/><path d="M8 3h8l-2.5 6h-3z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a4 4 0 0 0 3 3.8"/><path d="M17 6h3v1a4 4 0 0 1-3 3.8"/><path d="M9 20h6"/><path d="M12 14v6"/>',
  check:  '<circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9.5"/>',
  cal:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  peak:   '<path d="M2 20l6.5-13L13 15l3-4.5L22 20z"/>',
  star:   '<polygon points="12 3 14.6 9 21 9.7 16.2 14 17.5 20.5 12 17.2 6.5 20.5 7.8 14 3 9.7 9.4 9"/>',
  shield: '<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/>',
  crown:  '<path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/>',
  scale:  '<path d="M12 4v16"/><path d="M5 8h14"/><circle cx="5" cy="8" r="2.5"/><circle cx="19" cy="8" r="2.5"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;
/* The tab bar draws from the same set, so a tab and the badges behind it
   are never two different visual languages. */
export const icon = svg;

/* Achievement table. `t` receives a merged view of consistency stats and
   strength state (see earned()), so a badge can key off either. Locked ones
   display `req`, which is what makes them pull you forward. */
const CATS = ['Consistency', 'Strength', 'Volume', 'Progression'];
const BADGES = [
  /* -- Consistency -- */
  { id:'first',     cat:0, ico:'bolt',   n:'First Rep',        req:'Finish 1 session',               t:s => s.sessions >= 1 },
  { id:'ten',       cat:0, ico:'bolt',   n:'Double Digits',    req:'Finish 10 sessions',             t:s => s.sessions >= 10 },
  { id:'streak3',   cat:0, ico:'flame',  n:'Hat Trick',        req:'3 training days in a row',       t:s => s.best >= 3 },
  { id:'twentyfive',cat:0, ico:'bolt',   n:'Quarter Century',  req:'Finish 25 sessions',             t:s => s.sessions >= 25 },
  { id:'weeks2',    cat:0, ico:'check',  n:'Back To Back',     req:'2 perfect weeks',                t:s => s.perfectWeeks >= 2 },
  { id:'week',      cat:0, ico:'check',  n:'Perfect Week',     req:`All ${WEEK_TARGET} days in one week`, t:s => s.perfectWeeks >= 1 },
  { id:'streak8',   cat:0, ico:'flame',  n:'Unbroken',         req:'8 training days in a row',       t:s => s.best >= 8 },
  { id:'weeks4',    cat:0, ico:'cal',    n:'Full Month',       req:'4 perfect weeks',                t:s => s.perfectWeeks >= 4 },
  { id:'season',    cat:0, ico:'cal',    n:'A Season',         req:'90 days since your first session', t:s => s.daysIn >= 90 },
  { id:'fifty',     cat:0, ico:'medal',  n:'Half Century',     req:'Finish 50 sessions',             t:s => s.sessions >= 50 },
  { id:'everyDay',  cat:0, ico:'cal',    n:'Whole Week',       req:'Train on all 7 weekdays at some point', t:s => s.dowCount >= 7 },
  { id:'seventy5',  cat:0, ico:'medal',  n:'Three Quarters',   req:'Finish 75 sessions',             t:s => s.sessions >= 75 },
  { id:'streak20',  cat:0, ico:'flame',  n:'Limiter Off',      req:'20 training days in a row',      t:s => s.best >= 20 },
  { id:'comeback',  cat:0, ico:'clock',  n:'No Excuses',       req:'Train again after 14+ days off', t:s => s.maxGap >= 14 },
  { id:'weeks10',   cat:0, ico:'cal',    n:'Ten Out Of Ten',   req:'10 perfect weeks',               t:s => s.perfectWeeks >= 10 },
  { id:'year1',     cat:0, ico:'cal',    n:'Anniversary',      req:'A year since your first session', t:s => s.daysIn >= 365 },
  { id:'hundred',   cat:0, ico:'trophy', n:'Centurion',        req:'Finish 100 sessions',            t:s => s.sessions >= 100 },
  { id:'streak40',  cat:0, ico:'flame',  n:'Immovable',        req:'40 training days in a row',      t:s => s.best >= 40 },
  { id:'twoHundred',cat:0, ico:'trophy', n:'Double Century',   req:'Finish 200 sessions',            t:s => s.sessions >= 200 },

  /* -- Strength: the letter, never attendance -- */
  { id:'rankD',     cat:1, ico:'shield', n:'On The Board',     req:'Reach rank D overall',           t:s => s.rankIdx >= 1 },
  { id:'rankC',     cat:1, ico:'shield', n:'Off The Floor',    req:'Reach rank C overall',           t:s => s.rankIdx >= 2 },
  { id:'liftB',     cat:1, ico:'star',   n:'One Good Lift',    req:'Any single lift to B',           t:s => s.bestLift >= 3 },
  { id:'rankB',     cat:1, ico:'shield', n:'Perfectly Average',req:'Reach rank B overall',           t:s => s.rankIdx >= 3 },
  { id:'noWeak',    cat:1, ico:'target', n:'No Weak Links',    req:'Every scored lift at C or above', t:s => s.scored >= 8 && s.minPct >= 20 },
  { id:'balanced',  cat:1, ico:'target', n:'Symmetry',         req:'Under 15 points between your best and worst lift', t:s => s.scored >= 8 && s.spread <= 15 },
  { id:'liftA',     cat:1, ico:'star',   n:'Genuinely Strong', req:'Any single lift to A',           t:s => s.bestLift >= 4 },
  { id:'p4p',       cat:1, ico:'peak',   n:'Pound For Pound',  req:'Any lift at 1.0x your bodyweight', t:s => s.maxRatio >= 1 },
  { id:'rankA',     cat:1, ico:'shield', n:'Top Fifth',        req:'Reach rank A overall',           t:s => s.rankIdx >= 4 },
  { id:'liftS',     cat:1, ico:'crown',  n:'Specialist',       req:'Any single lift to S',           t:s => s.bestLift >= 5 },
  { id:'allB',      cat:1, ico:'target', n:'Across The Board', req:'Every scored lift at B or above', t:s => s.scored >= 8 && s.minPct >= 50 },
  { id:'bw15',      cat:1, ico:'peak',   n:'One And A Half',   req:'Any lift at 1.5x your bodyweight', t:s => s.maxRatio >= 1.5 },
  { id:'rankS',     cat:1, ico:'crown',  n:'Elite',            req:'Reach rank S overall',           t:s => s.rankIdx >= 5 },
  { id:'liftSS',    cat:1, ico:'crown',  n:'Off The Table',    req:'Any single lift to SS',          t:s => s.bestLift >= 6 },
  { id:'rankSS',    cat:1, ico:'crown',  n:'Freak',            req:'Reach rank SS overall',          t:s => s.rankIdx >= 6 },

  /* -- Volume --
     "Prescribed" rather than "hard", because that is what a checkmark
     records: the sets the program asked for on an exercise you ticked
     off, warm-ups included, and unilateral work counted once per side.
     It does not know what effort any of them were taken at. */
  { id:'sets100',   cat:2, ico:'bolt',   n:'First Hundred',    req:'Tick off 100 prescribed sets',    t:s => s.sets >= 100 },
  { id:'sets250',   cat:2, ico:'bolt',   n:'Getting Somewhere',req:'Tick off 250 prescribed sets',    t:s => s.sets >= 250 },
  { id:'sets500',   cat:2, ico:'star',   n:'500 Sets',         req:'Tick off 500 prescribed sets',    t:s => s.sets >= 500 },
  { id:'sets1500',  cat:2, ico:'star',   n:'1,500 Sets',       req:'Tick off 1,500 prescribed sets',  t:s => s.sets >= 1500 },
  { id:'sets4000',  cat:2, ico:'trophy', n:'4,000 Sets',       req:'Tick off 4,000 prescribed sets',  t:s => s.sets >= 4000 },
  { id:'sets10k',   cat:2, ico:'crown',  n:'Five Figures',     req:'Tick off 10,000 prescribed sets', t:s => s.sets >= 10000 },

  /* -- Progression -- */
  { id:'pr1',       cat:3, ico:'target', n:'Stronger',         req:'Raise a working weight',         t:s => s.prs >= 1 },
  { id:'fullSheet', cat:3, ico:'check',  n:'Full Sheet',       req:'A weight logged on every scored lift', t:s => s.allLogged },
  { id:'pr5',       cat:3, ico:'target', n:'Creeping Up',      req:'5 working-weight increases',     t:s => s.prs >= 5 },
  { id:'backoff',   cat:3, ico:'clock',  n:'Honest Rep',       req:'Back a weight off once — the log is for what you lift, not what you meant to', t:s => s.backoffs >= 1 },
  { id:'pr15',      cat:3, ico:'target', n:'Overloaded',       req:'15 working-weight increases',    t:s => s.prs >= 15 },
  { id:'load100',   cat:3, ico:'peak',   n:'Plus One Hundred', req:'+100 lbs of load added',         t:s => s.loadAdded >= 100 },
  { id:'load250',   cat:3, ico:'peak',   n:'Plus Two Fifty',   req:'+250 lbs of load added',         t:s => s.loadAdded >= 250 },
  { id:'weighIn',   cat:3, ico:'scale',  n:'Weigh In',         req:'Log your bodyweight 15 times',   t:s => s.bwCount >= 15 },
  { id:'tape1',     cat:3, ico:'scale',  n:'Tape Measure',     req:'Log a waist and neck measurement', t:s => s.tapes >= 1 },
  { id:'tape6',     cat:3, ico:'scale',  n:'Kept It Up',       req:'6 tape measurements',            t:s => s.tapes >= 6 },
  { id:'lean',      cat:3, ico:'peak',   n:'Athlete Band',     req:'Body fat under 14%',             t:s => s.bf !== null && s.bf < 14 },
  { id:'bfDrop3',   cat:3, ico:'peak',   n:'Three Points',     req:'Drop 3 points of body fat since your first tape', t:s => s.bfDrop >= 3 },
  { id:'bwLog50',   cat:3, ico:'scale',  n:'Creature Of Habit',req:'Log your bodyweight 50 times',   t:s => s.bwCount >= 50 },
  { id:'recomp',    cat:3, ico:'scale',  n:'Recomposition',    req:'Drop 5 lbs of bodyweight while adding 50 lbs of load', t:s => s.bwDelta <= -5 && s.loadAdded >= 50 },
  { id:'pr50',      cat:3, ico:'target', n:'Never Satisfied',  req:'50 working-weight increases',    t:s => s.prs >= 50 },
  { id:'load500',   cat:3, ico:'peak',   n:'Plus Five Hundred',req:'+500 lbs of load added',         t:s => s.loadAdded >= 500 },
  { id:'load1000',  cat:3, ico:'trophy', n:'Plus One Thousand',req:'+1,000 lbs of load added',       t:s => s.loadAdded >= 1000 },
];

/* Flatten consistency + strength into the shape the tests above expect.
   `st` is always the PROVEN view — a weight you typed but have not trained
   unlocks nothing, which is what lets a back-off roll cleanly back. */
export function earned(cs, st) {
  /* The balance badges ask about the sheet, so they read the same set the
     letter does — otherwise "every scored lift at C or above" could be
     failed by a weight sitting on an alternate that is not on screen and
     cannot be raised. Best-lift and max-ratio stay over everything: a lift
     you genuinely hit counts whether or not it is currently displayed. */
  const pcts = st.counted.map(l => l.pct);
  const flat = {
    ...cs,
    rankIdx: st.counted.length ? st.rank.i : 0,
    scored: st.counted.length,
    bestLift: st.lifts.reduce((a, l) => Math.max(a, l.rank.i), 0),
    minPct: pcts.length ? Math.min(...pcts) : 0,
    spread: pcts.length ? Math.max(...pcts) - Math.min(...pcts) : 999,
    maxRatio: st.lifts.reduce((a, l) => Math.max(a, l.ratio), 0),
    allLogged: st.totalScorable > 0 && st.scoredReachable >= st.totalScorable,
  };
  return new Set(BADGES.filter(b => b.t(flat)).map(b => b.id));
}

/* Milestones latch. Reaching B is a thing that happened on a date, so a
   deload six months later shouldn't silently delete it — it stops being
   HELD, which the grid says out loud, and that is a different statement.

   Latching only ever reads proven state, which is what makes the rollback
   complete: a weight you set and backed off before training never unlocked
   anything, so there is nothing to take away afterwards. */
function latch(cs, pv) {
  const held = achAll(), d = todayStr();
  const now = earned(cs || stats(), pv || strength().proven);
  let dirty = false;
  now.forEach(id => { if (!held[id]) { held[id] = d; dirty = true; } });
  if (dirty) achSv(held);
  return held;
}

/* What the grid draws: everything ever earned, everything held right now,
   and the date each was earned. */
export function achievements(cs, st) {
  const now = earned(cs, st.proven);
  const held = latch(cs, st.proven);
  return { ids: new Set([...Object.keys(held), ...now]), now, at: held };
}

/* ═══════════════════ DATES ═══════════════════ */
const dOf = ds => new Date(ds + 'T00:00:00');
function addDays(dt, n) { const d = new Date(dt); d.setDate(d.getDate() + n); return d; }
function weekStart(dt) { const d = new Date(dt); d.setHours(0,0,0,0); return addDays(d, -((d.getDay() + 6) % 7)); }
function eachDate(fromStr, toStr, fn) {
  const end = dOf(toStr);
  for (let d = dOf(fromStr), g = 0; d <= end && g < 4000; d = addDays(d, 1), g++) fn(dateStr(d), d);
}
const fmtD = ds => dOf(ds).toLocaleDateString('en-US', { month:'short', day:'numeric' });
const fmtN = n => n.toLocaleString('en-US');

/* How many sets the program PRESCRIBES for this exercise — the leading
   number, exactly as written, never doubled. This is the count of times
   you set up and lift, which is what a rep log needs one row per. */
export const setCountOf = ex => { const m = /^(\d+)/.exec(ex.s || ''); return m ? +m[1] : 2; };
export const isUnilateral = ex => /\/\s*(leg|side|arm)/i.test(ex.s || '');

/* Hard sets for the volume tally, where a unilateral exercise counts twice
   because you do perform the work twice.

   What that number is NOT is a per-muscle training dose, and the badge
   copy has to stay on the right side of it. "2×F /side" doubled to 4 is
   four sets of WORK, but each side received two — so an exercise counted
   as four sets here delivers the same stimulus to a given limb as an
   exercise counted as two. Reading the total as per-muscle volume
   overstates unilateral work by exactly a factor of two.

   It also counts what was prescribed, not what was done: the checkmark
   says you finished the exercise, not that every set reached the effort
   the program asked for, and warm-up sets in the tally are still sets.
   The number is an attendance-weighted volume proxy. Treated as that it
   is useful, and the badges that read it say so. */
export function setsOf(ex) {
  return isUnilateral(ex) ? setCountOf(ex) * 2 : setCountOf(ex);
}

/* ═══════════════════ WEIGHT HISTORY ═══════════════════ */

/* Which movements each program day puts under load, resolved for the current
   pull-up-bar setting. Finishing that day is what proves the weights sitting
   on those movements. */
function dayLifts() {
  return PROGRAM.map(d => {
    const s = new Set();
    d.sections.forEach(sec => sec.ex.forEach(e => s.add(resEx(e).n)));
    return s;
  });
}

/* Entries written after this feature always carry a `p`, stamped at the
   moment a session closes — which is exact, so bumping a weight in the
   evening after training in the morning stays correctly unproven. Older
   entries carry none, and fall back to the question the flag stands in for:
   has a session that trains this lift happened since the weight was set? */
function provenTest() {
  const log = logAll(), days = dayLifts();
  return e => e.k === 'void' ? false
            : ('p' in e)     ? !!e.p
            : log.some(s => s.d >= e.d && days[s.di]?.has(e.ex));
}

/* The corrected reading of bp_pr, and the one asymmetry the whole thing
   rests on: an increase only counts once you have trained it, a decrease
   counts the moment you make it. Claims upward have to be earned; you can't
   quietly hide a drop. Voided entries contribute nothing in either
   direction, and baselines are a starting point rather than load added.

   netAdded therefore lands on exactly the same number as the proven
   strength model — it is what you can currently do, minus where you began,
   and no amount of typing moves it. */
/* `kind` is stamped here because the stored shape is a trap: an increase
   carries NO `k` at all — it is the fall-through case — while 'base',
   'down' and 'void' are labelled. Any reader that goes looking for
   `k === 'up'` finds nothing, ever, and silently concludes you have never
   added weight in your life. That is not hypothetical; the checkup shipped
   with exactly that bug. Every consumer downstream reads `kind`. */
const kindOf = e => e.k === 'void' ? 'void'
                  : e.k === 'base' ? 'base'
                  : e.k === 'down' ? 'down'
                  : 'up';

function weightHistory() {
  const isProven = provenTest();
  const entries = prAll().map(e => ({ ...e, proven: isProven(e), kind: kindOf(e) }));
  const byLift = new Map();
  let grossAdded = 0, givenBack = 0, pendingLoad = 0, prs = 0, backoffs = 0, voids = 0;

  entries.forEach(e => {
    if (e.k === 'void') { voids++; return; }
    let L = byLift.get(e.ex);
    if (!L) byLift.set(e.ex, L = { name: e.ex, base: e.k === 'base' ? e.to : e.from, cur: 0, peak: 0, provenW: 0 });
    if      (e.k === 'base') { /* a starting point is not load you added */ }
    else if (e.k === 'down') { givenBack += e.from - e.to; backoffs++; }
    else if (e.proven) {
      grossAdded += e.to - e.from;
      /* only a NEW high is a record — regaining ground you deloaded from
         is progress, but it isn't a PR */
      if (e.to > L.peak) prs++;
    }
    else pendingLoad += e.to - e.from;              // claimed, not yet earned
    L.cur = e.to;
    if (e.to > L.peak) L.peak = e.to;
    if (e.proven) L.provenW = e.to;
  });
  return { entries, byLift, netAdded: grossAdded - givenBack,
           grossAdded, givenBack, pendingLoad, prs, backoffs, voids };
}

/* What you have actually trained at, per lift. Never above the current
   working weight — you can't be proven at 100 while set to 90. */
function provenMap(w, hist) {
  const pm = {};
  Object.keys(w).forEach(n => {
    const L = hist.byLift.get(n);
    /* No history at all means the weight predates the log and has never been
       edited since, so the honest reading is that it's what you already
       train at. Anything else would wipe a returning user's rank. */
    pm[n] = L ? Math.min(w[n], L.provenW || 0) : w[n];
  });
  return pm;
}

/* The weight the log currently implies for a lift, which is what a new
   entry has to hang off — using the raw bp_wt value instead would let the
   two drift apart and break the telescoping above. */
function recordedOf(l, name, fallback) {
  for (let i = l.length - 1; i >= 0; i--)
    if (l[i].ex === name && l[i].k !== 'void') return l[i].to;
  return fallback;
}

/* ═══════════════════ STRENGTH SCORING ═══════════════════ */

/* Epley: a working weight taken to failure at `reps` implies this 1RM. */
const est1RM = (w, r) => w * (1 + r / 30);

/* Where `ratio` sits on this lift's tier ladder, as a percentile.
   Linear between the published anchors; tapered above Elite so a huge
   number can't run away to 100.

   Two kinds of number come out of this and they are not worth the same.
   Between the anchors it interpolates, which assumes the distribution is
   locally straight between two published points — close enough, and the
   anchors themselves are real. Above the top anchor there is no data at
   all: the 60 in the last line is a taper chosen so the scale stays
   monotonic and bounded, not a measurement of how rare a lift that size
   is. A 99.4 from up there means "past the published elite benchmark",
   and `beyond` is set on the lift so the UI can say that instead of
   printing an invented decimal with a straight face. */
function pctFor(ratio, tiers) {
  if (ratio <= tiers[0]) {
    /* Below the Beginner anchor. Guard against anchors that are zero or
       negative — weighted pull-ups start out assisted, so theirs is -0.20. */
    if (tiers[0] <= 0) return 0;
    return Math.max(0, (ratio / tiers[0]) * TIER_PCT[0]);
  }
  for (let k = 0; k < tiers.length - 1; k++) {
    if (ratio < tiers[k + 1]) {
      const span = tiers[k + 1] - tiers[k];
      const t = span > 0 ? (ratio - tiers[k]) / span : 0;
      return TIER_PCT[k] + t * (TIER_PCT[k + 1] - TIER_PCT[k]);
    }
  }
  return Math.min(99.9, TIER_PCT[4] + (ratio / tiers[4] - 1) * 60);
}

/* Reps to read this lift at, as a resolved number. Three sources, in
   descending order of how much they are worth:

     1. counted    what you logged for this lift at this weight (repsRead)
     2. spec.reps  a per-lift assumption, for movements whose failure point
                   sits nowhere near the dial — a calf raise does not fail
                   where a press does
     3. the dial   one number for the whole sheet

   Only the first is a measurement. Everything downstream carries `logged`
   alongside the number so the UI can keep saying which one it got. */

/* The ratio a lift scores at, and the inverse: what working weight would
   be needed to hit a target ratio. Both branch on how the source measures
   the lift — per dumbbell, summed across two, or added onto bodyweight. */
/* `bw` and `ref` are the same number under bodyweight scoring and diverge
   under lean scoring, and the two are NOT interchangeable. On an 'added'
   lift — a weighted pull-up — bodyweight is both the thing being lifted and
   the thing being divided by, and only the divisor is allowed to move: you
   haul your actual mass over the bar whatever the tab has been told to
   score against. So `bw` stays real on the load side and `ref` takes the
   denominator. */
function ratioOf(spec, wv, bw, ref, n) {
  if (spec.mode === 'added') return (est1RM(bw + wv, n) - bw) / ref;
  return est1RM(wv * (spec.mult || 1), n) / ref;
}
function weightFor(spec, targetRatio, bw, ref, n) {
  const e = 1 + n / 30;
  if (spec.mode === 'added') return (bw + targetRatio * ref) / e - bw;
  return (targetRatio * ref) / (e * (spec.mult || 1));
}

/* The scored lifts you can actually reach right now. Pull-Ups and Single-Arm
   Rows are alternates of one another, so exactly one of the two is ever on
   screen — counting the whole LIFTS table would leave "Full Sheet" one lift
   short of completable no matter what you log. */
function reachableLifts() {
  const out = new Set();
  PROGRAM.forEach(d => d.sections.forEach(s => s.ex.forEach(e => {
    const n = resEx(e).n;
    if (LIFTS[n]) out.add(n);
  })));
  return out;
}

/* Score one map of working weights. Called twice — once with what you have
   set, once with what you have proven — so the two views can never drift
   apart in their maths. */
function scoreAll(w, bodyweight, ref, r, reach) {
  const out = { lifts: [], counted: [], overall: 0, rank: rankFor(0),
                scored: 0, scoredReachable: 0, totalScorable: reach.size,
                offSheet: 0, loggedReps: 0 };
  if (!bodyweight) return out;

  const xr = xrepsAll();
  Object.keys(LIFTS).forEach(name => {
    const wv = w[name];
    if (!(wv > 0)) return;
    const spec = LIFTS[name], tiers = spec.r;
    const rr = repsRead(name, spec, wv, r, xr);
    const ratio = ratioOf(spec, wv, bodyweight, ref, rr.n);
    const pct = pctFor(ratio, tiers);
    const rk = rankFor(pct);
    /* lbs of working weight still needed for the next letter */
    let need = null;
    if (rk.next) {
      const ti = TIER_PCT.indexOf(rk.next.min);
      const targetRatio = ti >= 0 ? tiers[ti] : tiers[tiers.length - 1] * 1.08;
      need = Math.max(0, weightFor(spec, targetRatio, bodyweight, ref, rr.n) - wv);
    }
    out.lifts.push({
      name, w: wv, ratio, pct, rank: rk, need,
      /* the 1RM the ratio was actually derived from */
      oneRM: spec.mode === 'added' ? ratio * ref : est1RM(wv * (spec.mult || 1), rr.n),
      oneRMLabel: spec.mode === 'added' ? 'est. 1RM added' : 'est. 1RM',
      /* how that 1RM was arrived at — counted, or assumed and from where */
      reps: rr.n, repsLogged: rr.logged, repsStale: rr.stale, repsStaleW: rr.staleW,
      repSets: rr.sets, repsDate: rr.d, drop: rr.logged ? dropOff(rr.sets) : null,
      /* Epley past ~12 reps is a long extrapolation off one linear term,
         so the number is printed with a qualifier rather than a decimal. */
      approx: rr.n > EPLEY_SOFT_MAX,
      /* past the top published anchor, where the percentile is a taper
         rather than a reading — see pctFor */
      beyond: ratio > tiers[tiers.length - 1],
      src: spec.src, srcLabel: SRC_LABEL[spec.src],
      /* only worth a tooltip when the standard isn't a direct match or there's
         a genuine caveat — otherwise every row grows a badge and says nothing */
      note: spec.note ? `${spec.note}${spec.base && spec.base !== 'None published' ? ` (Standard: ${spec.base}.)` : ''}` : null,
    });
  });

  out.scored = out.lifts.length;
  out.lifts.sort((a, b) => b.pct - a.pct);

  /* THE SCORE IS THE SHEET YOU CAN SEE.

     Pull-Ups and Single-Arm Rows are alternates: exactly one of the two is
     ever on screen, decided by whether you own a bar. Both can still carry
     a weight from whenever the setting was last the other way, and the old
     average counted every lift with a weight on it — so the hidden one
     went on moving the letter, and toggling a piece of equipment in
     Settings changed the grade without anybody lifting anything.

     `reach` already knows which lifts are actually in play, and
     scoredReachable was already computed from it for the completion
     count; the average simply was not using it. It is now, so the letter
     answers one question with one set of lifts. The off-sheet weights are
     kept, still listed, and still scored individually — they are history,
     not input. */
  out.counted = out.lifts.filter(l => reach.has(l.name));
  out.scoredReachable = out.counted.length;
  out.offSheet = out.scored - out.counted.length;
  out.loggedReps = out.counted.filter(l => l.repsLogged).length;
  if (out.counted.length) {
    out.overall = out.counted.reduce((a, l) => a + l.pct, 0) / out.counted.length;
    out.rank = rankFor(out.overall);
    out.strongest = out.counted[0];
    out.weakest = out.counted[out.counted.length - 1];
  }
  return out;
}

export function strength() {
  const bw = weighed(load('bp_bw', []));
  const bodyweight = bw.length ? bw[bw.length - 1].w : null;
  const r = reps(), w = wts(), reach = reachableLifts();
  const hist = weightHistory(), pw = provenMap(w, hist);

  /* Lean scoring is a request, not a guarantee: it needs a tape measurement
     to produce a lean mass, and the setting can be on for weeks before one
     arrives. Without it, fall back to bodyweight silently and let `usingLean`
     tell the UI which of the two actually happened. */
  const lean = bodySnap().lean;
  const ref = scoringRef(lean);
  const usingLean = ref !== null && bodyweight !== null;
  const divisor = usingLean ? ref : bodyweight;

  const out = { bodyweight, lean, usingLean, ref: divisor,
                reps: r, ...scoreAll(w, bodyweight, divisor, r, reach) };

  /* The same scoring run over proven weights only. This is the view that
     earns things; the live one above is what you see while you decide. */
  out.proven = scoreAll(pw, bodyweight, divisor, r, reach);
  out.lifts.forEach(l => { l.provenW = pw[l.name] || 0; l.pending = l.provenW < l.w; });
  out.pending = out.lifts.filter(l => l.pending);
  /* Untested weights including unscored movements and the no-bodyweight
     case, which the pending count on the Progression card still needs. */
  out.pendingAll = Object.keys(w).filter(n => w[n] > 0 && (pw[n] || 0) < w[n]);
  return out;
}

export function setReps(r) { if (REP_OPTS.includes(+r)) sReps(+r); }

/* Scored lifts keyed by exercise name, for callers outside the Rank tab
   that need a lift's standing — the Program tab colours each row with it.
   Empty until a bodyweight and a working weight both exist. */
/* The map, plus the one fact about HOW it was scored that the Program tab's
   tooltips need. Returned from the same run rather than fetched by a second
   strength() call, which would re-score every lift to read one boolean. */
export function liftScores() {
  const st = strength();
  const map = new Map(st.lifts.map(l => [l.name, l]));
  map.basisWord = st.usingLean ? 'lean mass' : 'bodyweight';
  return map;
}

/* Where a single lift stands, including the reasons it might not have a
   score. The weight editor has to explain itself rather than just go blank. */
export function standingOf(name) {
  if (!LIFTS[name]) return { state: 'unscored' };
  const st = strength();
  if (!st.bodyweight) return { state: 'nobw' };
  const lift = st.lifts.find(l => l.name === name);
  return lift ? { state: 'scored', lift } : { state: 'noweight' };
}

/* ═══════════════════ LEVEL ═══════════════════ */

/* Sessions to climb from level L to L+1. The first step is a single
   session, then they widen — at five sessions a week that is a level every
   fortnight or so by the half-year mark, and one a month after two years. */
const levelStep = L => 1 + Math.floor(L / 2);

/* Attendance words on purpose, so none of them can be read as a strength
   claim next to the letter's names. */
const LEVEL_TITLES = [
  [1, 'Day One'], [2, 'Walk-On'], [5, 'Regular'], [10, 'Fixture'], [15, 'Grinder'],
  [20, 'Veteran'], [30, 'Old Hand'], [40, 'Lifer'], [50, 'Institution'],
];
const levelTitle = n => LEVEL_TITLES.reduce((t, [min, name]) => n >= min ? name : t, LEVEL_TITLES[0][1]);

/* Nothing is stored for the level: it is a function of the session count,
   so it follows the log in both directions and a log reset takes it too. */
export function levelOf(sessions) {
  let n = 1, into = sessions, need = levelStep(1);
  while (into >= need) { into -= need; n++; need = levelStep(n); }
  return { n, into, need, sessions, title: levelTitle(n) };
}
export const levelNow = () => levelOf(logAll().length);

/* ═══════════════════ CONSISTENCY STATS ═══════════════════ */

/* Where each scheduled day's work actually landed.

   Miss Monday, tick Monday's card and Tuesday's card on Tuesday, and the
   work was moved, not skipped — so Monday stops reading as a miss. The
   window is the Monday-start week, the same unit perfect weeks already
   use: this week's Monday can still be made up on Sunday, and a Monday
   from three weeks ago cannot be made up at all.

   Returns 'done' when the day's own card was finished on the day itself,
   otherwise the date its work landed on, otherwise null. */
function coverage(log) {
  const byWeek = new Map();
  log.forEach(e => {
    const k = dateStr(weekStart(dOf(e.d)));
    if (!byWeek.has(k)) byWeek.set(k, new Map());
    const m = byWeek.get(k);
    m.set(e.di, [...(m.get(e.di) || []), e.d]);
  });
  return (ds, dow) => {
    const di = DI_OF_DOW[dow];
    if (di === undefined) return null;
    const on = byWeek.get(dateStr(weekStart(dOf(ds))))?.get(di);
    if (!on) return null;
    return on.includes(ds) ? 'done' : [...on].sort()[0];
  };
}

/* A made-up day keeps the run alive without adding to it. The streak counts
   days you trained, and handing five days to one Sunday because five cards
   got ticked that afternoon is exactly the kind of number this file refuses
   to print — so a makeup bridges the gap and does nothing else. Miss Monday,
   double up Tuesday, and the streak reads 4 → 5, not 4 → 6 and not 0 → 1. */
function streaksFrom(hits, firstDate, cover) {
  const today = todayStr();
  if (!firstDate) return { streak:0, best:0 };
  let cur = 0, best = 0;
  eachDate(firstDate, today, (ds, d) => {
    if (!schedOn(ds, d.getDay())) return;
    if (hits.has(ds)) { cur++; best = Math.max(best, cur); return; }
    if (cover(ds, d.getDay())) return;        // made up later the same week
    if (ds !== today) cur = 0;
  });
  return { streak: cur, best };
}

/* Tape-derived numbers for the body badges. Isolated and total-failure-safe:
   no profile, no height, no tape, a waist typed into the neck box — every
   one of those has to come back as a number the tests can compare against
   rather than an exception on the Rank tab. */
function bodyStats() {
  try {
    const t = taped(load('bp_bw', []));
    const h = prof().h;
    const first = t.length ? navyBF(t[0].wa, t[0].nk, h) : null;
    const now = t.length ? navyBF(t[t.length - 1].wa, t[t.length - 1].nk, h) : null;
    return {
      tapes: t.length,
      bf: now,
      bfDrop: (first !== null && now !== null) ? first - now : 0,
    };
  } catch {
    return { tapes: 0, bf: null, bfDrop: 0 };
  }
}

export function stats() {
  const log = logAll(), h = weightHistory();
  const hits = new Set(log.map(e => e.d));
  const firstDate = log.length ? log[0].d : null;
  const cover = coverage(log);
  const { streak, best } = streaksFrom(hits, firstDate, cover);

  const weeks = new Map();
  log.forEach(e => {
    const k = dateStr(weekStart(dOf(e.d)));
    if (!weeks.has(k)) weeks.set(k, new Set());
    weeks.get(k).add(e.di);
  });
  let perfectWeeks = 0;
  weeks.forEach((set, k) => { if (set.size >= weekTargetFor(k)) perfectWeeks++; });

  /* longest layoff between two logged sessions */
  const days = [...new Set(log.map(e => e.d))].sort();
  let maxGap = 0;
  for (let i = 1; i < days.length; i++) {
    const g = Math.round((dOf(days[i]) - dOf(days[i - 1])) / 86400000);
    if (g > maxGap) maxGap = g;
  }
  const bwLog = weighed(load('bp_bw', []));

  const s = {
    log, prList: h.entries, hits, firstDate, cover,
    sessions: log.length,
    sets: log.reduce((a, e) => a + (e.sets || 0), 0),
    /* Records, not edits: an increase counts once it clears that lift's
       previous high AND you have trained it. Load added is net — every
       back-off comes back off it, every rolled-back increase was never in
       it, and a weight you have only typed is waiting in pendingLoad. */
    prs: h.prs,
    loadAdded: h.netAdded,
    grossAdded: h.grossAdded,
    givenBack: h.givenBack,
    pendingLoad: h.pendingLoad,
    backoffs: h.backoffs,
    voids: h.voids,
    streak, best,
    weekDone: weeks.get(dateStr(weekStart(new Date())))?.size || 0,
    weekTarget: weekTargetFor(dateStr(weekStart(new Date()))),
    perfectWeeks, maxGap,
    level: levelOf(log.length),
    bwCount: bwLog.length,
    bwDelta: bwLog.length >= 2 ? bwLog[bwLog.length - 1].w - bwLog[0].w : 0,

    /* Fields below exist only for badge tests, and every one of them has a
       literal fallback rather than an undefined. earned() runs on every
       render of this tab, and a test that throws on a missing field takes
       the whole tab down with it — so null-or-number, never absent. */
    daysIn: firstDate
      ? Math.max(0, Math.round((dOf(todayStr()) - dOf(firstDate)) / 86400000))
      : 0,
    /* Distinct weekdays ever trained. The program asks for four, so getting
       all seven means make-up days, holidays and at least one odd Sunday. */
    dowCount: new Set(log.map(e => dOf(e.d).getDay())).size,
    ...bodyStats(),
  };
  return s;
}

export const isLoggedToday = di => logAll().some(e => e.d === todayStr() && e.di === di);

/* ═══════════════════ WRITES ═══════════════════ */
/* A point-in-time picture of everything that can "level up". Callers that
   mutate bp_wt must capture this BEFORE writing, since lift tiers are read
   back out of bp_wt — otherwise before and after are identical and the
   tier-up goes unnoticed. */
export function snapshot() {
  const st = strength(), cs = stats(), pv = st.proven;
  return {
    rankIdx: pv.rank.i,
    rank: pv.rank,
    level: cs.level,
    lifts: new Map(pv.lifts.map(l => [l.name, { i: l.rank.i, rank: l.rank }])),
    badges: new Set([...Object.keys(achAll()), ...earned(cs, pv)]),
  };
}

function diff(before, after, ctx) {
  const rankUp = after.rankIdx > before.rankIdx ? after.rank : null;
  const levelUp = after.level.n > before.level.n ? after.level : null;
  const tierUps = [];
  after.lifts.forEach((cur, name) => {
    const prev = before.lifts.get(name);
    if (prev && cur.i > prev.i) tierUps.push({ name, rank: cur.rank });
  });
  const badges = BADGES.filter(b => after.badges.has(b.id) && !before.badges.has(b.id));
  if (!rankUp && !levelUp && !tierUps.length && !badges.length) return null;
  return { rankUp, levelUp, tierUps, badges, ...ctx };
}

/* A day logs itself the moment its last exercise is checked; unchecking on
   the same day removes it again, so a mis-tap is reversible. */
export function syncDay(di, tally) {
  const complete = tally.tot > 0 && tally.done === tally.tot;
  const d = todayStr(), l = logAll();
  const i = l.findIndex(e => e.d === d && e.di === di);
  if (!complete) {
    if (i >= 0) { l.splice(i, 1); logSv(l); return { unlogged: true }; }
    return null;
  }
  if (i >= 0) return null;
  const before = snapshot();
  l.push({ d, di, ex: tally.done, sets: tally.sets });
  logSv(l);
  proveDay(di);                       // finishing the work is what banks it
  const after = snapshot();
  latch();
  return { logged: true, label: PROGRAM[di].label, ...(diff(before, after, {}) || {}) };
}

/* Finishing a day turns the weights on that day's movements from a claim
   into a fact. Stamped here, at the moment the session closes, so it can't
   be back-dated by editing a weight later the same evening. */
function proveDay(di) {
  const names = dayLifts()[di], w = wts(), l = prAll();
  let dirty = false;
  l.forEach(e => {
    if (e.p || e.k === 'void' || !names?.has(e.ex)) return;
    if (!(w[e.ex] >= e.to)) return;   // you trained at least what it claims
    e.p = 1; dirty = true;
  });
  if (dirty) prSv(l);
}

/* Walk back from the newest entry undoing weight that was never trained.
   Stops dead at the first proven entry: history you actually lifted under
   does not get rewritten by one bad session. */
function retractTo(l, name, target, isProven, rolled) {
  for (let i = l.length - 1; i >= 0; i--) {
    const e = l[i];
    if (e.ex !== name || e.k === 'void') continue;
    if (e.to <= target || isProven(e)) return;
    e.hi = Math.max(e.hi || 0, e.to);              // what the attempt reached
    /* a baseline or an in-progress back-off just moves down with you; an
       increase you only partly gave back is trimmed to what's left */
    if (e.k === 'base' || e.k === 'down' || e.from < target) { e.to = target; rolled.push(e); return; }
    e.k = 'void'; rolled.push(e);                  // gone entirely, keep looking
  }
}

/* The mirror image. Coming back up from a back-off you never trained under
   cancels it, rather than logging a fresh "increase" for ground you had. */
function unBackoff(l, name, target, isProven, rolled) {
  for (let i = l.length - 1; i >= 0; i--) {
    const e = l[i];
    if (e.ex !== name || e.k === 'void') continue;
    if (e.k !== 'down' || isProven(e)) return;
    if (target < e.from) { e.to = target; rolled.push(e); return; }
    e.k = 'void'; rolled.push(e);
  }
}

/* Every working-weight change lands here, in both directions.

   Going up is provisional: the entry is written unproven, so a later drop
   that happens before you ever trained it voids the whole thing instead of
   leaving a phantom +20 sitting in your load total forever. Going down from
   a weight that WAS proven is a real back-off — logged, subtracted, kept,
   because a deload is information rather than an embarrassment. */
export function logWeight(name, prev, next, before) {
  if (!before) before = snapshot();
  const l = prAll(), d = todayStr(), isProven = provenTest();
  const rolled = [];
  const done = kind => {
    const after = snapshot();
    latch();
    return { ...(diff(before, after, {}) || {}),
             change: { name, from: prev || 0, to: next, kind, rolled } };
  };

  const has = l.some(e => e.ex === name && e.k !== 'void');
  const from0 = prev > 0 ? prev : 0;

  /* Clearing the field is untracking the movement, not lifting zero. What
     you proved stays on the record; what you only claimed does not. */
  if (!(next > 0)) {
    l.forEach(e => {
      if (e.ex !== name || e.k === 'void' || isProven(e)) return;
      e.hi = Math.max(e.hi || 0, e.to); e.k = 'void'; rolled.push(e);
    });
    prSv(l);
    return done('clear');
  }

  if (!has) {
    /* The first weight on a lift is a baseline, not an increase — there is
       nothing to have improved on. One already sitting in bp_wt predates the
       log, so it goes in proven: it isn't a claim this edit is making. */
    l.push({ d, ex: name, from: 0, to: from0 || next, k: 'base', p: from0 ? 1 : 0 });
    if (!from0) { prSv(l); return done('base'); }
  }

  const rec = recordedOf(l, name, from0);
  if (next < rec) retractTo(l, name, next, isProven, rolled);
  else if (next > rec) unBackoff(l, name, next, isProven, rolled);
  const now = recordedOf(l, name, from0);          // after any rollback

  if (now < next) {
    const same = l.filter(e => e.ex === name && e.d === d && !e.k && !isProven(e)).pop();
    if (same) same.to = next; else l.push({ d, ex: name, from: now, to: next, p: 0 });
  } else if (now > next) {
    const same = l.filter(e => e.ex === name && e.d === d && e.k === 'down' && !isProven(e)).pop();
    if (same) same.to = next; else l.push({ d, ex: name, from: now, to: next, k: 'down', p: 0 });
  }
  prSv(l);
  return done(now < next ? 'up' : now > next ? 'down' : rolled.length ? 'rollback' : 'none');
}

/* "I had this one wrong."

   A back-off and a correction look identical in the data and mean opposite
   things. Backing off is real: you could do 80 and now you cannot, so the
   load you gave back comes off the total, and it should. A correction is
   not — you were doing the movement wrong, the 52.5 was never a working
   weight, and netting it against the total takes away load you genuinely
   added to other lifts as the price of being honest about one.

   The app cannot tell them apart, so it asks. Choosing correction voids
   this lift's history rather than subtracting it: the number that was never
   true stops counting in either direction, and the lift starts again from
   what you are actually doing.

   Deliberately NOT proven. Re-baselining is a claim about today, and the
   rest of this file only lets a claim become load once a session has
   trained it — an escape hatch that launders untested weight into a total
   would be a worse bug than the one it fixes. Train it once and it counts,
   like everything else here. */
export function rebaseline(name) {
  const l = prAll(), cur = wts()[name] || 0;
  let voided = 0, reclaimed = 0;
  l.forEach(e => {
    if (e.ex !== name || e.k === 'void') return;
    if (e.k === 'down') reclaimed += e.from - e.to;
    e.hi = Math.max(e.hi || 0, e.to);
    e.k = 'void';
    voided++;
  });
  if (!voided) return { voided: 0, reclaimed: 0 };
  if (cur > 0) l.push({ d: todayStr(), ex: name, from: 0, to: cur, k: 'base', p: 0 });
  prSv(l);
  latch();
  return { voided, reclaimed };
}

/* Has this lift got anything a re-baseline would clear? */
export const hasHistory = name => prAll().some(e => e.ex === name && e.k !== 'void');

/* Proof isn't unwound here: nothing records WHICH session proved a given
   weight, and deleting one old entry out of months of training shouldn't be
   able to un-lift it anyway. */
export function delSession(d, di) {
  logSv(logAll().filter(e => !(e.d === d && e.di === +di)));
}

/* ═══════════════════ RESET ═══════════════════ */

/* Scoped rather than one button. "I want the streak to start again" and "I
   want my rank back to zero" are different requests, and collapsing them
   into a single Erase Everything makes the smaller one cost the larger one.
   Each record says what is computed from it, so the choice can be made on
   what you'd lose rather than on the name of a storage key. */
const RESETS = [
  { id:'log', key:'bp_log', n:'Session log', u:'session',
    d:'Streaks, the heatmap, hard-set totals, your level and every consistency milestone are counted out of this.' },
  { id:'pr',  key:'bp_pr',  n:'Weight-change history', u:'entry', p:'entries',
    d:'Personal records, net load added, back-offs — and the proof that separates a weight you typed from one you have trained. Clearing it makes every current weight read as a fresh starting point.' },
  { id:'wt',  key:'bp_wt',  n:'Working weights', u:'lift',
    d:'The letter is computed from these. Clearing them takes every lift back to unscored and the rank to none.' },
  { id:'bw',  key:'bp_bw',  n:'Body log', u:'entry', p:'entries',
    d:'Weigh-ins and tape measurements both. Every standard is relative to bodyweight, so the rank disappears until you log one again — and the body fat estimate, lean mass and calorie targets go with it. Your height and activity setting are left alone.' },
  { id:'ach', key:'bp_ach', n:'Milestone dates', u:'unlocked', p:'unlocked',
    d:'Only the dates. Anything still true at your current numbers re-earns itself on the next render — to genuinely re-lock a milestone, clear what earned it as well.' },
  { id:'xs',  key:'bp_xsets', n:'Counted holds & bodyweight reps', u:'exercise',
    d:'The seconds and reps typed into bodyweight exercises. The move-up check on every skill ladder reads these, so clearing them sends each one back to "not counted". The levels themselves are left alone.' },
  { id:'grip', key:'bp_grip', n:'Grip readings', u:'reading',
    d:'Every dynamometer reading. The grip letter on the Rank tab is read off the latest, so it goes back to empty. Nothing else is scored from these.' },
  { id:'chk', key:'bp_chk', n:'Checkmarks', u:'ticked', p:'ticked',
    d:"Today's ticks on the Program tab. Nothing is scored from them, so this one costs you nothing." },
];

const resetCount = {
  log: () => logAll().length,
  pr:  () => prAll().length,
  wt:  () => Object.keys(wts()).length,
  bw:  () => load('bp_bw', []).length,
  ach: () => Object.keys(achAll()).length,
  xs:  () => Object.keys(xsetsAll()).length,
  grip: () => load('bp_grip', []).length,
  chk: () => Object.values(load('bp_chk', {})).filter(Boolean).length,
};

const plural = (r, c) => c === 1 ? r.u : (r.p || r.u + 's');

export function resetTargets() {
  return RESETS.map(r => {
    const c = resetCount[r.id]();
    return { id:r.id, n:r.n, d:r.d, c, cl: c ? `${c} ${plural(r, c)}` : 'empty' };
  });
}

/* Only ever what was asked for. Settings the reset has no business touching
   — the equipment flag, the rep assumption, the theme — live in their own
   keys and are deliberately not in the table above. */
export function applyReset(ids) {
  const want = new Set(ids);
  RESETS.forEach(r => { if (want.has(r.id)) remove(r.key); });
}

/* ═══════════════════ CELEBRATION ═══════════════════ */
/* Twelve sparks on fixed angles — deterministic, so it looks composed
   rather than random, and it only ever fires on a rank-up or unlock. */
const BURST = Array.from({ length: 12 }, (_, i) =>
  `<i style="--a:${i * 30}deg;--d:${58 + (i % 3) * 22}px;--t:${(i % 4) * 40}ms"></i>`).join('');

export function celebrationHTML(r) {
  if (!r || (!r.rankUp && !r.levelUp && !r.tierUps?.length && !r.badges?.length)) return null;
  let h = '';
  if (r.rankUp) {
    h += `<div class="lv-rank" style="--rc:var(${r.rankUp.c})">
      <div class="lv-kicker">Rank Up</div>
      <div class="lv-letter"><span class="lv-burst">${BURST}</span><span class="lv-badge-hex"><b>${r.rankUp.l}</b></span></div>
      <div class="lv-rank-n">${r.rankUp.name}</div>
      <div class="lv-rank-sub">${r.rankUp.blurb}</div>
    </div>`;
  }
  /* Second billing when it shares the card with a rank-up: the letter is the
     rarer event, and the level wears the accent colour rather than a rank
     colour so the two never read as the same kind of thing. */
  if (r.levelUp) {
    const lv = r.levelUp, left = lv.need - lv.into;
    h += `<div class="lv-level" style="--rc:var(--blue)">
      <div class="lv-kicker ${h ? 'mid' : ''}">Level Up</div>
      <div class="lv-letter"><span class="lv-burst">${BURST}</span><span class="lv-badge-hex"><b>${lv.n}</b></span></div>
      <div class="lv-rank-n">${lv.title}</div>
      <div class="lv-rank-sub">Level ${lv.n} · ${fmtN(lv.sessions)} session${lv.sessions === 1 ? '' : 's'} in · ${left} more to Level ${lv.n + 1}</div>
    </div>`;
  }
  if (r.tierUps?.length) {
    h += `<div class="lv-kicker ${h ? 'mid' : ''}">Lift Tier Up</div>
      <div class="lv-tiers">${r.tierUps.map(t => t.rank ? `
        <div class="lv-tier"><span class="lv-tier-l" style="color:var(${t.rank.c})">${t.rank.l}</span>
        <span class="lv-tier-n">${t.name}</span></div>` : '').join('')}</div>`;
  }
  if (r.badges?.length) {
    h += `<div class="lv-kicker ${h ? 'mid' : ''}">${r.badges.length === 1 ? 'Milestone Unlocked' : `${r.badges.length} Milestones Unlocked`}</div>
      <div class="lv-badges">${r.badges.map(b => `
        <div class="lv-badge"><div class="pg-b-ico on">${svg(b.ico)}</div><div class="lv-badge-n">${b.n}</div></div>`).join('')}</div>`;
  }
  return `<div class="lv-card">${h}<button class="lv-btn" data-act="lv-close">Keep Going</button></div>`;
}

/* ═══════════════════ RENDER ═══════════════════ */

/* Percentile width of each letter band — deliberately to scale, so it's
   obvious how wide "Intermediate" is and how narrow "Elite" is. */
const BANDS = [
  { l:'F', from:0,  to:5,   c:'--rk-f' },
  { l:'D', from:5,  to:20,  c:'--rk-d' },
  { l:'C', from:20, to:50,  c:'--rk-c' },
  { l:'B', from:50, to:80,  c:'--rk-b' },
  { l:'A', from:80, to:95,  c:'--rk-a' },
  { l:'S', from:95, to:100, c:'--rk-s' },
];

function bandTrack(pct, showLabels) {
  const segs = BANDS.map(b =>
    `<div class="rk-seg" style="flex:${b.to - b.from};background:var(${b.c})">${showLabels ? `<span>${b.l}</span>` : ''}</div>`
  ).join('');
  return `<div class="rk-track">
    <div class="rk-segs">${segs}</div>
    <div class="rk-marker" data-pos="${Math.max(0.4, Math.min(99.6, pct)).toFixed(2)}" style="left:0"></div>
  </div>`;
}

/* Exported and rendered at the top of the Program tab. It opened the Rank
   tab for a while, which was the wrong place: the verse is the thing you
   read on the way into a session, not on the way to checking a letter. */
export function verseHTML() {
  const v = verseFor(todayStr());
  return `<div class="pg-card rk-verse">
    <div class="rk-verse-mark">&ldquo;</div>
    <div class="rk-verse-t">${v.t}</div>
    <div class="rk-verse-r">${v.r} <span title="${VERSE_NOTICE}">· NIV · changes daily</span></div>
  </div>`;
}

function heroHTML(st) {
  if (!st.bodyweight) {
    return `<div class="rk-hero" style="--rc:var(--text-3)"><span class="rk-scan"></span>
      <div class="rk-kicker">No Rank</div>
      <div class="rk-hero-row"><div class="rk-badge"><span class="rk-letter">?</span></div>
        <div class="rk-hero-txt"><div class="rk-name">Bodyweight missing</div>
        <div class="rk-blurb">Strength standards are relative to bodyweight. Log yours in the <b>Body</b> tab and this fills in immediately.</div></div></div>
    </div>`;
  }
  if (!st.counted.length) {
    /* Two different nothings. Usually there are no weights at all; rarely
       every weight sits on a movement the current equipment setting has
       swapped off the sheet, and telling that user to go and log a weight
       they already logged would be nonsense. */
    return `<div class="rk-hero" style="--rc:var(--text-3)"><span class="rk-scan"></span>
      <div class="rk-kicker">No Rank</div>
      <div class="rk-hero-row"><div class="rk-badge"><span class="rk-letter">?</span></div>
        <div class="rk-hero-txt"><div class="rk-name">${st.scored ? 'Nothing on your current sheet' : 'No weights logged'}</div>
        <div class="rk-blurb">${st.scored
          ? `Your ${st.scored} logged weight${st.scored === 1 ? ' is' : 's are'} all on movements the current equipment setting has swapped out, so there is nothing on the sheet to score. They are kept and listed below — change the equipment back in <b>Settings</b>, or log a weight on a movement you can reach.`
          : 'Tap any exercise in the <b>Program</b> tab and set its working weight. Rank is computed from what you actually lift — nothing else moves it.'}</div></div></div>
    </div>`;
  }
  const rk = st.rank;
  const beat = Math.round(st.overall);
  const n = st.counted.length;
  const nx = rk.next;
  const pv = st.proven, pend = st.pending.length;
  /* WHY THIS DOES NOT SAY "STRONGER THAN X% OF LIFTERS".

     It used to, and that was the one claim on the tab that the maths could
     not support. Each lift's percentile is real: it comes from a published
     table of that movement at your bodyweight. The average of several of
     them is not a percentile of anything, because no population has ever
     been measured on this particular battery of lifts and ranked by their
     mean. You cannot average your way from per-exercise percentiles to a
     population standing; that would need a reference sample scored the
     same way, and none exists.

     So the composite keeps its letter, its number and its bar — all of
     which are useful for tracking yourself — and drops the sentence that
     placed you among other people. The per-lift rows below still say
     "percentile", because there it is true.

     The disclaimer that used to sit under the bar saying as much is gone
     too: the fix was removing the false claim, and a paragraph explaining
     a claim the tab no longer makes is just more to read. */
  return `<div class="rk-hero" style="--rc:var(${rk.c})"><span class="rk-scan"></span>
    <div class="rk-hero-top">
      <div class="rk-kicker">Strength Score</div>
      <div class="rk-kicker">${n} lift${n === 1 ? '' : 's'} · ${st.usingLean
        ? `${Math.round(st.lean)} lb lean mass` : `${st.bodyweight} lb bodyweight`}</div>
    </div>
    <div class="rk-hero-row">
      <div class="rk-badge"><span class="rk-letter">${rk.l}</span></div>
      <div class="rk-hero-txt">
        <div class="rk-name">${rk.name}</div>
        <div class="rk-pct">Bartleby score <b>${beat}</b> — the average of your ${n} lift percentile${n === 1 ? '' : 's'}</div>
        <div class="rk-blurb">${rk.blurb}</div>
      </div>
    </div>
    ${bandTrack(st.overall, true)}
    <div class="rk-hero-foot">
      <span>${nx ? `Next: <b>${nx.l} · ${nx.name}</b> at a score of ${nx.min}` : 'Off the top of the published data.'}</span>
      <span class="rk-foot-pct" data-cnt="${st.overall.toFixed(1)}" data-dec="1">0.0</span>
    </div>
    ${st.offSheet ? `<div class="rk-hero-note">${st.offSheet} off-sheet weight${st.offSheet === 1 ? '' : 's'} listed below, excluded.</div>` : ''}
    ${pend ? `<div class="rk-pending" title="Milestones and rank-ups land when you finish a session that trains the untested weight. Until then the letter above is what you would rank if it holds.">
      <b>${pend} untested lift${pend === 1 ? '' : 's'}</b>, so this is an estimate.
      ${pv.counted.length ? `Confirmed: <b style="color:var(${pv.rank.c})">${pv.rank.l}</b> at ${Math.round(pv.overall)}.`
                  : 'Nothing confirmed yet.'}
    </div>` : ''}
  </div>`;
}

function verdictHTML(st) {
  if (!st.counted.length) return '';
  const w = st.weakest, s = st.strongest;
  const gap = s.pct - w.pct;
  let line;
  if (st.overall < 5)       line = 'You are below the lowest bracket that gets logged. This is the starting line, not a rank.';
  else if (st.overall < 20) line = 'Beginner territory. Everything is a weak point right now, which also means everything responds fast.';
  else if (st.overall < 50) line = 'Below average. You are past novice on some lifts and nowhere near it on others.';
  else if (st.overall < 80) line = 'Average. Respectable, and also the level most people plateau at forever.';
  else if (st.overall < 95) line = 'Advanced. Progress from here is slow and has to be earned in small increments.';
  else                      line = 'Elite by the published standards. Verify your form and rep counts are honest.';
  const spread = gap > 35
    ? `Your lifts are badly uneven — <b>${w.name}</b> sits ${Math.round(gap)} percentile points behind <b>${s.name}</b>. That imbalance is what is dragging the letter down.`
    : `Your lifts are reasonably balanced, within ${Math.round(gap)} percentile points top to bottom.`;
  return `<div class="pg-card rk-verdict">
    <div class="pg-card-head"><div class="pg-card-title">Straight Answer</div></div>
    <div class="rk-verdict-t">${line}</div>
    <div class="rk-verdict-s">${spread}</div>
    <div class="rk-verdict-w">
      <div><span class="rk-vw-l">Weakest</span><span class="rk-vw-n">${w.name}</span><span class="rk-vw-p" style="color:var(${w.rank.c})">${w.rank.l} · ${Math.round(w.pct)}%</span></div>
      <div><span class="rk-vw-l">Strongest</span><span class="rk-vw-n">${s.name}</span><span class="rk-vw-p" style="color:var(${s.rank.c})">${s.rank.l} · ${Math.round(s.pct)}%</span></div>
    </div>
  </div>`;
}

/* The chip on each row saying where its rep count came from, which is the
   difference between an estimate and a guess and is worth one word. */
function repChip(l) {
  if (l.repsLogged) {
    const sets = l.repSets.filter(n => n > 0);
    return `<span class="rk-lift-src counted" title="Counted ${sets.join(', ')} at ${l.w} lbs on ${l.repsDate}. The best set (${l.reps}) is what the estimate is read off — the later ones are lower because of fatigue, not because you got weaker mid-session.">${l.reps} reps</span>`;
  }
  if (l.repsStale)
    return `<span class="rk-lift-src stale" title="Your counted reps were logged at ${l.repsStaleW} lbs and this lift is at ${l.w} now, so they no longer apply. Assuming ${l.reps} until you count a set at the new weight.">reps stale</span>`;
  return `<span class="rk-lift-src assumed" title="No reps counted for this lift, so the estimate assumes ${l.reps}. Open it from the Program tab and log what you actually hit — it is the single biggest thing separating this number from a guess.">assumes ${l.reps}</span>`;
}

function liftsHTML(st) {
  if (!st.bodyweight) return '';
  const rows = st.lifts.map(l => `
    <div class="rk-lift${st.counted.includes(l) ? '' : ' off-sheet'}">
      <div class="rk-lift-top">
        <div class="rk-lift-n">${l.name}${l.srcLabel
            ? `<span class="rk-lift-src ${l.src}" title="${l.note || ''}">${l.srcLabel}</span>`
            : (l.note ? `<span class="rk-lift-src info" title="${l.note}">i</span>` : '')}${repChip(l)}${l.pending
            ? `<span class="rk-lift-src pend" title="No completed session at ${l.w} lbs yet${l.provenW ? ` — last trained at ${l.provenW} lbs` : ''}. This row is an estimate until there is one.">Untested</span>` : ''}${st.counted.includes(l)
            ? '' : `<span class="rk-lift-src off" title="Not on your current sheet — the alternate movement is the one showing, so this weight is kept and scored but left out of the average.">off sheet</span>`}</div>
        <div class="rk-lift-r" style="color:var(${l.rank.c})">${l.rank.l}</div>
      </div>
      ${bandTrack(l.pct, false)}
      <div class="rk-lift-foot">
        <span><b>${l.w}</b> lbs · <b>${l.approx ? '~' : ''}${Math.round(l.oneRM)}</b> ${l.oneRMLabel}${l.approx
            ? ` <span class="rk-lift-src approx" title="Read off a ${l.reps}-rep set. Every 1RM formula loses accuracy as the rep count climbs, and past about 12 it is extrapolating a long way off one linear term — so this is the right order of magnitude rather than a figure to hold to the pound. The ratio and the letter carry the same looseness.">approx</span>`
            : ''} · ${l.ratio.toFixed(2)}× ${st.usingLean ? 'ref' : 'bw'}</span>
        <span class="rk-lift-need">${l.beyond
            ? 'past the top of the table'
            : l.need !== null && l.rank.next
              ? `+${l.need < 1 ? l.need.toFixed(1) : Math.round(l.need)} lbs → ${l.rank.next.l}`
              : 'maxed'}</span>
      </div>
      ${l.drop && l.drop.kind !== 'normal' ? `<div class="rk-lift-drop">${l.drop.t}</div>` : ''}
    </div>`).join('');

  const repBtns = REP_OPTS.map(r =>
    `<button class="rk-rep ${r === st.reps ? 'sel' : ''}" data-act="rk-reps" data-r="${r}">${r}</button>`).join('');

  /* The dial is now a fallback, and saying so is the point: it stops being
     the thing you tune to move your rank and becomes the thing you stop
     needing. */
  const repNote = `<div class="rk-basis-note" title="At 50 lbs, assuming five reps gives a 58 lb 1RM and assuming fifteen gives 75 — same entry, same arithmetic, different guess. Counting the set is what turns it into a measurement. Open a lift from the Program tab to log its sets; the best one scores.">${st.loggedReps
    ? `<b>${st.loggedReps} of ${st.counted.length}</b> lifts use counted reps. The dial fills in for the rest.`
    : `No reps counted yet — every estimate here is running on this dial. Log sets from the <b>Program</b> tab.`}</div>`;

  /* The divisor is no longer a choice, so the only thing left to say is
     when the tape measurement it needs is missing. */
  const basisNote = st.usingLean ? '' : `<div class="rk-basis-note">Scoring against bodyweight — log a waist and neck on the <b>Body</b> tab to score against lean mass instead.</div>`;

  return `<div class="pg-card">
    <div class="pg-card-head">
      <div class="pg-card-title">Every Lift</div>
      <div class="pg-card-note">${st.counted.length} in the score${st.offSheet ? ` · ${st.offSheet} off sheet` : ''}</div>
    </div>
    <div class="rk-reps">
      <span class="rk-reps-l">Assume this many reps<span class="rk-reps-sub">when a lift has none counted</span></span>
      <div class="rk-reps-seg">${repBtns}</div>
    </div>
    ${repNote}
    ${basisNote}
    ${st.lifts.length ? `<div class="rk-lift-list">${rows}</div>`
      : `<div class="pg-empty">No weights set on any scored lift yet.</div>`}
  </div>`;
}

/* ── grip ──
   Its own card and its own letter, off the lift average — see grip.js for
   why. Laid out as one lift row so it reads as the same kind of thing: a
   letter, a band, and what the next one takes. Absent entirely when
   Settings says there is no dynamometer. */
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function gripHTML() {
  if (!gripOn()) return '';
  const g = gripStanding(prof().age), u = gripUnit();
  const other = u === 'lb' ? 'kg' : 'lb';
  const fmt = kg => `${+toGU(kg, u).toFixed(1)}`;
  const unitB = `<button class="bw-unit" data-act="gr-unit" data-u="${other}"`
    + ` title="Showing ${GRIP_UNITS[u].full.toLowerCase()} — tap for ${GRIP_UNITS[other].full.toLowerCase()}"`
    + ` aria-label="Unit: ${GRIP_UNITS[u].full}. Switch to ${GRIP_UNITS[other].full}.">${u}</button>`;

  const form = `<div class="bw-add gr-add">
    <div class="bw-add-fld"><div class="bw-add-lbl">Date</div><input class="bw-in" type="date" id="gr-date" value="${todayStr()}" max="${todayStr()}"></div>
    <div class="bw-add-fld"><div class="bw-add-lbl" title="${GRIP_HOW}">Right ${unitB}</div><input class="bw-in" type="number" step="0.1" min="0" id="gr-r" placeholder="—" inputmode="decimal"></div>
    <div class="bw-add-fld"><div class="bw-add-lbl" title="${GRIP_HOW}">Left <em>${u}</em></div><input class="bw-in" type="number" step="0.1" min="0" id="gr-l" placeholder="—" inputmode="decimal"></div>
    <button class="bw-add-btn" data-act="gr-save">Log</button>
  </div>`;

  if (!g.last) {
    return `<div class="pg-card">
      <div class="pg-card-head"><div class="pg-card-title">Grip Strength</div><div class="pg-card-note">dynamometer</div></div>
      <div class="rk-basis-note">${GRIP_HOW}</div>
      ${form}
    </div>`;
  }

  const rk = rankFor(g.pct);
  /* The table stops at the 90th, and the clamp at 99 means SS is not
     something a grip reading can claim — so past S there is no next. */
  const nx = rk.next && rk.next.min <= 99 ? rk.next : null;
  const need = g.beyond === 'top' ? 'past the top of the table'
    : nx ? `+${fmt(g.need(nx.min))} ${u} → ${nx.l}` : 'maxed';
  const since = g.since && Math.abs(g.since.kg) >= 0.05
    ? ` · ${g.since.kg > 0 ? '+' : '−'}${fmt(Math.abs(g.since.kg))} since ${fmtD(g.since.d)}` : '';

  const hist = [...g.log].reverse().slice(0, 6).map(e => `
    <div class="gr-h">
      <span class="gr-h-d">${fmtD(e.d)}</span>
      <span class="gr-h-v">${e.r ? `R <b>${fmt(e.r)}</b>` : ''}${e.r && e.l ? ' · ' : ''}${e.l ? `L <b>${fmt(e.l)}</b>` : ''}</span>
      <button class="bw-h-btn del" data-act="gr-del" data-d="${e.d}" title="Delete reading" aria-label="Delete the reading from ${fmtD(e.d)}">${TRASH}</button>
    </div>`).join('');

  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Grip Strength</div><div class="pg-card-note">vs ${g.group}</div></div>
    <div class="rk-lift gr-lift">
      <div class="rk-lift-top">
        <div class="rk-lift-n">${rk.name}<span class="rk-lift-src ${g.aged ? 'counted' : 'assumed'}" title="${g.aged
          ? `Compared with ${g.group}, read between the ages the table publishes.`
          : 'No age set on the Body tab, so this compares you with men at the age grip peaks — the strongest group there is. Set an age to match.'}">${g.aged ? 'age-matched' : 'no age'}</span>${g.beyond
          ? `<span class="rk-lift-src approx" title="The table publishes the 10th to the 90th centile. Past either end the percentile comes from a normal tail fitted to that end, so it is the right neighbourhood rather than an exact figure.">approx</span>` : ''}</div>
        <div class="rk-lift-r" style="color:var(${rk.c})">${rk.l}</div>
      </div>
      ${bandTrack(g.pct, false)}
      <div class="rk-lift-foot">
        <span><b>${fmt(g.kg)}</b> ${u} ${g.hand} · ${ord(g.pct)} percentile${since}</span>
        <span class="rk-lift-need">${need}</span>
      </div>
      <div class="gr-med">Stronger than ${Math.round(g.pct)}% of ${g.group}. Their median is ${fmt(g.median)} ${u}.</div>
    </div>
    ${g.aged ? '' : `<div class="rk-basis-note">No age set, so this compares you with men at their peak (30–39), the strongest group there is. Set an age on the <b>Body</b> tab to match.</div>`}
    ${form}
    <div class="gr-hist">${hist}</div>
  </div>`;
}

/* ── consistency ── */
const HM_WEEKS = 16;
function heatmapHTML(s) {
  const start = addDays(weekStart(new Date()), -7 * (HM_WEEKS - 1));
  const today = todayStr();
  let cells = '';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < HM_WEEKS; c++) {
      const d = addDays(start, c * 7 + r), ds = dateStr(d);
      const sched = schedOn(ds, d.getDay());
      const label = PROGRAM[DI_OF_DOW[d.getDay()]]?.label || 'scheduled';
      /* 'done' never reaches the makeup branch — it implies a session that
         date, which is caught above. What is left over is work that moved. */
      const cov = sched ? s.cover(ds, d.getDay()) : null;
      const made = cov && cov !== 'done' ? cov : null;
      let cls, tip;
      if (ds > today)                            cls = 'future', tip = fmtD(ds);
      /* A rest day stays a rest day even when you trained on it. This has to
         come before the hits check: train Tuesday's card on Wednesday and
         both dates would otherwise light up — Wednesday for carrying the
         session, Tuesday for being credited with it — and one session would
         paint two green squares. The grid reports the schedule, so the work
         is credited once, to the day that asked for it. streaksFrom already
         skips unscheduled dates for the same reason. */
      else if (!sched)                           cls = 'rest',   tip = `${fmtD(ds)} · rest day`;
      else if (s.hits.has(ds)) {
        cls = 'hit';
        tip = `${fmtD(ds)} · ${s.log.filter(e => e.d === ds).map(e => PROGRAM[e.di]?.label).join(', ') || 'session'}`;
      }
      /* A made-up day is a done day, all the way down: Tuesday reads as
         trained and says so on hover exactly the way a session done on the
         day would. */
      else if (made)                             cls = 'hit',    tip = `${fmtD(ds)} · ${label}`;
      else if (ds === today)                     cls = 'open',   tip = `Today · ${label}`;
      else if (s.firstDate && ds >= s.firstDate) cls = 'miss',   tip = `${fmtD(ds)} · missed`;
      else                                       cls = 'pre',    tip = fmtD(ds);
      if (ds === today) cls += ' today';
      cells += `<div class="pg-hm-c ${cls}" style="grid-row:${r + 1};grid-column:${c + 1};--c:${c}" title="${tip}"></div>`;
    }
  }
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Consistency</div><div class="pg-card-note">Last ${HM_WEEKS} weeks</div></div>
    <div class="pg-hm-wrap">
      <div class="pg-hm-dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div class="pg-hm">${cells}</div>
    </div>
    <div class="pg-legend">
      <span><i class="pg-hm-c hit"></i>Trained</span>
      <span><i class="pg-hm-c miss"></i>Missed</span>
      <span><i class="pg-hm-c rest"></i>Rest day</span>
    </div>
  </div>`;
}

/* One notch per session the current level asks for, lit as they land —
   the same meter the day cards use, so it reads as the same kind of
   progress. Shared by the Program tab's header and the Rank tab. */
export function levelHTML(lv) {
  const left = lv.need - lv.into;
  const notches = Array.from({ length: lv.need }, (_, i) => `<i class="${i < lv.into ? 'on' : ''}"></i>`).join('');
  return `<div class="tl-card">
    <div class="tl-hex"><span><span class="tl-hex-l">LV</span><span class="tl-hex-n">${lv.n}</span></span></div>
    <div class="tl-body">
      <div class="tl-top"><span class="tl-kicker">Training Level</span><span class="tl-note">${fmtN(lv.sessions)} session${lv.sessions === 1 ? '' : 's'}</span></div>
      <div class="tl-title">${lv.title}</div>
      <div class="tl-meter">${notches}</div>
      <div class="tl-foot"><span><b>${left} more</b> session${left === 1 ? '' : 's'} to Level ${lv.n + 1}</span><span class="tl-note">${lv.into}/${lv.need}</span></div>
    </div>
  </div>`;
}

function tile(label, value, unit, sub, cnt) {
  const v = cnt ? `<span data-cnt="${cnt}" data-fmt="n">0</span>` : value;
  return `<div class="bw-stat">
    <div class="bw-stat-v">${v}${unit ? `<span class="bw-stat-u">${unit}</span>` : ''}</div>
    <div class="bw-stat-l">${label}</div>
    <div class="bw-stat-d ${sub ? 'up' : 'flat'}">${sub || '·'}</div>
  </div>`;
}

/* Days this week whose weekday has passed with their own card still
   unfinished. They can be made up until Sunday, so the card says how many
   are still on the table instead of letting them rot into misses quietly.
   A day you trained on but trained something else is owed like any other —
   its work has not happened yet. */
function owedThisWeek(s) {
  const today = todayStr(), out = [];
  eachDate(dateStr(weekStart(new Date())), today, (ds, d) => {
    if (ds >= today || !schedOn(ds, d.getDay()) || s.cover(ds, d.getDay())) return;
    out.push(PROGRAM[DI_OF_DOW[d.getDay()]].label);
  });
  return out;
}

function nextUpHTML(s) {
  const now = new Date();
  const owed = owedThisWeek(s);
  const tail = owed.length
    ? ` <span class="pg-next-owe" title="${owed.join(', ')}">+${owed.length} to make up</span>` : '';
  for (let i = 0; i < 8; i++) {
    const d = addDays(now, i), ds = dateStr(d);
    if (!schedOn(ds, d.getDay())) continue;
    if (i === 0 && s.hits.has(ds)) continue;
    const when = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dOf(ds).toLocaleDateString('en-US', { weekday:'long' });
    return `<span class="pg-next-w">${when}</span> · ${PROGRAM[DI_OF_DOW[d.getDay()]].label}${tail}`;
  }
  return `Rest up.${tail}`;
}

/* One row of the change feed. Three shapes, because three different things
   can happen to a working weight and flattening them into "+X%" is exactly
   the lie this card used to tell. */
function prRow(p, i) {
  const vd = p.k === 'void', dn = p.k === 'down';
  const to = vd ? (p.hi || p.to) : p.to;            // voids show what was attempted
  const pc = p.from > 0 ? Math.round(((to - p.from) / p.from) * 100) : 0;
  /* Only an increase can be waiting on proof. A back-off has already taken
     effect — saying "untested" there would read as "doesn't count yet". */
  const tag = vd ? 'never trained at it' : (!p.proven && !dn ? 'untested' : '');
  return `<div class="pg-pr ${vd ? 'void' : ''} ${dn ? 'down' : ''}" style="--i:${i}">
    <div class="pg-pr-ex">${p.ex}</div>
    <div class="pg-pr-w"><span class="pg-pr-from">${p.from}</span> → ${to} <span class="pg-pr-u">lbs</span></div>
    <div class="pg-pr-up">${vd ? 'rolled back' : `${pc > 0 ? '+' : ''}${pc}%`}</div>
    <div class="pg-pr-d">${fmtD(p.d)}${dn && !vd ? ' · back-off' : ''}${tag ? ` · <span class="pg-pr-tag">${tag}</span>` : ''}</div>
  </div>`;
}

function progressionHTML(s, st) {
  /* Baselines are where a lift started, not progress — they'd bury the feed
     the day you first fill the sheet in and say nothing. */
  const feed = s.prList.filter(p => p.k !== 'base').slice(-10).reverse()
    .map((p, i) => prRow(p, i)).join('');

  const net = Math.round(s.loadAdded * 10) / 10, down = net < 0;
  const pend = st.pendingAll.length;

  /* The paragraphs that used to sit under the number are gone. What is
     left is the same information as figures: peak, given back, rolled
     back, untested — each a stat you read rather than a sentence you
     wade through. Anything with nothing to report is simply absent. */
  const stats = [
    s.givenBack > 0 ? [`+${fmtN(Math.round(s.grossAdded))}`, 'peak added'] : null,
    s.givenBack > 0 ? [`−${fmtN(Math.round(s.givenBack))}`, `${s.backoffs} back-off${s.backoffs === 1 ? '' : 's'}`] : null,
    s.voids > 0 ? [s.voids, `rolled back`] : null,
    pend ? [pend, `untested${s.pendingLoad > 0 ? ` · ${fmtN(Math.round(s.pendingLoad))} lbs` : ''}`] : null,
  ].filter(Boolean);

  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Progression</div>
      <div class="pg-card-note">${s.prs} personal record${s.prs === 1 ? '' : 's'}</div></div>
    <div class="pg-big">
      <div class="pg-big-v ${down ? 'down' : ''}">${down ? '−' : '+'}<span data-cnt="${Math.abs(net)}" data-fmt="n">0</span><span class="pg-big-u">lbs</span></div>
      <div class="pg-big-l">Net load added${s.givenBack > 0 ? ', after back-offs' : ''}</div>
      ${stats.length ? `<div class="pg-figs">${stats.map(([v, l]) =>
        `<div class="pg-fig"><span class="pg-fig-v">${v}</span><span class="pg-fig-l">${l}</span></div>`).join('')}</div>` : ''}
    </div>
    ${feed ? `<div class="pg-pr-list">${feed}</div>`
           : `<div class="pg-empty">Raise a working weight in any exercise and it lands here.</div>`}
  </div>`;
}

function badgesHTML(ach) {
  /* Three states, not two. "Earned" and "still true" stopped being the same
     thing the moment a back-off could move you back down a letter, and
     deleting the badge would be pretending the month you held it never
     happened. */
  const cell = (b, i) => {
    const on = ach.ids.has(b.id), held = ach.now.has(b.id);
    return `<div class="pg-b ${on ? 'on' : ''} ${on && !held ? 'lapsed' : ''}" style="--i:${i}">
      <div class="pg-b-ico ${on ? 'on' : ''}">${svg(b.ico)}</div>
      <div class="pg-b-n">${b.n}</div>
      <div class="pg-b-r">${!on ? b.req
        : held ? `Unlocked${ach.at[b.id] ? ` · ${fmtD(ach.at[b.id])}` : ''}`
        : 'Earned · not held now'}</div>
    </div>`;
  };

  const groups = CATS.map((title, ci) => {
    const all = BADGES.filter(b => b.cat === ci);
    const got = all.filter(b => ach.ids.has(b.id));
    /* earned first inside each group, so progress reads top-down */
    const ordered = [...got, ...all.filter(b => !ach.ids.has(b.id))];
    /* --i drives the arcade theme's entrance cascade, and it restarts per
       group rather than running across the whole card. Continuous numbering
       meant the last tile's delay grew with the total badge count — at 57 it
       was most of a second, and every badge added made every card slower.
       Per group it is bounded by the largest category instead. */
    let i = 0;
    return `<div class="pg-b-group">
      <div class="pg-b-gt"><span>${title}</span><span class="pg-b-gc ${got.length === all.length ? 'full' : ''}">${got.length}/${all.length}</span></div>
      <div class="pg-b-grid">${ordered.map(b => cell(b, i++)).join('')}</div>
    </div>`;
  }).join('');

  /* No lapsed-badge notice. A badge is a date on the calendar and stays
     unlocked either way, so the line only ever explained a distinction the
     cards themselves do not draw — and the tab is for looking at what you
     earned, not for reading about it. The latching behaviour is unchanged;
     it just no longer narrates itself. */
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Achievements</div><div class="pg-card-note">${ach.ids.size}/${BADGES.length}</div></div>
    ${groups}
  </div>`;
}

function historyHTML(s) {
  if (!s.sessions) return '';
  const rows = [...s.log].reverse().slice(0, 12).map(e => {
    const day = PROGRAM[e.di];
    return `<div class="pg-s-row">
      <span class="day-badge ${day?.day || ''}">${day?.day || '—'}</span>
      <div class="pg-s-body"><div class="pg-s-n">${day?.label || 'Session'}</div><div class="pg-s-d">${fmtD(e.d)} · ${e.sets} sets</div></div>
      <button class="bw-h-btn del" data-act="pg-del" data-d="${e.d}" data-di="${e.di}" title="Delete session">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>`;
  }).join('');
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Session Log</div><div class="pg-card-note">${s.sessions > 12 ? `Last 12 of ${s.sessions}` : `${s.sessions} total`}</div></div>
    <div class="pg-s-list">${rows}</div>
  </div>`;
}

/* ── reset card ── */
/* Closed it is one line and a button; open it is a checklist. Kept at the
   bottom of the tab because it is the one control here that destroys
   something, and it should take a scroll and two taps to reach. */
/* The reset UI moved out of this app entirely — it lives in the shell's
   Settings modal, under a red Danger Zone, beside the backup export that
   is the only way back from it. What stays here is the table itself:
   `resetTargets()` describes what can be cleared and how much is in each,
   and `applyReset()` clears exactly what was asked for. */

const CALM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Skip the animated path entirely when it can't be seen: a hidden tab never
   fires requestAnimationFrame, which would leave counters reading zero. */
const SKIP_FX = () => CALM() || document.hidden;

/* Count numbers up from zero. Cheap, once per render, and skipped entirely
   when the OS asks for reduced motion. */
function tickCounts(scope) {
  scope.querySelectorAll('[data-cnt]').forEach(el => {
    const to = parseFloat(el.dataset.cnt);
    const dec = +(el.dataset.dec || 0);
    const fmt = v => el.dataset.fmt === 'n' ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec);
    if (!isFinite(to) || to <= 0) { el.textContent = fmt(to || 0); return; }
    if (SKIP_FX()) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 650;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* Markers render at 0 and transition out to their real percentile, so the
   bars read as filling toward where you actually are. */
function slideMarkers(scope) {
  scope.querySelectorAll('.rk-marker[data-pos]').forEach(el => {
    const to = el.dataset.pos + '%';
    if (SKIP_FX()) { el.style.left = to; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = to; }));
  });
}

/* The health check. Loud when something is wrong, one quiet line when it
   is not — a card that takes up the same room whether or not it has
   anything to say teaches you to scroll past it. */
function checkupHTML(s, st) {
  const c = checkup(s, st);

  if (c.steady) {
    if (!c.evidence.length) return '';          // too early to claim anything
    return `<div class="ck-card steady">
      <span class="ck-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12.5 9.5 18 20 6.5"/></svg></span>
      <div><b>Everything reads steady.</b> ${c.evidence.join(', ')} — nothing in the numbers looks off.</div>
    </div>`;
  }

  const rows = c.findings.map(f => `
    <div class="ck-row ${f.sev}">
      <div class="ck-t">${f.t}</div>
      <div class="ck-d">${f.d}</div>
    </div>`).join('');

  return `<div class="ck-card">
    <div class="ck-head">
      <span class="ck-title">Worth a look</span>
      <span class="ck-count ${c.warns ? 'warn' : ''}">${c.findings.length}</span>
    </div>
    ${rows}
  </div>`;
}

/* ═══════════════════ THE THREE TABS ═══════════════════

   This was one tab with thirteen sections in it — 6,200px, about eight
   screens, and two sections were sixty per cent of that. The split is not
   an even quartering of the scroll; it follows the line this file's own
   header draws, because that line was always there:

     RANK    the letter. Earned by lifting more, and nothing else moves
             it. Hero, the straight answer, every lift, progression.
     STREAK  attendance. Earned by turning up, and it cannot touch the
             letter. Level, streak tiles, next session, heatmap, log.
     AWARDS  the trophy cabinet. Browsed occasionally, not read every
             session, and on its own it was over a third of the old tab.

   Two scores for two different things, and now two places to read them.

   Each function is self-contained and recomputes what it needs, exactly
   as the single renderRank did. Repainting all three costs what the one
   used to, so nothing got slower by being split up. */

export function renderRank(root) {
  const p = root.querySelector('#p-rank');
  if (!p) return;
  const st = strength(), s = stats();

  /* The checkup reports on lifts AND attendance AND data sanity, so it
     has no natural home in the split. It stays here because this is the
     tab you open to ask how it is going, and a finding you never see is
     worth nothing wherever it is filed. */
  let h = heroHTML(st);
  h += checkupHTML(s, st);
  h += verdictHTML(st);
  h += liftsHTML(st);
  h += gripHTML();
  h += progressionHTML(s, st);
  p.innerHTML = h;
  tickCounts(p);
  slideMarkers(p);
}

export function renderStreak(root) {
  const p = root.querySelector('#p-streak');
  if (!p) return;
  const s = stats();

  let h = levelHTML(s.level);
  h += `<div class="bw-stats pg-tiles">
    ${tile('Streak', s.streak, s.streak === 1 ? 'day' : 'days', s.streak && s.streak === s.best ? 'personal best' : '', s.streak)}
    ${tile('Best', s.best, s.best === 1 ? 'day' : 'days', '', s.best)}
    ${tile('This Week', `${s.weekDone}/${s.weekTarget}`, '', s.weekDone >= s.weekTarget ? 'perfect' : '')}
    ${tile('Sessions', fmtN(s.sessions), '', s.sets ? `${fmtN(s.sets)} sets` : '', s.sessions)}
  </div>`;
  h += `<div class="pg-card rk-next"><span class="pg-kicker">Next Session</span><div>${nextUpHTML(s)}</div></div>`;
  h += heatmapHTML(s);
  h += historyHTML(s);
  p.innerHTML = h;
  tickCounts(p);
  slideMarkers(p);
}

export function renderAwards(root) {
  const p = root.querySelector('#p-awards');
  if (!p) return;
  const st = strength(), s = stats();

  p.innerHTML = badgesHTML(achievements(s, st));
  tickCounts(p);
  slideMarkers(p);
}
