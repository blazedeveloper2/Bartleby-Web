/* ═══════════════════════════════════════════════════════════
   WORKOUT — HOW LONG A SESSION TAKES

   Timed from the things you already do, so there is no clock to remember
   to start: logging a set, ticking a set, or checking an exercise off is
   a moment in that day's session. The first one starts it — from when you
   opened that exercise, if that was in the last 15 minutes, since that is
   when the first set actually began — and finishing the day closes it.

     bp_time { 'YYYY-MM-DD.di': { s, ev:[[t, exercise, 's'|'c'], …], done?, part? } }

   `s` is the start, `ev` every set ('s') and check-off ('c') with its
   time, `done` when the last exercise was checked.

   A long gap is a break, not training: each gap between two moments
   counts at most GAP_CAP (45 minutes — the longest single block in any
   program here is a 30–45 minute Zone 2), so a set logged at lunch and the rest of the
   day after work reads as two sessions' worth of effort rather than six
   hours. A rest timer that runs out is still under the cap.

   `part` marks a day that already had work on it when timing first saw
   it — sets or checks from before this existed, or from before an
   import. Its real start is unknown, so it is shown but kept out of every
   average rather than dragging them down.
   ═══════════════════════════════════════════════════════════ */

import { PROGRAM } from './data.js?v=last-oct5';
import { load, save, todayStr, dateStr } from './store.js?v=last-oct5';

const KEY = 'bp_time';
const GAP_CAP = 45 * 60000;
const OPEN_LEAD = 15 * 60000;

const stored = () => load(KEY, {});
const kOf = (d, di) => `${d}.${di}`;

/* One moment in today's session for program day `di`. `prior` is how much
   work the day already had BEFORE this moment, read by the caller before
   it saved anything; `opened` is when the exercise lab was opened. */
export function mark(di, name, type, prior, opened) {
  if (!Number.isInteger(di) || !PROGRAM[di]) return;
  const m = stored(), k = kOf(todayStr(), di), now = Date.now();
  let r = m[k];
  if (!r) {
    const s = opened && now - opened < OPEN_LEAD ? opened : now;
    r = m[k] = { s, ev: [] };
    if (prior > 0) r.part = 1;
  }
  r.ev.push([now, name, type]);
  save(KEY, m);
}

/* Finishing the day stamps it; un-checking it reopens it. */
export function finish(di) {
  const m = stored(), r = m[kOf(todayStr(), di)];
  if (!r || r.done) return;
  r.done = Date.now();
  save(KEY, m);
}
export function reopen(di) {
  const m = stored(), r = m[kOf(todayStr(), di)];
  if (!r || !r.done) return;
  delete r.done;
  save(KEY, m);
}

/* Active time: the gaps between moments, each capped. An open session
   also counts the time since its last moment, under the same cap. */
function activeMs(r, live) {
  let t = 0, prev = r.s;
  for (const [ts] of r.ev) { t += Math.min(Math.max(ts - prev, 0), GAP_CAP); prev = ts; }
  if (live) t += Math.min(Math.max(Date.now() - prev, 0), GAP_CAP);
  return t;
}

/* Where the minutes went: the gap before each moment belongs to that
   moment's exercise — the rest before a set, and the walk over and
   setup before the first one. */
function perExercise(r) {
  const out = new Map();
  let prev = r.s;
  for (const [ts, n] of r.ev) {
    out.set(n, (out.get(n) || 0) + Math.min(Math.max(ts - prev, 0), GAP_CAP));
    prev = ts;
  }
  return out;
}

export function sessions() {
  const m = stored(), today = todayStr();
  return Object.entries(m).map(([k, r]) => {
    const i = k.lastIndexOf('.'), d = k.slice(0, i), di = +k.slice(i + 1);
    const live = d === today && !r.done;
    return { d, di, live, done: !!r.done, part: !!r.part, start: r.s,
             ms: activeMs(r, live), sets: r.ev.filter(e => e[2] === 's').length,
             ex: perExercise(r) };
  }).filter(s => PROGRAM[s.di]).sort((a, b) => a.start - b.start);
}

export function today(di) {
  const r = stored()[kOf(todayStr(), di)];
  if (!r) return null;
  const live = !r.done;
  return { live, part: !!r.part, ms: activeMs(r, live) };
}

/* Only finished, whole sessions count towards an average. */
const counted = l => l.filter(s => s.done && !s.part && s.ms > 0);

export function avgFor(di) {
  const l = counted(sessions()).filter(s => s.di === di);
  return l.length ? l.reduce((a, s) => a + s.ms, 0) / l.length : null;
}

/* ── formatting ── */
export function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
export function fmtClock(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
  const mm = String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, '0'), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
const fmtD = ds => new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ═══════════════════ THE TIME TAB ═══════════════════ */
export function renderTime(root) {
  const p = root.querySelector('#p-time');
  if (!p) return;
  const all = sessions(), done = counted(all);
  const live = all.filter(s => s.live);

  let h = live.map(liveHTML).join('');

  if (!all.length) {
    p.innerHTML = h + `<div class="pg-card tm-empty">
      <div class="pg-card-head"><div class="pg-card-title">No sessions timed yet</div></div>
      <p>Timing starts on its own with the first set you log or exercise you check off, and stops when the day is finished. Nothing to press.</p>
    </div>`;
    return;
  }

  /* headline tiles */
  const avg = done.length ? done.reduce((a, s) => a + s.ms, 0) / done.length : null;
  const wk = weekStart(new Date());
  const thisWeek = all.filter(s => s.d >= wk);
  const wkMs = thisWeek.reduce((a, s) => a + s.ms, 0);
  const longest = done.reduce((b, s) => (!b || s.ms > b.ms ? s : b), null);
  const setsDone = done.reduce((a, s) => a + s.sets, 0), msDone = done.reduce((a, s) => a + s.ms, 0);
  const perSet = setsDone ? msDone / setsDone : null;
  h += `<div class="bw-stats pg-tiles">
    ${tile('Avg session', avg ? fmtDur(avg) : '—', done.length ? `${done.length} timed` : 'none finished yet')}
    ${tile('This week', fmtDur(wkMs), `${thisWeek.length} session${thisWeek.length === 1 ? '' : 's'}`)}
    ${tile('Longest', longest ? fmtDur(longest.ms) : '—', longest ? `${PROGRAM[longest.di].day} · ${fmtD(longest.d)}` : '')}
    ${tile('Per set', perSet ? fmtClock(perSet) : '—', perSet ? 'set + its rest' : '')}
  </div>`;

  h += byDayHTML(all);
  h += weeksHTML(all);
  h += recentHTML(all);
  h += `<p class="tm-foot">Timed from your first logged set or check-off to the last one, starting when you opened that first exercise. Breaks over ${GAP_CAP / 60000} minutes count as ${GAP_CAP / 60000}. Sessions marked partial began before timing could see them and stay out of the averages.</p>`;
  p.innerHTML = h;
}

function tile(label, v, sub) {
  return `<div class="bw-stat">
    <div class="bw-stat-v">${v}</div>
    <div class="bw-stat-l">${label}</div>
    <div class="bw-stat-d ${sub ? 'up' : 'flat'}">${sub || '·'}</div>
  </div>`;
}

function liveHTML(s) {
  const day = PROGRAM[s.di];
  return `<div class="pg-card tm-live">
    <div class="tm-live-l">
      <span class="pg-kicker">In progress${s.part ? ' · partial' : ''}</span>
      <div class="tm-live-n"><span class="day-badge ${day.day}">${day.day}</span>${esc(day.label)}</div>
      <div class="tm-live-s">${s.sets} set${s.sets === 1 ? '' : 's'} logged${avgFor(s.di) ? ` · usually ${fmtDur(avgFor(s.di))}` : ''}</div>
    </div>
    <div class="tm-live-t" data-clock="${s.di}">${fmtClock(s.ms)}</div>
  </div>`;
}

/* Every program day: its average, its last, and on opening, where the
   minutes go exercise by exercise. */
function byDayHTML(all) {
  const rows = PROGRAM.map((day, di) => {
    const l = counted(all).filter(s => s.di === di);
    if (!l.length) return '';
    const avg = l.reduce((a, s) => a + s.ms, 0) / l.length, last = l[l.length - 1];
    const ex = new Map();
    l.forEach(s => s.ex.forEach((ms, n) => ex.set(n, (ex.get(n) || 0) + ms / l.length)));
    const top = [...ex.entries()].sort((a, b) => b[1] - a[1]);
    const max = top.length ? top[0][1] : 1;
    return { di, day, avg, last, n: l.length, top, max };
  }).filter(Boolean);
  if (!rows.length) return `<div class="pg-card"><div class="pg-card-head"><div class="pg-card-title">By Day</div></div>
    <p class="tm-none">Finish a full day and its time shows up here.</p></div>`;
  const most = Math.max(...rows.map(r => r.avg));
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">By Day</div><div class="pg-card-note">average of finished sessions</div></div>
    ${rows.map(r => `<details class="tm-day">
      <summary>
        <span class="day-badge ${r.day.day}">${r.day.day}</span>
        <span class="tm-day-n">${esc(r.day.label)}</span>
        <span class="tm-day-v">${fmtDur(r.avg)}</span>
        <span class="tm-bar"><i style="width:${(r.avg / most * 100).toFixed(1)}%"></i></span>
        <span class="tm-day-s">last ${fmtDur(r.last.ms)} · ${r.n} timed</span>
      </summary>
      <div class="tm-ex">${r.top.map(([n, ms]) => `<div class="tm-ex-row">
        <span class="tm-ex-n">${esc(n)}</span><span class="tm-ex-v">${fmtDur(ms)}</span>
        <span class="tm-bar sm"><i style="width:${(ms / r.max * 100).toFixed(1)}%"></i></span></div>`).join('')}
        <div class="tm-ex-note">Each exercise's time includes the rest and setup before its sets.</div>
      </div>
    </details>`).join('')}
  </div>`;
}

/* Total time per week, Monday to Sunday, for the last eight. */
function weeksHTML(all) {
  const now = new Date(), weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - 7 * i);
    const ws = weekStart(d), we = weekEnd(ws);
    const l = all.filter(s => s.d >= ws && s.d <= we);
    weeks.push({ ws, ms: l.reduce((a, s) => a + s.ms, 0), n: l.length });
  }
  if (!weeks.some(w => w.ms)) return '';
  const max = Math.max(...weeks.map(w => w.ms));
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Weekly Time</div><div class="pg-card-note">last 8 weeks</div></div>
    <div class="tm-weeks">${weeks.map((w, i) => `<div class="tm-wk${i === weeks.length - 1 ? ' now' : ''}" title="${w.n} session${w.n === 1 ? '' : 's'}">
      <span class="tm-wk-v">${w.ms ? fmtDur(w.ms) : ''}</span>
      <span class="tm-wk-b"><i style="height:${max ? (w.ms / max * 100).toFixed(1) : 0}%"></i></span>
      <span class="tm-wk-l">${new Date(w.ws + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</span>
    </div>`).join('')}</div>
  </div>`;
}

function recentHTML(all) {
  const l = [...all].reverse().slice(0, 15);
  return `<div class="pg-card">
    <div class="pg-card-head"><div class="pg-card-title">Recent Sessions</div><div class="pg-card-note">${all.length > 15 ? `last 15 of ${all.length}` : `${all.length} timed`}</div></div>
    <div class="pg-s-list">${l.map(s => {
      const day = PROGRAM[s.di];
      const tag = s.live ? '<span class="tm-tag live">live</span>' : s.part ? '<span class="tm-tag">partial</span>' : !s.done ? '<span class="tm-tag">unfinished</span>' : '';
      const start = new Date(s.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `<div class="pg-s-row">
        <span class="day-badge ${day.day}">${day.day}</span>
        <div class="pg-s-body"><div class="pg-s-n">${esc(day.label)} ${tag}</div><div class="pg-s-d">${fmtD(s.d)} · started ${start} · ${s.sets} sets</div></div>
        <span class="tm-dur"${s.live ? ` data-clock="${s.di}"` : ''}>${s.live ? fmtClock(s.ms) : fmtDur(s.ms)}</span>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateStr(x);
}
function weekEnd(ws) {
  const x = new Date(ws + 'T00:00:00'); x.setDate(x.getDate() + 6);
  return dateStr(x);
}

/* Danger Zone row, in the same shape as RESETS in rank.js. */
export const TIME_RESET = { id:'time', key: KEY, n:'Session times', u:'session',
  d:'How long each session took, for the Time tab. Nothing else reads these.' };
export const timeCount = () => Object.keys(stored()).length;
