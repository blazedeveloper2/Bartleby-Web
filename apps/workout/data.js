/* ═══════════════════════════════════════════════════════════
   WORKOUT — program definition + muscle-map lookup table.
   ═══════════════════════════════════════════════════════════ */

/* An exercise with an `alt` names the kit it needs in `req` ('bar', 'wheel').
   Turn that piece of equipment off in Settings and the whole app — rendering,
   scoring, badge counts — reads the `alt` version instead, so
   the program still works for anyone without a pull-up bar or an ab wheel.
   An `alt` with no `req` never swaps; name the equipment.

   A day carrying a `since` date was added to the program on that date.
   Streaks, the heatmap and perfect weeks in rank.js honour it, so the
   weekday reads as what it actually was before then — a rest day — instead
   of a wall of retroactive misses. */
export const PROGRAM = [
  {day:'mon',label:'Upper · Push Focus',sections:[
    {tag:null,ex:[
      {n:'Incline Dumbbell Press',m:'Upper Chest, Front Delts, Triceps',s:'2×F',b:'30°',bc:'bench-30'},
      {n:'Dumbbell Bench Press',m:'Chest, Triceps, Front Delts',s:'2×F',b:'Flat 0°',bc:'bench-flat'},
      {n:'Dumbbell Shoulder Press',m:'Front Delts, Side Delts, Triceps',s:'2×F',b:'85°',bc:'bench-85'},
    ]},
    {tag:'Isolation',ex:[
      {n:'Dumbbell Flyes',m:'Chest (stretch focus), Front Delts',s:'2×F',b:'Flat 0°',bc:'bench-flat'},
      {n:'Overhead Tricep Extensions',m:'Triceps Long Head, Lateral Head',s:'2×F',b:'85°',bc:'bench-85'},
      {n:'Preacher Curls',m:'Biceps Short Head, Brachialis',s:'2×F',b:'45°',bc:'bench-30'},
      /* Four sets, not the program's usual two. Pressing hammers the front
         head and barely touches the side one — a lateral raise reads ~30%
         MVIC at the medial delt against ~28% for an overhead press, and the
         press needs far more load, and more triceps and traps, to get there.
         Six to twelve direct weekly sets is the common recommendation; the
         trial that actually measured side-delt growth used ten. Two days at
         four lands on eight. Failure is not a substitute for the sets —
         that trial's sets were to momentary failure too. */
      {n:'Lateral Raises',m:'Side Delts',s:'4×F'},
    ]},
  ]},
  {day:'tue',label:'Lower · Quad Focus',sections:[
    {tag:'Warm-Up',ex:[
      {n:'Dead Bugs',m:'Rectus Abdominis, TVA',s:'1× easy /side'},
    ]},
    {tag:null,ex:[
      {n:'Bulgarian Split Squats',m:'Quads, Glutes, Adductors',s:'2×F /leg',b:'Flat 0°',bc:'bench-flat'},
      {n:'Heel-Elevated Goblet Squats',m:'Quads, Glutes, Core',s:'2×F'},
      {n:'Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F'},
      {n:'Standing Calf Raises',m:'Gastrocnemius, Soleus',s:'2×F'},
    ]},
    {tag:'Core',ex:[
      /* The rollout, not the crunch, anchors this block. It tops the EMG
         tables for upper and lower rectus abdominis, both obliques and the
         lats at once, and loads all of that at long muscle length with the
         arms overhead — which a crunch, short-range and short-muscle-length,
         never does. It also progresses without a heavier dumbbell: further
         out, then standing. It runs first because it is the set that
         deserves the least fatigue. Friday keeps the crunch: that core block
         sits behind four consecutive hip hinges, and a rollout on cooked
         erectors is exactly how the pelvis untucks into lumbar extension.
         No wheel swaps the crunch straight back in. */
      {n:'Ab Wheel Rollouts',m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior',s:'3×5-8',b:'From Knees',
       req:'wheel', alt:{n:'Dumbbell Crunch',m:'Upper Abs, Rectus Abdominis, Obliques',s:'2×8-15',b:'Hips On Bench',bc:'bench-flat'}},
      {n:'Weighted Hanging Leg Raises',m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'DB Between Feet',bc:'grip',
       req:'bar', alt:{n:'Weighted Reverse Crunches',m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Weighted Side Plank w/ Reach-Through',m:'Obliques, TVA, Core',s:'2×F /side',b:'DB On Top Hip',bc:'grip'},
    ]},
  ]},
  {day:'thu',label:'Upper · Pull Focus',sections:[
    {tag:null,ex:[
      {n:'Pull-Ups',m:'Lats, Biceps, Rhomboids, Forearms',s:'2×F',b:'Pronated Grip',bc:'grip',
       req:'bar', alt:{n:'Single-Arm Rows',m:'Lats, Rhomboids, Rear Delts, Biceps',s:'2×F /arm',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Chest-Supported Rows',m:'Lats, Rhomboids, Traps, Rear Delts, Biceps',s:'2×F',b:'30-45°',bc:'bench-30'},
      {n:'Dumbbell Pullovers',m:'Lats, Chest, Serratus Anterior',s:'2×F',b:'Flat 0°',bc:'bench-flat'},
    ]},
    {tag:'Isolation',ex:[
      /* Same reasoning as Monday's raises, and starker: the rear delt had
         two direct sets a week against ten-plus for the chest. Rows do feed
         it, but they split the work with lats, biceps and grip, and an
         overhead press reaches it at ~11% MVIC. Four is the bottom of the
         recommended 4-12, not the middle. Stacked on one day rather than
         split because volume, not frequency, is what moves hypertrophy once
         weekly sets are equated. */
      {n:'Reverse Flyes',m:'Rear Delts, Rhomboids, Mid Traps',s:'4×F',b:'30°',bc:'bench-30'},
      {n:'Hammer Curls',m:'Brachialis, Brachioradialis, Biceps',s:'2×F'},
      {n:'Incline Curls',m:'Biceps Long Head, Short Head',s:'2×F',b:'55°',bc:'bench-55'},
      {n:'Lateral Raises',m:'Side Delts',s:'4×F'},
    ]},
  ]},
  {day:'fri',label:'Lower · Ham & Glute Focus',sections:[
    {tag:null,ex:[
      {n:'Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F'},
      {n:'B-Stance Hip Thrusts',m:'Glutes, Hamstrings',s:'2×F /leg',b:'Flat 0°',bc:'bench-flat'},
      {n:'Bulgarian Split Squats',m:'Quads, Glutes, Adductors',s:'2×F /leg',b:'Flat 0°',bc:'bench-flat'},
      /* Was a second RDL. A B-stance RDL is a unilateral version of the lift
         that already opened this day, so the slot spent four sets on a hinge
         the session had covered. Every other hamstring movement here is hip
         extension, and the short head of the biceps femoris never crosses
         the hip — it only flexes the knee, so no hinge reaches it. This does.
         The tradeoff is the resistance curve: at the top the shin is vertical
         and the dumbbell sits over the knee, so the moment arm nearly
         vanishes where a machine's cam would hold tension. Unscored in
         rank.js on purpose — published leg-curl standards are for a loaded
         stack (~0.9× bodyweight at Intermediate), nothing like what a pair
         of feet can clamp. */
      {n:'Prone Dumbbell Leg Curl',m:'Hamstrings, Gastrocnemius',s:'2×F',b:'Prone, DB Between Feet',bc:'bench-flat'},
    ]},
    {tag:'Accessories',ex:[
      {n:'Standing Calf Raises',m:'Gastrocnemius, Soleus',s:'2×F'},
      /* Was a farmer's carry -- the only exercise in this file that never had
         a reason written down. Unchanged since the first commit, carried
         through every audit by not being looked at.
         It claimed three muscles and delivered one. On a bilateral dumbbell
         carry the grip fails first, so the set ends before the traps see a
         hypertrophic stimulus. The load is symmetric, so there is no
         anti-lateral-flexion demand either -- and the side plank below
         already owns that one. What was left was an isometric grip hold, in
         a program where 28 of 40 movements already put a load in the hands.
         Redundancy is the standard that cut the second RDL and the bench
         dips; this was the same call, never made.
         It was also on the wrong day by this file's own argument. A loaded
         standing carry is an axial anti-flexion isometric for the erectors --
         the exact demand the core block below drops the rollout to avoid --
         and it sat upstream of the block it would have compromised.
         And it could not progress. A carry advances through distance and
         time; the log holds one number per exercise, and that number is
         weight. Taken to failure it reads 'the heaviest pair I own', forever.
         What none of those 28 movements do is move the wrist under load.
         Every one of them grips isometrically and incidentally -- grip is
         not the limiting factor on a goblet squat, the hand is just holding
         on. That gap is the only thing these are here for. Let the dumbbell
         roll down to the fingers on the way out and flex the fingers back
         before the wrist: that trains the finger flexors the carry was
         gripping with, through a range the carry never had.
         Both directions, because a wrist curl does nothing for the extensors
         and nothing else here loads them dynamically -- against Monday's
         preacher curls, Thursday's hammer and incline curls, and every hang.
         Neither reaches the brachioradialis, which does not cross the wrist;
         Thursday's hammer curls are what pay it. High reps on purpose: this
         musculature is endurance-biased and answers to metabolic stress. */
      {n:'Dumbbell Wrist Curls',m:'Wrist Flexors',s:'2×12-20',b:'Forearms On Bench, Roll To Fingers',bc:'bench-flat'},
      {n:'Dumbbell Reverse Wrist Curls',m:'Wrist Extensors',s:'2×12-20',b:'Forearms On Bench',bc:'bench-flat'},
    ]},
    {tag:'Core',ex:[
      /* Was a dumbbell crunch, and the crunch was the weakest thing in the
         week's core work: short range, short muscle length, and capped by
         the largest dumbbell that will sit on a chest. The decline start
         puts the trunk below horizontal, so the abs load out of a stretch
         rather than from neutral, and a plate adds weight in increments the
         dumbbell rack doesn't have.
         It stays off Tuesday and Saturday. The rollout beats it outright
         there, and past the first 30-40° of trunk travel a sit-up is hip
         flexion, not spinal flexion -- work the hanging leg raise below
         already pays the psoas for twice a week. Friday is the one block
         that can afford it: it sits behind four hip hinges, and unlike a
         rollout a sit-up asks the cooked erectors for no anti-extension
         isometric at all. Unscored in rank.js, same as the crunch it
         replaces -- no usable published standard exists for a loaded
         sit-up either. */
      {n:'Weighted Decline Sit-Up',m:'Upper Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×F',b:'Decline, DB On Chest',bc:'bench-decline'},
      {n:'Weighted Hanging Leg Raises',m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'DB Between Feet',bc:'grip',
       req:'bar', alt:{n:'Weighted Reverse Crunches',m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Weighted Side Plank w/ Reach-Through',m:'Obliques, TVA, Core',s:'2×F /side',b:'DB On Top Hip',bc:'grip'},
    ]},
  ]},
  /* Upper-body + core only, on purpose: Friday's RDLs and thrusts are ~24h
     old on Saturday morning, while the push muscles have had five days and
     the pull muscles two. Structure follows the r/bodyweightfitness
     Recommended Routine — skill work fresh at the front, strength work at
     3×5-8 (progress to a harder variation at the top of the range), body-line
     holds at the end. The skill block is the inversion ladder: the wall
     hold builds the shape and the frog stand builds the balance, and when
     both are clean they merge into freestanding work. Keep the holds
     honest rather than long. */
  {day:'sat',since:'2026-08-18',label:'Upper · Calisthenics',sections:[
    {tag:'Skill',ex:[
      {n:'Wrist Prep Rocks',m:'Forearms',s:'2× easy'},
      {n:'Wall Handstand Hold',m:'Front Delts, Side Delts, Traps, Triceps, Core',s:'3×15-30s',b:'Chest To Wall'},
      /* The first hand-balance a beginner can actually hold: squat, knees
         on bent elbows, lean until the feet float. It teaches the forward
         lean and finger-pressure balance every inversion runs on. Start at
         3-5s holds; at a clean 20-30s, move to crow (arms straighter) and
         start taking one foot off the wall in the handstand. */
      {n:'Frog Stand',m:'Front Delts, Triceps, Forearms, Core',s:'3×5-20s',b:'Knees On Elbows'},
      /* No-bar alts on this day stay bodyweight — a dumbbell row would keep
         the pull muscles fed but trains none of the straight-arm scapular
         control the skill work is for. Scapular push-ups need no kit at all:
         in a plank with arms locked, let the chest sink between the shoulder
         blades, then push the floor away until the upper back rounds —
         elbows never bend. Protraction instead of the pull's retraction,
         which is exactly the shape a handstand loads. */
      {n:'Scapular Pulls',m:'Lats, Mid Traps, Rhomboids, Forearms',s:'3×5-8',b:'Dead Hang',bc:'grip',
       req:'bar', alt:{n:'Scapular Push-Ups',m:'Serratus Anterior, Traps, Core',s:'3×8-12',b:'Plank, Arms Locked'}},
    ]},
    {tag:null,ex:[
      /* With no bar and no table there is no anchor, and with no anchor
         there is no true bodyweight pull — so the no-bar slot trains what a
         body maneuver still can: the full retraction sweep, prone on the
         bench so the arms can drop below the body line. Lats and biceps are
         not abandoned, just relocated — Thursday's rows and curls carry
         them, and the wheel rollout below is a straight-arm lat pull in
         disguise. */
      {n:'Chin-Ups',m:'Lats, Biceps, Rhomboids, Forearms',s:'3×5-8',b:'Supinated Grip',bc:'grip',
       req:'bar', alt:{n:'Reverse Snow Angels',m:'Rear Delts, Mid Traps, Rhomboids',s:'3×10-15',b:'Prone On Bench',bc:'bench-flat'}},
      {n:'Push-Ups',m:'Chest, Triceps, Front Delts, Serratus Anterior, Core',s:'3×5-8',b:'Full ROM, Elbows ~45°'},
      /* The strength line that ends at the handstand push-up: pike on the
         floor → feet up on the bench → chest-to-wall. Elevate the feet only
         once 3×8 on the floor is clean. */
      {n:'Pike Push-Ups',m:'Front Delts, Side Delts, Triceps, Upper Chest',s:'3×5-8',b:'Feet On Bench = Harder',bc:'bench-flat'},
      /* Bench dips are gone. This day already ran nine pressing sets
         against no loaded pull -- there is no bar here, so the pull slot
         spends itself on scapular control instead. Dips were the redundant
         end of that: the triceps take Monday's overhead extensions plus
         every pressing set above, and shoulder-extension dips at depth are
         the one shape this program asks the front of the shoulder to hold
         nowhere else. Cutting them takes the day to six pressing sets
         without touching the handstand line, which is what the day is for. */
    ]},
    /* The rollout takes the hollow hold's slot rather than adding to it —
       Tuesday and Friday already carry a full core block each, and a
       fourth core day is past the point of useful. This is the week's
       second rollout, not its only one; Tuesday opens its core block with
       the same movement. It is the same body line
       the hold trains, but moving and loaded, with the arms overhead: that
       shoulder position is what a handstand asks for, which is why this sits
       on the day that builds toward one. Progress by rolling further out,
       not by adding reps, and keep the pelvis tucked the whole way — a
       rollout that turns into lumbar extension is a low-back exercise, and
       Friday's RDLs left the erectors ~24h old. No wheel swaps it straight
       back to the hollow hold. */
    {tag:'Core',ex:[
      {n:'Ab Wheel Rollouts',m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior',s:'3×5-8',b:'From Knees',
       req:'wheel', alt:{n:'Hollow Body Hold',m:'Rectus Abdominis, TVA, Hip Flexors',s:'3×15-30s'}},
      {n:'Arch Hold',m:'Erectors, Glutes, Rear Delts, Traps',s:'3×15-30s'},
    ]},
  ]},
];

/* Muscle name → SVG region id(s) on the body map.

   Every name here resolves EXACTLY — parseMuscles() only falls back to
   substring matching when a name is missing, and nothing in the program
   needs that fallback. Adding a muscle string to PROGRAM that isn't a key
   below is what turns the fallback on, and the fallback is fuzzy enough to
   light the wrong thing, so add the key instead.

   Names that resolve to overlapping-but-different region sets are the
   point, not an accident: 'chest' covers both pec heads while 'upper chest'
   covers only the clavicular one, so an incline press and a flat press draw
   different pictures. Same for the ab rows and the delt heads. */
export const MMAP = {
  'chest':['f-pec-up-l','f-pec-up-r','f-pec-l','f-pec-r'],
  'upper chest':['f-pec-up-l','f-pec-up-r'],
  'front delts':['f-delt-a-l','f-delt-a-r'],
  'side delts':['f-delt-s-l','f-delt-s-r'],
  'rear delts':['b-rdelt-l','b-rdelt-r'],
  'triceps':['b-tri-long-l','b-tri-long-r','b-tri-lat-l','b-tri-lat-r'],
  'triceps long head':['b-tri-long-l','b-tri-long-r'],
  'lateral head':['b-tri-lat-l','b-tri-lat-r'],
  'biceps':['f-bi-l','f-bi-r'],
  'biceps long head':['f-bi-l','f-bi-r'],
  'biceps short head':['f-bi-l','f-bi-r'],
  'short head':['f-bi-l','f-bi-r'],
  'brachialis':['f-brach-l','f-brach-r'],
  'brachioradialis':['f-brad-l','f-brad-r'],
  /* the flexor mass is on the front, the extensor mass on the back —
     a loaded grip works both, so 'forearms' lights all four. The two wrist
     curls split them: each direction trains one mass, and should light that
     one rather than claim the whole forearm. */
  'forearms':['f-fore-l','f-fore-r','b-fore-l','b-fore-r'],
  'wrist flexors':['f-fore-l','f-fore-r'],
  'wrist extensors':['b-fore-l','b-fore-r'],
  'lats':['b-lat-l','b-lat-r'],
  'rhomboids':['b-rhom'],
  'traps':['f-trap-l','f-trap-r','b-trap-u-l','b-trap-u-r','b-trap-m'],
  'mid traps':['b-trap-m'],
  'erectors':['b-erec-l','b-erec-r'],
  'quads':['f-quad-rf-l','f-quad-rf-r','f-quad-vl-l','f-quad-vl-r','f-quad-vm-l','f-quad-vm-r'],
  'hamstrings':['b-ham-l','b-ham-r'],
  'glutes':['b-glute-l','b-glute-r'],
  'adductors':['f-addu-l','f-addu-r'],
  'gastrocnemius':['b-gastro-l','b-gastro-r'],
  'soleus':['b-soleus-l','b-soleus-r'],
  'rectus abdominis':['f-abs-1-l','f-abs-1-r','f-abs-2-l','f-abs-2-r','f-abs-3-l','f-abs-3-r'],
  /* The rows overlap on purpose. A crunch bites hardest up top and a leg
     raise down low, but neither is confined to its half — the middle row
     belongs to both. */
  'upper abs':['f-abs-1-l','f-abs-1-r','f-abs-2-l','f-abs-2-r'],
  'lower abs':['f-abs-2-l','f-abs-2-r','f-abs-3-l','f-abs-3-r'],
  'tva':['f-tva'],
  'obliques':['f-obli-l','f-obli-r'],
  'core':['f-abs-1-l','f-abs-1-r','f-abs-2-l','f-abs-2-r','f-abs-3-l','f-abs-3-r',
          'f-obli-l','f-obli-r','f-tva'],
  'serratus anterior':['f-serra-l','f-serra-r'],
  /* psoas and iliacus, NOT the quads — they run from the lumbar spine and
     the inner pelvis to the femur, and only rectus femoris crosses the hip */
  'hip flexors':['f-hipflex-l','f-hipflex-r'],
};
