/* ═══════════════════════════════════════════════════════════
   WORKOUT — how to do each exercise, shown in the exercise lab.

   do      the cues, in order: set up, move, the point that matters most
   avoid   the common mistakes
   src     what the cues were written from

   How all of this was made, and how to add or change an exercise, is in
   tools/howto/README.md — run tools/howto/check.mjs after any edit.

   The cues were written for this program's exact variants — the bench
   angles, the no-rack front squat, chest-to-wall handstands, planche on
   the floor — from the coaching sources in `src`, reworded rather than
   quoted, and re-checked against those sources in Oct 2026, when each
   exercise got the animated rep in pose.js that now sits above its cues.
   The cues and the animation describe the same movement, so a change to
   one is a change to the other. Some `src` entries are YouTube links:
   those videos were read as sources; the app no longer embeds video.
   ═══════════════════════════════════════════════════════════ */
export const HOWTO = {
  "Incline Dumbbell Press": {
    do: [
      "Set the bench to 30°, sit back and kick the dumbbells up to your shoulders as you lie down",
      "Plant your feet and squeeze your shoulder blades back and down into the bench",
      "Lower to the sides of your upper chest, handles turned in a little, elbows about 45° out",
      "Get a full stretch at the bottom, then press up and slightly in until over your shoulders",
    ],
    avoid: [
      "Flaring your elbows straight out to the sides, which loads the shoulder joint",
      "Letting your shoulders roll forward off the bench as you press",
    ],
    src: ["https://exrx.net/WeightExercises/PectoralClavicular/DBInclineBenchPress", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips"],
  },
  "Dumbbell Bench Press": {
    do: [
      "Sit on the end of a flat bench, dumbbells on your thighs, and kick them up as you lie back",
      "Feet flat, shoulder blades pulled back and down, a small natural arch in your lower back",
      "Lower beside your mid-chest, forearms upright, handles angled in a bit, elbows about 45°",
      "Go deep enough to stretch your chest, then press up in a slight arc to over your chest",
    ],
    avoid: [
      "Elbows flared out to 90°, which shifts work to the front of the shoulders",
      "Stopping the dumbbells high above your chest instead of using the full range",
    ],
    src: ["https://exrx.net/WeightExercises/PectoralSternal/DBBenchPress", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/"],
  },
  "Dumbbell Shoulder Press": {
    do: [
      "Set the bench back nearly upright (about 85°) and sit with your lower back against the pad",
      "Dumbbells at shoulder height, palms forward but angled in a little, wrists over elbows",
      "Press up and slightly in until your arms are straight overhead, then lower with control",
      "Keep elbows a little in front of your body and bring the weights back to shoulder level",
    ],
    avoid: [
      "Sliding your hips forward and leaning back, which turns it into an incline press",
      "Cutting reps short at the bottom instead of lowering to shoulder height",
    ],
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
    src: ["https://exrx.net/WeightExercises/PectoralSternal/DBFly", "https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips"],
  },
  "Overhead Tricep Extensions": {
    do: [
      "Set the back pad to 55° and sit back, head near its top edge so the weight can clear it",
      "Hold one dumbbell upright in both hands, palms flat under the top plate, arms straight up",
      "Keep your elbows pointing up beside your head and bend only there to lower it behind you",
      "Sink into a deep stretch at the bottom, pause, then press up to just short of lockout",
    ],
    avoid: [
      "Letting your elbows flare wide, which cuts the stretch and strains the elbows",
      "Sliding down the pad or arching your back off it to shove the weight up",
    ],
    src: ["https://exrx.net/WeightExercises/Triceps/DBTriExt", "https://muscularstrength.com/article/how-to-overhead-extension-powerbomb", "https://www.strongerbyscience.com/research-spotlight-triceps/", "https://motra.com/exercises/dumbbellInclineTricepExtension"],
  },
  "Preacher Curls": {
    do: [
      "Set the back to 45°; kneel or stand behind it, whichever puts your armpit at the top edge",
      "Drape one arm over the top so the back of your upper arm lies flat on the pad",
      "Curl until your forearm is about vertical, keeping your upper arm pressed into the pad",
      "Lower slowly to an almost straight arm; control the bottom, where the pull is hardest",
    ],
    avoid: [
      "Letting the dumbbell drop quickly at the bottom, which stresses the elbow",
      "Lifting your elbow or shoulder off the pad to swing the weight up",
    ],
    src: ["https://exrx.net/WeightExercises/Brachialis/DBPreacherCurl", "https://www.strengthlog.com/dumbbell-preacher-curl/"],
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
    src: ["https://exrx.net/WeightExercises/Quadriceps/DBSingleLegSplitSquat", "https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat"],
  },
  "Heel-Elevated Front Squats": {
    do: [
      "Clean the bar up from the floor: flat back, bar close, then whip your elbows under it",
      "Step your heels onto plates or a wedge, never the dumbbells; bar on your shoulders",
      "Sit straight down between your heels, letting your knees travel forward over your toes",
      "Keep your elbows high the whole way; if they drop, your back rounds and the bar slides",
    ],
    avoid: [
      "Heaving a clean with a rounded back; if the clean is a struggle, use less weight",
      "Dropping the bar after the set; lower it to your thighs first, then to the floor",
    ],
    src: ["https://squatuniversity.com/2016/04/07/how-to-perfect-the-front-squat/", "https://exrx.net/WeightExercises/Quadriceps/BBFrontSquat", "https://exrx.net/WeightExercises/OlympicLifts/PowerClean", "https://www.strongerbyscience.com/how-to-squat/", "https://www.seannal.com/articles/training/no-squat-rack.php"],
  },
  "Heel-Elevated Goblet Squats": {
    do: [
      "Heels on a wedge or a sturdy board 1-2 in high, never the dumbbells; feet shoulder-width",
      "Cup the top end of one dumbbell in both hands, held tight against your chest",
      "Sit straight down between your heels, letting your knees travel forward past your toes",
      "Keep your chest tall and the dumbbell touching it; go as deep as you can control",
    ],
    avoid: [
      "Letting the dumbbell drift away from your chest, which tips you forward",
      "Knees caving inward; keep them pointing the same way as your toes",
    ],
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
    src: ["https://exrx.net/WeightExercises/Hamstrings/DBStrBackStrLegDeadlift", "https://www.trainuntamed.com/how-to-romanian-deadlift-prevent-back-pain/"],
  },
  "Single-Leg Calf Raises": {
    do: [
      "Flat bench by a wall; stand on the back pad, not the seat gap, one foot, heel off the side",
      "Dumbbell in the hand on the working side, other hand on the wall, knee straight",
      "Rise as high as you can onto your big toe and hold the top for a moment",
      "Lower over 2 to 3 seconds until the heel sinks below the bench; pause there",
    ],
    avoid: [
      "Standing on the end of the bench, where your weight can tip it up",
      "Quick, bouncy half reps that let your Achilles tendon do the work",
    ],
    src: ["https://exrx.net/WeightExercises/Gastrocnemius/DBSingleLegCalfRaise", "https://www.nasm.org/resource-center/blog/training/calf-training-how-to-program-this-stubborn-muscle-group-for-clients"],
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
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20200201235738/https://www.exrx.net/WeightExercises/RectusAbdominis/WtHangingLegHipRaise", "https://web.archive.org/web/20191216110207/https://www.exrx.net/WeightExercises/RectusAbdominis/BWHangingLegHipRaise", "https://zackhenderson.com/how-to-hanging-leg-raise-beginner-to-advanced-progressions", "https://builtwithscience.com/fitness-tips/how-to-work-lower-abs/"],
  },
  "Decline Reverse Crunches": {
    do: [
      "Set the bench to decline and lie on it head-up: head at the high end, hips lower",
      "Reach back and grip the bench behind your head; bend hips and knees to about 90°",
      "Curl your pelvis up toward your chest until your hips lift off the pad",
      "Roll the hips up rather than swinging the legs, and lower slowly against the slope",
    ],
    avoid: [
      "Swinging the legs to fling the hips up, which turns it into a hip flexor exercise",
      "Rolling back until your knees pass your face, where gravity starts doing the work",
    ],
    src: ["https://web.archive.org/web/20191212052802/https://www.exrx.net/WeightExercises/RectusAbdominis/BWLyingLegHipRaise", "https://learn.athleanx.com/articles/abs-for-men/how-to-do-reverse-crunches", "https://www.youtube.com/watch?v=wLVwiAlIZGQ"],
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
    src: ["https://exrx.net/WeightExercises/BackGeneral/DBLyingRow", "https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips"],
  },
  "Dumbbell Pullovers": {
    do: [
      "Lie along a flat bench, feet flat; wrap both hands around the handle of one dumbbell",
      "Press it up over your chest with a slight bend in your elbows; keep that bend all rep",
      "Lower it behind your head in an arc until your upper arms are about in line with your body",
      "Pull it back over your chest; go only as deep as you can without your lower back arching",
    ],
    avoid: [
      "Holding an adjustable dumbbell by its plates: grip the handle so a loose plate can't drop",
      "Bending and straightening your elbows, which turns it into a triceps exercise",
    ],
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
    src: ["https://hellostrength.com/2019/04/29/exercise-of-the-week-b-stance-hip-thrusts/", "https://bretcontreras.com/how-to-hip-thrust/"],
  },
  "Nordic Curl Negatives": {
    do: [
      "Kneel on a pillow, heels under something heavy like a couch, or held by a partner",
      "Squeeze your glutes so your knees, hips and shoulders make one straight line",
      "Lean forward as slowly as you can, pulling your heels up into the anchor",
      "When you can't slow the fall any more, catch yourself with your hands and push back up",
    ],
    avoid: [
      "Bending at the hips as you go down, which takes the load off the hamstrings",
      "Going to failure the first week; Nordics cause big soreness, so start a few reps short",
    ],
    src: ["https://e3rehab.com/how-to-perform-nordic-hamstring-curls/", "https://www.youtube.com/watch?v=_e9vFU9-tkc"],
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
    src: ["https://www.yuri-mar.com/blog/2018/6/20/handstand-wall-walk", "https://gmb.io/handstand/", "https://gmb.io/freestanding-handstand/", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands", "https://www.youtube.com/watch?v=fj6lKSg5bSM"],
  },
  "Wall Toe Pulls": {
    do: [
      "Walk up into your chest-to-wall handstand, hands about one hand-length from the wall",
      "Stay tall and tight: arms locked, push the floor away, ribs tucked, glutes squeezed",
      "Shift shoulders and hips a touch over your hands, away from the wall, till toes go light",
      "Let your toes float a second or two, balancing with your fingers, then touch back",
    ],
    avoid: [
      "Kicking or bucking the legs off the wall instead of shifting your whole body",
      "Letting the hips lean into the wall or the lower back sag into an arch",
    ],
    src: ["https://www.subyhandstands.com/suby-handstands-blog/2024/1/24/how-to-do-toe-pulls-correctly", "https://gmb.io/freestanding-handstand/", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands", "https://join.ganbarumethod.com/handstand-drills-to-get-you-off-the-wall/"],
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
    src: ["https://gmb.io/handstand/", "https://gmb.io/freestanding-handstand/", "https://www.yuri-mar.com/blog/2023/9/1/techniquesconcepts-to-hold-your-handstand-longer", "https://www.yuri-mar.com/blog/2024/1/3/handstands-to-grip-or-not-to-grip", "https://www.bergmovement.com/calisthenics-blog/a-complete-beginners-guide-to-handstands"],
  },
  "Straddle Press to Handstand": {
    do: [
      "Stand in a wide straddle, fold forward and plant your hands shoulder-width",
      "Round your upper back, lock your arms and lean your shoulders forward past your hands",
      "Rise onto your toes and keep leaning until your feet float up; don't hop",
      "Raise your hips up over your hands; close the legs only once hips and back are stacked",
    ],
    avoid: [
      "Jumping off the floor instead of leaning until the feet lift on their own",
      "Bending the elbows to muscle the hips up",
    ],
    src: ["https://gmb.io/press-handstand/", "https://www.bergmovement.com/calisthenics-blog/how-to-press-handstand", "https://www.youtube.com/watch?v=OzAp-qoepnE", "https://lostartofhandbalancing.com/tag/yuri-marmerstein"],
  },
  "One-Arm Handstand": {
    do: [
      "Hold a steady straddle handstand, hands about shoulder-width, arms locked",
      "Tilt your hips sideways toward one hand until most of your weight is on it",
      "Lighten the other hand in stages: flat, fingertips, one finger, then hovering",
      "Keep the body square and the support arm pushing tall as the free hand lifts",
    ],
    avoid: [
      "Throwing the free arm out before your weight is truly over the support hand",
      "Letting the hips swing sideways or the body twist as the hand lifts",
    ],
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
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://stevenlow.org/overcoming-gravity/", "https://docs.google.com/spreadsheets/d/19l4tVfdTJLheLMwZBYqcw1oeEBPRh8mxngqrCz2YnVg/", "https://gmb.io/planche/"],
  },
  "Full Planche": {
    do: [
      "Hands shoulder-width, fingers angled out, elbows locked, shoulders far past your hands",
      "Extend both legs straight back, pressed together, body level with the floor",
      "Lean further than in the half-lay: straight legs put more weight behind your hands",
      "Hold one straight line head to toe: floor pushed away, shoulders down, glutes tight",
    ],
    avoid: [
      "Bending the elbows to stay up; the planche is a straight-arm hold",
      "Piking at the hips or letting the legs sag below body level",
    ],
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
    src: ["https://antranik.org/shoulder-mechanics/", "https://www.youtube.com/watch?v=_yZwclVfqzE", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/"],
  },
  "Arch Hangs": {
    do: [
      "Hang with straight arms and pull your shoulders down, away from your ears",
      "Then press the bar down toward your hips so your chest rises toward the bar",
      "Arch your upper back as the chest lifts, and hold the top for a second or two",
      "Arms stay straight: the lift comes from pulling your arms down, not bending them",
    ],
    avoid: [
      "Bending your elbows and rowing yourself up instead of arching",
      "Arching only the lower back or kicking the legs forward to fake the lift",
    ],
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
    src: ["https://antranik.org/progression-exercises-for-static-holds/", "https://en.wikipedia.org/wiki/Front_lever", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://blog.calimove.com/2026/09/15/front-lever-progression/", "https://www.youtube.com/watch?v=_qNRNyI3qxM", "https://www.youtube.com/watch?v=sDz16P6gdkk"],
  },
  "Half-Lay Front Lever": {
    do: [
      "Hang with locked arms and press the bar toward your hips until your body is level",
      "Bring your knees together and bend them to about a right angle, shins hanging down",
      "Unlike the straddle, legs stay together: open the hips so thighs line up with your body",
      "Squeeze glutes and knees: shoulders, hips and knees in one straight, level line",
    ],
    avoid: [
      "Bending at the hips, which turns it back into an advanced tuck",
      "Arching your lower back or letting your knees drift apart",
    ],
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
    src: ["https://exrx.net/WeightExercises/LatissimusDorsi/BWUnderhandChinup", "https://www.youtube.com/watch?v=qV7vOUcUfD4", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/"],
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
      "Dropping your head to touch the nose down before your chest gets there",
    ],
    src: ["https://exrx.net/WeightExercises/PectoralClavicular/BWDeclinePushup", "https://web.archive.org/web/20230120034311/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/pushup", "https://www.nasm.org/resource-center/exercise-library/decline-push-up"],
  },
  "Archer Push-Ups": {
    do: [
      "Set your hands about twice shoulder width, fingers forward or turned slightly out",
      "Lower toward one hand, bending that elbow, while the other arm straightens to the side",
      "Keep the far arm straight: it helps a little, but the bent arm does most of the work",
      "Stay one straight, level line; shift sideways over the working hand without twisting",
    ],
    avoid: [
      "Bending the straight arm, which splits the load and makes it a wide push-up",
      "Twisting the hips or letting them sag as you shift to one side",
    ],
    src: ["https://exrx.net/WeightExercises/PectoralSternal/BWArcherPushup", "https://www.hybridcalisthenics.com/pushups", "https://gmb.io/push-up-variations/"],
  },
  "Incline One-Arm Push-Ups": {
    do: [
      "One hand on the bench edge under your chest, feet wide apart, free hand behind your back",
      "This is the first one-arm step: brace your whole body as if someone's trying to roll you",
      "Lower your chest to the bench with the elbow tucked to your side, then press up",
      "Keep shoulders and hips square to the bench; the incline eases the load, not the form",
    ],
    avoid: [
      "Twisting the chest open to shorten the push",
      "Letting the working elbow flare out wide from your side",
    ],
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
    src: ["https://antranik.org/hspu-tutorial-yaad/", "https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=XAHwDyghog8"],
  },
  "Elevated Pike Push-Ups": {
    do: [
      "Toes on the edge of the bench, hands on the floor shoulder-width, hips high",
      "Set your hands so the hips bend to about 90 degrees, legs straight; same spot every set",
      "Lower your head to the same triangle point in front of your hands, elbows pointing back",
      "Raised feet put more of your weight on your hands; that, not a vertical torso, is the step",
    ],
    avoid: [
      "Hands too far from the bench, so the hips drop and the rep turns into a push-up",
      "Walking the hands in so close that the hips fold past 90 degrees and the back rounds",
    ],
    src: ["https://antranik.org/hspu-tutorial-yaad/", "https://gmb.io/handstand-push-up/", "https://www.youtube.com/watch?v=q4XaCYt0z6M", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic", "https://antranik.org/?p=5974"],
  },
  "Wall Handstand Push-Up Negatives": {
    do: [
      "Walk up chest to the wall, hands shoulder-width and about a foot from it, arms locked",
      "Lean your shoulders slightly toward the wall and bend your elbows back, not out",
      "Lower on a slow 3-5 second count until your head touches the floor in front of your hands",
      "Control the last few inches, the hardest part, then step down and walk up for the next one",
    ],
    avoid: [
      "Speeding up and flopping through the bottom half of the lowering",
      "Flaring the elbows out wide to the sides",
    ],
    src: ["https://gmb.io/handstand-push-up/", "https://antranik.org/hspu-tutorial-yaad/", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic", "https://bibleofcalisthenics.substack.com/p/wall-handstand-push-up-progression"],
  },
  "Wall Handstand Push-Ups": {
    do: [
      "Walk up chest to the wall as for the negatives, hands about a foot from it, arms locked",
      "Lower under control until your head touches the floor in front of your hands",
      "Press the floor away, elbows pointing back, until your arms lock out again",
      "The press is what's new: drive up with the arms alone, body straight, no kick",
    ],
    avoid: [
      "Arching the back or bending the knees to kick the rep up",
      "Flaring the elbows out wide to grind the rep out",
    ],
    src: ["https://gmb.io/handstand-push-up/", "https://www.bergmovement.com/calisthenics-blog/5-handstand-push-up-mistakes-everyone-makes", "https://stevenlow.org/myth-busting-the-differences-in-scapular-positioning-for-bodyweight-and-barbell-exercises-and-cuing-versus-technique/", "https://www.youtube.com/watch?v=n2LuZBT1vr8", "https://www.youtube.com/watch?v=PDKmh0OJ6Ic", "https://bibleofcalisthenics.substack.com/p/wall-handstand-push-up-progression"],
  },
  "Deficit Wall Handstand Push-Ups": {
    do: [
      "Stack stable books or yoga blocks for each hand, never the dumbbells, which roll",
      "Walk up chest to the wall with one hand flat on each stack, stacks about a foot out",
      "Lower until your head sinks below your hands, between the stacks, then press up",
      "Start with a small height and raise it only when every rep reaches full depth",
    ],
    avoid: [
      "A deficit so tall you can't control the bottom or press back out",
      "Wobbly or sliding stacks; test them before you go upside down",
    ],
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
      "Lowering straight down with no shoulder lean, which flares the elbows and tips you",
      "Arching the back to finish the press instead of pushing straight up",
    ],
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
    src: ["https://gmb.io/hollow-body/", "https://antranik.org/hollow-body-position-importance/"],
  },
  "Hollow Body Rocks": {
    do: [
      "Get into the full hollow hold with a flat lower back and arms overhead",
      "Rock head to toe like a rocking chair, rolling from upper back to lower back",
      "Keep the exact same shape throughout; only the spot touching the floor moves",
      "If the rock stalls, your curve has gone flat: tighten the abs, don't kick or swing",
    ],
    avoid: [
      "Bending at the hips or swinging the arms to keep the rock going",
      "Letting the lower back arch out of the curve, so the rock thuds to a stop",
    ],
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
    src: ["https://web.archive.org/web/20241209171330/https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core", "https://web.archive.org/web/20200201202355/https://exrx.net/WeightExercises/GluteusMaximus/WtReverseHyperextension", "https://bretcontreras.com/industry-rant-back-extensions-reverse-hypers/"],
  },
};
