/* ═══════════════════════════════════════════════════════════
   WORKOUT — how to do each exercise, shown in the exercise lab.

   do      the cues, in order: set up, move, the point that matters most
   avoid   the common mistakes
   v       a tutorial video: YouTube id, title and channel as YouTube
           reports them, length in seconds (d), a start time (s) when the
           part that teaches this exercise is not at the beginning, and
           the review note (r) saying what its frames showed
   src     what the cues were written from

   How all of this was made, and how to add or change an exercise, is in
   tools/howto/README.md — run tools/howto/check.mjs after any edit.

   The cues were written for this program's exact variants — the bench
   angles, the no-rack front squat, chest-to-wall handstands, planche on
   the floor — from the coaching sources in `src`, reworded rather than
   quoted. Every video was then checked by a second pass that never saw
   why it was picked: embeddable, and sixteen frames sampled across the
   whole video looked at for the exercise actually being demonstrated,
   in this variant, with sound form, from a credible channel. Talking
   heads, montages and the wrong variant were replaced or dropped; an
   exercise with no video that passed has none, and its cues stand alone.
   ═══════════════════════════════════════════════════════════ */
export const HOWTO = {
  "Incline Dumbbell Press": {
    do: [
      "Set the bench to 30°, sit back and kick the dumbbells up to your shoulders as you lie down",
      "Plant your feet and squeeze your shoulder blades back and down into the bench",
      "Lower to the sides of your upper chest, elbows angled about 45° out from your body",
      "Get a full stretch at the bottom, then press up and slightly in until over your shoulders",
    ],
    avoid: [
      "Flaring your elbows straight out to the sides, which loads the shoulder joint",
      "Letting your shoulders roll forward off the bench as you press",
    ],
    v: { id:"0f6-uCUKqgA", t:"Incline Dumbbell Press BETTER | Targeting The Muscle Series", c:"Renaissance Periodization", d:451,
         r:"RP (Dr. Mike): low-incline bench set up on camera, kick-up and pressing shown in over half the frames; the elbow-angle section shows a moderate, not flared, elbow position." },
    src: ["https://exrx.net/WeightExercises/PectoralClavicular/DBInclineBenchPress", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips"],
  },
  "Dumbbell Bench Press": {
    do: [
      "Sit on the end of a flat bench, dumbbells on your thighs, and kick them up as you lie back",
      "Feet flat, shoulder blades pulled back and down, a small natural arch in your lower back",
      "Lower to the sides of your mid-chest, elbows about 45° from your body, forearms upright",
      "Go deep enough to stretch your chest, then press up in a slight arc to over your chest",
    ],
    avoid: [
      "Elbows flared out to 90°, which shifts work to the front of the shoulders",
      "Stopping the dumbbells high above your chest instead of using the full range",
    ],
    v: { id:"5Y3VZsLb1Ys", t:"How To Do Dumbbell Bench Press Correctly", c:"Jack Hanrahan Fitness", d:602, s:30,
         r:"Jeremy Ethier's pick is mostly talking head and graphics, with the press shown in about a third of the frames. Replaced with Jack Hanrahan's flat-bench tutorial: kick-up from the thighs, labelled setup steps, real-time demo and a flared-elbow mistake, demonstrated in most frames." },
    src: ["https://exrx.net/WeightExercises/PectoralSternal/DBBenchPress", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/"],
  },
  "Dumbbell Shoulder Press": {
    do: [
      "Set the bench back nearly upright (about 85°) and sit with your lower back against the pad",
      "Start with the dumbbells at shoulder height, palms forward, wrists stacked over elbows",
      "Press up and slightly in until your arms are straight overhead, then lower with control",
      "Keep elbows a little in front of your body and bring the weights back to shoulder level",
    ],
    avoid: [
      "Sliding your hips forward and leaning back, which turns it into an incline press",
      "Cutting reps short at the bottom instead of lowering to shoulder height",
    ],
    v: { id:"GFblCmuEE18", t:"HOW TO: Dumbbell Shoulder Press (BIGGER SHOULDERS & BIGGER BENCH PRESS!) || PERFECT FORM", c:"ScottHermanFitness", d:178,
         r:"Scott Herman: near-upright bench with the lower back on the pad (on-screen rule #1), pressing from shoulder height, demonstrated in most frames of a 3-minute video." },
    src: ["https://exrx.net/WeightExercises/DeltoidAnterior/DBShoulderPress", "https://muscularstrength.com/article/how-to-dumbbell-shoulder-press-bigger-shoulders-and-bench"],
  },
  "Dumbbell Flyes": {
    do: [
      "Lie on a flat bench with the dumbbells over your chest, palms facing each other",
      "Put a slight bend in your elbows and hold that exact bend for the whole set",
      "Lower slowly in a wide arc, like hugging a big barrel, until your chest is fully stretched",
      "Control the bottom and feel the stretch, then squeeze back up, stopping before they touch",
    ],
    avoid: [
      "Bending your elbows more as you go down, which turns the fly into a press",
      "Dropping fast into the bottom or forcing a stretch that hurts the front of the shoulder",
    ],
    v: { id:"_LwuS1PdbdM", t:"Feel The Dumbbell Fly MORE | Targeting The Muscle", c:"Renaissance Periodization", d:369,
         r:"RP (Dr. Mike): flat-bench dumbbell fly with a fixed elbow bend and deep controlled stretch, shown in most frames including a slow-eccentric section." },
    src: ["https://exrx.net/WeightExercises/PectoralSternal/DBFly", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips"],
  },
  "Overhead Tricep Extensions": {
    do: [
      "Sit tall with the bench back at 85°, your back against the pad and your core braced",
      "Hold one dumbbell overhead, both palms flat under the top plate, thumbs around the handle",
      "Bend only at the elbows, lowering the weight behind your head as far as is comfortable",
      "Keep elbows pointing up and fairly narrow; the deep stretch at the bottom is what counts",
    ],
    avoid: [
      "Letting your elbows flare wide, which cuts the stretch and strains the elbows",
      "Arching your lower back off the pad to push the weight up",
    ],
    v: { id:"fYqswDVbJDg", t:"HOW TO: Overhead Triceps Extension (BEST EXERCISE FOR HUGE TRICEPS) || PERFECT FORM (POWERBOMB)", c:"ScottHermanFitness", d:201,
         r:"Scott Herman: seated on an upright bench, back on the pad, one dumbbell overhead in both hands, deep stretch behind the head from side and rear; demo in over half the frames." },
    src: ["https://exrx.net/WeightExercises/Triceps/DBTriExt", "https://muscularstrength.com/article/how-to-overhead-extension-powerbomb", "https://www.strongerbyscience.com/research-spotlight-triceps/"],
  },
  "Preacher Curls": {
    do: [
      "Set the bench back to 45°, stand behind it and drape one arm over the top of the pad",
      "Tuck your armpit snug against the top edge so the back of your upper arm lies flat on it",
      "Curl until your forearm is about vertical, keeping your upper arm pressed into the pad",
      "Lower slowly to an almost straight arm; control the bottom, where the pull is hardest",
    ],
    avoid: [
      "Letting the dumbbell drop quickly at the bottom, which stresses the elbow",
      "Lifting your elbow or shoulder off the pad to swing the weight up",
    ],
    v: { id:"02TvQZiVdic", t:"Incline Bench Preacher Curl", c:"Men's Health", d:54,
         r:"Men's Health (BJ Gaddour): 54 seconds of continuous demo of the exact setup, standing behind an inclined bench with one arm draped over the pad." },
    src: ["https://exrx.net/WeightExercises/Brachialis/DBPreacherCurl"],
  },
  "Lateral Raises": {
    do: [
      "Stand tall, dumbbells at your sides, a slight forward lean and a soft bend in the elbows",
      "Raise your arms out to the sides until your elbows reach about shoulder height",
      "Lead with your elbows, keeping them level with or a little above your wrists",
      "Lift and lower smoothly; if you have to swing or shrug, the weight is too heavy",
    ],
    avoid: [
      "Swinging the weights up with your hips or back instead of your shoulders",
      "Turning your palms up as you lift, which shifts the work to the front of the shoulder",
    ],
    v: { id:"3VcKaXpzqRo", t:"How To: Dumbbell Side Lateral Raise", c:"ScottHermanFitness", d:115,
         r:"RP's pick is mostly Dr. Mike standing and talking with dumbbells at his sides; mid-rep frames are about a quarter of the video. Replaced with Scott Herman's demo: raise to shoulder height with soft elbows, shown from front, side and back." },
    src: ["https://exrx.net/WeightExercises/DeltoidLateral/DBLateralRaise", "https://exrx.net/Kinesiology/Errors", "https://rpstrength.com/blogs/articles/side-delt-hypertrophy-training-tips"],
  },
  "Dead Bugs": {
    do: [
      "Lie on your back, arms pointing at the ceiling, hips and knees bent to 90 degrees",
      "Breathe out and gently press your lower back into the floor to brace your belly",
      "Slowly reach one arm overhead while lowering the opposite leg toward the floor",
      "Only go as low as your back stays flat, then return and switch sides",
    ],
    avoid: [
      "Letting your lower back arch off the floor as the leg goes down",
      "Rushing or holding your breath; move slowly and keep breathing",
    ],
    v: { id:"0XVbn86Btj0", t:"You're Doing Dead Bugs WRONG! Fix This for Stronger Abs & a Bulletproof Core", c:"Squat University", d:518,
         r:"Squat University; demonstrates the dead bug on the floor with hands-on cueing and the hand-under-back check throughout." },
    src: ["https://www.acefitness.org/resources/everyone/exercise-library/147/supine-dead-bug/"],
  },
  "Bulgarian Split Squats": {
    do: [
      "Face away from the bench, a long stride out, and rest the laces of your back foot on it",
      "Hold the dumbbells at your sides and keep most of your weight on the front foot",
      "Drop straight down until your back knee nearly touches the floor, then drive up",
      "Push through your whole front foot; the back leg is only there for balance",
    ],
    avoid: [
      "Front foot too close to the bench, so your front heel lifts at the bottom",
      "Front knee caving inward as you stand up",
    ],
    v: { id:"-4LVK1crLSw", t:"The ULTIMATE Bulgarian Split Squat Tutorial", c:"Squat University", d:498,
         r:"Squat University; rear foot on a bench, shown from several angles, 5 numbered tips." },
    src: ["https://exrx.net/WeightExercises/Quadriceps/DBSingleLegSplitSquat", "https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat"],
  },
  "Heel-Elevated Front Squats": {
    do: [
      "Clean the bar up from the floor: flat back, bar close, then whip your elbows under it",
      "Step your heels onto the plates or wedge, bar resting on your shoulders, fingertips under",
      "Sit straight down between your heels, letting your knees travel forward over your toes",
      "Keep your elbows high the whole way; if they drop, your back rounds and the bar slides",
    ],
    avoid: [
      "Heaving a clean with a rounded back; if the clean is a struggle, use less weight",
      "Dropping the bar after the set; lower it to your thighs first, then to the floor",
    ],
    v: { id:"G-Vamqoy8qM", t:"How To Front Squat With Perfect Form (Stop Making These Mistakes)", c:"Squat University", d:526,
         r:"Squat University; coached front rack, elbows and depth with a barbell. Takes the bar from a rack; the written cues cover the clean from the floor." },
    src: ["https://squatuniversity.com/2016/04/07/how-to-perfect-the-front-squat/", "https://exrx.net/WeightExercises/Quadriceps/BBFrontSquat", "https://exrx.net/WeightExercises/OlympicLifts/PowerClean", "https://www.strongerbyscience.com/how-to-squat/", "https://www.seannal.com/articles/training/no-squat-rack.php"],
  },
  "Heel-Elevated Goblet Squats": {
    do: [
      "Heels on plates or a wedge, feet about shoulder-width apart, toes turned out a little",
      "Cup the top end of one dumbbell in both hands, held tight against your chest",
      "Sit straight down between your heels, letting your knees travel forward past your toes",
      "Keep your chest tall and the dumbbell touching it; go as deep as you can control",
    ],
    avoid: [
      "Letting the dumbbell drift away from your chest, which tips you forward",
      "Knees caving inward; keep them pointing the same way as your toes",
    ],
    v: { id:"MeIiIdhvXT4", t:"How To: Goblet Squat", c:"ScottHermanFitness", d:191,
         r:"Scott Herman; dumbbell held at the chest, deep squat from two angles. Flat-footed; heel elevation is in the written cues." },
    src: ["https://www.strengthlog.com/goblet-squat/", "https://www.strongerbyscience.com/how-to-squat/"],
  },
  "Barbell Romanian Deadlifts": {
    do: [
      "Deadlift the bar up to standing, hands just outside your thighs, knees slightly bent",
      "Push your hips straight back and slide the bar down your thighs, keeping it close",
      "Stand back up by driving your hips forward and squeezing your glutes",
      "Keep your back flat; stop when your hamstrings are fully stretched or your back rounds",
    ],
    avoid: [
      "Bending your knees more and more until it turns into a squat",
      "Letting the bar drift away from your legs, which loads your lower back",
    ],
    v: { id:"_oyxCn2iSjU", t:"HOW TO DO ROMANIAN DEADLIFTS (RDLs): Build Beefy Hamstrings With Perfect Technique", c:"Jeff Nippard", d:381,
         r:"Jeff Nippard; clear barbell RDL demos from side and front plus a named-errors section." },
    src: ["https://exrx.net/WeightExercises/OlympicLifts/RomanianDeadlift", "https://www.trainuntamed.com/how-to-romanian-deadlift-prevent-back-pain/"],
  },
  "Romanian Deadlifts": {
    do: [
      "Stand tall, a dumbbell in each hand in front of your thighs, knees slightly bent",
      "Push your hips back and slide the dumbbells down the front of your legs",
      "Drive your hips forward to stand up, squeezing your glutes at the top",
      "Keep your back flat; go only as low as your hamstrings allow, usually about mid-shin",
    ],
    avoid: [
      "Rounding your back to reach the dumbbells lower",
      "Squatting the weight down instead of pushing your hips back",
    ],
    v: { id:"FQKfr1YDhEk", t:"How To: Dumbbell Romanian Deadlift", c:"ScottHermanFitness", d:118,
         r:"Scott Herman; short, but shows a clean dumbbell hinge with a flat back from the side." },
    src: ["https://exrx.net/WeightExercises/Hamstrings/DBStrBackStrLegDeadlift", "https://www.trainuntamed.com/how-to-romanian-deadlift-prevent-back-pain/"],
  },
  "Standing Calf Raises": {
    do: [
      "Balls of your feet on a step, heels hanging off, dumbbells at your sides, knees straight",
      "Rise as high as you can onto your big toes and hold the top for a moment",
      "Lower slowly, over 2 to 3 seconds, until your heels sink below the step",
      "Pause for a second in the bottom stretch instead of bouncing out of it",
    ],
    avoid: [
      "Quick, bouncy half reps that let your Achilles tendon do the work",
      "Bending your knees to help push yourself up",
    ],
    v: { id:"-qsRtp_PbVM", t:"How To FORCE YOUR CALVES To Grow With Smarter Training Methods", c:"Jeff Nippard", d:465,
         r:"RP's pick is ~9 minutes of talking head with two frames of calf raises. Replaced with Jeff Nippard's, which demonstrates throughout and puts the 1-2s pause at the bottom on screen." },
    src: ["https://exrx.net/WeightExercises/Gastrocnemius/DBStandingCalfRaise", "https://www.nasm.org/resource-center/blog/training/calf-training-how-to-program-this-stubborn-muscle-group-for-clients"],
  },
  "Kneeling Rollouts to a Wall": {
    do: [
      "Kneel on a pad facing a wall; the farther away you kneel, the harder it gets",
      "Start with arms straight and the wheel under your shoulders",
      "Roll out until the wheel taps the wall, then pull it back with straight arms",
      "Tuck your tailbone and squeeze your glutes so your lower back never sags",
    ],
    avoid: [
      "Letting the lower back sag into an arch as the wheel goes out",
      "Pushing the hips back first on the way in instead of pulling with straight arms",
    ],
    v: { id:"uYBOBBv9GzY", t:"AB WHEEL MISTAKES | 7 Most Common Ways..", c:"FitnessFAQs", d:428, s:178,
         r:"The FitnessFAQs ab-wheel mistakes video (2.57M views) shows good kneeling technique throughout. Its ROM section, from 3:00, shows the wheel rolled into the wall (garage door) and the distance measured, which is this step. The start time points there." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://tonygentilcore.com/2026/05/two-ab-wheel-rollout-variations-1-entry-level-1-john-wick-level/"],
  },
  "Ab Wheel Rollouts": {
    do: [
      "Kneel on a pad with the wheel under your shoulders and arms straight",
      "Tuck your tailbone and squeeze your glutes before the wheel moves",
      "With no wall to stop you, roll out until your arms are overhead and body nearly flat",
      "Keep the tuck all the way out and back; stop the set once your back starts to sag",
    ],
    avoid: [
      "Lower back dipping into an arch at full stretch",
      "Bending the elbows or sitting the hips back to cheat the return",
    ],
    v: { id:"uYBOBBv9GzY", t:"AB WHEEL MISTAKES | 7 Most Common Ways..", c:"FitnessFAQs", d:428,
         r:"FitnessFAQs, 7:08, 2.57M views. The whole video demonstrates kneeling rollouts to full extension. It contrasts a sagging lower back with a tucked one (FLEX/EXT side by side) and covers hips sitting back and bent elbows, matching the cues and avoid list." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://tonygentilcore.com/2026/05/two-ab-wheel-rollout-variations-1-entry-level-1-john-wick-level/", "https://www.youtube.com/watch?v=ED8ZgWcn_2Y"],
  },
  "Standing Rollouts to a Wall": {
    do: [
      "Stand facing a wall, feet hip-width, legs nearly straight, wheel on the floor",
      "Tuck your tailbone and squeeze your glutes so your back is slightly rounded",
      "Roll out until the wheel hits the wall, then pull back up to standing",
      "Start close to the wall and back away only while your lower back stays tucked",
    ],
    avoid: [
      "Standing so far from the wall that your back sags before the wheel gets there",
      "Pushing the hips back first on the way in instead of pulling with straight arms",
    ],
    v: { id:"Gz8QZrO65bg", t:"Standing Rollout to Wall", c:"Testosterone Nation", d:44,
         r:"The original, Top Form Fitness Part 3 (3.3k views, low quality), is half talking head and shows band-assisted and eccentric reps with no wall. The replacement, a Testosterone Nation clip, is all demonstration of the exact variant. He stands a few feet from a wall with legs nearly straight, rolls until the wheel touches the wall and pulls back to standing. The description says to start close and move back 6-12 inches. It's short at 44 s, but it's the only credible video of this variant found." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://www.youtube.com/watch?v=THs0jEgH-GU"],
  },
  "Standing Rollout Negatives": {
    do: [
      "Stand with feet hip-width, legs nearly straight, and the wheel on the floor",
      "Tuck your tailbone, squeeze your glutes and pull your ribs down before rolling",
      "Roll out as slowly as you can, fighting to hold that shape all the way down",
      "Drop to your knees at the bottom and roll back from there; only the way out is standing",
    ],
    avoid: [
      "Collapsing fast at the end instead of controlling the whole way down",
      "Letting the lower back sag to reach farther",
    ],
    v: { id:"EsmZANxYEQM", t:"Negative Standing Ab Wheel Rollout", c:"Bret Contreras Glute Guy", d:25,
         r:"Borderline: a 25 s, low-resolution 2010 clip, but it's Bret Contreras and exactly the variant. He lowers from standing over about 5 s with a straight body line and no lumbar sag, lands at the bottom, then comes back up from his knees. His description says the same as the cue. Nothing more instructional was found." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://www.youtube.com/watch?v=EsmZANxYEQM", "https://www.youtube.com/watch?v=aRVs0llbq2M"],
  },
  "Standing Ab Wheel Rollouts": {
    do: [
      "Stand with feet hip-width, legs nearly straight, and the wheel on the floor",
      "Tuck your tailbone and squeeze your glutes before you start rolling",
      "Roll out until arms are overhead and body nearly flat, then pull all the way back up",
      "Keep the tuck and straight arms both ways; this is the full range with no wall",
    ],
    avoid: [
      "Lower back sagging at the bottom, which loads the spine instead of the abs",
      "Leading the return by pushing the hips back first",
    ],
    v: { id:"SFTn_VON9qw", t:"The Standing Rollout Checklist", c:"Testosterone Nation", d:57,
         r:"The Al Kavadlo original is almost all talking head: 13 of 16 frames, with only about two brief demo shots. Testosterone Nation's 57 s checklist (75k views) is all demonstration of full standing rollouts to a flat body with arms overhead. On-screen form cues include pushing down and pulling back on the wheel, wrists neutral and no lumbar hyperextension." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://tonygentilcore.com/2026/05/two-ab-wheel-rollout-variations-1-entry-level-1-john-wick-level/"],
  },
  "Weighted Standing Rollouts": {
    do: [
      "Put on a weighted vest or a loaded backpack strapped tight so it can't slide",
      "Set up exactly as a standing rollout: feet hip-width, legs nearly straight",
      "Roll out and back with the same tucked, slightly rounded back as unweighted reps",
      "The load drags your hips toward the floor, so squeeze glutes and abs even harder",
    ],
    avoid: [
      "A loose backpack sliding toward your head and throwing off your balance",
      "Adding load before your unweighted standing rollouts are clean",
    ],
    v: { id:"5Tc7yKQysVQ", t:"Standing Ab Wheel Rollouts", c:"Ben Bruno", d:45,
         r:"Borderline: 45 s, low resolution and no coaching. Kept because it's Ben Bruno (228k views) doing exactly this variant: full standing rollouts wearing an 80 lb weighted vest, from standing to a near-flat body and back, with no visible sag. The only other weighted-vest video found (Testosterone Nation) is done from the knees." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191121051208/https://www.exrx.net/WeightExercises/HipFlexors/BWKneelingWheelRollout", "https://www.youtube.com/watch?v=ED8ZgWcn_2Y"],
  },
  "Dumbbell Crunch": {
    do: [
      "Lie along a flat bench with your head just past the end, knees bent, feet planted",
      "Hold one dumbbell in both hands at arm's length past your head, not on your chest",
      "Curl your ribs toward your pelvis until your shoulder blades clear the bench",
      "Keep your arms fixed in line with your ears so your abs, not your arms, lift the weight",
    ],
    avoid: [
      "Swinging the dumbbell forward over your face to start the rep",
      "Sitting all the way up; your lower back should stay on the bench",
    ],
    v: { id:"vygFhLGfaM0", t:"Overhead Crunch", c:"Alec Blenis", d:34,
         r:"Borderline: a 34 s clip with no coaching, but it's the only exact match found. Alec Blenis lies on a bench with his head past the end, the dumbbell overhead in both hands and his arms by his ears as he curls up. The one difference is that his legs are straight with heels on the floor instead of knees bent. The alternatives found were floor crunches with the weight pressed over the chest, which is a different movement." },
    src: ["https://web.archive.org/web/20191214175453/https://exrx.net/WeightExercises/RectusAbdominis/WtCrunch", "https://www.youtube.com/watch?v=vygFhLGfaM0"],
  },
  "Weighted Hanging Leg Raises": {
    do: [
      "Stand on a bench, grip a dumbbell between your feet, then take the bar and hang",
      "Tilt your pelvis under (tailbone forward) before the legs start to rise",
      "Raise your legs past level, curling your hips up toward your chest at the top",
      "Pause a second at the top and bottom so the dumbbell never starts a swing",
    ],
    avoid: [
      "Swinging or kicking to fling the weight up",
      "Lifting only at the hips with an arched back, which works the hip flexors, not the abs",
    ],
    v: { id:"QyVq5oUBpss", t:"The WORST Ab Training MISTAKES | Leg Raises", c:"FitnessFAQs", d:311,
         r:"FitnessFAQs, 5:11, 1.86M views. Almost every frame shows hanging leg raises, contrasting sloppy reps with pelvis-tucked, controlled ones that go past level. That matches the cues. No dumbbell is used, but the movement is otherwise identical." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20200201235738/https://www.exrx.net/WeightExercises/RectusAbdominis/WtHangingLegHipRaise", "https://web.archive.org/web/20191216110207/https://www.exrx.net/WeightExercises/RectusAbdominis/BWHangingLegHipRaise", "https://zackhenderson.com/how-to-hanging-leg-raise-beginner-to-advanced-progressions", "https://builtwithscience.com/fitness-tips/how-to-work-lower-abs/"],
  },
  "Weighted Reverse Crunches": {
    do: [
      "Lie on a flat bench and hold its edge behind your head, a dumbbell squeezed in your feet",
      "Bend hips and knees to about 90 degrees so the weight sits above your hips",
      "Curl your pelvis up toward your chest until your hips lift off the bench",
      "Roll the hips up rather than swinging the legs; lower one vertebra at a time",
    ],
    avoid: [
      "Swinging the legs up and down, which turns it into a hip flexor exercise",
      "Using a dumbbell too heavy to grip, so it can slip toward your face",
    ],
    v: { id:"7VH0UB44RT0", t:"Reverse Crunch, Correct Form", c:"Testosterone Nation", d:15,
         r:"Borderline: a 15 s Testosterone Nation clip with no dumbbell. It's kept because it shows the exact setup: a flat bench, hands holding the edge behind the head, knees at 90 degrees, and the hips curling off the bench under control. Its description spells out the same cues. The better-produced tutorials found were floor versions, and the only bench tutorial has 1.5k views." },
    src: ["https://web.archive.org/web/20191212052802/https://www.exrx.net/WeightExercises/RectusAbdominis/BWLyingLegHipRaise", "https://builtwithscience.com/fitness-tips/how-to-work-lower-abs/", "https://www.youtube.com/watch?v=7VH0UB44RT0"],
  },
  "Weighted Side Plank w/ Reach-Through": {
    do: [
      "Side plank on your elbow or hand, feet stacked, a dumbbell in your top hand",
      "Lift your hips so your ankles, hips and shoulders make one straight line",
      "Turn your chest toward the floor and thread the dumbbell under and through the gap",
      "Unwind back up to the ceiling while your hips stay high the whole time",
    ],
    avoid: [
      "Letting the hips sag toward the floor as you reach under",
      "Piking the hips up and back to make room instead of turning your torso",
    ],
    v: { id:"DXQ9YKHtcsk", t:"Side Plank With Rotation: Proper Form", c:"BuiltLean®", d:62,
         r:"The original was an 18 s Marcus Filly clip with no coaching. BuiltLean's 1:02 video (111k views) shows a forearm side plank with the hips kept high and the torso turning to thread the top arm under. Its instructions match the cues. It uses no dumbbell, but the movement is otherwise identical." },
    src: ["https://web.archive.org/web/20191216073913/https://www.exrx.net/WeightExercises/Obliques/BWSideBridge", "https://www.hidefpt.com/post/the-stuart-mcgill-big-3-exercises-for-low-back-health-low-back-series-part-2"],
  },
  "Pull-Ups": {
    do: [
      "Grip the bar overhand, hands a bit wider than shoulders, and hang with straight arms",
      "Start each rep by pulling your shoulder blades down, then drive elbows toward your ribs",
      "Pull until your chin clears the bar, keeping your body still and legs quiet",
      "Lower under control all the way to straight arms every rep; no half reps",
    ],
    avoid: [
      "Kicking or swinging your body to get your chin over the bar",
      "Adding weight on a belt before every rep reaches full range, top and bottom",
    ],
    v: { id:"Hdc7Mw6BIEE", t:"The Best Way To Do Pull Ups For A Wide Back (Optimal Training Technique)", c:"Jeff Nippard", d:513,
         r:"Jeff Nippard: overhand pull-ups demonstrated from behind in over half the frames, with scapular depression and full-range errors called out; the last ~2 minutes are talking head and a program plug." },
    src: ["https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup", "https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips"],
  },
  "Single-Arm Rows": {
    do: [
      "Put one knee and the same-side hand on a flat bench, other foot on the floor, back flat",
      "Let the dumbbell hang straight down so your shoulder stretches toward the floor",
      "Pull your elbow up and back toward your hip until the dumbbell reaches your side",
      "Keep your torso square to the floor; move your arm, not your whole upper body",
    ],
    avoid: [
      "Twisting your torso open to heave the weight up",
      "Shrugging the dumbbell toward your ear instead of pulling it to your hip",
    ],
    v: { id:"dFzUjzfih7k", t:"How to do the SINGLE ARM DUMBBELL ROW! | 2 Minute Tutorial", c:"Max Euceda", d:120,
         r:"Scott Herman's pick is 1:44 of seated talking before any demo, then mixes a feet-on-floor stance with the knee-on-bench one. Replaced with Max Euceda's tutorial: knee and hand on a flat bench, flat back, elbow to the hip, in every frame, with on-screen cues." },
    src: ["https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow", "https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips"],
  },
  "Chest-Supported Rows": {
    do: [
      "Set the bench to 30–45° and lie face down, chest on the pad, feet braced on the floor",
      "Let the dumbbells hang straight down, letting your shoulders reach toward the floor",
      "Row your elbows back past your torso, squeezing your shoulder blades together",
      "Keep your chest on the pad the whole time and lower slowly to a full stretch",
    ],
    avoid: [
      "Lifting your chest off the pad to jerk the weights up",
      "Craning your neck to look forward; keep your head in line with your spine",
    ],
    v: { id:"H75im9fAUMc", t:"Chest-Supported Row", c:"Men's Health", d:128,
         r:"That Fit Friend's pick (19k views) demonstrates in about 3 of 16 frames; from 2:30 on it's seated talk. Replaced with Men's Health (BJ Gaddour): chest on an incline bench, feet braced, continuous side-view rowing from 0:40 to 1:52. Filmed wide, but the form is clear." },
    src: ["https://exrx.net/WeightExercises/BackGeneral/DBLyingRow", "https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips"],
  },
  "Dumbbell Pullovers": {
    do: [
      "Lie on a flat bench, feet planted, holding one dumbbell over your chest by the top plate",
      "Keep a slight bend in your elbows and hold that same bend for the whole rep",
      "Lower the weight behind your head in an arc until you feel your lats and chest stretch",
      "Pull it back over your chest; go only as deep as you can without arching your lower back",
    ],
    avoid: [
      "Bending and straightening your elbows, which turns it into a triceps exercise",
      "Arching your back or lifting your hips to fake a deeper stretch",
    ],
    v: { id:"ZhPOEQJRzBU", t:"How To: Dumbbell Pull-Over (Target Chest Or Lats)", c:"ScottHermanFitness", d:369, s:202,
         r:"Scott Herman: the first 3:20 are chest/lat 'tests' including pull-ups. From 3:22 it shows the flat-bench pullover, one dumbbell held by the top plate, slightly bent elbows, from several angles." },
    src: ["https://exrx.net/WeightExercises/PectoralSternal/DBPullover", "https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips"],
  },
  "Reverse Flyes": {
    do: [
      "Set the bench to 30° and lie face down, chest on the pad, dumbbells hanging, palms in",
      "Keep a soft, fixed bend in your elbows throughout",
      "Raise your arms out wide, at right angles to your body, until elbows reach shoulder height",
      "Go light and lift smoothly; reach the weights out wide rather than rowing them back",
    ],
    avoid: [
      "Bending your elbows and pulling back, which turns it into a row",
      "Swinging the weights up with momentum instead of a controlled lift",
    ],
    v: { id:"xcV4SsEIn0I", t:"How To Do A PROPER Dumbbell Rear Delt Fly for 3D Shoulders | Eb & Swole | Men's Health Muscle", c:"Men’s Health Muscle", d:503, s:210,
         r:"Men's Health Muscle (Ebenezer Samuel): the first 3:30 is mostly talk. The 'Incline Rear Delt Fly' chapter is chest-down on a low incline ('Aim for a low incline' on screen), neutral grip, arms out wide, shown from side and front. Low view count (3.9k) but an established brand." },
    src: ["https://exrx.net/WeightExercises/DeltoidPosterior/DBRearLateralRaise", "https://exrx.net/Kinesiology/Errors", "https://rpstrength.com/blogs/articles/rear-delt-hypertrophy-training-tips"],
  },
  "Hammer Curls": {
    do: [
      "Stand tall with dumbbells at your sides, palms facing your thighs",
      "Keep your elbows by your sides, or slightly in front, and don't let them move",
      "Curl up with your thumbs pointing up until your forearm is close to vertical",
      "Lower slowly to straight arms; if your elbows drift back or you sway, go lighter",
    ],
    avoid: [
      "Swinging your body or leaning back to heave the weight up",
      "Letting your elbows drift behind your torso as you curl",
    ],
    v: { id:"zC3nLlEvin4", t:"How To: Dumbbell Hammer Curl", c:"ScottHermanFitness", d:122,
         r:"The 2025 Scott Herman pick is mostly talking head plus an EZ-bar and a cross-body variant; the standard hammer curl appears in about 2 of 16 frames. Replaced with Scott Herman's original: neutral-grip curls with elbows pinned at the sides, close-up from front and side for most of the video (12.7M views)." },
    src: ["https://exrx.net/WeightExercises/Brachioradialis/DBHammerCurl", "https://muscularstrength.com/article/dumbbell-biceps-curl-golden-rules-peak-builder"],
  },
  "Incline Curls": {
    do: [
      "Set the bench to 55° and sit back with your head and shoulders against the pad",
      "Let your arms hang straight down, palms forward, so your elbows sit behind your body",
      "Curl up without bringing your upper arms forward, then lower all the way to straight",
      "The stretch at the bottom is the point: keep your elbows back and never cut it short",
    ],
    avoid: [
      "Swinging your elbows forward as you curl, which removes the stretch",
      "Lifting your shoulders off the pad or rolling them forward at the bottom",
    ],
    v: { id:"DCe8f6vMe9A", t:"Stop Screwing Up Incline Dumbbell Curls (PROPER FORM!)", c:"ATHLEAN-X™", d:305,
         r:"Scott Herman's 2011 pick is low-res, and under half of it is demo (about 42s); the rest is logos, intro and a subscribe outro. Replaced with Athlean-X: seated on a steep incline, head and shoulders on the pad, arms hanging behind the body, demonstrated in most frames." },
    src: ["https://exrx.net/WeightExercises/Biceps/DBInclineCurl", "https://rpstrength.com/blogs/articles/bicep-hypertrophy-training-tips"],
  },
  "Barbell Hip Thrusts": {
    do: [
      "Sit against the bench's long side and roll the padded bar into the crease of your hips",
      "Rest the bottom of your shoulder blades on the bench edge, feet flat, hip-width apart",
      "Drive through your heels until your body is flat from shoulders to knees, shins vertical",
      "Tuck your chin and keep your ribs down; finish with a hard glute squeeze, not a back arch",
    ],
    avoid: [
      "Arching your lower back to push the hips higher at the top",
      "Feet too far out or too close, shifting the work to hamstrings or quads",
    ],
    v: { id:"xDmFkJxPzeM", t:"How To Build Great Glutes with Perfect Hip Thrust Technique (Fix Mistakes!)", c:"Jeff Nippard", d:432,
         r:"Bret Contreras' 2010 video is mostly seated talk, demos only after ~5:00. Replaced with Jeff Nippard's: bench, pad, foot position, lockout and mistakes, demonstrated nearly every frame." },
    src: ["https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust", "https://bretcontreras.com/10-steps-to-the-perfect-hip-thrust/", "https://bretcontreras.com/how-to-hip-thrust/"],
  },
  "B-Stance Hip Thrusts": {
    do: [
      "Upper back on the bench, one dumbbell held across your hips with both hands",
      "Plant the working foot flat; set the other a half-step forward, toes up, on its heel",
      "Drive through the working heel until your body is flat from shoulders to knees",
      "Let the working leg do the lifting; the kickstand foot only keeps you balanced",
    ],
    avoid: [
      "Pushing hard through the kickstand foot, turning it into a two-leg thrust",
      "Hips twisting or dropping to one side; keep them level",
    ],
    v: { id:"7M9-tWMk3-w", t:"B Stance Hip Thrust Breakdown", c:"Functional Bodybuilding", d:156,
         r:"Functional Bodybuilding (Marcus Filly); 2.5-minute breakdown on a bench. Filmed from a distance but the right movement." },
    src: ["https://hellostrength.com/2019/04/29/exercise-of-the-week-b-stance-hip-thrusts/", "https://bretcontreras.com/how-to-hip-thrust/"],
  },
  "Prone Dumbbell Leg Curl": {
    do: [
      "Lie face down on the bench with your knees at the very end of it",
      "Clamp the dumbbell between the arches of your feet, soles facing the ceiling",
      "Curl your heels toward your glutes, then lower slowly until your knees are nearly straight",
      "Keep your feet squeezed together the whole set so the dumbbell can't slip; start light",
    ],
    avoid: [
      "Lifting your hips off the bench to swing the weight up",
      "Letting the dumbbell drop fast on the way down",
    ],
    v: { id:"xSjmKTf4QbA", t:"How To: Dumbbell Hamstring Curl", c:"ScottHermanFitness", d:176,
         r:"Scott Herman; the exact setup - prone on a flat bench, dumbbell clamped between the feet - from two angles." },
    src: ["https://weighttraining.guide/exercises/dumbbell-leg-curl/"],
  },
  "Dumbbell Wrist Curls": {
    do: [
      "Kneel or sit so your forearms lie flat on the bench, palms up, hands past the edge",
      "Lower the dumbbell and let it roll down your palm to your fingertips",
      "Curl your fingers closed around it, then bend your wrist up as far as it goes",
      "Keep your forearms pinned to the bench; only your hands and fingers move",
    ],
    avoid: [
      "Lifting your forearms off the bench to heave the weight up",
      "Going so heavy you skip the roll to the fingertips",
    ],
    v: { id:"MfMxT_jXcPE", t:"How To Build Huge Forearms: Optimal Training Explained (5 Best Exercises!)", c:"Jeff Nippard", d:463, s:365,
         r:"RP's pick is a 13-second clip with no frames to check. Replaced with Jeff Nippard's forearm video starting at 6:05, where the forearm-on-bench wrist curl is demonstrated with the 15-20 rep cue on screen." },
    src: ["https://exrx.net/WeightExercises/WristFlexors/DBWristCurl"],
  },
  "Dumbbell Reverse Wrist Curls": {
    do: [
      "Kneel or sit so your forearms lie flat on the bench, palms down, hands past the edge",
      "Let your knuckles drop toward the floor as far as is comfortable",
      "Lift the back of your hand as high as you can, pause, then lower slowly",
      "Use much less weight than for wrist curls; this side of the forearm is weaker",
    ],
    avoid: [
      "Lifting your forearms off the bench to swing the weight up",
      "Rushing short, jerky reps instead of the full up-and-down range",
    ],
    v: { id:"YkUuq7FFdsY", t:"Weighted Wrist Extension", c:"E3 Rehab Exercise Library", d:18,
         r:"E3 Rehab exercise library; an 18-second silent demo, but every frame is the exact setup - forearm on the bench, palm down, dumbbell. A demo is enough for a movement this simple." },
    src: ["https://exrx.net/WeightExercises/WristExtensors/DBReverseWristCurl"],
  },
  "Wrist Prep Rocks": {
    do: [
      "Kneel on all fours, hands under your shoulders, fingers spread and pointing forward",
      "Rock slowly forward, back and side to side over your hands, about 10 times each way",
      "Turn your fingers out to the sides, then back toward your knees, and rock again",
      "Keep the heel of the hand flat and elbows straight; go to a stretch, never to pain",
    ],
    avoid: [
      "Letting the heel of the hand peel off the floor to dodge the stretch",
      "Rushing or bouncing hard instead of easing weight on and off",
    ],
    v: { id:"mSZWSQSSEjE", t:"Wrist Strength & Mobility Exercises", c:"GMB Fitness (Praxis)", d:365,
         r:"GMB Fitness, 6:05, 1.8M views, embeddable; nearly every frame shows Ryan on all fours working the wrists (finger/palm pulses, side-to-side, forward and rear-facing stretches) with heels of the hands down. Old and low-resolution, but it is the app's quadruped variant and nothing contradicts the cues." },
    src: ["https://gmb.io/wrists/", "https://gmb.io/handstand/", "https://www.youtube.com/watch?v=mSZWSQSSEjE"],
  },
  "Wall Handstand Hold": {
    do: [
      "Start in a push-up position with your feet against the bottom of the wall",
      "Walk your feet up the wall as you walk your hands in, keeping your elbows locked",
      "Stop with hands 2-6 inches from the wall and chest, hips and toes lightly touching it",
      "Push the floor away, shoulders up by your ears, and squeeze into one straight line",
    ],
    avoid: [
      "Leaning your weight into the wall instead of stacking it over your hands",
      "Arching the lower back into a banana shape; tuck the ribs and squeeze the glutes",
    ],
    v: { id:"Tz3ro4Bs4Ko", t:"From Chest to Wall to Freestanding Handstand | Follow Along Workout", c:"Coach Bachmann", d:1318, s:84,
         r:"The original Yuri video is about 60% talking, and two of its three entries are not the wall walk. The replacement's 'Wall Walk' chapter (1:24) shows a clean chest-to-wall walk-up from a push-up position, with hands a few inches from the wall and a straight stacked line (a line overlay appears at 3:00). The later chapters stay chest-to-wall. It is a 22-minute follow-along, so the start time is required." },
    src: ["https://www.yuri-mar.com/blog/2018/6/20/handstand-wall-walk", "https://gmb.io/handstand/", "https://gmb.io/freestanding-handstand/", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands", "https://www.youtube.com/watch?v=fj6lKSg5bSM"],
  },
  "Wall Toe Pulls": {
    do: [
      "Walk up into your chest-to-wall handstand, hands a few inches from the wall",
      "Stay tall and tight, then push through the heels of your hands to ease away from the wall",
      "Let one foot float off, then both, and hold a second or two before touching back",
      "Once your feet float, catch the balance with your fingertips; never kick the legs away",
    ],
    avoid: [
      "Pressing the fingertips first, which only pins you harder against the wall",
      "Hands too far from the wall, which arches your back and overloads the wrists",
    ],
    v: { id:"QCWp7jkCkVA", t:"ESSENTIAL Beginner Handstand Wall Drills", c:"Paul Twyman", d:413, s:195,
         r:"The original (Emmet Louis) is chest-to-wall and credible, but the camera crops the feet at the top of the frame for the whole hold, and the last third is kneeling talk, so the toe pull itself is never visible. In Paul Twyman's replacement the toe-pull section (walks up chest-to-wall at 3:30 and holds until about 6:05) shows the full body, including the feet leaving the wall. It starts right after his back-to-wall heel pulls end." },
    src: ["https://www.subyhandstands.com/suby-handstands-blog/2024/1/24/how-to-do-toe-pulls-correctly", "https://gmb.io/freestanding-handstand/", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands"],
  },
  "Freestanding Kick-Ups": {
    do: [
      "Learn the bail first: lift one hand, turn your hips and cartwheel down to your feet",
      "Start with hands already on the floor, arms locked, shoulders over hands, one leg high",
      "Swing the lead leg up gently and let the push-off leg join once you're over your hands",
      "Kick just hard enough to arrive, not fly over; if you overshoot, cartwheel out",
    ],
    avoid: [
      "Kicking hard, then arching your back to save it instead of bailing out",
      "Bending the elbows or letting the shoulders drift off the hands as you kick",
    ],
    v: { id:"kEYsmHpxzL4", t:"Stop complicating your Handstand kick-up - Make it easy with these steps!", c:"Sondre Berg", d:440,
         r:"The original ('Some thoughts on...') shows Yuri talking in about 12 of 16 frames, with only four kick-up frames. The replacement (Berg Movement, 189k views, 7:20) is mostly freestanding kick-up demonstration. Its on-screen overlays ('hands starting in the ground', 'wait with the second leg until balance is created') match the app's cues." },
    src: ["https://www.yuri-mar.com/blog/2024/7/17/9-methods-for-training-the-kickup-to-handstand", "https://gmb.io/freestanding-handstand/", "https://gmb.io/handstand/", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands", "https://www.youtube.com/watch?v=nTHXXpnRCTY"],
  },
  "Freestanding Handstand": {
    do: [
      "Kick up gently and stack wrists, shoulders, hips and feet in one vertical line",
      "Push the floor away with locked arms and squeeze your legs and glutes together",
      "Starting to tip over? Dig in your fingertips. Sinking back? Press the heel of the hand",
      "Make corrections small and early with your hands while the body stays still",
    ],
    avoid: [
      "Saving balance by bending the elbows or piking the hips instead of using the hands",
      "Holding your breath; breathe steadily through the whole hold",
    ],
    v: { id:"ctunmnwbbSI", t:"Handstand Tutorial - How to learn a Handstand", c:"Calisthenicmovement", d:259,
         r:"The original shows Yuri kneeling on the floor doing hand-priming drills in every frame, and no handstand appears at all. The replacement (2.2M views, 4:19) is all demonstration with captions. It covers banana vs. straight handstand, 'shoulders, pelvis & legs in a straight vertical line', a close-up of the hands gripping, and 'tilt your pelvis + open shoulders', which all match the cues." },
    src: ["https://gmb.io/handstand/", "https://gmb.io/freestanding-handstand/", "https://www.yuri-mar.com/blog/2023/9/1/techniquesconcepts-to-hold-your-handstand-longer", "https://www.yuri-mar.com/blog/2024/1/3/handstands-to-grip-or-not-to-grip", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands"],
  },
  "Straddle Press to Handstand": {
    do: [
      "Stand in a wide straddle, fold forward and plant your hands shoulder-width",
      "Round your upper back, lock your arms and lean your shoulders forward past your hands",
      "Rise onto your toes and keep leaning until your feet float up; don't hop",
      "Send your hips forward over your hands, then bring your legs together overhead",
    ],
    avoid: [
      "Jumping off the floor instead of leaning until the feet lift on their own",
      "Bending the elbows to muscle the hips up",
    ],
    v: { id:"SfLaCKaljU4", t:"Press To Handstand: Tutorial and Training Guide", c:"GMB Fitness (Praxis)", d:792, s:185,
         r:"In the original (10:02, 2.4k views), Yuri kneels and talks through almost every frame and never presses. In the replacement, 'The Movements' chapter (3:05) shows lean-until-the-feet-float drills in a wide straddle stance, then wall and freestanding straddle negatives. This is the GMB press guide the cues were written from. The video is 13 minutes, so the start time is required." },
    src: ["https://gmb.io/press-handstand/", "https://www.bergmovement.com/calisthenics-blog/how-to-press-handstand", "https://www.youtube.com/watch?v=OzAp-qoepnE"],
  },
  "One-Arm Handstand": {
    do: [
      "Hold a steady straddle handstand with your hands a little closer than usual",
      "Shift weight onto one hand by dropping that hip, keeping the shoulder over the hand",
      "Lighten the other hand in stages: flat, fingertips, one finger, then hovering",
      "Move the hips diagonally over the support hand, not straight sideways, and don't twist",
    ],
    avoid: [
      "Throwing the free arm out before your weight is truly over the support hand",
      "Letting the hips swing sideways or the body twist as the hand lifts",
    ],
    v: { id:"ytjIgIe5CVQ", t:"Steps and Preparation to Achieving One Arm Handstand", c:"Yuri Marmerstein", d:460,
         r:"The original is an interview: about 10 of 16 frames show Tom and Mikael sitting and talking, with performance b-roll in between. The replacement (142k views, 7:40) has a handstand in 15 of 16 frames. It works through straddle handstands, weight shifts onto one hand and lightening the free hand, the app's progression. The footage is low-resolution (2013) but clear." },
    src: ["https://gmb.io/oahs/", "https://www.bergmovement.com/calisthenics-blog/one-arm-handstand-drills-and-progressions-beginner", "https://www.youtube.com/watch?v=UE9Tn08BZBA"],
  },
  "Frog Stand": {
    do: [
      "Squat, hands flat and shoulder-width just in front of your feet, fingers spread wide",
      "Bend your elbows and rest your knees on the backs of them, like a shelf",
      "Lean forward slowly until your toes float off the floor on their own",
      "Balance with your fingers: dig the tips in if you tip forward, lean more if you tip back",
    ],
    avoid: [
      "Staring straight down between your hands, which pitches you onto your face",
      "Jumping the feet up instead of leaning until they lift by themselves",
    ],
    v: { id:"zwfdymEUqcQ", t:"How to actually learn the Frog Stand | Calisthenics University Ep 9", c:"STRIQfit", d:289,
         r:"Embeddable 4:49 STRIQfit tutorial with chapters (balance, form, training, mistakes); about half the frames show the bent-arm frog stand on the floor with knees resting on the elbows, and the rest is the coach talking to camera." },
    src: ["https://antranik.org/learning-and-mastering-the-crow-pose/", "https://gmb.io/crow-pose/", "https://stevenlow.org/overcoming-gravity/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "Straight-Arm Frog Stand": {
    do: [
      "Squat, hands shoulder-width, fingers spread, and lock your elbows fully straight",
      "Press your knees into the outside of your upper arms, up near the armpits",
      "Lean your shoulders forward past your hands until your feet lift, arms still locked",
      "With no elbow shelf, your shoulders hold you: push the floor away, shoulders down",
    ],
    avoid: [
      "Letting the elbows bend into a shelf, which turns it back into a plain frog stand",
      "Shrugging your shoulders up toward your ears",
    ],
    v: { id:"Uf7hb8utUm4", t:"Straight Arm Frog Stand: Strength and Balance", c:"Muscle & Motion", d:276,
         r:"Borderline pass. From 0:04 to 0:32 a person demonstrates exactly this variant: arms locked, knees on the outside of the upper arms, feet up. A 3D skeleton then holds the same pose until about 1:52, and the second half is anatomy and mobility fixes. Muscle & Motion is a credible anatomy-education channel, and no better straight-arm-specific video turned up." },
    src: ["https://antranik.org/learning-and-mastering-the-crow-pose/", "https://gmb.io/crow-pose/", "https://gmb.io/planche/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "Tuck Planche": {
    do: [
      "Hands shoulder-width, fingers angled slightly out, elbows locked straight",
      "Lean your shoulders well past your hands and lift your feet, knees pulled to your chest",
      "Knees no longer rest on your arms: raise your hips until they're level with your shoulders",
      "Keep pushing the floor away, upper back rounded, shoulders pressed down from your ears",
    ],
    avoid: [
      "Bending the elbows to find balance; bent arms take away much of the work",
      "Hips sinking below shoulder height instead of staying level with them",
    ],
    v: { id:"bFyxSxcJoZE", t:"The Real Way to Learn the Tuck Planche | Calisthenics University Ep 23", c:"STRIQfit", d:172,
         r:"About 11 of 16 frames show the tuck planche, mostly on parallettes (acceptable, same body position) and once on the floor. It includes a straight-arms vs bent-arms comparison and a hips-not-horizontal mistake, which matches the cues. STRIQfit, 2:52." },
    src: ["https://web.archive.org/web/20220714014237/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/planche", "https://gmb.io/planche/", "https://antranik.org/progression-exercises-for-static-holds/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "Advanced Tuck Planche": {
    do: [
      "Start from a tuck planche: hands shoulder-width, elbows locked, shoulders ahead of hands",
      "Push your hips back so your knees move away from your chest, thighs about square to torso",
      "Lean further forward to balance the longer shape, still pushing the floor away",
      "Flatten your back until it's level from shoulders to hips; the flat back is this step",
    ],
    avoid: [
      "Rounding the back and letting the knees creep back into your chest",
      "Opening the hips without adding lean, so your feet drop to the floor",
    ],
    v: { id:"0YS3NkbLOgk", t:"How To Do A PERFECT FORM Advanced Tuck PLANCHE", c:"Bodysthenics", d:268,
         r:"The Andry Strong video is almost all kneeling protraction drills and feet-down leans, and the advanced tuck hold is barely shown. The replacement holds the advanced tuck (on parallettes) for nearly the whole 4:28, with arms locked, hips at shoulder height and a 'hips too low' correction." },
    src: ["https://web.archive.org/web/20220714014237/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/planche", "https://antranik.org/progression-exercises-for-static-holds/", "https://gmb.io/planche/"],
  },
  "Straddle Planche": {
    do: [
      "Start in an advanced tuck: arms locked, back flat, shoulders well ahead of your hands",
      "Straighten both legs out wide to the sides until they're level with your hips",
      "Lean further forward as the legs go out, so your balance point stays over your hands",
      "Hold one flat line from shoulders to feet: glutes squeezed, knees locked, toes pointed",
    ],
    avoid: [
      "Bending the knees or letting the legs droop below hip height",
      "Arching the lower back to lift the legs instead of leaning further forward",
    ],
    v: { id:"eO2bTn2f8ZQ", t:"TOP 5 exercises for Straddle Planche. Viktor Kamenov.", c:"Viktor Kamenov Official", d:248,
         r:"Borderline. The Calisthenics Family video (10:01) is mostly planche leans, kneeling explanation and a band setup, with the straddle hold seen only briefly around 6:50 and 8:15-8:50, then a minute of promo. The replacement (205k views, 4:08) shows straddle and assisted-straddle holds with locked arms on the floor and low bars in most exercise frames. It is a drills video rather than a hold tutorial." },
    src: ["https://web.archive.org/web/20220714014237/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/planche", "https://gmb.io/planche/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "Half-Lay Planche": {
    do: [
      "Start in an advanced tuck: arms locked, back flat, shoulders well ahead of your hands",
      "Press your knees together and open your hips until your thighs line up with your body",
      "Keep the knees bent to a right angle and lean further forward to stay balanced",
      "Hold a straight line from shoulders to knees with glutes squeezed, no bend at the hips",
    ],
    avoid: [
      "Letting the hips bend, which drops you back into an advanced tuck",
      "Letting the knees drift apart, which quietly turns it into an easier straddle",
    ],
    v: { id:"Y5JhUQDHOew", t:"The Forgotten Progression | Half Lay Planche Tips & Tutorial", c:"Tomi Huynh", d:404,
         r:"Borderline. A dedicated half-lay tutorial with chapters: the half-lay (legs together, knees bent, hips open, arms locked) is demonstrated throughout, mostly on parallettes. Caveats: his shins point up rather than 'hanging', and the channel is small (7k views). Other candidates were mostly talking heads (Workout Union, Sondre Berg 16 min) or tiny clips." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://stevenlow.org/overcoming-gravity/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/", "https://gmb.io/planche/"],
  },
  "Full Planche": {
    do: [
      "Hands shoulder-width, fingers angled out, elbows locked, shoulders far past your hands",
      "Extend both legs straight back, pressed together, body level with the floor",
      "Lean further than in the straddle: legs together put more weight behind your hands",
      "Hold one straight line head to toe: floor pushed away, shoulders down, glutes tight",
    ],
    avoid: [
      "Bending the elbows to stay up; the planche is a straight-arm hold",
      "Piking at the hips or letting the legs sag below body level",
    ],
    v: { id:"wbTZ2gOdijs", t:"Perfect Full Planche", c:"FitnessFAQs", d:30,
         r:"The Andry Strong video is kneeling technique drills; a full planche never appears, only a brief straddle at 5:45. No proper full-planche tutorial passed (Heria 18:52 and THENX 27 min are mostly talk, Felix Ng is small and drifts into presses). This 30-second FitnessFAQs clip qualifies under the short-clip exception: textbook straight-arm full planche from two angles, on parallel bars." },
    src: ["https://web.archive.org/web/20220714014237/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/planche", "https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Planche_(exercise)", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "Scapular Pulls": {
    do: [
      "Hang from the bar, hands shoulder-width, palms facing away, arms fully straight",
      "Let your shoulders ride up toward your ears, then pull them down and back, away from them",
      "Your body rises an inch or two; pause a second at the top, then lower slowly",
      "Keep your elbows locked the whole time; only your shoulder blades move",
    ],
    avoid: [
      "Bending your elbows, which turns it into a small pull-up",
      "Swinging or kicking your legs to help the lift",
    ],
    v: { id:"KG8JZJ22NQI", t:"The Best Exercise to Increase Pullups", c:"FitnessFAQs", d:335,
         r:"Antranik's video is almost entirely a seated talking head and blog-page screenshots; only 2-3 of 16 frames show anyone on a bar. FitnessFAQs (518k views, 5:35) shows straight-arm, overhand, shoulder-width scap pulls from behind in nearly every frame, plus a mistakes section." },
    src: ["https://antranik.org/shoulder-mechanics/", "https://www.youtube.com/watch?v=_yZwclVfqzE", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/"],
  },
  "Arch Hangs": {
    do: [
      "Hang with straight arms and pull your shoulders down, away from your ears",
      "Then press the bar down toward your hips so your chest rises toward the bar",
      "Arch your upper back as the chest lifts, and hold the top for a second or two",
      "Arms stay almost straight: the lift comes from pulling your arms down, not bending them",
    ],
    avoid: [
      "Bending your elbows and rowing yourself up instead of arching",
      "Arching only the lower back or kicking the legs forward to fake the lift",
    ],
    v: { id:"C995b3KLXS4", t:"Arching Active Hang", c:"Ido Portal", d:143,
         r:"The Antranik video fails: it is mostly a talking head. Ido Portal's Arching Active Hang (790k views, 2:23) shows the arched hang with locked elbows and legs trailing behind. Its text cards match the cues: shoulders down, chest up, don't bend the elbows, don't lift the legs in front." },
    src: ["https://antranik.org/shoulder-mechanics/", "https://www.youtube.com/watch?v=_yZwclVfqzE"],
  },
  "Tuck Front Lever": {
    do: [
      "Hang from the bar, hands shoulder-width, palms away; pull your knees tight to your chest",
      "With straight arms, press the bar toward your hips until your back is level with the floor",
      "Keep your hips as high as your shoulders, and your shoulders down, away from your ears",
      "Lock your elbows: this is a straight-arm hold, and bent arms mean it is too hard for now",
    ],
    avoid: [
      "Bending your elbows to make the hold easier",
      "Letting your hips hang below your shoulders, so your body is tilted, not level",
    ],
    v: { id:"lkGhntOoLNk", t:"How To Tuck Front Lever | Tutorial & Progressions", c:"Andrew Alinda", d:277,
         r:"STRIQfit's episode has 4k views and is about half desk talking-head, and its demo frames show hips well above the shoulders, which contradicts the 'back level with the floor' cue. Andrew Alinda's dedicated tutorial (44k views, 4:37, chapters on form and shoulder position) shows a level tuck with locked arms. It also shows a wrong-vs-right comparison of low hips." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://gmb.io/levers/", "https://nick-e.com/recommended-routine", "https://www.youtube.com/watch?v=3UL5UmiNeaM"],
  },
  "Advanced Tuck Front Lever": {
    do: [
      "Start in a tuck front lever: straight arms, body level, knees at your chest",
      "Push your knees away from your chest until your thighs are at a right angle to your body",
      "Flatten your back so it is straight and level, not rounded like in the tuck",
      "Brace your abs and squeeze your glutes (buttocks) to keep hips level with shoulders",
    ],
    avoid: [
      "Keeping a rounded back, which is just a looser tuck rather than this step",
      "Letting your hips drop below your shoulders as your knees move out",
    ],
    v: { id:"AGhb8V8M758", t:"Front Lever for Beginners (ALL PROGRESSIONS)", c:"FitnessFAQs", d:393, s:142,
         r:"FitnessFAQs (2.2M views, embeddable) is sound, but this is an all-progressions video. The advanced tuck (thighs about 90 degrees to the torso, flatter back, straight arms) starts at about 2:22, right after the tuck segment, so it needs a start time." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://www.workedoutfitness.com/search/ex/advanced-tuck-front-lever", "https://gmb.io/levers/"],
  },
  "Straddle Front Lever": {
    do: [
      "From an advanced tuck, straighten both legs and spread them as wide as you can",
      "Lock your knees, point your toes and squeeze your glutes (buttocks) to hold the legs up",
      "Start as wide as possible; bring the legs closer only as the hold gets easier",
      "Keep your hips level with your shoulders, with no bend at the hips",
    ],
    avoid: [
      "Bending at the hips so your legs drop below the line of your body",
      "Letting your knees bend as you tire",
    ],
    v: { id:"AGhb8V8M758", t:"Front Lever for Beginners (ALL PROGRESSIONS)", c:"FitnessFAQs", d:393, s:267,
         r:"Same FitnessFAQs all-progressions video. The straddle comes late (about 4:28-5:08: side and front views of a wide-leg straddle on a straight-arm bar), so it needs a start time. The first frames show slightly raised legs, but the line is otherwise level." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://www.youtube.com/watch?v=_qNRNyI3qxM", "https://www.youtube.com/watch?v=sDz16P6gdkk"],
  },
  "Half-Lay Front Lever": {
    do: [
      "Press your knees together and bend them to about a right angle, shins pointing down",
      "Open your hips fully so your thighs line up with your body, level with the floor",
      "Squeeze your knees together and tighten your glutes (buttocks); the legs can't spread now",
      "No bend at the hips: shoulders, hips and knees form one straight, level line",
    ],
    avoid: [
      "Bending at the hips, which turns it back into an advanced tuck",
      "Arching your lower back or letting your knees drift apart",
    ],
    v: { id:"SeIfKANM8rQ", t:"HOW TO FRONT LEVER | ANYONE CAN DO IT!", c:"THENX", d:961, s:645,
         r:"The KILO clip is 23 s long, with 1.4k views, about 15 s of far-angle gym footage mostly swinging into position, then end cards; it is not instructional. THENX (Chris Heria, 197k views) has a labelled 'Progression #9 Half Lay Front Lever Hold' at about 10:50: knees bent about 90 degrees, shins down, thighs in line with the torso. Band, harder and pull-up half-lay variations follow until about 12:15." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://www.workedoutfitness.com/search/ex/half-lay-front-lever"],
  },
  "Full Front Lever": {
    do: [
      "Hang with locked arms and pull the bar down toward your hips to raise your body",
      "Straighten your legs fully and press them together, toes pointed",
      "Tuck your tailbone under slightly and squeeze your glutes so your lower back stays flat",
      "Hold one straight, level line from shoulders to toes, hips neither high nor low",
    ],
    avoid: [
      "Piking at the hips or letting your legs sag below the line of your body",
      "Bending your elbows as you tire; if they bend, go back a step",
    ],
    v: { id:"SeIfKANM8rQ", t:"HOW TO FRONT LEVER | ANYONE CAN DO IT!", c:"THENX", d:961, s:740,
         r:"The GMB video is about 9 of 16 frames talking head and uses rings, and its 'Full Front Lever' chapter teaches negatives from an inverted hang, not the hold. The same THENX video shows a full front lever hold on a bar from about 12:20 to 14:10: straight body, legs together, level, with easier and band variations and 'Front Lever Unlocked'." },
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://gmb.io/levers/", "https://www.youtube.com/watch?v=_qNRNyI3qxM", "https://www.youtube.com/watch?v=B3_iF6mxSXY"],
  },
  "Scapular Push-Ups": {
    do: [
      "Set up in a push-up plank: hands under shoulders, arms locked, body in a straight line",
      "Let your chest sink between your shoulder blades as they squeeze together",
      "Push the floor away until your shoulder blades spread apart and your upper back rounds",
      "Your elbows never bend: only your shoulder blades move, slowly, through the full range",
    ],
    avoid: [
      "Bending your elbows, which turns it into a tiny push-up",
      "Letting your hips sag or your head drop toward the floor",
    ],
    v: { id:"HyQw68TSMoA", t:"Unlock Your Shoulders FULL Strength", c:"FitnessFAQs", d:389,
         r:"Precision Movement's video is mostly wall, quadruped and one-arm variants; the app's full-plank version appears only for about 20 s (3:10-3:32). FitnessFAQs (1.75M views, 6:29) is a dedicated scapula push-up tutorial. It covers protraction and retraction, then shows locked-arm plank reps from about 1:50 to 2:50, with nearly every frame on the movement." },
    src: ["https://www.youtube.com/watch?v=fLAf2YG4flw", "https://www.youtube.com/watch?v=akgQbxhrhOc", "https://www.youtube.com/watch?v=weeazsgcQ6M"],
  },
  "Chin-Ups": {
    do: [
      "Grip the bar palms facing you, hands about shoulder-width, and hang with straight arms",
      "With a weight belt, let the weight hang still between your legs before each rep",
      "Pull your elbows down toward your sides until your chin clears the bar",
      "Lower all the way to straight arms every rep; the full range is what counts",
    ],
    avoid: [
      "Cutting reps short at the bottom or stopping before your chin clears the bar",
      "Swinging or kicking your legs to get up",
    ],
    v: { id:"qV7vOUcUfD4", t:"How To Do CHIN-UPS: Grip, Weighted Chin-Ups, Programming, & Fixing Common Errors", c:"Barbell Logic", d:140,
         r:"Borderline pass. Barbell Logic (53k views, 2:20) demonstrates supinated, shoulder-width chin-ups for about 0:10-1:08: straight arms at the bottom, chin over the bar, common errors. The rest is coach talk on programming and weighted chin-ups with a dip-belt insert, which fits the app's belt cue." },
    src: ["https://exrx.net/WeightExercises/LatissimusDorsi/BWUnderhandChinup", "https://www.youtube.com/watch?v=qV7vOUcUfD4", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/"],
  },
  "Reverse Snow Angels": {
    do: [
      "Lie face down on a flat bench, arms by your hips, thumbs pointing up",
      "Lift your straight arms to body height and sweep them out wide until they meet overhead",
      "Sweep them back to your hips the same way, arms lifted the whole time",
      "Keep your shoulders away from your ears, especially as your arms pass overhead",
    ],
    avoid: [
      "Shrugging your shoulders up as your arms reach overhead",
      "Arching your lower back or lifting your chest high off the bench",
    ],
    v: { id:"b3e9rENJGCE", t:"Reverse Snow Angels | CrossFit Invictus Gymnastics", c:"CrossFit Invictus", d:69,
         r:"CrossFit Invictus (220k views, 1:09) explains briefly, then about 45 s of prone reps sweep straight, hovering arms from the hips to overhead and back, with the chest mostly down. It is done on the floor rather than a bench, but nothing contradicts the cues; bench alternatives found showed the chest lifted high." },
    src: ["https://www.bodbot.com/Exercises/1098/Reverse-snow-angels", "https://library.theprehabguys.com/vimeo-video/reverse-snow-angel/", "https://www.youtube.com/watch?v=b3e9rENJGCE"],
  },
  "Push-Ups": {
    do: [
      "Hands just wider than shoulders, fingers forward or turned slightly out, legs together",
      "Lower until your chest nearly touches the floor, elbows angled back about 45 degrees",
      "Press to straight arms, then push the floor away so your shoulder blades spread apart",
      "Squeeze glutes and brace abs so you stay one straight line from head to heels",
    ],
    avoid: [
      "Hips sagging toward the floor or piking up out of line",
      "Elbows flaring straight out to the sides",
    ],
    v: { id:"IODxDxX7oi4", t:"The Perfect Push Up | Do it right!", c:"Calisthenicmovement", d:217,
         r:"Calisthenicmovement, 41M views, 3:37: nearly every frame shows the push-up with overlays on body position, arm position, correct vs wrong depth and protraction at the top, all matching the cues." },
    src: ["https://web.archive.org/web/20230120034311/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/pushup", "https://antranik.org/push-ups/", "https://gmb.io/push-up/", "https://exrx.net/WeightExercises/PectoralSternal/BWPushup"],
  },
  "Diamond Push-Ups": {
    do: [
      "Touch thumbs and index fingers into a diamond, hands under the middle of your chest",
      "Keep your feet together and body straight, shoulders slightly forward over your hands",
      "Lower with elbows brushing your ribs until your chest meets your hands, then press up",
      "Elbows point back, not out: the narrow hands shift the work onto the backs of your arms",
    ],
    avoid: [
      "Elbows flaring wide, which strains the elbows and wrists",
      "Cutting the depth short; if full range fails, set the hands a little wider for now",
    ],
    v: { id:"_4EGPVJuqfA", t:"Diamond Push-Ups Tutorial (with correct form)", c:"Tykato Fitness", d:197,
         r:"113k views, 3:17: 13 of 16 frames demonstrate floor diamond push-ups side-on, with wrong-form examples then 'proper form' (hands under chest, forearms vertical, full depth, rigid body). Only the last 25 seconds is talking." },
    src: ["https://web.archive.org/web/20230120034311/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/pushup", "https://exrx.net/WeightExercises/Triceps/BWCloseGripPushup"],
  },
  "Decline Push-Ups": {
    do: [
      "Feet on the bench, hands on the floor just wider than shoulders, body in a straight line",
      "Lower until your chest nearly touches the floor, elbows angled back about 45 degrees",
      "Press back to straight arms; the raised feet put more of the load on your shoulders",
      "Brace abs and glutes hard: with feet up, the hips want to sag, so keep them in line",
    ],
    avoid: [
      "Hips sagging toward the floor or piking up toward the ceiling",
      "Stopping short of full depth because the floor feels far away",
    ],
    v: { id:"SKPab2YC8BE", t:"How To: Decline Push-Up", c:"ScottHermanFitness", d:89,
         r:"ScottHermanFitness, 1.45M views, 1:29: feet on a bench, hands on the floor, rigid body to full depth, shown from two angles. About a third of the short video is intro and outro. No clearly better option was found (one alternative uses kettlebell handles)." },
    src: ["https://exrx.net/WeightExercises/PectoralClavicular/BWDeclinePushup", "https://web.archive.org/web/20230120034311/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/pushup"],
  },
  "Archer Push-Ups": {
    do: [
      "Set your hands about twice shoulder width, fingers forward or turned slightly out",
      "Lower toward one hand, bending that elbow, while the other arm straightens to the side",
      "Keep the straight arm locked: it only steadies you, the bent arm does the pushing",
      "Stay one straight, level line; shift sideways over the working hand without twisting",
    ],
    avoid: [
      "Bending the straight arm, which splits the load and makes it a wide push-up",
      "Twisting the hips or letting them sag as you shift to one side",
    ],
    v: { id:"7-4Uq64blA8", t:"How to do the Archer Push-Up | Calisthenics University Ep 22", c:"STRIQfit", d:177,
         r:"STRIQfit, 2:57: most frames show floor archer push-ups with the far arm locked straight, plus a bench-assisted regression. Talking-head segments are brief." },
    src: ["https://exrx.net/WeightExercises/PectoralSternal/BWArcherPushup", "https://www.hybridcalisthenics.com/pushups", "https://gmb.io/push-up-variations/"],
  },
  "Incline One-Arm Push-Ups": {
    do: [
      "One hand on the bench under your shoulder, feet wide apart, free hand behind your back",
      "Brace your whole body straight, as if resisting someone trying to roll you over",
      "Lower your chest to the bench with the elbow tucked to your side, then press up",
      "Keep shoulders and hips square to the bench; the incline eases the load, not the form",
    ],
    avoid: [
      "Twisting the chest open to shorten the push",
      "Letting the working elbow flare out wide from your side",
    ],
    v: { id:"YGKYL0gP9EU", t:"One Arm Pushup Progression | Proper Form & Full Tutorial", c:"Minus The Gym", d:371, s:198,
         r:"Credible 6:11 progression video, but the first 2:20 is a talking head. Start at 3:18, where it shows the one-arm push-up on a high incline (railing), then 'Progression 3: Low Incline OAP' on a bench-height step at 3:50, feet wide and body square." },
    src: ["https://www.hybridcalisthenics.com/pushups", "https://gmb.io/push-up-variations/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "One-Arm Push-Ups": {
    do: [
      "Now on the floor: hand under your chest, feet wide apart, free hand behind your back",
      "Lower until your chest is a fist's height off the floor, elbow close to your side",
      "Press up keeping your shoulders nearly level; a slight tilt is fine, a big twist isn't",
      "Squeeze glutes and brace abs hard so your hips neither sag nor rotate",
    ],
    avoid: [
      "Turning your chest toward the floor to shorten the push",
      "Hips sagging or hiking up as you strain out of the bottom",
    ],
    v: { id:"JiHkxqbhNuw", t:"How to Do One-Arm Push Ups | Mike Vazquez", c:"Bodybuilding.com", d:47,
         r:"The Al Kavadlo 'Perfect Your One Arm Push-up' is mostly a talking head (about 10 of 16 frames). The replacement, a Bodybuilding.com exercise-database clip (470k views), shows the floor one-arm push-up with feet wide, hand under chest and chest to just off the floor from several angles for most of its 47 seconds, and its directions match the cues." },
    src: ["https://www.hybridcalisthenics.com/pushups", "https://gmb.io/push-up-variations/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/"],
  },
  "One-Arm Push-Ups, Feet Together": {
    do: [
      "Set up as for the wide-stance version, then bring your feet together, legs locked",
      "Hand under your chest, free hand behind your back, body rigid from head to heels",
      "Lower until your chest is near the floor, elbow tucked, then press straight up",
      "With no wide base, your abs and glutes alone must stop the twist: squeeze them hard",
    ],
    avoid: [
      "Letting the feet creep apart mid-set to regain balance",
      "Rotating the hips and shoulders sideways as you push up",
    ],
    v: { id:"MlRCAJbwjMs", t:"The Ultimate One Arm Push-up", c:"Al Kavadlo", d:88, s:53,
         r:"Al Kavadlo, 96k views, 1:28: shows the wide stance, then 'bringing your feet closer makes it harder' from 0:53, then 'feet together is the ultimate' around 1:07, with a rigid body. Start at 0:53 to skip the intro and the wide-stance part." },
    src: ["https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/", "https://www.hybridcalisthenics.com/pushups", "https://gmb.io/push-up-variations/"],
  },
  "Pike Push-Ups": {
    do: [
      "Set up in a downward-dog shape: hands shoulder-width, hips high, legs straight",
      "Bend your elbows and lower your head toward the floor, then press back up",
      "Keep your elbows pointing back toward your feet, not flared out to the sides",
      "Aim your head at a spot a few inches in front of your hands, making a triangle",
    ],
    avoid: [
      "Lowering the head straight down between the hands instead of in front of them",
      "Letting the hips sink so the chest takes over, like a normal push-up",
    ],
    v: { id:"fXgou2W10ok", t:"How to Pike Push Up | Beginner (Progressions)", c:"The Bodyweight Process", d:288,
         r:"The original (STRIQfit) is a sit-down talking head in 9 of 16 frames. The replacement (247k views, 4:48) is all demonstration with text cues: 'create triangle shape', 'elbows tucked', 'head in front of hands'. It also shows the elbow-flare and head-placement mistakes marked X, which exactly matches the app's cues and avoid list." },
    src: ["https://antranik.org/hspu-tutorial-yaad/", "https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=XAHwDyghog8"],
  },
  "Elevated Pike Push-Ups": {
    do: [
      "Put your feet on the bench and walk your hands in until your hips are over your shoulders",
      "Keep your legs straight and your hips bent to about 90 degrees, torso near vertical",
      "Lower your head to the same triangle point in front of your hands, elbows pointing back",
      "Keep the hips stacked for the whole rep: more weight on your hands is the whole point",
    ],
    avoid: [
      "Hands too far from the bench, so the hips drop and the rep turns into a push-up",
      "Letting the hips drift back behind your hands as you press up",
    ],
    v: { id:"q4XaCYt0z6M", t:"Top 5 Pike Push Up Progressions to Make You STRONG", c:"Paul Twyman", d:360, s:152,
         r:"Credible coach, 6:00, embeddable. It is a five-variation video, and the feet-elevated reps (low step, then a box with hips stacked over the hands and the head going in front of them) start at about 2:33, so it needs a start time. The first half has a lot of talking." },
    src: ["https://antranik.org/hspu-tutorial-yaad/", "https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=q4XaCYt0z6M", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic"],
  },
  "Wall Handstand Push-Up Negatives": {
    do: [
      "Walk up into your wall handstand, hands shoulder-width and arms locked",
      "Lean your shoulders slightly forward and bend your elbows back, not out to the sides",
      "Lower on a slow 3-5 second count until the top of your head gently touches the floor",
      "Control the last few inches, the hardest part, and never just drop into them",
    ],
    avoid: [
      "Speeding up and flopping through the bottom half of the lowering",
      "Flaring the elbows out wide to the sides",
    ],
    v: { id:"PDKmh0OJ6Ic", t:"Handstand Push-Up For Beginners (Increase Your Strength)", c:"FitnessFAQs", d:333,
         r:"FitnessFAQs, 157k views, 5:33, embeddable. About 85% of the frames are demonstration, and the labelled 'ECCENTRICS' segment (controlled lowering to the floor at the wall) comes right at the start, at 0:08. The rest of the video covers related wall HSPU progressions, with a clean, controlled line throughout." },
    src: ["https://gmb.io/handstand-push-up/", "https://antranik.org/hspu-tutorial-yaad/", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic"],
  },
  "Wall Handstand Push-Ups": {
    do: [
      "Face the wall if you can, as it's closest to freestanding; back-to-wall is easier",
      "Lower under control until your head touches, a little in front of your hands",
      "Press the floor away, elbows pointing back, until your arms lock out again",
      "Drive straight up with your arms; don't arch or push off the wall with your legs",
    ],
    avoid: [
      "Hands far from the wall, which lets the back arch into a banana shape",
      "Flaring the elbows out wide to grind the rep out",
    ],
    v: { id:"n2LuZBT1vr8", t:"The Ultimate Handstand Push-Up Tutorial (INCREASE REPS)", c:"FitnessFAQs", d:403,
         r:"FitnessFAQs, 224k views, 6:43, embeddable. Almost every frame is a wall HSPU demonstration, both chest-to-wall and back-to-wall, with the head landing in front of the hands and the elbows tracking back. Talking-head time is minimal, and nothing contradicts the cues." },
    src: ["https://gmb.io/handstand-push-up/", "https://www.bergmovement.com/calisthenics-blog/5-handstand-push-up-mistakes-everyone-makes", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://www.youtube.com/watch?v=n2LuZBT1vr8", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic"],
  },
  "Deficit Wall Handstand Push-Ups": {
    do: [
      "Stack stable books or yoga blocks for each hand, never the dumbbells, which roll",
      "Get into your wall handstand with one hand flat on each stack, arms locked",
      "Lower until your head sinks below your hands, between the stacks, then press up",
      "Start with a small height and raise it only when every rep reaches full depth",
    ],
    avoid: [
      "A deficit so tall you can't control the bottom or press back out",
      "Wobbly or sliding stacks; test them before you go upside down",
    ],
    v: { id:"QrAG6y53Vl8", t:"Deficit Handstand Pushups Are KING!", c:"Alex Leonidas", d:500,
         r:"The original (Paul Twyman, 4,270 views) puts the hands on one step with the head going past its edge, not between two stacks, and nearly half of it is freestanding parallette and box work. The replacement (57k views, 8:20) shows the app's exact setup in most demonstration frames: hands on two raised stacks at the wall, head sinking below and between them, controlled reps. Roughly 40% of it is talking head." },
    src: ["https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic", "https://www.youtube.com/watch?v=GmKNqH83Was"],
  },
  "Freestanding Handstand Push-Ups": {
    do: [
      "Kick up to a steady freestanding handstand and settle your balance first",
      "As you bend, lean your shoulders slightly forward and let your legs drift back",
      "Touch your head lightly to form a triangle with your hands, elbows pointing back",
      "Press up and return to vertical, catching the balance with your fingers",
    ],
    avoid: [
      "Trying it before you own 5 or more wall reps and a steady handstand",
      "Arching the back to finish the press instead of pushing straight up",
    ],
    v: { id:"aAErmRDDJKY", t:"The Freestanding Handstand Push-Up", c:"CrossFit", d:46,
         r:"In the original (10:51), the first 7 minutes are desk talking-head and barbell pressing, and the freestanding HSPU itself appears in only two frames. The replacement (53k views, 0:46) is entirely one freestanding HSPU demonstration with cue captions: shoulders lean forward while the legs drift back, the head touches in front of the hands, then a full lockout, all controlled." },
    src: ["https://www.bergmovement.com/calisthenics-blog/5-handstand-push-up-mistakes-everyone-makes", "https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=t-ndl6QibSQ", "https://www.youtube.com/watch?v=h0HjqYRlXYg"],
  },
  "Tuck Hollow Hold": {
    do: [
      "Lie on your back and press your lower back flat into the floor",
      "Pull your knees in toward your chest and lift your shoulder blades, chin tucked",
      "Reach your arms along your sides toward your heels",
      "If your lower back lifts at all, pull the knees in closer until it's flat again",
    ],
    avoid: [
      "Lower back peeling off the floor",
      "Crunching up high instead of just lifting the shoulder blades",
    ],
    v: { id:"LlDNef_Ztsc", t:"Hollow Body Hold Progression - Gymnastic Core Stability Exercise", c:"GMB Fitness (Praxis)", d:140,
         r:"The FitnessFAQs original is talk for its first 3 minutes, shows the tuck only briefly at about 4:45 and has the arms overhead in most demos. GMB's hollow body progression (1.26M views, 2:20) teaches the tuck hollow from 0:28 to about 1:46: knees in, shoulders lifted, arms reaching along the sides." },
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/", "https://web.archive.org/web/20210414220511/https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine_2017"],
  },
  "One-Leg Hollow Hold": {
    do: [
      "Start in the tuck hollow: lower back pressed down, shoulders lifted, arms by sides",
      "Straighten one leg out low while the other knee stays tucked toward your chest",
      "Switch legs halfway through the hold so both sides get equal time",
      "Only lower the straight leg as far as your lower back stays flat on the floor",
    ],
    avoid: [
      "Dropping the straight leg so low that your lower back arches up",
      "Letting the tucked knee drift away from your chest",
    ],
    v: { id:"HAfUt2Cco74", t:"HOLLOW BODY HOLD Progressions (Beginner to Advanced)", c:"Zack Henderson", d:297, s:168,
         r:"FitnessFAQs only shows a one-leg hollow with arms overhead (about 6:10) and a different leg-up-vertical regression. Zack Henderson (97k views) goes from 2:48 from the tuck hollow into one knee tucked and one leg extended low, with arms along the sides. That's the app's variant, and the start time points there." },
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/"],
  },
  "Hollow Body Hold": {
    do: [
      "Lie on your back, press your lower back into the floor, arms along your sides",
      "Lift your shoulder blades and both straight legs, legs together and toes pointed",
      "Squeeze your glutes and keep your ribs pulled down toward your hips",
      "Raise your legs higher if you must: a flat lower back matters more than low feet",
    ],
    avoid: [
      "Dropping the legs so low that the lower back arches off the floor",
      "Straining the neck by lifting the head instead of the shoulder blades",
    ],
    v: { id:"44ScXWFaVBs", t:"Bodyline Drills with Antranik", c:"Antranik Kizirian", d:587, s:316,
         r:"FitnessFAQs demonstrates the hollow with arms overhead almost throughout. Antranik's Bodyline Drills (1.37M views) has a captioned hollow hold section from 5:18. It covers the arch under the lower back, lifting the shoulder blades and legs raised high then lowered only while the back stays flat, arms reaching along the sides, before the arms go overhead at about 7:25. The start time points there." },
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/", "https://web.archive.org/web/20210414220511/https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine_2017"],
  },
  "Overhead Hollow Hold": {
    do: [
      "Set up the full hollow: lower back pressed down, straight legs and shoulders lifted",
      "Reach your arms overhead, biceps by your ears, hands just off the floor",
      "Arms overhead make the lever longer, so pull your ribs down even harder",
      "If your back starts to lift, raise your arms or legs a little rather than arch",
    ],
    avoid: [
      "Lower back arching as the arms go overhead",
      "Poking the chin forward instead of keeping your head between your arms",
    ],
    v: { id:"uZqTUwq96iU", t:"The BEST HOLLOW BODY Progressions - Beginner to Advanced", c:"FitnessFAQs", d:461, s:190,
         r:"FitnessFAQs (338k views). The overhead hollow is shown from 3:15 to 3:55, with close-ups of the flat lower back, arms by the ears and legs low; later progressions are mostly overhead too. The first 3 minutes are mainly talking head, so the start time points to the demo." },
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/"],
  },
  "Hollow Body Rocks": {
    do: [
      "Get into the full hollow hold with a flat lower back and arms overhead",
      "Rock head to toe like a rocking chair, rolling from upper back to lower back",
      "Keep the exact same shape throughout; only the spot touching the floor moves",
      "If you stall, you've flattened out: round your back more instead of kicking",
    ],
    avoid: [
      "Bending at the hips or swinging the arms to keep the rock going",
      "Letting the lower back flatten or arch so you thud to a stop",
    ],
    v: { id:"0-fyNmd6jyQ", t:"Hollow Body Rock Progressions - Gymnastic Core Exercise", c:"GMB Fitness (Praxis)", d:395,
         r:"GMB (6:35) builds from the hollow hold to tuck rocks, then 'opening things up' into full rocks, with chapters on a mistake to avoid and on keeping the rock going. About half the frames are demonstrations and the rest are seated coaching. It's an established coach, and nothing it teaches contradicts the cues." },
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/"],
  },
  "Arch Hold": {
    do: [
      "Lie face down, legs together, arms along your sides",
      "Squeeze your glutes and lift your chest, arms and legs off the floor together",
      "Keep your neck long and look at the floor a little ahead, not straight up",
      "Keep your abs tight and reach long through head and toes; low and long beats high",
    ],
    avoid: [
      "Cranking the head back to look forward, which pinches the neck",
      "Bending the knees to get the feet higher",
    ],
    v: { id:"44ScXWFaVBs", t:"Bodyline Drills with Antranik", c:"Antranik Kizirian", d:587, s:468,
         r:"Tom Morrison's video only shows the arms-overhead arch, which is the next step. Antranik's Bodyline Drills has a captioned arch section from 7:48 with arms by the sides ('like a jet airplane'). The captions cover raising the legs and thighs and not cranking the neck, matching the cues. The start time points there." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20210414220511/https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine_2017", "https://antranik.org/the-bodyline-drills/", "https://www.falsegrips.com/blogs/news/superman-arch"],
  },
  "Overhead Arch Hold": {
    do: [
      "Lie face down with arms straight overhead, shoulder-width, legs together",
      "Squeeze your glutes and lift arms, chest and legs off the floor at the same time",
      "Reach your hands and feet away from each other so your body stays long",
      "Arms overhead make it harder: if your hands sink, go back to arms at your sides",
    ],
    avoid: [
      "Bending the elbows or letting the hands drop toward the floor",
      "Lifting only the upper body while the legs stay down",
    ],
    v: { id:"sQdL-b-Nrtg", t:"How to do an Arch Hold position properly! Great for CrossFit, Gymnastics, and lower back strength!", c:"Tom Morrison", d:225,
         r:"Tom Morrison, 3:45. The first 2:45 is demonstration of the overhead arch hold: arms overhead, chest and legs lifted, neck neutral. It includes regressions (wider legs, lifting the halves separately) and variations; the last minute is talking head and a product plug. Credible coach, correct form in the frames." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20210414220511/https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine_2017", "https://www.falsegrips.com/blogs/news/superman-arch"],
  },
  "Arch Body Rocks": {
    do: [
      "Get into the arch hold face down, arms overhead, glutes and back squeezed",
      "Rock forward onto your chest, then back onto your thighs, like a rocking chair",
      "Keep the same curved shape the whole time; your body rocks, it doesn't bend",
      "Start with small rocks and make them bigger only while the shape holds",
    ],
    avoid: [
      "Bending at the hips or knees to push the rock along",
      "Letting the hands or feet touch down at either end",
    ],
    v: { id:"xiD38Rkrhy0", t:"Arch Rocks", c:"PowerMonkeyFitness", d:22,
         r:"The CrossFit original is class footage shot from a distance, and the coach's demo pushes off the floor with her hands, which the cues say not to do. PowerMonkey Fitness (27k views) shows clean arch rocks: arms overhead, legs together, the shape held while rocking chest to thighs. On-screen cues cover straight arms, heels together, head neutral and uniform height. It's short at 22 s; the only longer tutorial found has 1.9k views." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://www.falsegrips.com/blogs/news/superman-arch"],
  },
  "Reverse Hyperextensions": {
    do: [
      "Lie face down on a flat bench with your hips at the end and legs hanging down",
      "Hold the bench firmly so your upper body stays still",
      "Squeeze your glutes to raise your straight legs until they're level with your body",
      "Stop at body level with your butt tucked; the lift comes from the hips, not the back",
    ],
    avoid: [
      "Swinging the legs up with momentum",
      "Lifting past body level by arching the lower back",
    ],
    v: { id:"ZeRsNzFcQLQ", t:"The Forgotten Bodyweight Exercise (REVERSE HYPER ALTERNATIVE)", c:"FitnessFAQs", d:454, s:202,
         r:"FitnessFAQs, 1.83M views. The first 3 minutes are talking head and other exercises, so the start time points to the bench demo. From about 3:23 to 6:30 he's face down with his hips at the end of the bench, raising straight legs to body level, and there's a FORM section." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20191112005020/https://www.exrx.net/WeightExercises/GluteusMaximus/BWReverseHyperextension", "https://bretcontreras.com/industry-rant-back-extensions-reverse-hypers/"],
  },
  "Weighted Reverse Hyperextensions": {
    do: [
      "Set up as for reverse hypers: face down on the bench, hips at the end",
      "Squeeze a dumbbell firmly between your feet before the legs leave the floor",
      "Raise your legs to body level with a glute squeeze, pause, then lower slowly",
      "Stop at body level with your butt tucked; don't arch to get the weight higher",
    ],
    avoid: [
      "Swinging the dumbbell up with momentum",
      "Dropping the weight fast at the bottom, which yanks on the lower back",
    ],
    v: { id:"ZeRsNzFcQLQ", t:"The Forgotten Bodyweight Exercise (REVERSE HYPER ALTERNATIVE)", c:"FitnessFAQs", d:454, s:202,
         r:"Same FitnessFAQs video, same start time (about 3:23): the straight-leg lift to body level on a bench with the hips at the end. The frames show no dumbbell. The movement is otherwise identical, and no credible dumbbell-between-feet bench version was found." },
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20200201202355/https://exrx.net/WeightExercises/GluteusMaximus/WtReverseHyperextension", "https://bretcontreras.com/industry-rant-back-extensions-reverse-hypers/"],
  },
  "Bench Shoulder Stretch": {
    do: [
      "Put your hands shoulder-width on the bench and walk back until your arms are straight",
      "Push your hips back and let your chest sink toward the floor, head between your arms",
      "Turn your elbow creases to face up to reach the lats, the big muscles down your sides",
      "Keep your ribs tucked so the stretch lands in the shoulders, not the lower back",
    ],
    avoid: [
      "Sagging the lower back and flaring the ribs, which fakes the range",
      "Forcing deeper through a pinch at the top of the shoulder",
    ],
    /* no video: The original (How To Handstand, 2,963 views) is mostly two presenters talking in a kitchen, with only about 40s of the countertop stretch in a 3:06 video, so it fails criteria 2 and 5. No credible replacement of the hands-on-bench, straight-arm version turned up. Antranik's is a wall version with an arched back, and the Barbell Physio and Tom Merrick videos are the elbows-bent butcher's-block stretch, so the written cues stand alone. */
    src: ["https://www.daniwinksflexibility.com/bendy-blog/stretches-for-overhead-shoulder-flexibility", "https://gmb.io/handstand/", "https://www.youtube.com/watch?v=IqZcA9yodrU"],
  },
};
