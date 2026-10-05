/* ═══════════════════════════════════════════════════════════
   WORKOUT — REST TIMER

   Starts when you log a set (index.js), runs for that exercise's rest
   (rest.js), and sits along the bottom of the screen over everything —
   the program, the exercise lab, any tab — so it is there whether or not
   you closed the exercise to walk back to the bench.

   It counts down to a fixed end time rather than counting ticks, so a
   phone that locks or a tab that sleeps comes back to the right number,
   and the end time is kept in storage so a reload or a trip to another
   app picks the same rest back up. When it runs out it buzzes (where the
   phone allows it), beeps, and says which set is next.

   wk_rest is device state, not training data: it is not a bp_ key, so
   backups, resets and whose-program switches leave it alone.
   ═══════════════════════════════════════════════════════════ */

import { load, save, remove } from './store.js?v=check-oct5';

const KEY = 'wk_rest';
const DONE_FOR = 12000;          // how long "rest over" stays up before it tidies itself away

let el = null, tick = null, audio = null, rang = false;

const fmt = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function mount(node) {
  el = node;
  /* Audio can only start inside a tap on iOS, so the first tap anywhere in
     the app warms it up for the beep that comes later with no tap at all. */
  document.addEventListener('pointerdown', unlock, { passive: true });
  const st = load(KEY, null);
  if (st && Date.now() < st.end + DONE_FOR) { rang = Date.now() >= st.end; run(); }
  else if (st) remove(KEY);
}

export function unmount() {
  clearInterval(tick); tick = null;
  document.removeEventListener('pointerdown', unlock);
  document.body.classList.remove('wk-resting');
  el = null;
}

/* { s: seconds, ex: the line under the clock, next: 'Set 2 of 3' or the
     next exercise, why: band name, go: the exercise Go opens,
     slot: [di, si, ei] — where that exercise is } */
export function start({ s, ex, next, why, slot, go }) {
  save(KEY, { end: Date.now() + s * 1000, dur: s, ex, next, why, slot, go });
  rang = false;
  unlock();
  run();
}

export function adjust(d) {
  const st = load(KEY, null);
  if (!st) return;
  const left = st.end - Date.now();
  if (left <= 0 && d < 0) return;
  /* Adding to a finished rest starts a fresh one of that length. */
  st.end = (left > 0 ? st.end : Date.now()) + d * 1000;
  st.dur = Math.max(st.dur + d, 1);
  if (st.end <= Date.now()) st.end = Date.now();
  save(KEY, st);
  rang = st.end <= Date.now();
  paint();
}

/* The rest in hand, for Go: which exercise to open. */
export const current = () => load(KEY, null);

export function stop() {
  remove(KEY);
  clearInterval(tick); tick = null;
  if (el) { el.hidden = true; el.innerHTML = ''; }
  document.body.classList.remove('wk-resting');
}

function run() {
  clearInterval(tick);
  paint();
  tick = setInterval(paint, 250);
}

function paint() {
  const st = load(KEY, null);
  if (!el || !st) { stop(); return; }
  const left = st.end - Date.now();
  if (left <= -DONE_FOR) { stop(); return; }
  const done = left <= 0;
  if (done && !rang) { rang = true; ring(); }
  const p = done ? 1 : 1 - left / (st.dur * 1000);

  /* Rebuilt only when the state changes; every other tick moves the
     numbers, so a button is never replaced under a finger. */
  const state = done ? 'done' : 'run';
  if (el.dataset.state !== state || el.hidden) {
    el.dataset.state = state;
    el.hidden = false;
    document.body.classList.add('wk-resting');
    el.innerHTML = `<div class="rest-fill"></div>
      <div class="rest-main">
        <span class="rest-k">${done ? 'Rest over' : 'Rest'}</span>
        <span class="rest-t"></span>
      </div>
      <div class="rest-sub"><b></b><span></span></div>
      <div class="rest-btns">${done
        ? `<button type="button" data-act="rest-adj" data-d="30">+30s</button><button type="button" class="go" data-act="rest-go" title="${goTo(st) ? `Open ${goTo(st)} in the exercise lab` : 'Close'}">${goTo(st) ? 'Go' : 'Done'}</button>`
        : `<button type="button" data-act="rest-adj" data-d="-15" aria-label="15 seconds less">−15</button><button type="button" data-act="rest-adj" data-d="15" aria-label="15 seconds more">+15</button><button type="button" data-act="rest-skip">Skip</button>`}</div>`;
  }
  el.classList.toggle('done', done);
  el.querySelector('.rest-fill').style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  el.querySelector('.rest-t').textContent = done ? '0:00' : fmt(left);
  el.querySelector(".rest-sub b").textContent = done && goTo(st) ? `${st.next} — go` : st.next;
  el.querySelector('.rest-sub span').textContent = `${st.ex} · ${st.why || 'rest'} ${fmt(st.dur * 1000)}`;
}

/* What Go opens. A rest saved before `go` existed has no slot key at all
   and means its own exercise; a null slot is the end of the day. */
const goTo = st => st.go || (st.slot === undefined ? st.ex : null);

function unlock() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { audio = null; }
}

/* Three short rising beeps, and a buzz on phones that allow one. */
function ring() {
  try { navigator.vibrate?.([250, 120, 250, 120, 400]); } catch {}
  if (!audio) return;
  try {
    const t0 = audio.currentTime + 0.02;
    [880, 988, 1319].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = t0 + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.2);
    });
  } catch {}
}
