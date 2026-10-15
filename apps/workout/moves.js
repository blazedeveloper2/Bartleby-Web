/* ═══════════════════════════════════════════════════════════
   WORKOUT — WHAT EACH EXERCISE'S ANIMATED REP LOOKS LIKE

   One entry per exercise the lab can show, keyed by its exact name as
   howto.js has it. timeline.js turns an entry into motion, rig.js into a
   3D body, stage.js draws it. The pose keys (angles, planted hands and
   feet, abduction, twist …) are listed at the top of rig.js; each entry
   also carries:

     scene    the kit around the body, at the program's settings: bench
              (x, seat y, back angle, len, flip, yaw — yaw 90 turns it
              end-on), wall, bar, mat, wedge, books, the Nordic anchor
     rest     the bench pad the trunk lies or leans on: 'back', 'seat',
              or 'pad' for whichever it is over. A 3D body thicker than
              the rig is fitted to touch it (stage.js); without it the
              pads only push skin out
     hold    what is held: n / f for the near / far hand ('db' handle
              across, 'db-side' and 'db-fwd' handle front-to-back),
              n alone for kit held in both hands ('db-both' across them,
              'db-axial', 'db-goblet', 'bb', 'wheel', 'db-feet'), hip for
              kit on the hips, pack for a backpack
     hi, hi2  the working muscles and the helpers, painted on the body
     tempo    [pose, seconds, label] in order; the loop moves into each
              pose over its seconds. Taken from the how-to's own cues
     still    the frame shown when motion is reduced
     peak     the contracted position, where the muscle glows brightest
              (defaults to `still`)
     cam      { az, el }: the starting view. az is degrees round from the
              figure's near side (0) toward its front (90); el is height
     sway     [key, amplitude, Hz] wobbles for balance holds
     turn     degrees a pair of 'db' handles angle in from straight across
              toward palms facing, as most lifters press dumbbells
     palm     which way the palms face, when what is held does not say it
              (avatar.js): fwd, back, up, down, in, out, floor, sup (a
              curl), or two joined by + to turn between them; { n, f }
              for each hand

   Positions were first written as side views and checked against each
   exercise's how-to and its sources in Oct 2026, then given their third
   dimension: grips at their real width, arms that open to the side,
   straddles, twists. Units are the drawing's own, about 1.1 cm: in the
   2D points the floor is at y = 194, a standing hip at about 111, an arm
   about 52 long; a third number is sideways (z), + toward the near side.
   tools/howto/check.mjs --anim flags any frame with a joint through the
   floor or a planted hand or foot off its mark.
   ═══════════════════════════════════════════════════════════ */

const ANK = 190.3;     // an ankle with the foot flat on the floor
const PALM = 190.8;    // a wrist with the palm flat on the floor
const KNEE = 189.3;    // a knee resting on the floor
const WHEEL = 183.5;   // a wrist on an ab wheel's handles
const TOE = 191.1;     // the ball of a foot on the floor
const DB2 = { n: 'db', f: 'db' };
const DBS2 = { n: 'db-side', f: 'db-side' };
const DBF2 = { n: 'db-fwd', f: 'db-fwd' };

/* Starting views. */
const CAM = {
  stand: { az: 40, el: 8 },
  bench: { az: 32, el: 22 },
  seat: { az: 42, el: 12 },
  floor: { az: 34, el: 22 },
  hang: { az: 42, el: 4 },
  invert: { az: 30, el: 6 },
};

/* ── shared positions ── */

/* Lying back on a flat bench at x = 100, head to the left. */
const SUPINE = { hip: [93, 149.5], torso: 180, foot: [133, ANK] };   // knees just past the end of the seat
/* Seated against a back pad set to 55°. */
const RECLINED = { hip: [84.7, 151.9], torso: 125, foot: [126, ANK] };
/* A chest-to-wall handstand against a wall at x = 50: fingertips about
   4 in off it, arms locked, one straight line leaning a few degrees into
   it with the toes on it. */
const WALL_HS = { hip: [63.4, 93], torso: 276, hand: [68, PALM], hd: 180, foot: [55.2, 14.5], th: 96, sh: 96, ft: 96, lab: -3 };

/* The planche ladder: hands planted at x = 110, arms straight and leaning
   `lean` degrees forward of vertical, from a push-up lean with the toes
   down. */
const PLANCHE_LEAN = { root: 'wri', at: [110, PALM], ua: 238, fa: 238, hd: 0, torso: 18, th: 198, sh: 198, ft: 262, lab: -3 };
const planche = (lean, more) => ({ root: 'wri', at: [110, PALM], ua: 270 - lean, fa: 270 - lean, hd: 0, ft: 180, lab: -3, ...more });

/* The pull-up bar, mounted high enough to hang from with straight legs. */
const BAR = { k: 'bar', x: 100, y: 4 };
/* For the levers, whose body lies out flat toward the wall: a bar further off it. */
const LEVER_BAR = { ...BAR, off: 95 };
const HANG = { root: 'wri', at: [100, 8.5], ua: 90, fa: 90, hd: 90, torso: 90, th: 272, sh: 268, ft: 300, lab: -3 };
/* Hanging tucked, knees drawn up in front to the chest (hips bent 120°,
   knees 140°): where each lever starts and ends. */
const TUCK_HANG = { ...HANG, th: 30, sh: 250, ft: 250 };
const lever = (arm, more) => ({ root: 'wri', at: [100, 8.5], ua: arm, fa: arm, hd: 90, torso: 180, ft: 0, lab: -3, ...more });

/* Push-ups: toes planted at x = 40 and the body a straight line at
   `deg` degrees, hands found by IK. */
const plank = (deg, more) => ({ root: 'toe', at: [40, TOE], ft: 262, torso: deg, th: 180 + deg, sh: 180 + deg, ...more });

const MAT = (x0, x1) => ({ k: 'mat', x0, x1 });
const HOLD3 = (enter, hold, exit) => [['hold', enter, 'Enter'], ['hold', hold, 'Hold'], ['rest', exit, 'Exit']];

export const MOTION = {

  /* ══ MONDAY ══ */

  /* Elbows travel down and out (ep) at about 45° to the body, to just
     below the bench, the forearms upright under the dumbbells at the sides
     of the upper chest; the handles angled in a little (turn). */
  'Incline Dumbbell Press': {
    scene: [{ k: 'bench', x: 100, back: 30 }], rest: 'back',
    base: { hip: [81, 150], torso: 150, foot: [128, ANK], ep: [0.25, -0.665, 0.7] },
    poses: { top: { hand: [41.5, 75.2, 17] }, bottom: { hand: [47, 119.2, 37] } },
    hold: DB2, turn: 25, hi: ['chest'], hi2: ['front delts', 'triceps'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.bench,
  },

  /* The same at the sides of the mid-chest. */
  'Dumbbell Bench Press': {
    scene: [{ k: 'bench', x: 100 }], rest: 'pad',
    base: { ...SUPINE, ep: [0.64, -0.45, 0.62] },
    poses: { top: { hand: [47, 97, 18] }, bottom: { hand: [63, 136.5, 35] } },
    hold: DB2, turn: 20, hi: ['chest'], hi2: ['front delts', 'triceps'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.bench,
  },

  /* Forearms upright at the bottom, the elbows a little below the
     shoulders and about 25° forward of them (the scapular plane), up to
     straight arms overhead. */
  'Dumbbell Shoulder Press': {
    scene: [{ k: 'bench', x: 100, back: 85 }], rest: 'back',
    base: { hip: [100, 150], torso: 95, foot: [138, ANK], ep: [0.42, -0.3, 0.857] },
    poses: { top: { hand: [97.5, 52.1, 16.5] }, bottom: { hand: [107.4, 86.5, 41.2] } },
    hold: DB2, turn: 20, hi: ['front delts', 'side delts'], hi2: ['triceps'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.seat,
  },

  /* The arms open out to the sides in a wide arc, a soft bend held. */
  'Dumbbell Flyes': {
    scene: [{ k: 'bench', x: 100 }], rest: 'pad',
    base: { ...SUPINE },
    poses: {
      top: { ua: 90, uab: 8, fa: 90, fab: -12 },   // the same soft bend as the bottom
      bottom: { ua: 90, uab: 84, fa: 90, fab: 64 },
    },
    hold: DBF2, palm: 'in+up', hi: ['chest'], hi2: ['front delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch'], ['top', 1.5, 'Squeeze'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: { az: 58, el: 30 },
  },

  /* One dumbbell in both hands on a back pad set to 55°: the upper arms
     straight up, elbows in beside the head, the forearms alone lowering
     it behind. */
  'Overhead Tricep Extensions': {
    scene: [{ k: 'bench', x: 100, back: 55, len: 50 }], rest: 'back',
    base: { ...RECLINED, tilt: -12, uab: -8 },
    poses: { top: { ua: 90, fa: 91, fab: -17 }, bottom: { ua: 96, fa: 222, fab: -13 } },
    hold: { n: 'db-axial' }, hi: ['triceps'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: { az: 18, el: 10 },
  },

  /* Kneeling behind the 45° back pad and to one side of it, the working
     armpit hooked over its top corner and the back of that upper arm
     flat down the pad; the free hand holds the pad's far edge in front,
     elbow down. */
  'Preacher Curls': {
    scene: [{ k: 'bench', x: 100, back: 45, len: 64 }],
    base: { hip: [21, 149.3, -30], torso: 60, th: 268, sh: 180, ft: 195, ua: 315, uab: 12, fhand: [48, 122, -14], fep: [0.2, -1, -0.5] },
    poses: { top: { fa: 436 }, bottom: { fa: 322 } },
    hold: { n: 'db' }, palm: { n: 'sup', f: 'floor' }, hi: ['biceps'], hi2: ['brachialis'],
    tempo: [['top', 1, 'Curl'], ['top', 0.5, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom']],
    still: 'bottom', peak: 'top', cam: { az: -28, el: 20 },
  },

  /* Out to the sides, a little forward of the body's plane, until the
     elbows reach shoulder height, just above the wrists. */
  'Lateral Raises': {
    base: { hip: [100, 111.5], torso: 86, th: 270, sh: 270 },
    poses: { bottom: { ua: 274, uab: 9, fa: 280, fab: 11 }, top: { ua: 4, uab: 72, fa: 352, fab: 66 } },
    hold: DBF2, palm: 'in+down', hi: ['side delts'], hi2: ['traps'],
    tempo: [['top', 1, 'Raise'], ['top', 0.5, 'Top'], ['bottom', 2, 'Lower']],
    still: 'top', cam: { az: 64, el: 6 },
  },

  /* ══ TUESDAY ══ */

  'Dead Bugs': {
    scene: [MAT(40, 200)],
    base: { hip: [130, 186.5], torso: 180, ua: 90, fa: 90, fua: 90, ffa: 90, th: 90, sh: 0, fth: 90, fsh: 0, ft: 90, fft: 90 },
    poses: {
      start: {},
      a: { ua: 176, fa: 176, fth: 6, fsh: 3, fft: 60 },
      b: { fua: 176, ffa: 176, th: 6, sh: 3, ft: 60 },
    },
    hi: ['abs'],
    tempo: [['a', 2, 'Reach'], ['a', 1, 'Hold'], ['start', 2, 'Return'], ['b', 2, 'Reach'], ['b', 1, 'Hold'], ['start', 2, 'Return']],
    still: 'a', cam: CAM.floor,
  },

  /* Rear foot laces-down on the bench behind, in line with the body. */
  'Bulgarian Split Squats': {
    scene: [{ k: 'bench', x: 40 }],
    base: { foot: [121, ANK], ffoot: [61, 148, -2], fft: 192, ua: 270, fa: 270 },
    poses: { top: { hip: [100, 112], torso: 86 }, bottom: { hip: [92, 149.5], torso: 76 } },
    hold: DBS2, hi: ['quads', 'glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Drive'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.stand,
  },

  'Heel-Elevated Front Squats': {
    scene: [{ k: 'wedge', x: 131, w: 25, h: 4 }],
    /* clean-grip front rack: the bar on the front of the shoulders, the
       hands under it just outside them, fingers back, elbows high and
       pointing forward */
    base: { foot: [127, ANK - 1.7], ft: -8, ua: 6, uab: 16, fa: 174, fab: 8, hd: 40 },
    poses: { top: { hip: [118, 112], torso: 90 }, bottom: { hip: [104, 148], torso: 74, ua: 10 } },
    hold: { n: 'bb-rack' }, hi: ['quads'], hi2: ['glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Stand'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.stand,
  },

  /* Both hands cup the top of one dumbbell at the chest. */
  'Heel-Elevated Goblet Squats': {
    scene: [{ k: 'wedge', x: 131, w: 25, h: 4 }],
    base: { foot: [127, ANK - 1.7, 12], ft: -8, tab: 18, kp: [1, 0, 0.45], hd: 90, ep: [0, -1, 0.3] },
    poses: { top: { hip: [119, 112], torso: 88, hand: [134.5, 82, 3.5] }, bottom: { hip: [110, 157], torso: 79, hand: [133, 124, 3.5] } },
    hold: { n: 'db-goblet' }, hi: ['quads'], hi2: ['glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Stand'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.stand,
  },

  /* Hips straight back, knees soft, the bar sliding down the thighs and
     hanging under the shoulders, over the middle of the foot. */
  'Barbell Romanian Deadlifts': {
    base: { foot: [102, ANK], ua: 270, fa: 270, uab: -3 },
    poses: { top: { hip: [100, 111.5], torso: 90 }, bottom: { hip: [67, 120.5], torso: 31 } },
    hold: { n: 'bb' }, hi: ['hamstrings', 'glutes'], hi2: ['erectors'],
    tempo: [['bottom', 2.5, 'Hinge'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Drive'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.stand,
  },

  'Romanian Deadlifts': {
    base: { foot: [102, ANK], ua: 270, fa: 270, uab: 1 },
    poses: { top: { hip: [100, 111.5], torso: 90 }, bottom: { hip: [72, 118], torso: 30 } },
    hold: DB2, palm: 'back', hi: ['hamstrings', 'glutes'], hi2: ['erectors'],
    tempo: [['bottom', 2.5, 'Hinge'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Drive'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.stand,
  },

  /* On one foot on the bench, which stands end-on, heel off its edge; the
     other foot hooked behind, the free hand on the wall. */
  'Single-Leg Calf Raises': {
    scene: [{ k: 'benchEnd', x: 112, y: 161 }, { k: 'wall', x: 140 }],
    base: { root: 'toe', torso: 91, th: 270, sh: 270, fth: 258, fsh: 205, fft: 235, ua: 272, fa: 270, fhand: [137, 44, -16] },
    poses: { bottom: { at: [101.5, 153.7], ft: 22 }, top: { at: [101.5, 153.7], ft: -38 } },
    hold: { n: 'db-side' }, hi: ['calves'],
    tempo: [['top', 1, 'Rise'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch']],
    still: 'bottom', peak: 'top', cam: { az: -35, el: 10 },
  },

  'Kneeling Rollouts to a Wall': {
    scene: [MAT(40, 160), { k: 'wall', x: 173 }],
    base: { root: 'kne', at: [60, KNEE], sh: 180, ft: 188 },
    poses: { start: { th: 260, torso: 28.25, flex: 10, hand: [108, WHEEL, 11] }, out: { th: 240, torso: 12, flex: 8, hand: [163, WHEEL, 11] } },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2, 'Roll'], ['out', 0.5, 'Tap'], ['start', 1.5, 'Pull']],
    still: 'out', cam: CAM.floor,
  },

  'Ab Wheel Rollouts': {
    scene: [MAT(40, 210)],
    base: { root: 'kne', at: [60, KNEE], sh: 180, ft: 188 },
    poses: { start: { th: 260, torso: 28.25, flex: 10, hand: [108, WHEEL, 11] }, out: { th: 190, torso: 10, flex: 6, hand: [194.1, WHEEL, 11] } },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2.5, 'Roll'], ['out', 0.5, 'Hold'], ['start', 2, 'Pull']],
    still: 'out', cam: CAM.floor,
  },

  'Standing Rollouts to a Wall': {
    scene: [{ k: 'wall', x: 216.4 }],
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [133.2, WHEEL, 11], ft: 0 },
      out: { hip: [121, 138], torso: 330, flex: 4, hand: [206.9, WHEEL, 11], foot: [60, ANK - 3.5], ft: -25 },   // the wall stops it short: hips up, legs and arms straight
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2, 'Roll'], ['out', 0.5, 'Tap'], ['start', 2, 'Pull']],
    still: 'out', cam: CAM.floor,
  },

  /* Out standing, set the knees down at full stretch, back on the knees,
     then stand. */
  'Standing Rollout Negatives': {
    base: {},
    poses: {
      stand: { hip: [72, 112], torso: 300, flex: 10, hand: [133.2, WHEEL, 11], foot: [60, ANK], ft: 0 },
      mid: { hip: [109, 126], torso: 320, flex: 4, hand: [187, WHEEL, 11], foot: [60, ANK - 1.5], ft: -12 },
      full: { hip: [136, 178], torso: 358, flex: 4, hand: [233.3, WHEEL, 11], foot: [60, ANK - 3.5], ft: -25 },
      kneel: { hip: [136, 176.5], torso: 10, flex: 6, hand: [231.5, WHEEL, 11], foot: [59, KNEE - 5], ft: -100 },
      knees: { hip: [106.6, 151.9], torso: 28.25, flex: 10, hand: [148, WHEEL, 11], foot: [59, KNEE], ft: -175 },
      crouch: { hip: [86, 134], torso: 318, flex: 12, hand: [138, WHEEL, 11], foot: [60, ANK - 7], ft: -70 },
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['mid', 2.4, 'Lower'], ['full', 2.6, 'Lower'], ['kneel', 1, 'Kneel'], ['knees', 2, 'Pull'], ['crouch', 1, 'Rise'], ['stand', 1, 'Stand']],
    still: 'full', cam: CAM.floor,
  },

  'Standing Ab Wheel Rollouts': {
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [133.2, WHEEL, 11], ft: 0 },
      mid: { hip: [109, 126], torso: 320, flex: 4, hand: [187, WHEEL, 11], foot: [60, ANK - 1.5], ft: -12 },
      out: { hip: [136, 178], torso: 358, flex: 4, hand: [233.3, WHEEL, 11], foot: [60, ANK - 3.5], ft: -25 },
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['mid', 1.2, 'Roll'], ['out', 1.3, 'Roll'], ['out', 0.5, 'Hold'], ['mid', 1, 'Pull'], ['start', 1, 'Pull']],
    still: 'out', cam: CAM.floor,
  },

  'Weighted Standing Rollouts': {
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [133.2, WHEEL, 11], ft: 0 },
      mid: { hip: [109, 126], torso: 320, flex: 4, hand: [187, WHEEL, 11], foot: [60, ANK - 1.5], ft: -12 },
      out: { hip: [136, 178], torso: 358, flex: 4, hand: [233.3, WHEEL, 11], foot: [60, ANK - 3.5], ft: -25 },
    },
    hold: { n: 'wheel', pack: true }, hi: ['abs'], hi2: ['lats'],
    tempo: [['mid', 1.2, 'Roll'], ['out', 1.3, 'Roll'], ['out', 0.5, 'Hold'], ['mid', 1, 'Pull'], ['start', 1, 'Pull']],
    still: 'out', cam: CAM.floor,
  },

  /* Head just past the end of the bench, one dumbbell held in both hands
     at arm's length beyond it. */
  'Dumbbell Crunch': {
    scene: [{ k: 'bench', x: 120 }], rest: 'pad',
    base: { hip: [113, 149.5], torso: 180, foot: [153, ANK], uab: -15, fab: -14 },
    poses: { bottom: { flex: 0, tilt: 12, ua: 177, fa: 177 }, top: { flex: 40, tilt: 0, ua: 140, fa: 140 } },
    hold: { n: 'db-both' }, hi: ['abs'],
    tempo: [['top', 1, 'Curl'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch']],
    still: 'top', cam: CAM.bench,
  },

  'Weighted Hanging Leg Raises': {
    scene: [BAR],
    base: { root: 'wri', at: [100, 8.5], ua: 90, fa: 90, hd: 90, torso: 90, ft: 300, lab: -5 },
    poses: { bottom: { th: 276, sh: 258, flex: 0 }, top: { th: 30, sh: 18, flex: 22, ft: 60 } },
    hold: { n: 'db-feet' }, hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['top', 1.5, 'Raise'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 1, 'Bottom']],
    still: 'top', cam: CAM.hang,
  },

  /* Head at the high end of the declined bench, hands gripping it behind
     the head; the upper back stays down while the pelvis curls. */
  'Decline Reverse Crunches': {
    scene: [{ k: 'bench', x: 60, back: -15, flip: true }], rest: 'pad',
    base: { root: 'sho', at: [93.8, 151.5], hand: [46, 157, 9], eb: 1, lab: -3 },   // elbows up, toward the ceiling
    poses: {
      bottom: { torso: 165, flex: 0, th: 75, sh: -15, ft: -15 },
      top: { torso: 215, flex: 50, th: 140, sh: 55, ft: 55 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['top', 1, 'Curl'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom']],
    still: 'top', cam: CAM.bench,
  },

  /* On the near forearm, the body turned onto its side (bodyF / bodyU):
     facing the camera, spine running up to the left. The top arm reaches
     to the ceiling, then threads under the chest as the shoulders turn
     toward the floor. In this pose's own frame the floor is the near
     side, so the bottom arm points straight "out" (uab 90). */
  'Weighted Side Plank w/ Reach-Through': {
    scene: [MAT(10, 210)],
    base: {
      bodyF: [0, 0, 1], bodyU: [-0.972, 0.23, 0], root: 'elb', at: [100, 190.1, 0],
      torso: 90, th: 270, sh: 270, ft: 0, tab: 0, fth: 270, fsh: 270, fft: 0, ftab: 0,
      ua: 270, uab: 90, fa: 0, fab: 0, hd: 0,
    },
    poses: {
      top: { twist: 0, fua: 270, fuab: 88, ffa: 270, ffab: 88 },
      sweep: { twist: -30, fhand: [118, 154, 36], fep: [0.3, 0.6, 0.7] },
      thread: { twist: -62, fhand: [124, 180, 6], fep: [0.2, -0.3, 1] },
    },
    hold: { f: 'db-fwd' }, palm: { n: 'floor' }, hi: ['obliques'], hi2: ['abs'],
    tempo: [['sweep', 0.9, 'Turn'], ['thread', 1.1, 'Thread'], ['thread', 0.5, 'Hold'], ['sweep', 0.8, 'Unwind'], ['top', 0.7, 'Lift'], ['top', 0.5, 'Top']],
    still: 'top', peak: 'thread', cam: { az: 8, el: 20 },
  },

  /* ══ THURSDAY ══ */

  /* Hands a little wider than the shoulders; the elbows drive down and
     out to the ribs. */
  'Pull-Ups': {
    scene: [BAR],
    base: { hand: [100, 8.5, 26], hd: 90, th: 276, sh: 236, ft: 280, lab: -2, ep: [0, -1, 1.1] },
    poses: { hang: { hip: [100, 109], torso: 90, shrug: 3 }, set: { hip: [100, 104.5], torso: 90, shrug: -1.5 }, top: { hip: [88, 56], torso: 100, tilt: 16, shrug: -1.5 } },
    hi: ['lats'], hi2: ['biceps'],
    tempo: [['set', 0.5, 'Set'], ['top', 1, 'Pull'], ['top', 0.5, 'Top'], ['hang', 2, 'Lower']],
    still: 'top', cam: { az: 52, el: 4 },
  },

  /* One knee and hand on the bench, the other foot on the floor beside it. */
  'Single-Arm Rows': {
    scene: [{ k: 'bench', x: 90 }],
    base: { hip: [62, 112, 6], torso: 8, foot: [54, ANK, 30], ffoot: 0, fth: 268, fsh: 180, fft: 185, fhand: [108, 152.5, -4], fhd: 0 },
    poses: { bottom: { ua: 272, fa: 270, uab: 4 }, top: { ua: 160, fa: 268, uab: 10 } },
    hold: { n: 'db-side' }, hi: ['lats'], hi2: ['rear delts', 'biceps'],
    tempo: [['top', 1, 'Pull'], ['top', 0.5, 'Squeeze'], ['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch']],
    still: 'top', cam: CAM.stand,
  },

  /* Face down on the 30° pad, feet on the floor behind. */
  'Chest-Supported Rows': {
    scene: [{ k: 'bench', x: 60, back: 30, flip: true }], rest: 'back',
    base: { hip: [88.7, 136], torso: 30, foot: [30.7, 182, 25], ft: -55, lab: 16, kp: [0, 0.2, 1] },   // hips just up off the seat, straddling it, on the balls of the feet
    poses: { bottom: { ua: 270, fa: 270 }, top: { ua: 158, fa: 268 } },
    hold: DBS2, hi: ['lats'], hi2: ['rear delts', 'traps'],
    tempo: [['top', 1, 'Row'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top', cam: CAM.stand,
  },

  /* One dumbbell gripped by its handle in both hands. */
  'Dumbbell Pullovers': {
    scene: [{ k: 'bench', x: 110 }], rest: 'pad',
    base: { hip: [101, 149.5], torso: 180, foot: [140, ANK], uab: -16, fab: -14 },
    poses: { top: { ua: 90, fa: 100 }, bottom: { ua: 172, fa: 182 } },
    hold: { n: 'db-both' }, hi: ['lats', 'chest'], hi2: ['serratus', 'triceps'],
    tempo: [['bottom', 3, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 2, 'Pull']],
    still: 'bottom', cam: CAM.bench,
  },

  /* Face down on the 30° pad, the arms opening out to the sides. */
  'Reverse Flyes': {
    scene: [{ k: 'bench', x: 60, back: 30, flip: true }], rest: 'back',
    base: { hip: [88.7, 136], torso: 30, foot: [30.7, 182, 25], ft: -55, lab: 16, kp: [0, 0.2, 1], ua: 270, fa: 270 },   // hips just up off the seat, straddling it, on the balls of the feet
    poses: { bottom: { uab: 4, fab: 8 }, top: { uab: 84, fab: 74 } },
    hold: DBF2, palm: 'in+down', hi: ['rear delts'], hi2: ['traps'],
    tempo: [['top', 1.5, 'Raise'], ['top', 0.5, 'Hold'], ['bottom', 2, 'Lower']],
    still: 'top', cam: { az: 72, el: 20 },
  },

  'Hammer Curls': {
    base: { hip: [100, 111.5], torso: 90, th: 270, sh: 270 },
    poses: { bottom: { ua: 272, fa: 270, uab: 7 }, top: { ua: 280, fa: 428, uab: 7, fab: 4 } },
    hold: DBS2, hi: ['brachialis'], hi2: ['forearms', 'biceps'],
    tempo: [['top', 1, 'Curl'], ['bottom', 2.5, 'Lower']],
    still: 'top', cam: CAM.stand,
  },

  'Incline Curls': {
    scene: [{ k: 'bench', x: 100, back: 55 }], rest: 'back',
    base: { ...RECLINED },
    poses: { bottom: { ua: 270, fa: 270, uab: 12 }, top: { ua: 268, fa: 400, uab: 10, fab: 4 } },
    hold: DB2, palm: 'sup', hi: ['biceps'], hi2: ['brachialis'],
    tempo: [['top', 1, 'Curl'], ['bottom', 3, 'Lower'], ['bottom', 1, 'Stretch']],
    still: 'bottom', peak: 'top', cam: CAM.seat,
  },

  /* ══ FRIDAY ══ */

  /* Upper back on the side of the bench, which stands end-on; bar on the hips. */
  'Barbell Hip Thrusts': {
    scene: [{ k: 'benchEnd', x: 58, y: 161 }], rest: 'pad',
    base: { root: 'sho', at: [68, 149], foot: [152, ANK] },
    poses: { bottom: { torso: 150, tilt: -10, hand: [109, 159, 24] }, top: { torso: 180, tilt: -22, hand: [108, 136, 24] } },
    hold: { hip: 'bb-hip' }, hi: ['glutes'], hi2: ['hamstrings'],
    tempo: [['top', 1, 'Drive'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top', cam: CAM.floor,
  },

  'B-Stance Hip Thrusts': {
    scene: [{ k: 'benchEnd', x: 58, y: 161 }], rest: 'pad',
    base: { root: 'sho', at: [68, 149], foot: [150, ANK], ffoot: [166, ANK - 1.5, -9], fft: 40 },
    poses: { bottom: { torso: 150, tilt: -10, hand: [109, 159, 12] }, top: { torso: 180, tilt: -22, hand: [108, 136, 12] } },
    hold: { hip: 'db-hip' }, hi: ['glutes'], hi2: ['hamstrings'],
    tempo: [['top', 1, 'Drive'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top', cam: CAM.floor,
  },

  'Nordic Curl Negatives': {
    scene: [MAT(70, 210), { k: 'anchor', x: 52, y: 178 }],
    base: { root: 'kne', at: [100, KNEE], sh: 180, ft: 188 },
    poses: {
      start: { th: 270, torso: 90, hand: [119, 117, 12], ep: [-0.3, -1, 0.7] },
      catch: { th: 200, torso: 20, hand: [184, PALM], hd: 0 },
      push: { th: 215, torso: 35, hand: [172, 158] },
    },
    palm: 'floor+fwd',
    hi: ['hamstrings'], hi2: ['calves'],
    tempo: [['catch', 4, 'Lower'], ['catch', 0.5, 'Catch'], ['push', 1.5, 'Push'], ['start', 1, 'Reset']],
    still: 'catch', cam: CAM.floor,
  },

  /* Kneeling beside the bench, forearms across its pad, wrists just past
     the far edge. */
  'Dumbbell Wrist Curls': {
    scene: [{ k: 'benchEnd', x: 122, y: 161 }],
    base: { root: 'kne', at: [82, KNEE], th: 268, sh: 180, ft: 190, torso: 35, ua: 252, fa: 0 },
    poses: { low: { hd: -65 }, top: { hd: 55 } },
    hold: DB2, palm: 'up', hi: ['forearms'],
    tempo: [['top', 1, 'Curl'], ['low', 2, 'Lower'], ['low', 0.5, 'Grip']],
    still: 'low', peak: 'top', cam: { az: 30, el: 18 },
  },

  'Dumbbell Reverse Wrist Curls': {
    scene: [{ k: 'benchEnd', x: 122, y: 161 }],
    base: { root: 'kne', at: [82, KNEE], th: 268, sh: 180, ft: 190, torso: 35, ua: 252, fa: 0 },
    poses: { low: { hd: -55 }, top: { hd: 45 } },
    hold: DB2, palm: 'down', hi: ['forearms'],
    tempo: [['top', 1, 'Lift'], ['top', 1, 'Pause'], ['low', 2, 'Lower']],
    still: 'top', cam: { az: 30, el: 18 },
  },

  /* ══ SATURDAY ══ */

  'Wrist Prep Rocks': {
    scene: [MAT(40, 170)],
    base: { root: 'kne', at: [90, KNEE], sh: 180, ft: 185, hand: [131, PALM], hd: 0 },
    poses: {
      mid: { th: 270, torso: 14 },
      fwd: { th: 252, torso: 13 },
      back: { th: 300, torso: 18 },
    },
    hi: ['forearms'],
    tempo: [['fwd', 1.5, 'Forward'], ['fwd', 1, 'Hold'], ['back', 1.5, 'Back'], ['back', 1, 'Hold']],
    still: 'fwd', cam: CAM.floor,
  },

  /* Walk up the wall from a push-up, hold, walk down. */
  'Wall Handstand Hold': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { lab: -3 },
    poses: {
      plank: { hip: [127.4, 156.5], torso: 383.5, hand: [170, PALM], hd: 0, foot: [57, 183.5], ft: 262 },
      mid: { hip: [90, 106.4], torso: 315, hand: [122, PALM], hd: 90, foot: [57, 62], ft: 180 },
      hold: { ...WALL_HS },
    },
    hi: ['front delts'], hi2: ['traps', 'triceps'],
    sway: [['torso', 0.6, 0.3]],
    tempo: [['mid', 1.2, 'Walk'], ['hold', 1.3, 'Up'], ['hold', 4, 'Hold'], ['plank', 1.5, 'Down']],
    still: 'hold', cam: CAM.invert,
  },

  'Wall Toe Pulls': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { ...WALL_HS },
    poses: { wall: {}, float: { hip: [65.9, 92.9], torso: 274.5, foot: [59.7, 14.3] } },
    hi: ['front delts'], hi2: ['traps', 'forearms'],
    tempo: [['wall', 1.5, 'Settle'], ['float', 1, 'Shift'], ['float', 2, 'Float'], ['wall', 1, 'Return']],
    still: 'float', cam: CAM.invert,
  },

  'Freestanding Kick-Ups': {
    scene: [MAT(30, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      set: { ua: 292, fa: 292, torso: 322, th: 132, sh: 132, ft: 132, ffoot: [64, ANK], fth: 287, fsh: 270, fft: 0 },
      kick: { ua: 280, fa: 280, torso: 290, th: 100, sh: 100, ft: 100, ffoot: null, fth: 196, fsh: 196, fft: 196 },
      top: { ua: 270, fa: 270, torso: 270, th: 90, sh: 90, ft: 90, ffoot: null, fth: 90, fsh: 90, fft: 90 },
    },
    hi: ['front delts'], hi2: ['traps', 'triceps'],
    sway: [['torso', 0.8, 0.4], ['th', 0.8, 0.4], ['sh', 0.8, 0.4], ['fth', 0.8, 0.4], ['fsh', 0.8, 0.4], ['ua', 0.8, 0.4], ['fa', 0.8, 0.4]],
    tempo: [['set', 1, 'Set'], ['kick', 1, 'Kick'], ['top', 0.6, 'Arrive'], ['top', 2.4, 'Balance'], ['kick', 0.8, 'Down'], ['set', 0.7, 'Down']],   // down the way it came up
    still: 'top', cam: CAM.invert,
  },

  'Freestanding Handstand': {
    scene: [MAT(30, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      set: { ua: 292, fa: 292, torso: 322, th: 132, sh: 132, ft: 132, ffoot: [64, ANK], fth: 287, fsh: 270, fft: 0 },
      kick: { ua: 280, fa: 280, torso: 290, th: 100, sh: 100, ft: 100, ffoot: null, fth: 196, fsh: 196, fft: 196 },
      top: { ua: 270, fa: 270, torso: 270, th: 90, sh: 90, ft: 90, ffoot: null, fth: 90, fsh: 90, fft: 90 },
    },
    hi: ['front delts'], hi2: ['traps', 'forearms'],
    sway: [['torso', 1.4, 0.3], ['th', 1.4, 0.3], ['sh', 1.4, 0.3], ['fth', 1.4, 0.3], ['fsh', 1.4, 0.3], ['ua', 1.4, 0.3], ['fa', 1.4, 0.3]],
    tempo: [['kick', 0.8, 'Kick'], ['top', 0.7, 'Arrive'], ['top', 4.5, 'Hold'], ['kick', 0.8, 'Down'], ['set', 0.7, 'Down']],   // down the way it came up
    still: 'top', cam: CAM.invert,
  },

  /* The legs open wide to the sides (lab) and fold up over the hands. */
  'Straddle Press to Handstand': {
    scene: [MAT(30, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0, kp: [0.3, 1, 0.8] },
    poses: {
      fold: { ua: 290, fa: 290, torso: 331, flex: 20, foot: [64, ANK, 34], ft: 0, th: 262, sh: 270, lab: 30, sab: 30, tab: 30 },
      lean: { ua: 256, fa: 256, torso: 318, flex: 26, foot: null, th: 250, sh: 252, ft: 250, lab: 42, sab: 42 },
      stack: { ua: 270, fa: 270, torso: 272, flex: 10, foot: null, th: 140, sh: 140, ft: 140, lab: 70, sab: 70 },
      hs: { ua: 270, fa: 270, torso: 270, flex: 0, foot: null, th: 90, sh: 90, ft: 90, lab: -3, sab: -3 },
    },
    hi: ['front delts'], hi2: ['traps', 'hip flexors'],
    tempo: [['lean', 1.5, 'Lean'], ['stack', 2.5, 'Press'], ['hs', 1, 'Stack'], ['fold', 2.6, 'Down']],
    still: 'stack', cam: { az: 50, el: 8 },
  },

  /* A straddle handstand; the hips slide over the near hand and the far
     hand lightens, then lifts out to the side. */
  'One-Arm Handstand': {
    scene: [MAT(30, 170)],
    base: { torso: 270, th: 90, sh: 90, ft: 90, lab: 36, sab: 36, hd: 0, hand: [100, PALM, 16] },
    poses: {
      base: { hip: [98.4, 92.9, 0], fhand: [100, PALM, -16] },
      shift: { hip: [98.4, 93.95, 8], fhand: [100, PALM, -16] },
      light: { hip: [98.4, 94.4, 10], fhand: [100, PALM - 2, -17] },
      lift: { hip: [98.4, 94.65, 11], fhand: null, fua: 270, fuab: 34, ffa: 270, ffab: 30 },
    },
    hi: ['side delts'], hi2: ['traps', 'obliques'],
    sway: [['torso', 0.6, 0.35]],
    tempo: [['shift', 1.5, 'Shift'], ['light', 1, 'Lighten'], ['lift', 3, 'Hold'], ['base', 1.5, 'Return']],
    still: 'lift', cam: { az: 70, el: 4 },
  },

  /* Knees rest on the backs of the upper arms: the thighs open a little
     (lab) so they sit outside the elbows. */
  'Frog Stand': {
    scene: [MAT(50, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0, uab: 6, fab: 2, lab: 20, sab: 8 },
    poses: {
      squat: { ua: 250, fa: 265, torso: 345, th: 300, sh: 250, ft: 0, foot: [82, ANK] },
      lean: { ua: 245, fa: 260, torso: 330, th: 310, sh: 200, ft: 240, foot: null },
    },
    hi: ['front delts'], hi2: ['triceps', 'forearms'],
    tempo: [['squat', 1, 'Squat'], ['lean', 1.5, 'Lean'], ['lean', 4, 'Hold'], ['squat', 1, 'Down']],
    still: 'lean', cam: CAM.floor,
  },

  'Straight-Arm Frog Stand': {
    scene: [MAT(50, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0, lab: 20, sab: 8 },
    poses: {
      squat: { ua: 262, fa: 262, torso: 330, th: 300, sh: 250, ft: 0, foot: [84, ANK] },
      lean: { ua: 245, fa: 245, torso: 325, th: 312, sh: 200, ft: 240, foot: null },
    },
    hi: ['front delts'], hi2: ['serratus', 'forearms'],
    tempo: [['squat', 1, 'Squat'], ['lean', 1.5, 'Lean'], ['lean', 4, 'Hold'], ['squat', 1, 'Down']],
    still: 'lean', cam: CAM.floor,
  },

  'Tuck Planche': {
    scene: [MAT(30, 170)],
    base: {},
    poses: {
      lean: { root: 'wri', at: [110, PALM], ua: 245, fa: 245, hd: 0, torso: 335, flex: 15, th: 300, sh: 248, ft: 0, foot: [80, ANK], lab: -3 },
      hold: planche(32, { torso: 355, flex: 25, th: 322, sh: 205, ft: 245, foot: null }),
    },
    hi: ['front delts'], hi2: ['serratus', 'abs'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Lift'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold', cam: CAM.floor,
  },

  'Advanced Tuck Planche': {
    scene: [MAT(30, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(38, { torso: 0, flex: 0, th: 245, sh: 135, ft: 135 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'abs'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Lift'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold', cam: CAM.floor,
  },

  'Straddle Planche': {
    scene: [MAT(10, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(42, { torso: 0, flex: -3, th: 180, sh: 180, lab: 40, sab: 40 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'glutes'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Extend'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold', cam: { az: 205, el: 34 },
  },

  'Half-Lay Planche': {
    scene: [MAT(10, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(40, { torso: 0, th: 180, sh: 90, ft: 90 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'glutes'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Open'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold', cam: CAM.floor,
  },

  'Full Planche': {
    scene: [MAT(10, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(45, { torso: 0, flex: 0, th: 180, sh: 180, ft: 180 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'glutes'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Lift'], ['hold', 3.5, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold', cam: CAM.floor,
  },

  /* Shoulders shrugged up to the ears, then pulled down: the body rises
     a few units with straight arms. */
  'Scapular Pulls': {
    scene: [BAR],
    base: { ...HANG, th: 262, sh: 232, ft: 262 },
    poses: { passive: { shrug: 4.5 }, active: { shrug: -1.5 } },
    hi: ['lats'], hi2: ['traps'],
    tempo: [['passive', 1, 'Hang'], ['active', 1, 'Pull'], ['active', 1, 'Pause'], ['passive', 2, 'Lower']],
    still: 'active', cam: CAM.hang,
  },

  'Arch Hangs': {
    scene: [BAR],
    base: { ...HANG },
    poses: { hang: { shrug: -1.5 }, arch: { ua: 68, fa: 68, torso: 108, flex: -18, th: 255, sh: 252, shrug: -1.5 } },
    hi: ['lats'], hi2: ['rear delts', 'traps'],
    tempo: [['hang', 1, 'Hang'], ['arch', 1.5, 'Arch'], ['arch', 2, 'Hold'], ['hang', 1.5, 'Lower']],
    still: 'arch', cam: CAM.hang,
  },

  'Tuck Front Lever': {
    scene: [LEVER_BAR],
    base: {},
    poses: {
      hang: TUCK_HANG,
      /* knees to the chest: the hips bent about 125°, as far as a hip
         goes, the heels in by the seat */
      hold: lever(80, { flex: 14, th: 126, sh: 350, ft: 350 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold', cam: CAM.hang,
  },

  'Advanced Tuck Front Lever': {
    scene: [LEVER_BAR],
    base: {},
    poses: {
      hang: TUCK_HANG,
      hold: lever(77, { th: 90, sh: 320, ft: 320 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold', cam: CAM.hang,
  },

  'Straddle Front Lever': {
    scene: [LEVER_BAR],
    base: {},
    poses: {
      hang: TUCK_HANG,
      hold: lever(73, { th: 0, sh: 0, ft: 0, lab: 40, sab: 40 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Extend'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold', cam: { az: 150, el: 18 },
  },

  'Half-Lay Front Lever': {
    scene: [LEVER_BAR],
    base: {},
    poses: {
      hang: TUCK_HANG,
      hold: lever(73, { th: 0, sh: 270, ft: 0 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Open'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold', cam: CAM.hang,
  },

  'Full Front Lever': {
    scene: [LEVER_BAR],
    base: {},
    poses: {
      hang: { ...HANG },
      hold: lever(70, { th: 0, sh: 0, ft: 0 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Hang']],
    still: 'hold', cam: CAM.hang,
  },

  'Scapular Push-Ups': {
    scene: [MAT(30, 180)],
    base: { ...plank(17.5), hand: [160, PALM], hd: 0 },
    poses: { sink: { flex: -10 }, push: { ...plank(21.25), flex: 12 } },
    hi: ['serratus'], hi2: ['traps'],
    tempo: [['sink', 1.5, 'Sink'], ['push', 1.5, 'Push'], ['push', 1, 'Hold']],
    still: 'push', cam: CAM.floor,
  },

  'Chin-Ups': {
    scene: [BAR],
    base: { hand: [100, 8.5], hd: 90, th: 278, sh: 212, ft: 240, lab: -3 },
    poses: { hang: { hip: [100, 107], torso: 90 }, top: { hip: [88, 55], torso: 102, tilt: 16 } },
    palm: 'back',
    hi: ['lats', 'biceps'],
    tempo: [['top', 1, 'Pull'], ['top', 0.5, 'Top'], ['hang', 2, 'Lower'], ['hang', 0.5, 'Hang']],
    still: 'top', cam: CAM.hang,
  },

  'Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [159, PALM], hd: 0, ep: [-1, 0.2, 0.75] },
    poses: { top: plank(20), bottom: plank(5) },
    hi: ['chest'], hi2: ['triceps', 'front delts'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  'Diamond Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [150, PALM, 4], hd: 0, ep: [-1, 0.3, 0.2] },
    poses: { top: plank(19), bottom: plank(6) },
    hi: ['triceps'], hi2: ['chest'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  /* Toes on the end of the bench, hands on the floor. */
  'Decline Push-Ups': {
    scene: [{ k: 'bench', x: 30 }],
    base: { root: 'toe', at: [52, 153.7], ft: 262, hand: [178, PALM], hd: 0, ep: [-1, 0.2, 0.75] },
    poses: { top: { torso: 2, th: 182, sh: 182 }, bottom: { torso: 347, th: 167, sh: 167 } },
    hi: ['chest'], hi2: ['front delts', 'triceps'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  /* Hands wide; the body turns about the feet (bodyF) to lower over one
     hand, then the other, the far arm staying straight. */
  'Archer Push-Ups': {
    scene: [MAT(30, 180)],
    base: { root: 'toe', at: [40, TOE, 0], ft: 262, hand: [156, PALM, 36], hd: 0, ep: [-1, 0.3, 1] },
    poses: {
      center: { ...plank(19), bodyF: [1, 0, 0] },
      left: { ...plank(7), bodyF: [0.985, 0, 0.17] },
      right: { ...plank(7), bodyF: [0.985, 0, -0.17] },
    },
    hi: ['chest'], hi2: ['triceps'],
    tempo: [['left', 2, 'Lower'], ['center', 1, 'Press'], ['right', 2, 'Lower'], ['center', 1, 'Press']],
    still: 'left', peak: 'center', cam: { az: 62, el: 24 },
  },

  /* One hand on the bench (end-on) under the chest, feet wide, the free
     hand behind the back. */
  'Incline One-Arm Push-Ups': {
    scene: [{ k: 'benchEnd', x: 170, y: 161 }],
    base: { root: 'toe', at: [40, TOE], ft: 262, hand: [163, 153.3, 5], hd: 0, fhand: null, lab: 12, ep: [-1, 0.2, 0.3] },
    poses: {
      top: { torso: 36, th: 216, sh: 216, fua: 250, ffa: 40, fuab: 14 },
      bottom: { torso: 20, th: 200, sh: 200, fua: 232, ffa: 22, fuab: 14 },
    },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  'One-Arm Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [156, PALM, 5], hd: 0, fhand: null, ep: [-1, 0.2, 0.3] },
    poses: { top: plank(20, { fua: 232, ffa: 30, fuab: 14, lab: 12 }), bottom: plank(8, { fua: 220, ffa: 18, fuab: 14, lab: 12 }) },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  'One-Arm Push-Ups, Feet Together': {
    scene: [MAT(30, 180)],
    base: { hand: [156, PALM, 5], hd: 0, fhand: null, ep: [-1, 0.2, 0.3] },
    poses: { top: plank(18.5, { fua: 232, ffa: 30, fuab: 14, lab: -3 }), bottom: plank(8, { fua: 220, ffa: 18, fuab: 14, lab: -3 }) },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  'Pike Push-Ups': {
    scene: [MAT(30, 170)],
    base: { foot: [60, ANK - 4], ft: -40, hand: [114, PALM], hd: 0, ep: [-1, 0.4, 0.5] },
    poses: { top: { hip: [78, 112.6], torso: 325 }, bottom: { hip: [95, 121], torso: 300 } },
    hi: ['front delts'], hi2: ['triceps', 'side delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  'Elevated Pike Push-Ups': {
    scene: [{ k: 'bench', x: 30 }],
    base: { root: 'toe', at: [52, 153.7], ft: 300, hand: [140, PALM], hd: 0, ep: [-1, 0.4, 0.5] },
    poses: { top: { torso: 306.1, th: 213, sh: 213 }, bottom: { torso: 290, th: 202, sh: 202 } },
    hi: ['front delts'], hi2: ['triceps', 'side delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom', peak: 'top', cam: CAM.floor,
  },

  /* Handstand push-ups: the elbows bend back, away from the chest, and
     out about 45°, as in a press turned upside down (ep). */
  'Wall Handstand Push-Up Negatives': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { hand: [77, PALM], hd: 180, ft: 95, ep: [0.7, 0, 1], lab: -3 },
    poses: {
      top: { hip: [69.2, 93.4], torso: 280, foot: [55.5, 15.7] },
      bottom: { hip: [76.3, 115], torso: 262, foot: [56, 39.6] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 4, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Reset']],
    still: 'bottom', cam: CAM.invert,
  },

  'Wall Handstand Push-Ups': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { hand: [77, PALM], hd: 180, ft: 95, ep: [0.7, 0, 1], lab: -3 },
    poses: {
      top: { hip: [69.2, 93.4], torso: 280, foot: [55.5, 15.7] },
      bottom: { hip: [76.3, 115], torso: 262, foot: [56, 39.6] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.invert,
  },

  'Deficit Wall Handstand Push-Ups': {
    scene: [{ k: 'wall', x: 50, side: 'l' }, { k: 'books', xs: [79], n: 3 }],
    base: { hand: [79, 180.6], hd: 180, ft: 95, ep: [0.7, 0, 1], lab: -3 },
    poses: {
      top: { hip: [71.2, 83.2], torso: 280, foot: [57.5, 5.5] },
      bottom: { hip: [77, 115.5], torso: 262, foot: [56, 39.5] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1.5, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom', peak: 'top', cam: CAM.invert,
  },

  'Freestanding Handstand Push-Ups': {
    scene: [MAT(30, 170)],
    base: { hand: [100, PALM], hd: 180, ep: [0.7, 0, 1], lab: -3 },
    poses: {
      top: { hip: [98.4, 92.8], torso: 272, th: 90, sh: 90, ft: 90 },
      bottom: { hip: [104.6, 117.5], torso: 255, th: 78, sh: 78, ft: 78 },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    sway: [['torso', 0.5, 0.4]],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 1, 'Balance']],
    still: 'bottom', peak: 'top', cam: CAM.invert,
  },

  /* ══ HOLLOW AND ARCH: on the floor ══ */

  'Tuck Hollow Hold': {
    scene: [MAT(40, 190)],
    base: { hip: [120, 186.5], torso: 180, lab: -3 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 0, fa: 0 },
      hold: { flex: 22, foot: null, th: 132, sh: 20, ft: 30, ua: 8, fa: 8 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold', cam: CAM.floor,
  },

  'One-Leg Hollow Hold': {
    scene: [MAT(40, 200)],
    base: { hip: [120, 186.5], torso: 180, flex: 22, ua: 8, fa: 8, lab: -3 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, fft: 0, ua: 0, fa: 0 },
      a: { foot: null, th: 25, sh: 25, ft: 20, fth: 132, fsh: 20, fft: 30 },
      b: { foot: null, th: 132, sh: 20, ft: 30, fth: 25, fsh: 25, fft: 20 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['a', 1, 'Enter'], ['a', 2.5, 'Hold'], ['b', 0.8, 'Switch'], ['b', 2.5, 'Hold'], ['rest', 0.8, 'Exit']],
    still: 'a', cam: CAM.floor,
  },

  'Hollow Body Hold': {
    scene: [MAT(40, 210)],
    base: { hip: [120, 186.5], torso: 180, lab: -3 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 0, fa: 0 },
      hold: { flex: 22, foot: null, th: 18, sh: 18, ft: 10, ua: 8, fa: 8 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold', cam: CAM.floor,
  },

  'Overhead Hollow Hold': {
    scene: [MAT(20, 210)],
    base: { hip: [120, 186.5], torso: 180, lab: -3 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 180, fa: 180 },
      hold: { flex: 22, foot: null, th: 18, sh: 18, ft: 10, ua: 170, fa: 168 },
    },
    hi: ['abs'], hi2: ['hip flexors', 'lats'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold', cam: CAM.floor,
  },

  /* The overhead hollow shape, rocked as one piece. */
  'Hollow Body Rocks': {
    scene: [MAT(20, 210)],
    base: { flex: 22, ft: 10, lab: -3 },
    poses: {
      back: { hip: [120, 178], torso: 196, th: 34, sh: 34, ua: 186, fa: 184 },
      fwd: { hip: [118, 185], torso: 166, th: 4, sh: 4, ua: 156, fa: 154 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['back', 0.6, 'Back'], ['fwd', 0.6, 'Forward']],
    still: 'back', cam: CAM.floor,
  },

  /* Face down, head to the right. */
  'Arch Hold': {
    scene: [MAT(10, 180)],
    base: { hip: [90, 186.5], torso: 0, lab: -3 },
    poses: {
      rest: { flex: 0, th: 180, sh: 180, ft: 200, ua: 180, fa: 180 },
      hold: { flex: -16, th: 168, sh: 168, ft: 180, ua: 172, fa: 172, tilt: 6 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['hold', 1, 'Enter'], ['hold', 5, 'Hold'], ['rest', 1, 'Exit']],
    still: 'hold', cam: CAM.floor,
  },

  'Overhead Arch Hold': {
    scene: [MAT(10, 210)],
    base: { hip: [90, 186.5], torso: 0, lab: -3 },
    poses: {
      rest: { flex: 0, th: 180, sh: 180, ft: 200, ua: 0, fa: 0 },
      hold: { flex: -16, th: 168, sh: 168, ft: 180, ua: 14, fa: 14, tilt: 6 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['hold', 1, 'Enter'], ['hold', 5, 'Hold'], ['rest', 1, 'Exit']],
    still: 'hold', cam: CAM.floor,
  },

  'Arch Body Rocks': {
    scene: [MAT(10, 210)],
    base: { flex: -16, ft: 180, tilt: 6, lab: -3 },
    poses: {
      fwd: { hip: [92, 180], torso: -14, th: 154, sh: 154, ua: 0, fa: 0 },
      back: { hip: [90, 184], torso: 14, th: 182, sh: 182, ua: 28, fa: 28 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['fwd', 0.7, 'Forward'], ['back', 0.7, 'Back']],
    still: 'back', cam: CAM.floor,
  },

  /* Face down along the bench, hips just past its end, legs raised to level. */
  'Reverse Hyperextensions': {
    scene: [{ k: 'bench', x: 70, flip: true }],
    base: { hip: [44, 147.4], torso: 0, hand: [140, 156, 10], hd: 270, lab: -3 },
    poses: { bottom: { th: 210, sh: 210, ft: 200 }, top: { th: 180, sh: 180, ft: 180 } },
    hi: ['glutes'], hi2: ['hamstrings', 'erectors'],
    tempo: [['top', 1, 'Raise'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top', cam: CAM.floor,
  },

  'Weighted Reverse Hyperextensions': {
    scene: [{ k: 'bench', x: 70, flip: true }],
    base: { hip: [44, 147.4], torso: 0, hand: [140, 156, 10], hd: 270, lab: -5 },
    poses: { bottom: { th: 208, sh: 208, ft: 208 }, top: { th: 180, sh: 180, ft: 180 } },
    hold: { n: 'db-feet' }, hi: ['glutes'], hi2: ['hamstrings', 'erectors'],
    tempo: [['top', 1, 'Raise'], ['top', 1, 'Pause'], ['bottom', 2, 'Lower']],
    still: 'top', cam: CAM.floor,
  },
};
