/* ═══════════════════════════════════════════════════════════
   GRIP — how hard you squeeze, against how hard men your age do.

     bp_grip  [{d:'YYYY-MM-DD', r:kg, l:kg}]   one entry per day, either
                                                hand optional

   Read off a hand dynamometer, so unlike every lift on the Rank tab this
   one is not an estimate of anything: no rep count, no Epley, no 1RM. The
   device prints the number the tables were built from. That is also why it
   is ranked by age and not by bodyweight — grip is published as absolute
   force by age and sex, and it is one of the few strength measures that
   has been taken on tens of thousands of ordinary people rather than on
   people who chose to walk into a gym.

   It gets its own letter, and its percentile is also one more entry in
   the overall score, weighted like any lift (gripEntry in rank.js). It
   joins only once there is a lift to sit beside, and stays out of the
   Every Lift list and the per-lift tier-ups, which are about lifts.

   Stored in KILOGRAMS whatever the unit toggle says, for the same reason
   body.js stores inches: that is what the reference table is in, and the
   conversion happens at the edges only. Flip the unit and nothing in
   storage moves.

   Whether the card shows at all is the `bp_dyno` equipment flag, owned by
   Settings and shared across people like the rest of the kit. Turning it
   off hides the card; the readings stay.
   ═══════════════════════════════════════════════════════════ */

import { load, save, todayStr } from './store.js?v=nodrop-sep24';
import { normCdf } from './anthro.js?v=nodrop-sep24';

export const GRIP_KEY = 'bp_dyno';
export const gripOn = () => load(GRIP_KEY, true);

/* ── Dodds RM et al. (2014), "Grip strength across the life course:
   normative data from twelve British studies", PLoS ONE 9(12):e113637,
   Table 2, males. 60,803 observations from 49,964 people, centiles fitted
   by GAMLSS at the exact ages shown; each reading is the MAXIMUM across
   the trials a study took, of either hand — which is why the best hand is
   what scores here. Jamar and comparable dynamometers.
   https://pmc.ncbi.nlm.nih.gov/articles/PMC4256164/

   British rather than American, where the tape comparisons are NHANES.
   Nothing American publishes centiles by single five-year age across the
   whole adult range from a sample anywhere near this size, and a grip is
   a grip either side of the Atlantic to within the device's own error. ── */

/* The 10th, 25th, 50th, 75th and 90th centiles each row publishes, as z. */
const Z = [-1.2816, -0.6745, 0, 0.6745, 1.2816];

const DODDS = {
  15: [21, 25, 29, 33, 38],
  20: [30, 35, 40, 46, 52],
  25: [36, 41, 48, 55, 61],
  30: [38, 44, 51, 58, 64],
  35: [39, 45, 51, 58, 64],
  40: [38, 44, 50, 57, 63],
  45: [36, 42, 49, 56, 61],
  50: [35, 41, 48, 54, 60],
  55: [34, 40, 47, 53, 59],
  60: [33, 39, 45, 51, 56],
  65: [31, 37, 43, 48, 53],
  70: [29, 34, 39, 44, 49],
  75: [26, 31, 35, 41, 45],
  80: [23, 27, 32, 37, 42],
  85: [19, 24, 29, 33, 38],
  90: [16, 20, 25, 29, 33],
};

/* The row for an age, interpolated between the two published ages either
   side, since the table is fitted at exact ages rather than for bands.

   With no age, the comparison is against men at their peak — 30 to 39,
   where Dodds puts the median at its highest. That is the harshest honest
   default: it never flatters, and it is the one the tape card's "all adult
   men" would be if grip were published that way, which it is not. */
function rowFor(age) {
  if (typeof age !== 'number' || !(age > 0)) return { row: DODDS[35], lbl: 'men at peak age (30–39)', aged: false };
  const a = Math.min(90, Math.max(15, age));
  const lo = Math.min(85, Math.floor(a / 5) * 5), f = (a - lo) / 5;
  const row = DODDS[lo].map((v, i) => v + f * (DODDS[lo + 5][i] - v));
  return { row, lbl: `men aged ${Math.round(age)}`, aged: true };
}

/* Where a reading falls. Between the published centiles it is linear in
   z rather than in percentile, which is the shape a distribution actually
   has between two points. Past either end the outer gap's z-slope carries
   on — a normal tail fitted to that end of the table, so a strong grip
   stretches the upper spread rather than the lower. Clamped to 1–99: the
   table stops at the 10th and 90th, and a decimal out there is invention. */
function zFor(kg, row) {
  const n = row.length - 1;
  if (kg <= row[0]) return Z[0] - (row[0] - kg) * (Z[1] - Z[0]) / (row[1] - row[0]);
  if (kg >= row[n]) return Z[n] + (kg - row[n]) * (Z[n] - Z[n - 1]) / (row[n] - row[n - 1]);
  for (let i = 0; i < n; i++)
    if (kg <= row[i + 1]) return Z[i] + (kg - row[i]) / (row[i + 1] - row[i]) * (Z[i + 1] - Z[i]);
  return 0;
}
const pctOf = (kg, row) => Math.max(1, Math.min(99, normCdf(zFor(kg, row)) * 100));

/* The reading that would land on a given percentile — for "+N to the next
   letter". Bisection, because the curve is monotonic and this runs once. */
function kgFor(pct, row) {
  let lo = 0, hi = 200;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (pctOf(mid, row) < pct) lo = mid; else hi = mid;
  }
  return hi;
}

/* ── units ── */
export const KG_PER_LB = 0.45359237;
export const GRIP_UNITS = { kg: { n: 'kg', full: 'Kilograms', per: 1 },
                            lb: { n: 'lb', full: 'Pounds',    per: 1 / KG_PER_LB } };
/* Pounds by default, because the rest of the app is — but the toggle sits
   in the field label, since most dynamometers ship reading kilograms. */
export const gripUnit = () => GRIP_UNITS[load('bp_grip_u', 'lb')] ? load('bp_grip_u', 'lb') : 'lb';
export const setGripUnit = u => { if (GRIP_UNITS[u]) save('bp_grip_u', u); };
export const toGU   = (kg, u) => kg * GRIP_UNITS[u].per;
export const fromGU = (v, u)  => v / GRIP_UNITS[u].per;

/* ── the log ── */
const num = v => typeof v === 'number' && isFinite(v) && v > 0;
export const gripAll = () => load('bp_grip', []).filter(e => num(e.r) || num(e.l));
const gripSv = l => save('bp_grip', [...l].sort((a, b) => a.d.localeCompare(b.d)));

/* One entry per date. A hand left blank keeps what that date already had,
   the way a body-log entry keeps whatever you don't re-enter. Readings no
   hand plausibly produces (under 1 kg, over 150) are a typo or the wrong
   unit, and are dropped rather than stored. */
export function logGrip(d, r, l) {
  const ok = v => num(v) && v >= 1 && v <= 150;
  if (!ok(r) && !ok(l)) return false;
  const all = gripAll(), i = all.findIndex(e => e.d === d);
  const prev = i >= 0 ? all[i] : {};
  const e = { d, r: ok(r) ? r : (num(prev.r) ? prev.r : null), l: ok(l) ? l : (num(prev.l) ? prev.l : null) };
  if (i >= 0) all[i] = e; else all.push(e);
  gripSv(all);
  return true;
}
export const delGrip = d => gripSv(gripAll().filter(e => e.d !== d));

export const bestOf = e => Math.max(num(e.r) ? e.r : 0, num(e.l) ? e.l : 0);

/* Everything the card shows. `age` may be null, in which case the peak row
   is used and `aged` says so. */
export function gripStanding(age) {
  const log = gripAll();
  if (!log.length) return { log, last: null };
  const last = log[log.length - 1], kg = bestOf(last);
  const { row, lbl, aged } = rowFor(age);
  const pct = pctOf(kg, row);
  const first = log[0];
  return {
    log, last, kg, pct, group: lbl, aged,
    hand: num(last.r) && num(last.l) ? (last.r >= last.l ? 'right' : 'left') : (num(last.r) ? 'right' : 'left'),
    /* past either centile the table publishes, where the reading is a
       fitted tail rather than an interpolation */
    beyond: kg > row[row.length - 1] ? 'top' : kg < row[0] ? 'bottom' : null,
    median: row[2],
    since: log.length > 1 ? { kg: kg - bestOf(first), d: first.d } : null,
    need: p => Math.max(0, kgFor(p, row) - kg),
    today: todayStr(),
  };
}

export const GRIP_HOW = 'Seated, elbow at 90°, wrist straight, arm not touching your side. Squeeze as hard as you can for three seconds, three tries a hand with a rest between; log the best of each.';
