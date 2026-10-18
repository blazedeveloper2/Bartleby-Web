/* ═══════════════════════════════════════════════════════════
   ARCHIVED 2026-10-18 — Edrin's Saturday day, cut from EDRIN in
   apps/workout/data.js. Not imported anywhere; see archive/README.md
   for how to put it back.
   ═══════════════════════════════════════════════════════════ */

export const SATURDAY = [
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
         there is no true bodyweight pull — so the no-bar slot is a dumbbell
         row. It was reverse snow angels, prone on the bench, until
         2026-10-14. Those trained the retraction sweep and left the lats
         at eight sets a week, every one of them on Thursday, under the
         ten-plus the volume research points to and against eleven for the
         chest. Rows here take the lats to eleven over two days. The rear
         delts and mid traps the angels were for still get Thursday's four
         sets of reverse flyes and every row. This is the one loaded
         movement on a bodyweight day, and it is here because a body
         maneuver cannot load the lats without an anchor. */
      {n:'Chin-Ups',m:'Lats, Biceps, Rhomboids, Forearms',s:'3×5-8',
       req:'bar', alt:{n:'Single-Arm Rows',m:'Lats, Rhomboids, Rear Delts, Biceps',s:'3×F /arm',b:'Flat 0°',bc:'bench-flat'}},
      {line:'pushup'},
      /* The strength line that ends at the handstand push-up: pike on the
         floor → feet up on the bench → against the wall. */
      {line:'hspu'},
      /* Bench dips are gone. This day already ran nine pressing sets
         against no loaded pull -- at the time, the no-bar pull slot spent
         itself on scapular control instead. Dips were the redundant
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
];
