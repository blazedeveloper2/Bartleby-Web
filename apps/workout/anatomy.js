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
   and exercises too: pick one and the body lights what it works.

   Inside the body (organs.js, from BodyParts3D): the organs and the
   torso's skeleton, each a layer that turns the skin to glass, each part
   tappable for its own readout. The quiz runs in the readout: name the muscle that
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

/* ── inside the body ──
   The parts organs.js draws, in the order the list shows them, and their
   reference (OINFO): l name, a what it does, w where it sits, s size,
   b blood supply, v nerves, f facts, t a note for training — checked
   against Wikipedia (Gray's), TeachMeAnatomy, Kenhub, Radiopaedia and
   StatPearls, with each training note resting on a study or review. */
const INSIDE = [
  ['brain', 'Brain', 'Nervous'],
  ['heart', 'Heart', 'Circulatory'], ['aorta', 'Aorta', 'Circulatory'], ['ivc', 'Inferior Vena Cava', 'Circulatory'],
  ['trachea', 'Trachea', 'Respiratory'], ['lung-r', 'Right Lung', 'Respiratory'], ['lung-l', 'Left Lung', 'Respiratory'], ['diaphragm', 'Diaphragm', 'Respiratory'],
  ['esophagus', 'Esophagus', 'Digestive'], ['stomach', 'Stomach', 'Digestive'], ['liver', 'Liver', 'Digestive'], ['gallbladder', 'Gallbladder', 'Digestive'],
  ['pancreas', 'Pancreas', 'Digestive'], ['small-int', 'Small Intestine', 'Digestive'], ['large-int', 'Large Intestine', 'Digestive'],
  ['kidney-r', 'Right Kidney', 'Urinary'], ['kidney-l', 'Left Kidney', 'Urinary'], ['bladder', 'Urinary Bladder', 'Urinary'],
  ['skull', 'Skull', 'Skeletal'], ['spine', 'Spine', 'Skeletal'], ['ribs', 'Rib Cage', 'Skeletal'], ['pelvis', 'Pelvis', 'Skeletal'],
].map(([id, name, system]) => ({ id, name, system }));
const OINFO = {
  'brain': { l: 'Brain (encephalon)',
    a: 'The body\'s control centre. It handles the senses, plans every voluntary movement, and runs breathing, heart rate, hormones, memory and mood.',
    w: 'Inside the skull, wrapped in three membranes (meninges) and floating in cerebrospinal fluid. It continues down as the spinal cord.',
    s: 'About 1.2–1.4 kg, roughly 2% of body weight. Average volume is about 1,130 cm³ in women and 1,260 cm³ in men.',
    b: 'Two internal carotid arteries (front) and two vertebral arteries (back), joined in a ring at its base called the circle of Willis.',
    v: 'It is the hub of the nervous system, and 12 pairs of cranial nerves leave it. Brain tissue has no pain receptors; headache pain comes from the meninges and blood vessels.',
    f: ['Holds about 86 billion neurons. About 69 billion of them (80%) are in the small cerebellum at the back.',
      'Uses up to 20% of the body\'s energy and oxygen but is only about 2% of its weight.',
      'Gets about 15% of the heart\'s output.',
      'Bathed in about 150 mL of cerebrospinal fluid, which is replaced about every 5–6 hours.'],
    t: 'Aerobic exercise helps the brain. In a one-year trial in older adults, walking 40 minutes three times a week grew the hippocampus (a memory centre) by about 2%, while it shrank by about 1.4% in a stretching group. The growth went with higher BDNF, a brain growth factor. The effect on memory itself is debated.' },
  'heart': { l: 'Heart (cor)',
    a: 'A four-chambered muscular pump. The right side sends blood to the lungs for oxygen; the left side pumps it out to the whole body.',
    w: 'In the middle of the chest (middle mediastinum), behind the breastbone and resting on the diaphragm, at about T5–T8, with more of it left of the midline than right. The tip (apex) points down and left, between the 4th and 5th ribs, about 8–9 cm from the midline.',
    s: 'About the size of a fist (roughly 12 × 8 × 6 cm); 250–350 g.',
    b: 'Right and left coronary arteries, which branch off the aorta just above the aortic valve. Coronary veins drain into the right atrium, mainly through the coronary sinus.',
    v: 'Cardiac plexus: the vagus nerves slow it, and the sympathetic trunk speeds it up and strengthens each beat.',
    f: ['Beats about 72 times a minute at rest, roughly 100,000 times a day.',
      'Each beat pushes out about 70 mL. Resting output is about 5 L a minute, over 7,000 litres a day.',
      'Its own pacemaker (the sinoatrial node) sets the beat, and nerves only adjust the rate. That is why a transplanted heart still beats.',
      'A normal adult resting rate is 60–100 bpm. Well-trained athletes are often below 60.'],
    t: 'Endurance training remodels it into an "athlete\'s heart": the chambers get bigger, the left ventricle wall thickens by about 15–20%, each beat pumps more blood, and resting heart rate often falls to 40–60 bpm. It is a healthy change, and it largely reverses after about 3 months without training.' },
  'aorta': { l: 'Aorta',
    a: 'The body\'s main artery. It carries oxygen-rich blood from the left ventricle to all the other arteries, and its elastic wall stretches and recoils to smooth out each pulse.',
    w: 'It rises from the left ventricle (ascending aorta), arches up and back to the left (aortic arch), and runs down beside the spine through the chest. It passes through the diaphragm at T12 and splits into the two common iliac arteries in front of L4.',
    s: 'The largest artery: about 28 mm wide in the chest, narrowing to under 20 mm below the kidneys. The abdominal part is about 13 cm long.',
    b: 'It carries blood from the left ventricle; its own thick wall is fed by tiny vessels (vasa vasorum).',
    v: 'A network of autonomic fibres. Pressure sensors (baroreceptors) in the arch report blood pressure to the brainstem through the vagus nerve.',
    f: ['Its first branches are the coronary arteries, which supply the heart itself.',
      'The arch has three big branches: the brachiocephalic trunk and the left common carotid and left subclavian arteries.',
      'In the abdomen it gives off the coeliac trunk, the superior and inferior mesenteric arteries and the renal arteries, among others.',
      'An aneurysm is a widening to more than 1.5 times normal size, most often below the kidneys.'],
    t: 'Heavy lifting causes huge but brief pressure spikes. In experienced bodybuilders, direct artery measurements during a heavy double-leg press averaged 320/250 mmHg, partly from holding the breath (Valsalva). In a meta-analysis, aerobic training modestly reduced arterial stiffness and resistance training had no effect.' },
  'ivc': { l: 'Inferior vena cava (vena cava inferior)',
    a: 'The largest vein. It carries oxygen-poor blood from the legs, pelvis and abdomen back to the heart.',
    w: 'Back wall of the abdomen, to the right of the aorta. It begins at L5, where the two common iliac veins join, passes through the diaphragm at T8 and opens into the right atrium.',
    s: 'The widest vein in the body: thin-walled, with no valves, and its width changes with breathing.',
    b: 'Veins that drain into it include the common iliac, lumbar, right gonadal, renal, right adrenal, inferior phrenic and hepatic veins.',
    f: ['The hepatic veins empty into it just below the diaphragm.',
      'Branches of the right phrenic nerve pass through the diaphragm with it.',
      'Late in pregnancy the uterus can squeeze it when lying flat on the back; turning onto the left side relieves this.',
      'On ultrasound, a normal IVC shrinks by about half with a sniff or a deep breath in.'],
    t: 'Blood climbs back up it against gravity with help from the leg muscle pump: contracting muscles squeeze the veins, and valves in the leg veins stop backflow. Holding your breath and straining (Valsalva) during heavy lifts raises chest pressure and cuts the blood coming back to the heart, which can cause dizziness or fainting.' },
  'trachea': { l: 'Windpipe (trachea)',
    a: 'The main airway. It carries air between the larynx and the lungs, and its lining traps dust and sweeps it back up.',
    w: 'Front of the neck and upper chest, in front of the oesophagus. It runs from below the cricoid cartilage (C6) to the sternal angle (about T4/T5), where it splits into the right and left main bronchi at a ridge called the carina.',
    s: 'About 10–11 cm long and 1.5–2 cm wide inside, held open by 16–20 C-shaped rings of cartilage.',
    b: 'Inferior thyroid arteries supply the upper part and bronchial arteries the lower part.',
    v: 'Vagus nerve, mainly through the recurrent laryngeal nerves, plus sympathetic fibres.',
    f: ['The rings are open at the back. The gap is bridged by the trachealis muscle, which narrows the airway when you cough.',
      'The carina is the most cough-sensitive spot in the airway.',
      'Its lining has cilia and mucus-making goblet cells that sweep trapped particles up to the throat.',
      'The right main bronchus is wider, shorter and more vertical, so inhaled objects usually go right.'],
    t: 'The airways are "dead space": about 150 mL of each breath, around a third of a resting breath, never reaches the air sacs. So for the same airflow, deeper breaths deliver fresh air better than fast, shallow panting.' },
  'lung-r': { l: 'Right lung (pulmo dexter)',
    a: 'Moves oxygen from the air into the blood and carbon dioxide out, through millions of tiny air sacs (alveoli).',
    w: 'Right side of the chest, in its own pleural sac. The top (apex) rises above the first rib into the base of the neck; the base sits on the diaphragm, which is higher on the right because of the liver.',
    s: 'Three lobes (upper, middle, lower), divided by the oblique and horizontal fissures, and 10 bronchopulmonary segments. The bigger of the two lungs; together they weigh about 1.3 kg.',
    b: 'Pulmonary arteries bring oxygen-poor blood for gas exchange. Bronchial arteries from the aorta feed the lung tissue itself; the right lung usually has one.',
    v: 'Pulmonary plexus: the vagus nerve narrows the airways and increases mucus, and the sympathetic trunk relaxes and widens them.',
    f: ['The horizontal fissure is found only in the right lung; at the front it runs level with the 4th rib.',
      'Together the lungs hold about 300–500 million alveoli, a gas-exchange surface of about 50–75 m².',
      'About 450 mL of blood, around 9% of the total, is in the lungs at any moment.',
      'Inhaled objects usually go right, because the right main bronchus is wider, shorter and more vertical.'],
    t: 'In most healthy people the lungs do not limit endurance; the heart and muscles do. The exception is some highly trained endurance athletes, whose blood oxygen drops near maximal effort (exercise-induced arterial hypoxaemia).' },
  'lung-l': { l: 'Left lung (pulmo sinister)',
    a: 'Moves oxygen from the air into the blood and carbon dioxide out, through millions of tiny air sacs (alveoli).',
    w: 'Left side of the chest, in its own pleural sac. The top (apex) rises above the first rib into the base of the neck, and the base sits on the left dome of the diaphragm. Its front edge has a deep cardiac notch where the heart sits.',
    s: 'Two lobes (upper and lower), divided by the oblique fissure, and usually 8 bronchopulmonary segments. Slightly smaller and lighter than the right, because it shares space with the heart.',
    b: 'Pulmonary arteries bring oxygen-poor blood for gas exchange. Bronchial arteries from the aorta feed the lung tissue; the left lung usually has two.',
    v: 'Pulmonary plexus: the vagus nerve narrows the airways and increases mucus, and the sympathetic trunk relaxes and widens them.',
    f: ['It has no middle lobe. Its counterpart is the lingula, a tongue-shaped part of the upper lobe.',
      'The cardiac notch is the hollow made by the apex of the heart.',
      'Together the lungs hold about 300–500 million alveoli, a gas-exchange surface of about 50–75 m².',
      'Even after a full forced breath out, about 1 L of air stays in the lungs.'],
    t: 'Training raises VO2max mainly by increasing how much blood the heart can pump, not by enlarging the lungs; lung volumes change little with training in healthy adults.' },
  'diaphragm': { l: 'Diaphragm (diaphragma)',
    a: 'The main muscle of breathing. It contracts and flattens to draw air in, then relaxes back into a dome to let air out.',
    w: 'A dome-shaped sheet between the chest and abdomen, attached to the xiphoid process, ribs 7–12 and their cartilages, and the lumbar spine through two crura (right L1–L3, left L1–L2). The right dome sits higher than the left because of the liver.',
    s: 'A thin sheet of muscle round a central tendon, with three main openings: the IVC at T8, the oesophagus at T10 and the aorta at T12.',
    b: 'Mainly the inferior phrenic arteries from the abdominal aorta, plus the superior phrenic, pericardiacophrenic and musculophrenic arteries.',
    v: 'Phrenic nerves (C3–C5), one for each half: "C3, 4, 5 keeps the diaphragm alive".',
    f: ['To remember the opening levels, count letters: "vena cava" has 8 (T8), "oesophagus" 10 (T10), "aortic hiatus" 12 (T12).',
      'Hiccups are sudden involuntary contractions of the diaphragm.',
      'By raising pressure in the abdomen it also helps with vomiting, emptying the bowel and bladder, and giving birth.',
      'Fibres of its right crus loop around the oesophagus and help keep stomach acid from coming back up.'],
    t: 'It also braces the trunk: contracting it together with the abdominal wall and pelvic floor raises pressure inside the abdomen, which stiffens the spine during heavy lifts. In a meta-analysis, respiratory muscle training gave small endurance gains, larger in less fit people and in longer events.' },
  'esophagus': { l: 'Gullet (oesophagus)',
    a: 'A muscular tube that pushes swallowed food and drink down to the stomach in waves (peristalsis).',
    w: 'Behind the trachea and heart, in front of the spine. It starts at C6, passes through the diaphragm at T10, and joins the stomach at T11.',
    s: 'About 25 cm long; only about 1 cm of it is in the abdomen.',
    b: 'In three parts: the inferior thyroid artery (neck), branches of the thoracic aorta and bronchial arteries (chest), and the left gastric and left inferior phrenic arteries (abdomen).',
    v: 'Oesophageal plexus: the vagus nerves (which drive peristalsis) and the sympathetic trunks.',
    f: ['Its muscle changes on the way down: voluntary (striated) in the top third, a mix in the middle, and smooth in the bottom third.',
      'Food tends to stick at four narrow points: the cricoid cartilage, the aortic arch, the left main bronchus and the opening in the diaphragm.',
      'The upper sphincter is a real muscle; the lower one is kept closed by the diaphragm\'s right crus and the angle at which the oesophagus meets the stomach.'],
    t: 'Exercise can trigger reflux. In small studies, running caused more reflux than cycling, mostly through brief relaxations of the lower sphincter.' },
  'stomach': { l: 'Stomach (gaster)',
    a: 'A stretchy muscular bag that stores food, churns it with acid and enzymes into a soup (chyme), and lets it out slowly into the small intestine.',
    w: 'Upper abdomen, mostly left of the midline, under the left dome of the diaphragm. The entrance (cardia) is at T11 and the outlet (pylorus) at about L1.',
    s: 'Holds about 1 L normally and can stretch to 2–4 L. Its parts are the cardia, fundus, body and pylorus.',
    b: 'All from branches of the coeliac trunk: the left and right gastric, left and right gastro-omental, and short gastric arteries.',
    v: 'The front and back vagal trunks, which boost acid and churning, and sympathetic fibres from T6–T9 through the coeliac plexus.',
    f: ['Gastric acid keeps the inside at about pH 2.',
      'It has an extra inner oblique muscle layer that the rest of the gut lacks.',
      'It usually empties within 2–4 hours; a fatty meal can stay 6 hours or more.',
      'The pyloric sphincter lets only small squirts of chyme into the duodenum, about 3 mL per wave.'],
    t: 'Hard exercise slows the stomach: emptying is barely affected up to about 70–75% of VO2max but slows or stops above that. Gut symptoms are common in endurance athletes, highest in long, hard events and with dehydration.' },
  'liver': { l: 'Liver (hepar)',
    a: 'The body\'s chemical factory. It makes bile and blood proteins, stores glycogen, and clears drugs, alcohol and waste.',
    w: 'Right upper abdomen under the diaphragm, mostly tucked behind the lower right ribs, reaching across the midline into the left upper abdomen.',
    s: 'About 1.5 kg; the largest gland in the body.',
    b: 'Two supplies: the hepatic portal vein brings about 75% of its blood, rich in nutrients from the gut, and the hepatic artery about 25%. Each provides about half its oxygen. Hepatic veins drain into the IVC.',
    v: 'Hepatic plexus: sympathetic fibres from the coeliac plexus and parasympathetic fibres from the vagus. Its outer capsule is supplied by the lower intercostal nerves.',
    f: ['It can grow back to full size from as little as 25% of its tissue.',
      'Surgeons divide it into 8 functional segments (the Couinaud system), so parts can be removed safely.',
      'Adult living donors give about 60% of their liver (the right lobe).',
      'Estimates put the number of its separate jobs at around 500.'],
    t: 'It stores about 100 g of glycogen, which keeps blood sugar up during exercise; that store falls a lot overnight, while muscle glycogen barely changes. A meta-analysis found regular exercise lowers liver fat even with little or no weight loss.' },
  'gallbladder': { l: 'Gallbladder (vesica biliaris)',
    a: 'Stores and concentrates bile from the liver; after a fatty meal it squeezes the bile into the duodenum to help digest fat.',
    w: 'In a shallow hollow under the right lobe of the liver. Its tip touches the front of the abdomen at the right 9th costal cartilage.',
    s: 'Pear-shaped, about 7–10 cm long and up to 4 cm wide; holds about 30–50 mL.',
    b: 'Cystic artery, usually a branch of the right hepatic artery.',
    v: 'Coeliac plexus (sympathetic and pain fibres) and the vagus nerve, which helps it contract.',
    f: ['It makes bile 3–10 times more concentrated by removing water and salts.',
      'The gut hormone cholecystokinin (CCK), released when fat reaches the duodenum, makes it contract.',
      'You can live without it; removing it is a common operation.',
      'Most gallstones cause no symptoms.'],
    t: 'Being active is linked to fewer gallstone problems: in a large study of men, the most active had about 40% lower risk of gallstones that caused symptoms, and a 2016 meta-analysis confirmed activity is protective.' },
  'pancreas': { l: 'Pancreas',
    a: 'A double gland. About 99% of it makes digestive enzymes that flow into the duodenum; about 1%, the islets of Langerhans, makes insulin and glucagon to control blood sugar.',
    w: 'Behind the stomach, across the back wall of the abdomen at about L1–L2. Its head sits in the C-shaped curve of the duodenum, and its tail reaches the spleen.',
    s: '12–15 cm long, usually about 70–100 g. Its parts are the head, uncinate process, neck, body and tail.',
    b: 'Branches of the splenic artery (body and tail) and the pancreaticoduodenal arteries (head), from the coeliac trunk and the superior mesenteric artery.',
    v: 'Vagus nerve (which stimulates enzyme and insulin release) and sympathetic fibres through the coeliac plexus.',
    f: ['Makes about 1.5–3 L of pancreatic juice a day.',
      'In the islets, alpha cells make glucagon, beta cells insulin and delta cells somatostatin.',
      'Its head wraps around the superior mesenteric artery and vein.'],
    t: 'During exercise insulin release falls and glucagon rises, which helps the liver release glucose, while working muscles take up sugar through GLUT4 transporters without needing insulin. That is why exercise lowers blood sugar and leaves muscles more sensitive to insulin afterwards.' },
  'small-int': { l: 'Small intestine (intestinum tenue)',
    a: 'Where most digestion and absorption happens: bile and pancreatic juice break food down, and the lining absorbs sugars, amino acids, fats, vitamins, minerals and most of the water.',
    w: 'Fills the middle and lower abdomen. The duodenum curves around the head of the pancreas (L1–L3); the jejunum lies mostly upper left and the ileum lower right, ending at the caecum.',
    s: 'About 3–5 m long in a living person and 2.5–3 cm wide: the duodenum (about 20–25 cm), then the jejunum and the slightly longer ileum.',
    b: 'The duodenum from branches of the coeliac trunk and superior mesenteric artery; the jejunum and ileum from the superior mesenteric artery, through looping arcades.',
    v: 'Vagus nerve and sympathetic fibres through the coeliac and superior mesenteric plexuses. The gut wall also has its own nervous system (the enteric nervous system).',
    f: ['Folds, villi and microvilli give it a lining of about 30 m², not the "tennis court" often claimed.',
      'Most nutrients are absorbed in the jejunum, iron mainly in the duodenum, and vitamin B12 and bile salts at the end of the ileum.',
      'The gut wall holds about 500 million neurons, about five times as many as the spinal cord.'],
    t: 'There is a limit to how fast sugar is absorbed: the glucose transporter (SGLT1) is thought to saturate at about 60 g of glucose an hour, which is why sports guidance for long events uses glucose–fructose mixes, as fructose uses a separate transporter (GLUT5).' },
  'large-int': { l: 'Large intestine (intestinum crassum)',
    a: 'Absorbs water and salts from what the small intestine leaves, houses most of the gut bacteria, and stores and expels faeces.',
    w: 'Frames the abdomen: the caecum (with the appendix) lower right, the ascending colon up the right side, the transverse colon across the top, the descending colon down the left, then the sigmoid colon, rectum and anal canal.',
    s: 'About 1.5 m long; widest at the caecum, narrowing to 4–5 cm at the sigmoid colon. The rectum is about 12 cm long.',
    b: 'The superior mesenteric artery (caecum to two-thirds of the transverse colon) and the inferior mesenteric artery (the rest, to the upper rectum), linked by the marginal artery.',
    v: 'First part: vagus and sympathetic fibres through the superior mesenteric plexus. Later part: pelvic splanchnic nerves (S2–S4) and lumbar splanchnic nerves through the inferior mesenteric plexus.',
    f: ['Three ribbon-like muscle bands (taeniae coli) bunch the colon into pouches (haustra).',
      'About 1.5 L of fluid reaches the colon each day; the small intestine has already absorbed about 90% of the daily load.',
      'It holds roughly 38 trillion bacteria, about as many as the body\'s own cells.',
      'Gut bacteria make vitamin K and biotin.'],
    t: 'Physical activity is linked to lower colon cancer risk: pooled data from 52 studies found the most active people had about 24% lower risk than the least active. The studies are observational, so cause and effect is not proven.' },
  'kidney-r': { l: 'Right kidney (ren dexter)',
    a: 'Filters the blood to make urine and controls water, salt, acid and blood pressure. It also makes erythropoietin (which drives red-cell production) and active vitamin D.',
    w: 'On the back wall of the abdomen, behind the peritoneum, beside the spine from about T12 to L3; slightly lower than the left because the liver is above it.',
    s: 'Bean-shaped, about 11–12 cm long, 5–6 cm wide and 3 cm thick; roughly 115–150 g.',
    b: 'Right renal artery from the abdominal aorta, longer than the left and passing behind the IVC. A short right renal vein drains into the IVC.',
    v: 'Renal plexus: sympathetic fibres from the lower thoracic splanchnic nerves, plus vagal fibres. Kidney pain is felt in the flank.',
    f: ['Has about 1 million nephrons, its filtering units.',
      'The two kidneys get about 20–25% of the heart\'s output.',
      'Together they filter about 180 L a day but make only about 0.8–2 L of urine.',
      'It sits in a cushion of fat inside the renal fascia, with the adrenal gland on top.'],
    t: 'Creatine supplements raise blood creatinine, the usual kidney test marker, because creatine breaks down into it. Meta-analyses found no kidney damage in healthy people at the doses studied, so in people taking creatine or carrying lots of muscle, kidney function should not be judged on creatinine alone.' },
  'kidney-l': { l: 'Left kidney (ren sinister)',
    a: 'Filters the blood to make urine and controls water, salt, acid and blood pressure. It also makes erythropoietin (which drives red-cell production) and active vitamin D.',
    w: 'On the back wall of the abdomen, behind the peritoneum, beside the spine from about T12 to L3; slightly higher than the right, with the 11th and 12th ribs behind its upper part.',
    s: 'Bean-shaped, about 11–12 cm long, 5–6 cm wide and 3 cm thick; roughly 115–150 g, usually slightly larger than the right.',
    b: 'Left renal artery from the abdominal aorta. The left renal vein is longer and crosses in front of the aorta to reach the IVC.',
    v: 'Renal plexus: sympathetic fibres from the lower thoracic splanchnic nerves, plus vagal fibres. Kidney pain is felt in the flank.',
    f: ['Has about 1 million nephrons, its filtering units.',
      'The two kidneys get about 20–25% of the heart\'s output.',
      'Together they filter about 180 L a day but make only about 0.8–2 L of urine.',
      'Its renal vein also collects blood from the left adrenal and left gonadal veins.'],
    t: 'Creatine supplements raise blood creatinine, the usual kidney test marker, because creatine breaks down into it. Meta-analyses found no kidney damage in healthy people at the doses studied, so in people taking creatine or carrying lots of muscle, kidney function should not be judged on creatinine alone.' },
  'bladder': { l: 'Urinary bladder (vesica urinaria)',
    a: 'A stretchy muscular bag that stores urine from the kidneys and empties it through the urethra.',
    w: 'Low in the pelvis, just behind the pubic symphysis, in front of the rectum in men and the uterus in women. It domes upward as it fills.',
    s: 'Holds about 400–600 mL in healthy adults; the urge to go usually starts at about 300–400 mL.',
    b: 'Superior and inferior vesical arteries (vaginal arteries in women), from the internal iliac arteries.',
    v: 'Pelvic nerves (parasympathetic, S2–S4) contract it to empty; sympathetic fibres relax it so it can fill; the pudendal nerve gives voluntary control of the outer sphincter.',
    f: ['Its wall muscle, the detrusor, has fibres running in several directions, so it can stretch and still squeeze.',
      'The trigone is a smooth triangle on its floor between the two ureter openings and the urethra.',
      'A control centre in the brainstem, the pontine micturition centre, coordinates emptying.'],
    t: 'Leaking during exercise is common, especially in high-impact sport: a meta-analysis found urinary incontinence in about 26% of female athletes. Pelvic floor muscle training improved strength and reduced leakage in athletes, though there are few studies.' },
  'skull': { l: 'Skull (cranium and mandible)',
    a: 'Protects the brain and houses the eyes, ears, nose and mouth; it also anchors the muscles of the face, jaw and neck.',
    w: 'On top of the spine, resting on the first neck vertebra (the atlas).',
    s: '22 bones: 8 in the cranium and 14 in the face (not counting the middle-ear bones and the hyoid). A newborn\'s skull has about 44 separate bony pieces.',
    f: ['Most skull bones are locked together by fixed joints called sutures; the jaw moves at the temporomandibular joints.',
      'A baby\'s soft spots (fontanelles) close in stages: the back one by about 8 weeks and the front one by up to 18 months.',
      'Air-filled sinuses make it lighter and add resonance to the voice.'],
    t: 'The neck muscles that steady the skull may protect the brain: in an observational study of 6,704 high-school athletes, weaker necks were linked to more concussions. Trials of neck training for prevention are still under way.' },
  'spine': { l: 'Spine (columna vertebralis)',
    a: 'Holds the body upright, protects the spinal cord, and lets the trunk bend and twist; the discs between the vertebrae spread and absorb load.',
    w: 'Down the middle of the back, from the base of the skull to the tailbone.',
    s: '33 vertebrae (32–35 is normal): 7 cervical, 12 thoracic and 5 lumbar, then 5 fused into the sacrum and usually 4 fused into the coccyx.',
    f: ['It has four curves: the neck and lower back curve forward (lordosis), the chest and sacrum back (kyphosis).',
      'The chest and sacral curves are there before birth; the neck and lower-back curves form after it.',
      'In adults the spinal cord ends around L1–L2; below that is a bundle of nerve roots called the cauda equina.',
      'The vertebral bodies get wider down the spine to carry more weight.'],
    t: 'Spine tissue adapts to load. Regular runners had better-hydrated, slightly larger lower-back discs than non-athletes, and in postmenopausal women with low bone mass, 8 months of supervised heavy lifting plus impact work raised lower-spine bone density (the LIFTMOR trial).' },
  'ribs': { l: 'Rib cage (costae and sternum)',
    a: 'Protects the heart, lungs and great vessels, anchors muscles of the neck, arms, back and abdomen, and moves with every breath.',
    w: 'The chest wall: the ribs curve from the 12 thoracic vertebrae at the back round to the breastbone (sternum) at the front.',
    s: '12 pairs of ribs plus the sternum, which has three parts: the manubrium, the body and the xiphoid process.',
    f: ['Ribs 1–7 are "true" ribs with their own cartilage to the sternum; 8–10 are "false" ribs that join the cartilage above; 11–12 "float", attached only at the back.',
      'The sternal angle, the ridge where the manubrium meets the body, marks the 2nd rib, the usual starting point for counting ribs.',
      'Breathing in lifts the front of the chest like a pump handle and widens the sides like a bucket handle.',
      'Men and women have the same number of ribs.'],
    t: 'Rib stress fractures are a classic rowing injury: they affect about 6–12% of rowers and cost more time on the water than any other rowing injury.' },
  'pelvis': { l: 'Pelvis (pelvis ossea)',
    a: 'A strong bony ring that passes upper-body weight to the legs, protects the bladder, bowel and reproductive organs, and anchors the hip, core and thigh muscles.',
    w: 'At the base of the trunk, between the lower spine and the thighs, with the hip sockets (acetabula) on its sides.',
    s: 'Two hip bones plus the sacrum (and coccyx). Each hip bone is made of the ilium, ischium and pubis, which fuse during puberty.',
    f: ['The two sacroiliac joints barely move and are held by very strong ligaments.',
      'The hip bones meet at the front at the pubic symphysis, a joint of fibrocartilage.',
      'The pubic arch is about 70° in men and 90–100° in women, whose pelvic opening is wider and rounder for childbirth.',
      'When you sit, your weight rests on the ischial tuberosities, the "sit bones".'],
    t: 'Bone responds to impact and heavy loads, not just fitness: elite road cyclists, who train with their weight supported, had lower bone density than runners, which is why jumping or heavy lifting is often recommended alongside cycling or swimming.' },
};
const IN = id => INSIDE.find(x => x.id === id);
const oinfo = id => OINFO[id] || { l: IN(id)?.name || id, a: '', w: '—', s: '—' };
const layerOf = id => (IN(id)?.system === 'Skeletal' ? 'bones' : 'organs');

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
const look = { shorts: true, atlas: '', spin: false, holo: false, deep: false, flex: false, idle: false, bend: false, organs: false, bones: false, pose: 'rest', ...(pref.look || {}) };
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
let osel = null;         // the organ or bone selected, when one is (it takes the readout from the muscle)
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
  is3d = false; quiz = null; exv = null; osel = null;
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
  if (!rs.length && !xs.length && !INSIDE.some(x => [x.name, x.system].some(v => v.toLowerCase().includes(qry.trim().toLowerCase())))) return `<div class="pg-empty">Nothing matches "${esc(qry)}".</div>`;
  const exHTML = xs.length ? `<div class="an-grp-h">Exercises</div>` + xs.map(e => `<button type="button" class="an-row ex" data-act="an-exv" data-n="${esc(e.ex.n)}">
      <span class="an-row-t"><span class="an-row-n">${esc(e.ex.n)}</span><span class="an-row-l">${esc(e.ex.m || '')}</span></span>
      <span class="an-row-c">${esc(e.ex.s || '')}</span>
    </button>`).join('') : '';
  const t = qry.trim().toLowerCase();
  const ins = INSIDE.filter(x => !grp && (!t || [x.name, x.system, oinfo(x.id).l].some(v => v.toLowerCase().includes(t))));
  const inHTML = ins.length ? `<div class="ax-list-h"><span>Inside the body</span><span>${ins.length}</span></div>` +
    [...new Set(ins.map(x => x.system))].map(sy => `<div class="an-grp-h">${sy}</div>` + ins.filter(x => x.system === sy).map(x =>
      `<button type="button" class="an-row in${x.id === osel ? ' on' : ''}" data-act="an-org" data-id="${x.id}">
        <span class="an-row-t"><span class="an-row-n">${x.name}</span><span class="an-row-l">${oinfo(x.id).l}</span></span>
      </button>`).join('')).join('') : '';
  return exHTML + (rs.length ? `<div class="ax-list-h"><span>${rs.length} muscle${rs.length === 1 ? '' : 's'}</span><span>${byWeek ? 'Sets this week' : byRest ? 'Last trained' : 'In program'}</span></div>` : '') +
    [...new Set(rs.map(r => r.group))].map(g =>
      `<div class="an-grp-h">${g}</div>` + rs.filter(r => r.group === g).map(r => {
        const n = byWeek ? week.get(r.id) || 0 : byRest ? (hoursSince(r.id) ?? 0) : idx.get(r.id)?.size || 0;
        const sw = !exv && colourOf(r.id);
        return `<button type="button" class="an-row${r.id === sel ? ' on' : ''}${sw ? ' sw' : ''}" data-act="an-pick" data-id="${r.id}"${r.id === sel ? ' aria-current="true"' : ''}${sw ? ` style="--sw:${sw}"` : ''}>
          <span class="an-row-t"><span class="an-row-n">${r.name}${r.deep ? '<i>deep</i>' : ''}</span><span class="an-row-l">${info(r.id).l}</span></span>
          <span class="an-row-c${n ? '' : ' none'}" title="${byRest ? (hoursSince(r.id) == null ? 'Not trained yet' : `Trained ${ago(hoursSince(r.id))}`) : byWeek ? `${fmtSets(n)} sets this week` : `${n} exercise${n === 1 ? '' : 's'} in your program work${n === 1 ? 's' : ''} it`}">${byRest ? agoShort(hoursSince(r.id)) : byWeek ? fmtSets(n) : n}</span>
        </button>`;
      }).join('')).join('') + inHTML;
}

function paint() {
  const hud = $('#ax-hud');
  hud.innerHTML = quiz ? quizHTML() : exv ? exHTML() : osel ? insideHTML() : hudHTML();
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
const litId = () => (quiz ? quiz.lit : exv || osel ? null : hudOn ? sel : null);
/* the muscle the label line runs to: the lit one, or an exercise's first
   primary muscle */
const lineId = () => (osel && !quiz && !exv ? (hudOn ? osel : null) : exv ? [...exv.tiers].find(([, t]) => t === 1)?.[0] || null : litId());
let dressed = '';        // the look last handed to the body, so an unchanged one is not re-applied
function light() {
  const id = litId(), g = new Set(!id || quiz || look.atlas ? [] : groupIds());
  if (is3d) {
    const atlas = atlasMap(), key = JSON.stringify([look.shorts, look.holo, look.deep, look.spin, look.flex, look.idle, look.bend, look.organs, look.bones, atlas && [...atlas]]);
    if (key !== dressed) { dressed = key; mv.setLook({ ...look, atlas }); }
    if (!bending) mv.study(id, [...g]);
    mv.studyInside?.(!quiz && !exv && hudOn ? osel : null);
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
      return m.orbit(box, { onTap: (r, air) => r ? (r.organ ? pickInside(r.id, true) : pick(r.id, true)) : air && tapAir(), onFrame: lead, onBend, inset: insets(), look: { ...look, atlas: atlasMap() } });
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
  exv = null; osel = null;
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

/* Pick an organ or bone: its layer comes on if it was off, and once the
   parts have loaded (the first time, a moment) the camera comes to it. */
function pickInside(id, fly) {
  if (!IN(id) || quiz) return;
  exv = null; osel = id;
  const layer = layerOf(id);
  if (!look[layer]) { look[layer] = true; keep(); }
  hudOn = true; $('#ax-hud').hidden = false;
  paint();
  if (!fly || !is3d) return;
  const go = (n = 0) => { if (osel !== id) return; if (mv.insideParts?.().length) mv.face(id); else if (n < 40) setTimeout(() => go(n + 1), 100); };
  go();
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
      if ((a.k === 'organs' || a.k === 'bones') && !look[a.k] && osel && layerOf(osel) === a.k) { osel = null; $('#ax-hud').innerHTML = hudHTML(); }
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
    case 'an-org':
      if (quiz) quiz = null;
      pickInside(a.id, true);
      if (!wide()) toggleList(false);
      break;
    case 'an-ostep': {
      const l = INSIDE.filter(x => layerOf(x.id) === layerOf(osel)), at = l.findIndex(x => x.id === osel);
      pickInside(l[(at + +a.d + l.length) % l.length].id, true);
      break;
    }
    case 'an-oexit': osel = null; paint(); if (is3d && hudOn) mv.face(sel); break;
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
    ${tog('organs', 'Organs', 'See inside: brain, heart, lungs, liver, gut, kidneys and more. The skin turns to glass')}
    ${tog('bones', 'Skeleton', 'The skull, spine, rib cage and pelvis')}
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

/* ── the inside readout ── */
function insideHTML() {
  const x = IN(osel), o = oinfo(osel), l = INSIDE.filter(y => layerOf(y.id) === layerOf(osel)), at = l.findIndex(y => y.id === osel);
  const row = (k, v) => (v && v !== '—' ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  return `<div class="ax-hud-h">
      <div class="ax-hud-t">
        <div class="ax-k2"><span>${x.system}</span><b>${String(at + 1).padStart(2, '0')}/${String(l.length).padStart(2, '0')}</b></div>
        <h2 class="ax-name">${x.name}</h2>
        <div class="ax-latin">${o.l}</div>
      </div>
      <div class="ax-hud-b">
        <button type="button" class="ax-sq" data-act="an-ostep" data-d="-1" aria-label="Previous">${I.prev}</button>
        <button type="button" class="ax-sq" data-act="an-ostep" data-d="1" aria-label="Next">${I.next}</button>
        <button type="button" class="ax-sq ax-fold" data-act="an-min" aria-expanded="${!min}" aria-label="${min ? 'Show the details' : 'Fold the details away'}">${I.fold}</button>
        <button type="button" class="ax-sq" data-act="an-oexit" aria-label="Back to the muscles" title="Back">${I.close}</button>
      </div>
    </div>
    <div class="ax-hud-body">
      ${o.a ? `<p class="ax-does">${o.a}</p>` : ''}
      <dl class="ax-rows">${row('Where', o.w)}${row('Size', o.s)}${row('Blood', o.b)}${row('Nerves', o.v)}</dl>
      ${o.f?.length ? `<ul class="ax-facts">${o.f.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
      ${o.t ? `<p class="ax-note">${o.t}</p>` : ''}
    </div>`;
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
