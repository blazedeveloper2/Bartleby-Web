/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE ANATOMY TAB

   Every muscle the app can light (muscles3d.js REGIONS), to study. Tap
   one on the body or pick it from the list and the card under the body
   says what it is, what it does, where it attaches, which nerve runs it,
   and what in your program trains it — each of those a way into that
   exercise's card.

   The body is the exercise card's own 3D view (muscleview.js), borrowed
   while this tab is open. There is one canvas for both, so opening an
   exercise from here takes it into the card, and closing the card hands
   it back (attach()). Until the model has loaded, and wherever WebGL is
   missing, the 2D body map stands in and works the same way.
   ═══════════════════════════════════════════════════════════ */

import { PROGRAM, MMAP } from './data.js?v=3d-oct14d';
import { load, save } from './store.js?v=3d-oct14d';
import { REGIONS, regionsOfMuscle, regionOfMapId } from './muscles3d.js?v=3d-oct14e';
import { MUSCLE_SVG } from './bodymap.js?v=3d-oct14d';
import { resEx } from './rank.js?v=3d-oct16a';

/* ── the reference ──

   l  the anatomical name     o  origin (the end that stays put)
   a  what it does            i  insertion (the end it pulls on)
   v  the nerve that runs it, with its spinal roots
   t  a note for training, where one helps
   u  for a deep muscle, what it lies under

   Standard anatomy-text attachments (Gray's, Moore's), in plain words
   first where a plain word exists. Upper, mid and lower abs are one
   muscle, rectus abdominis, in three bands; the body map splits it the
   way training does. */
const A = {
  'pec-up': { l: 'Pectoralis major, clavicular head',
    a: 'Raises the arm forward and up, and turns it inward. The part of the chest that works hardest when you press upward.',
    o: 'Front of the inner half of the collarbone (medial clavicle)',
    i: 'Outer lip of the groove at the top of the upper-arm bone (lateral lip of the intertubercular groove, humerus)',
    v: 'Lateral pectoral nerve (C5–C7)',
    t: 'Incline presses and low-to-high flyes bias this head, because they move the arm along its fibers.' },
  'pec': { l: 'Pectoralis major, sternocostal head',
    a: 'Pulls the arm across the body and down, and turns it inward. The big pressing muscle.',
    o: 'Breastbone (sternum), cartilages of the upper six ribs, and the sheath of the external oblique',
    i: 'Outer lip of the intertubercular groove of the humerus, under the clavicular head',
    v: 'Medial and lateral pectoral nerves (C6–T1)',
    t: 'Its tendon is folded at the armpit: the lowest fibers attach highest on the arm. Flat presses, push-ups and flyes all train it.' },
  'delt-a': { l: 'Deltoid, anterior (clavicular) part',
    a: 'Raises the arm forward and turns it inward. Works in every press.',
    o: 'Front of the outer third of the collarbone (lateral clavicle)',
    i: 'Deltoid tuberosity, a rough patch partway down the outside of the humerus',
    v: 'Axillary nerve (C5–C6)',
    t: 'Pressing already trains it hard, so it rarely needs work of its own.' },
  'delt-s': { l: 'Deltoid, lateral (acromial) part',
    a: 'Lifts the arm out to the side, mainly from about 15° up to shoulder height.',
    o: 'Acromion, the bony shelf at the top of the shoulder blade',
    i: 'Deltoid tuberosity of the humerus',
    v: 'Axillary nerve (C5–C6)',
    t: 'The supraspinatus starts the lift and this takes over. Lateral raises are the direct way to train it; presses work it less than the front delt.' },
  'rdelt': { l: 'Deltoid, posterior (spinal) part',
    a: 'Draws the arm back and out, and turns it outward.',
    o: 'Lower edge of the spine of the shoulder blade (scapular spine)',
    i: 'Deltoid tuberosity of the humerus',
    v: 'Axillary nerve (C5–C6)',
    t: 'Rows work it more with the elbows flared; reverse flyes isolate it.' },
  'trap': { l: 'Trapezius, descending (upper) part',
    a: 'Lifts the shoulder blades (a shrug) and turns them upward so the arm can go overhead.',
    o: 'Base of the skull (external occipital protuberance, superior nuchal line) and the ligament down the back of the neck (ligamentum nuchae)',
    i: 'Back of the outer third of the collarbone',
    v: 'Spinal accessory nerve (cranial nerve XI); C3–C4 carry its sense of position',
    t: 'It is one of the few muscles run by a cranial nerve rather than a spinal one.' },
  'trap-m': { l: 'Trapezius, transverse (middle) part',
    a: 'Pulls the shoulder blades together (retraction).',
    o: 'Spinous processes of the lowest neck and top thoracic vertebrae (about C7–T3)',
    i: 'Acromion and the upper edge of the spine of the shoulder blade',
    v: 'Spinal accessory nerve (cranial nerve XI)',
    t: 'Rows train it when you finish each rep by squeezing the shoulder blades back.' },
  'rhom': { l: 'Rhomboid major and minor', u: 'the trapezius',
    a: 'Pull the shoulder blades in toward the spine and up, and rotate them downward.',
    o: 'Spinous processes of C7–T5 (minor C7–T1, major T2–T5)',
    i: 'Inner edge of the shoulder blade, from the root of its spine down to its lower corner',
    v: 'Dorsal scapular nerve (C4–C5)',
    t: 'They work with the mid traps in every row; scapular pulls train them on their own.' },
  'lat': { l: 'Latissimus dorsi',
    a: 'Pulls the arm down and back toward the body, and turns it inward. The main muscle of a pull-up.',
    o: 'Spinous processes of T7–L5 and the sacrum (through the thoracolumbar fascia), the back of the iliac crest, and the lowest three or four ribs',
    i: 'Floor of the intertubercular groove at the top of the humerus',
    v: 'Thoracodorsal nerve (C6–C8)',
    t: 'It reaches from the pelvis to the arm, which is why pullovers and straight-arm pulls train it without the biceps.' },
  'erec': { l: 'Erector spinae (iliocostalis, longissimus, spinalis)',
    a: 'Straighten the spine and hold it straight under load; one side alone bends it sideways.',
    o: 'A thick common tendon on the sacrum, the back of the iliac crest and the lumbar spinous processes',
    i: 'The ribs and the vertebrae all the way up, the longissimus reaching the skull behind the ear',
    v: 'Dorsal (posterior) rami of the spinal nerves, segment by segment',
    t: 'In deadlifts and rows they mostly work by holding still, which is the job they are built for.' },
  'bi': { l: 'Biceps brachii',
    a: 'Bends the elbow and turns the palm up (supination); helps raise the arm forward.',
    o: 'Two heads: the long head above the shoulder socket (supraglenoid tubercle), the short head on the coracoid process of the shoulder blade',
    i: 'Radial tuberosity of the forearm, and through a flat band (bicipital aponeurosis) into the forearm',
    v: 'Musculocutaneous nerve (C5–C6)',
    t: 'Because it turns the palm up, palm-up curls work it more than hammer curls. Incline curls stretch the long head.' },
  'brach': { l: 'Brachialis',
    a: 'Bends the elbow, whichever way the palm faces. The strongest elbow flexor.',
    o: 'Front of the lower half of the humerus',
    i: 'Coronoid process and tuberosity of the ulna',
    v: 'Musculocutaneous nerve (C5–C6), with a small branch of the radial nerve',
    t: 'It lies under the biceps and pushes it up from below. Hammer and reverse curls load it most.' },
  'tri-long': { l: 'Triceps brachii, long head',
    a: 'Straightens the elbow; also draws the arm down and back, the only head that crosses the shoulder.',
    o: 'Infraglenoid tubercle, just below the shoulder socket',
    i: 'Olecranon, the point of the elbow (ulna), through the common triceps tendon',
    v: 'Radial nerve (C6–C8)',
    t: 'Overhead extensions stretch it the most, because the arm is raised as well as bent.' },
  'tri-lat': { l: 'Triceps brachii, lateral head',
    a: 'Straightens the elbow.',
    o: 'Back of the humerus, above the groove the radial nerve runs in',
    i: 'Olecranon of the ulna, through the common triceps tendon',
    v: 'Radial nerve (C6–C8)',
    t: 'The outer horseshoe of the triceps. Pushdowns and close-grip pressing work it hard.' },
  'brad': { l: 'Brachioradialis',
    a: 'Bends the elbow, strongest with the thumb up, and turns the forearm toward thumb-up.',
    o: 'Lateral supracondylar ridge, the outer edge of the humerus above the elbow',
    i: 'Outside of the radius just above the wrist (radial styloid process)',
    v: 'Radial nerve (C5–C6)',
    t: 'A forearm muscle that moves the elbow, not the wrist. Hammer and reverse curls train it.' },
  'fore-f': { l: 'Wrist flexors (flexor carpi radialis, palmaris longus, flexor carpi ulnaris)',
    a: 'Bend the wrist so the palm moves toward the forearm, and tilt it to either side.',
    o: 'Medial epicondyle, the inner knob of the elbow (common flexor origin)',
    i: 'Base of the 2nd and 3rd hand bones (radialis), the palm (palmaris longus), the pisiform, hamate and 5th hand bone (ulnaris)',
    v: 'Median nerve (radialis, palmaris longus); ulnar nerve (ulnaris)',
    t: 'The finger flexors share this origin, so this is where grip lives too. Around one person in seven has no palmaris longus at all.' },
  'fore-b': { l: 'Wrist extensors (extensor carpi radialis longus and brevis, extensor carpi ulnaris)',
    a: 'Bend the wrist back, and hold it steady whenever you grip.',
    o: 'Lateral epicondyle, the outer knob of the elbow (the longus from the ridge just above it)',
    i: 'Bases of the 2nd, 3rd and 5th hand bones (metacarpals)',
    v: 'Radial nerve and its deep branch',
    t: 'Tennis elbow is irritation of their shared tendon. Reverse curls and wrist extensions train them.' },
  'abs-1': { l: 'Rectus abdominis, upper band',
    a: 'Curls the ribcage toward the pelvis (flexes the spine) and braces the trunk.',
    o: 'Pubic crest and pubic symphysis',
    i: 'Xiphoid process and the cartilages of ribs 5–7',
    v: 'Lower intercostal nerves (T7–T11) and subcostal nerve (T12)',
    t: 'One muscle split into the "six-pack" by tendons across it. Crunches that curl the ribs down bias this band.' },
  'abs-2': { l: 'Rectus abdominis, middle band',
    a: 'Curls the trunk and keeps the ribs and pelvis from pulling apart, as in a rollout or a hollow hold.',
    o: 'Pubic crest and pubic symphysis',
    i: 'Xiphoid process and the cartilages of ribs 5–7',
    v: 'Lower intercostal nerves (T7–T11) and subcostal nerve (T12)',
    t: 'The bands cannot be fully isolated: the whole muscle works every time, some parts a little more.' },
  'abs-3': { l: 'Rectus abdominis, lower band',
    a: 'Curls the pelvis up toward the ribs (a posterior pelvic tilt).',
    o: 'Pubic crest and pubic symphysis',
    i: 'Xiphoid process and the cartilages of ribs 5–7',
    v: 'Subcostal nerve (T12) and the lowest intercostal nerves',
    t: 'Leg raises work it most once the pelvis curls up; until then the hip flexors do the lifting.' },
  'obli': { l: 'External oblique (internal oblique beneath)',
    a: 'Twists the trunk to the opposite side, bends it sideways, and helps curl it.',
    o: 'Outer surfaces of ribs 5–12',
    i: 'Iliac crest, the midline tendon (linea alba) and the pubic tubercle',
    v: 'Lower intercostal nerves (T7–T11) and subcostal nerve (T12)',
    t: 'The internal oblique under it twists to the same side, so a twist uses one side\'s external with the other side\'s internal.' },
  'serra': { l: 'Serratus anterior',
    a: 'Pushes the shoulder blade forward around the ribs (a punch), turns it upward, and holds it flat against the ribcage.',
    o: 'Outer surfaces of the upper eight or nine ribs',
    i: 'Front of the inner edge of the shoulder blade',
    v: 'Long thoracic nerve (C5–C7)',
    t: 'When it is weak the shoulder blade lifts off the ribs ("winging"). Scapular push-ups and planche leans train it.' },
  'tva': { l: 'Transversus abdominis', u: 'the obliques and rectus abdominis',
    a: 'Pulls the belly in like a corset, stiffening the trunk before the limbs move.',
    o: 'Inner surfaces of the cartilages of ribs 7–12, the thoracolumbar fascia, the iliac crest and the inguinal ligament',
    i: 'The midline tendon (linea alba) and the pubic crest',
    v: 'Lower intercostal nerves (T7–T11), subcostal (T12), iliohypogastric and ilioinguinal nerves (L1)',
    t: 'The deepest abdominal layer, with fibers running round the waist. Hollow holds and dead bugs train it.' },
  'hipflex': { l: 'Iliopsoas (psoas major and iliacus), with rectus femoris',
    a: 'Lifts the thigh toward the trunk (hip flexion); the psoas also helps bend the lower spine.',
    o: 'Psoas: sides of the T12–L5 vertebrae. Iliacus: the inside of the hip bone (iliac fossa)',
    i: 'Lesser trochanter, a knob on the inside of the top of the thigh bone',
    v: 'Psoas: branches from L1–L3. Iliacus: femoral nerve (L2–L3)',
    t: 'They do most of the lifting in hanging leg raises; the abs hold the pelvis curled.' },
  'glute': { l: 'Gluteus maximus (gluteus medius at the upper side)',
    a: 'Drives the hip straight from a bend (hip extension) and turns the thigh outward; medius holds the pelvis level on one leg.',
    o: 'Back of the hip bone (posterior ilium), the sacrum and tailbone, and the sacrotuberous ligament',
    i: 'Iliotibial band and the gluteal tuberosity at the back of the thigh bone',
    v: 'Inferior gluteal nerve (L5–S2); medius by the superior gluteal nerve (L4–S1)',
    t: 'The largest muscle in the body. Hip thrusts load it at full extension; deep split squats load it stretched.' },
  'addu': { l: 'Adductors (longus, brevis, magnus), with gracilis and pectineus',
    a: 'Draw the thigh in toward the midline; adductor magnus also straightens the hip, like a hamstring.',
    o: 'Front of the pubic bone and its lower branch; magnus also from the sitting bone (ischial tuberosity)',
    i: 'The ridge down the back of the thigh bone (linea aspera) and the adductor tubercle above the inner knee',
    v: 'Obturator nerve (L2–L4); the hamstring part of magnus by the tibial nerve',
    t: 'Deep squats and split squats work adductor magnus hard, which is why your inner thighs can be sore after legs.' },
  'quad-rf': { l: 'Rectus femoris',
    a: 'Straightens the knee and lifts the thigh. The only quad that crosses the hip.',
    o: 'Anterior inferior iliac spine and the hip bone just above the socket',
    i: 'Kneecap, then the shin (tibial tuberosity) through the patellar ligament',
    v: 'Femoral nerve (L2–L4)',
    t: 'Because it also bends the hip, it does less in a deep squat and more in a leg extension.' },
  'quad-vl': { l: 'Vastus lateralis',
    a: 'Straightens the knee.',
    o: 'Greater trochanter and the outer lip of the linea aspera on the thigh bone',
    i: 'Outer edge of the kneecap, then the tibial tuberosity',
    v: 'Femoral nerve (L2–L4)',
    t: 'The largest quad, on the outside of the thigh.' },
  'quad-vm': { l: 'Vastus medialis',
    a: 'Straightens the knee; its lowest fibers help keep the kneecap tracking straight.',
    o: 'Lower intertrochanteric line and the inner lip of the linea aspera',
    i: 'Inner edge of the kneecap, then the tibial tuberosity',
    v: 'Femoral nerve (L2–L4)',
    t: 'The "teardrop" above the inner knee. It works with the other quads in every squat and cannot really be trained on its own.' },
  'ham': { l: 'Hamstrings (biceps femoris, semitendinosus, semimembranosus)',
    a: 'Bend the knee and drive the hip straight.',
    o: 'Sitting bone (ischial tuberosity); the short head of biceps femoris from the back of the thigh bone',
    i: 'Head of the fibula (biceps femoris); inside of the upper shin (the other two)',
    v: 'Sciatic nerve: tibial part, and the common fibular part for the short head (L5–S2)',
    t: 'Romanian deadlifts train them at the hip; leg curls and Nordic curls train them at the knee.' },
  'gastro': { l: 'Gastrocnemius',
    a: 'Points the foot (plantar flexion) and helps bend the knee.',
    o: 'Two heads, on the inner and outer knobs at the bottom of the thigh bone (femoral condyles)',
    i: 'Heel bone (calcaneus), through the Achilles tendon',
    v: 'Tibial nerve (S1–S2)',
    t: 'It crosses the knee, so it works best with the knee straight: standing calf raises.' },
  'soleus': { l: 'Soleus',
    a: 'Points the foot, and keeps you from tipping forward as you stand.',
    o: 'Back of the top of the fibula and the soleal line of the tibia',
    i: 'Heel bone (calcaneus), through the Achilles tendon',
    v: 'Tibial nerve (S1–S2)',
    t: 'It does not cross the knee, so bent-knee calf raises work it with the gastrocnemius slack.' },
};

const R = id => REGIONS.find(r => r.id === id);
const GROUPS = [...new Set(REGIONS.map(r => r.group))];
const TIER = ['', 'Primary', 'Supporting', 'Stabilizing'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = s => s[0].toUpperCase() + s.slice(1);
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

/* The exercise card's 2D map with its own class names and no ids, so the
   card's code, which looks its map up across the whole app, never finds
   this one. A shape names its map id in data-mid. */
const MAP_2D = MUSCLE_SVG
  .replace(/<path id="([^"]+)" class="m-region"/g, '<path data-mid="$1" class="an-region" data-act="an-2d"')
  .replace(/class="m-fig"/g, 'class="an-fig"')
  .replace(/class="m-side"/g, 'class="an-side"');

/* Which side of the 2D map shows each muscle, for when there is no 3D
   body to ask. */
const SIDE_2D = {};
for (const [, mid] of MAP_2D.matchAll(/data-mid="([^"]+)"/g)) {
  const id = regionOfMapId(mid);
  (SIDE_2D[id] ||= new Set()).add(mid[0]);
}

/* An exercise's muscle list (data.js `m`, most important first) → region
   → tier, read the way the exercise card reads it (muscleview.js tiersOf,
   which waits on three.js; this list should not). */
function tiersOf(mStr) {
  const out = new Map();
  mStr.replace(/\(.*?\)/g, '').split(',').map(s => s.trim()).filter(Boolean).forEach((name, i) => {
    for (const id of regionsOfMuscle(name, MMAP)) out.set(id, Math.min(out.get(id) ?? 9, Math.min(i + 1, 3)));
  });
  return out;
}

/* region → the exercises in the program that work it, each once, at the
   strongest tier any day gives it. Rebuilt on every render because the
   equipment flags can swap exercises. */
function trainers() {
  const by = new Map();
  PROGRAM.forEach((day, di) => day.sections.forEach((sec, si) => sec.ex.forEach((raw, ei) => {
    const ex = resEx(raw);
    for (const [id, tier] of tiersOf(ex.m || '')) {
      const m = by.get(id) || by.set(id, new Map()).get(id);
      const had = m.get(ex.n);
      if (!had || tier < had.tier) m.set(ex.n, { n: ex.n, tier, slot: [di, si, ei] });
    }
  })));
  return by;
}

/* ── state ── */
const PREF = 'bp_anat';
const pref = load(PREF, {});
let sel = R(pref.sel) ? pref.sel : 'pec';
let view = ['both', 'front', 'back'].includes(pref.view) ? pref.view : 'both';
let near = !!pref.near;
let grp = '', qry = '';
let P = null;            // the panel
let idx = new Map();     // trainers()
let ctx = null;          // { loadMV, free } from index.js
let mv = null;           // muscleview.js, once loaded

const keep = () => save(PREF, { sel, view, near });

/* index.js lends the 3D loader it shares with the exercise card, and says
   whether the body is free to take (not while the card has it). */
export function init(c) { ctx = c; }

/* ── render ── */
export function render(root) {
  P = root.querySelector('#p-anatomy');
  if (!P) return;
  idx = trainers();
  P.innerHTML = `
    <section class="pg-card an-stage">
      <div class="an-bar">
        <div class="mm-views" role="group" aria-label="Body view">${['both', 'front', 'back'].map(v =>
          `<button type="button" data-act="an-view" data-view="${v}" aria-pressed="${v === view}">${cap(v)}</button>`).join('')}</div>
        <button type="button" class="an-zoom" data-act="an-zoom" aria-pressed="${near}"></button>
      </div>
      <div class="an-map" data-view="${view}">${MAP_2D}<div class="an-3d"></div></div>
      <div class="an-hint">Drag to turn · tap a muscle</div>
    </section>
    <section class="pg-card an-card" id="an-card" aria-live="polite"></section>
    <div class="an-find">
      <input id="an-q" class="an-q" type="search" placeholder="Search muscles — deltoid, quads, lats…" value="${esc(qry)}" autocomplete="off" aria-label="Search muscles">
      <div class="an-groups" id="an-groups"></div>
    </div>
    <section class="pg-card an-list" id="an-list"></section>`;
  paintAll();
  attach();
}

function paintAll() {
  P.querySelector('#an-card').innerHTML = cardHTML();
  P.querySelector('#an-groups').innerHTML = groupsHTML();
  P.querySelector('#an-list').innerHTML = listHTML();
  syncBar();
  light();
}

/* Muscles the list shows: the group chip, then the search. */
function shown() {
  const t = qry.trim().toLowerCase();
  return REGIONS.filter(r => (!grp || r.group === grp) &&
    (!t || [r.name, r.group, A[r.id].l].some(s => s.toLowerCase().includes(t))));
}

function cardHTML() {
  const r = R(sel), a = A[sel];
  const tr = [...(idx.get(sel)?.values() || [])].sort((x, y) => x.tier - y.tier || x.n.localeCompare(y.n));
  const tiers = [1, 2, 3].map(t => [t, tr.filter(e => e.tier === t)]).filter(([, l]) => l.length);
  return `<div class="an-head">
      <div class="an-head-t">
        <div class="pg-kicker">${r.group}${r.deep ? ' · deep' : ''}</div>
        <h3 class="an-name">${r.name}</h3>
        <div class="an-latin">${a.l}</div>
      </div>
      <div class="an-steps">
        <button type="button" class="an-step" data-act="an-step" data-d="-1" aria-label="Previous muscle">${ico('<polyline points="15 6 9 12 15 18"/>')}</button>
        <button type="button" class="an-step" data-act="an-step" data-d="1" aria-label="Next muscle">${ico('<polyline points="9 6 15 12 9 18"/>')}</button>
      </div>
    </div>
    <p class="an-does">${a.a}</p>
    <dl class="an-facts">
      <dt>Origin</dt><dd>${a.o}</dd>
      <dt>Insertion</dt><dd>${a.i}</dd>
      <dt>Nerve</dt><dd>${a.v}</dd>
    </dl>
    ${a.u ? `<div class="an-tip">Deep muscle: it lies under ${a.u}, so the body shows it through them.</div>` : ''}
    ${a.t ? `<div class="an-tip">${a.t}</div>` : ''}
    <div class="an-train">
      <div class="pg-card-title">In your program</div>
      ${tiers.length ? tiers.map(([t, l]) => `<div class="an-tier">
        <span class="an-tier-l lvl-${t}">${TIER[t]}</span>
        <div class="an-exs">${l.map(e => `<button type="button" class="an-ex lvl-${t}" data-act="row" data-di="${e.slot[0]}" data-si="${e.slot[1]}" data-ei="${e.slot[2]}">${esc(e.n)}</button>`).join('')}</div>
      </div>`).join('') : `<p class="an-none">Nothing in your current program lists it.</p>`}
    </div>`;
}

function groupsHTML() {
  return [['', 'All', REGIONS.length], ...GROUPS.map(g => [g, g, REGIONS.filter(r => r.group === g).length])]
    .map(([g, n, c]) => `<button type="button" class="an-chip" data-act="an-grp" data-g="${g}" aria-pressed="${g === grp}">${n}<small>${c}</small></button>`).join('');
}

function listHTML() {
  const rs = shown();
  const head = `<div class="pg-card-head"><div class="pg-card-title">Muscles · ${rs.length}</div><div class="pg-card-note">In program</div></div>`;
  if (!rs.length) return head + `<div class="pg-empty">No muscle matches "${esc(qry)}".</div>`;
  return head + [...new Set(rs.map(r => r.group))].map(g =>
    `<div class="an-grp-h">${g}</div>` + rs.filter(r => r.group === g).map(r => {
      const n = idx.get(r.id)?.size || 0;
      return `<button type="button" class="an-row${r.id === sel ? ' on' : ''}" data-act="an-pick" data-id="${r.id}"${r.id === sel ? ' aria-current="true"' : ''}>
        <span class="an-row-t"><span class="an-row-n">${r.name}${r.deep ? '<i>deep</i>' : ''}</span><span class="an-row-l">${A[r.id].l}</span></span>
        <span class="an-row-c${n ? '' : ' none'}" title="${n} exercise${n === 1 ? '' : 's'} in your program work${n === 1 ? 's' : ''} it">${n}</span>
      </button>`;
    }).join('')).join('');
}

function syncBar() {
  P.querySelectorAll('[data-act="an-view"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  const z = P.querySelector('.an-zoom');
  z.setAttribute('aria-pressed', String(near));
  z.innerHTML = near
    ? `${ico('<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>')}<span>Whole body</span>`
    : `${ico('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/><path d="M11 8.5v5"/><path d="M8.5 11h5"/>')}<span>Zoom in</span>`;
}

/* ── the body ── */

/* The faint muscles behind the bright one: the group chip's, or else the
   selected muscle's own group. */
const groupIds = () => REGIONS.filter(r => r.group === (grp || R(sel).group) && r.id !== sel).map(r => r.id);

function sideFor(id) {
  if (mv && P?.querySelector('.an-map.is-3d')) return mv.sideOf(id);
  return SIDE_2D[id]?.has('f') ? 'front' : 'back';
}

function light() {
  if (!P) return;
  const map = P.querySelector('.an-map'), g = new Set(groupIds());
  if (mv && map.classList.contains('is-3d')) mv.study(sel, { group: [...g], view, near });
  map.dataset.view = near ? sideFor(sel) : view;
  map.querySelectorAll('.an-region').forEach(el => {
    const id = regionOfMapId(el.dataset.mid);
    el.classList.toggle('lvl-1', id === sel);
    el.classList.toggle('lvl-3', id !== sel && g.has(id));
  });
  /* zoomed, the 2D figure crops to the muscle as the card's map does */
  map.querySelectorAll('.an-fig').forEach(svg => {
    const boxes = near ? [...svg.querySelectorAll('.an-region.lvl-1')].map(e => e.getBBox()).filter(b => b.width) : [];
    if (!boxes.length) { svg.setAttribute('viewBox', '0 0 160 340'); return; }
    const y = Math.max(0, Math.min(...boxes.map(b => b.y)) - 30);
    const bottom = Math.min(340, Math.max(...boxes.map(b => b.y + b.height)) + 30);
    svg.setAttribute('viewBox', `0 ${y} 160 ${Math.max(110, bottom - y)}`);
  });
}

/* Put the 3D body in this tab's box — on arrival, and again when the
   exercise card hands it back. */
export function attach() {
  const box = P?.querySelector('.an-3d');
  if (!box || !ctx || !ctx.free()) return;
  ctx.loadMV()
    .then(m => {
      mv = m;
      if (!box.isConnected || !ctx.free()) return false;
      return m.show(box, '', { onTap: r => r && pick(r.id) });
    })
    .then(ok => {
      if (ok === false || !box.isConnected) return;
      P.querySelector('.an-map').classList.add('is-3d');
      light();
    })
    .catch(() => box.closest('.an-map')?.classList.remove('is-3d'));
}

/* Leaving the tab: let go of the body if it is here. */
export function leave() {
  if (P?.querySelector('.an-3d canvas')) mv?.hide();
}

/* ── interaction ── */
function pick(id, scroll) {
  if (!R(id)) return;
  sel = id;
  if (!near && view !== 'both') view = sideFor(id);
  keep();
  P.querySelector('#an-card').innerHTML = cardHTML();
  P.querySelectorAll('.an-row').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  syncBar();
  light();
  if (scroll) P.querySelector('.an-stage').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export function search(v) {
  qry = v;
  if (P) P.querySelector('#an-list').innerHTML = listHTML();
}

/* Every data-act starting an- lands here. */
export function act(el) {
  if (!P) return;
  const a = el.dataset;
  switch (a.act) {
    case 'an-pick': pick(a.id, true); break;
    case 'an-2d':   pick(regionOfMapId(a.mid)); break;
    case 'an-view': view = a.view; near = false; keep(); syncBar(); light(); break;
    case 'an-zoom': near = !near; keep(); syncBar(); light(); break;
    case 'an-step': {
      const rs = shown().length ? shown() : REGIONS, at = rs.findIndex(r => r.id === sel);
      pick(rs[(at + +a.d + rs.length) % rs.length].id);
      break;
    }
    case 'an-grp':
      grp = grp === a.g ? '' : a.g;
      P.querySelector('#an-groups').innerHTML = groupsHTML();
      P.querySelector('#an-list').innerHTML = listHTML();
      if (grp && R(sel).group !== grp) pick(REGIONS.find(r => r.group === grp).id);
      else light();
      break;
  }
}

/* For the Anatomy tile in the extras tray. */
export const COUNT = REGIONS.length;
