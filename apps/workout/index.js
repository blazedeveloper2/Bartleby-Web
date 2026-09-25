/* ═══════════════════════════════════════════════════════════
   WORKOUT APP
   Program tracker (tap an exercise → muscle map + set its weight),
   a body-composition tab (the maths lives in body.js), and a
   progress/rank tab.
   Local-first, event-delegated.
   ═══════════════════════════════════════════════════════════ */

import { PROGRAM, WEEK_ORDER, LADDERS, MMAP, PEOPLE, USER } from './data.js?v=avg-sep24';
import { load, save, todayStr, dateStr, USER_KEY } from './store.js?v=avg-sep24';
import { toast } from '../../assets/js/ui.js?v=avg-sep24';
import { pctColor, ord, LIFTS } from './standards.js?v=avg-sep24';
import {
  setsOf, setCountOf, isUnilateral, syncDay, logWeight, delSession, setReps, snapshot,
  isLoggedToday, celebrationHTML, renderRank, renderStreak, renderAwards, icon,
  liftScores, standingOf, resEx, resKit, lvlOf, setLvl, resetTargets, applyReset,
  trackOf, exSets, setExSets, skillAdvice, lineReady,
  rebaseline, hasHistory, setExReps, exReps, verseHTML, loadAdvice, DB_MAX,
} from './rank.js?v=avg-sep24';

/* Which movements have a published standard, so the rep boxes only appear
   where there is an estimate for them to sharpen. */
const LIFT_NAMES = new Set(Object.keys(LIFTS));
import { MUSCLE_SVG } from './bodymap.js?v=avg-sep24';
import { HOWTO } from './howto.js?v=avg-sep24';
import { standingsFor } from './anthro.js?v=avg-sep24';
import { logGrip, delGrip, gripUnit, setGripUnit, fromGU, toGU } from './grip.js?v=avg-sep24';
import {
  prof, profSet, ACTIVITY, actOf, navyBF, BF_BANDS, smooth, within,
  weighed, hasW, hasWa, hasNk, TAPE, TAPE_KEYS, hasAny, lastTaped,
  UNITS, unitOf, toU, fromU, unitFor, setUnitFor, healthyFor, whtrBand,
  snapshot as bodySnap, advise, project,
} from './body.js?v=avg-sep24';

/* ── namespaced storage ── */
const chks = () => load('bp_chk', {});
const sChk = c => save('bp_chk', c);
const wts  = () => load('bp_wt', {});
const sWt  = w => save('bp_wt', w);
const ek   = (d, s, e) => `${d}.${s}.${e}`;

const bwAll = () => load('bp_bw', []);
const bwSv  = l => save('bp_bw', l);

/* ── tabs ──

   One table drives the nav buttons, the panels and the render dispatch, so
   the three can never disagree about which tabs exist. `k` is both the
   data-tab value and the panel id suffix.

   Labels are one word each on purpose. Five tabs share the width of three,
   and a two-word label is what forces either a scrolling nav bar nobody
   notices or type too small to read — see the .tab rules in workout.css,
   which stack the icon over the label below 560px rather than shrinking
   anything into the ground. */
const TABS = [
  { k:'program', n:'Program', i:'cal',    r:() => renderProg() },
  { k:'bw',      n:'Body',    i:'scale',  r:() => renderBW() },
  { k:'rank',    n:'Rank',    i:'peak',   r:() => renderRank(root) },
  { k:'streak',  n:'Streak',  i:'flame',  r:() => renderStreak(root) },
  { k:'awards',  n:'Awards',  i:'trophy', r:() => renderAwards(root) },
];

/* The three panels that used to be one. Everything that could change a
   letter, a streak or a badge repaints all of them, which is what the
   single renderRank already did for the same thirteen sections — so this
   costs what it always cost, and no tab can go stale behind your back. */
const renderScore = () => { renderRank(root); renderStreak(root); renderAwards(root); };

/* ── module state ── */
let root = null;
let activeTab = 'program';
let bwRange = '30';
let bwMetric = 'w';
let bwMore = false;              // chest/arm/thigh fields shown on the log form
let bwEditDate = null;
let mmReturnFocus = null;
let mmEx = null;             // exercise currently open in the muscle modal
let mmSlot = null;           // [di, si, ei] it came from, so a level change can re-resolve it

const BW_RANGES = [
  {k:'7',  d:7,   lbl:'7D'},
  {k:'30', d:30,  lbl:'30D'},
  {k:'90', d:90,  lbl:'90D'},
  {k:'all',d:null,lbl:'All'},
];

const q = sel => root.querySelector(sel);

/* ═══════════════════ PROGRAM TAB ═══════════════════ */
function renderProg() {
  const p = q('#p-program'), ch = chks(), w = wts();
  /* Every exercise name is tinted red→green by where that lift stands.
     Unscored movements (bodyweight core work) and lifts with no weight
     set aren't in the map and stay the default text colour. */
  const sc = liftScores();
  /* Before the first day card: the verse is what you read on the way in. */
  let h = verseHTML();
  WEEK_ORDER.forEach((di, pos) => {
    const day = PROGRAM[di];
    let tot = 0, dn = 0;
    day.sections.forEach((sec, si) => sec.opt || sec.ex.forEach((_, ei) => { tot++; if (ch[ek(di,si,ei)]) dn++; }));
    const comp = dn === tot && tot > 0;
    const xpH = comp && isLoggedToday(di) ? `<span class="day-xp logged">Logged</span>` : '';
    h += `<div class="day-card" data-day="${di}">
      <div class="day-top">
        <div class="day-top-l">
          <span class="day-idx">${pad(pos + 1)}</span><span class="day-sep">//</span>
          <span class="day-badge ${day.day}">${day.day}</span>
          <span class="day-title">${day.label}</span>
        </div>
        <div class="day-top-r">${xpH}<span class="day-prog ${comp?'done':''}">${dn}/${tot}</span></div>
      </div>
      <div class="day-meter">${meterHTML(dn, tot)}</div>
      <div class="day-body">`;
    let exN = 0;                                   // numbering runs across the whole day
    day.sections.forEach((sec, si) => {
      if (sec.tag) h += `<div class="sec-lbl">${sec.tag}</div>`;
      sec.ex.forEach((rawEx, ei) => {
        const ex = resEx(rawEx);
        const k = ek(di,si,ei), on = ch[k] || false;
        const wv = w[ex.n];
        /* A passed skill step says so on the row, so the way up does not
           depend on opening every exercise to look for it. */
        const wtH = ex.line && lineReady(ex.line) ? `<span class="ex-up" title="Your count passes this step — open it to move up">Move up</span>`
                  : wv && trackOf(ex).load ? `<span class="ex-wt">${wv}</span>` : '';
        const bH  = ex.b ? `<span class="bench-tag ${ex.bc||''}">${ex.b}</span>` : '';
        const l   = sc.get(ex.n);
        const nA  = l ? ` style="color:${pctColor(l.pct)}" title="${l.rank.l} · ${ord(l.pct)} percentile at your ${sc.basisWord}"` : '';
        h += `<div class="ex-row ${on?'off':''}" data-act="row" data-di="${di}" data-si="${si}" data-ei="${ei}"><span class="ex-rail"></span><div class="ex-chk ${on?'on':''}" data-act="chk" data-k="${k}"></div><span class="ex-idx">${pad(++exN)}</span><div class="ex-body"><div class="ex-name"${nA}>${ex.n}</div><div class="ex-detail"><span class="ex-musc">${ex.m}</span></div>${ex.nt ? `<div class="ex-note">${ex.nt}</div>` : ''}</div><div class="ex-right">${wtH}<span class="ex-sets">${ex.s}</span>${bH}</div></div>`;
      });
    });
    h += `</div></div>`;
  });
  if (Object.values(ch).some(Boolean)) h += `<div class="clear-bar"><button class="clear-btn" data-act="clear">Clear All Checkmarks</button></div>`;
  p.innerHTML = h;
}

const pad = n => String(n).padStart(2, '0');

/* Segmented completion meter — one notch per exercise, reads like a HUD bar. */
const meterHTML = (done, tot) =>
  Array.from({ length: tot }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');

/* Completed exercises + hard sets for one day, under the current bar setting.
   An optional section (`opt` in data.js) adds its sets when it is done but
   never stands between you and finishing the day. */
function dayTally(di, ch) {
  let tot = 0, done = 0, sets = 0;
  PROGRAM[di].sections.forEach((sec, si) => sec.ex.forEach((raw, ei) => {
    const on = ch[ek(di,si,ei)];
    if (on) sets += setsOf(resEx(raw));
    if (sec.opt) return;
    tot++;
    if (on) done++;
  }));
  return { tot, done, sets };
}

/* Patch the row and its day header in place. A full renderProg() here
   would rebuild all five cards, which reads as a page-wide flicker and
   restarts every card's entrance animation. */
function toggleChk(k) {
  const c = chks(); c[k] = !c[k]; sChk(c);
  const on = !!c[k];
  const di = +k.split('.')[0];

  const box = q(`[data-act="chk"][data-k="${k}"]`);
  if (box) {
    box.classList.toggle('on', on);
    box.closest('.ex-row')?.classList.toggle('off', on);
  }
  const tally = dayTally(di, c);
  paintDayHead(di, tally);
  paintClearBar(c);

  const res = syncDay(di, tally);
  if (!res) return;
  paintDayHead(di, tally);            // the "Logged" pill may have appeared
  renderScore();
  if (res.logged && !showCelebration(res)) toast(`${res.label} logged`);
}

function paintDayHead(di, tally) {
  const card = q(`.day-card[data-day="${di}"]`);
  if (!card) return;
  const comp = tally.done === tally.tot && tally.tot > 0;
  /* toggle the existing notches rather than rebuilding them, so they
     transition instead of snapping */
  card.querySelectorAll('.day-meter i').forEach((el, i) => el.classList.toggle('on', i < tally.done));
  const prog = card.querySelector('.day-prog');
  if (prog) {
    const wasDone = prog.classList.contains('done');
    prog.textContent = `${tally.done}/${tally.tot}`;
    prog.classList.toggle('done', comp);
    /* finishing a day is a real moment — flash the card once for it */
    if (comp && !wasDone) {
      card.classList.remove('just-done');
      void card.offsetWidth;
      card.classList.add('just-done');
      card.addEventListener('animationend', () => card.classList.remove('just-done'), { once: true });
    }
  }
  const right = card.querySelector('.day-top-r');
  const pill = right?.querySelector('.day-xp');
  const want = comp && isLoggedToday(di);
  if (want && !pill) right.insertAdjacentHTML('afterbegin', '<span class="day-xp logged">Logged</span>');
  else if (!want && pill) pill.remove();
}

/* The "Clear All" bar only exists when something is checked. */
function paintClearBar(ch) {
  const any = Object.values(ch).some(Boolean);
  const bar = q('.clear-bar');
  if (any && !bar) q('#p-program').insertAdjacentHTML('beforeend',
    '<div class="clear-bar"><button class="clear-btn" data-act="clear">Clear All Checkmarks</button></div>');
  else if (!any && bar) bar.remove();
}
function clearChk() { sChk({}); renderProg(); toast('Checkmarks cleared'); }

/* ═══════════════════ MUSCLE MODAL (+ weight editor) ═══════════════════ */
/* The comma order in a muscle string already carries the intent — first is
   what the exercise is FOR, second comes along for the ride, the rest hold
   you together. The old version flattened all of that into one Set, so an
   overhead press and a lateral raise lit the identical two shapes. Reading
   the order back out is what makes the map worth looking at.

   Returns region id → 1 (primary) | 2 (secondary) | 3 (stabilizer). */
const mLevel = i => Math.min(i + 1, 3);

function parseMuscles(mStr) {
  const raw = mStr.toLowerCase().replace(/\(.*?\)/g,'').split(',').map(s=>s.trim()).filter(Boolean);
  const out = new Map();
  raw.forEach((m, i) => {
    let ids = MMAP[m];
    if (!ids) {                       /* fuzzy fallback — see the note in data.js */
      ids = [];
      for (const [k, v] of Object.entries(MMAP))
        if (m.includes(k) || k.includes(m)) ids.push(...v);
    }
    /* Strongest claim wins. 'Upper Abs, Rectus Abdominis' burns the top two
       rows and leaves the bottom row at the secondary tint, which is what a
       crunch actually does. */
    ids.forEach(id => out.set(id, Math.min(out.get(id) ?? 9, mLevel(i))));
  });
  return out;
}

/* Name of the muscle under the cursor, read off the <title> the region
   already carries for screen readers rather than a second lookup table. */
const regionName = el => el.querySelector('title')?.textContent || '';

function mmReadout(txt) {
  const el = q('#mm-readout');
  if (!el) return;
  el.textContent = txt || '';
  el.classList.toggle('on', !!txt);
}

/* Chip → shape. Hovering "Obliques" in the list should show you where the
   obliques are; that is the half of the learning the colour ramp can't do. */
function focusMuscle(name, on) {
  const ids = MMAP[name] || [];
  root.querySelectorAll('.m-region.focus').forEach(el => { if (!on) el.classList.remove('focus'); });
  if (on) ids.forEach(id => root.querySelector(`[id="${id}"]`)?.classList.add('focus'));
}

/* This modal is where you decide whether to add weight, so it carries the
   same standing the Rank tab does instead of making you go look it up. */
function mmRankHTML(st) {
  /* Nothing at all for an unscored movement. The row is already the default
     text colour on the Program tab and there is no letter here — saying so
     in a sentence was the app repeating the absence out loud. */
  if (st.state === 'unscored') return '';
  if (st.state === 'nobw')
    return `<div class="mm-rank none">Log your bodyweight in the <b>Weight</b> tab — every standard is relative to it.</div>`;
  if (st.state === 'noweight')
    return `<div class="mm-rank none">${trackOf(mmEx).load === 'added'
      ? 'Bodyweight reps are counted, not scored — add weight above and this lift starts scoring.'
      : 'Set a working weight above and this lift starts scoring.'}</div>`;
  const l = st.lift;
  const src = l.srcLabel ? `<span class="rk-lift-src ${l.src}" title="${l.note || ''}">${l.srcLabel}</span>`
            : (l.note ? `<span class="rk-lift-src info" title="${l.note}">i</span>` : '');
  const next = l.rank.next && l.need !== null
    ? `<b>+${l.need < 1 ? l.need.toFixed(1) : Math.round(l.need)} lbs</b> → ${l.rank.next.l} · ${l.rank.next.name}`
    : 'Past the top of the published scale.';
  return `<div class="mm-rank">
    <div class="mm-rank-l" style="color:var(${l.rank.c})">${l.rank.l}</div>
    <div class="mm-rank-b">
      <div class="mm-rank-n">${l.rank.name} · ${ord(l.pct)} percentile${src}</div>
      <div class="mm-rank-s">${next}</div>
    </div>
  </div>`;
}

/* ── counting sets ──

   One box per set the program prescribes, in whatever the movement is
   measured in: reps on a lift, seconds on a hold, reps on bodyweight
   work. What each exercise tracks is read off the exercise (trackOf in
   rank.js), and a movement with nothing worth counting — wrist prep, a
   stretch — gets no boxes at all.

   On a loaded lift the best set is what the 1RM is read off; see the
   RECORDED REPS block in rank.js for why that is the only defensible
   choice. Those boxes appear once there is a weight for the count to be
   true of, and only where there is an estimate or a range for it to feed
   — a '2×F' lift that is not scored has neither. An 'added' lift is the
   exception on both counts: bodyweight is its starting weight, so it is
   counted from the first set, and the count is what says when to start
   adding.

   Bodyweight counts are kept apart from the lifts' (bp_xsets) and feed the
   skill ladders instead: the strip under them says how far the count is
   from the step's `up`, and turns into the way up once it clears it. */
function mmTrack() {
  if (!mmEx) return null;
  const t = trackOf(mmEx);
  if (t.unit === '-') return null;
  if (t.load) {
    if (!LIFT_NAMES.has(mmEx.n) && !t.rng) return null;
    const set = wts()[mmEx.n];
    const wv = t.load === 'added' ? (set > 0 ? set : 0) : set;
    if (t.load === 'set' && !(wv > 0)) return null;
    const rec = exReps(mmEx.n);
    /* The boxes empty out the moment a count goes stale: the numbers in
       them were true of a different weight, and leaving them there would
       invite you to keep one. */
    return { t, wv, vals: rec && (rec.w || 0) === wv ? rec.s : [], lbl: 'Reps per set' };
  }
  const rec = exSets(mmEx);
  return { t, vals: rec ? rec.s : [], lbl: t.unit === 's' ? 'Seconds per set' : 'Reps per set' };
}

/* "Planche · level 2 of 7 · Novice", for anything on a ladder. */
function lvlLine(ex) {
  const L = ex && ex.line && LADDERS[ex.line];
  if (!L) return '';
  const i = lvlOf(ex.line);
  return `${L.n} · level ${i + 1} of ${L.steps.length} · ${L.steps[i].tier}${ex.dose && ex.dose !== 's' ? ' · practice' : ''}`;
}

function mmRepsHTML() {
  const tr = mmTrack();
  if (!tr) return '';
  const secs = tr.t.unit === 's', vals = tr.vals;
  const boxes = Array.from({ length: setCountOf(mmEx) }, (_, i) =>
    `<label class="mm-set"><span>Set ${i + 1}</span>
      <input class="mm-set-in" data-set="${i}" type="number" min="1" max="${secs ? 600 : 100}" step="1"
             inputmode="numeric" placeholder="—" value="${vals[i] > 0 ? vals[i] : ''}">${secs ? '<em>s</em>' : ''}
    </label>`).join('');
  const sub = lvlLine(mmEx);
  const clr = vals.some(v => v > 0)
    ? `<button class="mm-sets-clr" data-act="mm-sets-clear" title="Empties the boxes for today's sets. The last count keeps scoring until you enter the first new one, so closing without typing loses nothing.">Clear sets</button>` : '';
  return `<div class="mm-reps-row">
    <div class="mm-reps-head"><div class="mm-reps-lbl">${tr.lbl}${sub ? `<span>${sub}</span>` : ''}</div>${clr}</div>
    <div class="mm-sets">${boxes}</div>
    <div id="mm-verdict">${mmVerdictHTML(tr)}</div>
  </div>`;
}

/* ── the verdict strip ──

   One line under the boxes, in every state, because the target is worth
   seeing even when there is nothing to do about it — it is what you are
   aiming at on the set you are about to do. Green and amber are buttons
   and mean act; red is inert and means the opposite, so the colour alone
   says whether there is anything here to press.

   The date a count was taken lives in the tooltip, which is where the rest
   of this app keeps the reasoning it does not want to print. Painted on
   its own so it can follow the boxes while one of them still has focus. */
function mmVerdictHTML(tr = mmTrack()) {
  if (!tr) return '';
  return tr.t.load ? loadVerdictHTML(tr) : skillVerdictHTML(tr);
}

const strip = (cls, k, v, tip, act) => {
  const attrs = `class="mm-bump ${cls}" title="${tip}"`;
  const inner = `<span class="mm-bump-k">${k}</span><span class="mm-bump-v">${v}</span>`;
  return act ? `<button ${attrs} ${act}>${inner}</button>` : `<div ${attrs}>${inner}</div>`;
};

function loadVerdictHTML({ t, wv }) {
  const adv = loadAdvice(mmEx.n, wv, t.rng);
  if (!adv) return '';
  const per = isUnilateral(mmEx) ? ' per side' : '';
  /* On a belt the number is what is added to you, and nothing added is
     bodyweight rather than "0 lbs". */
  const W = n => t.load === 'added' ? (n > 0 ? `+${fmtW(n)} lbs` : 'bodyweight') : `${fmtW(n)} lbs`;
  const when = adv.d ? ` · counted ${fmtWhen(adv.d)}` : '';
  const span = `${adv.lo}–${adv.hi}`;
  const stale = adv.staleW !== null && adv.staleW !== undefined;
  const k = adv.best === null ? `Target ${span}` : `Best ${adv.best}${per} · target ${span}`;
  const v = {
    up:        () => `${W(wv)} → ${W(adv.to)}`,
    down:      () => `${W(wv)} → ${W(adv.to)}`,
    hold:      () => `Hold ${W(wv)}`,
    capped:    () => adv.up ? `Max ${fmtW(DB_MAX)} lbs` : 'Lightest there is',
    uncounted: () => stale ? `Stale · counted at ${W(adv.staleW)}` : 'Not counted',
  }[adv.state]();
  const tip = {
    up:        `Your best set reached ${adv.best}, past the ${adv.hi} this movement is meant to fail by — the weight is no longer what stops you. ${W(adv.to)} holds the same estimated 1RM at ${adv.edge} reps. Tap to set it — your reps then need counting again at the new load.`,
    down:      `Your best set stopped at ${adv.best}, short of the ${adv.lo} this movement is meant to reach — the weight is heavier than the slot is asking for. ${W(adv.to)} holds the same estimated 1RM at ${adv.edge} reps. Tap to set it — your reps then need counting again at the new load.`,
    hold:      `${adv.best} reps sits inside the ${span} this movement is meant to fail in, so the weight is doing its job. Nothing to change${when}.`,
    capped:    adv.up
      ? `Your best set reached ${adv.best}, past the ${adv.hi} this movement is meant to fail by — but ${fmtW(DB_MAX)} lbs is the top of your dumbbells, so there is no heavier setting to move to. Add reps or slow the tempo instead.`
      : `Your best set stopped at ${adv.best}, short of the ${adv.lo} this movement is meant to reach, and there is nothing lighter to drop to.`,
    uncounted: stale
      ? `The last count was taken at ${W(adv.staleW)}${when} and says nothing about this lift at ${W(wv)}. Count a set at the current weight and this starts reading again.`
      : `Count your sets above and this reads whether ${W(wv)} is the right load — this movement is meant to fail somewhere in ${span} reps.`,
  }[adv.state];
  const act = adv.state === 'up' || adv.state === 'down';
  return strip(adv.state, k, v, tip, act ? `data-act="mm-bump" data-to="${adv.to}"` : '');
}

function skillVerdictHTML({ t }) {
  const a = skillAdvice(mmEx);
  if (!a) return '';
  const u = t.unit === 's' ? 's' : '';
  const per = isUnilateral(mmEx) ? ' /side' : '';
  const val = n => `${n}${u}`;
  const target = a.rng ? `${a.rng[0]}–${a.rng[1]}${u}` : null;
  const when = a.d ? ` Counted ${fmtWhen(a.d)}.` : '';
  const passTxt = a.pass ? `${a.pass.n > 1 ? a.pass.n + '×' : ''}${a.pass.min}${a.pass.unit === 's' ? 's' : ''}${per}` : '';
  switch (a.state) {
    case 'pass':
      return strip('up', `Passed ${passTxt}`, `→ ${a.next}`,
        `Your count clears “${a.need}” — the number is the part a count can check, and the rest is form only you can judge. Tap to move up to ${a.next}. Settings steps you back down.`,
        'data-act="mm-lvl-up"');
    case 'short':
      return strip('hold', `Pass at ${passTxt}`,
        a.pass.n > 1 ? `${a.hit}/${a.pass.n} sets there` : `Best ${val(a.best)}`,
        `Moving up to ${a.next} asks for ${a.need}. Your best set so far is ${val(a.best)}.${when}`);
    case 'uncounted': {
      /* The pass test is Saturday's; a practice day aims at its own dose */
      const test = a.pass && (!mmEx.dose || mmEx.dose === 's');
      return strip('uncounted', test ? `Pass at ${passTxt}` : target ? `Target ${target}` : 'Count your sets',
        'Not counted',
        test ? `Put in what you did on each set and this says how close you are to ${a.next} — the step asks for ${a.need}.`
             : `Put in what you did on each set${target ? ` — the target is ${target} a set` : ''}.`);
    }
    case 'over':
      return strip('hold', `Best ${val(a.best)} · practice ${target}`, 'Ease off',
        `Practice days are meant to stop short of Saturday's test — end each set with a few seconds still in it. The step is tested at the full dose on Saturday.${when}`);
    case 'top':
      return strip('hold', `Best ${val(a.best)}${per} · target ${target}`, 'Make it harder',
        `Past the top of the ${target} this is prescribed at${mmEx.line ? ', with no step above it' : ''}. Slow the tempo or add a pause at the hardest point rather than piling on more.${when}`);
    case 'under':
      return strip('hold', `Best ${val(a.best)}${per} · target ${target}`, 'Build into it',
        `Short of the ${target} target — normal on a step you have just moved to. Stay here until the sets reach it.${when}`);
    default:
      return strip('hold', target ? `Best ${val(a.best)}${per} · target ${target}` : `Best ${val(a.best)}${per}`, 'On target',
        `Inside the range, so nothing to change.${when}`);
  }
}

/* 62.5 stays 62.5, 65.0 becomes 65 — the half-steps are real and the
   trailing zero is not. */
const fmtW = n => (Math.round(n * 10) % 10 === 0 ? String(Math.round(n)) : n.toFixed(1));

/* Calendar days between two dates, not elapsed milliseconds. Measuring
   from `now` to midnight makes anything logged after lunch today round up
   to "yesterday", which is a small lie the moment you notice it. */
const fmtWhen = ds => {
  if (!ds) return 'earlier';
  const mid = d => new Date(d + 'T00:00:00').getTime();
  const days = Math.round((mid(todayStr()) - mid(ds)) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

/* Reads every box at once rather than the one that changed, so a set left
   blank clears correctly and the stored array always matches what is on
   screen. */
function setMMReps() {
  const tr = mmTrack();
  if (!tr) return;
  const sets = [...root.querySelectorAll('.mm-set-in')]
    .sort((a, b) => +a.dataset.set - +b.dataset.set)
    .map(el => (el.value === '' ? null : parseInt(el.value, 10)));
  if (!tr.t.load) {
    setExSets(mmEx, sets);
    paintMMStanding(true);
    renderProg();                    // a passed step marks its rows
    return;
  }
  setExReps(mmEx.n, sets, tr.wv);
  paintMMStanding(true);
  renderProg();
  renderScore();
}

/* A new week on the same lift. Only the boxes empty: nothing is saved
   until a new set is typed, and then setMMReps writes exactly what the
   boxes hold — so last week's count is replaced by this week's rather than
   deleted in between, and the rank never drops to an assumed rep count
   just because you opened the lab to start logging. */
function clearMMSets() {
  const boxes = [...root.querySelectorAll('.mm-set-in')];
  boxes.forEach(el => { el.value = ''; });
  q('.mm-sets-clr')?.remove();
  boxes[0]?.focus();
}

/* Derived from the weight in bp_wt, so it repaints on open and again after
   any save that leaves the editor on screen.

   `keepBoxes` is for a save FROM the boxes, which already show exactly what
   was saved — only the strip under them has anything new to say. Focus is
   not a usable test for that: tabbing or tapping from one box to the next
   fires the change while focus is in flight and sits on <body>, so a
   rebuild at that moment replaces the box you are moving to before it
   receives focus, and the next number lands back in the first box. */
function paintMMStanding(keepBoxes = false) {
  if (!mmEx) return;
  const st = standingOf(mmEx.n);
  /* carry the row's tint through, so the modal reads as the same lift */
  q('#mm-name').style.color = st.state === 'scored' ? pctColor(st.lift.pct) : '';
  q('#mm-rank').innerHTML = mmRankHTML(st) + rebaseHTML();
  /* Otherwise rebuilt rather than patched: the box count follows the
     prescription and the whole block disappears when the weight is
     cleared. Still skipped while a box has focus, for the same reason. */
  const reps = q('#mm-reps'), verdict = q('#mm-verdict');
  if (verdict && (keepBoxes || reps.contains(document.activeElement))) verdict.innerHTML = mmVerdictHTML();
  else reps.innerHTML = mmRepsHTML();
  q('#mm-lvl').innerHTML = mmLvlHTML();
}

/* Offered on any lift with a history, because the moment you need it is the
   moment you have just typed a much smaller number and are wondering why
   the app thinks you got weaker. */
function rebaseHTML() {
  if (!mmEx || !hasHistory(mmEx.n)) return '';
  return `<button class="mm-rebase" data-act="mm-rebase" title="Void this lift's recorded history and start it again from the weight above">Had this wrong? Start this lift over</button>`;
}

function doRebase() {
  if (!mmEx) return;
  const name = mmEx.n;
  if (!confirm(`Start ${name} over?

Every weight change recorded for this lift is voided — it stops counting as load added AND stops counting against it. Use this when the old numbers were wrong, not when you simply backed off.

Your other lifts are untouched.`)) return;
  const r = rebaseline(name);
  paintMMStanding();
  renderProg();
  renderScore();
  toast(r.reclaimed > 0
    ? `${name} reset · ${Math.round(r.reclaimed)} lbs no longer counted against you`
    : `${name} reset`);
}

/* ── skill level ──

   Where a laddered movement sits. It normally rides on the label of the
   count below, which is also where the way up appears once the count
   clears the step — moving up is earned by the numbers, and Settings is
   where a level is set by hand. This line only stands on its own when
   there is no count to carry it: a loaded step with no weight set yet. */
function mmLvlHTML() {
  if (!mmEx?.line || !LADDERS[mmEx.line] || mmTrack()) return '';
  return `<div class="mm-reps-row"><div class="mm-reps-lbl">${lvlLine(mmEx)}</div></div>`;
}

function mmLvlUp() {
  if (!mmEx?.line || !mmSlot) return;
  const line = mmEx.line, i = lvlOf(line);
  if (!setLvl(line, i + 1)) return;
  const [di, si, ei] = mmSlot;
  renderProg();
  openMM(resEx(PROGRAM[di].sections[si].ex[ei]));
  toast(`${LADDERS[line].n} → ${LADDERS[line].steps[i + 1].n}`);
}

function openMM(ex) {
  /* Re-opened in place after a level change: the focus to return to is
     still the row that opened it, not the button that just re-rendered. */
  if (!q('#mm-ol').classList.contains('on')) mmReturnFocus = document.activeElement;
  mmEx = ex;
  mmView('both');
  q('#mm-name').textContent = ex.n;
  paintMMStanding();
  let info = `<span class="mm-tag">${ex.s}</span>`;
  if (ex.b) info += `<span class="mm-tag">${ex.b}</span>`;
  q('#mm-info').innerHTML = info;
  q('#mm-howto').innerHTML = mmHowtoHTML(ex);

  /* Only a movement that can carry a load gets a weight field. On a belt
     the number is what is added to you, so blank reads as bodyweight. */
  const t = trackOf(ex);
  q('.mm-wt-row').style.display = t.load ? '' : 'none';
  q('.mm-wt-lbl').textContent = t.load === 'added' ? 'Added weight' : 'Working weight';
  q('#mm-wt').placeholder = t.load === 'added' ? '0' : '—';
  const wt = wts()[ex.n];
  q('#mm-wt').value = wt || '';

  /* Chips carry their own tier, so the list doubles as the legend for the
     three shades on the figure. */
  const muscles = ex.m.replace(/\(.*?\)/g,'').split(',').map(s=>s.trim()).filter(Boolean);
  q('#mm-mlist').innerHTML = muscles.map((m, i) =>
    `<button type="button" class="mm-muscle-chip lvl-${mLevel(i)}" data-act="mm-chip" data-m="${m.toLowerCase()}" aria-pressed="false"><span>${m}</span><small>${["Primary", "Supporting", "Stabilizing"][mLevel(i)-1]}</small></button>`).join('');
  mmReadout('');

  /* Swap the highlight with transitions suppressed, otherwise the previous
     exercise's regions visibly fade out as the new ones fade in. */
  const map = q('.mm-map');
  map.classList.add('no-tx');
  const lit = parseMuscles(ex.m);
  root.querySelectorAll('.m-region').forEach(el => {
    el.classList.remove('lvl-1', 'lvl-2', 'lvl-3', 'focus');
    const lvl = lit.get(el.id);
    if (lvl) el.classList.add(`lvl-${lvl}`);
  });
  void map.offsetWidth;                 // commit it before transitions come back
  map.classList.remove('no-tx');

  q('#mm-ol').classList.add('on');
  q('.mm-card').scrollTop = 0;
  q('.mm-close').focus({preventScroll:true});
}
/* ── how to ──

   Written cues first, because they are always there: offline, instantly,
   and never taken down. The video under them is a facade — a plain button
   that contacts nothing until it is tapped, and only then becomes a
   youtube-nocookie player, so opening an exercise never phones YouTube.
   Each one was checked against its own frames before it went in (see
   howto.js). The link under the player is the way out when the embed
   cannot load: offline, or a video pulled since. */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const fmtDur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function mmHowtoHTML(ex) {
  const h = HOWTO[ex.n];
  if (!h) return '';
  const v = h.v;
  const vid = !v ? '' : `<button class="mm-vid" data-act="mm-vid" aria-label="Play video: ${esc(v.t)}">
      <span class="mm-vid-play" aria-hidden="true"></span>
      <span class="mm-vid-txt"><b>${esc(v.t)}</b><em>${esc(v.c)}${v.d ? ` · ${fmtDur(v.d)}` : ''}${v.s ? ` · from ${fmtDur(v.s)}` : ''}</em></span>
    </button>`;
  return `<div class="mm-howto-h">How to</div>
    <ol class="mm-cues">${h.do.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
    ${h.avoid?.length ? `<div class="mm-avoid"><span>Avoid</span><ul>${h.avoid.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
    ${vid}`;
}

function playVideo() {
  const v = mmEx && HOWTO[mmEx.n]?.v;
  const btn = q('.mm-vid');
  if (!v || !btn) return;
  const start = v.s ? `&start=${v.s}` : '';
  btn.outerHTML = `<div class="mm-vid-frame"><iframe
      src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&playsinline=1${start}"
      title="${esc(v.t)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    <a class="mm-vid-out" href="https://www.youtube.com/watch?v=${v.id}${v.s ? `&t=${v.s}s` : ''}" target="_blank" rel="noopener">Open on YouTube</a>`;
}

function closeMM() {
  q('#mm-howto').innerHTML = '';            // a playing video stops with the modal
  q('#mm-ol').classList.remove('on'); mmEx = null; mmSlot = null;
  mmReturnFocus?.focus({preventScroll:true});
}
function mmView(view) {
  const map = q('.mm-map');
  map.dataset.view = view;
  map.classList.remove('is-focused');
  root.querySelectorAll('.m-fig').forEach(svg => svg.setAttribute('viewBox','0 0 160 340'));
  root.querySelectorAll('[data-act="mm-view"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  root.querySelectorAll('.mm-muscle-chip').forEach(b => b.setAttribute('aria-pressed','false'));
  focusMuscle(null,false);
  mmReadout('Tap a muscle to inspect');
}
function inspectMuscle(button) {
  const name=button.dataset.m;
  if(button.getAttribute('aria-pressed') === 'true') { mmView('both'); return; }
  mmView('both');
  focusMuscle(name,true);
  const regions=[...root.querySelectorAll('.m-region.focus')];
  if (!regions.length) { mmReadout(button.querySelector('span').textContent); return; }
  const front=regions.some(e => e.id.startsWith('f-'));
  const back=regions.some(e => e.id.startsWith('b-'));
  const view=front && back ? 'both' : front ? 'front' : 'back';
  q('.mm-map').dataset.view=view;
  q('.mm-map').classList.add('is-focused');
  root.querySelectorAll('[data-act="mm-view"]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  root.querySelectorAll('.m-fig').forEach(svg => {
    const boxes=regions.filter(e=>e.ownerSVGElement===svg).map(e=>e.getBBox());
    if(!boxes.length) return;
    const y=Math.max(0,Math.min(...boxes.map(b=>b.y))-24);
    const bottom=Math.min(340,Math.max(...boxes.map(b=>b.y+b.height))+24);
    svg.setAttribute('viewBox',`0 ${y} 160 ${Math.max(100,bottom-y)}`);
  });
  button.setAttribute('aria-pressed','true');
  mmReadout(button.querySelector('span').textContent + ' · tap again for full body');
}


/* Say what the edit actually did to the record, which is the whole point of
   the log being able to walk itself back. "80 → 100 lbs" would be the same
   sentence whether it stuck or not. */
function weightToast(res, name, v) {
  const c = res.change;
  if (!c) return `${name}: ${v > 0 ? v + ' lbs' : 'cleared'}`;
  const voided = c.rolled.find(r => r.k === 'void');
  if (voided)
    return `Rolled back — ${voided.from} → ${voided.hi || voided.to} lbs was never trained, so it doesn't count`;
  const rebased = c.rolled.find(r => r.k === 'base');
  if (rebased)
    return `${name} starting weight corrected to ${v} lbs · the ${rebased.hi} never counted`;
  if (c.rolled.length && c.kind !== 'up')
    return `${name} down to ${v} lbs · the untrained part of that increase came off with it`;
  switch (c.kind) {
    case 'up':    return `${name} ${c.from} → ${v} lbs · untested until you train it`;
    case 'down':  return `Back-off logged · ${name} ${c.from} → ${v} lbs`;
    case 'base':  return `${name} starting weight ${v} lbs · untested until you train it`;
    case 'clear': return `${name} cleared`;
    default:      return `${name}: ${v > 0 ? v + ' lbs' : 'cleared'}`;
  }
}

function setMMWeight(el) {
  if (!mmEx) return;
  const name = mmEx.n;
  const before = snapshot();               // must precede the bp_wt write
  const w = wts(), raw = parseFloat(el.value), v = isNaN(raw) || raw <= 0 ? 0 : raw;
  const prev = w[name];
  if (!v) delete w[name]; else w[name] = v;
  sWt(w);
  const res = logWeight(name, prev, v, before);
  renderProg();
  renderScore();
  /* Only a PROVEN change can unlock anything, so this now fires on the
     session that earns it rather than on the keystroke that claims it. */
  if (res.rankUp || res.tierUps?.length || res.badges?.length) {
    closeMM();
    showCelebration(res);
    return;
  }
  paintMMStanding();                  // the editor is still open on a changed lift
  toast(weightToast(res, name, v));
}

/* Taking the advice is typing the number, not a second way to save a
   weight: the field is filled and handed to the same handler, so the
   progression log, the toast and any rank-up all behave identically to
   having entered it yourself. */
function takeBump(to) {
  const el = q('#mm-wt');
  if (!el) return;
  el.value = to;
  setMMWeight(el);
}

/* ═══════════════════ BODY ═══════════════════ */
/* Storage is still bp_bw and entries are still keyed by date — what changed
   is that an entry now carries an optional waist and neck alongside the
   weight, and every field on it is optional. You can weigh in without the
   tape and tape yourself without the scale; the maths in body.js takes the
   most recent of each. */
function bwSort(l) { return [...l].sort((a,b) => a.d.localeCompare(b.d)); }
function bwSet(d, patch) {
  const l = bwAll(), i = l.findIndex(e => e.d === d);
  const next = { ...(i >= 0 ? l[i] : { d }), ...patch };
  /* A blanked field is a deletion, not a zero — otherwise clearing the waist
     on one entry would leave a 0 behind and read as a 0-inch waist. */
  Object.keys(next).forEach(k => { if (next[k] === null) delete next[k]; });
  if (i >= 0) l[i] = next; else l.push(next);
  bwSv(bwSort(l.filter(hasAny)));
}
function bwDel(d) { bwSv(bwAll().filter(e => e.d !== d)); }
function bwFmt(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function bwFmtLong(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'}); }
function bwDaysBetween(a,b) { return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86400000); }
function bwRelLabel(d) {
  const days = bwDaysBetween(d, todayStr());
  if (days < 0)   return days === -1 ? 'Tomorrow' : `In ${-days} days`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.round(days/7)}w ago`;
  if (days < 365) return `${Math.round(days/30)}mo ago`;
  return `${Math.round(days/365)}y ago`;
}

/* One row per thing the chart can plot. Body fat isn't stored — it is
   computed per entry from that entry's own tape, so a chart point exists
   only where both measurements do. */
const BW_METRICS = [
  { k:'w',  lbl:'Weight',   unit:'lbs', dec:1, get:(e) => hasW(e) ? e.w : null },
  { k:'bf', lbl:'Body fat', unit:'%',   dec:1, get:(e,h) => navyBF(e.wa, e.nk, h) },
  ...TAPE.map(t => ({ k:t.k, lbl:t.lbl, len:true, unit:'in', dec:1,
                      get:(e) => (typeof e[t.k] === 'number' && e[t.k] > 0) ? e[t.k] : null })),
];
/* The stored unit is always inches; `u` only decides what the axis, the
   tooltips and the one-reading message call it. */
const metricOf = (k, u = 'in') => {
  const m = BW_METRICS.find(x => x.k === k) || BW_METRICS[0];
  return m.len ? { ...m, unit: unitOf(u).n } : m;
};



/* The chart's series for the current metric and range: {d, v}, oldest first,
   with every entry that has no value for this metric dropped rather than
   plotted as a gap. */
function bwSeries(k, h, u = 'in') {
  const m = metricOf(k, u), r = BW_RANGES.find(x => x.k === bwRange);
  return within(bwAll(), r ? r.d : null)
    .map(e => { const v = m.get(e, h); return { d: e.d, v: m.len ? toU(v, u) : v }; })
    .filter(p => p.v !== null && p.v !== undefined && isFinite(p.v));
}

/* One stored length, rendered. Inches keep the prime mark they have always
   had; centimetres take a space and the abbreviation. */
const lenStr = (inches, u, dec = 1) =>
  (typeof inches !== 'number' || !isFinite(inches)) ? '—'
    : u === 'cm' ? `${toU(inches, u).toFixed(dec)} cm` : `${inches.toFixed(dec)}"`;

/* The unit itself, as the control that changes it. Two options means a tap
   flips rather than picks, so the button shows the unit in force and says
   what it would switch to. It sits inside the field's own label because
   that is where you are looking when you realise the tape is metric. */
const unitBtn = (key, u) => {
  const other = u === 'in' ? 'cm' : 'in';
  return `<button class="bw-unit" data-act="bd-unit" data-k="${key}" data-u="${other}"`
    + ` title="Showing ${unitOf(u).full.toLowerCase()} — tap for ${unitOf(other).full.toLowerCase()}"`
    + ` aria-label="Unit: ${unitOf(u).full}. Switch to ${unitOf(other).full}.">${unitOf(u).n}</button>`;
};

const fx = (v, d = 1) => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(d);
/* '12.4%' but '182.0 lbs' — a percent sign is part of the number, a unit isn't. */
const withUnit = (v, m) => `${fx(v, m.dec)}${m.unit === '%' ? '' : ' '}${m.unit}`;

/* ── chart ── */
function bwChartSVG(series, m) {
  if (series.length === 0)
    return `<div class="bw-empty">No ${m.lbl.toLowerCase()} readings in this range yet.</div>`;
  if (series.length === 1) {
    const e = series[0];
    return `<div class="bw-empty">Just one reading: <b style="color:var(--text)">${withUnit(e.v, m)}</b> on ${bwFmt(e.d)}.<br>Log more to see a trend.</div>`;
  }
  /* Pull the palette from the active theme so the chart re-colours with it. */
  const cs = getComputedStyle(document.documentElement);
  const C = k => cs.getPropertyValue(k).trim();
  const AC = C('--blue'), GRID = C('--grid'), AXIS = C('--text-3'), CARD = C('--bg-card');
  const W=600,H=200,PADL=36,PADR=12,PADT=14,PADB=22;
  const innerW=W-PADL-PADR, innerH=H-PADT-PADB;

  /* Drawn through the raw points, not instead of them. Scale weight moves
     three or four pounds on water alone, so the dots are the readings and
     the line is what they mean. Sparse metrics — a waist measured once a
     week — smooth to exactly themselves, and the test below then leaves
     the second line off rather than drawing it twice. */
  const sm = smooth(series);
  const hasTrend = sm.some((p, i) => Math.abs(p.v - series[i].v) > 1e-9);

  const vals = series.map(p => p.v).concat(hasTrend ? sm.map(p => p.v) : []);
  const minV=Math.min(...vals), maxV=Math.max(...vals);
  const range=Math.max(maxV-minV,m.k==='w'?1:0.4), pad=range*0.18;
  const yMin=minV-pad, yMax=maxV+pad, n=series.length;
  const xOf=i=>PADL+(i/(n-1))*innerW;
  const yOf=v=>PADT+innerH-((v-yMin)/(yMax-yMin))*innerH;
  const pathOf=pts=>'M '+pts.map(p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');

  const points=series.map((p,i)=>[xOf(i),yOf(p.v)]);
  const rawPath=pathOf(points);
  const areaPath=rawPath+` L ${points[n-1][0].toFixed(1)} ${PADT+innerH} L ${points[0][0].toFixed(1)} ${PADT+innerH} Z`;
  const trendPath=hasTrend?pathOf(sm.map((p,i)=>[xOf(i),yOf(p.v)])):null;

  const gridCount=4; let gridHTML='';
  for (let i=0;i<=gridCount;i++) {
    const v=yMin+((yMax-yMin)*i/gridCount);
    const y=(PADT+innerH-(i/gridCount)*innerH).toFixed(1);
    gridHTML+=`<line x1="${PADL}" y1="${y}" x2="${W-PADR}" y2="${y}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2,3"/><text x="${PADL-6}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${AXIS}" font-family="JetBrains Mono, monospace" font-size="9">${v.toFixed(range<6?1:0)}</text>`;
  }
  const xIdx=n>=4?[0,Math.floor(n/2),n-1]:[0,n-1];
  const xHTML=xIdx.map(i=>`<text x="${xOf(i).toFixed(1)}" y="${H-6}" text-anchor="middle" fill="${AXIS}" font-family="JetBrains Mono, monospace" font-size="9">${bwFmt(series[i].d)}</text>`).join('');
  const dotsHTML=points.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${hasTrend?2.6:3.5}" fill="${AC}" stroke="${CARD}" stroke-width="${hasTrend?1.5:2}" opacity="${hasTrend?0.55:1}"><title>${withUnit(series[i].v, m)} · ${bwFmt(series[i].d)}</title></circle>`).join('');

  return `<svg class="bw-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="bw-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${AC}" stop-opacity="0.28"/><stop offset="100%" stop-color="${AC}" stop-opacity="0"/></linearGradient></defs>
    ${gridHTML}
    <path d="${areaPath}" fill="url(#bw-grad)"/>
    <path d="${rawPath}" fill="none" stroke="${AC}" stroke-width="${hasTrend?1.25:2}" stroke-opacity="${hasTrend?0.4:1}" stroke-linecap="round" stroke-linejoin="round"/>
    ${trendPath?`<path d="${trendPath}" fill="none" stroke="${AC}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`:''}
    ${dotsHTML}
    ${xHTML}
  </svg>${hasTrend?`<div class="bw-chart-key"><span><i class="raw"></i>Reading</span><span><i class="trend"></i>7-day trend</span></div>`:''}`;
}

/* ── tiles ── */
function tile(label, value, unit, sub, cls = '') {
  return `<div class="bw-stat"><div class="bw-stat-v">${value}${unit?`<span class="bw-stat-u">${unit}</span>`:''}</div>`
    + `<div class="bw-stat-l">${label}</div>`
    + `<div class="bw-stat-d ${cls}">${sub ?? '·'}</div></div>`;
}
const deltaSub = v => v === null || v === undefined
  ? { t:'·', c:'flat' }
  : { t:`${v > 0 ? '+' : ''}${v.toFixed(1)}`, c: v > 0.05 ? 'up' : v < -0.05 ? 'dn' : 'flat' };

/* ── the body-fat scale ── */
/* A percentage on its own doesn't say whether it is a good one. The bands
   are ACE's male classification; the marker is where you sit on them, which
   is also the reason the verdict below says what it says. */
function bfScaleHTML(bf, healthy) {
  const lo = 2, hi = 40;
  const at = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
  /* hi is an exclusive bound — Athlete is `bf < 14` — so the tooltip has to
     print hi-1 or it reads back the next band's floor as its own ceiling
     ("Essential · 2-6%" when ACE publishes 2-5%). The top band has no
     ceiling at all. */
  const segs = BF_BANDS.map((b, i) => {
    const range = i === BF_BANDS.length - 1 ? `${b.lo}%+` : `${b.lo}–${b.hi - 1}%`;
    return `<i class="${b.tone}" style="flex:${b.hi - b.lo}" title="${b.n} · ${range}"></i>`;
  }).join('');
  const names = BF_BANDS.map(b => `<span style="flex:${b.hi - b.lo}"><em>${b.n}</em><i>${b.ab}</i></span>`).join('');
  const pos = at(bf);
  /* Gallagher's healthy range for the age given, laid over ACE's bands
     rather than replacing them — two different published things saying two
     different things, and flattening them into one would lose both. Absent
     an age there is nothing to draw. */
  const band = healthy
    ? `<span class="bd-scale-ok" style="left:${at(healthy.lo).toFixed(1)}%;width:${(at(healthy.hi) - at(healthy.lo)).toFixed(1)}%"
         title="Healthy range for ages ${healthy.lbl}: ${healthy.lo}–${healthy.hi}% (Gallagher 2000)"></span>` : '';
  const inRange = healthy && bf >= healthy.lo && bf <= healthy.hi;
  const foot = healthy
    ? `<div class="bd-scale-foot ${inRange ? 'ok' : ''}">Healthy for ${healthy.lbl}: <b>${healthy.lo}–${healthy.hi}%</b>${inRange ? " — you're in it" : ''}</div>`
    : '';
  return `<div class="bd-scale">
    <div class="bd-scale-bar">${segs}${band}<b class="bd-scale-mk" style="left:${pos.toFixed(1)}%"><span>${fx(bf,1)}%</span></b></div>
    <div class="bd-scale-lbl">${names}</div>
    ${foot}
  </div>`;
}

/* ── the call ── */
function projectHTML(cur, goalW, rate) {
  const p = project(cur, goalW, rate);
  if (!p) return `<div class="bd-proj none">Log a few more weigh-ins and this will say how long it should take.</div>`;
  if (p.state === 'there') return `<div class="bd-proj good">You're there. Re-measure and set the next one.</div>`;
  if (p.state === 'flat')  return `<div class="bd-proj none">Weight isn't moving, so there's nothing to project from.</div>`;
  if (p.state === 'away')  return `<div class="bd-proj warn">Currently moving away from this goal — no date until that turns around.</div>`;
  const wks = Math.round(p.weeks);
  const when = wks > 12 ? bwFmtLong(p.date) : bwFmt(p.date);
  return `<div class="bd-proj good"><b>${Math.abs(p.gap).toFixed(1)} lbs</b> to go · about <b>${wks} week${wks===1?'':'s'}</b> at your current rate · around <b>${when}</b></div>`;
}

function callHTML(s, a) {
  if (a.state !== 'ok') {
    /* Three different reasons for the same blank card, and saying which one
       is the whole value of the card. The third is the wrong-way-round typo:
       a neck bigger than a waist has no estimate in it, and "log a waist and
       neck" is unhelpful advice to someone who just did. */
    const need = s.tapeBad
      ? `Your last tape reads a ${lenStr(s.waist, unitFor(s.units, 'wa'))} waist and a ${lenStr(s.neck, unitFor(s.units, 'nk'))} neck, and no estimate comes out of that — the waist has to be the larger of the two. Check whether the two numbers went into the wrong boxes.`
      : s.h === null
        ? 'Set your height above, then log a waist and neck measurement below.'
        : 'Log a waist and neck measurement below and this fills in immediately.';
    return `<div class="bd-call empty"><div class="bd-call-top"><span class="bd-call-v">—</span>
      <span class="bd-call-sub">No body fat estimate yet</span></div>
      <p class="bd-call-why">${need}</p>
      <p class="bd-call-why">Waist at the navel, neck just below the larynx — the same two spots every time, because the change in the number is worth more than the number.</p></div>`;
  }
  const g = s.goal !== null && s.goal !== undefined ? s.goal : (a.goal ? a.goal.w : null);
  const usingOwn = s.goal !== null && s.goal !== undefined;

  return `<div class="bd-call ${a.tone}">
    <div class="bd-call-top">
      <span class="bd-call-v">${a.v}</span>
      <span class="bd-call-sub">${fx(s.bf,1)}% body fat · ${s.band.n}</span>
    </div>
    <p class="bd-call-why">${a.why}</p>
    ${a.pace ? `<div class="bd-pace ${a.pace.tone}">${a.pace.t}</div>` : ''}

    <div class="bd-targets">
      <div class="bd-t"><div class="bd-t-v">${a.kcal.toLocaleString()}<span>kcal/day</span></div>
        <div class="bd-t-l">${a.delta === 0 ? 'At maintenance' : `${a.delta > 0 ? '+' : '−'}${Math.abs(a.delta)} on ${Math.round(s.energy.tdee).toLocaleString()} maintenance`}</div></div>
      <div class="bd-t"><div class="bd-t-v">${a.protein}<span>g protein</span></div>
        <div class="bd-t-l">${a.v === 'CUT' ? '1.2' : '1.0'} g per lb of lean mass</div></div>
    </div>
    <div class="bd-goal">
      <div class="bd-goal-head"><span class="bd-goal-t">Goal weight</span>
        ${usingOwn ? `<button class="bd-mini" data-act="bd-goal-clear">Use recommended</button>`
                   : `<span class="bd-goal-tag">Recommended</span>`}</div>
      <div class="bd-goal-row">
        <div class="bd-goal-v">${fx(g,1)}<span>lbs</span></div>
        <div class="bd-goal-at">${a.goal ? `at ~${fx(a.goal.pct,0)}% body fat` : ''}${a.goal && a.goal.staged ? ' · staged' : ''}</div>
        <input class="bw-in bd-goal-in" id="bd-goal" type="number" step="0.5" min="0" inputmode="decimal"
               placeholder="${a.goal ? a.goal.w.toFixed(1) : 'Set your own'}" value="${usingOwn ? s.goal : ''}">
        <button class="bd-mini go" data-act="bd-goal-save">Set</button>
      </div>
      ${projectHTML(s.w, g, s.rate)}
    </div>
  </div>`;
}

/* ── the reminder ──
   Painted from renderBW, which runs on mount and on every data change
   whichever tab is showing — so the tint is right before you look at it,
   which is the entire point of putting it on the tab rather than inside
   the card nobody has opened. */
function paintBodyTab(t) {
  const tab = q('.wk .tab[data-tab="bw"]');
  if (!tab) return;
  tab.classList.toggle('due', !!(t && t.due));
  tab.title = !t ? ''
    : t.never ? 'No tape measurement yet — waist and neck give you a body fat estimate'
    : t.due   ? `Tape measurement due${t.overdueBy ? ` — ${t.overdueBy} day${t.overdueBy === 1 ? '' : 's'} overdue` : ''}`
    : `Next tape measurement in ${t.dueIn} day${t.dueIn === 1 ? '' : 's'}`;
}

/* The line on the card that says the same thing in words. */
function dueHTML(t, snap) {
  if (!t) return '';
  const wk = n => `${Math.round(n / 7)} week${Math.round(n / 7) === 1 ? '' : 's'}`;
  if (t.never)
    return t.due
      ? `<div class="bd-caveat stale">You have been logging weight for a fortnight without a tape measurement. Waist and neck are what turn the scale into a body fat estimate — two minutes, once every ${wk(t.every)}.</div>`
      : '';
  if (t.due) {
    const over = t.overdueBy;
    return `<div class="bd-caveat stale" title="Everything above still reads off ${snap.bfDate ? bwFmt(snap.bfDate) : 'your last tape measurement'}.">Tape measurement due${over ? ` — <b>${over} day${over === 1 ? '' : 's'}</b> overdue` : ''}</div>`;
  }
  return `<div class="bd-due" title="Every ${wk(t.every)} is the right cadence at your current rate — measure more often and you mostly record the tape's own error.">Next tape measurement due in <b>${t.dueIn} day${t.dueIn === 1 ? '' : 's'}</b></div>`;
}

/* ── measurements vs a population ── */
/* The same job standards.js does for lifts, and it earns the same
   scepticism: each row wears where its comparison came from, because a
   percentile with no provenance is just a number that sounds authoritative.
   The bar always fills in the direction that counts — a small waist and a
   big arm both read long — so one bar can serve five rows. */
function standingsHTML(s) {
  const entry = lastTaped(bwAll());
  const rows = standingsFor(entry, s.age, TAPE_KEYS);
  if (!rows.length) return '';

  const body = rows.map(r => {
    const inches = entry[r.key];
    const c = pctColor(r.score);
    return `<div class="an-row">
      <div class="an-top">
        <span class="an-n">${r.lbl}<span class="an-src ${r.src}" title="${r.note}">${r.srcLabel}</span></span>
        <span class="an-v">${lenStr(inches, unitFor(s.units, r.key))}</span>
      </div>
      <div class="an-bar"><i style="width:${r.score.toFixed(1)}%;background:${c}"></i></div>
      <div class="an-foot"><span style="color:${c}">${r.phrase}</span><b>${ord(Math.round(r.pct))}</b></div>
    </div>`;
  }).join('');

  return `<div class="pg-card an-card">
    <div class="pg-card-head">
      <div class="pg-card-title">Where you stand</div>
      <div class="pg-card-note">${s.age ? 'age-matched' : 'all adult men — set an age above to match'}</div>
    </div>
    <div class="an-list">${body}</div>
  </div>`;
}

/* ── profile ── */
function profileHTML(s) {
  const u = unitFor(s.units, 'h');
  const opts = ACTIVITY.map(a => `<option value="${a.k}" ${a.k===s.act?'selected':''}>${a.n} — ${a.d}</option>`).join('');

  /* Feet and inches is two boxes; centimetres is one. Splitting a height
     into ft+in is a quirk of the imperial system, not a thing heights do.
     The imperial pair keeps its ft/in suffixes because they say which box
     is which; the single metric box doesn't need one, since the toggle in
     the label above it already reads "cm". */
  const ft   = s.h ? Math.floor(s.h / 12) : '';
  const inch = s.h ? +(s.h - Math.floor(s.h / 12) * 12).toFixed(1) : '';
  const htField = u === 'cm'
    ? `<div class="bd-ht one"><input class="bw-in" id="bd-cm" type="number" min="90" max="250" step="0.5" inputmode="decimal" placeholder="—" value="${s.h ? toU(s.h, 'cm').toFixed(1) : ''}"></div>`
    : `<div class="bd-ht">
        <input class="bw-in" id="bd-ft" type="number" min="3" max="8" step="1" inputmode="numeric" placeholder="—" value="${ft}"><span>ft</span>
        <input class="bw-in" id="bd-in" type="number" min="0" max="11.5" step="0.5" inputmode="decimal" placeholder="—" value="${inch}"><span>in</span>
      </div>`;

  return `<div class="bd-prof ${s.h === null ? 'unset' : ''}">
    <div class="bd-prof-f">
      <div class="bw-add-lbl">Height ${unitBtn('h', u)}</div>
      ${htField}
    </div>
    <div class="bd-prof-f narrow">
      <div class="bw-add-lbl" title="Optional. No formula here uses your age — it only moves what counts as a healthy body fat, which rises with it.">Age <em>optional</em></div>
      <input class="bw-in" id="bd-age" type="number" min="14" max="100" step="1" inputmode="numeric" placeholder="—" value="${s.age ?? ''}">
    </div>
    <div class="bd-prof-f wide">
      <div class="bw-add-lbl">Daily activity</div>
      <select class="bw-in" id="bd-act">${opts}</select>
    </div>
  </div>`;
}

/* ── the tab ── */
function renderBW() {
  const p = q('#p-bw'), all = bwAll();
  /* bodySnap, not snapshot — rank.js exports a `snapshot` too, and that one
     is the level-up before/after picture, not the body one. */
  const s = bodySnap(), a = advise(s);
  let h = profileHTML(s);

  /* Row one is what you are. Row two is what that means and how fast it is
     changing — every figure on it is derived from row one plus height. */
  const rate = s.rate;
  const rateSub = rate
    ? `${rate.pctWk > 0 ? '+' : ''}${rate.pctWk.toFixed(2)}%/wk`
    : 'Needs a week of data';
  const bmiWord = s.bmi === null ? '·'
    : s.bmi < 18.5 ? 'Under' : s.bmi < 25 ? 'Normal' : s.bmi < 30 ? '"Overweight"' : '"Obese"';
  const whtrB = whtrBand(s.whtr);

  h += `<div class="bw-stats">
    ${tile('Weight', fx(s.w,1), 'lbs', s.wDate ? bwRelLabel(s.wDate) : 'Not logged', 'flat')}
    ${tile('Body fat', fx(s.bf,1), '%', s.band ? s.band.n : 'Needs tape', 'flat')}
    ${tile('Lean mass', fx(s.lean,1), 'lbs', s.lean !== null ? 'Est. fat-free' : '·', 'flat')}
    ${tile('Fat mass', fx(s.fat,1), 'lbs', s.fat !== null ? 'Estimated' : '·', 'flat')}
  </div>`;

  h += `<div class="bw-stats second">
    ${tile('Trend', rate ? `${rate.lbsWk > 0 ? '+' : ''}${rate.lbsWk.toFixed(2)}` : '—', 'lb/wk', rateSub,
           rate ? (rate.lbsWk > 0.05 ? 'up' : rate.lbsWk < -0.05 ? 'dn' : 'flat') : 'flat')}
    ${tile('FFMI', s.ffmi ? fx(s.ffmi.norm,1) : '—', '', s.ffmi ? 'Benchmark ~25' : 'Needs tape', 'flat')}
    ${tile('BMI', fx(s.bmi,1), '', bmiWord, 'flat')}
    ${tile('Waist : height', s.whtr ? s.whtr.toFixed(2) : '—', '', whtrB ? whtrB.n : 'Needs tape',
           whtrB ? (whtrB.tone === 'good' ? 'up' : whtrB.tone === 'mid' ? 'flat' : 'dn') : 'flat')}
  </div>`;

  /* What produced the four numbers above, once, under them — rather than a
     caveat on each tile, which would be four times the words and read as
     hedging instead of as provenance.

     Three things have to be said and none of them fit in a tile subtitle:
     the equation is male-only, "lean mass" is fat-free mass and not muscle,
     and the weight and the tape may be from different days. The last is
     the one that quietly corrupts a comparison — today's scale weight
     minus a fat percentage from three weeks ago is not a measurement of
     anything that existed on either date — so both dates are printed
     whenever they differ. */
  /* BMI is in that row because it is free and people ask for it, not because
     it is worth much here — it cannot tell muscle from fat, which is the one
     distinction this whole tab exists to make. Hence the quotation marks
     above and the line below. */
  if (s.bmi !== null && s.lean !== null && s.bmi >= 25 && s.bf < 20)
    h += `<div class="bd-caveat">BMI reads ${fx(s.bmi,1)} — "overweight" — at an estimated ${fx(s.bf,1)}% body fat. <span title="NICE NG246 advises caution interpreting BMI in adults with high muscle mass. That makes the category unreliable here, not the number meaningless — and the body fat it is being weighed against is itself a tape estimate with a few points of error.">BMI cannot tell muscle from fat, so read it next to the figures above rather than on its own.</span></div>`;

  if (s.bf !== null) h += bfScaleHTML(s.bf, s.healthy);
  h += callHTML(s, a);
  h += standingsHTML(s);

  /* One line about the tape, not three. There used to be a separate note
     for "body fat is from the 5th, weight is from today", which fired on
     almost every render — you weigh yourself far more often than you tape
     yourself, so the two dates differing is the normal state of affairs
     rather than a problem. What actually matters is whether the tape is old
     enough to stop trusting, which is the question this answers, and it
     names the date either way. */
  const tape = a.tape;
  h += dueHTML(tape, s);
  paintBodyTab(tape);

  /* ── chart ── */
  const mu = unitFor(s.units, bwMetric);     // weight and body fat ignore it
  const m = metricOf(bwMetric, mu);
  const series = bwSeries(bwMetric, s.h, mu);
  const mBtns = BW_METRICS.map(x => `<button class="bw-r-btn ${x.k===bwMetric?'sel':''}" data-act="bw-metric" data-k="${x.k}">${x.lbl}</button>`).join('');
  const rngBtns = BW_RANGES.map(r => `<button class="bw-r-btn ${r.k===bwRange?'sel':''}" data-act="bw-range" data-k="${r.k}">${r.lbl}</button>`).join('');
  h += `<div class="bw-chart-card">
    <div class="bw-chart-head"><div class="bw-range metrics">${mBtns}</div><div class="bw-range">${rngBtns}</div></div>
    ${bwChartSVG(series, m)}</div>`;

  /* ── log ── */
  const editing = bwEditDate !== null;
  const ee = editing ? all.find(e => e.d === bwEditDate) : null;
  const val = k => (ee && ee[k] !== undefined && ee[k] !== null) ? ee[k] : '';
  /* Editing an entry that already carries a chest, arm or thigh has to open
     the disclosure — otherwise the fields are hidden, come back blank, and
     "blank means clear this" quietly deletes them on save. */
  const extras = TAPE.filter(t => !t.core);
  const hasExtras = ee ? extras.some(t => typeof ee[t.k] === 'number') : false;
  const showMore = bwMore || hasExtras;
  const fld = t => {
    const tu = unitFor(s.units, t.k);
    const stored = val(t.k);
    const shown = stored === '' ? '' : +toU(stored, tu).toFixed(1);
    return `<div class="bw-add-fld"><div class="bw-add-lbl" title="${t.how}">${t.lbl} ${unitBtn(t.k, tu)}</div>`
      + `<input class="bw-in" type="number" step="0.1" min="0" id="bw-${t.k}" placeholder="—" value="${shown}" inputmode="decimal" title="${t.how}"></div>`;
  };

  h += `<div class="bw-add ${editing?'editing':''}">
    <div class="bw-add-fld"><div class="bw-add-lbl">${editing?'Editing':'Date'}</div><input class="bw-in" type="date" id="bw-date" value="${editing?bwEditDate:todayStr()}" max="${todayStr()}" ${editing?'readonly':''}></div>
    <div class="bw-add-fld"><div class="bw-add-lbl">Weight <em>lbs</em></div><input class="bw-in" type="number" step="0.1" min="0" id="bw-weight" placeholder="—" value="${val('w')}" inputmode="decimal"></div>
    ${TAPE.filter(t => t.core).map(fld).join('')}
    ${showMore ? extras.map(fld).join('') : ''}
    <button class="bw-add-btn" data-act="bw-save">${editing?'Update':'Log'}</button>
    <div class="bw-add-foot">
      <button class="bd-mini" data-act="bw-more">${showMore ? '− Fewer measurements' : '+ Chest, arm, thigh'}</button>
      ${editing?`<button class="bd-mini" data-act="bw-cancel">Cancel edit</button>`:''}
    </div>
  </div>`;

  /* ── history ── */
  if (all.length > 0) {
    h += `<div class="day-card"><div class="day-top"><div class="day-top-l"><span class="day-badge hist">History</span><span class="day-title">${all.length} ${all.length===1?'Entry':'Entries'}</span></div><span class="day-prog">${bwFmt(all[0].d)} → ${bwFmt(all[all.length-1].d)}</span></div><div class="bw-hist">`;
    const rev = [...all].reverse();
    /* The delta compares each weigh-in with the previous *weigh-in*, which
       is not always the previous entry now that an entry can be tape only. */
    const wOnly = [...weighed(all)].reverse();
    rev.forEach(e => {
      let dHTML = '<div class="bw-h-d flat">—</div>';
      if (hasW(e)) {
        const i = wOnly.findIndex(x => x.d === e.d), prior = wOnly[i+1];
        if (prior) {
          const d = e.w - prior.w;
          const cls = d > 0.05 ? 'up' : d < -0.05 ? 'dn' : 'flat';
          const arrow = d > 0.05 ? '↑' : d < -0.05 ? '↓' : '•';
          dHTML = `<div class="bw-h-d ${cls}">${arrow} ${d > 0 ? '+' : ''}${d.toFixed(1)}</div>`;
        } else dHTML = `<div class="bw-h-d flat">start</div>`;
      }
      const bf = navyBF(e.wa, e.nk, s.h);
      const chips = TAPE
        .filter(t => typeof e[t.k] === 'number' && e[t.k] > 0)
        .map(t => `<span class="bw-h-chip" title="${t.lbl}">${t.ab} ${lenStr(e[t.k], unitFor(s.units, t.k))}</span>`)
        .concat(bf !== null ? [`<span class="bw-h-chip bf">${bf.toFixed(1)}% bf</span>`] : [])
        .join('');
      h += `<div class="bw-h-row">
        <div><div class="bw-h-date">${bwFmt(e.d)}</div><div class="bw-h-rel">${bwRelLabel(e.d)}</div></div>
        <div class="bw-h-w">${hasW(e) ? e.w.toFixed(1) : '—'}${hasW(e)?'<span class="bw-h-w-u">lbs</span>':''}</div>
        ${dHTML}
        <div class="bw-h-act">
          <button class="bw-h-btn" data-act="bw-edit" data-d="${e.d}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
          <button class="bw-h-btn del" data-act="bw-del" data-d="${e.d}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
        </div>
        ${chips ? `<div class="bw-h-chips">${chips}</div>` : ''}
      </div>`;
    });
    h += `</div></div>`;
  }
  p.innerHTML = h;
}

function bwSetRange(k) { bwRange = k; renderBW(); }
function bwToggleMore() {
  const draft = bwFormDraft();
  bwMore = !bwMore;
  renderBW();
  bwRestoreDraft(draft);
}
function bwSetMetric(k) { bwMetric = k; renderBW(); }

/* A blank field means "don't record this", an entered one means record it.
   Reading a blank as 0 is the bug this guards: a 0 lb weigh-in would sit in
   the chart forever and drag every average through the floor. */
function fieldVal(id) {
  const el = q(id); if (!el) return undefined;
  const raw = el.value.trim();
  if (raw === '') return null;
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? undefined : n;
}

function bwSave() {
  const d = q('#bw-date').value;
  if (!d) { toast('Pick a date'); return; }
  const units = prof().units;
  const raw = { w: fieldVal('#bw-weight') };          // pounds, always
  /* Only fields actually on the form. A hidden one contributes nothing —
     not a value and not a blank — so collapsing the disclosure can never
     be a way to wipe a measurement.

     fromU is applied to the number only: fieldVal's null (blank, meaning
     leave it or clear it) and undefined (rejected) are signals, not
     lengths, and converting them would turn null into 0. */
  TAPE.forEach(t => {
    if (!q('#bw-' + t.k)) return;
    const v = fieldVal('#bw-' + t.k);
    raw[t.k] = typeof v === 'number' ? fromU(v, unitFor(units, t.k)) : v;
  });
  if (Object.values(raw).includes(undefined)) { toast('Those numbers need to be above zero'); return; }
  const editing = bwEditDate !== null;

  /* A blank field means two different things depending on which form you are
     standing in, and conflating them costs you data. Adding, it means "I
     didn't measure that", and the entry keeps whatever it already holds — so
     stepping on the scale in the evening does not erase the morning's tape.
     Editing, it means "clear this", which is the only way to take back a
     waist you mistyped. */
  const patch = {};
  Object.entries(raw).forEach(([k, v]) => { if (v !== null || editing) patch[k] = v; });
  if (!Object.keys(patch).length) { toast('Enter at least one measurement'); return; }
  if (editing && Object.values(patch).every(v => v === null)) {
    toast('That would empty the entry — delete it instead'); return;
  }

  bwSet(d, patch);
  bwEditDate = null; renderBW();
  renderProg();                       // every lift is scored against bodyweight
  toast(editing ? 'Updated' : raw.w !== null ? `Logged ${raw.w} lbs` : 'Measurement logged');
}
function bwEdit(d) {
  bwEditDate = d; renderBW();
  setTimeout(() => { const el = q('#bw-weight'); if (el) { el.focus(); el.select?.(); } }, 50);
}
function bwCancelEdit() { bwEditDate = null; renderBW(); }
function bwDelete(d) {
  if (!confirm(`Delete entry for ${bwFmt(d)}?`)) return;
  bwDel(d); if (bwEditDate === d) bwEditDate = null; renderBW();
  renderProg();
  toast('Entry deleted');
}

/* ── profile + goal writes ── */
function bdHeight() {
  let h;
  if (unitFor(prof().units, 'h') === 'cm') {
    const cm = parseFloat(q('#bd-cm')?.value);
    h = isNaN(cm) ? null : fromU(cm, 'cm');
  } else {
    const ft = parseFloat(q('#bd-ft')?.value), inch = parseFloat(q('#bd-in')?.value) || 0;
    h = isNaN(ft) ? (inch > 0 ? inch : null) : ft * 12 + inch;
  }
  profSet({ h: h && h > 0 ? h : null });
  renderBW();
}

/* What is typed into the log form but not yet saved, normalised to inches.

   The form is rebuilt from storage on every render, so anything still in
   flight has to be carried across by hand. Two things re-render it without
   the user meaning to leave: flipping a unit and opening the disclosure.
   Neither should cost you the numbers you already typed — and a unit flip
   in particular must not leave a value sitting there unchanged while its
   meaning quietly changes underneath it, 33.5 inches becoming 33.5
   centimetres.

   Inches is the currency here for the same reason it is in storage: the
   draft has to survive a render that may have changed which unit the field
   is being shown in. */
function bwFormDraft() {
  const units = prof().units, draft = {};
  const put = (k, el, conv) => {
    if (!el || el.value.trim() === '') return;
    const n = parseFloat(el.value);
    if (!isNaN(n)) draft[k] = conv ? conv(n) : n;
  };
  put('w', q('#bw-weight'));
  TAPE.forEach(t => put(t.k, q('#bw-' + t.k), n => fromU(n, unitFor(units, t.k))));
  return draft;
}

function bwRestoreDraft(draft) {
  const units = prof().units;
  const wEl = q('#bw-weight');
  if (wEl && draft.w !== undefined) wEl.value = draft.w;
  TAPE.forEach(t => {
    const el = q('#bw-' + t.k);
    if (el && draft[t.k] !== undefined) el.value = +toU(draft[t.k], unitFor(units, t.k)).toFixed(1);
  });
}

/* Display only — nothing in storage moves, so the tab just repaints. Height
   is not carried because it does not need to be: it saves on change, which
   fires on the blur this very click causes. */
function bdUnit(key, u) {
  if (u === unitFor(prof().units, key)) return;
  const draft = bwFormDraft();
  setUnitFor(key, u);
  renderBW();
  bwRestoreDraft(draft);
}
function bdActivity() { profSet({ act: q('#bd-act').value }); renderBW(); }
function bdAge() {
  const v = parseInt(q('#bd-age').value, 10);
  profSet({ age: isNaN(v) || v <= 0 ? null : v });
  renderBW();
}
function bdGoalSave() {
  const v = parseFloat(q('#bd-goal').value);
  if (isNaN(v) || v <= 0) { toast('Enter a goal weight'); return; }
  profSet({ goal: v }); renderBW(); toast(`Goal set to ${v} lbs`);
}
function bdGoalClear() { profSet({ goal: null }); renderBW(); toast('Back to the recommended goal'); }

/* ═══════════════════ CELEBRATION ═══════════════════ */
/* Rank-ups and milestone unlocks get a card, not a toast — the reward
   moment is the whole point of the progress tab. Returns false when
   there was nothing worth interrupting for (caller falls back to a toast). */
function showCelebration(res) {
  const html = celebrationHTML(res);
  if (!html) return false;
  q('#lv-body').innerHTML = html;
  q('#lv-ol').classList.add('on');
  return true;
}
function closeCelebration() { q('#lv-ol').classList.remove('on'); }

function progDelete(d, di) {
  delSession(d, di);
  renderScore(); renderProg();
  toast('Session removed');
}
/* The rep assumption feeds the 1RM estimate, so it moves every score —
   and with them the Program tab's colours. */
function rkSetReps(r) { setReps(r); renderScore(); renderProg(); }

/* Grip lives on the Rank tab but moves nothing but its own card, so only
   that tab repaints. Typed in whichever unit the label shows; grip.js
   stores kilograms. */
/* A field the unit toggle filled in carries its exact kilograms alongside
   the rounded figure it shows, so flipping lb → kg → lb gives back the 100
   you typed rather than 100.1. Typing over it drops the exact value. */
const grKg = (el, u) => {
  const v = parseFloat(el?.value);
  if (isNaN(v) || v <= 0) return null;
  return el.dataset.kg && el.value === el.dataset.shown ? +el.dataset.kg : fromGU(v, u);
};
function grSave() {
  const u = gripUnit();
  const rd = id => grKg(q(id), u);
  const d = q('#gr-date').value || todayStr();
  if (!logGrip(d > todayStr() ? todayStr() : d, rd('#gr-r'), rd('#gr-l'))) {
    toast(`Enter a reading for either hand, in ${u}`); return;
  }
  renderRank(root);
  toast('Grip logged');
}
function grDelete(d) { delGrip(d); renderRank(root); toast('Reading removed'); }
/* Carries anything already typed across the repaint, converted, so a
   reading entered before noticing the unit is not lost or misread. */
function grUnit(u) {
  const was = gripUnit(), d = q('#gr-date')?.value;
  const typed = ['#gr-r', '#gr-l'].map(id => grKg(q(id), was));
  setGripUnit(u);
  renderRank(root);
  if (d && q('#gr-date')) q('#gr-date').value = d;
  ['#gr-r', '#gr-l'].forEach((id, i) => {
    const el = q(id);
    if (typed[i] === null || !el) return;
    el.value = el.dataset.shown = String(+toGU(typed[i], u).toFixed(1));
    el.dataset.kg = typed[i];
  });
}

/* ═══════════════════ TABS ═══════════════════ */
function switchTab(tab) {
  activeTab = tab;
  root.querySelectorAll('.wk .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  root.querySelectorAll('.wk .panel').forEach(pl => pl.classList.remove('active'));
  q('#p-' + tab).classList.add('active');
  /* Program and Body render on mount and stay rendered; the three score
     panels repaint on arrival so a tab you were not looking at cannot
     show yesterday's numbers. */
  if (tab !== 'program' && tab !== 'bw') TABS.find(t => t.k === tab)?.r();
}

/* ═══════════════════ EVENT DELEGATION ═══════════════════ */
function onClick(e) {
  if (e.target.classList && e.target.classList.contains('mm-overlay')) { closeMM(); return; }
  if (e.target.classList && e.target.classList.contains('lv-overlay')) { closeCelebration(); return; }
  /* Tapping a shape names it. On a touch screen this is the only way to ask
     "which one is that", since there is no hover to lean on. */
  const reg = e.target.closest && e.target.closest('.m-region');
  if (reg && root.contains(reg)) { mmReadout(regionName(reg)); return; }
  const el = e.target.closest('[data-act]');
  if (!el || !root.contains(el)) return;
  const a = el.dataset;
  switch (a.act) {
    case 'tab':       switchTab(a.tab); break;
    case 'row':
      mmSlot = [+a.di, +a.si, +a.ei];
      openMM(resEx(PROGRAM[+a.di].sections[+a.si].ex[+a.ei])); break;
    case 'mm-lvl-up': mmLvlUp(); break;
    case 'mm-vid':    playVideo(); break;
    case 'chk':       toggleChk(a.k); break;
    case 'clear':     clearChk(); break;
    case 'mm-close':  closeMM(); break;
    case 'mm-chip': inspectMuscle(el); break;
    case 'mm-view': mmView(a.view); break;
    case 'mm-rebase': doRebase(); break;
    case 'mm-sets-clear': clearMMSets(); break;
    case 'mm-bump':   takeBump(a.to); break;
    case 'bw-range':  bwSetRange(a.k); break;
    case 'bw-metric': bwSetMetric(a.k); break;
    case 'bw-save':   bwSave(); break;
    case 'bw-edit':   bwEdit(a.d); break;
    case 'bw-del':    bwDelete(a.d); break;
    case 'bw-cancel': bwCancelEdit(); break;
    case 'bd-unit':       bdUnit(a.k, a.u); break;
    case 'bd-goal-save':  bdGoalSave(); break;
    case 'bd-goal-clear': bdGoalClear(); break;
    case 'lv-close':  closeCelebration(); break;
    case 'pg-del':    progDelete(a.d, a.di); break;
    case 'rk-reps':   rkSetReps(+a.r); break;
    case 'gr-save':   grSave(); break;
    case 'gr-del':    grDelete(a.d); break;
    case 'gr-unit':   grUnit(a.u); break;
    case 'bw-more':   bwToggleMore(); break;
  }
}
function onChange(e) {
  if (e.target.id === 'mm-wt') setMMWeight(e.target);
  else if (e.target.classList?.contains('mm-set-in')) setMMReps();
  /* Height and activity save on change rather than behind a button: they are
     set once and then never touched, and a Save you have to remember is a
     worse trade than a re-render you didn't ask for. */
  else if (['bd-ft','bd-in','bd-cm'].includes(e.target.id)) bdHeight();
  else if (e.target.id === 'bd-act') bdActivity();
  else if (e.target.id === 'bd-age') bdAge();
}

/* Hover, for anyone on a mouse: over a shape names it, over a chip lights
   the shapes it belongs to. Touch gets the same answers through onClick. */
function onOver(e) {
  const chip = e.target.closest?.('.mm-muscle-chip');
  if (chip) return;
  const reg = e.target.closest?.('.m-region');
  if (reg) mmReadout(regionName(reg));
}
function onOut(e) {
  // Selected muscle focus persists until another selection or view change.
}

/* Settings changed an equipment flag or the theme. Re-render everything:
   the program swaps exercises, and the bodyweight chart bakes theme colours
   into its SVG at render time so it has to be redrawn too. */
function onExternalChange() {
  if (!root) return;
  renderProg(); renderBW();
  if (activeTab !== 'program' && activeTab !== 'bw') renderScore();
}
function onKeydown(e) {
  if (q('#mm-ol').classList.contains('on')) {
    if (e.key === 'Escape') { e.preventDefault(); closeMM(); return; }
    if (e.key === 'Tab') {
      const items=[...q('.mm-card').querySelectorAll('button,input')].filter(el=>!el.disabled && el.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey && document.activeElement===first) { e.preventDefault();last.focus(); }
      else if(!e.shiftKey && document.activeElement===last) { e.preventDefault();first.focus(); }
    }
  }
  if (e.key !== 'Enter') return;
  if (e.target.id === 'bw-weight' || TAPE_KEYS.some(k => e.target.id === 'bw-' + k)) bwSave();
  else if (e.target.id === 'bd-goal') bdGoalSave();
  else if (e.target.id === 'gr-r' || e.target.id === 'gr-l') grSave();
  else if (e.target.id === 'mm-wt' || e.target.classList?.contains('mm-set-in')) e.target.blur();
}

/* ═══════════════════ STATIC MARKUP ═══════════════════ */

function template() {
  return `<div class="wk">
    <nav class="nav"><div class="nav-inner">
      ${TABS.map((t, i) => `<button class="tab${i ? '' : ' active'}" data-act="tab" data-tab="${t.k}">
        <span class="tab-ico">${icon(t.i)}</span><span class="tab-lbl">${t.n}</span>
      </button>`).join('')}
    </div></nav>
    <div class="app-wrap">
      ${TABS.map((t, i) => `<div class="panel${i ? '' : ' active'}" id="p-${t.k}"></div>`).join('')}
    </div>

    <div class="mm-overlay" id="mm-ol">
      <div class="mm-card" role="dialog" aria-modal="true" aria-labelledby="mm-name">
        <div class="mm-head"><div><div class="mm-kicker">Exercise lab</div><div class="mm-title" id="mm-name"></div></div><button class="mm-close" data-act="mm-close" aria-label="Close exercise viewer">&times;</button></div>
        <div class="mm-info" id="mm-info"></div>
        <div id="mm-lvl"></div>
        <div class="mm-wt-row">
          <label class="mm-wt-lbl" for="mm-wt">Working weight</label>
          <div class="mm-wt-box"><input class="mm-wt-in" id="mm-wt" type="number" step="2.5" min="0" inputmode="decimal" placeholder="—"><span class="mm-wt-u">lbs</span></div>
        </div>
        <div id="mm-reps"></div>
        <div id="mm-rank"></div>
        <section class="mm-howto" id="mm-howto"></section>
        <section class="mm-anatomy">
        <div class="mm-map-toolbar"><span>Muscle map</span><div class="mm-views" aria-label="Body view">
          <button data-act="mm-view" data-view="both" aria-pressed="true">Both</button>
          <button data-act="mm-view" data-view="front" aria-pressed="false">Front</button>
          <button data-act="mm-view" data-view="back" aria-pressed="false">Back</button>
        </div></div>
        <div class="mm-map" data-view="both">${MUSCLE_SVG}</div>
        <div class="mm-legend"><span><i class="primary"></i>Primary</span><span><i class="secondary"></i>Supporting</span><span><i class="tertiary"></i>Stabilizing</span></div>
        </section>
        <div class="m-readout" id="mm-readout" aria-live="polite"></div>
        <div class="mm-muscles"><div class="mm-muscles-title">Target Muscles</div><div class="mm-muscle-list" id="mm-mlist"></div></div>
      </div>
    </div>

    <div class="lv-overlay" id="lv-ol"><div id="lv-body"></div></div>
  </div>`;
}

/* ═══════════════════ SKILL LEVELS (for Settings) ═══════════════════ */
/* Declared on the module the way resetTargets is: the shell owns the
   controls, the app owns the ladders. Only lines the program currently
   runs are listed, so turning the bar off takes its ladder with it. */
function skillLines() {
  const live = new Set();
  PROGRAM.forEach(d => d.sections.forEach(s => s.ex.forEach(raw => {
    const e = resKit(raw);
    if (e.line && LADDERS[e.line]) live.add(e.line);
  })));
  return Object.keys(LADDERS).filter(k => live.has(k)).map(k => ({
    id: k, n: LADDERS[k].n, at: lvlOf(k), ready: lineReady(k),
    steps: LADDERS[k].steps.map(s => ({ n: s.n, tier: s.tier, up: s.up || null })),
  }));
}
const setSkill = (id, i) => setLvl(id, i);

/* ═══════════════════ WHOSE PROGRAM (for Settings) ═══════════════════ */
/* Same split again: Settings paints the choice, the app knows the people
   and what picking one means — here, a reload, because PROGRAM is read once
   at import (see data.js). Equipment only shows while the program has a
   `req` for it to swap. */
const people = () => PEOPLE.map(p => ({ ...p, on: p.id === USER }));
function setPerson(id) {
  if (id === USER || !PEOPLE.some(p => p.id === id)) return false;
  save(USER_KEY, id);
  return true;
}
const usesKit = () => PROGRAM.some(d => d.sections.some(s => s.ex.some(e => e.req)));

/* ═══════════════════ LIFECYCLE ═══════════════════ */
export default {
  id: 'workout',
  name: 'Workout',
  storagePrefix: 'bp_',
  /* What Settings' Danger Zone is allowed to clear on this app's behalf.
     Declared here the same way `storagePrefix` is — the shell owns the
     dangerous UI and the confirmation, the app owns the knowledge of what
     each record is and how much is in it. */
  resetTargets, applyReset,
  skillLines, setSkill,
  people, setPerson, usesKit,
  styles: 'apps/workout/workout.css?v=avg-sep24',
  /* A dumbbell read left to right: outer collar, plate, bar, plate, collar. */
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="9.5" width="3" height="5" rx="1.2"/><rect x="4.5" y="6.5" width="3.5" height="11" rx="1.4"/><path d="M8 12h8"/><rect x="16" y="6.5" width="3.5" height="11" rx="1.4"/><rect x="19.5" y="9.5" width="3" height="5" rx="1.2"/></svg>',
  mount(el) {
    root = el;
    /* activeTab deliberately survives a remount — coming back to an app
       should return you to the tab you left, not to its front page. */
    bwRange = '30'; bwMetric = 'w'; bwMore = false; bwEditDate = null; mmEx = null; mmSlot = null;
    root.innerHTML = template();
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    window.addEventListener('bs:datachange', onExternalChange);
    renderProg(); renderBW();
    switchTab(activeTab);
  },
  unmount() {
    if (root) {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
    }
    window.removeEventListener('bs:datachange', onExternalChange);
    root = null;
  },
};
