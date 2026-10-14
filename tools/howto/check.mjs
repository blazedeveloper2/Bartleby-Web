// Checks apps/workout/howto.js and the animations in apps/workout/pose.js
// against the program. See ./README.md.
//
//   node tools/howto/check.mjs            coverage + shape (offline, instant)
//   node tools/howto/check.mjs --anim     also list every animation note:
//                                         joints below the floor, planted
//                                         hands and feet off their marks
//
// Exits non-zero when anything needs fixing, so it can gate a commit.
/* The app's modules are plain browser ES modules with no package.json
   saying so; Node detects that and says so at length. Imported after the
   warning is silenced, which a static import (hoisted) could not be. */
process.removeAllListeners('warning');
const { PROGRAM, LADDERS } = await import('../../apps/workout/data.js');
const { HOWTO } = await import('../../apps/workout/howto.js');
const { MOTION, checkMotion, motionNotes } = await import('../../apps/workout/pose.js');

const MAX = 90;                                   // characters per cue line
const problems = [], notes = [];

/* Every exercise the app can show: each entry, its no-kit alt, and every
   step of every ladder — a level you have not reached yet still needs its
   how-to the day you get there. */
const names = new Set();
PROGRAM.forEach(d => d.sections.forEach(sec => sec.ex.forEach(e => [e, e.alt].filter(Boolean).forEach(x => {
  if (x.line && LADDERS[x.line]) LADDERS[x.line].steps.forEach(st => names.add(st.n));
  else if (x.n) names.add(x.n);
}))));

for (const n of names) if (!HOWTO[n]) problems.push(`missing how-to: "${n}"`);
for (const n of Object.keys(HOWTO)) if (!names.has(n)) notes.push(`not in the program any more (safe to delete): "${n}"`);

for (const [n, h] of Object.entries(HOWTO)) {
  if (!Array.isArray(h.do) || h.do.length < 3 || h.do.length > 4) problems.push(`"${n}": needs 3-4 cues, has ${h.do?.length ?? 0}`);
  if (h.avoid && (h.avoid.length < 1 || h.avoid.length > 2)) problems.push(`"${n}": needs 1-2 avoid lines`);
  [...(h.do || []), ...(h.avoid || [])].forEach(c => {
    if (c.length > MAX) problems.push(`"${n}": line over ${MAX} chars: "${c.slice(0, 40)}…"`);
  });
}

/* Every exercise with a how-to has an animated rep, and every animation
   builds: its poses exist, its tempo names them, and every frame it can
   draw renders without throwing or producing NaN coordinates. */
for (const n of names) if (!MOTION[n]) problems.push(`missing animation: "${n}"`);
for (const n of Object.keys(MOTION)) if (!names.has(n)) notes.push(`animation for an exercise not in the program: "${n}"`);
for (const [n, m] of Object.entries(MOTION)) {
  const err = checkMotion(m);
  if (err) problems.push(`"${n}": animation ${err}`);
}

/* Frame by frame, what a careful eye would catch: joints through the
   floor, planted hands and feet off their marks, sudden jumps. Notes,
   not failures — `--anim` prints every one. */
const animNotes = [];
for (const [n, m] of Object.entries(MOTION)) {
  if (checkMotion(m)) continue;
  for (const note of motionNotes(m)) animNotes.push(`"${n}": ${note}`);
}
if (process.argv.includes('--anim')) animNotes.forEach(n => console.log('  anim: ' + n));
else if (animNotes.length) notes.push(`${animNotes.length} animation notes (run with --anim to list them)`);

console.log(`${names.size} exercises in the program, ${Object.keys(HOWTO).length} how-tos, ${Object.keys(MOTION).length} animations`);
notes.slice(0, 10).forEach(n => console.log('  note: ' + n));
if (notes.length > 10) console.log(`  …and ${notes.length - 10} more notes`);
if (problems.length) {
  console.log(`\n${problems.length} to fix:`);
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('all good');
