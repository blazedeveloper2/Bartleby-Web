/* ═══════════════════════════════════════════════════════════
   WORKOUT — WHAT EACH EXERCISE'S ANIMATED REP LOOKS LIKE

   One entry per exercise the lab can show, keyed by its exact name as
   howto.js has it; pose.js draws them. The pose keys are listed at the
   top of pose.js. Each entry also carries:

     view     'front' for side-to-side movements; side view otherwise
     scene    the kit around the body: a bench (at the program's angle),
              a wall, a bar, a mat, books, the Nordic anchor
     hold     what the hands hold: n for the near hand, f for the far
              one, hip for kit resting on the hips, pack for a backpack
     hi, hi2  the working muscle, and the ones helping, lit in the body
              map's colours
     tempo    [pose, seconds, label] in order; the loop moves into each
              pose over its seconds. Taken from the how-to's own cues
     still    the frame shown when motion is reduced
     trace    draw the path of the grip (or 'toe', 'hip')

   The positions were checked against each exercise's how-to and its
   sources in Oct 2026. Units are the drawing's own: the floor is at
   y = 194, a standing hip at about 111, and an arm about 52 long.
   ═══════════════════════════════════════════════════════════ */

const ANK = 190.3;     // an ankle with the foot flat on the floor
const PALM = 190.8;    // a wrist with the palm flat on the floor
const KNEE = 189.3;    // a knee resting on the floor
const WHEEL = 183.5;   // a wrist on an ab wheel's handles
const TOE = 191.1;     // the ball of a foot on the floor
const DB2 = { n: 'db', f: 'db' };
const DBS2 = { n: 'db-side', f: 'db-side' };

/* ── shared positions ── */

/* Lying back on a flat bench at x = 100, head to the left. */
const SUPINE = { hip: [88, 149.5], torso: 180, foot: [126, ANK] };
/* Seated against a back pad set to 55°. */
const RECLINED = { hip: [84.7, 151.9], torso: 125, foot: [126, ANK] };
/* A chest-to-wall handstand against a wall at x = 50. */
const WALL_HS = { hip: [75.4, 93.8], torso: 272, hand: [77, PALM], hd: 180, foot: [55, 18], ft: 95 };

/* The planche ladder: hands planted at x = 110, arms straight and leaning
   `lean` degrees forward of vertical, from a push-up lean with the toes
   down. */
const PLANCHE_LEAN = { root: 'wri', at: [110, PALM], ua: 238, fa: 238, hd: 0, torso: 18, th: 198, sh: 198, ft: 262 };
const planche = (lean, more) => ({ root: 'wri', at: [110, PALM], ua: 270 - lean, fa: 270 - lean, hd: 0, ft: 180, ...more });

/* The lever ladder: hanging from a bar at (100, 24), face up. */
const BAR = { k: 'bar', x: 100, y: 24 };
const HANG = { root: 'wri', at: [100, 28.5], ua: 90, fa: 90, hd: 90, torso: 90, th: 272, sh: 268, ft: 300 };
const lever = (arm, more) => ({ root: 'wri', at: [100, 28.5], ua: arm, fa: arm, hd: 90, torso: 180, ft: 0, ...more });

/* Push-ups: toes planted at x = 40 and the body a straight line at
   `deg` degrees, hands found by IK. */
const plank = (deg, more) => ({ root: 'toe', at: [40, TOE], ft: 262, torso: deg, th: 180 + deg, sh: 180 + deg, ...more });

/* The hollow and arch ladders lie on a mat. */
const MAT = (x0, x1) => ({ k: 'mat', x0, x1 });

const HOLD3 = (enter, hold, exit) => [['hold', enter, 'Enter'], ['hold', hold, 'Hold'], ['rest', exit, 'Exit']];

export const MOTION = {

  /* ══ MONDAY ══ */

  'Incline Dumbbell Press': {
    scene: [{ k: 'bench', x: 100, back: 30 }],
    base: { hip: [81, 150], torso: 150, foot: [128, ANK] },
    poses: { top: { hand: [43, 77] }, bottom: { hand: [47, 113], ul: 0.55 } },
    hold: DB2, hi: ['chest'], hi2: ['front delts', 'triceps'], trace: 'grip',
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Dumbbell Bench Press': {
    scene: [{ k: 'bench', x: 100 }],
    base: { ...SUPINE },
    poses: { top: { hand: [46, 97] }, bottom: { hand: [49, 135], ul: 0.55 } },
    hold: DB2, hi: ['chest'], hi2: ['front delts', 'triceps'], trace: 'grip',
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Dumbbell Shoulder Press': {
    scene: [{ k: 'bench', x: 100, back: 85 }],
    base: { hip: [100, 150], torso: 95, foot: [138, ANK] },
    poses: { top: { hand: [99, 56] }, bottom: { hand: [102, 93], ul: 0.6 } },
    hold: DB2, hi: ['front delts', 'side delts'], hi2: ['triceps'], trace: 'grip',
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  /* Seen from above: the arms sweep out to the sides and back over the
     chest, where they point at the camera (al below 1). */
  'Dumbbell Flyes': {
    view: 'front', noFloor: true,
    scene: [{ k: 'benchTop', x: 100, y0: 58, y1: 178 }],
    base: { hip: [100, 140], torso: 90, ath: 262, ash: 236, bth: 278, bsh: 304, all: 0.72, bll: 0.72 },
    poses: {
      top: { aua: 0, afa: 0, ahd: 0, al: 0.26, bua: 180, bfa: 180, bhd: 180, bl: 0.26 },
      bottom: { aua: 182, afa: 194, ahd: 194, al: 1, bua: -2, bfa: -14, bhd: -14, bl: 1 },
    },
    hold: { n: 'db-side' }, hi: ['chest'], hi2: ['side delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch'], ['top', 1.5, 'Squeeze'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Overhead Tricep Extensions': {
    scene: [{ k: 'bench', x: 100, back: 55, len: 50 }],
    base: { ...RECLINED, tilt: -22 },
    poses: { top: { ua: 95, fa: 93 }, bottom: { ua: 103, fa: 238 } },
    hold: { n: 'db-axial' }, hi: ['triceps'], trace: 'grip',
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  /* Kneeling behind the 45° back pad, armpit at its top edge. */
  'Preacher Curls': {
    scene: [{ k: 'bench', x: 100, back: 45, len: 64 }],
    sceneMid: true,
    base: { hip: [21.8, 150.9], torso: 73, th: 268, sh: 180, ft: 195, ua: 315, fua: 315, ffa: 330 },
    poses: { top: { fa: 452 }, bottom: { fa: 302 } },
    hold: { n: 'db' }, hi: ['biceps'], hi2: ['brachialis'], trace: 'grip',
    tempo: [['top', 1, 'Curl'], ['top', 0.5, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom']],
    still: 'bottom',
  },

  'Lateral Raises': {
    view: 'front',
    base: { hip: [100, 111], torso: 90, ath: 266, ash: 268, bth: 274, bsh: 272 },
    poses: {
      bottom: { aua: 258, afa: 262, bua: 282, bfa: 278 },
      top: { aua: 182, afa: 190, bua: 358, bfa: 350 },
    },
    hold: { n: 'db' }, hi: ['side delts'], hi2: ['traps'],
    tempo: [['top', 1, 'Raise'], ['top', 0.5, 'Top'], ['bottom', 2, 'Lower']],
    still: 'top',
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
    still: 'a',
  },

  /* Rear foot laces-down on the bench behind; the front leg is the near one. */
  'Bulgarian Split Squats': {
    scene: [{ k: 'bench', x: 40 }],
    base: { foot: [128, ANK], ffoot: [58, 152.5], fft: 192, ua: 270, fa: 270 },
    poses: { top: { hip: [100, 112], torso: 86 }, bottom: { hip: [94, 141], torso: 76 } },
    hold: DBS2, hi: ['quads', 'glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Drive'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Heel-Elevated Front Squats': {
    scene: [{ k: 'wedge', x: 126, w: 22, h: 4 }],
    base: { foot: [127, ANK - 3.4], ft: -8, ua: 8, fa: 166, hd: 150 },
    poses: { top: { hip: [118, 112], torso: 90 }, bottom: { hip: [104, 148], torso: 74, ua: 14, fa: 172 } },
    hold: { n: 'bb-rack' }, hi: ['quads'], hi2: ['glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Stand'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Heel-Elevated Goblet Squats': {
    scene: [{ k: 'wedge', x: 126, w: 22, h: 4 }],
    base: { foot: [127, ANK - 3.4], ft: -8, hd: 90 },
    poses: { top: { hip: [118, 112], torso: 90, hand: [131, 80] }, bottom: { hip: [104, 148], torso: 74, hand: [127, 121] } },
    hold: { n: 'db-goblet' }, hi: ['quads'], hi2: ['glutes'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1, 'Stand'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Barbell Romanian Deadlifts': {
    base: { foot: [102, ANK], ua: 270, fa: 270 },
    poses: { top: { hip: [100, 111.5], torso: 90 }, bottom: { hip: [72, 118], torso: 30 } },
    hold: { n: 'bb' }, hi: ['hamstrings', 'glutes'], hi2: ['erectors'], trace: 'grip',
    tempo: [['bottom', 2.5, 'Hinge'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Drive'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  'Romanian Deadlifts': {
    base: { foot: [102, ANK], ua: 270, fa: 270 },
    poses: { top: { hip: [100, 111.5], torso: 90 }, bottom: { hip: [72, 118], torso: 30 } },
    hold: DB2, hi: ['hamstrings', 'glutes'], hi2: ['erectors'], trace: 'grip',
    tempo: [['bottom', 2.5, 'Hinge'], ['bottom', 0.5, 'Stretch'], ['top', 1, 'Drive'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  /* On one foot on the bench, seen end-on, heel off its back edge; the
     other foot hooked behind, the free hand on the wall. */
  'Single-Leg Calf Raises': {
    scene: [{ k: 'benchEnd', x: 112, y: 161 }, { k: 'wall', x: 140 }],
    base: { root: 'toe', torso: 91, th: 270, sh: 270, fth: 258, fsh: 205, fft: 235, ua: 272, fa: 270, fhand: [137, 44] },
    poses: { bottom: { at: [101.5, 153.7], ft: 22 }, top: { at: [101.5, 153.7], ft: -38 } },
    hold: { n: 'db-side' }, hi: ['calves'],
    tempo: [['top', 1, 'Rise'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 1, 'Stretch']],
    still: 'bottom',
  },

  'Kneeling Rollouts to a Wall': {
    scene: [MAT(40, 160), { k: 'wall', x: 170 }],
    base: { root: 'kne', at: [60, KNEE], sh: 180, ft: 188 },
    poses: { start: { th: 260, torso: 25, flex: 10, hand: [108, WHEEL] }, out: { th: 240, torso: 12, flex: 8, hand: [160, WHEEL] } },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2, 'Roll'], ['out', 0.5, 'Tap'], ['start', 1.5, 'Pull']],
    still: 'out',
  },

  'Ab Wheel Rollouts': {
    scene: [MAT(40, 160)],
    base: { root: 'kne', at: [60, KNEE], sh: 180, ft: 188 },
    poses: { start: { th: 260, torso: 25, flex: 10, hand: [108, WHEEL] }, out: { th: 190, torso: 10, flex: 6, hand: [192, WHEEL] } },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2.5, 'Roll'], ['out', 0.5, 'Hold'], ['start', 2, 'Pull']],
    still: 'out',
  },

  'Standing Rollouts to a Wall': {
    scene: [{ k: 'wall', x: 208.5 }],
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [128, WHEEL], ft: 0 },
      out: { hip: [112, 142], torso: 342, flex: 8, hand: [199, WHEEL], foot: [60, ANK - 3.5], ft: -25 },
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2, 'Roll'], ['out', 0.5, 'Tap'], ['start', 2, 'Pull']],
    still: 'out',
  },

  /* Out standing, set the knees down at full stretch, back on the knees,
     then stand. */
  'Standing Rollout Negatives': {
    base: {},
    poses: {
      stand: { hip: [72, 112], torso: 300, flex: 10, hand: [128, WHEEL], foot: [60, ANK], ft: 0 },
      full: { hip: [118, 162], torso: 352, flex: 6, hand: [213, WHEEL], foot: [60, ANK - 3.5], ft: -25 },
      kneel: { hip: [137.5, 183], torso: 10, flex: 6, hand: [229, WHEEL], foot: [59, KNEE], ft: -175 },
      knees: { hip: [106.6, 151.9], torso: 25, flex: 10, hand: [148, WHEEL], foot: [59, KNEE], ft: -175 },
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['full', 5, 'Lower'], ['kneel', 1, 'Kneel'], ['knees', 2, 'Pull'], ['stand', 2, 'Stand']],
    still: 'full',
  },

  'Standing Ab Wheel Rollouts': {
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [128, WHEEL], ft: 0 },
      out: { hip: [118, 162], torso: 352, flex: 6, hand: [213, WHEEL], foot: [60, ANK - 3.5], ft: -25 },
    },
    hold: { n: 'wheel' }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2.5, 'Roll'], ['out', 0.5, 'Hold'], ['start', 2, 'Pull']],
    still: 'out',
  },

  'Weighted Standing Rollouts': {
    base: { foot: [60, ANK] },
    poses: {
      start: { hip: [72, 112], torso: 300, flex: 10, hand: [128, WHEEL], ft: 0 },
      out: { hip: [118, 162], torso: 352, flex: 6, hand: [213, WHEEL], foot: [60, ANK - 3.5], ft: -25 },
    },
    hold: { n: 'wheel', pack: true }, hi: ['abs'], hi2: ['lats'],
    tempo: [['out', 2.5, 'Roll'], ['out', 0.5, 'Hold'], ['start', 2, 'Pull']],
    still: 'out',
  },

  /* Head just past the end of the bench, the dumbbell held at arm's
     length beyond it. */
  'Dumbbell Crunch': {
    scene: [{ k: 'bench', x: 120 }],
    base: { hip: [82, 149.5], torso: 180, foot: [126, ANK] },
    poses: { bottom: { flex: 0, tilt: 12, ua: 177, fa: 177 }, top: { flex: 40, tilt: 0, ua: 140, fa: 140 } },
    hold: { n: 'db' }, hi: ['abs'],
    tempo: [['top', 1, 'Curl'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch']],
    still: 'top',
  },

  'Weighted Hanging Leg Raises': {
    scene: [{ k: 'bar', x: 100, y: 4 }],
    base: { root: 'wri', at: [100, 8.5], ua: 90, fa: 90, hd: 90, torso: 90, ft: 300 },
    poses: { bottom: { th: 276, sh: 258, flex: 0 }, top: { th: 30, sh: 18, flex: 22, ft: 60 } },
    hold: { n: 'db-feet' }, hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['top', 1.5, 'Raise'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 1, 'Bottom']],
    still: 'top',
  },

  /* Head at the high end of the declined bench, hands gripping it behind
     the head; the upper back stays down while the pelvis curls. */
  'Decline Reverse Crunches': {
    scene: [{ k: 'bench', x: 60, back: -15, flip: true }],
    base: { root: 'sho', at: [93.8, 151.5], hand: [46, 157], eb: -1 },
    poses: {
      bottom: { torso: 165, flex: 0, th: 75, sh: -15, ft: -15 },
      top: { torso: 215, flex: 50, th: 140, sh: 55, ft: 55 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['top', 1, 'Curl'], ['top', 1, 'Top'], ['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom']],
    still: 'top',
  },

  /* Facing the camera on the bottom forearm; the top arm reaches up,
     then threads under the body. */
  'Weighted Side Plank w/ Reach-Through': {
    view: 'front',
    scene: [MAT(30, 190)],
    base: { hip: [100, 166], torso: 162, afoot: [172, ANK], bfoot: [168, ANK - 6], aua: 262, afa: 185, ahd: 185 },
    poses: { top: { bua: 82, bfa: 82, bhd: 82 }, thread: { bua: 222, bfa: 232, bhd: 232 } },
    hold: { n: 'db', one: 'b' }, hi: ['obliques'],
    tempo: [['thread', 2, 'Thread'], ['thread', 0.5, 'Hold'], ['top', 1.5, 'Unwind'], ['top', 0.5, 'Top']],
    still: 'top',
  },

  /* ══ THURSDAY ══ */

  'Pull-Ups': {
    view: 'front',
    scene: [{ k: 'hbar', x0: 58, x1: 142, y: 22 }],
    base: { torso: 90, ahand: [72, 26], bhand: [128, 26], ahd: 90, bhd: 90, all: 0.8, bll: 0.8, ath: 262, ash: 280, bth: 278, bsh: 260 },
    poses: { hang: { hip: [100, 120] }, set: { hip: [100, 116] }, top: { hip: [100, 74] } },
    hi: ['lats'], hi2: ['biceps'],
    tempo: [['set', 0.5, 'Set'], ['top', 1, 'Pull'], ['top', 0.5, 'Top'], ['hang', 2, 'Lower']],
    still: 'top',
  },

  'Single-Arm Rows': {
    scene: [{ k: 'bench', x: 90 }],
    base: { hip: [62, 113.5], torso: 8, foot: [74, ANK], fth: 268, fsh: 180, fft: 185, fhand: [108, 152.5], fhd: 0 },
    poses: { bottom: { ua: 270, fa: 270 }, top: { ua: 160, fa: 268 } },
    hold: { n: 'db-side' }, hi: ['lats'], hi2: ['rear delts', 'biceps'], trace: 'grip',
    tempo: [['top', 1, 'Pull'], ['top', 0.5, 'Squeeze'], ['bottom', 2, 'Lower'], ['bottom', 0.5, 'Stretch']],
    still: 'top',
  },

  /* Face down on the 30° pad, feet on the floor behind. */
  'Chest-Supported Rows': {
    scene: [{ k: 'bench', x: 60, back: 30, flip: true }],
    sceneMid: true,
    base: { hip: [83.1, 145.2], torso: 30, foot: [28, ANK - 3], ft: -55 },
    poses: { bottom: { ua: 270, fa: 270 }, top: { ua: 158, fa: 268 } },
    hold: DBS2, hi: ['lats'], hi2: ['rear delts', 'traps'], trace: 'grip',
    tempo: [['top', 1, 'Row'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top',
  },

  'Dumbbell Pullovers': {
    scene: [{ k: 'bench', x: 110 }],
    base: { hip: [95, 149.5], torso: 180, foot: [132, ANK] },
    poses: { top: { ua: 90, fa: 100 }, bottom: { ua: 172, fa: 182 } },
    hold: { n: 'db' }, hi: ['lats', 'chest'], hi2: ['serratus', 'triceps'], trace: 'grip',
    tempo: [['bottom', 3, 'Lower'], ['bottom', 0.5, 'Stretch'], ['top', 2, 'Pull']],
    still: 'bottom',
  },

  /* Seen from the head end of the 30° bench, chest on the pad. */
  'Reverse Flyes': {
    view: 'front', noLegs: true,
    scene: [{ k: 'benchEnd', x: 100, y: 150 }],
    base: { hip: [100, 138], torso: 90, tlen: 0.3, face: 'down' },
    poses: {
      bottom: { aua: 266, afa: 274, bua: 274, bfa: 266 },
      top: { aua: 186, afa: 196, bua: 354, bfa: 344 },
    },
    hold: { n: 'db' }, hi: ['rear delts'], hi2: ['traps'],
    tempo: [['top', 1.5, 'Raise'], ['top', 0.5, 'Hold'], ['bottom', 2, 'Lower']],
    still: 'top',
  },

  'Hammer Curls': {
    base: { hip: [100, 111.5], torso: 90, th: 270, sh: 270 },
    poses: { bottom: { ua: 272, fa: 270 }, top: { ua: 280, fa: 428 } },
    hold: DBS2, hi: ['brachialis'], hi2: ['forearms', 'biceps'], trace: 'grip',
    tempo: [['top', 1, 'Curl'], ['bottom', 2.5, 'Lower']],
    still: 'top',
  },

  'Incline Curls': {
    scene: [{ k: 'bench', x: 100, back: 55 }],
    sceneMid: true,
    base: { ...RECLINED },
    poses: { bottom: { ua: 270, fa: 270 }, top: { ua: 268, fa: 400 } },
    hold: DB2, hi: ['biceps'], hi2: ['brachialis'], trace: 'grip',
    tempo: [['top', 1, 'Curl'], ['bottom', 3, 'Lower'], ['bottom', 1, 'Stretch']],
    still: 'bottom',
  },

  /* ══ FRIDAY ══ */

  /* Upper back on the bench edge (the bench seen end-on), bar on the hips. */
  'Barbell Hip Thrusts': {
    scene: [{ k: 'benchEnd', x: 58, y: 161 }],
    base: { root: 'sho', at: [68, 149], foot: [152, ANK] },
    poses: { bottom: { torso: 150, tilt: -10, hand: [109, 159] }, top: { torso: 180, tilt: -22, hand: [108, 136] } },
    hold: { hip: 'bb-hip' }, hi: ['glutes'], hi2: ['hamstrings'],
    tempo: [['top', 1, 'Drive'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top',
  },

  'B-Stance Hip Thrusts': {
    scene: [{ k: 'benchEnd', x: 58, y: 161 }],
    base: { root: 'sho', at: [68, 149], foot: [150, ANK], ffoot: [166, ANK - 1.5], fft: 40 },
    poses: { bottom: { torso: 150, tilt: -10, hand: [109, 159] }, top: { torso: 180, tilt: -22, hand: [108, 136] } },
    hold: { hip: 'db-hip' }, hi: ['glutes'], hi2: ['hamstrings'],
    tempo: [['top', 1, 'Drive'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top',
  },

  'Nordic Curl Negatives': {
    scene: [MAT(70, 210), { k: 'anchor', x: 52, y: 181 }],
    base: { root: 'kne', at: [100, KNEE], sh: 180, ft: 188 },
    poses: {
      start: { th: 270, torso: 90, hand: [113, 117] },
      catch: { th: 200, torso: 20, hand: [184, PALM], hd: 0 },
      push: { th: 215, torso: 35, hand: [172, 158] },
    },
    hi: ['hamstrings'], hi2: ['calves'],
    tempo: [['catch', 4, 'Lower'], ['catch', 0.5, 'Catch'], ['push', 1.5, 'Push'], ['start', 1, 'Reset']],
    still: 'catch',
  },

  /* Kneeling beside the bench (seen end-on), forearms across the pad,
     wrists just past its far edge. */
  'Dumbbell Wrist Curls': {
    scene: [{ k: 'benchEnd', x: 122, y: 161 }],
    base: { root: 'kne', at: [82, KNEE], th: 268, sh: 180, ft: 190, torso: 35, ua: 252, fa: 0 },
    poses: { low: { hd: -65 }, top: { hd: 55 } },
    hold: DB2, hi: ['forearms'],
    tempo: [['top', 1, 'Curl'], ['low', 2, 'Lower'], ['low', 0.5, 'Grip']],
    still: 'low',
  },

  'Dumbbell Reverse Wrist Curls': {
    scene: [{ k: 'benchEnd', x: 122, y: 161 }],
    base: { root: 'kne', at: [82, KNEE], th: 268, sh: 180, ft: 190, torso: 35, ua: 252, fa: 0 },
    poses: { low: { hd: -55 }, top: { hd: 45 } },
    hold: DB2, hi: ['forearms'],
    tempo: [['top', 1, 'Lift'], ['top', 1, 'Pause'], ['low', 2, 'Lower']],
    still: 'top',
  },

  /* ══ SATURDAY ══ */

  'Wrist Prep Rocks': {
    scene: [MAT(40, 170)],
    base: { root: 'kne', at: [90, KNEE], sh: 180, ft: 185, hand: [128, PALM], hd: 0 },
    poses: {
      mid: { th: 270, torso: 17 },
      fwd: { th: 252, torso: 16 },
      back: { th: 300, torso: 22 },
    },
    hi: ['forearms'],
    tempo: [['fwd', 1.5, 'Forward'], ['fwd', 1, 'Hold'], ['back', 1.5, 'Back'], ['back', 1, 'Hold']],
    still: 'fwd',
  },

  /* Walk up the wall from a push-up, hold, walk down. */
  'Wall Handstand Hold': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: {},
    poses: {
      plank: { hip: [127.4, 158.5], torso: 383.5, hand: [170, PALM], hd: 0, foot: [57, ANK - 2], ft: 260 },
      mid: { hip: [90, 107], torso: 315, hand: [122, PALM], hd: 90, foot: [57, 62], ft: 180 },
      hold: { ...WALL_HS },
    },
    hi: ['front delts'], hi2: ['traps', 'triceps'],
    sway: [['torso', 0.6, 0.3]],
    tempo: [['mid', 1.2, 'Walk'], ['hold', 1.3, 'Up'], ['hold', 4, 'Hold'], ['plank', 1.5, 'Down']],
    still: 'hold',
  },

  'Wall Toe Pulls': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { ...WALL_HS },
    poses: { wall: {}, float: { hip: [78.4, 93.2], torso: 270, foot: [59.5, 16] } },
    hi: ['front delts'], hi2: ['traps', 'forearms'],
    tempo: [['wall', 1.5, 'Settle'], ['float', 1, 'Shift'], ['float', 2, 'Float'], ['wall', 1, 'Return']],
    still: 'float',
  },

  'Freestanding Kick-Ups': {
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      set: { ua: 292, fa: 292, torso: 322, th: 132, sh: 132, ft: 132, ffoot: [64, ANK], fth: 250, fsh: 270, fft: 0 },
      kick: { ua: 280, fa: 280, torso: 290, th: 100, sh: 100, ft: 100, ffoot: null, fth: 196, fsh: 196, fft: 196 },
      top: { ua: 270, fa: 270, torso: 270, th: 90, sh: 90, ft: 90, ffoot: null, fth: 90, fsh: 90, fft: 90 },
    },
    hi: ['front delts'], hi2: ['traps', 'triceps'],
    sway: [['torso', 0.8, 0.4], ['th', 0.8, 0.4], ['sh', 0.8, 0.4], ['fth', 0.8, 0.4], ['fsh', 0.8, 0.4], ['ua', 0.8, 0.4], ['fa', 0.8, 0.4]],
    tempo: [['set', 1, 'Set'], ['kick', 1, 'Kick'], ['top', 0.6, 'Arrive'], ['top', 2.4, 'Balance'], ['set', 1.5, 'Down']],
    still: 'top',
  },

  'Freestanding Handstand': {
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      set: { ua: 292, fa: 292, torso: 322, th: 132, sh: 132, ft: 132, ffoot: [64, ANK], fth: 250, fsh: 270, fft: 0 },
      top: { ua: 270, fa: 270, torso: 270, th: 90, sh: 90, ft: 90, ffoot: null, fth: 90, fsh: 90, fft: 90 },
    },
    hi: ['front delts'], hi2: ['traps', 'forearms'],
    sway: [['torso', 1.4, 0.3], ['th', 1.4, 0.3], ['sh', 1.4, 0.3], ['fth', 1.4, 0.3], ['fsh', 1.4, 0.3], ['ua', 1.4, 0.3], ['fa', 1.4, 0.3]],
    tempo: [['top', 1.5, 'Kick'], ['top', 4.5, 'Hold'], ['set', 1.5, 'Down']],
    still: 'top',
  },

  /* A straddle, seen from the side, shows as legs foreshortened toward
     the camera (ll below 1). */
  'Straddle Press to Handstand': {
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      fold: { ua: 290, fa: 290, torso: 331, flex: 20, foot: [62, ANK], ft: 0, ll: 0.9, th: 250, sh: 270 },
      lean: { ua: 256, fa: 256, torso: 318, flex: 26, foot: null, th: 232, sh: 236, ft: 250, ll: 0.8 },
      stack: { ua: 270, fa: 270, torso: 272, flex: 10, foot: null, th: 172, sh: 172, ft: 172, ll: 0.55 },
      hs: { ua: 270, fa: 270, torso: 270, flex: 0, foot: null, th: 90, sh: 90, ft: 90, ll: 1 },
    },
    hi: ['front delts'], hi2: ['traps', 'hip flexors'],
    tempo: [['lean', 1.5, 'Lean'], ['stack', 2.5, 'Press'], ['hs', 1, 'Stack'], ['fold', 2, 'Down']],
    still: 'stack',
  },

  /* Seen from the front: the hips shift over one hand, the other lifts. */
  'One-Arm Handstand': {
    view: 'front',
    base: { torso: 270, ath: 58, ash: 58, bth: 122, bsh: 122, ahd: 270, bhd: 270 },
    poses: {
      base: { hip: [100, 96], ahand: [111, PALM], bhand: [89, PALM] },
      shift: { hip: [108, 97], ahand: [111, PALM], bhand: [89, PALM] },
      light: { hip: [110, 97], ahand: [111, PALM], bhand: [87, 188] },
      lift: { hip: [111, 97], ahand: [111, PALM], bhand: [76, 176] },
    },
    hi: ['side delts'], hi2: ['traps', 'obliques'],
    sway: [['hip', 0, 0]],
    tempo: [['shift', 1.5, 'Shift'], ['light', 1, 'Lighten'], ['lift', 3, 'Hold'], ['base', 1.5, 'Return']],
    still: 'lift',
  },

  'Frog Stand': {
    scene: [MAT(50, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      squat: { ua: 250, fa: 265, torso: 345, th: 300, sh: 250, ft: 0, foot: [82, ANK] },
      lean: { ua: 245, fa: 260, torso: 330, th: 310, sh: 200, ft: 200, foot: null },
    },
    hi: ['front delts'], hi2: ['triceps', 'forearms'],
    tempo: [['squat', 1, 'Squat'], ['lean', 1.5, 'Lean'], ['lean', 4, 'Hold'], ['squat', 1, 'Down']],
    still: 'lean',
  },

  'Straight-Arm Frog Stand': {
    scene: [MAT(50, 170)],
    base: { root: 'wri', at: [110, PALM], hd: 0 },
    poses: {
      squat: { ua: 262, fa: 262, torso: 330, th: 300, sh: 250, ft: 0, foot: [84, ANK] },
      lean: { ua: 245, fa: 245, torso: 325, th: 312, sh: 200, ft: 200, foot: null },
    },
    hi: ['front delts'], hi2: ['serratus', 'forearms'],
    tempo: [['squat', 1, 'Squat'], ['lean', 1.5, 'Lean'], ['lean', 4, 'Hold'], ['squat', 1, 'Down']],
    still: 'lean',
  },

  'Tuck Planche': {
    scene: [MAT(30, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(32, { torso: 355, flex: 25, th: 322, sh: 205, ft: 200 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'abs'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Lift'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold',
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
    still: 'hold',
  },

  'Straddle Planche': {
    scene: [MAT(10, 170)],
    base: {},
    poses: {
      lean: { ...PLANCHE_LEAN },
      hold: planche(42, { torso: 0, flex: -3, th: 180, sh: 180, ll: 0.62 }),
    },
    hi: ['front delts'], hi2: ['serratus', 'glutes'],
    tempo: [['lean', 1.5, 'Lean'], ['hold', 1, 'Extend'], ['hold', 4, 'Hold'], ['lean', 1.5, 'Down']],
    still: 'hold',
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
    still: 'hold',
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
    still: 'hold',
  },

  /* Shoulders shrugged to the ears, then pulled down: drawn as the arm
     shortening between bar and shoulder (ul). */
  'Scapular Pulls': {
    scene: [BAR],
    base: { ...HANG },
    poses: { passive: { ul: 1.12 }, active: { ul: 0.96 } },
    hi: ['lats'], hi2: ['traps'],
    tempo: [['passive', 1, 'Hang'], ['active', 1, 'Pull'], ['active', 1, 'Pause'], ['passive', 2, 'Lower']],
    still: 'active',
  },

  'Arch Hangs': {
    scene: [BAR],
    base: { ...HANG },
    poses: { hang: { ul: 0.96 }, arch: { ua: 68, fa: 68, torso: 108, flex: -18, th: 255, sh: 252, ul: 0.96 } },
    hi: ['lats'], hi2: ['rear delts', 'traps'],
    tempo: [['hang', 1, 'Hang'], ['arch', 1.5, 'Arch'], ['arch', 2, 'Hold'], ['hang', 1.5, 'Lower']],
    still: 'arch',
  },

  'Tuck Front Lever': {
    scene: [BAR],
    base: {},
    poses: {
      hang: { ...HANG, th: 150, sh: 300, ft: 300 },
      hold: lever(80, { flex: 25, th: 150, sh: 10, ft: 10 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold',
  },

  'Advanced Tuck Front Lever': {
    scene: [BAR],
    base: {},
    poses: {
      hang: { ...HANG, th: 150, sh: 300, ft: 300 },
      hold: lever(77, { th: 90, sh: 320, ft: 320 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold',
  },

  'Straddle Front Lever': {
    scene: [BAR],
    base: {},
    poses: {
      hang: { ...HANG, th: 150, sh: 300, ft: 300 },
      hold: lever(73, { th: 0, sh: 0, ft: 0, ll: 0.62 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Extend'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold',
  },

  'Half-Lay Front Lever': {
    scene: [BAR],
    base: {},
    poses: {
      hang: { ...HANG, th: 150, sh: 300, ft: 300 },
      hold: lever(73, { th: 0, sh: 270, ft: 0 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Open'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Tuck']],
    still: 'hold',
  },

  'Full Front Lever': {
    scene: [BAR],
    base: {},
    poses: {
      hang: { ...HANG },
      hold: lever(70, { th: 0, sh: 0, ft: 0 }),
    },
    hi: ['lats'], hi2: ['abs', 'rear delts'],
    tempo: [['hold', 1.5, 'Raise'], ['hold', 4, 'Hold'], ['hang', 1.5, 'Lower'], ['hang', 1, 'Hang']],
    still: 'hold',
  },

  'Scapular Push-Ups': {
    scene: [MAT(30, 180)],
    base: { ...plank(20), hand: [159, PALM], hd: 0 },
    poses: { sink: { flex: -10 }, push: { flex: 12 } },
    hi: ['serratus'], hi2: ['traps'],
    tempo: [['sink', 1.5, 'Sink'], ['push', 1.5, 'Push'], ['push', 1, 'Hold']],
    still: 'push',
  },

  'Chin-Ups': {
    scene: [{ k: 'bar', x: 100, y: 22 }],
    base: { hand: [100, 26.5], hd: 90, th: 278, sh: 212, ft: 240 },
    poses: { hang: { hip: [100, 120], torso: 90 }, top: { hip: [96, 72], torso: 100 } },
    hi: ['lats', 'biceps'],
    tempo: [['top', 1, 'Pull'], ['top', 0.5, 'Top'], ['hang', 2, 'Lower'], ['hang', 0.5, 'Hang']],
    still: 'top',
  },

  'Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [159, PALM], hd: 0 },
    poses: { top: plank(20), bottom: plank(5) },
    hi: ['chest'], hi2: ['triceps', 'front delts'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  'Diamond Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [150, PALM], hd: 0 },
    poses: { top: plank(19), bottom: plank(6) },
    hi: ['triceps'], hi2: ['chest'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  /* Toes on the end of the bench, hands on the floor. */
  'Decline Push-Ups': {
    scene: [{ k: 'bench', x: 30 }],
    base: { root: 'toe', at: [52, 153.7], ft: 262, hand: [178, PALM], hd: 0 },
    poses: { top: { torso: 2, th: 182, sh: 182 }, bottom: { torso: 345, th: 165, sh: 165 } },
    hi: ['chest'], hi2: ['front delts', 'triceps'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  /* Seen from the head end: the body shifts over one hand at a time. */
  'Archer Push-Ups': {
    view: 'front', noLegs: true,
    scene: [MAT(30, 170)],
    base: { torso: 270, tlen: 0.25, face: 'down', ahand: [140, PALM], bhand: [60, PALM], ahd: 270, bhd: 270 },
    poses: {
      center: { hip: [100, 136] },
      left: { hip: [82, 159] },
      right: { hip: [118, 159] },
    },
    hi: ['chest'], hi2: ['triceps'],
    tempo: [['left', 2, 'Lower'], ['center', 1, 'Press'], ['right', 2, 'Lower'], ['center', 1, 'Press']],
    still: 'left',
  },

  /* One hand on the end of the bench (seen end-on), the free hand behind
     the back. */
  'Incline One-Arm Push-Ups': {
    scene: [{ k: 'benchEnd', x: 170, y: 161 }],
    base: { root: 'toe', at: [40, TOE], ft: 262, hand: [165, 153.3], hd: 0, fhand: null },
    poses: {
      top: { torso: 37, th: 217, sh: 217, fua: 250, ffa: 40 },
      bottom: { torso: 20, th: 200, sh: 200, fua: 232, ffa: 22 },
    },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom',
  },

  'One-Arm Push-Ups': {
    scene: [MAT(30, 180)],
    base: { hand: [156, PALM], hd: 0, fhand: null },
    poses: { top: plank(20, { fua: 232, ffa: 30 }), bottom: plank(8, { fua: 220, ffa: 18 }) },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom',
  },

  'One-Arm Push-Ups, Feet Together': {
    scene: [MAT(30, 180)],
    base: { hand: [156, PALM], hd: 0, fhand: null },
    poses: { top: plank(20, { fua: 232, ffa: 30 }), bottom: plank(8, { fua: 220, ffa: 18 }) },
    hi: ['chest'], hi2: ['triceps', 'obliques'],
    tempo: [['bottom', 2, 'Lower'], ['top', 1.5, 'Press'], ['top', 0.5, 'Reset']],
    still: 'bottom',
  },

  'Pike Push-Ups': {
    scene: [MAT(30, 170)],
    base: { foot: [60, ANK - 4], ft: -40, hand: [114, PALM], hd: 0 },
    poses: { top: { hip: [78, 113], torso: 325 }, bottom: { hip: [95, 121], torso: 300 } },
    hi: ['front delts'], hi2: ['triceps', 'side delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Elevated Pike Push-Ups': {
    scene: [{ k: 'bench', x: 30 }],
    base: { root: 'toe', at: [52, 153.7], ft: 300, hand: [140, PALM], hd: 0 },
    poses: { top: { torso: 305, th: 213, sh: 213 }, bottom: { torso: 290, th: 202, sh: 202 } },
    hi: ['front delts'], hi2: ['triceps', 'side delts'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Top']],
    still: 'bottom',
  },

  'Wall Handstand Push-Up Negatives': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { hand: [77, PALM], hd: 180, ft: 95, eb: -1 },
    poses: {
      top: { hip: [75.4, 93.8], torso: 272, foot: [56, 18] },
      bottom: { hip: [76.3, 127.4], torso: 262, foot: [56, 52] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 4, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Reset']],
    still: 'bottom',
  },

  'Wall Handstand Push-Ups': {
    scene: [{ k: 'wall', x: 50, side: 'l' }],
    base: { hand: [77, PALM], hd: 180, ft: 95, eb: -1 },
    poses: {
      top: { hip: [75.4, 93.8], torso: 272, foot: [56, 18] },
      bottom: { hip: [76.3, 127.4], torso: 262, foot: [56, 52] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  'Deficit Wall Handstand Push-Ups': {
    scene: [{ k: 'wall', x: 50, side: 'l' }, { k: 'books', xs: [79], n: 3 }],
    base: { hand: [79, 180.6], hd: 180, ft: 95, eb: -1 },
    poses: {
      top: { hip: [77.4, 83.6], torso: 272, foot: [56, 8] },
      bottom: { hip: [77, 128], torso: 262, foot: [56, 52] },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    tempo: [['bottom', 2.5, 'Lower'], ['bottom', 0.5, 'Bottom'], ['top', 1.5, 'Press'], ['top', 0.5, 'Lockout']],
    still: 'bottom',
  },

  'Freestanding Handstand Push-Ups': {
    base: { hand: [100, PALM], hd: 180, eb: -1 },
    poses: {
      top: { hip: [98.4, 93.8], torso: 272, th: 90, sh: 90, ft: 90 },
      bottom: { hip: [104.6, 128.5], torso: 255, th: 78, sh: 78, ft: 78 },
    },
    hi: ['front delts'], hi2: ['triceps', 'traps'],
    sway: [['torso', 0.5, 0.4]],
    tempo: [['bottom', 2, 'Lower'], ['bottom', 0.5, 'Touch'], ['top', 1.5, 'Press'], ['top', 1, 'Balance']],
    still: 'bottom',
  },

  /* ══ HOLLOW AND ARCH: on the floor ══ */

  'Tuck Hollow Hold': {
    scene: [MAT(40, 190)],
    base: { hip: [120, 186.5], torso: 180 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 0, fa: 0 },
      hold: { flex: 22, foot: null, th: 132, sh: 20, ft: 30, ua: 8, fa: 8 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold',
  },

  'One-Leg Hollow Hold': {
    scene: [MAT(40, 200)],
    base: { hip: [120, 186.5], torso: 180, flex: 22, ua: 8, fa: 8 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, fft: 0, ua: 0, fa: 0 },
      a: { foot: null, th: 25, sh: 25, ft: 20, fth: 132, fsh: 20, fft: 30 },
      b: { foot: null, th: 132, sh: 20, ft: 30, fth: 25, fsh: 25, fft: 20 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['a', 1, 'Enter'], ['a', 2.5, 'Hold'], ['b', 0.8, 'Switch'], ['b', 2.5, 'Hold'], ['rest', 0.8, 'Exit']],
    still: 'a',
  },

  'Hollow Body Hold': {
    scene: [MAT(40, 210)],
    base: { hip: [120, 186.5], torso: 180 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 0, fa: 0 },
      hold: { flex: 22, foot: null, th: 18, sh: 18, ft: 10, ua: 8, fa: 8 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold',
  },

  'Overhead Hollow Hold': {
    scene: [MAT(20, 210)],
    base: { hip: [120, 186.5], torso: 180 },
    poses: {
      rest: { flex: 0, foot: [162, ANK], ft: 0, ua: 180, fa: 180 },
      hold: { flex: 22, foot: null, th: 18, sh: 18, ft: 10, ua: 170, fa: 168 },
    },
    hi: ['abs'], hi2: ['hip flexors', 'lats'],
    tempo: HOLD3(1.5, 5, 1.5), still: 'hold',
  },

  /* The overhead hollow shape, rocked as one piece. */
  'Hollow Body Rocks': {
    scene: [MAT(20, 210)],
    base: { flex: 22, ft: 10 },
    poses: {
      back: { hip: [120, 178], torso: 196, th: 34, sh: 34, ua: 186, fa: 184 },
      fwd: { hip: [118, 185], torso: 166, th: 4, sh: 4, ua: 156, fa: 154 },
    },
    hi: ['abs'], hi2: ['hip flexors'],
    tempo: [['back', 0.6, 'Back'], ['fwd', 0.6, 'Forward']],
    still: 'back',
  },

  /* Face down, head to the right. */
  'Arch Hold': {
    scene: [MAT(10, 180)],
    base: { hip: [90, 186.5], torso: 0 },
    poses: {
      rest: { flex: 0, th: 180, sh: 180, ft: 200, ua: 180, fa: 180 },
      hold: { flex: -16, th: 168, sh: 168, ft: 180, ua: 172, fa: 172, tilt: 6 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['hold', 1, 'Enter'], ['hold', 5, 'Hold'], ['rest', 1, 'Exit']],
    still: 'hold',
  },

  'Overhead Arch Hold': {
    scene: [MAT(10, 210)],
    base: { hip: [90, 186.5], torso: 0 },
    poses: {
      rest: { flex: 0, th: 180, sh: 180, ft: 200, ua: 0, fa: 0 },
      hold: { flex: -16, th: 168, sh: 168, ft: 180, ua: 14, fa: 14, tilt: 6 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['hold', 1, 'Enter'], ['hold', 5, 'Hold'], ['rest', 1, 'Exit']],
    still: 'hold',
  },

  'Arch Body Rocks': {
    scene: [MAT(10, 210)],
    base: { flex: -16, ft: 180, tilt: 6 },
    poses: {
      fwd: { hip: [92, 180], torso: -14, th: 154, sh: 154, ua: 0, fa: 0 },
      back: { hip: [90, 184], torso: 14, th: 182, sh: 182, ua: 28, fa: 28 },
    },
    hi: ['erectors', 'glutes'], hi2: ['rear delts'],
    tempo: [['fwd', 0.7, 'Forward'], ['back', 0.7, 'Back']],
    still: 'back',
  },

  /* Face down along the bench, hips just past its end, legs raised to level. */
  'Reverse Hyperextensions': {
    scene: [{ k: 'bench', x: 70, flip: true }],
    base: { hip: [44, 147.4], torso: 0, hand: [140, 160], hd: 270 },
    poses: { bottom: { th: 214, sh: 214, ft: 214 }, top: { th: 180, sh: 180, ft: 180 } },
    hi: ['glutes'], hi2: ['hamstrings', 'erectors'],
    tempo: [['top', 1, 'Raise'], ['top', 1, 'Squeeze'], ['bottom', 2, 'Lower']],
    still: 'top',
  },

  'Weighted Reverse Hyperextensions': {
    scene: [{ k: 'bench', x: 70, flip: true }],
    base: { hip: [44, 147.4], torso: 0, hand: [140, 160], hd: 270 },
    poses: { bottom: { th: 208, sh: 208, ft: 208 }, top: { th: 180, sh: 180, ft: 180 } },
    hold: { n: 'db-feet' }, hi: ['glutes'], hi2: ['hamstrings', 'erectors'],
    tempo: [['top', 1, 'Raise'], ['top', 1, 'Pause'], ['bottom', 2, 'Lower']],
    still: 'top',
  },
};
