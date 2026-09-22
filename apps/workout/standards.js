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
  /* ── `rng` — the rep range this movement is meant to fail in, low to
        high. Every working set here is taken to failure, so the count you
        hit IS the verdict on the load: land under the low number and the
        weight is heavier than the slot is asking for, land over the high
        one and it stopped being what stopped you. loadAdvice() in rank.js
        turns that into a weight.

        NOT a growth ranking. Schoenfeld's repetition-continuum work and
        the meta-analyses after it put hypertrophy at roughly equivalent
        anywhere from five reps to thirty when sets are taken close to
        failure and volume is equated, so no band here is buying more
        muscle than another. What the ranges encode is where each movement
        can be taken to failure honestly, repeatably and safely:

          5–8    loaded bar — the front squat and barbell RDL. The band
                 the strength literature actually programmes heavy
                 multi-joint work in, and the only lifts here where a bar
                 on the back of a hinge makes low reps the point.
          5–10   pull-ups and chin-ups. Bodyweight sets the floor; most
                 people cannot reach the teens on these regardless.
          8–12   dumbbell presses, rows, the hinge, split squats and the
                 hip thrust. The standard prescription for dumbbell
                 pressing, and it exists partly for a reason that applies
                 doubly here: a heavy pair has to be kicked into position
                 off the thighs with no spotter, and a five-rep set of
                 that is where people hurt shoulders.
          10–15  single-joint work with a long loaded stretch and a light
                 absolute load — flyes, pullovers, curls, overhead
                 extensions — plus the goblet squat, which is capped by
                 what one dumbbell lets you hold at the chest and so is
                 naturally a higher-rep slot. Loading a single joint for
                 heavy triples stresses the elbow or shoulder out of
                 proportion to what it buys.
          12–20  lateral raises, reverse flyes, calves and both wrist
                 curls. Small muscles with far more fatigue resistance and
                 almost no systemic cost; a three-rep max on a lateral
                 raise is both risky and pointless, and loading one for
                 six reps buys cheating rather than growth.

        This is NOT the same number as `reps` below, and the two are kept
        apart on purpose: `reps` is what Epley ASSUMES when nothing has
        been counted, `rng` is what the advisory MEASURES against once
        something has. Move these if your own failure points sit
        elsewhere — nothing downstream is calibrated to them. ── */

  /* ── published standard for the exact movement ── */
  'Incline Dumbbell Press':      { rng:[8,12], r:[0.25,0.35,0.50,0.65,0.85], src:'exact', base:'Incline dumbbell bench press' },
  'Dumbbell Bench Press':        { rng:[8,12], r:[0.20,0.35,0.50,0.70,0.90], src:'exact', base:'Dumbbell bench press' },
  'Dumbbell Shoulder Press':     { rng:[8,12], r:[0.15,0.25,0.40,0.55,0.70], src:'exact', base:'Dumbbell shoulder press' },
  'Dumbbell Flyes':              { rng:[10,15], r:[0.10,0.20,0.30,0.45,0.60], src:'exact', base:'Dumbbell fly' },
  'Overhead Tricep Extensions':  { rng:[10,15], r:[0.05,0.15,0.25,0.45,0.60], src:'exact', base:'Dumbbell tricep extension' },
  'Lateral Raises':              { rng:[12,20], r:[0.05,0.10,0.20,0.30,0.45], src:'exact', reps:15, base:'Dumbbell lateral raise' },
  'Reverse Flyes':               { rng:[12,20], r:[0.05,0.10,0.20,0.35,0.55], src:'exact', reps:15, base:'Dumbbell reverse fly' },
  'Hammer Curls':                { rng:[10,15], r:[0.10,0.20,0.30,0.40,0.55], src:'exact', base:'Hammer curl' },
  'Incline Curls':               { rng:[10,15], r:[0.10,0.15,0.25,0.35,0.45], src:'exact', base:'Incline dumbbell curl' },
  'Dumbbell Pullovers':          { rng:[10,15], r:[0.15,0.30,0.45,0.65,0.85], src:'exact', base:'Dumbbell pullover' },
  'Single-Arm Rows':             { rng:[8,12], r:[0.20,0.35,0.55,0.75,1.00], src:'exact', base:'Dumbbell row' },
  'Chest-Supported Rows':        { rng:[8,12], r:[0.15,0.30,0.45,0.70,0.95], src:'exact', base:'Chest-supported dumbbell row' },
  'Romanian Deadlifts':          { rng:[8,12], r:[0.20,0.35,0.55,0.80,1.05], src:'exact', base:'Dumbbell Romanian deadlift' },
  'Bulgarian Split Squats':      { rng:[8,12], r:[0.15,0.25,0.40,0.60,0.85], src:'exact', base:'Dumbbell Bulgarian split squat' },
  'Standing Calf Raises':        { rng:[12,20], r:[0.10,0.25,0.45,0.75,1.10], src:'exact', reps:15, base:'Dumbbell calf raise' },
  'Dumbbell Wrist Curls':        { rng:[12,20], r:[0.10,0.20,0.35,0.55,0.75], src:'exact', reps:15, base:'Dumbbell wrist curl' },
  'Dumbbell Reverse Wrist Curls':{ rng:[12,20], r:[0.05,0.10,0.20,0.35,0.55], src:'exact', reps:15, base:'Dumbbell reverse wrist curl',
                                   note:'Read off a thinner dataset than the rest of this section — 3,783 qualifying results against 12,434 for the flexion version — so the tier boundaries are softer than they look.' },

  /* ── weighted pull-up / chin-up: the standard is ADDED weight ÷
        bodyweight, and the Beginner anchors are negative (assisted).
        Neither page publishes a ratio table, so these are read off
        the 140–160 lb rows of each page's 1RM added-weight table.
        Chin standards sit slightly above pull standards because
        people chin a little more than they pull — each grip now
        scores against its own data. ── */
  'Pull-Ups':                    { rng:[5,10], r:[-0.04,0.18,0.44,0.72,1.02], src:'exact', mode:'added', base:'Pull-up, 1RM added weight',
                                   note:'Logged weight is read as weight ADDED on a belt. Beginner is negative because that tier is still using assistance.' },
  'Chin-Ups':                    { rng:[5,10], r:[-0.01,0.20,0.45,0.73,1.01], src:'exact', mode:'added', base:'Chin-up, 1RM added weight',
                                   note:'Logged weight is read as weight ADDED on a belt — bodyweight-only reps stay unscored. Beginner is negative because that tier is still using assistance.' },

  /* ── barbell versions, in play only with the Barbell toggle on (off by
        default — see OWNED in rank.js and EQUIP in shell.js). The logged
        number is the whole bar, plates and all, which is also how the source
        measures these, so mult stays 1 and each ratio reads as total load ÷
        bodyweight. Read off the live pages Sep 2026 (~1.15M lifts for the
        RDL, ~1.22M for the hip thrust, ~1.6M for the front squat). The front
        squat is a proxy for the same reason the goblet is: the published
        movement is flat-footed. ── */
  'Barbell Romanian Deadlifts':  { bar:true, rng:[5,8], r:[0.75,1.00,1.50,2.00,2.75], src:'exact', base:'Romanian deadlift (barbell)',
                                   note:'Logged weight is the whole bar, plates included — not per hand.' },
  'Barbell Hip Thrusts':         { bar:true, rng:[8,12], r:[0.50,1.25,1.75,2.75,3.75], src:'exact', base:'Hip thrust (barbell)',
                                   note:'Logged weight is the whole bar, plates included.' },
  'Heel-Elevated Front Squats':  { bar:true, rng:[5,8], r:[0.75,1.00,1.25,1.75,2.25], src:'proxy', base:'Front squat',
                                   note:'Heel elevation makes the movement slightly easier than the published version. Logged weight is the whole bar, plates included.' },

  /* ── closest published movement ── */
  'Heel-Elevated Goblet Squats': { rng:[10,15], r:[0.20,0.35,0.55,0.75,1.05], src:'proxy', base:'Goblet squat',
                                   note:'Heel elevation makes the movement slightly easier than the published version.' },
  'Preacher Curls':              { rng:[10,15], r:[0.10,0.15,0.25,0.35,0.45], src:'proxy', base:'Incline dumbbell curl',
                                   note:'No dumbbell preacher-curl data exists — the published preacher curl is the barbell version. Incline curl is the closest dumbbell match: both are strict, elbow-isolated curls, though the pad shortens the long head where the incline stretches it.' },

};

/* ── what the dumbbells can actually be set to ──

   A recommendation you cannot dial in is not a recommendation. The pair
   this program is run with is a FitRx SmartBell, which is a quick-select
   adjustable rated 5–52.5 lb per dumbbell across fifteen settings — 2.5 lb
   apart up to 25, then 5 lb apart to 50, with 52.5 as the last rung. There
   is no 32.5 and there never was.

   Per DUMBBELL, which is also how every entry above logs a dumbbell lift
   (see `mult`), so the two agree without any conversion.

   Only the dumbbell movements snap to this. A loaded bar and a pull-up
   belt are made up of whatever plates are to hand and have no ladder worth
   naming, so those fall back to the plain 2.5 lb step — as does any weight
   already sitting above the top rung, since that is proof of equipment
   this list does not describe.

   Swap the array if the dumbbells change; nothing else needs touching. */
export const DB_LADDER = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5];

/* Whether a lift is loaded with one of the above. The barbell rows log the
   whole bar and an 'added' lift logs what is hanging off a belt. */
export const onLadder = spec => !spec.bar && spec.mode !== 'added';

/* Back-compat alias: the ratio-only view of LIFTS. */
export const RATIOS = Object.fromEntries(Object.entries(LIFTS).map(([k, v]) => [k, v.r]));

export const SRC_LABEL = { exact:'', proxy:'Proxy', est:'Estimate' };

/* Percentile anchors for the five tiers, used to interpolate a score. */
export const TIER_PCT = [5, 20, 50, 80, 95];

/* Letter ranks. `min` is the score floor. Blunt on purpose.

   On a single lift the score IS a percentile and the letters mean what
   they look like. On the composite it is an average of percentiles, which
   is not itself one — so the blurbs describe the standard you are meeting
   ("the band where the published tables put an advanced lifter") rather
   than a slice of a population ("top fifth of people who log lifts"). The
   distinction is small in words and total in what is being claimed. */
export const RANKS = [
  { l:'F',  min:0,    name:'Untrained',    c:'--rk-f', blurb:'Below the weakest bracket the published tables cover. Nothing here yet.' },
  { l:'D',  min:5,    name:'Beginner',     c:'--rk-d',    blurb:'You have started. That is the entire compliment.' },
  { l:'C',  min:20,   name:'Novice',       c:'--rk-c',  blurb:'Past beginner on the tables, short of where they put the average gym-goer.' },
  { l:'B',  min:50,   name:'Intermediate', c:'--rk-b',   blurb:'The middle of the published standards. Years of consistent work separate this from strong.' },
  { l:'A',  min:80,   name:'Advanced',     c:'--rk-a', blurb:'Genuinely strong — the band the tables call advanced.' },
  { l:'S',  min:95,   name:'Elite',        c:'--rk-s',  blurb:'The elite band of the published standards. Very few get here without years of hard training.' },
  { l:'SS', min:99.5, name:'Freak',        c:'--rk-ss',   blurb:'Above the published elite benchmark, which is where the data stops rather than where people do.' },
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
   New International Version. Rotates by day-of-year, so it changes at
   midnight and holds all day. 129 of them: a whole year of training runs
   without the list wrapping.

   Wording was checked against the published NIV text rather than typed
   from memory, because a misquoted verse is worse than no verse. Where a
   quote is shorter than its verse it is cut at a clause boundary and
   never spliced, and the reference says exactly which verses are quoted.

   REQUIRED NOTICE. The NIV is under copyright. Its publisher's terms
   allow quoting up to 500 verses without written permission provided the
   notice below travels with the work — hence VERSE_NOTICE, which the card
   carries on its reference line rather than leaving it buried in here.
   ══════════════════════════════════════════════════════════ */

export const VERSE_NOTICE =
  'Holy Bible, New International Version®, NIV®. '
  + 'Copyright ©1973, 1978, 1984, 2011 by Biblica, Inc.® '
  + 'Used by permission. All rights reserved worldwide.';

export const VERSES = [
  { t:'I can do all this through him who gives me strength.', r:'Philippians 4:13' },
  { t:'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', r:'Isaiah 40:31' },
  { t:'He gives strength to the weary and increases the power of the weak.', r:'Isaiah 40:29' },
  { t:'It is God who arms me with strength and keeps my way secure.', r:'Psalm 18:32' },
  { t:'He trains my hands for battle; my arms can bend a bow of bronze.', r:'Psalm 18:34' },
  { t:'Praise be to the LORD my Rock, who trains my hands for war, my fingers for battle.', r:'Psalm 144:1' },
  { t:'With your help I can advance against a troop; with my God I can scale a wall.', r:'Psalm 18:29' },
  { t:'The LORD is my strength and my shield; my heart trusts in him, and he helps me.', r:'Psalm 28:7' },
  { t:'My flesh and my heart may fail, but God is the strength of my heart and my portion forever.', r:'Psalm 73:26' },
  { t:'The LORD gives strength to his people; the LORD blesses his people with peace.', r:'Psalm 29:11' },
  { t:'God is our refuge and strength, an ever-present help in trouble.', r:'Psalm 46:1' },
  { t:'The LORD is my strength and my defense; he has become my salvation.', r:'Exodus 15:2' },
  { t:'The Sovereign LORD is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights.', r:'Habakkuk 3:19' },
  { t:'Look to the LORD and his strength; seek his face always.', r:'1 Chronicles 16:11' },
  { t:'They go from strength to strength, till each appears before God in Zion.', r:'Psalm 84:7' },
  { t:'Blessed are those whose strength is in you, whose hearts are set on pilgrimage.', r:'Psalm 84:5' },
  { t:'My soul is weary with sorrow; strengthen me according to your word.', r:'Psalm 119:28' },
  { t:'When I called, you answered me; you greatly emboldened me.', r:'Psalm 138:3' },
  { t:'Do not grieve, for the joy of the LORD is your strength.', r:'Nehemiah 8:10' },
  { t:'Not by might nor by power, but by my Spirit, says the LORD Almighty.', r:'Zechariah 4:6' },
  { t:'My grace is sufficient for you, for my power is made perfect in weakness.', r:'2 Corinthians 12:9' },
  { t:'I pray that out of his glorious riches he may strengthen you with power through his Spirit in your inner being.', r:'Ephesians 3:16' },
  { t:'Being strengthened with all power according to his glorious might so that you may have great endurance and patience.', r:'Colossians 1:11' },
  { t:'Finally, be strong in the Lord and in his mighty power.', r:'Ephesians 6:10' },
  { t:'The LORD will guide you always; he will satisfy your needs in a sun-scorched land and will strengthen your frame.', r:'Isaiah 58:11' },
  { t:'I lift up my eyes to the mountains—where does my help come from? My help comes from the LORD, the Maker of heaven and earth.', r:'Psalm 121:1-2' },
  { t:'Who satisfies your desires with good things so that your youth is renewed like the eagle\'s.', r:'Psalm 103:5' },
  { t:'In repentance and rest is your salvation, in quietness and trust is your strength.', r:'Isaiah 30:15' },
  { t:'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.', r:'1 Corinthians 9:24' },
  { t:'I do not run like someone running aimlessly; I do not fight like a boxer beating the air. No, I strike a blow to my body and make it my slave.', r:'1 Corinthians 9:26-27' },
  { t:'Let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us.', r:'Hebrews 12:1' },
  { t:'Fixing our eyes on Jesus, the pioneer and perfecter of faith. For the joy set before him he endured the cross, scorning its shame.', r:'Hebrews 12:2' },
  { t:'I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.', r:'Philippians 3:14' },
  { t:'I have fought the good fight, I have finished the race, I have kept the faith.', r:'2 Timothy 4:7' },
  { t:'My only aim is to finish the race and complete the task the Lord Jesus has given me.', r:'Acts 20:24' },
  { t:'Anyone who competes as an athlete does not receive the victor\'s crown except by competing according to the rules.', r:'2 Timothy 2:5' },
  { t:'Fight the good fight of the faith. Take hold of the eternal life to which you were called.', r:'1 Timothy 6:12' },
  { t:'I run in the path of your commands, for you have broadened my understanding.', r:'Psalm 119:32' },
  { t:'Let your eyes look straight ahead; fix your gaze directly before you.', r:'Proverbs 4:25' },
  { t:'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', r:'Galatians 6:9' },
  { t:'And as for you, brothers and sisters, never tire of doing what is good.', r:'2 Thessalonians 3:13' },
  { t:'Be strong and do not give up, for your work will be rewarded.', r:'2 Chronicles 15:7' },
  { t:'Stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain.', r:'1 Corinthians 15:58' },
  { t:'You need to persevere so that when you have done the will of God, you will receive what he has promised.', r:'Hebrews 10:36' },
  { t:'Let us hold unswervingly to the hope we profess, for he who promised is faithful.', r:'Hebrews 10:23' },
  { t:'Never be lacking in zeal, but keep your spiritual fervor, serving the Lord.', r:'Romans 12:11' },
  { t:'Be joyful in hope, patient in affliction, faithful in prayer.', r:'Romans 12:12' },
  { t:'I am carrying on a great project and cannot go down.', r:'Nehemiah 6:3' },
  { t:'That person is like a tree planted by streams of water, which yields its fruit in season and whose leaf does not wither.', r:'Psalm 1:3' },
  { t:'Train yourself to be godly.', r:'1 Timothy 4:7' },
  { t:'For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come.', r:'1 Timothy 4:8' },
  { t:'No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.', r:'Hebrews 12:11' },
  { t:'Therefore, strengthen your feeble arms and weak knees.', r:'Hebrews 12:12' },
  { t:'Strengthen the feeble hands, steady the knees that give way.', r:'Isaiah 35:3' },
  { t:'Whoever wants to be my disciple must deny themselves and take up their cross daily and follow me.', r:'Luke 9:23' },
  { t:'Watch and pray so that you will not fall into temptation. The spirit is willing, but the flesh is weak.', r:'Matthew 26:41' },
  { t:'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', r:'2 Timothy 1:7' },
  { t:'Make every effort to add to your faith goodness; and to goodness, knowledge; and to knowledge, self-control; and to self-control, perseverance.', r:'2 Peter 1:5-6' },
  { t:'Like a city whose walls are broken through is a person who lacks self-control.', r:'Proverbs 25:28' },
  { t:'Better a patient person than a warrior, one with self-control than one who takes a city.', r:'Proverbs 16:32' },
  { t:'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.', r:'Galatians 5:22-23' },
  { t:'Therefore, with minds that are alert and fully sober, set your hope on the grace to be brought to you.', r:'1 Peter 1:13' },
  { t:'Daniel resolved not to defile himself with the royal food and wine.', r:'Daniel 1:8' },
  { t:'A sluggard\'s appetite is never filled, but the desires of the diligent are fully satisfied.', r:'Proverbs 13:4' },
  { t:'Diligent hands will rule, but laziness ends in forced labor.', r:'Proverbs 12:24' },
  { t:'Lazy hands make for poverty, but diligent hands bring wealth.', r:'Proverbs 10:4' },
  { t:'Sluggards do not plow in season; so at harvest time they look but find nothing.', r:'Proverbs 20:4' },
  { t:'Go to the ant, you sluggard; consider its ways and be wise!', r:'Proverbs 6:6' },
  { t:'All hard work brings a profit, but mere talk leads only to poverty.', r:'Proverbs 14:23' },
  { t:'The plans of the diligent lead to profit as surely as haste leads to poverty.', r:'Proverbs 21:5' },
  { t:'Those who work their land will have abundant food, but those who chase fantasies will have their fill of poverty.', r:'Proverbs 28:19' },
  { t:'Do you see someone skilled in their work? They will serve before kings.', r:'Proverbs 22:29' },
  { t:'Whatever your hand finds to do, do it with all your might.', r:'Ecclesiastes 9:10' },
  { t:'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', r:'Colossians 3:23' },
  { t:'Whoever can be trusted with very little can also be trusted with much.', r:'Luke 16:10' },
  { t:'Do not merely listen to the word, and so deceive yourselves. Do what it says.', r:'James 1:22' },
  { t:'She sets about her work vigorously; her arms are strong for her tasks.', r:'Proverbs 31:17' },
  { t:'Though the righteous fall seven times, they rise again.', r:'Proverbs 24:16' },
  { t:'The LORD makes firm the steps of the one who delights in him; though he may stumble, he will not fall, for the LORD upholds him with his hand.', r:'Psalm 37:23-24' },
  { t:'We are hard pressed on every side, but not crushed; perplexed, but not in despair; persecuted, but not abandoned; struck down, but not destroyed.', r:'2 Corinthians 4:8-9' },
  { t:'Therefore we do not lose heart. Though outwardly we are wasting away, yet inwardly we are being renewed day by day.', r:'2 Corinthians 4:16' },
  { t:'The righteous will hold to their ways, and those with clean hands will grow stronger.', r:'Job 17:9' },
  { t:'Consider it pure joy whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.', r:'James 1:2-3' },
  { t:'We also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.', r:'Romans 5:3-4' },
  { t:'Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.', r:'James 1:12' },
  { t:'The God of all grace, who called you to his eternal glory in Christ, after you have suffered a little while, will himself restore you and make you strong, firm and steadfast.', r:'1 Peter 5:10' },
  { t:'God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out so that you can endure it.', r:'1 Corinthians 10:13' },
  { t:'Cast your cares on the LORD and he will sustain you; he will never let the righteous be shaken.', r:'Psalm 55:22' },
  { t:'For everyone born of God overcomes the world. This is the victory that has overcome the world, even our faith.', r:'1 John 5:4' },
  { t:'No, in all these things we are more than conquerors through him who loved us.', r:'Romans 8:37' },
  { t:'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.', r:'Joshua 1:9' },
  { t:'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.', r:'Deuteronomy 31:6' },
  { t:'Be on your guard; stand firm in the faith; be courageous; be strong.', r:'1 Corinthians 16:13' },
  { t:'Wait for the LORD; be strong and take heart and wait for the LORD.', r:'Psalm 27:14' },
  { t:'Be strong and take heart, all you who hope in the LORD.', r:'Psalm 31:24' },
  { t:'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.', r:'Isaiah 41:10' },
  { t:'For I am the LORD your God who takes hold of your right hand and says to you, Do not fear; I will help you.', r:'Isaiah 41:13' },
  { t:'The LORD is my light and my salvation—whom shall I fear? The LORD is the stronghold of my life—of whom shall I be afraid?', r:'Psalm 27:1' },
  { t:'The Lord is my helper; I will not be afraid. What can mere mortals do to me?', r:'Hebrews 13:6' },
  { t:'What, then, shall we say in response to these things? If God is for us, who can be against us?', r:'Romans 8:31' },
  { t:'When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.', r:'Isaiah 43:2' },
  { t:'Join with me in suffering, like a good soldier of Christ Jesus.', r:'2 Timothy 2:3' },
  { t:'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.', r:'Psalm 139:14' },
  { t:'You are not your own; you were bought at a price. Therefore honor God with your bodies.', r:'1 Corinthians 6:19-20' },
  { t:'Offer your bodies as a living sacrifice, holy and pleasing to God—this is your true and proper worship.', r:'Romans 12:1' },
  { t:'So whether you eat or drink or whatever you do, do it all for the glory of God.', r:'1 Corinthians 10:31' },
  { t:'Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength.', r:'Mark 12:30' },
  { t:'People look at the outward appearance, but the LORD looks at the heart.', r:'1 Samuel 16:7' },
  { t:'The glory of young men is their strength, gray hair the splendor of the old.', r:'Proverbs 20:29' },
  { t:'His pleasure is not in the strength of the horse, nor his delight in the legs of the warrior; the LORD delights in those who fear him.', r:'Psalm 147:10-11' },
  { t:'The wise prevail through great power, and those who have knowledge muster their strength.', r:'Proverbs 24:5' },
  { t:'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', r:'Proverbs 3:5-6' },
  { t:'Commit to the LORD whatever you do, and he will establish your plans.', r:'Proverbs 16:3' },
  { t:'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.', r:'Jeremiah 29:11' },
  { t:'You will keep in perfect peace those whose minds are steadfast, because they trust in you.', r:'Isaiah 26:3' },
  { t:'I keep my eyes always on the LORD. With him at my right hand, I will not be shaken.', r:'Psalm 16:8' },
  { t:'Set your minds on things above, not on earthly things.', r:'Colossians 3:2' },
  { t:'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', r:'Matthew 6:33' },
  { t:'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', r:'Philippians 4:6' },
  { t:'Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.', r:'1 Thessalonians 5:16-18' },
  { t:'For we live by faith, not by sight.', r:'2 Corinthians 5:7' },
  { t:'Humble yourselves, therefore, under God\'s mighty hand, that he may lift you up in due time.', r:'1 Peter 5:6' },
  { t:'Come to me, all you who are weary and burdened, and I will give you rest.', r:'Matthew 11:28' },
  { t:'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.', r:'Romans 15:13' },
  { t:'As iron sharpens iron, so one person sharpens another.', r:'Proverbs 27:17' },
  { t:'Two are better than one, because they have a good return for their labor: if either of them falls down, one can help the other up.', r:'Ecclesiastes 4:9-10' },
  { t:'I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit; apart from me you can do nothing.', r:'John 15:5' },
  { t:'For it is God who works in you to will and to act in order to fulfill his good purpose.', r:'Philippians 2:13' },
  { t:'Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.', r:'Philippians 1:6' },
];

/* Same verse all day, different verse tomorrow. */
export function verseFor(dateStrYMD) {
  const d = new Date(dateStrYMD + 'T00:00:00');
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return VERSES[doy % VERSES.length];
}
