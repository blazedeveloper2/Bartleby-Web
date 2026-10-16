/* ═══════════════════════════════════════════════════════════
   WORKOUT — ANATOMY

   Every muscle the app can light (muscles3d.js REGIONS), to study, full
   screen over the whole app. One body you turn any way, pinch in on and
   slide about (muscleview.js orbit); tap a muscle, or pick it from the
   list, and it lights up, the camera comes round to it, and a readout
   tied to it by a line says what it is, what it does, where it attaches,
   which nerve runs it, and what in your program trains it — each of
   those a way into that exercise's card.

   The body is the exercise card's own 3D view, borrowed while this is
   open. There is one canvas for both, so opening an exercise from here
   takes it into the card, and closing the card hands it back (attach()).
   Until the model has loaded, and wherever WebGL is missing, the 2D body
   map stands in and works the same way.
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
   first where a plain word exists, checked against Kenhub,
   TeachMeAnatomy and Wikipedia's Gray's-sourced pages in Oct 2026. The
   training notes keep to what studies support: where they disagree
   (upper-ab bias, brachioradialis by grip) the note says so. Upper, mid and lower abs are one
   muscle, rectus abdominis, in three bands; the body map splits it the
   way training does. */
const A = {
  'pec-up': { l: 'Pectoralis major, clavicular head',
    a: 'Raises the arm forward and up, and turns it inward. The part of the chest that works hardest when you press upward.',
    o: 'Front of the inner half of the collarbone (medial clavicle)',
    i: 'Outer lip of the groove at the top of the upper-arm bone (lateral lip of the intertubercular groove, humerus)',
    v: 'Lateral pectoral nerve (C5–C6)',
    t: 'Incline presses and low-to-high flyes bias this head, because they move the arm along its fibers.' },
  'pec': { l: 'Pectoralis major, sternocostal head',
    a: 'Pulls the arm across the body and down, and turns it inward. The big pressing muscle.',
    o: 'Breastbone (sternum), cartilages of the upper six ribs, and the flat tendon of the external oblique (its aponeurosis)',
    i: 'Outer lip of the intertubercular groove of the humerus, under the clavicular head',
    v: 'Medial and lateral pectoral nerves (C7–T1)',
    t: 'Its tendon is folded at the armpit: the lowest fibers attach highest on the arm. Flat presses, push-ups and flyes all train it.' },
  'delt-a': { l: 'Deltoid, anterior (clavicular) part',
    a: 'Raises the arm forward and turns it inward. Works in every press.',
    o: 'Front of the outer third of the collarbone (lateral clavicle)',
    i: 'Deltoid tuberosity, a rough patch partway down the outside of the humerus',
    v: 'Axillary nerve (C5–C6)',
    t: 'Pressing already trains it hard, so it rarely needs work of its own.' },
  'delt-s': { l: 'Deltoid, lateral (acromial) part',
    a: 'Lifts the arm out to the side (abduction), working from the very start of the lift to past shoulder height.',
    o: 'Acromion, the bony shelf at the top of the shoulder blade',
    i: 'Deltoid tuberosity of the humerus',
    v: 'Axillary nerve (C5–C6)',
    t: 'The supraspinatus works alongside it from the start rather than starting the lift alone. Lateral raises are the direct way to train it; presses work it less than the front delt.' },
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
    t: 'Its nerve counts as a cranial nerve, though its cells sit in the top of the spinal cord, and in the neck it runs only this and the sternocleidomastoid.' },
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
    t: 'They work with the mid traps in every row. Scapular pulls work them too, though the lower traps do most of the pulling down.' },
  'lat': { l: 'Latissimus dorsi',
    a: 'Pulls the arm down and back toward the body, and turns it inward. The main muscle of a pull-up.',
    o: 'Spinous processes of T7–L5 and the sacrum (through the thoracolumbar fascia), the back of the iliac crest, and the lowest three or four ribs',
    i: 'Floor of the intertubercular groove at the top of the humerus',
    v: 'Thoracodorsal nerve (C6–C8)',
    t: 'It moves the arm at the shoulder and does not cross the elbow, which is why pullovers and straight-arm pulls train it without the biceps.' },
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
    t: 'It lies under the biceps and pushes it up from below. It attaches to the ulna, so grip does not change its work; hammer and reverse curls take work off the biceps, so it does a bigger share.' },
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
    a: 'Bends the elbow in any grip, and is best placed to help with the thumb up; turns the forearm toward thumb-up.',
    o: 'Lateral supracondylar ridge, the outer edge of the humerus above the elbow',
    i: 'Outside of the radius just above the wrist (base of the radial styloid process)',
    v: 'Radial nerve (C5–C6)',
    t: 'A forearm muscle that moves the elbow, not the wrist. Hammer and reverse curls train it.' },
  'fore-f': { l: 'Wrist flexors (flexor carpi radialis, palmaris longus, flexor carpi ulnaris)',
    a: 'Bend the wrist so the palm moves toward the forearm, and tilt it to either side.',
    o: 'Medial epicondyle, the inner knob of the elbow (common flexor origin)',
    i: 'Base of the 2nd and 3rd hand bones (radialis), the palm (palmaris longus), the pisiform, hamate and 5th hand bone (ulnaris)',
    v: 'Median nerve (C6–C8) for radialis and palmaris longus; ulnar nerve (C7–T1) for ulnaris',
    t: 'One of the two finger flexors (flexor digitorum superficialis) shares this origin, so grip work trains this area too. Palmaris longus is missing in roughly 10–20% of people, in one arm or both.' },
  'fore-b': { l: 'Wrist extensors (extensor carpi radialis longus and brevis, extensor carpi ulnaris)',
    a: 'Bend the wrist back, and hold it steady whenever you grip.',
    o: 'Lateral epicondyle, the outer knob of the elbow (the longus from the ridge just above it)',
    i: 'Bases of the 2nd, 3rd and 5th hand bones (metacarpals)',
    v: 'Radial nerve (longus) and its deep branch (brevis, ulnaris), C6–C8',
    t: 'Tennis elbow is wear (tendinopathy) of the shared tendon at the outer elbow, mostly the extensor carpi radialis brevis. Reverse curls and wrist extensions train them.' },
  'abs-1': { l: 'Rectus abdominis, upper band',
    a: 'Curls the ribcage toward the pelvis (flexes the spine) and braces the trunk.',
    o: 'Pubic crest and pubic symphysis',
    i: 'Xiphoid process and the cartilages of ribs 5–7',
    v: 'Lower intercostal nerves (T7–T11) and subcostal nerve (T12)',
    t: 'One muscle split into the "six-pack" by tendons across it. Crunches that curl the ribs down may bias this band slightly, though studies disagree.' },
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
    a: 'Pulls the belly in like a corset, and helps stiffen the trunk.',
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
    i: 'The ridge down the back of the thigh bone (linea aspera) and the adductor tubercle above the inner knee; gracilis runs on to the inside of the upper shin',
    v: 'Obturator nerve (L2–L4); the hamstring part of magnus by the tibial nerve (L4); pectineus mainly by the femoral nerve (L2–L3)',
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
    t: 'It does not cross the knee, so it works whether the knee is bent or straight. Bent-knee raises take the gastrocnemius out, but standing raises grow the soleus about as well.' },
};

const R = id => REGIONS.find(r => r.id === id);
const GROUPS = [...new Set(REGIONS.map(r => r.group))];
const TIER = ['', 'Primary', 'Supporting', 'Stabilizing'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  prev:  ico('<polyline points="15 6 9 12 15 18"/>'),
  next:  ico('<polyline points="9 6 15 12 9 18"/>'),
  fold:  ico('<polyline points="6 9 12 15 18 9"/>'),
  find:  ico('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  home:  ico('<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/><circle cx="12" cy="12" r="2.5"/>'),
  close: ico('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
};

/* The exercise card's 2D map with its own class names and no ids, so the
   card's code, which looks its map up across the whole app, never finds
   this one. A shape names its map id in data-mid. */
const MAP_2D = MUSCLE_SVG
  .replace(/<path id="([^"]+)" class="m-region"/g, '<path data-mid="$1" class="an-region" data-act="an-2d"')
  .replace(/class="m-fig"/g, 'class="an-fig"')
  .replace(/class="m-side"/g, 'class="an-side"');

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
   strongest tier any day gives it. Rebuilt on every open because the
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
let min = !!pref.min;    // the readout folded down to its name
let grp = '', qry = '';
let X = null;            // the full-screen layer, #ax
let idx = new Map();     // trainers()
let ctx = null;          // { loadMV, free, layer } from index.js
let mv = null;           // muscleview.js, once loaded
let is3d = false;
let ro = null;

const keep = () => save(PREF, { sel, min });
const wide = () => matchMedia('(min-width: 900px)').matches;
const $ = s => X.querySelector(s);

/* index.js lends the 3D loader it shares with the exercise card, says
   whether the body is free to take (not while the card has it), and
   hands over the layer. */
export function init(c) { ctx = c; }
export const isOpen = () => !!X && !X.hidden;

/* ── open and close ──
   The layer covers the whole app. It takes a history entry, so a phone's
   back gesture closes it rather than leaving the app. */
export function open() {
  X = ctx.layer();
  if (!X || isOpen()) return;
  idx = trainers();
  is3d = false;
  X.innerHTML = layerHTML();
  X.hidden = false;
  document.documentElement.classList.add('wk-ax');
  history.pushState({ ax: 1 }, '');
  addEventListener('popstate', onPop);
  ro = new ResizeObserver(layout);
  ro.observe(X); ro.observe($('#ax-hud'));
  paint();
  attach();
  $('.ax-close').focus({ preventScroll: true });
}

export function close(fromPop) {
  if (!isOpen()) return;
  if ($('.ax-3d canvas')) mv?.hide();
  ro?.disconnect(); ro = null;
  removeEventListener('popstate', onPop);
  X.hidden = true;
  X.innerHTML = '';
  is3d = false;
  document.documentElement.classList.remove('wk-ax');
  if (!fromPop && history.state?.ax) history.back();
  ctx.closed?.();
}
const onPop = () => close(true);

/* Escape folds the list away first, then closes. */
export function escape() {
  if (!$('#ax-drawer').hidden) toggleList(false);
  else close();
}

/* Settings changed the program's kit: the exercise lists may differ. */
export function refresh() {
  if (!isOpen()) return;
  idx = trainers();
  paint();
}

/* ── markup ── */
function layerHTML() {
  return `<div class="ax-stage"><div class="ax-2d">${MAP_2D}</div><div class="ax-3d"></div></div>
    <svg class="ax-wire" aria-hidden="true"><path class="ax-lead"/><path class="ax-tick"/><circle class="ax-ring" r="12"/><circle class="ax-dot" r="3.5"/></svg>
    <header class="ax-top">
      <div class="ax-title">
        <div class="ax-k">Anatomy<i>//</i><span>${REGIONS.length} muscles</span></div>
        <div class="ax-hint"><span class="ax-touch">Drag to turn · pinch to zoom · tap a muscle</span><span class="ax-mouse">Drag to turn · scroll to zoom · right-drag to move · click a muscle</span></div>
      </div>
      <div class="ax-tools">
        <button type="button" class="ax-btn ax-find" data-act="an-list" aria-expanded="false" aria-controls="ax-drawer">${I.find}<span>Muscles</span></button>
        <button type="button" class="ax-btn" data-act="an-home" aria-label="Whole body" title="Whole body">${I.home}</button>
        <button type="button" class="ax-btn ax-close" data-act="an-close" aria-label="Close anatomy" title="Close">${I.close}</button>
      </div>
    </header>
    <div class="ax-load" id="ax-load">Loading the 3D body…</div>
    <section class="ax-hud" id="ax-hud" aria-live="polite"></section>
    <aside class="ax-drawer" id="ax-drawer" hidden aria-label="Muscles">
      <div class="ax-drawer-h">
        <input id="an-q" class="ax-q" type="search" placeholder="Search — deltoid, quads, lats…" value="${esc(qry)}" autocomplete="off" aria-label="Search muscles">
        <button type="button" class="ax-btn" data-act="an-list" aria-label="Close the list">${I.close}</button>
      </div>
      <div class="an-groups" id="an-groups"></div>
      <div class="ax-list" id="an-list"></div>
    </aside>`;
}

/* Muscles the list shows: the group chip, then the search. */
function shown() {
  const t = qry.trim().toLowerCase();
  return REGIONS.filter(r => (!grp || r.group === grp) &&
    (!t || [r.name, r.group, A[r.id].l].some(s => s.toLowerCase().includes(t))));
}

/* The readout: a chart of the muscle, tied to it by the line. */
function hudHTML() {
  const r = R(sel), a = A[sel], rs = shown().length ? shown() : REGIONS, at = rs.findIndex(x => x.id === sel);
  const tr = [...(idx.get(sel)?.values() || [])].sort((x, y) => x.tier - y.tier || x.n.localeCompare(y.n));
  const tiers = [1, 2, 3].map(t => [t, tr.filter(e => e.tier === t)]).filter(([, l]) => l.length);
  return `<div class="ax-hud-h">
      <div class="ax-hud-t">
        <div class="ax-k2"><span>${r.group}${r.deep ? ' · deep' : ''}</span><b>${at >= 0 ? String(at + 1).padStart(2, '0') : '--'}/${String(rs.length).padStart(2, '0')}</b></div>
        <h2 class="ax-name">${r.name}</h2>
        <div class="ax-latin">${a.l}</div>
      </div>
      <div class="ax-hud-b">
        <button type="button" class="ax-sq" data-act="an-step" data-d="-1" aria-label="Previous muscle">${I.prev}</button>
        <button type="button" class="ax-sq" data-act="an-step" data-d="1" aria-label="Next muscle">${I.next}</button>
        <button type="button" class="ax-sq ax-fold" data-act="an-min" aria-expanded="${!min}" aria-label="${min ? 'Show the details' : 'Fold the details away'}">${I.fold}</button>
      </div>
    </div>
    <div class="ax-hud-body">
      <p class="ax-does">${a.a}</p>
      <dl class="ax-rows">
        <div><dt>Origin</dt><dd>${a.o}</dd></div>
        <div><dt>Insertion</dt><dd>${a.i}</dd></div>
        <div><dt>Nerve</dt><dd>${a.v}</dd></div>
      </dl>
      ${a.u ? `<p class="ax-note">Deep muscle: it lies under ${a.u}, so the body shows it through them.</p>` : ''}
      ${a.t ? `<p class="ax-note">${a.t}</p>` : ''}
      <div class="ax-train">
        <div class="ax-sub">In your program</div>
        ${tiers.length ? tiers.map(([t, l]) => `<div class="ax-tier">
          <span class="ax-tier-l lvl-${t}">${TIER[t]}</span>
          <div class="ax-exs">${l.map(e => `<button type="button" class="an-ex lvl-${t}" data-act="row" data-di="${e.slot[0]}" data-si="${e.slot[1]}" data-ei="${e.slot[2]}">${esc(e.n)}</button>`).join('')}</div>
        </div>`).join('') : `<p class="ax-none">Nothing in your current program lists it.</p>`}
      </div>
    </div>`;
}

function groupsHTML() {
  return [['', 'All', REGIONS.length], ...GROUPS.map(g => [g, g, REGIONS.filter(r => r.group === g).length])]
    .map(([g, n, c]) => `<button type="button" class="an-chip" data-act="an-grp" data-g="${g}" aria-pressed="${g === grp}">${n}<small>${c}</small></button>`).join('');
}

function listHTML() {
  const rs = shown();
  if (!rs.length) return `<div class="pg-empty">No muscle matches "${esc(qry)}".</div>`;
  return `<div class="ax-list-h"><span>${rs.length} muscle${rs.length === 1 ? '' : 's'}</span><span>In program</span></div>` +
    [...new Set(rs.map(r => r.group))].map(g =>
      `<div class="an-grp-h">${g}</div>` + rs.filter(r => r.group === g).map(r => {
        const n = idx.get(r.id)?.size || 0;
        return `<button type="button" class="an-row${r.id === sel ? ' on' : ''}" data-act="an-pick" data-id="${r.id}"${r.id === sel ? ' aria-current="true"' : ''}>
          <span class="an-row-t"><span class="an-row-n">${r.name}${r.deep ? '<i>deep</i>' : ''}</span><span class="an-row-l">${A[r.id].l}</span></span>
          <span class="an-row-c${n ? '' : ' none'}" title="${n} exercise${n === 1 ? '' : 's'} in your program work${n === 1 ? 's' : ''} it">${n}</span>
        </button>`;
      }).join('')).join('');
}

function paint() {
  const hud = $('#ax-hud');
  hud.innerHTML = hudHTML();
  hud.classList.toggle('min', min);
  $('#an-groups').innerHTML = groupsHTML();
  $('#an-list').innerHTML = listHTML();
  light();
  layout();
}

/* ── the body ── */

/* The faint muscles round the bright one: the group chip's, or else the
   selected muscle's own group. */
const groupIds = () => REGIONS.filter(r => r.group === (grp || R(sel).group) && r.id !== sel).map(r => r.id);

function light() {
  const g = new Set(groupIds());
  if (is3d) mv.study(sel, [...g]);
  X.querySelectorAll('.an-region').forEach(el => {
    const id = regionOfMapId(el.dataset.mid);
    el.classList.toggle('lvl-1', id === sel);
    el.classList.toggle('lvl-3', id !== sel && g.has(id));
  });
  lead();
}

/* How much of the screen the bar, the readout and (on a wide screen) the
   list cover, so the body centres in what is left. */
function insets() {
  const xr = X.getBoundingClientRect(), h = $('#ax-hud').getBoundingClientRect(), top = $('.ax-top').getBoundingClientRect();
  const d = $('#ax-drawer'), dr = !d.hidden && wide() ? d.getBoundingClientRect() : null;
  const ins = { t: top.bottom - xr.top, l: dr ? dr.right - xr.left : 0, r: 0, b: 0 };
  if (wide()) ins.r = xr.right - h.left + 12; else ins.b = xr.bottom - h.top + 10;
  return ins;
}
function layout() {
  if (!isOpen()) return;
  const ins = insets();
  if (is3d) mv.setInset(ins);
  const s = $('.ax-2d').style;
  s.paddingTop = ins.t + 'px'; s.paddingLeft = ins.l + 'px'; s.paddingRight = ins.r + 'px'; s.paddingBottom = ins.b + 'px';
  lead();
}

/* The label line: from the muscle to the readout's title, with a dot and
   a ring where it meets the muscle. Dashed while the point is turned away
   from you; gone while it is off screen or behind the readout. */
function lead() {
  if (!isOpen()) return;
  const xr = X.getBoundingClientRect(), wire = $('.ax-wire'), hr = $('#ax-hud').getBoundingClientRect();
  let p = null;
  if (is3d) p = mv.anchorOf(sel);
  else {
    const el = [...X.querySelectorAll('.ax-2d .an-region.lvl-1')].find(e => e.getClientRects().length);
    if (el) { const b = el.getBoundingClientRect(); p = { x: b.x + b.width / 2 - xr.x, y: b.y + b.height / 2 - xr.y, front: true, on: true }; }
  }
  const H = { l: hr.left - xr.left, r: hr.right - xr.left, t: hr.top - xr.top, b: hr.bottom - xr.top };
  const off = !p || !p.on || p.x < 0 || p.y < 0 || p.x > xr.width || p.y > xr.height ||
    (p.x > H.l && p.x < H.r && p.y > H.t && p.y < H.b);
  wire.classList.toggle('off', off);
  if (off) return;
  wire.classList.toggle('back', !p.front);
  let A, E, tick;
  if (wide()) {
    A = { x: H.l, y: H.t + 38 };
    E = { x: A.x - Math.min(48, Math.max(0, A.x - p.x) / 2), y: A.y };
    tick = `M${A.x} ${A.y - 10}V${A.y + 10}`;
  } else {
    A = { x: clamp(p.x, H.l + 24, H.r - 24), y: H.t };
    E = { x: A.x, y: Math.max(p.y, A.y - 22) };
    tick = `M${A.x - 10} ${A.y}H${A.x + 10}`;
  }
  wire.querySelector('.ax-lead').setAttribute('d', `M${p.x} ${p.y}L${E.x} ${E.y}L${A.x} ${A.y}`);
  wire.querySelector('.ax-tick').setAttribute('d', tick);
  for (const c of wire.querySelectorAll('circle')) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); }
}

/* Put the 3D body in the layer — on opening, and again when the exercise
   card hands it back. The 2D map stands in until it is ready, and for
   good where there is no WebGL. */
export function attach() {
  if (!isOpen() || !ctx.free()) return;
  const box = $('.ax-3d'), back = is3d;
  ctx.loadMV()
    .then(m => {
      mv = m;
      if (!box.isConnected || !ctx.free()) return false;
      return m.orbit(box, { onTap: r => r && pick(r.id, true), onFrame: lead, inset: insets() });
    })
    .then(ok => {
      if (ok === false || !box.isConnected) return;
      is3d = true;
      X.classList.add('is-3d');
      layout();
      light();
      if (back) mv.face(sel);
    })
    .catch(() => { is3d = false; X?.classList.add('no-3d'); layout(); });
}

/* ── interaction ── */
function pick(id, fly) {
  if (!R(id)) return;
  sel = id;
  keep();
  $('#ax-hud').innerHTML = hudHTML();
  X.querySelectorAll('.an-row').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  light();
  if (fly && is3d) mv.face(id);
}

function toggleList(on) {
  const d = $('#ax-drawer');
  d.hidden = !on;
  $('.ax-find').setAttribute('aria-expanded', String(on));
  X.classList.toggle('listing', on);
  layout();
  if (on && wide()) $('#an-q').focus({ preventScroll: true });
}

export function search(v) {
  qry = v;
  if (isOpen()) $('#an-list').innerHTML = listHTML();
}

/* Every data-act starting an- lands here. */
export function act(el) {
  if (!isOpen()) return;
  const a = el.dataset;
  switch (a.act) {
    case 'an-close': close(); break;
    case 'an-home':  if (is3d) mv.home(); break;
    case 'an-list':  toggleList($('#ax-drawer').hidden); break;
    case 'an-min':
      min = !min; keep();
      $('#ax-hud').classList.toggle('min', min);
      el.setAttribute('aria-expanded', String(!min));
      el.setAttribute('aria-label', min ? 'Show the details' : 'Fold the details away');
      layout();
      break;
    case 'an-pick':
      pick(a.id, true);
      if (!wide()) toggleList(false);
      break;
    case 'an-2d':   pick(regionOfMapId(a.mid)); break;
    case 'an-step': {
      const rs = shown().length ? shown() : REGIONS, at = rs.findIndex(r => r.id === sel);
      pick(rs[(at + +a.d + rs.length) % rs.length].id, true);
      break;
    }
    case 'an-grp':
      grp = grp === a.g ? '' : a.g;
      $('#an-groups').innerHTML = groupsHTML();
      $('#an-list').innerHTML = listHTML();
      if (grp && R(sel).group !== grp) pick(REGIONS.find(r => r.group === grp).id, true);
      else light();
      break;
  }
}

/* For the Anatomy tile in the extras tray. */
export const COUNT = REGIONS.length;
