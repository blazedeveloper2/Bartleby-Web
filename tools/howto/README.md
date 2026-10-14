# Exercise how-to: method and tools

Every exercise the Workout app can show has a **How to** section in its
exercise lab: an animated rep at the top, then three or four written cues
and one or two mistakes to avoid. The cues live in
[`apps/workout/howto.js`](../../apps/workout/howto.js) and the animations in
[`apps/workout/moves.js`](../../apps/workout/moves.js), both keyed by
exercise name; [`apps/workout/pose.js`](../../apps/workout/pose.js) draws
them. This folder holds the method they were made with and the tools that
check them, so the same standard holds when the program changes.

**After any change to the program, `howto.js`, `moves.js` or `pose.js`:**

```bash
node tools/howto/check.mjs
```

It lists every exercise with no how-to or no animation (including ladder
steps you have not reached yet), every entry whose exercise is gone, cues
that are malformed or too long, and any animation that names a pose it does
not have or draws a frame with NaN in it.

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
between them. A pose is joint angles (degrees, absolute, 0 = the way the
figure faces, 90 = up) or targets for planted hands and feet; the engine
solves the elbows and knees. The full list of pose keys is at the top of
`pose.js`, and the entry keys at the top of `moves.js`. In short:

- **Side view** for movements that go front-to-back (almost everything).
  **Front view** (`view: 'front'`) when the arms or body move side-to-side
  and a side view would show them swinging at the camera: lateral raises,
  flyes (from above), reverse flyes, pull-ups, the side plank, archer
  push-ups, the one-arm handstand.
- **Plant what is planted.** Hands on the floor or a bar, feet on the floor
  or a bench: give them a `hand`/`foot` target, or hang the pose from that
  joint with `root`/`at`, so they stay put while the rest moves.
- **The scene is the program's kit at the program's settings:** the bench at
  the angle `data.js` names, the wall on the side the cues put it, books
  rather than dumbbells under the hands, the Nordic anchor over the heels.
- **The tempo is the cues' tempo,** in phases with one-word labels (Lower,
  Stretch, Press …). Holds get Enter / Hold / Exit and stay under about 8 s.
- **Light the working muscle** (`hi`) and the helpers (`hi2`), the same ones
  `data.js` lists first for the exercise.
- **`still`** is the frame reduced-motion users see: the position the cues
  care most about, usually the bottom of the stretch or the hold.

## Checking the animations

`tools/howto/anim.html` shows every animation frame by frame. Serve the repo
root with any static server and open `/tools/howto/anim` (the app's own dev
server drops the `.html` and the query with it, so leave it off):

```
/tools/howto/anim?q=press,curl      only names containing these
/tools/howto/anim?i=0&n=12&h=170    a slice of the list, frame height
/tools/howto/anim?theme=light       any theme in assets/css/themes.css
/tools/howto/anim?play              the live loops instead of frames
```

Look for: limbs through the floor, the bench or the wall; a planted hand or
foot that floats; elbows or knees bending the wrong way (flip `eb`/`kb`);
kit drawn on the wrong side of an arm; a figure too small in its frame. Then
open the exercise in the app on a phone-width screen and watch one loop.

## Adding or changing an exercise

1. Change `data.js` as usual.
2. Run `node tools/howto/check.mjs`. It names every exercise now missing a
   how-to or an animation, and every entry whose exercise is gone.
3. **Renamed exercise:** move both entries to the new key if the movement is
   the same. **New exercise:** write the cues (above), then its animation.
4. Check it in the gallery and in the app.

## How the current content was made

- **September 2026:** six agents each wrote cues for one group of exercises
  from the sources listed in each entry's `src`, and a second, independent
  pass read every cue again for correctness and safety. Each entry also had
  a reviewed YouTube video then.
- **October 2026:** the videos were replaced by animations drawn in code.
  Four research passes re-checked every exercise's technique against its
  sources and against its own cues; 21 entries changed (among them the
  overhead extension moving to a 55° back pad, the wall handstand push-up
  line agreeing on chest-to-wall, and the pullover gripping the handle, not
  the plates). Each pass also described the key positions and tempo of
  every rep, and the animations were built from those and checked frame by
  frame in the gallery.
