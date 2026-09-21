/* ═══════════════════════════════════════════════════════════
   BODY — composition maths for the Body tab.

   Pure computation, no DOM. Everything here is derived from two
   places:

     bp_prof  {h, act, goal}   height in inches, activity key,
                               goal weight in lbs (null = follow
                               the recommendation)
     bp_bw    [{d,w,wa,nk}]    one entry per day. Every field but
                               the date is optional: w = weight,
                               wa = waist, nk = neck, all in the
                               units the rest of the app already
                               uses (lbs and inches).

   bp_bw predates this file and used to be {d,w} only. Nothing was
   migrated — an old entry simply has no tape on it, and every
   reader below skips what it hasn't got. That is also why `weighed`
   exists and is exported: the Rank tab scores every lift against
   bodyweight, and once an entry is allowed to carry a waist and no
   weight, "the latest bodyweight" stops being "the last entry".

   Male formulas throughout, matching apps/workout/standards.js,
   whose strength standards are male-only and say so. A female
   estimate needs a hip measurement and its own constants; adding
   one means adding both, not flipping a sign here.
   ═══════════════════════════════════════════════════════════ */

import { load, save, dateStr } from '../../assets/js/storage.js?v=bodystat-sep26';

const LB_PER_KG = 2.20462262;
const M_PER_IN  = 0.0254;
/* The usual kitchen figure: one pound of body mass ≈ 3500 kcal. It is a
   round number standing in for something that varies with what you are
   losing, and every calorie target below inherits that looseness. */
const KCAL_PER_LB = 3500;

/* ═══════════════════ PROFILE ═══════════════════ */

const PROF_DEF = { h: null, act: 'mod', goal: null };
export const prof    = () => ({ ...PROF_DEF, ...load('bp_prof', {}) });
export const profSet = patch => save('bp_prof', { ...prof(), ...patch });

/* Multipliers are the standard Harris-Benedict activity ladder. The program
   this app tracks is four lifting days a week, so 'mod' is the default —
   but the ladder counts the whole day, not the hour in the garage, and a
   warehouse shift and a desk job on the same program are two rungs apart. */
export const ACTIVITY = [
  { k:'sed',   n:'Sedentary', m:1.20,  d:'Desk job, little else' },
  { k:'light', n:'Light',     m:1.375, d:'1–3 sessions a week' },
  { k:'mod',   n:'Moderate',  m:1.55,  d:'3–5 sessions a week' },
  { k:'high',  n:'High',      m:1.725, d:'6–7 sessions, or on your feet all day' },
  { k:'ath',   n:'Athlete',   m:1.90,  d:'Twice a day, or hard physical work' },
];
export const actOf = k => ACTIVITY.find(a => a.k === k) || ACTIVITY[2];

/* ═══════════════════ ENTRY HELPERS ═══════════════════ */

const num = v => typeof v === 'number' && isFinite(v) && v > 0;
export const hasW    = e => num(e.w);
export const hasWa   = e => num(e.wa);
export const hasNk   = e => num(e.nk);
export const hasTape = e => hasWa(e) && hasNk(e);

/* Every tape measurement an entry can carry, in the order the log form and
   the history chips show them.

   Only the first two are arithmetic: waist and neck are what the Navy
   formula reads, and nothing else here touches the other three. Chest, arm
   and thigh are there because they are what you actually want to watch —
   body fat tells you whether a bulk is working, and an arm that went from
   14.5" to 15.2" tells you where it went. `core` is the split: the two the
   maths needs stay on the form, the three that are yours to watch sit
   behind a disclosure so a daily weigh-in isn't seven boxes. */
export const TAPE = [
  { k:'wa', lbl:'Waist', ab:'W', core:true,
    how:'At the navel, horizontal, relaxed — not held in.' },
  { k:'nk', lbl:'Neck',  ab:'N', core:true,
    how:'Just below the larynx, tape sloping slightly down at the front.' },
  { k:'ch', lbl:'Chest', ab:'C',
    how:'Widest point, arms down, at the end of a normal breath out.' },
  { k:'ar', lbl:'Arm',   ab:'A',
    how:'Mid-bicep, flexed or relaxed — pick one and keep picking it.' },
  { k:'th', lbl:'Thigh', ab:'T',
    how:'Halfway between hip and knee, standing, weight on both legs.' },
];
export const TAPE_KEYS = TAPE.map(t => t.k);

/* Does this entry carry anything at all? The write path uses it to drop an
   entry that has been emptied rather than leave a dateless husk behind. */
export const hasAny = e => hasW(e) || TAPE_KEYS.some(k => num(e[k]));

/* ═══════════════════ SCORING REFERENCE ═══════════════════ */

/* The Rank tab can divide by lean mass instead of bodyweight, which stops a
   cut from inflating your letter and a bulk from deflating it. It cannot do
   that by simply swapping the denominator: the standards in standards.js are
   published as ratios of BODYweight, so dividing a 1RM by lean mass alone
   would hand everybody a grade or two they hadn't earned.

   What it does instead is ask "what would I weigh at a reference body fat,
   carrying the lean mass I have?" and score against that. Set REF_BF to your
   own body fat and the two modes agree exactly; the difference between them
   is only ever the difference between your composition and the reference.

   REF_BF is a calibration choice, not a measurement, and the honest range is
   wide: resistance-trained study cohorts come in around 11–12%, the average
   US adult male is ~28% by DXA (NHANES 1999–2006), and the people who log
   lifts to a strength-standards site are somewhere in between with nobody
   publishing where. 18% is the floor of the ACE "Average" band and a
   defensible middle.

   The number matters less than it looks. It sets where the two modes cross,
   and nothing else — the property the lean mode exists for, that your letter
   stops moving when your weight moves without your muscle, holds at any
   value of it. */
export const REF_BF = 0.18;
export const scoringRef = lean => (num(lean) ? lean / (1 - REF_BF) : null);

/* The subset that carries a bodyweight, oldest first. Anything asking
   "what do I weigh" or "how many times have I weighed in" has to go
   through this rather than reading the end of the list. */
export const weighed = list => list.filter(hasW);
export const taped   = list => list.filter(hasTape);

const last = l => (l.length ? l[l.length - 1] : null);
export const lastWeighed = list => last(weighed(list));
export const lastTaped   = list => last(taped(list));

const dayNum = d => Math.round(new Date(d + 'T00:00:00').getTime() / 86400000);

/* Entries on or after `days` ago. null = everything. */
export function within(list, days) {
  if (days === null || days === undefined) return list;
  const c = new Date(); c.setDate(c.getDate() - days);
  const cs = dateStr(c);
  return list.filter(e => e.d >= cs);
}

/* ═══════════════════ BODY FAT ═══════════════════ */

/* US Navy circumference method, male, imperial:

     BF% = 86.010·log10(waist − neck) − 70.041·log10(height) + 36.76

   It is a tape measure standing in for a DEXA scan, and it lands within
   about ±3 points of one — worse at the extremes, worse again if you
   measure in a different spot each time. Which is the real point: the
   absolute number is an estimate, the *change* in it is the measurement.
   Waist at the navel, neck below the larynx, first thing, same spots
   every time, and the trend is worth more than the figure. */
export function navyBF(waist, neck, height) {
  if (!num(waist) || !num(neck) || !num(height)) return null;
  const girth = waist - neck;
  if (girth <= 0) return null;                  // log10 of a non-positive
  const bf = 86.010 * Math.log10(girth) - 70.041 * Math.log10(height) + 36.76;
  /* Outside this the inputs are wrong, not the body. Returning the number
     anyway would draw a chart point from a typo. */
  return bf >= 2 && bf <= 60 ? bf : null;
}

/* ACE's male classification. Used for the band meter under the estimate —
   a percentage on its own doesn't say whether it is a good one. `ab` is the
   narrow-screen label: Essential is four points wide, so on a phone its
   segment is about 36px and the full word does not fit inside it. */
export const BF_BANDS = [
  { n:'Essential', ab:'Ess', lo:2,  hi:6,  tone:'warn' },
  { n:'Athlete',   ab:'Ath', lo:6,  hi:14, tone:'good' },
  { n:'Fitness',   ab:'Fit', lo:14, hi:18, tone:'good' },
  { n:'Average',   ab:'Avg', lo:18, hi:25, tone:'mid'  },
  { n:'High',      ab:'High',lo:25, hi:40, tone:'warn' },
];
export const bfBand = bf =>
  bf === null ? null : BF_BANDS.find(b => bf < b.hi) || BF_BANDS[BF_BANDS.length - 1];

/* ═══════════════════ DERIVED FIGURES ═══════════════════ */

export const bmiOf  = (w, h) => (num(w) && num(h) ? 703 * w / (h * h) : null);
export const whtrOf = (waist, h) => (num(waist) && num(h) ? waist / h : null);

/* Fat-free mass index: lean mass normalised for height, which is what BMI
   would be if it could tell muscle from fat. The normalised variant scales
   everyone to 1.8 m so two people of different heights are comparable.
   ~25 is roughly the drug-free ceiling, and most lifters live at 19–22. */
export function ffmiOf(lean, h) {
  if (!num(lean) || !num(h)) return null;
  const kg = lean / LB_PER_KG, m = h * M_PER_IN;
  const ffmi = kg / (m * m);
  return { ffmi, norm: ffmi + 6.1 * (1.8 - m) };
}

/* Katch-McArdle, which runs off lean mass rather than age and sex — the
   reason this whole block waits for a tape measurement instead of falling
   back to a formula that would need a birthday. */
export function energy(lean, actK) {
  if (!num(lean)) return null;
  const bmr = 370 + 21.6 * (lean / LB_PER_KG);
  return { bmr, tdee: bmr * actOf(actK).m };
}

/* ═══════════════════ TREND ═══════════════════ */

/* Least squares over every weighed point in the window, not first-to-last.
   Scale weight swings three or four pounds on water and salt alone, so a
   two-point read is hostage to which two days happened to be logged — the
   slope through all of them is the thing you actually want to steer by. */
function slope(pts) {
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[1], 0) / n;
  let cov = 0, varx = 0;
  pts.forEach(([x, y]) => { cov += (x - mx) * (y - my); varx += (x - mx) ** 2; });
  return varx === 0 ? null : cov / varx;
}

/* Widening windows: 30 days is the number worth steering by, but a month
   into logging there isn't one, and a slower honest read beats none. The
   window that answered is reported back so the UI can say which it used. */
const RATE_WINDOWS = [30, 60, 90, null];

export function rateOf(list) {
  const W = weighed(list);
  if (W.length < 2) return null;
  for (const days of RATE_WINDOWS) {
    const pts = within(W, days).map(e => [dayNum(e.d), e.w]);
    if (pts.length < 2) continue;
    const span = pts[pts.length - 1][0] - pts[0][0];
    if (span < 7) continue;                     // a week is the floor
    const s = slope(pts);
    if (s === null) continue;
    const cur = pts[pts.length - 1][1];
    return { lbsWk: s * 7, pctWk: (s * 7) / cur * 100, days, span, n: pts.length };
  }
  return null;
}

/* Trailing 7-day mean, one output point per input point. The raw dots stay
   on the chart underneath — this is the line drawn through them. */
export function smooth(series, windowDays = 7) {
  return series.map((p, i) => {
    let sum = 0, n = 0;
    for (let j = i; j >= 0; j--) {
      if (dayNum(p.d) - dayNum(series[j].d) >= windowDays) break;
      sum += series[j].v; n++;
    }
    return { d: p.d, v: sum / n };
  });
}

/* ═══════════════════ SNAPSHOT ═══════════════════ */

/* Everything the tab needs about right now, in one read.

   Weight and tape come from whichever entry last carried each, which need
   not be the same entry — you weigh yourself more often than you get the
   tape out. Lean mass therefore pairs today's weight with a body fat
   percentage that may be a fortnight old; `bfDate` carries that date out
   so the UI can say so rather than quietly implying both were measured
   this morning. */
export function snapshot() {
  const list = load('bp_bw', []);
  const p = prof();
  const lw = lastWeighed(list), lt = lastTaped(list);

  const w  = lw ? lw.w : null;
  const bf = lt ? navyBF(lt.wa, lt.nk, p.h) : null;

  const fat  = w !== null && bf !== null ? w * bf / 100 : null;
  const lean = fat !== null ? w - fat : null;

  /* bfDate is tied to bf, not to the tape. A waist and neck entered the wrong
     way round is a real typo, navyBF correctly refuses it, and a date left
     dangling here would have the UI say "body fat is from the tape on the
     14th" with no body fat anywhere on the page. tapeBad carries the case
     instead, so it can be named for what it is. */
  const tapeBad = lt !== null && bf === null;

  return {
    h: p.h, act: p.act, goal: p.goal,
    w, wDate: lw ? lw.d : null,
    bf, bfDate: bf !== null && lt ? lt.d : null, tapeBad,
    waist: lt ? lt.wa : null,
    neck:  lt ? lt.nk : null,
    fat, lean,
    band: bfBand(bf),
    bmi:  bmiOf(w, p.h),
    whtr: whtrOf(lt ? lt.wa : null, p.h),
    ffmi: ffmiOf(lean, p.h),
    energy: energy(lean, p.act),
    rate: rateOf(list),
    count: weighed(list).length,
    tapeCount: taped(list).length,
    /* Days since the last usable tape. The body fat figure ages silently —
       it keeps rendering at full confidence off a measurement from a month
       ago — so the UI needs a number it can nag with. */
    tapeAge: lt ? Math.round((Date.now() - new Date(lt.d + 'T00:00:00').getTime()) / 86400000) : null,
  };
}

/* ═══════════════════ THE CALL ═══════════════════ */

/* Where the recommendation comes from, so it can be argued with:

   The bands are the ordinary lifting consensus — bulk from the low teens,
   stop around eighteen, cut if you are past twenty. The reason is
   partitioning: the leaner you are, the larger the share of a surplus that
   goes to muscle rather than fat, and that share degrades as body fat
   climbs. So a bulk started at 12% buys more per pound gained than the same
   bulk started at 20%, and the fix for being at 20% is not a better
   surplus, it is being at 14% first.

   Nothing here knows your training age, your sleep, or what you are training
   for. It reads one number and applies a rule of thumb to it. */
const CALLS = [
  { max: 10, v:'BULK',   tone:'bulk',
    why:'Lean enough that a surplus goes mostly where you want it. Little left to gain from getting leaner, and strength usually suffers down here.' },
  { max: 15, v:'BULK',   tone:'bulk',
    why:'The band where a surplus buys the most muscle per pound of fat. Run it until you are around 18% and then reassess.' },
  { max: 18, v:'RECOMP', tone:'hold',
    why:'Neither lean enough that a bulk pays well nor heavy enough to need a cut. Hold the weight, keep adding load, and let the composition move underneath it.' },
  { max: 22, v:'CUT',    tone:'cut',
    why:'Far enough up that a bulk from here buys fat faster than muscle. A short cut back to the low teens makes the next one worth more.' },
  { max: 100, v:'CUT',   tone:'cut',
    why:'Cut first. Partitioning gets worse the higher this goes, so a month spent bulking at this level costs two cutting back down.' },
];

/* Target rates, as a share of bodyweight per week, both taken from
   Helms, Aragon & Schoenfeld (2014), "Evidence-based recommendations for
   natural bodybuilding contest preparation", J Int Soc Sports Nutr 11:20 —
   https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/

   The cut is theirs directly: 0.5–1%/wk "to maximize muscle retention", so
   the target sits in the middle of it and WARN_CUT below marks the ceiling.

   The bulk needs a caveat the app cannot resolve. Their gain rates are per
   training age — 0.25–0.5%/wk for novices, 0.1–0.2% for intermediates,
   0.05–0.1% for advanced — and nothing here knows which you are. 0.25% is
   the floor of the novice band and the nearest thing to a rate that is
   merely conservative rather than wrong for everyone: at a typical
   bodyweight it also lands the surplus inside Helms' separate 5–10%-of-TDEE
   guidance. If you have been training for years, read it as an upper bound.

   An earlier draft used 0.35%, which is a novice-only rate wearing no
   label — roughly double what an intermediate should run. */
const BULK_PCT = 0.25, CUT_PCT = -0.75;

/* The edges of those same bands: past either, the extra rate is buying fat
   on the way up or costing lean mass on the way down. */
const WARN_BULK = 0.5, WARN_CUT = -1.0;

/* Protein, per pound of LEAN mass rather than of bodyweight — the same
   1 g/lb rule of thumb, but it stops over-prescribing at higher body fat,
   where the extra pounds are not tissue that needs feeding. A deficit gets
   more, because protein is most of what protects muscle while dieting.

   The same paper puts the cutting range at 2.3–3.1 g/kg of lean mass, which
   is 1.04–1.41 g/lb; 1.2 is the middle of it. The bulking figure is lower
   because the need is: at a typical body fat, 1.0 g/lb of lean works out
   around 1.9 g/kg of BODYweight, inside the usual 1.6–2.2 g/kg band. */
const PROT_CUT = 1.2, PROT_OTHER = 1.0;

const round5  = n => Math.round(n / 5) * 5;
const round10 = n => Math.round(n / 10) * 10;

export function advise(s) {
  if (s.bf === null || s.lean === null || !s.energy) return { state: 'nodata' };

  const call = CALLS.find(c => s.bf < c.max) || CALLS[CALLS.length - 1];

  /* The surplus or deficit that produces the target rate, then capped as a
     share of maintenance — at a low TDEE an unclamped 0.75%/wk deficit can
     ask for most of the day's food. */
  const pct   = call.v === 'BULK' ? BULK_PCT : call.v === 'CUT' ? CUT_PCT : 0;
  const raw   = pct / 100 * s.w * KCAL_PER_LB / 7;
  const cap   = s.energy.tdee * (pct < 0 ? 0.25 : 0.20);
  const delta = Math.sign(raw) * Math.min(Math.abs(raw), cap);
  const kcal  = round10(s.energy.tdee + delta);

  const protein = round5(s.lean * (call.v === 'CUT' ? PROT_CUT : PROT_OTHER));

  return { state:'ok', ...call, kcal, delta: Math.round(delta), protein,
           pace: paceOf(call.v, s.rate), goal: goalFor(s, call.v) };
}

/* The call says which direction; this says whether the direction you are
   already going is the right speed. It reads the measured trend, so it
   stays quiet until there is one.

   Wrong-way first, in both branches. A trend running against the call is
   the one thing here worth interrupting for, and it has to be caught before
   the flat test — "not losing" and "gaining a pound a week" are the same
   side of zero, and only one of them is a pace problem. */
const FLAT = 0.1;                                // %/wk either side of nothing

function paceOf(verdict, rate) {
  if (!rate) return null;
  const r = rate.pctWk, mag = Math.abs(r).toFixed(2), flat = Math.abs(r) < FLAT;

  if (verdict === 'BULK') {
    if (r <= -FLAT) return { tone:'warn', t:`Losing ${mag}%/wk while the call is to bulk. Whatever you are eating, it is not a surplus.` };
    if (flat)       return { tone:'warn', t:`Weight is flat at ${r.toFixed(2)}%/wk. A bulk that isn't gaining isn't a bulk — add food.` };
    if (r > WARN_BULK) return { tone:'warn', t:`Gaining ${mag}%/wk — faster than a bulk needs. Most of anything past ~0.5%/wk is fat. Pull the surplus back.` };
    return { tone:'good', t:`Gaining ${mag}%/wk, which is the right side of the line. Hold it here.` };
  }
  if (verdict === 'CUT') {
    if (r >= FLAT) return { tone:'warn', t:`Gaining ${mag}%/wk while the call is to cut — the wrong direction, and it gets more expensive the longer it runs.` };
    if (flat)      return { tone:'warn', t:`Weight isn't moving (${r.toFixed(2)}%/wk). The deficit isn't there yet.` };
    if (r < WARN_CUT) return { tone:'warn', t:`Dropping ${mag}%/wk — fast enough to start costing lean mass. Ease the deficit.` };
    return { tone:'good', t:`Dropping ${mag}%/wk, which is a clean rate. Keep going.` };
  }
  if (Math.abs(r) > 0.3) return { tone:'warn', t:`Weight is moving ${r > 0 ? 'up' : 'down'} ${mag}%/wk. A recomp wants it flat — steer back toward maintenance.` };
  return { tone:'good', t:`Weight is holding at ${r.toFixed(2)}%/wk, which is what a recomp should look like.` };
}

/* ═══════════════════ GOAL WEIGHT ═══════════════════ */

/* Two different arithmetics, because the two directions ask different
   questions.

   Cutting, the question is "what would I weigh at 12% if I lost only fat",
   which is lean mass divided by 0.88. That assumes a perfect cut, so it is
   the near edge of the range rather than a promise — a real one gives back
   a pound or two of lean.

   Bulking, the question is "how far can this run before I'm back at 18%",
   and the answer depends on what share of the gain is muscle. Half is the
   honest long-run figure for anyone past their first year; beginners do
   better, and nobody does better for long. Solving (fat + 0.5G)/(w + G) =
   0.18 for G gives the gain, and the target weight with it. */
const CUT_TARGET = 0.12, BULK_CEILING = 0.18, LEAN_SHARE = 0.5;

/* And then clamped, because a goal has to be near enough to steer by. Run
   the bulk arithmetic on someone at 6% and it correctly answers "another
   fifty-six pounds", which at their measured rate is five years away — a
   true number and a useless target. Anything further than a tenth of
   bodyweight is cut back to that and labelled as the staging post it is:
   reach it, measure again, and the next one is drawn from there. */
const MAX_RUN = 0.10;

export function goalFor(s, verdict) {
  if (s.lean === null || s.fat === null) return null;

  if (verdict === 'RECOMP') {
    return { w: s.w, pct: s.bf, dir:'hold', staged:false,
             note:'A recomp has no goal weight — the scale is meant to stay where it is while the waist comes in. Watch the waist and the body fat line instead.' };
  }

  const cut  = verdict === 'CUT';
  const full = cut ? s.lean / (1 - CUT_TARGET)
                   : s.w + (BULK_CEILING * s.w - s.fat) / (LEAN_SHARE - BULK_CEILING);
  /* Already past the target in the direction the call points — the band and
     the arithmetic disagree, so offer nothing rather than a goal behind you. */
  if (!isFinite(full) || (cut ? full >= s.w : full <= s.w)) return null;

  const cap = s.w * MAX_RUN;
  const staged = Math.abs(full - s.w) > cap;
  const w = staged ? (cut ? s.w - cap : s.w + cap) : full;

  /* Body fat at that weight, under the same assumption the target was drawn
     with: a clean cut gives back nothing but fat, a bulk adds half fat. */
  const fatAt = cut ? s.fat - (s.w - w) : s.fat + (1 - LEAN_SHARE) * (w - s.w);
  const pct = Math.max(0, fatAt / w * 100);
  const endPct = Math.round((cut ? CUT_TARGET : BULK_CEILING) * 100);

  const note = staged
    ? `A full ${cut ? 'cut' : 'bulk'} to ${endPct}% is ${Math.abs(full - s.w).toFixed(0)} lbs away — further than one run should plan. This is the next ${Math.round(MAX_RUN * 100)}% of bodyweight, landing you near ${pct.toFixed(0)}%. Re-measure there and the next target is drawn from that.`
    : cut
      ? `Your current lean mass at ${endPct}% body fat — where you land if the cut costs you no muscle. Treat it as the near edge, not the promise.`
      : `Where this bulk should stop: ${endPct}% body fat, assuming half of what you gain is muscle. That is a long run, not a month.`;

  return { w, pct, dir: cut ? 'down' : 'up', staged, full, note };
}

/* Days to the goal at the measured rate, or the reason there is no answer.
   Refusing to project a goal you are moving away from matters more than it
   sounds: the arithmetic happily returns a negative number of weeks, and
   printed as a date that reads like a forecast. */
export function project(cur, goal, rate) {
  if (cur === null || goal === null || !rate) return null;
  const gap = goal - cur;
  if (Math.abs(gap) < 0.5) return { state:'there' };
  if (Math.abs(rate.lbsWk) < 0.05) return { state:'flat' };
  if (Math.sign(gap) !== Math.sign(rate.lbsWk)) return { state:'away' };
  const weeks = gap / rate.lbsWk;
  const when = new Date(); when.setDate(when.getDate() + Math.round(weeks * 7));
  return { state:'ok', weeks, gap, date: dateStr(when) };
}
