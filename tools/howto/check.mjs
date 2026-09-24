// Checks apps/workout/howto.js against the program. See ./README.md.
//
//   node tools/howto/check.mjs            coverage + shape (offline, instant)
//   node tools/howto/check.mjs --videos   also asks YouTube whether every
//                                         video still exists and embeds
//
// Exits non-zero when anything needs fixing, so it can gate a commit.
/* The app's modules are plain browser ES modules with no package.json
   saying so; Node detects that and says so at length. Imported after the
   warning is silenced, which a static import (hoisted) could not be. */
process.removeAllListeners('warning');
const { PROGRAM, LADDERS } = await import('../../apps/workout/data.js');
const { HOWTO } = await import('../../apps/workout/howto.js');

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
  if (h.v) {
    if (!/^[\w-]{11}$/.test(h.v.id || '')) problems.push(`"${n}": bad video id`);
    if (!h.v.t || !h.v.c) problems.push(`"${n}": video needs a title (t) and channel (c)`);
    if (!h.v.r) notes.push(`"${n}": video has no review note (r)`);
  }
}

if (process.argv.includes('--videos')) {
  const ids = [...new Set(Object.values(HOWTO).filter(h => h.v).map(h => h.v.id))];
  for (const id of ids) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        const who = Object.entries(HOWTO).filter(([, h]) => h.v?.id === id).map(([n]) => n).join(', ');
        problems.push(`video ${id} (${who}): HTTP ${r.status} — removed, private or embedding turned off`);
      }
    } catch (e) {
      problems.push(`video ${id}: could not reach YouTube (${e.message})`);
    }
  }
  console.log(`checked ${ids.length} videos`);
}

const withV = Object.values(HOWTO).filter(h => h.v).length;
console.log(`${names.size} exercises in the program, ${Object.keys(HOWTO).length} how-tos, ${withV} with a video`);
notes.slice(0, 10).forEach(n => console.log('  note: ' + n));
if (notes.length > 10) console.log(`  …and ${notes.length - 10} more notes`);
if (problems.length) {
  console.log(`\n${problems.length} to fix:`);
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('all good');
