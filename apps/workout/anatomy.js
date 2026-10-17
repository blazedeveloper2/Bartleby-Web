/* ═══════════════════════════════════════════════════════════
   WORKOUT — ANATOMY

   Every muscle the app can light (muscles3d.js REGIONS), to study, full
   screen over the whole app. One body you turn any way, pinch in on and
   slide about (muscleview.js orbit); tap a muscle, or pick it from the
   list, and it lights up, the camera comes round to it, and a readout
   tied to it by a line says what it is, what it does, where it attaches,
   which nerve runs it, and what in your program trains it — each of
   those a way into that exercise's card.

   Settings (the sliders button) pose and dress the body: a pose, shorts
   on or off, the deep layer, colour by muscle, group or this week's
   training (the training map) or by recovery (time since each muscle
   last worked), a pulse on the selected muscle, idle life (breathing, a
   small weight shift), bending a limb yourself — the muscles doing that
   movement light up while you do — a slow auto-spin, and a hologram
   skin.
   Search finds muscles by name or by what they do ("elbow flexion"),
   and exercises too: pick one and the body lights what it works. The quiz runs in the readout: name the muscle that
   lights up, or find the one named on the body, with the muscles you
   miss coming round more often.

   The body is the exercise card's own 3D view, borrowed while this is
   open. There is one canvas for both, so opening an exercise from here
   takes it into the card, and closing the card hands it back (attach()).
   Until the model has loaded, and wherever WebGL is missing, the 2D body
   map stands in and works the same way.
   ═══════════════════════════════════════════════════════════ */

import { PROGRAM, MMAP } from './data.js?v=3d-oct14d';
import { load, save } from './store.js?v=3d-oct14d';
import { REGIONS, regionsOfMuscle, regionOfMapId } from './muscles3d.js?v=3d-oct16g';
import { MUSCLE_SVG } from './bodymap.js?v=3d-oct14d';
import { resEx, setCountOf } from './rank.js?v=3d-oct16g';
import { weekWork, lastDone } from './sessions.js?v=3d-oct16g';

/* ── the reference ──

   l  the anatomical name     o  origin (the end that stays put)
   a  what it does            i  insertion (the end it pulls on)
   v  the nerve that runs it, with its spinal roots
   t  a note for training, where one helps
   u  for a deep muscle, what it lies under

   Standard anatomy-text attachments (Gray's, Moore's), in plain words
   first where a plain word exists, checked against Kenhub,
   TeachMeAnatomy and Wikipedia's Gray's-sourced pages in Oct 2026; the
   training notes on the six added then (supraspinatus to the neck) each
   rest on a PubMed study. The
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
  'glute': { l: 'Gluteus maximus',
    a: 'Drives the hip straight from a bend (hip extension), as when you stand up from a squat or climb, and turns the thigh outward; its upper fibers help lift the thigh out to the side.',
    o: 'Back of the hip bone (posterior ilium), the sacrum and tailbone, and the sacrotuberous ligament',
    i: 'Iliotibial band and the gluteal tuberosity at the back of the thigh bone',
    v: 'Inferior gluteal nerve (L5–S2)',
    t: 'By volume, the largest single muscle in the body. Hip thrusts load it hardest at full hip extension, but in a 9-week trial in beginners squats grew it about as much, and full squats grew it more than half squats.' },
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
  'supra': { l: 'Supraspinatus', u: 'the trapezius',
    a: 'Helps the deltoid lift the arm out to the side, and holds the ball of the shoulder centered in its socket.',
    o: 'The hollow above the spine of the shoulder blade (supraspinous fossa)',
    i: 'Top facet of the greater tubercle, the outer knob at the top of the humerus',
    v: 'Suprascapular nerve (C5–C6)',
    t: 'It switches on just before the arm moves, at the same time as the deltoid, infraspinatus and traps, so it does not start the lift alone. Thumbs-up raises angled slightly forward ("full can") work it as hard as thumbs-down ones ("empty can"), with less deltoid.' },
  'infra': { l: 'Infraspinatus and teres minor',
    a: 'Turn the arm outward (external rotation) and hold the ball of the shoulder down and back in its socket against the deltoid\'s upward pull. Teres minor also helps bring a raised arm back down to the side.',
    o: 'Infraspinatus: the hollow below the spine of the shoulder blade (infraspinous fossa). Teres minor: upper two-thirds of the outer edge of the shoulder blade (lateral border)',
    i: 'Back of the greater tubercle of the humerus: infraspinatus to its middle facet, teres minor to the lowest',
    v: 'Infraspinatus: suprascapular nerve (C5–C6). Teres minor: axillary nerve (C5–C6)',
    t: 'They are the main external rotators. In a fine-wire EMG study, side-lying external rotation with the elbow at the side worked both harder than any of the standing or prone versions tested.' },
  'gmed': { l: 'Gluteus medius (gluteus minimus beneath)',
    a: 'Lifts the thigh out to the side (abduction) and, when you stand on one leg, keeps the pelvis level. Its front fibers turn the thigh inward, its back fibers outward. Gluteus minimus, under it, does much the same.',
    o: 'Outer face of the upper hip bone, below its crest (gluteal surface of the ilium, between the anterior and posterior gluteal lines)',
    i: 'Outer face of the greater trochanter, the big knob at the top of the thigh bone',
    v: 'Superior gluteal nerve (L4–S1), which also runs gluteus minimus and the TFL',
    t: 'When it is weak, the pelvis drops on the side of the lifted leg as you stand on the other (a positive Trendelenburg sign). In EMG studies, side-lying leg raises and side planks with a leg raise worked it hardest, with single-leg squats close behind.' },
  'tfl': { l: 'Tensor fasciae latae',
    a: 'Helps lift the thigh forward and out to the side and turn it inward, and tightens the iliotibial band, steadying the knee when you stand on that leg.',
    o: 'Front of the outer lip of the hip crest and the anterior superior iliac spine (ASIS), the bony point at the front of the hip',
    i: 'The iliotibial band, which runs down the outside of the thigh to a bump on the outer top of the shin (Gerdy\'s tubercle, lateral tibial condyle)',
    v: 'Superior gluteal nerve (L4–S1)',
    t: 'It shares hip abduction with the gluteus medius but also turns the thigh in. In a fine-wire EMG study, clamshells, band side-steps, single-leg bridges and quadruped hip extensions worked the glutes significantly more than the TFL.' },
  'tib': { l: 'Tibialis anterior',
    a: 'Pulls the foot up (dorsiflexion) and turns the sole inward (inversion); helps hold up the inner arch. The strongest muscle that pulls the foot up.',
    o: 'Outer surface of the upper two-thirds of the shinbone (lateral condyle and lateral surface of the tibia), and the membrane between tibia and fibula (interosseous membrane)',
    i: 'Inner side of the midfoot: the medial cuneiform and the base of the first metatarsal',
    v: 'Deep fibular (peroneal) nerve (L4–L5)',
    t: 'It lifts the toes clear as the leg swings through and lowers the foot under control after the heel lands; if its nerve is damaged the foot drops and drags. Common "shin splints" (medial tibial stress syndrome) hurt along the inner back edge of the shin, away from this muscle, and are mainly a bone-stress injury.' },
  'scm': { l: 'Sternocleidomastoid',
    a: 'One side turns the face to the opposite side and tilts the head toward the same shoulder; both together bend the neck forward and, when you breathe hard, lift the breastbone.',
    o: 'Two heads: the top front of the breastbone (manubrium) and the top of the inner third of the collarbone (medial clavicle)',
    i: 'The bony bump behind the ear (mastoid process) and the outer half of the superior nuchal line at the back of the skull',
    v: 'Spinal accessory nerve (cranial nerve XI); C2–C3 carry its sense of position',
    t: 'The right one turns your head to the left. In a 12-week MRI study, squats, deadlifts, push presses and rows did not grow the neck muscles; only direct neck work did, and only in the muscles it trained.' },
};

/* Joint actions for search ("elbow flexion" finds every muscle that
   does it), one shared vocabulary across muscles. */
const TAGS = {
  'pec-up':   ['shoulder flexion', 'horizontal adduction', 'shoulder internal rotation'],
  'pec':      ['horizontal adduction', 'shoulder adduction', 'shoulder extension', 'shoulder internal rotation'],
  'delt-a':   ['shoulder flexion', 'shoulder internal rotation', 'horizontal adduction'],
  'delt-s':   ['shoulder abduction', 'horizontal abduction'],
  'rdelt':    ['horizontal abduction', 'shoulder extension', 'shoulder external rotation'],
  'trap':     ['scapular elevation', 'scapular upward rotation', 'neck extension'],
  'trap-m':   ['scapular retraction'],
  'rhom':     ['scapular retraction', 'scapular elevation', 'scapular downward rotation'],
  'lat':      ['shoulder extension', 'shoulder adduction', 'shoulder internal rotation'],
  'erec':     ['spinal extension', 'lateral flexion', 'trunk bracing'],
  'bi':       ['elbow flexion', 'forearm supination', 'shoulder flexion'],
  'brach':    ['elbow flexion'],
  'tri-long': ['elbow extension', 'shoulder extension', 'shoulder adduction'],
  'tri-lat':  ['elbow extension'],
  'brad':     ['elbow flexion', 'forearm pronation', 'forearm supination'],
  'fore-f':   ['wrist flexion', 'wrist radial deviation', 'wrist ulnar deviation'],
  'fore-b':   ['wrist extension', 'wrist radial deviation', 'wrist ulnar deviation'],
  'abs-1':    ['spinal flexion', 'trunk bracing'],
  'abs-2':    ['spinal flexion', 'trunk bracing'],
  'abs-3':    ['spinal flexion', 'posterior pelvic tilt', 'trunk bracing'],
  'obli':     ['trunk rotation', 'lateral flexion', 'spinal flexion', 'trunk bracing'],
  'serra':    ['scapular protraction', 'scapular upward rotation'],
  'tva':      ['trunk bracing'],
  'hipflex':  ['hip flexion', 'spinal flexion'],
  'glute':    ['hip extension', 'hip external rotation', 'hip abduction'],
  'addu':     ['hip adduction', 'hip extension', 'hip flexion'],
  'quad-rf':  ['knee extension', 'hip flexion'],
  'quad-vl':  ['knee extension'],
  'quad-vm':  ['knee extension'],
  'ham':      ['knee flexion', 'hip extension'],
  'gastro':   ['ankle plantar flexion', 'knee flexion'],
  'soleus':   ['ankle plantar flexion'],
  'supra':    ['shoulder abduction', 'shoulder stabilization'],
  'infra':    ['shoulder external rotation', 'shoulder stabilization'],
  'gmed':     ['hip abduction', 'hip internal rotation', 'pelvic stabilization'],
  'tfl':      ['hip abduction', 'hip flexion', 'hip internal rotation'],
  'tib':      ['ankle dorsiflexion', 'foot inversion'],
  'scm':      ['neck rotation', 'neck flexion', 'neck lateral flexion'],
};

/* A muscle's reference, or a stand-in for one the rig has but this table
   does not yet, so a new region can never break the readout. */
const info = id => A[id] || { l: R(id)?.name || id, a: '', o: '—', i: '—', v: '—' };

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
  set:   ico('<path d="M4 6h9"/><path d="M17 6h3"/><path d="M4 12h3"/><path d="M11 12h9"/><path d="M4 18h11"/><path d="M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
};

/* Colours for "colour the body": each muscle its own hue, spread round
   the wheel by the golden angle so neighbours differ, or one hue per
   group. Both keep out of 0–50°, the skin's own range, so a colour never
   reads as skin. The deep muscles are coloured only with the deep layer
   on: otherwise they would muddy the ones over them. */
const SURFACE = REGIONS.filter(r => !r.deep);
const HUE = {
  muscle: Object.fromEntries(REGIONS.map((r, i) => [r.id, 55 + (i * 137.508) % 290])),
  group: Object.fromEntries(REGIONS.map(r => [r.id, 55 + GROUPS.indexOf(r.group) * 290 / GROUPS.length])),
};
const swatch = (id, by) => HUE[by]?.[id] === undefined ? null : `hsl(${Math.round(HUE[by][id])}, 72%, 55%)`;

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

/* ── the training map ──
   The sets each muscle got this week. Each exercise brings its sets
   (logged, or its prescribed sets when it was ticked off without them),
   counted in full for a primary muscle and as half for a supporting one,
   the usual way of counting "fractional" sets, and not at all for a
   stabilizer. The bands follow the dose most studies point to for
   growth, about 10–20 hard sets a week per muscle. */
const BANDS = [[0.5, 'Under 5', 'hsl(215, 80%, 62%)'], [5, '5–9', 'hsl(175, 65%, 45%)'], [10, '10–20', 'hsl(135, 62%, 48%)'], [20.5, 'Over 20', 'hsl(42, 95%, 55%)']];
const bandOf = v => { let b = null; for (const x of BANDS) if (v >= x[0]) b = x; return b; };
const fmtSets = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
function weekSets() {
  const byName = new Map(), out = new Map();
  PROGRAM.forEach(day => day.sections.forEach(sec => sec.ex.forEach(raw => { const ex = resEx(raw); byName.set(ex.n, ex); })));
  for (const [n, w] of weekWork()) {
    const ex = byName.get(n), sets = ex ? Math.max(w.sets, w.checked ? setCountOf(ex) : 0) : 0;
    if (!sets) continue;
    for (const [id, tier] of tiersOf(ex.m || '')) if (tier < 3) out.set(id, (out.get(id) || 0) + sets * (tier === 1 ? 1 : 0.5));
  }
  return out;
}

/* ── the recovery map ──
   How long since each muscle last worked as a primary or supporting
   muscle: from the sessions' own clock (each set's time) and, for days
   finished before timing existed, the logbook's date, taken as that
   evening. The bands follow the usual guidance that a muscle trained
   hard wants about two to three days before it is trained hard again;
   past four days it is due, and after two weeks it is left uncoloured. */
const REST = [[0, 'Just trained', 'hsl(5, 80%, 60%)'], [24, 'Recovering', 'hsl(38, 95%, 55%)'], [48, 'Ready', 'hsl(135, 62%, 48%)'], [96, 'Due', 'hsl(215, 80%, 62%)']];
const REST_MAX = 14 * 24;
function lastWorked() {
  const when = new Map();
  const stamp = (ex, t) => { for (const [id, tier] of tiersOf(ex.m || '')) if (tier < 3 && t > (when.get(id) || 0)) when.set(id, t); };
  for (const [n, t] of lastDone()) { const e = exs.get(n); if (e) stamp(e.ex, t); }
  for (const e of load('bp_log', [])) {
    const day = PROGRAM[e.di];
    if (!day || !e.d) continue;
    const t = new Date(e.d + 'T18:00').getTime();
    day.sections.forEach(sec => sec.opt || sec.ex.forEach(raw => stamp(resEx(raw), t)));
  }
  return when;
}
const hoursSince = id => { const t = rested.get(id); return t ? Math.max(0, (Date.now() - t) / 36e5) : null; };
const restBand = h => (h == null || h > REST_MAX ? null : REST.reduce((b, x) => (h >= x[0] ? x : b), null));
const ago = h => (h < 1 ? 'within the hour' : h < 24 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'} ago`);
const agoShort = h => (h == null ? '—' : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

/* ── exercises ──
   Every exercise the program runs, once, with where it lives, for search
   and for exercise view (`exv`): the body lit by what one exercise works,
   primary, supporting and stabilizing. */
function exercises() {
  const out = new Map();
  PROGRAM.forEach((day, di) => day.sections.forEach((sec, si) => sec.ex.forEach((raw, ei) => {
    const ex = resEx(raw);
    if (!out.has(ex.n)) out.set(ex.n, { ex, slot: [di, si, ei] });
  })));
  return out;
}

/* ── state ── */
const PREF = 'bp_anat';
const pref = load(PREF, {});
let sel = R(pref.sel) ? pref.sel : 'pec';
let min = !!pref.min;    // the readout folded down to its name
/* the settings; atlas is how the body is coloured: '' (not at all),
   'muscle', 'group', 'week' (the training map) or 'rest' (recovery) */
const look = { shorts: true, atlas: '', spin: false, holo: false, deep: false, flex: false, idle: false, bend: false, pose: 'rest', ...(pref.look || {}) };
if (!['', 'muscle', 'group', 'week', 'rest'].includes(look.atlas)) look.atlas = '';
/* quiz record, id → [right, asked] */
const stats = pref.quiz && typeof pref.quiz === 'object' ? pref.quiz : {};
let hudOn = true;        // the readout is up (a tap on empty space puts it away)
let quiz = null;         // the quiz under way: { kind, id, lit, opts, done, picked, right, total, streak }
let grp = '', qry = '';
let week = new Map();    // weekSets()
let rested = new Map();  // lastWorked()
let exs = new Map();     // exercises()
let exv = null;          // the exercise being viewed: { n, ex, slot, tiers: Map(region → tier) }
let bending = null;      // { action, side } while a limb is being bent by hand
let X = null;            // the full-screen layer, #ax
let idx = new Map();     // trainers()
let ctx = null;          // { loadMV, free, layer } from index.js
let mv = null;           // muscleview.js, once loaded
let is3d = false;
let ro = null;

const keep = () => save(PREF, { sel, min, look, quiz: stats });
const css = n => getComputedStyle(X).getPropertyValue(n).trim();

/* The colour a muscle wears right now, or null: the exercise's tiers in
   exercise view, else the training map's band, else its own or its
   group's hue. */
function colourOf(id) {
  if (exv) return exv.tiers.has(id) ? [null, css('--blue'), css('--amber'), 'hsl(210, 30%, 72%)'][exv.tiers.get(id)] : null;
  if (R(id)?.deep && !look.deep) return null;
  if (look.atlas === 'week') return bandOf(week.get(id) || 0)?.[2] || null;
  if (look.atlas === 'rest') return restBand(hoursSince(id))?.[2] || null;
  return look.atlas ? swatch(id, look.atlas) : null;
}
function atlasMap() {
  const m = new Map();
  for (const r of REGIONS) { const c = colourOf(r.id); if (c) m.set(r.id, c); }
  return m.size ? m : null;
}
/* Side panels (readout right, list left) on a wide screen, and on a
   phone turned on its side, where a readout along the bottom would leave
   the body a strip. workout.css uses the same query. */
const WIDE = matchMedia('(min-width: 900px), (min-aspect-ratio: 4/3) and (min-width: 600px)');
const wide = () => WIDE.matches;
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
  idx = trainers(); week = weekSets(); exs = exercises(); rested = lastWorked();
  is3d = false; hudOn = true; exv = null;
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
  is3d = false; quiz = null; exv = null;
  document.documentElement.classList.remove('wk-ax');
  if (!fromPop && history.state?.ax) history.back();
  ctx.closed?.();
}
const onPop = () => close(true);

/* Escape puts away the settings, then the list, then the quiz, then
   closes. */
export function escape() {
  if (!$('#ax-set').hidden) toggleSet(false);
  else if (!$('#ax-drawer').hidden) toggleList(false);
  else if (quiz) endQuiz();
  else if (exv) leaveExercise();
  else close();
}

/* Settings changed the program's kit: the exercise lists may differ. */
export function refresh() {
  if (!isOpen()) return;
  idx = trainers(); week = weekSets(); exs = exercises(); rested = lastWorked();
  if (exv) exv = exs.has(exv.n) ? viewOf(exv.n) : null;
  paint();
}

/* ── markup ── */
function layerHTML() {
  return `<div class="ax-stage"><div class="ax-2d" data-act="an-air">${MAP_2D}</div><div class="ax-3d"></div></div>
    <svg class="ax-wire" aria-hidden="true"><path class="ax-lead"/><path class="ax-tick"/><circle class="ax-ring" r="12"/><circle class="ax-dot" r="3.5"/></svg>
    <header class="ax-top">
      <div class="ax-title"><div class="ax-k">Anatomy</div></div>
      <div class="ax-tools">
        <button type="button" class="ax-btn ax-find" data-act="an-list" aria-expanded="false" aria-controls="ax-drawer">${I.find}<span>Muscles</span></button>
        <button type="button" class="ax-btn ax-gear" data-act="an-set" aria-expanded="false" aria-controls="ax-set" aria-label="Settings and quiz" title="Settings and quiz">${I.set}</button>
        <button type="button" class="ax-btn" data-act="an-home" aria-label="Whole body" title="Whole body">${I.home}</button>
        <button type="button" class="ax-btn ax-close" data-act="an-close" aria-label="Close anatomy" title="Close">${I.close}</button>
      </div>
    </header>
    <div class="ax-load" id="ax-load">Loading the 3D body…</div>
    <div class="ax-legend" id="ax-legend" hidden></div>
    <div class="ax-set" id="ax-set" hidden></div>
    <section class="ax-hud" id="ax-hud" aria-live="polite"></section>
    <aside class="ax-drawer" id="ax-drawer" hidden aria-label="Muscles">
      <div class="ax-drawer-h">
        <input id="an-q" class="ax-q" type="search" placeholder="Muscle, exercise or action" value="${esc(qry)}" autocomplete="off" aria-label="Search muscles, exercises and actions">
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
    (!t || [r.name, r.group, info(r.id).l, ...(TAGS[r.id] || [])].some(s => s.toLowerCase().includes(t))));
}
/* Exercises the search matches, by name (only while searching) */
function shownEx() {
  const t = qry.trim().toLowerCase();
  return t.length < 2 ? [] : [...exs.values()].filter(e => e.ex.n.toLowerCase().includes(t));
}

/* The readout: a chart of the muscle, tied to it by the line. */
function hudHTML() {
  const r = R(sel), a = info(sel), rs = shown().length ? shown() : REGIONS, at = rs.findIndex(x => x.id === sel), wk = week.get(sel) || 0;
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
      ${a.a ? `<p class="ax-does">${a.a}</p>` : ''}
      ${TAGS[sel]?.length ? `<div class="ax-tags">${TAGS[sel].map(t => `<button type="button" class="ax-tag" data-act="an-tag" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      <dl class="ax-rows">
        <div><dt>Origin</dt><dd>${a.o}</dd></div>
        <div><dt>Insertion</dt><dd>${a.i}</dd></div>
        <div><dt>Nerve</dt><dd>${a.v}</dd></div>
      </dl>
      ${a.u ? `<p class="ax-note">Deep muscle: it lies under ${a.u}, so the body shows it through them.</p>` : ''}
      ${a.t ? `<p class="ax-note">${a.t}</p>` : ''}
      <div class="ax-train">
        <div class="ax-sub">In your program${wk ? `<b>${fmtSets(wk)} set${wk === 1 ? '' : 's'} this week</b>` : ''}${hoursSince(sel) != null ? `<b>trained ${ago(hoursSince(sel))}</b>` : ''}</div>
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
  const rs = shown(), xs = shownEx(), byWeek = look.atlas === 'week', byRest = look.atlas === 'rest';
  if (!rs.length && !xs.length) return `<div class="pg-empty">Nothing matches "${esc(qry)}".</div>`;
  const exHTML = xs.length ? `<div class="an-grp-h">Exercises</div>` + xs.map(e => `<button type="button" class="an-row ex" data-act="an-exv" data-n="${esc(e.ex.n)}">
      <span class="an-row-t"><span class="an-row-n">${esc(e.ex.n)}</span><span class="an-row-l">${esc(e.ex.m || '')}</span></span>
      <span class="an-row-c">${esc(e.ex.s || '')}</span>
    </button>`).join('') : '';
  return exHTML + (rs.length ? `<div class="ax-list-h"><span>${rs.length} muscle${rs.length === 1 ? '' : 's'}</span><span>${byWeek ? 'Sets this week' : byRest ? 'Last trained' : 'In program'}</span></div>` : '') +
    [...new Set(rs.map(r => r.group))].map(g =>
      `<div class="an-grp-h">${g}</div>` + rs.filter(r => r.group === g).map(r => {
        const n = byWeek ? week.get(r.id) || 0 : byRest ? (hoursSince(r.id) ?? 0) : idx.get(r.id)?.size || 0;
        const sw = !exv && colourOf(r.id);
        return `<button type="button" class="an-row${r.id === sel ? ' on' : ''}${sw ? ' sw' : ''}" data-act="an-pick" data-id="${r.id}"${r.id === sel ? ' aria-current="true"' : ''}${sw ? ` style="--sw:${sw}"` : ''}>
          <span class="an-row-t"><span class="an-row-n">${r.name}${r.deep ? '<i>deep</i>' : ''}</span><span class="an-row-l">${info(r.id).l}</span></span>
          <span class="an-row-c${n ? '' : ' none'}" title="${byRest ? (hoursSince(r.id) == null ? 'Not trained yet' : `Trained ${ago(hoursSince(r.id))}`) : byWeek ? `${fmtSets(n)} sets this week` : `${n} exercise${n === 1 ? '' : 's'} in your program work${n === 1 ? 's' : ''} it`}">${byRest ? agoShort(hoursSince(r.id)) : byWeek ? fmtSets(n) : n}</span>
        </button>`;
      }).join('')).join('');
}

function paint() {
  const hud = $('#ax-hud');
  hud.innerHTML = quiz ? quizHTML() : exv ? exHTML() : hudHTML();
  hud.classList.toggle('min', min && !quiz);
  hud.classList.toggle('quiz', !!quiz);
  $('#ax-set').innerHTML = setHTML();
  $('#an-groups').innerHTML = groupsHTML();
  $('#an-list').innerHTML = listHTML();
  light();
  layout();
}

/* ── the body ── */

/* The faint muscles round the bright one: the group chip's, or else the
   selected muscle's own group. */
const groupIds = () => REGIONS.filter(r => r.group === (grp || R(sel).group) && r.id !== sel).map(r => r.id);

/* What is lit: the selected muscle, or in a quiz the one asked about
   (none while you are looking for it); the faint group round it only
   when something is lit, and the colours and the quiz are not doing
   that job. Nothing selected, nothing tinted. */
const litId = () => (quiz ? quiz.lit : exv ? null : hudOn ? sel : null);
/* the muscle the label line runs to: the lit one, or an exercise's first
   primary muscle */
const lineId = () => (exv ? [...exv.tiers].find(([, t]) => t === 1)?.[0] || null : litId());
let dressed = '';        // the look last handed to the body, so an unchanged one is not re-applied
function light() {
  const id = litId(), g = new Set(!id || quiz || look.atlas ? [] : groupIds());
  if (is3d) {
    const atlas = atlasMap(), key = JSON.stringify([look.shorts, look.holo, look.deep, look.spin, look.flex, look.idle, look.bend, atlas && [...atlas]]);
    if (key !== dressed) { dressed = key; mv.setLook({ ...look, atlas }); }
    if (!bending) mv.study(id, [...g]);
  }
  X.querySelectorAll('.an-region').forEach(el => {
    const rid = regionOfMapId(el.dataset.mid), sw = rid !== id && colourOf(rid);
    el.classList.toggle('lvl-1', rid === id);
    el.classList.toggle('lvl-3', rid !== id && g.has(rid));
    el.style.fill = sw || '';
  });
  legend();
  lead();
}

/* The key to the colours, under the bar: the training map's bands, or
   an exercise's three tiers. */
const doers = action => REGIONS.filter(r => (TAGS[r.id] || []).includes(action));
function legend() {
  const el = $('#ax-legend');
  if (bending) {
    el.hidden = false;
    el.innerHTML = `<b>${esc(bending.action)}</b>` + doers(bending.action).map(r => `<span><i style="background:${css('--blue')}"></i>${r.name}</span>`).join('');
    return;
  }
  const key = exv ? [[TIER[1], colourOf([...exv.tiers].find(([, t]) => t === 1)?.[0]) || css('--blue')], [TIER[2], css('--amber')], [TIER[3], 'hsl(210, 30%, 72%)']]
    : look.atlas === 'week' && !quiz ? BANDS.map(([, n, c]) => [n, c])
    : look.atlas === 'rest' && !quiz ? REST.map(([, n, c]) => [n, c]) : null;
  el.hidden = !key;
  if (!key) return;
  const title = exv ? 'Works' : look.atlas === 'rest' ? (rested.size ? 'Since last trained' : 'Nothing trained yet')
    : week.size ? 'Sets this week' : 'Nothing logged this week yet';
  el.innerHTML = `<b>${title}</b>` +
    key.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
}

/* How much of the screen the bar, the readout and (on a wide screen) the
   list cover, so the body centres in what is left. */
function insets() {
  const xr = X.getBoundingClientRect(), h = $('#ax-hud').getBoundingClientRect(), top = $('.ax-top').getBoundingClientRect();
  const d = $('#ax-drawer'), dr = !d.hidden && wide() ? d.getBoundingClientRect() : null;
  const ins = { t: top.bottom - xr.top, l: dr ? dr.right - xr.left : 0, r: 0, b: 0 };
  if ($('#ax-hud').hidden) return ins;
  if (wide()) ins.r = xr.right - h.left + 12; else ins.b = xr.bottom - h.top + 10;
  return ins;
}
/* The layer's and the readout's boxes, measured when something moves
   them (layout()), not on every frame the label line is redrawn. */
let boxes = null;
function layout() {
  if (!isOpen()) return;
  const xr = X.getBoundingClientRect(), hr = $('#ax-hud').getBoundingClientRect();
  boxes = { w: xr.width, h: xr.height, x: xr.left, y: xr.top, H: { l: hr.left - xr.left, r: hr.right - xr.left, t: hr.top - xr.top, b: hr.bottom - xr.top } };
  last = '';
  const ins = insets();
  if (is3d) mv.setInset(ins);
  const s = $('.ax-2d').style;
  s.paddingTop = ins.t + 'px'; s.paddingLeft = ins.l + 'px'; s.paddingRight = ins.r + 'px'; s.paddingBottom = ins.b + 'px';
  lead();
}

/* The label line: from the muscle to the readout's title, with a dot and
   a ring where it meets the muscle. Dashed while the point is turned away
   from you; gone while it is off screen or behind the readout. */
let last = '';           // the line last drawn, so an unmoved one is not redrawn
function lead() {
  if (!isOpen() || !boxes) return;
  const wire = $('.ax-wire'), { H } = boxes;
  let p = null;
  const id = lineId();
  if (!id) p = null;
  else if (is3d) p = mv.anchorOf(id);
  else {
    const el = [...X.querySelectorAll('.ax-2d .an-region')].find(e => regionOfMapId(e.dataset.mid) === id && e.getClientRects().length);
    if (el) { const b = el.getBoundingClientRect(); p = { x: b.x + b.width / 2 - boxes.x, y: b.y + b.height / 2 - boxes.y, front: true, on: true }; }
  }
  const off = !p || !p.on || p.x < 0 || p.y < 0 || p.x > boxes.w || p.y > boxes.h ||
    (!$('#ax-hud').hidden && p.x > H.l && p.x < H.r && p.y > H.t && p.y < H.b);
  const key = off ? 'off' : `${Math.round(p.x * 2)},${Math.round(p.y * 2)},${p.front}`;
  if (key === last) return;
  last = key;
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

/* Bending a limb by hand (look.bend): while the drag lasts, every muscle
   whose actions include the movement lights at full strength, and the
   key names them; letting go puts back what was lit. */
function onBend(info) {
  if (!isOpen() || !is3d) return;
  const was = bending?.action;
  bending = info;
  if (info && info.action !== was) mv.study(null, doers(info.action).map(r => r.id));
  if (!info) light(); else legend();
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
      return m.orbit(box, { onTap: (r, air) => r ? pick(r.id, true) : air && tapAir(), onFrame: lead, onBend, inset: insets(), look: { ...look, atlas: atlasMap() } });
    })
    .then(ok => {
      if (ok === false || !box.isConnected) return;
      is3d = true; dressed = '';
      X.classList.add('is-3d');
      if (look.pose !== 'rest') mv.setPose?.(look.pose);
      layout();
      light();
      if (back && litId()) mv.face(litId());
    })
    .catch(() => { is3d = false; X?.classList.add('no-3d'); layout(); });
}

/* ── interaction ── */
function pick(id, fly) {
  if (!R(id)) return;
  if (quiz) { if (quiz.kind === 'find') answer(id); return; }
  exv = null;
  sel = id;
  keep();
  showHud(true);
  $('#ax-hud').innerHTML = hudHTML();
  X.querySelectorAll('.an-row').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  light();
  if (fly && is3d) mv.face(id);
}

/* A tap on empty space puts away whatever is open, the way apps do:
   the settings, then the list where it covers the body, then the
   readout. A quiz stays: it is waiting on an answer. */
function tapAir() {
  if (!$('#ax-set').hidden) toggleSet(false);
  else if (!$('#ax-drawer').hidden && !wide()) toggleList(false);
  else if (exv) leaveExercise();
  else if (!quiz && hudOn) showHud(false);
}
function showHud(on) {
  if (hudOn === on) return;
  hudOn = on;
  $('#ax-hud').hidden = !on;
  light();
  layout();
}

function toggleSet(on) {
  const d = $('#ax-set');
  if (on) d.innerHTML = setHTML();
  d.hidden = !on;
  $('.ax-gear').setAttribute('aria-expanded', String(on));
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
      if (quiz) endQuiz();
      pick(a.id, true);
      if (!wide()) toggleList(false);
      break;
    case 'an-set':  toggleSet($('#ax-set').hidden); break;
    case 'an-look':
      if (a.k === 'atlas') look.atlas = a.v; else look[a.k] = !look[a.k];
      if (a.k === 'bend' && !look.bend && is3d) mv.resetBend?.();
      keep();
      $('#ax-set').innerHTML = setHTML();
      $('#an-list').innerHTML = listHTML();
      light();
      break;
    case 'an-pose':
      look.pose = a.v; keep();
      $('#ax-set').innerHTML = setHTML();
      if (is3d) mv.setPose?.(a.v);
      break;
    case 'an-exv':
      if (quiz) quiz = null;
      viewExercise(a.n);
      if (!wide()) toggleList(false);
      break;
    case 'an-exit': leaveExercise(); break;
    case 'an-tag':
      qry = a.t;
      $('#an-q').value = qry;
      $('#an-list').innerHTML = listHTML();
      toggleList(true);
      break;
    case 'an-quiz':  startQuiz(a.k); break;
    case 'an-qa':    answer(a.id); break;
    case 'an-qnext': ask(); break;
    case 'an-qend':  endQuiz(); break;
    case 'an-air':   tapAir(); break;
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

/* ── settings ── */
function setHTML() {
  const tog = (k, label, note) => `<div class="ax-set-row">
      <span><b>${label}</b><small>${note}</small></span>
      <button type="button" class="ax-tog" role="switch" data-act="an-look" data-k="${k}" aria-checked="${!!look[k]}" aria-label="${label}"><i></i></button>
    </div>`;
  const seen = POOL.filter(id => stats[id]?.[1]).length;
  const poses = mv?.POSES || [];
  return `<div class="ax-set-k">Body</div>
    ${poses.length > 1 ? `<div class="ax-set-row col">
      <span><b>Pose</b><small>Arms up opens the lats and serratus; flex shows the arms working</small></span>
      <div class="ax-seg" role="group" aria-label="Pose">${poses.map(q =>
        `<button type="button" data-act="an-pose" data-v="${q.id}" aria-pressed="${look.pose === q.id}">${q.name}</button>`).join('')}</div>
    </div>` : ''}
    <div class="ax-set-row col">
      <span><b>Colour the body</b><small>Each muscle, each group, the sets each one got this week, or how long since each last worked</small></span>
      <div class="ax-seg" role="group" aria-label="Colour the body">${[['', 'Off'], ['muscle', 'Each'], ['group', 'Groups'], ['week', 'Week'], ['rest', 'Recovery']].map(([v, n]) =>
        `<button type="button" data-act="an-look" data-k="atlas" data-v="${v}" aria-pressed="${look.atlas === v}">${n}</button>`).join('')}</div>
    </div>
    ${tog('shorts', 'Shorts', 'Off shows the glutes, hips and inner thighs whole')}
    ${tog('deep', 'Deep muscles', 'Show the ones under the surface: rhomboids, transversus, supraspinatus')}
    ${tog('flex', 'Flex on select', 'The selected muscle swells and pulses as if contracting')}
    ${tog('bend', 'Bend it yourself', 'Drag an arm or leg to bend it; the muscles doing the movement light up. Pick the pose again to straighten up')}
    ${tog('idle', 'Idle life', 'Breathes and shifts its weight a little')}
    ${tog('spin', 'Auto-spin', 'Turns slowly whenever you leave him alone')}
    ${tog('holo', 'Hologram skin', 'See-through, with the muscles glowing inside')}
    <div class="ax-set-k">Quiz yourself</div>
    <div class="ax-qbtns">
      <button type="button" class="ax-qb" data-act="an-quiz" data-k="name"><b>Name it</b><small>A muscle lights up; pick its name</small></button>
      <button type="button" class="ax-qb" data-act="an-quiz" data-k="find"><b>Find it</b><small>You get a name; tap it on the body</small></button>
    </div>
    <p class="ax-qstat">${seen ? `You know ${known()} of ${POOL.length} · ${seen} tried` : `${POOL.length} muscles to learn`}</p>`;
}

/* ── exercise view ── */
function viewOf(n) {
  const e = exs.get(n);
  return e && { n, ex: e.ex, slot: e.slot, tiers: tiersOf(e.ex.m || '') };
}
function viewExercise(n) {
  const v = viewOf(n);
  if (!v) return;
  exv = v;
  hudOn = true; $('#ax-hud').hidden = false;
  paint();
  if (is3d) mv.home();
}
function leaveExercise() {
  exv = null;
  paint();
  if (is3d && hudOn) mv.face(sel);
}
function exHTML() {
  const { ex, slot, tiers } = exv;
  const by = [1, 2, 3].map(t => [t, [...tiers].filter(([, k]) => k === t).map(([id]) => R(id)).filter(Boolean)]).filter(([, l]) => l.length);
  return `<div class="ax-hud-h">
      <div class="ax-hud-t">
        <div class="ax-k2"><span>Exercise</span><b>${esc(ex.s || '')}</b></div>
        <h2 class="ax-name">${esc(ex.n)}</h2>
        <div class="ax-latin">${esc(ex.m || '')}</div>
      </div>
      <div class="ax-hud-b">
        <button type="button" class="ax-sq ax-fold" data-act="an-min" aria-expanded="${!min}" aria-label="${min ? 'Show the details' : 'Fold the details away'}">${I.fold}</button>
        <button type="button" class="ax-sq" data-act="an-exit" aria-label="Back to the muscle" title="Back">${I.close}</button>
      </div>
    </div>
    <div class="ax-hud-body">
      <div class="ax-train">
        ${by.length ? by.map(([t, l]) => `<div class="ax-tier">
          <span class="ax-tier-l lvl-${t}">${TIER[t]}</span>
          <div class="ax-exs">${l.map(r => `<button type="button" class="an-ex lvl-${t}" data-act="an-pick" data-id="${r.id}">${r.name}</button>`).join('')}</div>
        </div>`).join('') : `<p class="ax-none">No mapped muscles for this one.</p>`}
      </div>
      <button type="button" class="ax-next" data-act="row" data-di="${slot[0]}" data-si="${slot[1]}" data-ei="${slot[2]}">Open the exercise ${I.next}</button>
    </div>`;
}

/* ── the quiz ──
   Over the muscles you can see (not the deep two). The next one is drawn
   at random, weighted so the ones you get wrong, and the ones you have
   not met, come up more; never the same one twice running. You "know" a
   muscle once you have it right at least twice and three times in five. */
const POOL = SURFACE.map(r => r.id);
const known = () => POOL.filter(id => { const [r, n] = stats[id] || [0, 0]; return r >= 2 && r / n >= 0.6; }).length;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function draw1() {
  const w = POOL.map(id => { const [r, n] = stats[id] || [0, 0]; return id === quiz?.id ? 0 : 1 + (n - r) * 2 + (n ? 0 : 2); });
  let x = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
  while (i < w.length - 1 && (x -= w[i]) > 0) i++;
  return POOL[i];
}
/* four names: the right one, two from its own group where there are
   any (the hard ones), the rest from anywhere */
function options(id) {
  const r = R(id), same = shuffle(SURFACE.filter(x => x.group === r.group && x.id !== id)).slice(0, 2);
  const rest = shuffle(SURFACE.filter(x => x.id !== id && !same.includes(x))).slice(0, 3 - same.length);
  return shuffle([r, ...same, ...rest]).map(x => x.id);
}

function startQuiz(kind) {
  quiz = { kind, right: 0, total: 0, streak: 0 };
  hudOn = true; $('#ax-hud').hidden = false;
  toggleSet(false);
  toggleList(false);
  ask();
}
function ask() {
  const id = draw1(), name = quiz.kind === 'name';
  Object.assign(quiz, { id, lit: name ? id : null, opts: name ? options(id) : null, done: false, picked: null });
  paint();
  if (is3d) name ? mv.face(id) : mv.home();
}
/* `id` is the name picked, the muscle tapped, or '' for "show me" */
function answer(id) {
  if (!quiz || quiz.done) return;
  const ok = id === quiz.id;
  Object.assign(quiz, { done: true, picked: id, lit: quiz.id, total: quiz.total + 1, right: quiz.right + (ok ? 1 : 0), streak: ok ? quiz.streak + 1 : 0 });
  if (id !== '') { const s = stats[quiz.id] || [0, 0]; stats[quiz.id] = [s[0] + (ok ? 1 : 0), s[1] + 1]; keep(); }
  paint();
  if (is3d && quiz.kind === 'find' && !ok) mv.face(quiz.id);
}
function endQuiz() {
  quiz = null;
  paint();
  if (is3d) mv.face(sel);
}

function quizHTML() {
  const q = quiz, r = R(q.id), name = q.kind === 'name', ok = q.picked === q.id;
  const title = q.done ? r.name : name ? 'Name the lit muscle' : `Find the ${r.name}`;
  const sub = q.done ? info(q.id).l : name ? 'Turn him round if you need a better look' : 'Tap it on the body; turn him round if it is on the back';
  const verdict = !q.done ? '' : ok ? 'Correct.'
    : q.picked === '' ? 'Here it is.'
    : name ? `Not quite. You picked the ${R(q.picked).name}.`
    : `That was the ${R(q.picked).name}. The ${r.name} is lit now.`;
  return `<div class="ax-hud-h">
      <div class="ax-hud-t">
        <div class="ax-k2"><span>Quiz · ${name ? 'Name it' : 'Find it'}</span><b>${q.right}/${q.total}${q.streak > 1 ? ` · ${q.streak} in a row` : ''}</b></div>
        <h2 class="ax-name">${title}</h2>
        <div class="ax-latin">${sub}</div>
      </div>
      <div class="ax-hud-b"><button type="button" class="ax-sq" data-act="an-qend" aria-label="End the quiz" title="End the quiz">${I.close}</button></div>
    </div>
    <div class="ax-quiz">
      ${name ? `<div class="ax-opts">${q.opts.map(id => `<button type="button" class="ax-opt${q.done && id === q.id ? ' right' : ''}${q.done && id === q.picked && !ok ? ' wrong' : ''}" data-act="an-qa" data-id="${id}"${q.done ? ' disabled' : ''}>${R(id).name}</button>`).join('')}</div>` : ''}
      ${q.done
        ? `<p class="ax-verdict ${ok ? 'ok' : 'no'}">${verdict}</p><p class="ax-does">${info(q.id).a}</p><button type="button" class="ax-next" data-act="an-qnext">Next muscle ${I.next}</button>`
        : name ? '' : `<button type="button" class="ax-skip" data-act="an-qa" data-id="">Show me</button>`}
    </div>`;
}

/* For the Anatomy tile in the extras tray. */
export const COUNT = REGIONS.length;
