/* ═══════════════════════════════════════════════════════════
   WORKOUT — program definition + muscle-map lookup table.
   ═══════════════════════════════════════════════════════════ */

import { USER } from './store.js?v=since-sep24';

/* An exercise with an `alt` names the kit it needs in `req` ('bar', 'wheel',
   'barbell'). Turn that piece of equipment off in Settings and the whole app
   — rendering, scoring, badge counts — reads the `alt` version instead, so
   the program still works for anyone without a pull-up bar or an ab wheel.
   An `alt` with no `req` never swaps; name the equipment.

   'barbell' runs the same mechanism from the other side. The program is
   written for dumbbells and a bench, so the flag defaults OFF (see OWNED in
   rank.js) and the dumbbell movement is the `alt` that shows by default; the
   barbell version is the main entry that appears once a bar is owned. It is
   only ever used where a bar changes what the slot can do — the hinge, the
   squat pattern and the hip thrust, the three places a pair of dumbbells
   runs out first. Everything else in the program is a dumbbell movement on
   purpose and stays one.

   A day carrying a `since` date was added to the program on that date.
   Streaks, the heatmap and perfect weeks in rank.js honour it, so the
   weekday reads as what it actually was before then — a rest day — instead
   of a wall of retroactive misses.

   What the exercise lab asks for is read off the exercise (trackOf() in
   rank.js), so it only ever offers a box that means something:
     weight   every scored lift in LIFTS, plus anything marked `ld:1` —
              loaded but unscored. Everything else is bodyweight and gets
              no weight field at all.
     unit     seconds when the prescription's target is timed ('3×15-30s'),
              nothing when it is 'easy', reps otherwise. `k` overrides it:
              's' to count seconds anyway (a kick-up set is scored by the
              hold it catches, not by the attempts), '-' for nothing (a
              stretch has no better or worse). */
const EDRIN = [
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
      /* A goblet squat is capped by what one dumbbell lets you hold at the
         chest; a bar in the front rack isn't. There is no rack here, so the
         bar is cleaned from the floor -- fine at the loads a dumbbell-to-
         barbell converter is rated for, and the reason this is a front squat
         and not a back squat, which would mean pressing it overhead and
         behind the neck. Heels stay elevated either way. */
      {n:'Heel-Elevated Front Squats',m:'Quads, Glutes, Core, Erectors',s:'2×F',
       req:'barbell', alt:{n:'Heel-Elevated Goblet Squats',m:'Quads, Glutes, Core',s:'2×F'}},
      /* The lift where a pair of dumbbells runs out first: the published
         per-hand tiers pass any adjustable set before Advanced. A bar takes
         whatever plates get bought later and moves in single-plate steps. */
      {n:'Barbell Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F',
       req:'barbell', alt:{n:'Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F'}},
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
      {line:'rollout',
       req:'wheel', alt:{n:'Dumbbell Crunch',ld:1,m:'Upper Abs, Rectus Abdominis, Obliques',s:'2×8-15',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Weighted Hanging Leg Raises',ld:1,m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',
       req:'bar', alt:{n:'Weighted Reverse Crunches',ld:1,m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Weighted Side Plank w/ Reach-Through',ld:1,m:'Obliques, TVA, Core',s:'2×F /side'},
    ]},
  ]},
  {day:'thu',label:'Upper · Pull Focus',sections:[
    {tag:null,ex:[
      {n:'Pull-Ups',m:'Lats, Biceps, Rhomboids, Forearms',s:'2×F',
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
      {n:'Barbell Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F',
       req:'barbell', alt:{n:'Romanian Deadlifts',m:'Hamstrings, Glutes, Erectors',s:'2×F'}},
      /* A bar is what makes a bilateral thrust loadable. A dumbbell on the
         hips tops out at whatever will balance there, which is why the slot
         went B-stance and why that version is unscored; a padded bar across
         the hips has no such ceiling and a published standard. */
      {n:'Barbell Hip Thrusts',m:'Glutes, Hamstrings',s:'2×F',b:'Flat 0°',bc:'bench-flat',
       req:'barbell', alt:{n:'B-Stance Hip Thrusts',ld:1,m:'Glutes, Hamstrings',s:'2×F /leg',b:'Flat 0°',bc:'bench-flat'}},
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
      {n:'Prone Dumbbell Leg Curl',ld:1,m:'Hamstrings, Gastrocnemius',s:'2×F',b:'Flat 0°',bc:'bench-flat'},
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
      {n:'Dumbbell Wrist Curls',m:'Wrist Flexors',s:'2×12-20',b:'Flat 0°',bc:'bench-flat'},
      {n:'Dumbbell Reverse Wrist Curls',m:'Wrist Extensors',s:'2×12-20',b:'Flat 0°',bc:'bench-flat'},
    ]},
    {tag:'Core',ex:[
      /* Was a weighted decline sit-up, for one afternoon. The bench does
         decline, but it has no roller to hook the legs under, and a sit-up
         from below horizontal with a plate on the chest is a slide down the
         pad without one -- the load pulls exactly the way the anchor was
         needed to resist. So the start it was picked for is not available
         on this bench. Before that it was a dumbbell crunch, dropped as the
         weakest thing in the week's core work -- short range, short muscle
         length, and capped by the largest dumbbell that will sit on a
         chest.
         A flat sit-up would not buy the stretch back: from horizontal, the
         first 30-40° of trunk travel is the spinal flexion and everything
         past it is hip flexion, which the hanging leg raise below already
         pays the psoas for twice a week. So the slot keeps the crunch's
         range and fixes its ceiling instead. Holding the dumbbell at arm's
         length past the head, not on the chest, roughly doubles the moment
         arm on the same weight -- the rack's biggest dumbbell is no longer
         the cap, and the lever progresses in inches before the weight has
         to. Lying along the bench rather than the floor lets the head start
         just past its end, which is as much pre-stretch as a flat bench can
         give.
         Friday is still the one block that can afford loaded flexion: it
         sits behind four hip hinges, and unlike a rollout a crunch asks the
         cooked erectors for no anti-extension isometric at all. Unscored in
         rank.js, same as every crunch here -- no usable published standard
         exists for one. */
      {n:'Dumbbell Crunch',ld:1,m:'Upper Abs, Rectus Abdominis, Obliques',s:'2×F',b:'Flat 0°',bc:'bench-flat'},
      {n:'Weighted Hanging Leg Raises',ld:1,m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',
       req:'bar', alt:{n:'Weighted Reverse Crunches',ld:1,m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'2×10-20',b:'Flat 0°',bc:'bench-flat'}},
      {n:'Weighted Side Plank w/ Reach-Through',ld:1,m:'Obliques, TVA, Core',s:'2×F /side'},
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
      {line:'handstand'},
      /* Opens on the first hand-balance a beginner can actually hold:
         squat, knees on bent elbows, lean until the feet float. It teaches
         the forward lean and finger-pressure balance every inversion runs
         on. The rest of the ladder and what passes each step are in
         LADDERS below. */
      {line:'planche'},
      /* No-bar alts on this day stay bodyweight — a dumbbell row would keep
         the pull muscles fed but trains none of the straight-arm scapular
         control the skill work is for. Scapular push-ups need no kit at all:
         in a plank with arms locked, let the chest sink between the shoulder
         blades, then push the floor away until the upper back rounds —
         elbows never bend. Protraction instead of the pull's retraction,
         which is exactly the shape a handstand loads. */
      {line:'lever',
       req:'bar', alt:{n:'Scapular Push-Ups',m:'Serratus Anterior, Traps, Core',s:'3×8-12'}},
    ]},
    {tag:null,ex:[
      /* With no bar and no table there is no anchor, and with no anchor
         there is no true bodyweight pull — so the no-bar slot trains what a
         body maneuver still can: the full retraction sweep, prone on the
         bench so the arms can drop below the body line. Lats and biceps are
         not abandoned, just relocated — Thursday's rows and curls carry
         them, and the wheel rollout below is a straight-arm lat pull in
         disguise. */
      {n:'Chin-Ups',m:'Lats, Biceps, Rhomboids, Forearms',s:'3×5-8',
       req:'bar', alt:{n:'Reverse Snow Angels',m:'Rear Delts, Mid Traps, Rhomboids',s:'3×10-15',b:'Flat 0°',bc:'bench-flat'}},
      {line:'pushup'},
      /* The strength line that ends at the handstand push-up: pike on the
         floor → feet up on the bench → against the wall. */
      {line:'hspu'},
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
      {line:'rollout', req:'wheel', alt:{line:'hollow'}},
      {line:'arch'},
    ]},
  ]},
  /* The two practice days, appended rather than slotted in — see WEEK_ORDER.
     Same ladders as Saturday at a lighter dose: Saturday is where a step is
     tested, these are where it is practised. Skill work is mostly the
     nervous system learning a position, so it takes frequency well as long
     as no set gets near failure — every hold ends with a few seconds still
     in it. Wednesday sits between the lower day and the pull day and gets
     in the way of neither. Sunday is the smaller of the two on purpose: it
     falls between Saturday's pressing and Monday's, so it is the first
     thing to drop if Monday's presses slip or the wrists ache the morning
     after. */
  {day:'wed',since:'2026-09-23',label:'Skill Practice',sections:[
    {tag:'Skill',ex:[
      {n:'Wrist Prep Rocks',m:'Forearms',s:'2× easy'},
      {line:'handstand',dose:'p'},
      {line:'planche',dose:'p'},
    ]},
    {tag:'Body Line',ex:[
      {line:'hollow',dose:'p'},
    ]},
  ]},
  {day:'sun',since:'2026-09-23',label:'Skill · Mobility',sections:[
    {tag:'Skill',ex:[
      {n:'Wrist Prep Rocks',m:'Forearms',s:'2× easy'},
      {line:'planche',dose:'l'},
      {line:'handstand',dose:'l'},
    ]},
    {tag:'Mobility',ex:[
      /* Hands on the bench, hips back, chest sinking toward the floor.
         Tight overhead shoulders are what bend a handstand into a banana,
         and this is the one thing on the day that is not the skill itself. */
      {n:'Bench Shoulder Stretch',k:'-',m:'Lats, Triceps Long Head, Chest',s:'2×30s',b:'Flat 0°',bc:'bench-flat'},
    ]},
  ]},
];

/* Andrew's program: a full gym, seven days — heavy upper and lower, then
   push, pull and legs for volume, with two active-rest days between.
   Written as his plan gives it, ranges included; the notes in brackets
   there are `nt`, shown under the muscles.

   Nothing here is scored in rank.js. The standards in LIFTS are for the
   dumbbell and barbell movements in Edrin's program, and the few names
   that overlap would score against a different implement or take their
   rep range from LIFTS instead of this plan. So every loaded movement is
   `ld:1` — a weight box, reps, and load advice off its own range — and
   no dumbbell ladder: a gym has the next weight up (GYM_STEP below).

   A section marked `opt` is on the card and can be ticked, but does not
   count toward finishing the day — the rest days are done at the Zone 2
   and the mobility. */
const ANDREW = [
  {day:'mon',label:'Upper · Heavy',sections:[
    {tag:null,ex:[
      {n:'Incline DB Press',ld:1,m:'Upper Chest, Front Delts, Triceps',s:'4×6-8'},
      {n:'Neutral/Medium-Grip Lat Pulldown',ld:1,m:'Lats, Biceps, Rhomboids, Rear Delts',s:'4×6-8',nt:'heavy'},
      {n:'Chest-Supported Row',ld:1,m:'Lats, Rhomboids, Traps, Rear Delts, Biceps',s:'3×6-8'},
      {n:'Machine Chest Press',ld:1,m:'Chest, Triceps, Front Delts',s:'2×8-10',nt:'or DB Shoulder Press 3×6–10'},
    ]},
    {tag:'Isolation',ex:[
      {n:'Cable Lateral Raise',ld:1,m:'Side Delts',s:'3×12-20',nt:'lean-away'},
      {n:'Cross-Body Cable Rear Delt Fly',ld:1,m:'Rear Delts, Mid Traps, Rhomboids',s:'2×15-20'},
      {n:'Cable Curl',ld:1,m:'Biceps, Brachialis',s:'3×8-10'},
      {n:'Overhead Cable Extension',ld:1,m:'Triceps Long Head, Lateral Head',s:'2×12-15'},
      {n:'Cable Wrist Curl',ld:1,m:'Wrist Flexors',s:'3×12-20',nt:'last'},
    ]},
  ]},
  {day:'tue',label:'Lower · Heavy',sections:[
    {tag:null,ex:[
      {n:'Leg Press Machine',ld:1,m:'Quads, Glutes, Adductors',s:'4×6-10'},
      {n:'Romanian Deadlift',ld:1,m:'Hamstrings, Glutes, Erectors',s:'4×6-10'},
      {n:'Leg Extension',ld:1,m:'Quads',s:'3×12-15'},
      {n:'Seated Leg Curl',ld:1,m:'Hamstrings, Gastrocnemius',s:'3×10-15'},
      {n:'Standing Calf Raise',ld:1,m:'Gastrocnemius, Soleus',s:'4×10-15'},
    ]},
    {tag:'Core & Grip',ex:[
      {n:'Cable Crunch',ld:1,m:'Upper Abs, Rectus Abdominis, Obliques',s:'3×12-15'},
      {n:'Dead Hangs',k:'s',m:'Forearms, Lats',s:'3×F',nt:'2–3 timed sets to near-failure · very last'},
    ]},
  ]},
  {day:'wed',label:'Rest+ · Zone 2',sections:[
    {tag:null,ex:[
      {n:'Zone 2 Cardio',k:'-',m:'Cardio',s:'1×30-45 min'},
      {n:'Mobility',k:'-',m:'Mobility',s:'1× easy'},
    ]},
    {tag:'Optional · ~15 min',opt:1,ex:[
      {n:'Reverse Curls',ld:1,m:'Brachioradialis, Brachialis, Wrist Extensors',s:'3×10-15'},
      {n:'Wrist Extensions',ld:1,m:'Wrist Extensors',s:'2×15-20'},
      {n:'Cross-Body Cable Rear Delt Fly',ld:1,m:'Rear Delts, Mid Traps, Rhomboids',s:'3×15-20'},
    ]},
  ]},
  {day:'thu',label:'Push · Hypertrophy',sections:[
    {tag:null,ex:[
      {n:'Incline Smith Press',ld:1,m:'Upper Chest, Front Delts, Triceps',s:'3×8-12'},
      {n:'Machine Chest Press',ld:1,m:'Chest, Triceps, Front Delts',s:'3×8-12'},
      {n:'Cable Fly',ld:1,m:'Chest, Front Delts',s:'3×12-15'},
    ]},
    {tag:'Isolation',ex:[
      {n:'Cable Lateral Raise',ld:1,m:'Side Delts',s:'4×15-20',nt:'lean-away'},
      {n:'Katana / Cross-Cable Extension',ld:1,m:'Triceps Long Head, Lateral Head',s:'3×10-15'},
      {n:'Triceps Pushdown',ld:1,m:'Lateral Head, Triceps Long Head',s:'2×12-15'},
    ]},
  ]},
  {day:'fri',label:'Pull · Hypertrophy',sections:[
    {tag:null,ex:[
      {n:'Wide-Grip Pulldown',ld:1,m:'Lats, Rear Delts, Rhomboids, Biceps',s:'3×8-12',nt:'elbows down and out, stretch in the armpit'},
      {n:'Chest-Supported Cable Row',ld:1,m:'Lats, Rhomboids, Traps, Rear Delts, Biceps',s:'3×10-12'},
      {n:'Single-Arm Lat Pulldown',ld:1,m:'Lats, Biceps, Rhomboids',s:'2×10-12 /arm'},
      {n:'Cable Lat Pullover',ld:1,m:'Lats, Serratus Anterior, Triceps Long Head',s:'3×10-15'},
    ]},
    {tag:'Isolation',ex:[
      {n:'Reverse Pec Deck',ld:1,m:'Rear Delts, Mid Traps, Rhomboids',s:'3×15-20'},
      {n:'Bayesian Curl',ld:1,m:'Biceps Long Head, Short Head',s:'3×10-15'},
      {n:'Rope Hammer Curl',ld:1,m:'Brachialis, Brachioradialis, Biceps',s:'3×10-12',nt:'slow eccentric'},
      {n:'Cable Wrist Curl',ld:1,m:'Wrist Flexors',s:'3×12-20',nt:'last'},
    ]},
  ]},
  {day:'sat',label:'Legs · Hypertrophy',sections:[
    {tag:'First',ex:[
      {n:'Cable Lateral Raise',ld:1,m:'Side Delts',s:'4×12-20',nt:'lean-away'},
    ]},
    {tag:null,ex:[
      {n:'Leg Press',ld:1,m:'Quads, Glutes, Adductors',s:'3×10-15'},
      {n:'Bulgarian Split Squat',ld:1,m:'Quads, Glutes, Adductors',s:'3×10-12 /leg',nt:'or Pendulum / Single-Leg Press'},
      {n:'Seated Leg Curl',ld:1,m:'Hamstrings, Gastrocnemius',s:'3×10-15'},
      {n:'Hip Thrust',ld:1,m:'Glutes, Hamstrings',s:'3×8-12'},
      {n:'Seated Calf Raise',ld:1,m:'Soleus, Gastrocnemius',s:'4×12-20'},
    ]},
    {tag:'Core & Grip',ex:[
      {n:'Hanging Leg Raise',m:'Lower Abs, Rectus Abdominis, Hip Flexors, Obliques',s:'3×10-15'},
      {n:'Cable Wrist Curl',ld:1,m:'Wrist Flexors',s:'3×12-20'},
      {n:'Reverse Curls',ld:1,m:'Brachioradialis, Brachialis, Wrist Extensors',s:'2×12-15',nt:'last'},
    ]},
  ]},
  {day:'sun',label:'Rest+ · Zone 2',sections:[
    {tag:null,ex:[
      {n:'Zone 2 Cardio',k:'-',m:'Cardio',s:'1×30-45 min'},
      {n:'Mobility',k:'-',m:'Mobility',s:'1× easy'},
    ]},
    {tag:'Optional',opt:1,ex:[
      {n:'Cable Lateral Raise',ld:1,m:'Side Delts',s:'3×15-20',nt:'lean-away'},
      {n:'Cross-Body Cable Rear Delt Fly',ld:1,m:'Rear Delts, Mid Traps, Rhomboids',s:'3×15-20',nt:'2–3 sets'},
      {n:'Calves / Abs',k:'-',m:'Gastrocnemius, Soleus, Rectus Abdominis',s:'1× your pick'},
    ]},
  ]},
];

/* Whose program runs is Settings → Program (USER in store.js). Switching
   reloads the page rather than re-rendering: PROGRAM is read once at
   import by everything downstream, down to the weekday table streaks are
   counted on. */
export const PEOPLE = [
  { id:'edrin',  n:'Edrin',  sub:'Dumbbells, bench & calisthenics — upper/lower plus skill days.' },
  { id:'andrew', n:'Andrew', sub:'Full gym, 7 days — heavy upper/lower, then push/pull/legs.' },
];
export { USER };
export const PROGRAM = USER === 'andrew' ? ANDREW : EDRIN;

/* A suggested weight snaps to Edrin's adjustable dumbbells (DB_LADDER in
   standards.js), which stop at 52.5. A gym has no such ceiling, and its
   dumbbells and stacks go up in fives. */
export const GYM_STEP = USER === 'andrew' ? 5 : null;

/* ── skill ladders ──

   An exercise naming a `line` is whichever step of that ladder you are on
   (Settings → Calisthenics Level), resolved by resEx() in rank.js like the
   equipment `alt` is. Each step carries:
     n, m    name and muscles, as any exercise
     tier    Beginner → Novice → Intermediate → Advanced → Elite
     s       Saturday's prescription, where the step is tested
     p, l    the practice and lighter doses (Wed, Sun); each falls back to
             the heavier one when a step does not name its own
     up      what you should be able to do before moving on — the top step
             has none

   `start` is the step a ladder opens on before any level is set: the one
   the program already prescribed, so adding a ladder never changes what
   anyone's Saturday says. Steps below it are there to step down to.

   A different step is a different exercise, with its own name and so its
   own weight and rep history. Checkmarks and the session log are keyed by
   the slot, not the name, so changing a level never touches either.

   Keep every prescription in the "sets×target" shape: the leading number
   is what the volume tally counts.

   SOURCES. The order and the level of each step follow Steven Low's
   Overcoming Gravity (2nd ed.) progression charts; the move-up rule for
   reps is the r/bodyweightfitness Recommended Routine's — start a step at
   3×5, add a rep a session, move on at 3×8 — and 30s is its bar for holds.
   Hold benchmarks with a named source are marked where they are used.
   The tiers are relative to each ladder, so the top of one reads Elite:
   OG2's own scale files some of these tops (the full front lever, the
   one-arm push-up) lower than its hardest skills. Where no source gives a
   number the one here is a judgement call, and says so. Chin-ups are not
   laddered on purpose: they progress by added load, which the Rank tab
   already scores up to the top tier, and OG2 rates a one-arm chin-up at
   about the same level as a +90% bodyweight pull-up anyway. */
export const LADDERS = {
  /* Chest to the wall throughout: it teaches the straight line a
     freestanding handstand needs, where back-to-wall teaches an arch.
     Toe pulls are Low's 15–20s bar; the 60s before pressing and one-arm
     work is GMB's. OG2 files the one-arm handstand as Advanced — nothing
     above it on its chart needs no rings. */
  handstand: { n:'Handstand', steps:[
    { n:'Wall Handstand Hold', tier:'Beginner', m:'Front Delts, Side Delts, Traps, Triceps, Core',
      s:'3×15-30s', p:'5×10-20s', l:'3×10-15s', up:'3×30s in a straight line, chest to the wall' },
    { n:'Wall Toe Pulls', tier:'Novice', m:'Front Delts, Side Delts, Traps, Triceps, Forearms, Core',
      s:'5×5-15s off the wall', p:'5×5-10s off the wall', l:'3×5-10s off the wall', up:'15-20s off the wall' },
    { n:'Freestanding Kick-Ups', k:'s', tier:'Novice', m:'Front Delts, Side Delts, Traps, Triceps, Forearms, Core',
      s:'6×3 attempts', p:'5×3 attempts', l:'3×3 attempts', up:'30s freestanding, most sessions' },
    { n:'Freestanding Handstand', tier:'Intermediate', m:'Front Delts, Side Delts, Traps, Triceps, Forearms, Core',
      s:'6×15-45s', p:'5×10-30s', l:'3×10-30s', up:'60s, comfortably' },
    { n:'Straddle Press to Handstand', tier:'Advanced', m:'Front Delts, Traps, Triceps, Hip Flexors, Core',
      s:'5×1-3', p:'4×1-2', l:'3×1-2', up:'3×3 slow presses' },
    { n:'One-Arm Handstand', tier:'Elite', m:'Front Delts, Side Delts, Traps, Triceps, Forearms, Obliques, Core',
      s:'6×5-15s /side', p:'4×5-10s /side', l:'3×5-10s /side' },
  ]},
  /* Frog stand is the bottom of OG2's planche column, not a side road to
     crow — crow is the same position with the knees higher. The planche
     column is headed for parallel bars OR the floor, so none of this needs
     kit; what limits it on the floor is the wrists, so the prep rocks stay
     in front of it whatever step this is. Holds are the RR's 3×30s to
     leave the frog stand, then 5×20s (GMB) for every lever position. */
  planche: { n:'Planche', steps:[
    { n:'Frog Stand', tier:'Beginner', m:'Front Delts, Triceps, Forearms, Core',
      s:'3×5-30s', p:'5×5-15s', l:'3×5-15s', up:'3×30s' },
    { n:'Straight-Arm Frog Stand', tier:'Novice', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core',
      s:'5×10-20s', p:'4×5-15s', l:'3×5-15s', up:'5×20s' },
    { n:'Tuck Planche', tier:'Intermediate', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core',
      s:'5×5-20s', p:'4×5-10s', l:'3×5-10s', up:'5×20s' },
    { n:'Advanced Tuck Planche', tier:'Intermediate', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core',
      s:'5×5-20s', p:'4×5-10s', l:'3×5-10s', up:'5×20s, back flat' },
    { n:'Straddle Planche', tier:'Advanced', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core, Glutes',
      s:'5×5-20s', p:'4×5-10s', l:'3×5-10s', up:'5×20s' },
    { n:'Half-Lay Planche', tier:'Advanced', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core, Glutes',
      s:'5×5-20s', p:'4×5-10s', l:'3×5-10s', up:'5×20s' },
    { n:'Full Planche', tier:'Elite', m:'Front Delts, Serratus Anterior, Triceps, Forearms, Core, Glutes',
      s:'5×3-15s', p:'4×3-8s', l:'3×3-8s' },
  ]},
  /* Bar only — without one the slot is scapular push-ups, which have no
     published ladder and stay as they are. Scap pulls then arch hangs are
     the bottom of the RR's pull-up line; OG2 puts the tuck front lever
     level with L-sit pull-ups, hence the chin-up gate on the arch hang.
     OG2 runs straddle before half-lay, and so does this. */
  lever: { n:'Front Lever', steps:[
    { n:'Scapular Pulls', tier:'Beginner', m:'Lats, Mid Traps, Rhomboids, Forearms', s:'3×5-8', up:'3×8' },
    { n:'Arch Hangs', tier:'Beginner', m:'Lats, Mid Traps, Rhomboids, Rear Delts, Forearms', s:'3×5-8',
      up:'3×8, with chin-ups at 3×8' },
    { n:'Tuck Front Lever', tier:'Novice', m:'Lats, Rear Delts, Mid Traps, Rhomboids, Core, Forearms',
      s:'5×10-20s', up:'5×20s' },
    { n:'Advanced Tuck Front Lever', tier:'Intermediate', m:'Lats, Rear Delts, Mid Traps, Rhomboids, Core, Forearms',
      s:'5×10-20s', up:'5×20s, back flat' },
    { n:'Straddle Front Lever', tier:'Advanced', m:'Lats, Rear Delts, Mid Traps, Rhomboids, Core, Forearms',
      s:'5×5-20s', up:'5×20s' },
    { n:'Half-Lay Front Lever', tier:'Advanced', m:'Lats, Rear Delts, Mid Traps, Rhomboids, Core, Forearms',
      s:'5×5-20s', up:'5×20s' },
    { n:'Full Front Lever', tier:'Elite', m:'Lats, Rear Delts, Mid Traps, Rhomboids, Core, Forearms', s:'5×3-15s' },
  ]},
  /* The RR's line to diamond and the decline, then OG2's one-arm route.
     Pseudo-planche push-ups are the other branch out of the archer; they
     are left out because the planche ladder above already trains that
     lean. */
  pushup: { n:'Push-Up', steps:[
    { n:'Push-Ups', tier:'Beginner', m:'Chest, Triceps, Front Delts, Serratus Anterior, Core', s:'3×5-8', up:'3×8' },
    { n:'Diamond Push-Ups', tier:'Novice', m:'Triceps, Chest, Front Delts, Serratus Anterior, Core', s:'3×5-8', up:'3×8' },
    { n:'Decline Push-Ups', tier:'Novice', m:'Upper Chest, Front Delts, Triceps, Serratus Anterior, Core', s:'3×5-8',
      b:'Flat 0°', bc:'bench-flat', up:'3×8' },
    { n:'Archer Push-Ups', tier:'Intermediate', m:'Chest, Triceps, Front Delts, Core', s:'3×5-8 /side', up:'3×8 /side' },
    { n:'Incline One-Arm Push-Ups', tier:'Advanced', m:'Chest, Triceps, Front Delts, Obliques, Core', s:'3×3-5 /side',
      b:'Flat 0°', bc:'bench-flat', up:'3×5 /side' },
    { n:'One-Arm Push-Ups', tier:'Advanced', m:'Chest, Triceps, Front Delts, Obliques, Core', s:'3×3-5 /side',
      up:'3×5 /side, wide stance' },
    { n:'One-Arm Push-Ups, Feet Together', tier:'Elite', m:'Chest, Triceps, Front Delts, Obliques, Core', s:'3×3-5 /side' },
  ]},
  /* OG2's handstand push-up column. A wall push-up to the head is the
     headstand push-up (OG2 L4); full range means the hands are raised —
     books or yoga blocks, not the adjustable dumbbells, which roll. The
     freestanding version wants a 30s freestanding handstand first. */
  hspu: { n:'Handstand Push-Up', steps:[
    { n:'Pike Push-Ups', tier:'Beginner', m:'Front Delts, Side Delts, Triceps, Upper Chest', s:'3×5-8', up:'3×8' },
    { n:'Elevated Pike Push-Ups', tier:'Novice', m:'Front Delts, Side Delts, Triceps, Upper Chest', s:'3×5-8',
      b:'Flat 0°', bc:'bench-flat', up:'3×8' },
    { n:'Wall Handstand Push-Up Negatives', tier:'Novice', m:'Front Delts, Side Delts, Triceps, Traps', s:'3×3-5',
      up:'3×5, 3-5s down to the head' },
    { n:'Wall Handstand Push-Ups', tier:'Intermediate', m:'Front Delts, Side Delts, Triceps, Traps', s:'3×5-8',
      up:'3×8, head to the floor' },
    { n:'Deficit Wall Handstand Push-Ups', tier:'Advanced', m:'Front Delts, Side Delts, Triceps, Traps', s:'3×5-8',
      up:'3×8, and a 30s freestanding handstand' },
    { n:'Freestanding Handstand Push-Ups', tier:'Elite', m:'Front Delts, Side Delts, Triceps, Traps, Core', s:'4×1-5' },
  ]},
  /* OG2's ab wheel column, from the kneeling rollout this program already
     runs. The partial kneeling step below it is a judgement call — OG2
     has planks there — and so is the load at the top: nothing here holds
     a dumbbell through a rollout, but a loaded backpack does. */
  rollout: { n:'Ab Wheel', start:1, steps:[
    { n:'Kneeling Rollouts to a Wall', tier:'Beginner', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior', s:'3×5-8', up:'3×8' },
    { n:'Ab Wheel Rollouts', tier:'Novice', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior', s:'3×5-8',
      up:'3×8 to full extension, pelvis tucked' },
    { n:'Standing Rollouts to a Wall', tier:'Intermediate', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior', s:'3×5-8', up:'3×8' },
    { n:'Standing Rollout Negatives', tier:'Advanced', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior', s:'3×3-5',
      up:'3×5 slow, pelvis tucked' },
    { n:'Standing Ab Wheel Rollouts', tier:'Advanced', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior, Hip Flexors', s:'3×5-8', up:'3×8' },
    { n:'Weighted Standing Rollouts', ld:1, tier:'Elite', m:'Rectus Abdominis, Obliques, TVA, Lats, Serratus Anterior, Hip Flexors', s:'3×3-5' },
  ]},
  /* A position drill, not a strength ladder, so it stops at rocks and at
     Intermediate — past that the ab wheel is where core strength goes.
     The overhead hold's minute is Antranik's "one solid minute". */
  hollow: { n:'Hollow Body', start:2, steps:[
    { n:'Tuck Hollow Hold', tier:'Beginner', m:'Rectus Abdominis, TVA, Hip Flexors', s:'3×15-30s', p:'2×15-20s', up:'3×30s, lower back flat' },
    { n:'One-Leg Hollow Hold', tier:'Beginner', m:'Rectus Abdominis, TVA, Hip Flexors', s:'3×15-30s', p:'2×15-20s', up:'3×30s, lower back flat' },
    { n:'Hollow Body Hold', tier:'Novice', m:'Rectus Abdominis, TVA, Hip Flexors', s:'3×15-30s', p:'2×15-20s', up:'3×30s, lower back flat' },
    { n:'Overhead Hollow Hold', tier:'Intermediate', m:'Rectus Abdominis, TVA, Hip Flexors, Lats', s:'3×20-60s', p:'2×15-30s', up:'60s, lower back flat' },
    { n:'Hollow Body Rocks', tier:'Intermediate', m:'Rectus Abdominis, TVA, Hip Flexors', s:'3×15-20', p:'2×10-15' },
  ]},
  /* Short on purpose: nothing published takes the arch hold much further
     without a bar. The rocks' numbers and the loaded top step are a
     judgement call; the bench reverse hyper is the RR's own back exercise. */
  arch: { n:'Arch Body', steps:[
    { n:'Arch Hold', tier:'Beginner', m:'Erectors, Glutes, Rear Delts, Traps', s:'3×15-30s', up:'3×30s' },
    { n:'Overhead Arch Hold', tier:'Novice', m:'Erectors, Glutes, Rear Delts, Traps', s:'3×20-60s', up:'60s' },
    { n:'Arch Body Rocks', tier:'Intermediate', m:'Erectors, Glutes, Rear Delts, Traps', s:'3×10-20', up:'3×20' },
    { n:'Reverse Hyperextensions', tier:'Intermediate', m:'Glutes, Hamstrings, Erectors', s:'3×8-12',
      b:'Flat 0°', bc:'bench-flat', up:'3×12' },
    { n:'Weighted Reverse Hyperextensions', ld:1, tier:'Advanced', m:'Glutes, Hamstrings, Erectors', s:'3×8-12',
      b:'Flat 0°', bc:'bench-flat' },
  ]},
};

/* Display order, Monday first. A day's position in PROGRAM is its stored
   id — bp_log's `di` and every checkmark key are that index — so a new day
   is appended to the array, never inserted, and put in its place here.
   Inserting Wednesday between Tuesday and Thursday would quietly turn every
   Thursday already logged into a Wednesday. */
const MON_FIRST = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 };
export const WEEK_ORDER = PROGRAM.map((_, i) => i)
  .sort((a, b) => MON_FIRST[PROGRAM[a].day] - MON_FIRST[PROGRAM[b].day]);

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
  /* Andrew's rest days. Real entries that light nothing, so they skip the
     fuzzy fallback instead of matching something by accident. */
  'cardio':[],
  'mobility':[],
};
