# Exercise how-to: method and tools

Every exercise the Workout app can show has a **How to** section in its
exercise lab: three or four written cues, one or two mistakes to avoid, and,
where a good one exists, a tutorial video. The content lives in
[`apps/workout/howto.js`](../../apps/workout/howto.js), keyed by exercise
name. This folder holds the method it was made with and the tools that check
it, so the same standard holds when the program changes.

**After any change to the program or to `howto.js`:**

```bash
node tools/howto/check.mjs
```

It lists every exercise with no how-to (including ladder steps you have not
reached yet), every how-to whose exercise is gone, and anything malformed.
Add `--videos` to also ask YouTube whether each video still exists and still
embeds. Run that now and then, because videos get taken down.

---

## What an entry looks like

```js
"Frog Stand": {
  do: [                                   // 3–4 cues, ≤ 90 characters each, in order:
    "Squat, hands flat and shoulder-width …",   //   set up →
    "Bend your elbows and rest your knees …",   //   move →
    "Lean forward slowly until …",
    "Balance with your fingers: …",             //   the one point that matters most
  ],
  avoid: [ "Staring straight down …", "Jumping the feet up …" ],   // 1–2
  v: { id:"zwfdymEUqcQ",                         // YouTube id
       t:"How to actually learn the Frog Stand | …", c:"STRIQfit",   // exactly as YouTube reports them
       d:289,                                    // length, seconds
       s:0,                                      // optional start time, seconds
       r:"what the review saw in the frames" },  // why this video passed
  src: [ "https://…" ],                          // what the cues were written from
},
```

The key must match the exercise's `n` exactly, as written in `data.js`
(program entries, `alt`s and every ladder step). An exercise with no video
simply has no `v`, and the cues stand alone.

---

## Writing the cues

1. **Write for this program's exact variant.** The cues describe what *this*
   app prescribes: bench angles (30° incline, 85° shoulder press), the
   no-rack front squat cleaned from the floor, chest-to-wall handstands,
   planche on the floor, dumbbells that must never be used as deficit blocks.
   Read the entry and its comment in `data.js` first.
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

## Choosing a video

A video passes only if **all** of these hold:

1. **Embeddable and playable.** Some channels turn embedding off.
2. **It demonstrates the exercise** for a good share of its length. Mostly
   talking to camera, a workout montage, a vlog or a sales pitch fails.
3. **It is this variant,** or close enough that nothing it teaches
   contradicts the cues. A back-to-wall handstand fails for a chest-to-wall
   step. A demo without the dumbbell can pass for a weighted variant only if
   the movement is otherwise identical.
4. **The form in it is sound.**
5. **The source is credible:** an established coach or channel, or clearly
   produced instruction with real views. A tiny unvetted upload or a silent
   20-second clip passes only when nothing better exists *and* the frames
   are clearly right. Say so in `r`.
6. **The length is sensible.** Ideally up to about 10 minutes. A longer or
   multi-exercise video passes only with a start time (`s`) at the part that
   teaches this exercise.

No video beats a bad video. Leave `v` out rather than lower the bar.

## Verifying a video (actually looking at it)

Transcripts are not a usable check. As of September 2026 YouTube blocks
every automated route to captions, including the public transcript services.
Titles alone are not enough either. The check that works is to **look at
the video's own frames:**

```bash
# metadata + a 4×4 sheet of 16 frames spread across the whole video
PYTHONIOENCODING=utf-8 python tools/howto/vidcheck.py OUTDIR VIDEO_ID [VIDEO_ID …]

# 16 frames from just seconds T0..T1, to find where a section starts (for `s`)
PYTHONIOENCODING=utf-8 python tools/howto/vidcheck.py OUTDIR --zoom VIDEO_ID T0 T1

# find candidates: id | length | views | channel | title
PYTHONIOENCODING=utf-8 python tools/howto/ytsearch.py "frog stand tutorial" 8
```

`vidcheck.py` prints the title, channel, length, views, upload date and
whether it embeds. It saves `OUTDIR/<id>.json` (with the chapter list) and
`OUTDIR/<id>.jpg`, a contact sheet built from YouTube's storyboard images
(the thumbnails you see when you scrub the progress bar), each frame
stamped with its time. Open the sheet and judge it against the rubric above.
Needs Python 3 with Pillow (`pip install pillow`). Nothing plays, so there
is no audio.

**Don't open YouTube in a browser to check a video.** It autoplays, ads and
sound included.

## Adding or changing an exercise

1. Change `data.js` as usual.
2. Run `node tools/howto/check.mjs`. It names every exercise now missing a
   how-to, and every how-to whose exercise is gone.
3. **Renamed exercise:** move the entry to the new key if the movement is
   the same. **New exercise:** write the cues (above).
4. Find a video: `ytsearch.py` for candidates, `vidcheck.py` on the best two
   or three, and look at each sheet. Pick one that passes, add `s` with
   `--zoom` if needed, and write `r` saying what the frames showed. If none
   passes, leave `v` out.
5. Run `node tools/howto/check.mjs --videos` and fix anything it names.
6. Open the exercise in the app and read the section once on a phone-width
   screen.

## How the current content was made (September 2026)

- **Research:** six agents each wrote cues and picked candidate videos for
  one group of exercises (upper dumbbell, lower body, core ladders,
  handstand and handstand push-up, planche and push-ups, pull and front
  lever). They worked from the sources listed in each entry's `src`, and
  every candidate was checked through YouTube's oEmbed endpoint.
- **Review:** a second, independent pass that never saw why a video was
  picked ran every video through `vidcheck.py`, looked at the frames, and
  gave each one a verdict: pass, pass with a start time, replace (with a
  replacement that was itself checked) or drop. Each verdict's reasoning is
  the `r` on the video.
- **Final read:** every cue was read once more for correctness and safety,
  and the videos the review flagged were checked again, before any of it
  went in.
