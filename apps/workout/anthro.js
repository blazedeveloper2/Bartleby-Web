/* ═══════════════════════════════════════════════════════════
   ANTHRO — where a tape measurement stands against a population.

   The same idea as standards.js does for lifts, and the same
   honesty about it: every row says which population it came
   from and how well the comparison actually fits, because a
   percentile with no provenance is just a number that feels
   authoritative.

     src   how much to trust the comparison
             'exact'  same measurement, same protocol, general
                      US male population
             'proxy'  same measurement, DIFFERENT protocol —
                      the number is close, not equivalent
             'est'    different population, and a normal
                      approximation rather than published
                      percentiles

     dir   which way is "better"
            -1  smaller (waist: this is a health measure)
            +1  larger  (arm, chest, thigh: mass — but see below)
             0  neither (neck)

   The confound worth stating plainly: for arm, chest and thigh a
   population percentile cannot tell muscle from fat. A 40 cm arm
   is a 40 cm arm whether it is biceps or not, and the general
   population's is not mostly biceps. Read a high percentile there
   as "bigger than most", never as "more muscular than most". The
   waist is the one that means what it looks like it means, and
   the body fat estimate on the same tab is what actually settles
   the question for the rest.

   All stored lengths are inches; every table here is centimetres,
   because that is how both sources publish. Conversion happens on
   the way in.
   ═══════════════════════════════════════════════════════════ */

const IN_TO_CM = 2.54;

/* The percentiles both NHANES tables publish, in order. */
const P = [5, 10, 15, 25, 50, 75, 85, 90, 95];

/* ── NHANES 2015–2018, adult males, all race and Hispanic-origin
   groups combined. CDC/NCHS, Anthropometric Reference Data for
   Children and Adults: United States, 2015–2018, Vital and Health
   Statistics Series 3 No. 46 — Table 20 (waist) and Table 23
   (mid-upper arm). n = 4,881 and 4,919.
   https://www.cdc.gov/nchs/data/series/sr_03/sr03-046-508.pdf ── */

const NHANES_WAIST = {
  all:   [77.6, 82.7, 86.2, 91.7, 101.8, 112.1, 118.5, 124.0, 132.6],
  20:    [72.4, 75.6, 77.0, 81.0,  90.7, 105.3, 111.2, 117.4, 127.3],
  30:    [80.5, 84.3, 86.6, 90.7,  99.9, 111.2, 120.5, 125.2, 132.7],
  40:    [81.3, 86.2, 89.8, 94.4, 102.8, 111.9, 118.0, 123.5, 134.1],
  50:    [83.8, 87.9, 90.6, 94.7, 103.3, 113.0, 119.4, 126.5, 135.1],
  60:    [82.8, 89.4, 92.1, 96.4, 106.2, 115.9, 121.9, 127.7, 136.3],
  70:    [85.7, 89.9, 92.6, 98.9, 106.6, 115.8, 120.5, 124.6, 131.1],
  80:    [83.7, 89.2, 92.2, 95.7, 104.1, 112.3, 116.6, 119.9, 126.7],
};

const NHANES_ARM = {
  all:   [27.5, 29.1, 29.9, 31.3, 34.4, 37.4, 39.3, 40.6, 42.8],
  20:    [26.2, 28.0, 28.9, 30.1, 34.0, 37.0, 39.5, 41.1, 43.0],
  30:    [29.2, 30.3, 31.0, 32.5, 35.2, 38.4, 40.1, 42.0, 45.2],
  40:    [29.2, 30.7, 31.5, 32.9, 35.0, 38.1, 40.0, 41.4, 43.2],
  50:    [28.0, 29.4, 30.2, 31.5, 34.4, 37.5, 39.6, 40.0, 42.6],
  60:    [27.6, 29.3, 29.9, 31.2, 34.0, 37.0, 38.7, 39.7, 42.0],
  70:    [26.7, 27.9, 28.9, 30.3, 33.0, 36.2, 37.6, 38.7, 39.6],
  80:    [25.4, 26.2, 27.2, 28.3, 30.5, 33.3, 34.7, 35.4, 36.9],
};

/* Which decade row to read. Under 20 borrows the twenties, which is
   the closest published thing rather than a claim about teenagers. */
function ageRow(table, age) {
  if (typeof age !== 'number' || !(age > 0)) return { row: table.all, lbl: 'men 20 and over' };
  const d = Math.min(80, Math.max(20, Math.floor(age / 10) * 10));
  const lbl = d === 80 ? 'men 80+' : `men ${d}–${d + 9}`;
  return { row: table[d] || table.all, lbl };
}

/* ── ANSUR II: 2012 Anthropometric Survey of US Army Personnel,
   male component, n = 4,082. Published as mean and SD rather than
   percentile tables, so these are normal approximations — and the
   population is active-duty service members, who run leaner and
   more muscular than the general public. Both facts are why every
   one of these rows is tagged 'est'. ── */

const ANSUR = {
  nk: { mean: 39.8, sd: 2.6 },
  ch: { mean: 105.9, sd: 8.7 },
  th: { mean: 62.5, sd: 5.8 },
};

export const ANTHRO = {
  wa: {
    lbl: 'Waist', dir: -1, src: 'proxy', table: NHANES_WAIST,
    pop: 'US men, NHANES 2015–18',
    note: 'NHANES measures the waist at the top of the hip bone. This app measures at the navel, because that is what the Navy body fat formula requires. The two sites differ by a centimetre or two on most men, so read this as close rather than equivalent.',
  },
  ar: {
    lbl: 'Arm', dir: 1, src: 'exact', table: NHANES_ARM,
    pop: 'US men, NHANES 2015–18',
    note: 'Same protocol as yours: mid-upper arm, relaxed, measured at the marked midpoint between shoulder and elbow. This is the one comparison here that lines up exactly.',
  },
  nk: {
    lbl: 'Neck', dir: 0, src: 'est', norm: ANSUR.nk,
    pop: 'US Army, ANSUR II 2012',
    note: 'Neither direction is good or bad on its own — neck size tracks both muscle and bodyweight. Shown because it moves, not because it scores.',
  },
  ch: {
    lbl: 'Chest', dir: 1, src: 'est', norm: ANSUR.ch,
    pop: 'US Army, ANSUR II 2012',
    note: 'Service members run leaner and more muscular than the general public, so this reads harsher than a civilian comparison would.',
  },
  th: {
    lbl: 'Thigh', dir: 1, src: 'est', norm: ANSUR.th,
    pop: 'US Army, ANSUR II 2012',
    note: 'Service members run leaner and more muscular than the general public, so this reads harsher than a civilian comparison would.',
  },
};

export const SRC_LABEL = { exact: 'exact', proxy: 'site differs', est: 'estimate' };

/* ── the maths ── */

/* Where a value falls among published anchors. Straight-line between
   them; beyond either end the outermost gap's slope is carried on and
   the result clamped, because "off the end of the table" is worth
   showing as 2nd or 98th rather than pretending to resolve further. */
function pctFromTable(v, a) {
  if (v <= a[0]) {
    const slope = (P[1] - P[0]) / (a[1] - a[0]);
    return Math.max(1, P[0] + (v - a[0]) * slope);
  }
  const n = a.length - 1;
  if (v >= a[n]) {
    const slope = (P[n] - P[n - 1]) / (a[n] - a[n - 1]);
    return Math.min(99, P[n] + (v - a[n]) * slope);
  }
  for (let i = 0; i < n; i++) {
    if (v <= a[i + 1]) {
      const f = (v - a[i]) / (a[i + 1] - a[i]);
      return P[i] + f * (P[i + 1] - P[i]);
    }
  }
  return 50;
}

/* Standard normal CDF — Zelen & Severo 26.2.17, good to ~7.5e-8,
   which is several orders of magnitude better than the data. */
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937
            + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

/* Where one measurement stands. `inches` is what is stored; `age` may
   be null, in which case the all-ages row is used and said so.

   `pct` is the raw population percentile — how many men you are bigger
   than. `score` is that read in the direction that counts, so a small
   waist and a big arm both come out high, and the bar can be one bar. */
export function standing(key, inches, age) {
  const spec = ANTHRO[key];
  if (!spec || typeof inches !== 'number' || !(inches > 0)) return null;
  const cm = inches * IN_TO_CM;

  let pct, group;
  if (spec.table) {
    const { row, lbl } = ageRow(spec.table, age);
    pct = pctFromTable(cm, row);
    group = lbl;
  } else {
    pct = normCdf((cm - spec.norm.mean) / spec.norm.sd) * 100;
    group = 'US Army men';
  }
  pct = Math.max(1, Math.min(99, pct));
  const score = spec.dir === -1 ? 100 - pct : pct;

  /* The sentence the row actually shows. Only the waist gets a value
     judgment, because it is the only one where a tape alone earns one. */
  const phrase = spec.dir === -1 ? `Leaner than ${Math.round(score)}% of ${group}`
               : spec.dir === 1  ? `Bigger than ${Math.round(pct)}% of ${group}`
               :                   `Bigger than ${Math.round(pct)}% of ${group}`;

  return { key, lbl: spec.lbl, pct, score, dir: spec.dir, group, phrase,
           src: spec.src, srcLabel: SRC_LABEL[spec.src], pop: spec.pop, note: spec.note };
}

/* Every site with a measurement on it, in TAPE order. `entry` is the
   latest taped entry; anything missing from it is simply skipped. */
export function standingsFor(entry, age, order) {
  if (!entry) return [];
  return order
    .filter(k => ANTHRO[k])
    .map(k => standing(k, entry[k], age))
    .filter(Boolean);
}
