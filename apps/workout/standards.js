/* ═══════════════════════════════════════════════════════════
   STRENGTH STANDARDS + DAILY SCRIPTURE

   LIFTS holds one entry per weighted exercise in the program:

     r     five bodyweight-ratio anchors, in order
             [Beginner, Novice, Intermediate, Advanced, Elite]
           which sit at roughly the 5th / 20th / 50th / 80th / 95th
           percentile of everyone logging that lift at your bodyweight.
     src   how much to trust it:
             'exact'  published standard for this exact movement
             'proxy'  scored on the closest published movement
             'est'    no published data; converted from a related
                      barbell lift with the stated rule
     mult  logged weight × this = the weight the standard refers to
           (default 1 = one dumbbell, which is how the source measures
           dumbbell lifts; the barbell rows log the whole bar, which is
           also how the source measures those, so they stay at 1 too)
     mode  'added' → the logged number is weight ADDED to bodyweight
     reps  score this lift at this many reps instead of the global
           setting, for movements whose failure point sits nowhere
           near it
     base  which published movement the numbers came from

   Source: https://strengthlevel.com/strength-standards (per-lift
   pages, lb, male, "Bodyweight Ratio" table). Retrieved Jul 2026,
   re-verified against the live pages Aug 2026 — every ratio-table
   entry matched, and Pull-Ups, Chin-Ups and Chest-Supported Rows were
   corrected to the published data (see each entry). The two wrist
   curls were read off the live pages Sep 2026, when they took the
   farmer's carry's slot. Datasets run from ~58k lifts (dumbbell
   reverse wrist curl) to ~5M per exercise.

   Known approximation, carried on purpose: the site's headline
   ratios track its ~140–160 lb table rows, and its full tables
   scale sub-linearly with bodyweight — so one flat ratio reads a
   little strict for heavier lifters and a little soft for lighter
   ones. The two entries with no published ratio table (Pull-Ups,
   Chin-Ups) are anchored on the same 140–160 lb band so the whole
   file errs in one consistent direction.

   Core work never appears here, for two different reasons. Dead bugs
   take no load at all, so there is nothing to score. The weighted core
   movements — dumbbell crunch, weighted reverse crunch / hanging leg
   raise, weighted side plank — do take load, but no usable standard
   exists for them: Strength Level scores crunches and leg raises in
   REPS at bodyweight, not in weight, and its weighted-flexion
   entries (cable crunches, ~0.75× bodyweight at Intermediate)
   load through a rope overhead rather than a dumbbell at the chest,
   so it is nowhere near comparable. Rather than invent a number,
   these log their weight and read as unscored — which still gives the
   progressive-overload trail, which is the point of loading them.

   B-Stance Hip Thrusts left for a third reason: reachability. It was the
   file's only 'est' row -- barbell hip-thrust ratios halved for
   one-leg-dominant work -- and both halves of that were wrong. A B-stance
   thrust is not a one-leg thrust; the kickstand leg carries perhaps a fifth
   of the load, so halving asks for less than the tier should. And the number
   it produced was unreachable regardless: at 170 lb bodyweight Intermediate
   wanted a 112 lb dumbbell balanced on the hips, and Elite 240 lb. A lift
   pinned to the floor of its scale still averages into the overall rank,
   which is exactly why the B-Stance RDL standard was dropped in ce2a0c7. It
   now logs weight and reads unscored, like the prone leg curl. With the
   Barbell toggle on, that slot runs a bilateral barbell hip thrust instead,
   and that one does have a published standard -- see the barbell rows below.

   Saturday's calisthenics work is absent for the same reason: Strength
   Level scores push-ups, dips and bodyweight chin-ups in REPS, and the
   holds (wall handstand, hollow, arch) in seconds, neither of which this
   weight-based model can read. Chin-Ups are the one exception — like
   Pull-Ups they take a belt, so once weight is added they score below.
   ═══════════════════════════════════════════════════════════ */

export const LIFTS = {

  /* ── reps overrides. Epley reads a working weight as a 1RM through the
        rep count it was taken to, and one global dial cannot be right for a
        press that fails in the high single digits and a calf raise that
        fails in the high teens. Left on the dial, these five read low --
        a lift genuinely failed at 20 is being scored as if it stopped at
        10, which is roughly 25% light. The numbers below are the middle of
        each movement's honest failure range, not measurements; move them
        if yours sit elsewhere. ── */
  /* ── published standard for the exact movement ── */
  'Incline Dumbbell Press':      { r:[0.25,0.35,0.50,0.65,0.85], src:'exact', base:'Incline dumbbell bench press' },
  'Dumbbell Bench Press':        { r:[0.20,0.35,0.50,0.70,0.90], src:'exact', base:'Dumbbell bench press' },
  'Dumbbell Shoulder Press':     { r:[0.15,0.25,0.40,0.55,0.70], src:'exact', base:'Dumbbell shoulder press' },
  'Dumbbell Flyes':              { r:[0.10,0.20,0.30,0.45,0.60], src:'exact', base:'Dumbbell fly' },
  'Overhead Tricep Extensions':  { r:[0.05,0.15,0.25,0.45,0.60], src:'exact', base:'Dumbbell tricep extension' },
  'Lateral Raises':              { r:[0.05,0.10,0.20,0.30,0.45], src:'exact', reps:15, base:'Dumbbell lateral raise' },
  'Reverse Flyes':               { r:[0.05,0.10,0.20,0.35,0.55], src:'exact', reps:15, base:'Dumbbell reverse fly' },
  'Hammer Curls':                { r:[0.10,0.20,0.30,0.40,0.55], src:'exact', base:'Hammer curl' },
  'Incline Curls':               { r:[0.10,0.15,0.25,0.35,0.45], src:'exact', base:'Incline dumbbell curl' },
  'Dumbbell Pullovers':          { r:[0.15,0.30,0.45,0.65,0.85], src:'exact', base:'Dumbbell pullover' },
  'Single-Arm Rows':             { r:[0.20,0.35,0.55,0.75,1.00], src:'exact', base:'Dumbbell row' },
  'Chest-Supported Rows':        { r:[0.15,0.30,0.45,0.70,0.95], src:'exact', base:'Chest-supported dumbbell row' },
  'Romanian Deadlifts':          { r:[0.20,0.35,0.55,0.80,1.05], src:'exact', base:'Dumbbell Romanian deadlift' },
  'Bulgarian Split Squats':      { r:[0.15,0.25,0.40,0.60,0.85], src:'exact', base:'Dumbbell Bulgarian split squat' },
  'Standing Calf Raises':        { r:[0.10,0.25,0.45,0.75,1.10], src:'exact', reps:15, base:'Dumbbell calf raise' },
  'Dumbbell Wrist Curls':        { r:[0.10,0.20,0.35,0.55,0.75], src:'exact', reps:15, base:'Dumbbell wrist curl' },
  'Dumbbell Reverse Wrist Curls':{ r:[0.05,0.10,0.20,0.35,0.55], src:'exact', reps:15, base:'Dumbbell reverse wrist curl',
                                   note:'Read off a thinner dataset than the rest of this section — 3,783 qualifying results against 12,434 for the flexion version — so the tier boundaries are softer than they look.' },

  /* ── weighted pull-up / chin-up: the standard is ADDED weight ÷
        bodyweight, and the Beginner anchors are negative (assisted).
        Neither page publishes a ratio table, so these are read off
        the 140–160 lb rows of each page's 1RM added-weight table.
        Chin standards sit slightly above pull standards because
        people chin a little more than they pull — each grip now
        scores against its own data. ── */
  'Pull-Ups':                    { r:[-0.04,0.18,0.44,0.72,1.02], src:'exact', mode:'added', base:'Pull-up, 1RM added weight',
                                   note:'Logged weight is read as weight ADDED on a belt. Beginner is negative because that tier is still using assistance.' },
  'Chin-Ups':                    { r:[-0.01,0.20,0.45,0.73,1.01], src:'exact', mode:'added', base:'Chin-up, 1RM added weight',
                                   note:'Logged weight is read as weight ADDED on a belt — bodyweight-only reps stay unscored. Beginner is negative because that tier is still using assistance.' },

  /* ── barbell versions, in play only with the Barbell toggle on (off by
        default — see OWNED in rank.js and EQUIP in shell.js). The logged
        number is the whole bar, plates and all, which is also how the source
        measures these, so mult stays 1 and each ratio reads as total load ÷
        bodyweight. Read off the live pages Sep 2026 (~1.15M lifts for the
        RDL, ~1.22M for the hip thrust, ~1.6M for the front squat). The front
        squat is a proxy for the same reason the goblet is: the published
        movement is flat-footed. ── */
  'Barbell Romanian Deadlifts':  { r:[0.75,1.00,1.50,2.00,2.75], src:'exact', base:'Romanian deadlift (barbell)',
                                   note:'Logged weight is the whole bar, plates included — not per hand.' },
  'Barbell Hip Thrusts':         { r:[0.50,1.25,1.75,2.75,3.75], src:'exact', base:'Hip thrust (barbell)',
                                   note:'Logged weight is the whole bar, plates included.' },
  'Heel-Elevated Front Squats':  { r:[0.75,1.00,1.25,1.75,2.25], src:'proxy', base:'Front squat',
                                   note:'Heel elevation makes the movement slightly easier than the published version. Logged weight is the whole bar, plates included.' },

  /* ── closest published movement ── */
  'Heel-Elevated Goblet Squats': { r:[0.20,0.35,0.55,0.75,1.05], src:'proxy', base:'Goblet squat',
                                   note:'Heel elevation makes the movement slightly easier than the published version.' },
  'Preacher Curls':              { r:[0.10,0.15,0.25,0.35,0.45], src:'proxy', base:'Incline dumbbell curl',
                                   note:'No dumbbell preacher-curl data exists — the published preacher curl is the barbell version. Incline curl is the closest dumbbell match: both are strict, elbow-isolated curls, though the pad shortens the long head where the incline stretches it.' },

};

/* Back-compat alias: the ratio-only view of LIFTS. */
export const RATIOS = Object.fromEntries(Object.entries(LIFTS).map(([k, v]) => [k, v.r]));

export const SRC_LABEL = { exact:'', proxy:'Proxy', est:'Estimate' };

/* Percentile anchors for the five tiers, used to interpolate a score. */
export const TIER_PCT = [5, 20, 50, 80, 95];

/* Letter ranks. `min` is the percentile floor. Blunt on purpose. */
export const RANKS = [
  { l:'F',  min:0,    name:'Untrained',    c:'--rk-f', blurb:'Below the weakest bracket that gets logged. Nothing here yet.' },
  { l:'D',  min:5,    name:'Beginner',     c:'--rk-d',    blurb:'You have started. That is the entire compliment.' },
  { l:'C',  min:20,   name:'Novice',       c:'--rk-c',  blurb:'Stronger than a beginner, weaker than the average gym-goer.' },
  { l:'B',  min:50,   name:'Intermediate', c:'--rk-b',   blurb:'Average. Years of consistent work separate this from strong.' },
  { l:'A',  min:80,   name:'Advanced',     c:'--rk-a', blurb:'Genuinely strong. Top fifth of people who log lifts.' },
  { l:'S',  min:95,   name:'Elite',        c:'--rk-s',  blurb:'Top 5%. Very few get here without years of hard training.' },
  { l:'SS', min:99.5, name:'Freak',        c:'--rk-ss',   blurb:'Beyond the published standards entirely.' },
];

export function rankFor(pct) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (pct >= RANKS[k].min) i = k;
  return { ...RANKS[i], i, next: i + 1 < RANKS.length ? RANKS[i + 1] : null };
}

/* Percentile → colour, red through amber to green, for reading "low end"
   vs "high end" at a glance without looking up the letter. Interpolated in
   HSL rather than stepped by rank, so a lift creeping up its band shifts
   colour continuously — that drift is the signal that it's ready to go up.
   Hard-coded endpoints: both themes put --red and --green in the same
   corners of the wheel, so one scale reads correctly in each. */
/* 1st / 2nd / 3rd / 11th / 21st — percentiles are read out loud often
   enough that "51th" is jarring. */
export function ord(n) {
  const v = Math.round(n), t = v % 100;
  if (t >= 11 && t <= 13) return `${v}th`;
  return `${v}${['th','st','nd','rd'][v % 10] || 'th'}`;
}

/* The scale had one job and did the opposite of it.

   A straight hue sweep at constant HSL lightness looks even and is not:
   yellow carries far more luminance than red or green at the same L. The
   old scale peaked at the 40th percentile — a mediocre lift was the
   BRIGHTEST thing on the tab, brighter than an S — so the eye's strongest
   signal, brightness, pointed at the middle while hue pointed at the ends.
   That is why everything from a weak C to a good B read as much the same
   shade of bright yellow-ish. On the light theme it was worse than similar:
   most of the range sat at 1.2–1.8:1 against white, which is not a colour
   choice, it is illegible.

   So brightness now carries the same message hue does — dim and red at the
   bottom, bright and green at the top, monotonically — and the stops land
   on the rank boundaries, so the colour shifts where the letter does.

   Luminance is solved for rather than set, because equal L is not equal
   brightness. Each stop names a target relative luminance and the lightness
   that hits it is found by bisection, which is what keeps the ramp even to
   the eye instead of even on paper. */

/* Hue stops must ASCEND. 356 followed by 4 is eight degrees apart on the
   wheel and three hundred and fifty-two apart to a linear interpolator,
   which duly routed the bottom of the scale through green — an F rendering
   as mint. Start at 0 and climb. */
const HUE = [[0, 0], [5, 6], [20, 24], [50, 45], [80, 104], [95, 142], [100, 154]];
const SAT = [[0, 58], [5, 74], [20, 86], [50, 88], [80, 60], [95, 62], [100, 66]];

/* Targets differ by theme because the constraint does. On a near-black card
   everything has to be light enough to read; on white everything has to be
   dark enough, which caps the top of the ramp well below where a dark theme
   can take it. Same order, same message, different room to say it in. */
/* 0.205 rather than a rounder number: the darkest card is #0d0d0d, and
   4.5:1 against it needs relative luminance of 0.20. The bottom of the
   ramp is exactly as dim as it can be while an F is still legible. */
const LUM_DARK = [0.205, 0.62];
const LUM_LIGHT = [0.035, 0.135];

const at = (stops, pct) => {
  for (let i = 1; i < stops.length; i++) {
    if (pct <= stops[i][0]) {
      const [p0, v0] = stops[i - 1], [p1, v1] = stops[i];
      return v0 + (v1 - v0) * ((pct - p0) / (p1 - p0 || 1));
    }
  }
  return stops[stops.length - 1][1];
};

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const relLum = ([r, g, b]) => {
  const c = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/* Lightness that puts this hue at that luminance. Monotonic in l, so twenty
   halvings land well inside a rounding error. */
function lightnessFor(h, s, target) {
  let lo = 0, hi = 100;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (relLum(hslToRgb(h, s, mid)) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Which end of the ramp to aim at, decided from the theme's own background
   rather than a list of theme names — a theme added later gets the right
   treatment without touching this file. Memoised on the theme attribute,
   since it is read once per lift per render. */
let _themeKey = null, _dark = true;
function onDarkBg() {
  if (typeof document === 'undefined') return true;
  const key = document.documentElement.getAttribute('data-theme') || '';
  if (key === _themeKey) return _dark;
  _themeKey = key;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(raw);
  _dark = m
    ? relLum([0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)) < 0.4
    : true;
  return _dark;
}

export function pctColor(pct) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const h = at(HUE, p), s = at(SAT, p);
  const [lo, hi] = onDarkBg() ? LUM_DARK : LUM_LIGHT;
  const l = lightnessFor(h, s, lo + (hi - lo) * (p / 100));
  return `hsl(${h.toFixed(1)}, ${s.toFixed(0)}%, ${l.toFixed(1)}%)`;
}

/* ═══════════════════ DAILY SCRIPTURE ═══════════════════
   King James Version (public domain). Rotates by day-of-year so it
   changes at midnight and is the same all day.
   ═══════════════════════════════════════════════════════════ */
export const VERSES = [
  { t:'I can do all things through Christ which strengtheneth me.', r:'Philippians 4:13' },
  { t:'They that wait upon the LORD shall renew their strength; they shall run, and not be weary.', r:'Isaiah 40:31' },
  { t:'Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.', r:'1 Corinthians 9:24' },
  { t:'I therefore so run, not as uncertainly; I keep under my body, and bring it into subjection.', r:'1 Corinthians 9:26-27' },
  { t:'Let us run with patience the race that is set before us.', r:'Hebrews 12:1' },
  { t:'Let us not be weary in well doing: for in due season we shall reap, if we faint not.', r:'Galatians 6:9' },
  { t:'The soul of the diligent shall be made fat.', r:'Proverbs 13:4' },
  { t:'Whatsoever thy hand findeth to do, do it with thy might.', r:'Ecclesiastes 9:10' },
  { t:'Whatsoever ye do, do it heartily, as to the Lord, and not unto men.', r:'Colossians 3:23' },
  { t:'Be strong and of a good courage; be not afraid, neither be thou dismayed.', r:'Joshua 1:9' },
  { t:'It is God that girdeth me with strength, and maketh my way perfect.', r:'Psalm 18:32' },
  { t:'A just man falleth seven times, and riseth up again.', r:'Proverbs 24:16' },
  { t:'I press toward the mark for the prize of the high calling of God in Christ Jesus.', r:'Philippians 3:14' },
  { t:'I have fought a good fight, I have finished my course, I have kept the faith.', r:'2 Timothy 4:7' },
  { t:'Fear thou not; for I am with thee: I will strengthen thee; yea, I will help thee.', r:'Isaiah 41:10' },
  { t:'The LORD is my light and my salvation; the LORD is the strength of my life.', r:'Psalm 27:1' },
  { t:'The hand of the diligent shall bear rule: but the slothful shall be under tribute.', r:'Proverbs 12:24' },
  { t:'Blessed is the man that endureth temptation.', r:'James 1:12' },
  { t:'Tribulation worketh patience; and patience, experience; and experience, hope.', r:'Romans 5:3-4' },
  { t:'The joy of the LORD is your strength.', r:'Nehemiah 8:10' },
  { t:'My flesh and my heart faileth: but God is the strength of my heart.', r:'Psalm 73:26' },
  { t:'Seek the LORD, and his strength: seek his face continually.', r:'1 Chronicles 16:11' },
  { t:'The sluggard will not plow by reason of the cold; therefore shall he beg in harvest.', r:'Proverbs 20:4' },
  { t:'The spirit indeed is willing, but the flesh is weak.', r:'Matthew 26:41' },
  { t:'If any man will come after me, let him deny himself, and take up his cross daily.', r:'Luke 9:23' },
  { t:'No chastening seemeth joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness.', r:'Hebrews 12:11' },
  { t:'The God of all grace make you perfect, stablish, strengthen, settle you.', r:'1 Peter 5:10' },
  { t:'He giveth power to the faint; and to them that have no might he increaseth strength.', r:'Isaiah 40:29' },
  { t:'In the day when I cried thou answeredst me, and strengthenedst me in my soul.', r:'Psalm 138:3' },
  { t:'Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.', r:'Proverbs 27:17' },
  { t:'Not by might, nor by power, but by my spirit, saith the LORD of hosts.', r:'Zechariah 4:6' },
  { t:'My strength is made perfect in weakness.', r:'2 Corinthians 12:9' },
  { t:'He which hath begun a good work in you will perform it until the day of Jesus Christ.', r:'Philippians 1:6' },
  { t:'I will run the way of thy commandments, when thou shalt enlarge my heart.', r:'Psalm 119:32' },
  { t:'Let thine eyes look right on, and let thine eyelids look straight before thee.', r:'Proverbs 4:25' },
  { t:'Be strong in the Lord, and in the power of his might.', r:'Ephesians 6:10' },
  { t:'Be ye steadfast, unmoveable, always abounding in the work of the Lord.', r:'1 Corinthians 15:58' },
  { t:'God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', r:'2 Timothy 1:7' },
  { t:'Bodily exercise profiteth little: but godliness is profitable unto all things.', r:'1 Timothy 4:8' },
  { t:'Ye are not your own: for ye are bought with a price: therefore glorify God in your body.', r:'1 Corinthians 6:19-20' },
  { t:'Be strong and of a good courage, fear not, nor be afraid of them.', r:'Deuteronomy 31:6' },
  { t:'Wait on the LORD: be of good courage, and he shall strengthen thine heart.', r:'Psalm 27:14' },
  { t:'Watch ye, stand fast in the faith, quit you like men, be strong.', r:'1 Corinthians 16:13' },
  { t:'The LORD is my strength and my shield; my heart trusted in him, and I am helped.', r:'Psalm 28:7' },
];

/* Same verse all day, different verse tomorrow. */
export function verseFor(dateStrYMD) {
  const d = new Date(dateStrYMD + 'T00:00:00');
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return VERSES[doy % VERSES.length];
}
