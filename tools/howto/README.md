# Exercise how-to: method and tools

Every exercise the Workout app can show has a **How to** section in its
exercise lab: a 3D animation of one rep at the top, then three or four
written cues and one or two mistakes to avoid. The cues live in
[`apps/workout/howto.js`](../../apps/workout/howto.js) and the animations in
[`apps/workout/moves.js`](../../apps/workout/moves.js), both keyed by
exercise name. The animation pipeline is four small files:
[`timeline.js`](../../apps/workout/timeline.js) turns a loop of poses into a
pose for any moment, [`rig.js`](../../apps/workout/rig.js) turns a pose into a
3D body, [`stage.js`](../../apps/workout/stage.js) draws it with three.js
(vendored in `assets/vendor/three/`), and
[`pose.js`](../../apps/workout/pose.js) puts it in the lab. This folder holds
the method they were made with and the tools that check them, so the same
standard holds when the program changes.

**After any change to the program, `howto.js`, or any of the animation files:**

```bash
node tools/howto/check.mjs --anim
```

It lists every exercise with no how-to or no animation (including ladder
steps you have not reached yet), every entry whose exercise is gone, cues
that are malformed or too long, and any animation that names a pose it does
not have or builds a frame with NaN in it. With `--anim` it also plays every
rep at 120 frames a second and names any joint that goes through the floor,
any planted hand or foot off its mark, and anything that jumps between
frames rather than moving.

Then look at the animations: serve the repo root and open
`/tools/howto/anim` (see [Checking the animations](#checking-the-animations)).

---

## What a how-to entry looks like

```js
"Frog Stand": {
  do: [                                   // 3–4 cues, ≤ 90 characters each, in order:
    "Squat, hands flat and shoulder-width …",   //   set up →
    "Bend your elbows and rest your knees …",   //   move →
    "Lean forward slowly until …",
    "Balance with your fingers: …",             //   the one point that matters most
  ],
  avoid: [ "Staring straight down …", "Jumping the feet up …" ],   // 1–2
  src: [ "https://…" ],                          // what the cues were written from
},
```

The key must match the exercise's `n` exactly, as written in `data.js`
(program entries, `alt`s and every ladder step).

---

## Writing the cues

1. **Write for this program's exact variant.** The cues describe what *this*
   app prescribes: bench angles (30° incline, 55° overhead extension, 85°
   shoulder press), the no-rack front squat cleaned from the floor,
   chest-to-wall handstands, planche on the floor, dumbbells that must never
   be used as deficit blocks or held by their plates. Read the entry and its
   comment in `data.js` first.
2. **Use reputable sources, reworded.** Coaching and evidence sources:
   ExRx, Stronger By Science, Squat University, Jeff Nippard, Renaissance
   Periodization, Bret Contreras for hip thrusts, and for bodyweight work
   Steven Low's *Overcoming Gravity*, GMB, the r/bodyweightfitness wiki,
   Antranik, FitnessFAQs, Yuri Marmerstein. Write the cues in your own words
   and never paste sentences. Where sources disagree, take the mainstream
   position. List what you read in `src`.
3. **Order them: set up → move → the point that matters most.** Plain
   language. When a term needs explaining, explain it in a few words.
4. **On a ladder, say what is new at this step.** "The flat back is this
   step", "no elbow shelf now", so each step reads as a change from the one
   below it.
5. **Avoid lines are the common mistakes,** the ones that cost the exercise
   its point or put a joint at risk, not every possible fault.
6. **The cues and the animation describe the same rep.** If a cue says the
   hands go a foot from the wall, the animation's hands go a foot from the
   wall; if a cue says "lower over 2 to 3 seconds", the tempo's lowering
   phase is 2 to 3 seconds. Change one, change the other.

## Animating an exercise

An entry in `moves.js` is a few **poses** and a **tempo** that walks
between them. The full list of keys is at the top of `rig.js`, and the
entry keys at the top of `moves.js`. In short:

- **Angles are side-view angles** in the body's own front-to-back plane
  (0 forward, 90 up, 270 down), absolute rather than relative to the
  parent joint, so a pose reads straight off. The **third dimension** comes
  from abduction (`uab`, `lab`: out to the side, as in a lateral raise or
  a straddle), `twist` of the shoulders, grip widths and other sideways
  offsets given as a third number, and, for a body lying on its side,
  `bodyF`/`bodyU`.
- **Plant what is planted.** Hands on the floor or a bar, feet on the floor
  or a bench: give them a `hand`/`foot` target, or hang the pose from that
  joint with `root`/`at`, so they stay put while the rest moves. The elbow
  or knee is solved to reach; `ep`/`kp` say which way it points when the
  reach leaves the side-view plane.
- **Name the pad the body rests on** with `rest` (`'back'`, `'seat'`, or
  `'pad'` for whichever the trunk is over). The 3D body is thicker than
  the rig's figure, so `stage.js` fits it to the kit before each pose is
  solved: up off the floor, then the trunk onto the named pad (nearer or
  farther) and out of any other, with planted hands and feet left on
  their marks and marks on the body (hands on a dumbbell at the hips)
  carried along. The fit is worked out across the rep and smoothed, so
  nothing jumps. Without `rest`, pads only push skin out.
- **The scene is the program's kit at the program's settings:** the bench
  at the angle `data.js` names (end-on with `yaw: 90` when the body crosses
  it), the wall on the side the cues put it, books rather than dumbbells
  under the hands, the Nordic anchor over the heels. A wall between the
  camera and the figure fades to a ghost on its own.
- **The tempo is the cues' tempo,** in phases with one-word labels (Lower,
  Stretch, Press …). Holds get Enter / Hold / Exit and stay under about 8 s.
  `timeline.js` moves smoothly through the keyframes, takes the short way
  round between angles, and fades planted hands and feet in and out, so
  write poses, not transitions.
- **Paint the working muscle** (`hi`) and the helpers (`hi2`), the same
  ones `data.js` lists first; `peak` names the contracted position, where
  the paint glows brightest.
- **`still`** is the frame reduced-motion users see; **`cam`** the starting
  view (`az` round from the near side toward the front, `el` height).

### Getting the body right

Each of these was a real bug in an animation that looked fine in one
frame and wrong in motion or from another side.

- **Bend joints the way they bend.** A shin turns toward the back of the
  thigh, a forearm toward the front of the upper arm. Angles are absolute,
  so it is easy to write a knee tucked *behind* the body: hanging with the
  knees to the chest is `th: 30` (forward and up), not `150`. Hips go back
  about 45° at most and fold about 145° at most (knees to the chest). Run
  `joints.mjs` (below).
- **Between keyframes every angle takes the short way round.** If a limb
  has to come back the way it went (the kicking leg of a kick-up), put
  the pose it passes through into the tempo on the way back as well.
- **Aim elbows and knees that leave the side plane** with `ep`/`kp`, a
  world vector: a handstand push-up's elbows go back and out about 45°
  (`ep: [0.7, 0, 1]`), not straight back; hands gripping a bench behind
  the head have the elbows up (`eb: 1`).
- **Planted or carried.** A `hand`/`foot` mark within 18 of the floor or 4
  of any kit part is planted and stays put when the body is fitted to the
  kit; any other mark (both hands on a dumbbell across the hips, cupping a
  goblet dumbbell at the chest) moves with the body. Keep a planted mark
  well inside that, not on the edge, or it flickers between the two.
- **Declare the pad the trunk rests on (`rest`)** and do not hand-tune for
  the body's thickness: the 3D body's back is about 12 behind its hip
  joint, and the fit puts it on the pad. But give the fit a pose that can
  touch: a body leaning on the back pad with its hips inside the seat
  cannot rest on both, so move the pose (the chest-supported row's hips
  sit 10 up the incline).
- **Kit sizes are what the poses were drawn against:** a bench pad is 14.7
  deep, so a seat at `y: 161` has its top 40.3 above the floor (screen y
  153.7); a mat is 1.2 thick; a wedge is high under the heels.
- **Feet:** a foot mark is the ankle. Flat on the floor it is `ANK`; up on
  the balls of the feet about 12 above the floor (screen ~182). Do not
  point a foot into the floor: the body's foot is longer than the rig's
  and its toes are turned clear of the floor, which reads as a twitch if
  the foot has to turn far.
- **Check the form against the cues and their sources** (rule 6 above),
  from the side and from the front: a lateral raise looks right from the
  side long after it has drifted 30° forward.

## Checking the animations

`tools/howto/anim.html` shows every animation frame by frame in 3D. Serve
the repo root with any static server and open `/tools/howto/anim` (the
app's own dev server drops the `.html` and the query with it, so leave it
off):

```
/tools/howto/anim?q=press,curl      only names containing these
/tools/howto/anim?i=0&n=12          a slice of the list, in program order
/tools/howto/anim?w=300&h=200       frame size
/tools/howto/anim?az=90&el=10       look from another angle
/tools/howto/anim?theme=light       any theme in assets/css/themes.css
/tools/howto/anim?play              the live loops, as the lab shows them
```

Add `&model=athlete` to see the muscular body the anatomy bench uses,
which is thicker than the trainer and shows contact problems first.

Look for: a limb through a bench, a wall or the body; an elbow or knee
bending the wrong way (flip `eb`/`kb`, or give `ep`/`kp`); kit in the wrong
hand or at the wrong angle; a body hovering over the pad it should lie on;
a view that hides the movement. Then open the exercise in the app on a
phone-width screen and watch one loop.

Three checks catch what a still frame hides:

```bash
node tools/howto/joints.mjs "Exercise Name"   # joints past their range, in the rig
```

and, in the anatomy bench's console (`/tools/anatomy/`, see its README),
`S.scan(name)` for the body going into the kit and `S.snaps(name)` for
anything that jumps or flips between frames (under about 4 is motion; 10
or more needs a look). `joints.mjs` flags a few on purpose: the frog
stands fold the hips that far, and a handstand push-up's elbows read
backward for a moment as they flare.

## The trainer

The figure is a real human model, Male_Adult_01 from Microsoft's
[Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) library (MIT;
the license is in `assets/models/trainer/`).
[`avatar.js`](../../apps/workout/avatar.js) loads it once and dresses the
rig with it: every bone sits on the rig's joint, so nothing about a pose
changes, and the checks above hold for the trainer as they do for the rig.
What the rig cannot say, avatar.js decides: which way the palms face (from
what the hand holds, or the entry's `palm`) and whether the fingers wrap a
handle, lie flat or hang loose. If the model fails to load, the drawn
mannequin in stage.js stands in.

To rebuild it (another Rocketbox avatar, other kit colours):

```bash
node tools/howto/trainer/convert.mjs Male_Adult_01.fbx assets/models/trainer <three r160 examples/jsm>
python tools/howto/trainer/textures.py <the avatar's Textures folder> assets/models/trainer
```

`convert.mjs` bakes the mesh into its A-pose, folds the face bones into
the head and packs it into `trainer.bin`; `textures.py` recolours the shirt
and shorts and writes web-sized textures. The rig's segment lengths
(`SEG`, `BODY` in rig.js) are the model's own; if you change the model,
measure its bones and update them, then run `check.mjs --anim`.

### The athlete

`assets/models/athlete/` is an anatomical sculpt (CC-BY, credited in its
LICENSE.md) with the trainer's head and hands grafted on. It is what the
app draws: the how-to rep (`stage.ready()` loads it, falling back to the
trainer if it cannot) and the 3D muscle map in each exercise card
([`muscleview.js`](../../apps/workout/muscleview.js)), both lit from the
same muscle regions ([`muscles3d.js`](../../apps/workout/muscles3d.js)) the
anatomy bench (`tools/anatomy/`) shows. `?model=trainer` in the gallery
shows the old figure. To rebuild it:

```bash
# 1. reduce the sculpt (Sketchfab "Male body", glTF download) to ~300k triangles,
#    keeping the sculpt's own smooth normals (needs: npm install meshoptimizer@0.22.0)
node tools/howto/trainer/reduce.mjs <scene.gltf> body.json 300000
# 2. dump the body and bones, let Blender work out the skin weights
DUMP_FOR_BLENDER=for_blender.json node tools/howto/trainer/build_athlete.mjs body.json assets/models/trainer x
blender --background --factory-startup --python tools/howto/trainer/blender_weights.py -- for_blender.json heat_weights.json
# 3. build
HEAT_WEIGHTS=heat_weights.json node tools/howto/trainer/build_athlete.mjs body.json assets/models/trainer assets/models/athlete
```

The body is about 300,000 triangles (the sculpt's 1.37 million, reduced),
and it keeps the sculpt's own normals: normals worked out again from the
reduced triangles shade blotchy. At the neck the body is drawn onto the
head's surface over its last 6 cm and runs on under the head's skin, so
the join has no seam or gap. `blender_bake.py` can bake the full sculpt
into a normal map for a much lighter body; at 300k there is too little
left to bake to be worth it.

Blender's heat-diffusion weights are what keep the shoulders and armpits
whole with the arms overhead; each shoulder also has a helper joint that
swings half as far as the arm (half its swing, not half its whole turn,
which flips sides with the arm overhead). The hand-edited shorts are re-applied from
`shorts_shape.json` on every build (the build reports how many points it
applied); their texture is `assets/models/athlete/shorts.jpg`.

## Adding or changing an exercise

1. Change `data.js` as usual.
2. Run `node tools/howto/check.mjs`. It names every exercise now missing a
   how-to or an animation, and every entry whose exercise is gone.
3. **Renamed exercise:** move both entries to the new key if the movement is
   the same. **New exercise:** write the cues (above), then its animation,
   following [Getting the body right](#getting-the-body-right); the nearest
   existing entry on the same kit is the best starting point.
4. Run `check.mjs --anim` and `joints.mjs` on it; in the anatomy bench run
   `S.scan` and `S.snaps` on it.
5. Look at it in the gallery with `&model=athlete`, from the side and the
   front, and in the app.

## How the current content was made

- **September 2026:** six agents each wrote cues for one group of exercises
  from the sources listed in each entry's `src`, and a second, independent
  pass read every cue again for correctness and safety. Each entry also had
  a reviewed YouTube video then.
- **October 2026:** the videos were replaced by animations drawn in code,
  first as side views and then rebuilt in 3D.
  Four research passes re-checked every exercise's technique against its
  sources and against its own cues; 21 entries changed (among them the
  overhead extension moving to a 55° back pad, the wall handstand push-up
  line agreeing on chest-to-wall, and the pullover gripping the handle, not
  the plates). Each pass also described the key positions and tempo of
  every rep, and the animations were built from those and checked frame by
  frame in the gallery.
- **Mid-October 2026,** with the muscular body: the body is fitted to the
  kit before each pose is solved (the `rest` key), and a review of
  thirteen flagged exercises against their cues fixed, among others, the
  overhead extension (upper arms straight up), the preacher curl (upper
  arm flat on the pad), the lateral raise (out to the sides, not forward),
  the heel-elevated squats (the wedge was high under the toes) and the
  front lever (the hang tucked the knees behind the body). `joints.mjs`
  and the bench's `snaps` scan came out of that pass.
