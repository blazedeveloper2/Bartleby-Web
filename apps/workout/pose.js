/* ═══════════════════════════════════════════════════════════
   WORKOUT — THE ANIMATED REP IN THE EXERCISE LAB

   The lab's side of the exercise animations. Each exercise in moves.js is
   a loop of poses with a tempo; timeline.js turns that into a pose for
   any moment, rig.js into a body in 3D, and stage.js draws it with
   three.js. This file builds the figure the lab shows — the 3D view, the
   tempo bar under it, the pause button — starts and stops it, and opens
   the full-screen viewer behind its expand button.

   stage.js (and three.js with it) is imported the first time a lab
   opens, so nothing 3D loads until someone looks at an exercise. With
   reduced motion on, the view holds the frame named `still` and can
   still be turned by hand.

   checkMotion() and motionNotes() are for tools/howto/check.mjs: they
   build every frame of a rep without drawing anything.
   ═══════════════════════════════════════════════════════════ */

import { MOTION } from './moves.js?v=3d-oct16g';
import { timeline } from './timeline.js?v=3d-oct14d';
import { skeleton, holds, points, normalize, W, v3 } from './rig.js?v=3d-oct14h';
export { MOTION };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const SHRINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
const PREV = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 5.8v12.4a.8.8 0 0 1-1.2.7L9 12.7a.8.8 0 0 1 0-1.4l8.8-6.2a.8.8 0 0 1 1.2.7z"/></svg>';
const NEXT = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M5 5.8v12.4a.8.8 0 0 0 1.2.7l8.8-6.2a.8.8 0 0 0 0-1.4L6.2 5.1A.8.8 0 0 0 5 5.8z"/></svg>';
const MUSCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c-1.5-3-1.6-6.4.4-9.2C9.2 8.4 9 6 8 4"/><path d="M8 4c2.4.4 4 1.7 4.6 3.8"/><path d="M7.4 10.8c2.8-1.4 6.6-1.3 9.4.6 2.2 1.5 2.6 4.3 1 6.3-1.4 1.8-4 2.6-6.6 2.3H7"/></svg>';
const SPIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>';

const segsHTML = (m, tag = 'span') => m.tempo.map(([, s, label], i) =>
  `<${tag}${tag === 'button' ? ` type="button" data-seg="${i}" aria-label="Jump to ${esc(label)}"` : ''} class="rp-seg" style="flex:${Math.max(s, 1.1)}"><i></i><b>${esc(label)}</b><em>${s}s</em></${tag}>`).join('');

/* Fills a row of tempo segments up to step i, fraction k of the way. */
const fillBar = segs => (i, k) => segs.forEach((el, j) => {
  el.classList.toggle('on', j === i);
  el.firstChild.style.width = `${j < i ? 100 : j === i ? k * 100 : 0}%`;
});

export function animHTML(name) {
  const m = MOTION[name];
  if (!m) return '';
  return `<figure class="mm-anim">
    <div class="rp-stage" role="img" aria-label="${esc(m.label || `${name}, one rep in 3D`)}"></div>
    <span class="rp-hint" aria-hidden="true">Drag to turn · pinch to zoom</span>
    <button type="button" class="rp-fs" aria-label="Open the full-screen viewer" title="Full screen">${EXPAND}</button>
    <button type="button" class="rp-pp" aria-label="Pause animation" aria-pressed="false"></button>
    <figcaption class="rp-bar">${segsHTML(m)}</figcaption>
  </figure>`;
}

/* Starts the rep in a figure animHTML() built; returns the stop. */
export function playAnim(fig, name) {
  const m = MOTION[name];
  if (!fig || !m) return () => {};
  const pp = fig.querySelector('.rp-pp');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = fillBar([...fig.querySelectorAll('.rp-seg')]);
  let handle = null, stopped = false, paused = false, viewer = null;
  if (still) { fig.classList.add('still'); pp.hidden = true; }
  const showPaused = () => {
    fig.classList.toggle('paused', paused);
    pp.setAttribute('aria-pressed', String(paused));
    pp.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
  };
  pp.addEventListener('click', () => {
    paused = !paused;
    showPaused();
    handle?.pause(paused);
  });
  bar(0, 0);

  /* The card and the viewer share one WebGL canvas, so the card's rep
     stops while the viewer is open and picks up where the viewer left
     it: the same moment of the rep, the same camera. */
  const start = carry => import('./stage.js?v=3d-oct16g')
    .then(S => S.ready().then(() => S))
    .then(S => {
      if (stopped || viewer) return S;
      const box = fig.querySelector('.rp-stage');
      handle = S.mount(box, name, { still, onStep: bar });
      if (carry) { handle.seek(carry.time); handle.camera = carry.camera; box.classList.add('turned'); }
      if (paused) handle.pause(true);
      return S;
    });
  const ready = start().catch(() => { fig.classList.add('no3d'); });

  const fs = fig.querySelector('.rp-fs');
  fs.addEventListener('click', () => ready.then(S => {
    if (!S || stopped || viewer) return;
    const carry = handle && { time: handle.time, camera: handle.camera };
    handle?.stop(); handle = null;
    viewer = openViewer(S, name, m, carry, still, back => {
      viewer = null;
      if (stopped) return;
      paused = back.paused && !still;
      showPaused();
      start(back);
      fs.focus({ preventScroll: true });
    });
  }));

  return () => { stopped = true; handle?.stop(); viewer?.close(); };
}

/* ── the full-screen viewer ──

   The same rep, as big as the screen allows, with the controls the card
   has no room for: scrub to any moment, step a phase at a time, slow it
   down, swing the camera to a set view, zoom, or let it turn on its own.
   It asks the browser for real full screen where it can; where it can't
   (an iPhone), it still fills the window. Headings are the rig's: 0° looks
   at the near side, 90° at the front. */
const SPEEDS = [0.25, 0.5, 1, 2];
const VIEWS = [['side', 'Side', 0, 8], ['front', 'Front', 90, 8], ['back', 'Back', -90, 8], ['top', 'Top', 0, 88]];
const fmtS = t => `${t.toFixed(1)}s`;
const MUS_KEY = 'bp_rv_muscles';

function openViewer(S, name, m, carry, reduced, onClose) {
  const total = m.tempo.reduce((a, [, s]) => a + s, 0);
  const starts = [];
  m.tempo.reduce((a, [, s]) => (starts.push(a), a + s), 0);
  const canFull = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);

  const el = document.createElement('div');
  el.className = 'rv';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `${name}, 3D viewer`);
  el.innerHTML = `
    <div class="rv-top">
      <div class="rv-title"><span>How to</span><b>${esc(name)}</b></div>
      ${canFull ? `<button type="button" class="rv-ic rv-full" aria-label="Enter full screen" title="Full screen (F)">${EXPAND}</button>` : ''}
      <button type="button" class="rv-ic rv-x" aria-label="Close viewer" title="Close (Esc)">${CLOSE}</button>
    </div>
    <div class="rv-main">
      <div class="rp-stage rv-stage" role="img" aria-label="${esc(m.label || `${name}, one rep in 3D`)}"></div>
      <span class="rv-hint" aria-hidden="true">Drag to turn · scroll or pinch to zoom · double-click to reset</span>
      <div class="rv-views" role="group" aria-label="Camera">
        ${VIEWS.map(([k, l]) => `<button type="button" data-view="${k}">${l}</button>`).join('')}
        <button type="button" data-view="reset">Reset</button>
      </div>
      <div class="rv-zoom" role="group" aria-label="Zoom">
        <button type="button" class="rv-ic" data-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" class="rv-ic" data-zoom="out" aria-label="Zoom out">&minus;</button>
      </div>
    </div>
    <div class="rv-ctl">
      <div class="rp-bar rv-bar">${segsHTML(m, 'button')}</div>
      <input type="range" class="rv-scrub" min="0" max="${total}" step="0.01" value="0" aria-label="Position in the rep">
      <div class="rv-row">
        <div class="rv-play">
          <button type="button" class="rv-ic" data-step="-1" aria-label="Previous phase" title="Previous phase">${PREV}</button>
          <button type="button" class="rv-ic rv-pp" aria-label="Pause" aria-pressed="false" title="Play / pause (Space)"></button>
          <button type="button" class="rv-ic" data-step="1" aria-label="Next phase" title="Next phase">${NEXT}</button>
          <span class="rv-time"><b>0.0s</b> / ${fmtS(total)}</span>
        </div>
        <div class="rv-opts">
          <div class="rv-speed" role="group" aria-label="Speed">
            ${SPEEDS.map(x => `<button type="button" data-speed="${x}" aria-pressed="${x === 1}">${x}×</button>`).join('')}
          </div>
          <button type="button" class="rv-tog rv-mus" aria-pressed="true" title="Show the working muscles in colour">${MUSCLE}<span>Muscles</span></button>
          <button type="button" class="rv-tog rv-spin" aria-pressed="false" title="Turn the camera slowly around">${SPIN}<span>Auto-turn</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('rv-open');

  const $ = s => el.querySelector(s);
  const stage = $('.rv-stage'), scrub = $('.rv-scrub'), timeEl = $('.rv-time b'), pp = $('.rv-pp');
  const bar = fillBar([...el.querySelectorAll('.rv-bar .rp-seg')]);
  let scrubbing = false, wasPaused = false;
  const h = S.mount(stage, name, {
    free: true,
    onStep: bar,
    onFrame: t => { timeEl.textContent = fmtS(t); if (!scrubbing) scrub.value = t; },
  });
  if (carry) { h.seek(carry.time); h.camera = carry.camera; }
  /* the muscle colour stays the way it was last left in the viewer */
  let musOn = true;
  try { musOn = localStorage.getItem(MUS_KEY) !== '0'; } catch {}
  if (!musOn) { h.muscles(false); $('.rv-mus').setAttribute('aria-pressed', 'false'); }
  else if (reduced && m.still) h.seek(starts[m.tempo.findIndex(([n]) => n === m.still)] || 0);

  const setPaused = on => {
    h.pause(on);
    el.classList.toggle('paused', on);
    pp.setAttribute('aria-pressed', String(on));
    pp.setAttribute('aria-label', on ? 'Play' : 'Pause');
  };
  setPaused(reduced);
  const phaseOf = t => { let i = 0; while (i + 1 < starts.length && starts[i + 1] <= t + 1e-6) i++; return i; };
  const stepPhase = d => {
    const t = h.time, i = phaseOf(t);
    /* back from partway through a phase goes to its start first, like a track skip */
    const j = d < 0 && t - starts[i] > 0.25 ? i : (i + d + starts.length) % starts.length;
    h.seek(starts[j] + 1e-3);   // just inside, so the bar lights that phase
  };
  const nudge = d => { setPaused(true); h.seek(Math.max(0, Math.min(total - 0.001, h.time + d))); };

  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b === pp) setPaused(!h.paused);
    else if (b.dataset.step) stepPhase(+b.dataset.step);
    else if (b.dataset.seg) h.seek(starts[+b.dataset.seg] + 1e-3);
    else if (b.dataset.speed) {
      h.speed(+b.dataset.speed);
      el.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    } else if (b.dataset.zoom) h.zoom(b.dataset.zoom === 'in' ? 1 / 1.2 : 1.2);
    else if (b.dataset.view === 'reset') h.reset();
    else if (b.dataset.view) { const [, , az, elv] = VIEWS.find(([k]) => k === b.dataset.view); h.view(az, elv); }
    else if (b.classList.contains('rv-tog')) {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('rv-spin')) h.spin(on);
      else { h.muscles(on); try { localStorage.setItem(MUS_KEY, on ? '1' : '0'); } catch {} }
    } else if (b.classList.contains('rv-full')) toggleFull();
    else if (b.classList.contains('rv-x')) close();
  });
  scrub.addEventListener('input', () => {
    if (!scrubbing) { scrubbing = true; wasPaused = h.paused; h.pause(true); }
    h.seek(+scrub.value);
  });
  scrub.addEventListener('change', () => { scrubbing = false; h.pause(wasPaused); });

  /* Full screen: asked for on open, and the button follows the browser,
     since Esc (or a swipe) can leave it without asking us. */
  const isFull = () => document.fullscreenElement === el;
  const syncFull = () => {
    const b = $('.rv-full');
    el.classList.toggle('is-full', isFull());
    if (!b) return;
    b.innerHTML = isFull() ? SHRINK : EXPAND;
    b.setAttribute('aria-label', isFull() ? 'Exit full screen' : 'Enter full screen');
  };
  function toggleFull() {
    if (!canFull) return;
    (isFull() ? document.exitFullscreen() : el.requestFullscreen({ navigationUI: 'hide' })).catch(() => {});
  }
  document.addEventListener('fullscreenchange', syncFull);
  toggleFull();

  /* Keys go to the viewer, not the card underneath it. */
  const keys = e => {
    const t = e.target, onScrub = t === scrub, onButton = t?.tagName === 'BUTTON';
    if (e.key === 'Escape') close();
    else if (e.key === ' ' && !onButton) setPaused(!h.paused);
    else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFull();
    else if (e.key === 'ArrowLeft' && !onScrub) nudge(-1 / 30);
    else if (e.key === 'ArrowRight' && !onScrub) nudge(1 / 30);
    else if (e.key === 'Tab') {
      const items = [...el.querySelectorAll('button,input')].filter(x => x.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) last.focus();
      else if (!e.shiftKey && document.activeElement === last) first.focus();
      else return void e.stopPropagation();
    } else return void e.stopPropagation();
    e.preventDefault(); e.stopPropagation();
  };
  window.addEventListener('keydown', keys, true);
  pp.focus({ preventScroll: true });

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    const state = { time: h.time, camera: h.camera, paused: h.paused };
    window.removeEventListener('keydown', keys, true);
    document.removeEventListener('fullscreenchange', syncFull);
    if (isFull()) document.exitFullscreen().catch(() => {});
    h.stop();
    el.remove();
    document.documentElement.classList.remove('rv-open');
    onClose(state);
  }
  return { close };
}

/* ── checks for tools/howto/check.mjs ── */

const TL = new Map();
const tlOf = m => (TL.has(m) ? TL.get(m) : TL.set(m, timeline(m, normalize)).get(m));

/* Builds every frame once. A pose the tempo names but nobody wrote, or a
   frame with NaN in it, is caught here rather than in the lab. Returns
   an error string, or '' when sound. */
export function checkMotion(m) {
  if (!Array.isArray(m.tempo) || !m.tempo.length) return 'has no tempo';
  for (const [n] of m.tempo) if (!m.poses[n]) return `tempo names a pose that does not exist: "${n}"`;
  if (m.still && !m.poses[m.still]) return `still frame "${m.still}" is not a pose`;
  if (m.peak && !m.poses[m.peak]) return `peak "${m.peak}" is not a pose`;
  try {
    const tl = tlOf(m);
    for (let i = 0; i <= 48; i++) {
      const J = skeleton(tl.at((i / 48) * tl.total));
      if (points(J, holds(J, m)).some(q => q.some(Number.isNaN))) return 'builds a frame with NaN in it';
    }
  } catch (e) { return `throws: ${e.message}`; }
  return '';
}

/* What a careful eye would notice, frame by frame: a joint below the
   floor, a planted hand or foot that misses its mark, or a body part
   that jumps between frames. Returns short notes, worst first. */
export function motionNotes(m) {
  const tl = tlOf(m), notes = [];
  let prev = null;
  /* 120 frames a second: fine enough that a fast move shows as a small
     step and only a real discontinuity as a big one. */
  for (let f = 0; f <= tl.total * 120; f++) {
    const t = f / 120, p = tl.at(t), J = skeleton(p);
    const { i, u } = tl.step(t);
    const when = `${m.tempo[i][2]} ${Math.round(u * 100)}%`;
    const pts = points(J, []);
    const low = Math.min(...pts.map(q => q[1]));
    if (low < -2.5) notes.push([-low, `${when}: a joint ${(-low).toFixed(1)} below the floor`]);
    for (const [key, s, joint] of [['hand', J.n, 'wri'], ['fhand', J.f, 'wri'], ['foot', J.n, 'ank'], ['ffoot', J.f, 'ank']]) {
      if (!Array.isArray(p[key]) || (p[key + 'W'] ?? 1) < 0.99) continue;
      const goal = W(p[key], s.side * (key.includes('hand') ? Math.abs(s.sho[2] - J.H[2]) : 8.5));
      const miss = v3.len(v3.sub(goal, s[joint]));
      if (miss > 3) notes.push([miss, `${when}: ${key} misses its mark by ${miss.toFixed(1)}`]);
    }
    if (prev) {
      const jump = Math.max(...pts.map((q, k) => v3.len(v3.sub(q, prev[k]))));
      if (jump > 4.5) notes.push([jump * 3, `${when}: something jumps ${jump.toFixed(1)} between frames`]);
    }
    prev = pts;
  }
  notes.sort((a, b) => b[0] - a[0]);
  const seen = new Set();
  return notes.filter(([, s]) => { const k = s.replace(/\d+%|[\d.]+/g, ''); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 3).map(([, s]) => s);
}
