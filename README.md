# Bartleby Web

A personal, local-first suite of small web apps. Each "app" is a self-contained
module; a lightweight shell switches between them from the sidebar.

Live apps:

- **Workout** — 4-day upper/lower program tracker with a muscle-map modal
  (tap an exercise to set its working weight), a **Body** tab, and a
  **Rank** tab: a letter grade (F→SS) computed from your working weights
  against published population strength standards relative to your bodyweight
  — or, if you'd rather, relative to your **lean mass**, which stops a cut
  flattering the letter and a bulk hiding it (see below) —
  plus a training level that climbs one step per finished session (with a
  level-up card when it does), streaks, a consistency heatmap, 57 milestones
  across consistency, strength, volume and progression, and a daily verse. The level is attendance only: it never reads a weight, so it
  can't move the letter and the letter can't be farmed by showing up.
  Every weighted lift in the program is scored; each one is tagged with how
  trustworthy its standard is (exact match / proxy movement / estimate).
  Exercise names are tinted by where that lift stands, on a scale whose
  brightness climbs with the percentile rather than peaking in the middle —
  the stops land on the rank boundaries, so the colour shifts where the
  letter does, and each one solves for a target luminance rather than a
  fixed lightness, because equal HSL lightness is not equal brightness. It
  reads off the theme's own card colour, so the light theme gets a dark ramp
  and the dark themes a bright one; every point on it clears WCAG AA 4.5:1
  against every theme.
  See `apps/workout/standards.js` for the data and its sources.

  **Settings → Program** switches whose workout the app runs: **Edrin**
  (the default, the dumbbell-and-calisthenics program above) or **Andrew**
  (a seven-day gym program — heavy upper/lower, push/pull/legs, two Zone 2
  rest days). Each person keeps their own log, weights, body entries and
  awards; see `apps/workout/store.js`. Andrew's lifts are machines and
  cables with no published standard here, so they are tracked — weight,
  reps, load advice off his own ranges — but not graded.

  **Grip strength** has its own card on the Rank tab, for a hand
  dynamometer. Log the best squeeze of each hand (pounds or kilograms — tap
  the unit in the field label) and the better hand is ranked against men your
  age, with its own letter on the same scale as the lifts, the percentile,
  and what the next letter takes. The norms are
  [Dodds et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4256164/)
  (49,964 people, twelve British studies, centiles at every fifth year of
  age, best of either hand). With no age set it compares you with men at
  their peak, 30–39, and says so. Grip also counts towards the overall
  score as one more entry in the average, weighted like a lift, and a
  reading that tips the letter up gets the same rank-up card.
  **Settings → Equipment → Grip Dynamometer** (on by default, shown for
  every program) hides the card; the readings are kept. See
  `apps/workout/grip.js`.

  A **checkup** sits under the letter and answers two questions the rest of
  the tab will not: is this going as it should, and does anything in the
  data look wrong? It catches stalled lifts, runs of back-offs, attendance
  quietly halving, weights typed but never trained — and typos, because
  every figure here is hand-entered and a mistyped 118 among 181s does not
  look like a mistake once it is a point on a chart. Each threshold is a
  rate the body cannot plausibly beat rather than a round number: a weigh-in
  5% off the days either side, a waist that moved two inches inside five
  weeks, four points of body fat in a month. Flagging the impossible instead
  of the merely surprising is the whole design — a check that cries wolf at
  ordinary variation is one you learn to scroll past. When nothing is wrong
  it collapses to a single line saying so, with the evidence. See
  `apps/workout/checkup.js`, where each threshold carries its reasoning.

  Tapping a lift in the muscle-map modal also offers **"Had this wrong?
  Start this lift over"**. A back-off and a correction look identical in the
  data and mean opposite things: backing off is real and the load you gave
  back should come off the total, but discovering you were doing a movement
  wrong and dropping it from 52.5 to 20 is not a regression — that 52.5 was
  never a working weight, and netting it away takes load you genuinely added
  to *other* lifts as the price of being honest about one. The app can't
  tell them apart, so it asks. Starting a lift over voids its history rather
  than subtracting it, so the number that was never true stops counting in
  either direction. The new baseline is deliberately untested, like every
  other claim here — train it once and it counts.

  The **Body** tab is composition, not just the scale. Log a weight and a
  tape — waist and neck, plus chest, arm and thigh behind a disclosure —
  any of them, any day, and the entry keeps whatever you don't re-enter.
  Every measurement reads in **inches or centimetres independently** — tap
  the unit in a field's own label to flip just that one, so a height in
  feet and inches can sit beside a waist in centimetres without anyone
  converting anything in their head. Lengths are always *stored* in inches
  whatever the labels say, because the Navy formula's constants are
  calibrated for them and a store that recorded each value in whatever unit
  it was typed in would need a unit tag on every field forever. Conversion
  happens at the edges only, so flipping a unit moves nothing in storage and
  changes no figure on the tab — and anything you had already typed into the
  form is carried across the repaint rather than lost or, worse, left
  sitting there while its meaning changes underneath it. Weight stays in pounds — it isn't a length,
  and the strength standards, working weights and load totals are all
  denominated in it. Measurements are taken relaxed, never flexed; each
  field's label says where the tape goes.
  Against your height, waist and neck give a body fat estimate by the US
  Navy tape method, which splits your weight into lean and fat mass; the
  other three sites feed no formula and are simply there to watch grow.
  Around that sit FFMI, BMI, waist-to-height, and a rate of change fitted
  by least squares across the last 30 days rather than read off two noisy
  mornings. From all of it comes one call — **bulk, cut or recomp** — with
  the reasoning, a calorie target (Katch-McArdle off lean mass × your
  activity setting), a protein target, and a recommended goal weight you
  can override. A separate pace line reads the measured trend and says
  whether the direction you are already going is the right *speed*,
  including when it is the wrong direction entirely. The chart plots any of
  the seven measurements, with a 7-day trend line drawn through the raw
  readings. Every figure is an estimate and the tab says so where it
  matters: the tape method lands within about ±3 points of a DEXA scan,
  which is why the change in the number is worth more than the number, and
  an estimate past its due date says so out loud rather than quietly
  presenting itself as today's — **and the Body tab turns red when the tape
  is due**, so the reminder reaches you from whichever tab you are on.

  How often is worth measuring depends on how fast you are actually
  changing, because the tape has its own error to clear first: the
  circumference equations carry a standard error of 3–4 points of body fat
  and reproduce to within about 1 point. On a cut at the rate this app
  targets you shed roughly 3 points of body fat a month, so a **fortnight**
  shows about 1.5 — clear of the noise. On a lean bulk body fat climbs
  something like a third of a point a month, under the noise floor however
  often you measure, so the interval there is **four weeks**. The app picks
  whichever matches the call it is currently making and tells you the date.

  **Age** is optional and changes nothing the app calculates — the Navy
  formula has no age term, and Katch-McArdle runs off measured lean mass,
  which is most of why it was picked over Mifflin-St Jeor. What age changes
  is what a given body fat *means*: the healthy male range rises from 8–19%
  in your twenties to 13–24% in your seventies
  ([Gallagher 2000](https://pubmed.ncbi.nlm.nih.gov/10966886/)). Give it one
  and the bulk/cut/recomp thresholds and the goal targets slide up with your
  age bracket, and that healthy range is drawn over the scale. Leave it blank
  and everything behaves exactly as it did before the field existed. The ACE
  bands underneath are deliberately *not* relabelled by age — that is a
  specific published table, and the age-appropriate range belongs over it
  rather than in place of it.

  **Where you stand** ranks each tape site against a population, the way
  the Rank tab does for lifts — and with the same tagging, because a
  percentile with no provenance is just a number that sounds authoritative.
  Waist and arm come from [NHANES 2015–18](https://www.cdc.gov/nchs/data/series/sr_03/sr03-046-508.pdf)
  (CDC/NCHS Series 3 No. 46, tables 20 and 23), age-matched by decade when
  you've given an age. The arm is tagged **exact**: NHANES measures the
  relaxed mid-upper arm at the marked midpoint, which is what this app asks
  for. The waist is tagged **site differs**, because NHANES measures at the
  top of the hip bone and this app measures at the navel, as the Navy
  formula requires. Neck, chest and thigh are tagged **estimate** — they
  come from ANSUR II (US Army, 2012, n=4,082) as a normal approximation
  from mean and SD, against a population that runs leaner and more muscular
  than the public. The bar always fills in the direction that counts, so a
  small waist and a big arm both read long. And the card says out loud what
  a tape cannot do: tell muscle from fat. A big arm there means bigger than
  most, not more muscular than most; the waist is the one that means what it
  looks like it means, and the body fat estimate above settles the rest.

  The rates and targets are not invented. Cutting at 0.5–1%/wk and protein
  at 2.3–3.1 g/kg of lean mass come from [Helms, Aragon & Schoenfeld
  (2014)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/); the bulk rate
  is the floor of their novice band, which is the nearest thing to a figure
  that isn't wrong for someone whose training age the app can't know. The
  band names are ACE's. See `apps/workout/body.js`, where each constant
  carries its source; the formulas are male-only, matching the strength
  standards.

  **Scoring against lean mass.** The Rank tab divides your estimated 1RM by
  your bodyweight, because that is how the standards are published — which
  means losing fat raises every ratio whether or not you got stronger. With
  a body fat estimate on hand, the Rank tab offers the other denominator:
  it scores you as though you carried your current lean mass at a reference
  18% body fat. At that body fat the two modes agree exactly, so the gap
  between them is only ever your composition. The effect is the point — a
  35 lb cut from 25% to 9% body fat, with lean mass and every working
  weight held constant, moves the bodyweight score 15 percentile points and
  the lean score not at all. It's opt-in and defaults off, because a grade
  that moves because the app changed its mind is worth nothing.

  Which to use is a real trade and the tab says so on both settings.
  Bodyweight has the precise input and the wrong concept: the scale is exact,
  but losing fat lifts every ratio whether or not you got stronger. Lean mass
  has the right concept and a noisier input: it inherits the tape's few
  points of error, which costs about ±3 percentile points of wobble. That is
  a good trade only while your weight is deliberately moving — ±3 against the
  15 it would otherwise drift. With your weight stable there is nothing to
  correct for, so bodyweight is the better read and the comparable one.
- **Finance** — where the money goes, and how much of it is left.
  **Add / History / Insights** track spending: log by category (add/delete your
  own categories) with a calendar date picker and notes, a filterable history
  with per-day totals and a jump-to-any-day filter, and Insights (category donut
  + jump-to-any month/year + 12-month trend + repeat-note grouping).
  **Net Worth** tracks the total itself: add up everything you hold, subtract
  what you owe, log the number, and repeat whenever you like. One snapshot per
  day, plotted on a real time axis so an interval you took six months to cross
  looks like six months. Negative totals are allowed — the chart draws the zero
  line and colours the trend by direction. Because the expenses live in the same
  app, each gap in the history can also say roughly what came in: the change in
  your total plus what you logged as spent over the same stretch. That figure is
  labelled as the inference it is.
Archived (parked in `archive/`, not loaded by the shell — see
`archive/README.md` to restore):

- **Scripture** — read the Bible with the Church Fathers. **Library** walks the
  canon book by book, or takes a reference in the jump box (`matthew 25`,
  `mt 25:31`, `1cor13`, `ps 23`). Tapping a verse opens it with every patristic
  comment on it, earliest father first, each named with its source work.
  **Saved** keeps the verses you starred, grouped in canon order, with your own
  note. Everything is offline: no key, no API, no network. Its generated KJV
  text and commentary data are archived alongside it.

**Settings** (gear, bottom of the sidebar) holds the theme picker, the
equipment toggles, and backup. Pull-up bar and ab wheel default on; the
barbell defaults off, and turning it on swaps the RDLs, the goblet squat and
the hip thrust for their barbell versions, each scored on its own standard.
The grip dynamometer defaults on and shows or hides the grip card.

All data is stored locally in your browser (`localStorage`). Nothing is sent
anywhere. Use **Settings → Export Backup** to save a `.json` file before
switching devices, and **Import Backup** to restore it. Backups cover every
`bp_` (workout), `fin_` (finance) and `bs_` (suite settings, e.g. theme) key.
Scripture's `sc_` keys (stars and notes) stay in the browser untouched while
the app is archived, but drop out of backups until it is restored.

## Themes

`Arcade` (orange game-HUD, animated) is the default; `Redline` is scarlet on
near-black; `Dark` is true black and silver; `Midnight` is the original
blue-grey; `Daylight` is paper-white. A theme is one block of CSS variables
plus an optional animation set — see `assets/css/themes.css` and
`assets/js/theme.js`. Arcade's loud motion is keyed on its own
`data-theme`, so a new theme picks a `motion` of `quiet` or `none` in the
registry and inherits that set rather than duplicating fifty selectors.

Each theme also defines `--ink-*` colours: the text that sits *on* a tinted
chip of a hue, which is a different job from the hue itself. On a dark card
the vivid colour is already the readable choice, but over white it is not —
`#16a34a` on a 9% green wash is 2.97:1, which is how the working-weight
badge ended up unreadable in Daylight. Dark themes alias these to the hue;
Daylight darkens each until it clears 4.5:1 on its own chip.

---

## Project structure

```
Bartleby Web/
├── index.html               # the shell (loads the apps)
├── assets/
│   ├── css/
│   │   ├── tokens.css        # theme-independent tokens + reset + shared bits
│   │   ├── themes.css        # one palette block per theme + arcade animations
│   │   └── shell.css         # sidebar / app-switcher / settings layout
│   └── js/
│       ├── shell.js          # app registry + router + settings/backup
│       ├── theme.js          # theme registry, get/set/apply
│       ├── storage.js        # localStorage helpers
│       └── ui.js             # toast helper
├── apps/
│   ├── workout/              # index.js + data.js + rank.js + standards.js
│   │                         #   + body.js + anthro.js + grip.js + checkup.js
│   │                         #   + bodymap.js + howto.js + workout.css
│   └── finance/              # index.js + networth.js + data.js + finance.css
├── archive/                  # parked apps, kept but not loaded by the shell
│   ├── apps/scripture/       # index.js + bible.js + scripture.css
│   └── assets/data/          # kjv/ (~4 MB) + commentary/ (~100 MB)
├── tools/howto/              # how the exercise how-tos were made + the checks
│                             #   (README.md, check.mjs, vidcheck.py, ytsearch.py)
├── manifest.json             # Add to Home Screen (standalone app window)
├── .github/workflows/deploy.yml   # auto-deploy to GitHub Pages on every push
├── start.bat                 # one-click: run locally (double-click this)
├── sync.bat                  # one-click: commit + push
└── README.md
```

### Adding a new app

1. Create `apps/<name>/index.js` that default-exports:
   `{ id, name, icon, styles, mount(root), unmount() }`.
2. Add its CSS at `apps/<name>/<name>.css`.
3. Import it in `assets/js/shell.js` and add it to the `APPS` array.
4. Give it a `storagePrefix` (e.g. `sc_`) in that same default export. The
   shell reads it to include the app in backups and to name its slice in the
   Settings storage breakdown — miss it and the app works fine while its data
   quietly stays out of every backup.

That's it — it shows up as a tab automatically.

### Changing an exercise

Every exercise has written cues and a checked tutorial video in
`apps/workout/howto.js`. After adding, renaming or removing one in `data.js`,
run `node tools/howto/check.mjs`. It names every exercise left without a
how-to. [`tools/howto/README.md`](tools/howto/README.md) has the method for
writing the cues and verifying a video.

---

## Running locally

**Double-click `start.bat`.** It serves the folder and opens your browser.
Leave the console window open while you use the app.

Do **not** open `index.html` directly — the apps use ES modules, which browsers
refuse to load from a `file://` path, so you'd get a blank page. Any static
server works if you'd rather do it by hand:

```
npx serve .
```

Note that each origin has its own `localStorage`: data you enter on
`localhost` is separate from data on the published GitHub Pages site. Use
Export/Import to move between them.

---

## Publishing online (GitHub Pages)

A one-time setup, then it auto-deploys forever.

**1. Create the repo** (on <https://github.com/new>): name it `bartleby-web`,
keep it Public (Pages is free for public repos), and **don't** add a README —
this folder already has one.

**2. Connect this folder and push** (run once, in this folder):

```
git remote add origin https://github.com/<your-username>/bartleby-web.git
git branch -M main
git push -u origin main
```

**3. Turn on Pages:** repo → **Settings → Pages → Build and deployment →
Source: GitHub Actions**. The included workflow does the rest.

Your site goes live at:
`https://<your-username>.github.io/bartleby-web/`

### Syncing changes after that

Just double-click **`sync.bat`** whenever you want to save + publish. It commits
everything and pushes; GitHub rebuilds the site in ~1 minute.

If you'd rather type it, the same thing from a terminal in this folder is:

```
git add -A; git commit -m "describe what you changed"; git push
```

The repo is **blazedeveloper2/Bartleby-Web**. It stays Public because
GitHub Pages on a free account only serves public repos.

### If a change doesn't show up

Every script and stylesheet is requested with a `?v=` tag on the end, so the
browser knows when to go and fetch a fresh copy instead of reusing the one it
already has. **Change any CSS or JS, and that tag has to change too** —
otherwise the site deploys fine and nobody sees it, which is a genuinely
confusing way to lose an afternoon.

Every file shares one tag, so bumping it is one command from this folder.
Put the current tag in place of `old-tag` and any new name in place of
`new-tag`. Replace the literal old tag, never `?v=` plus a wildcard: the
self-update check in `index.html` contains `?v=` inside its own regexes, and a
wildcard replace rewrites those too and silently switches the check off.

```
git grep -l "?v=old-tag" -- ':!README.md' | xargs sed -i "s/?v=old-tag/?v=new-tag/g"
```

Then commit and push as usual.

The one file that can't carry a tag is `index.html` itself, and GitHub Pages
lets browsers hold onto it for ten minutes — longer in an installed app that
never gets reloaded. So the page checks itself: on load it asks the network
what the current tag is, and if it's running an older one it jumps to a URL
the cache has never seen, which pulls the fresh copy. You shouldn't have to
clear anything. If you ever want to check by hand, **Ctrl+Shift+R**.
