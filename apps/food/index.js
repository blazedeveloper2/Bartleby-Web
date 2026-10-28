/* ═══════════════════════════════════════════════════════════
   FOOD APP — a food journal that can also count calories.

   One kind of entry, two ways of reading it. Every entry is a line
   of text ("2 eggs"), and calories are a layer on top: switched off
   in Settings, no number appears anywhere; switched on, the same
   entries show kcal, and the ones nobody counted show an "add" chip
   instead of a zero. Nothing has to be converted between the two.

   Totals only ever describe what was counted. A day where only lunch
   has calories is marked partial and never shown as a low-calorie
   day, and the week's average uses complete days only.

   Where numbers come from, in the order an entry can get one:
     usda  a USDA SR Legacy record (usda.js), matched by exact name
           or picked by hand, with its portion and per-100 g values
     pack  a scanned product (food_codes), from Open Food Facts or
           typed off its label
     own   a number typed in for this entry
   Every entry carries its own copy of the values it was counted with,
   so editing a saved product never rewrites what was already eaten.

   Storage (all food_, so backup and the Settings breakdown include it):
     food_log       entries, see addEntries
     food_codes     scanned products by 13-digit barcode
     food_cal       calories layer on/off (painted by the shell)
     food_offauto   look new barcodes up without asking (ditto)
     food_checks    checklist items, see CHECKLIST
     food_done      checklist ticks by date
   ═══════════════════════════════════════════════════════════ */

import { COMMON } from './data.js?v=food-1';
import { loadUsda, byFdc, portions, defaultPortion, search, shortName } from './usda.js?v=food-1';
import { load, save, remove, dateStr, todayStr } from '../../assets/js/storage.js?v=3d-oct14d';

/* ── tab bar ── same recipe as Finance: one table drives buttons and panels */
const ICO = {
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>',
  bars:  '<path d="M3 20h18"/><path d="M6.5 20V12"/><path d="M12 20V5"/><path d="M17.5 20v-5.5"/>',
  list:  '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  plus:  '<path d="M12 5v14"/><path d="M5 12h14"/>',
  grip:  '<path d="M5 8h14"/><path d="M5 12h14"/><path d="M5 16h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  scan:  '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8"/><path d="M10.5 8v8"/><path d="M14 8v8"/><path d="M17 8v8"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;

const TABS = [
  { k:'today', n:'Today', i:'plate' },
  { k:'week',  n:'Week',  i:'bars' },
  { k:'foods', n:'Foods', i:'list' },
];

const MEALS = [
  { k:'b', n:'Breakfast' },
  { k:'l', n:'Lunch' },
  { k:'d', n:'Dinner' },
  { k:'s', n:'Snack' },
];
const mealName = k => (MEALS.find(m => m.k === k) || MEALS[3]).n;

/* A drag past this many px deletes the row on release */
const SWIPE = 90;
/* kcal the week chart's full height is at least, so one counted day is not a full bar */
const BAR_FLOOR = 2500;
/* How long the undo toast stays up, ms */
const UNDO_MS = 4500;
/* Open Food Facts product read; only the barcode is sent */
const OFF_API = 'https://world.openfoodfacts.org/api/v2/product/';
const OFF_FIELDS = 'product_name,brands,quantity,serving_quantity,nutriments';
const OFF_PAGE = 'https://world.openfoodfacts.org/product/';

/* ── storage ── */
const logAll    = () => load('food_log', []);
const logSave   = l => save('food_log', l);
const codesAll  = () => load('food_codes', {});
const codesSave = m => save('food_codes', m);
const calLayer  = () => load('food_cal', false);
const offAuto   = () => load('food_offauto', false);
const checksAll = () => load('food_checks', []);
const checksSave = l => save('food_checks', l);
const doneAll   = () => load('food_done', {});

/* ── state ── */
let root = null;
let activeTab = 'today';
let day = todayStr();
let weekOff = 0;
let calOn = true;
let log = [];
let sheet = null, sheetQ = '';
let undo = null, undoTimer = null;
let swipe = null, swallowClick = false;
let sugList = [];
let scanMod = null;
let when = null, whensOpen = false;

const q = s => root.querySelector(s);
const uid = () => (crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(16).slice(2)));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const lc = s => s.trim().toLowerCase();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtK = n => Math.round(n).toLocaleString('en-US');
const fmtG = n => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10) + ' g';
const fmtQ = n => ({ 0.5:'½', 1.5:'1½', 2.5:'2½' }[n] || String(n));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const shiftDay = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return dateStr(x); };
const persist = () => logSave(log);

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dayLabel(d) {
  const t = todayStr();
  if (d === t) return 'Today';
  if (d === shiftDay(t, -1)) return 'Yesterday';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/* The meal is the time of day, never a question: moving an entry's time
   is how it moves to another meal. */
function guessMeal(t) {
  const h = +t.slice(0, 2);
  if (h >= 4 && h < 11) return 'b';
  if (h >= 11 && h < 15) return 'l';
  if (h >= 17 && h < 22) return 'd';
  return 's';
}
const mealOf = e => guessMeal(e.t);

/* ═══════════════════ CALORIES ═══════════════════

   A counted entry either scales per-100 g values by grams (USDA, and
   products whose label is per 100 g) or multiplies a per-unit number
   (a label read per serving, or your own). kcal is rounded per entry,
   so a day's total is exactly the sum of the numbers on its rows. */
function usdaCal(f, por = defaultPortion(f)) {
  return { s:'usda', fdc:f.fdc, pn:por.n, g:por.g, k100:f.k, p100:f.p, f100:f.f, c100:f.c };
}
function kcalOf(e) {
  const c = e.cal;
  if (!c) return null;
  return Math.round(c.k100 != null ? e.q * c.g * c.k100 / 100 : e.q * c.k);
}
function macrosOf(e) {
  const c = e.cal;
  if (!c) return null;
  if (c.k100 != null) {
    if (c.p100 == null || c.f100 == null || c.c100 == null) return null;
    const g = e.q * c.g / 100;
    return { p: g * c.p100, f: g * c.f100, c: g * c.c100 };
  }
  if (c.p == null || c.f == null || c.c == null) return null;
  return { p: e.q * c.p, f: e.q * c.f, c: e.q * c.c };
}

/* What a day adds up to. `complete` means every entry was counted, which
   is the only state where the total is a day's intake rather than part
   of one. Macros need every entry to carry all three for the same reason. */
function dayStats(d) {
  const list = entriesOn(d);
  const counted = list.filter(e => e.cal);
  const kcal = counted.reduce((a, e) => a + kcalOf(e), 0);
  const complete = list.length > 0 && counted.length === list.length;
  let macros = null;
  if (complete) {
    const ms = list.map(macrosOf);
    if (ms.every(Boolean)) macros = ms.reduce((a, m) => ({ p: a.p + m.p, f: a.f + m.f, c: a.c + m.c }), { p:0, f:0, c:0 });
  }
  return { n: list.length, counted: counted.length, kcal, complete, macros, meals: groups(list).length };
}

/* ═══════════════════ PRODUCTS (barcodes) ═══════════════════

   A saved product is either per 100 g (k100…, optional serving `sg`
   grams) or per serving only (sk…), whichever its source gave. Logging
   one copies its numbers into the entry as `pack`. */
function packPortions(p) {
  if (p.k100 == null) return [{ n: 'serving', g: null }];
  return [...(p.sg ? [{ n: `serving (${p.sg} g)`, g: p.sg }] : []), { n: '100 g', g: 100 }];
}
function packCal(code, p, por = packPortions(p)[0]) {
  if (p.k100 == null && p.sk == null) return null;
  if (p.k100 != null) return { s:'pack', code, pn: por.n, g: por.g, k100: p.k100, p100: p.p100, f100: p.f100, c100: p.c100 };
  return { s:'pack', code, pn:'serving', k: p.sk, p: p.sp, f: p.sf, c: p.sc };
}

/* Open Food Facts → a product, or null when it has no such barcode. Its
   energy is read in kcal; a product listing kJ only is converted at the
   label standard of 4.184 kJ per kcal. */
async function offLookup(code) {
  const r = await fetch(`${OFF_API}${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Open Food Facts answered ${r.status}`);
  const d = await r.json();
  if (d.status !== 1 || !d.product) return null;
  const p = d.product, n = p.nutriments || {};
  const kj = num(n['energy-kj_100g']);
  const k100 = num(n['energy-kcal_100g']) ?? (kj != null ? Math.round(kj / 4.184) : null);
  const sg = num(p.serving_quantity);
  return {
    n: (p.product_name || '').trim(), brand: (p.brands || '').split(',')[0].trim(), qty: (p.quantity || '').replace(/\s+(℮|e)$/, ''), src: 'off',
    k100, p100: num(n.proteins_100g), f100: num(n.fat_100g), c100: num(n.carbohydrates_100g), sg: sg > 0 ? sg : null,
  };
}

/* ═══════════════════ JOURNAL ═══════════════════ */
const entriesOn = d => log.filter(e => e.d === d).sort((a, b) => a.t.localeCompare(b.t));
const entry = id => log.find(e => e.id === id);

/* Consecutive entries in one meal read as one sitting: a header with
   the time it started, then what was in it. */
function groups(list) {
  const out = [];
  list.forEach(e => {
    const m = mealOf(e), last = out[out.length - 1];
    if (last && last.m === m) last.items.push(e);
    else out.push({ m, t: e.t, items: [e] });
  });
  return out;
}

/* Every distinct name ever logged, most-eaten first, with the calories
   it was last given — the person's own food list, built by using it. */
function history() {
  const map = new Map();
  [...log].sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t)).forEach(e => {
    const k = lc(e.n), h = map.get(k) || { n: e.n, c: 0, cal: null, q: 1, last: '' };
    h.c++; h.n = e.n; h.q = e.q; h.last = e.d;
    if (e.cal) h.cal = e.cal;
    map.set(k, h);
  });
  return [...map.values()].sort((a, b) => b.c - a.c || b.last.localeCompare(a.last));
}

/* "2 eggs" → 2 × Eggs. The number needs a space or an x after it, so
   "7up" stays a drink rather than becoming seven of "up". */
function parseLine(s) {
  const m = s.trim().match(/^(\d+(?:[.,]\d+)?|½|¼|¾|1½)(?:\s*x\s*|\s+)(.+)$/i);
  const frac = { '½':0.5, '¼':0.25, '¾':0.75, '1½':1.5 };
  if (!m) return { q: 1, n: cap(s.trim()) };
  const qty = frac[m[1]] ?? parseFloat(m[1].replace(',', '.'));
  return { q: qty > 0 && qty <= 50 ? qty : 1, n: cap(m[2].trim()) };
}

/* Calories for a typed name, only when the match is certain: the last
   time this exact name was counted, else a common food whose alias is
   this exact name. Anything fuzzier stays uncounted rather than
   quietly guessed — a wrong number looks exactly like a right one. */
function autoCal(n) {
  const h = history().find(x => lc(x.n) === lc(n) && x.cal);
  if (h) return { ...h.cal };
  const f = COMMON.find(x => x.alias.includes(lc(n)));
  return f ? usdaCal(f) : null;
}

/* Entries are { id, d:'YYYY-MM-DD', t:'HH:MM', n, q, out, cal, ap? }.
   `ap` marks a time picked as a part of the day ("Morning") rather than
   a clock time, so the day never shows it as a precise 8:00 AM. */
function addEntries(items, w = takeWhen()) {
  if (!items.length) return;
  const t = w?.t ?? (day === todayStr() ? nowHM() : '12:00');
  const added = items.map(it => ({ id: uid(), d: day, t, n: it.n, q: it.q, out: false, cal: it.cal !== undefined ? it.cal : calOn ? autoCal(it.n) : null, ...(w?.ap ? { ap: true } : {}) }));
  log.push(...added);
  persist();
  renderToday();
  showUndo(added.length === 1 ? `Added ${added[0].n}` : `Added ${added.length} items`, () => {
    const ids = new Set(added.map(e => e.id));
    log = log.filter(e => !ids.has(e.id));
  });
}

function removeEntries(ids) {
  const set = new Set(ids);
  const gone = log.filter(e => set.has(e.id));
  if (!gone.length) return;
  log = log.filter(e => !set.has(e.id));
  persist();
  if (sheet?.kind === 'entry' && set.has(sheet.id)) closeSheet();
  renderToday();
  showUndo(gone.length === 1 ? `Deleted ${gone[0].n}` : `Deleted ${gone.length} items`, () => { log.push(...gone); });
}

/* ═══════════════════ UNDO TOAST ═══════════════════

   The suite's toast has no button, and an undo you cannot tap is not
   one. Every add and delete goes through here instead of a confirm. */
function showUndo(msg, fn) {
  undo = fn;
  const el = q('#fd-toast');
  el.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-act="undo">Undo</button>' : ''}`;
  el.classList.add('on');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { el.classList.remove('on'); undo = null; }, UNDO_MS);
}
function runUndo() {
  if (!undo) return;
  undo(); undo = null;
  persist();
  q('#fd-toast').classList.remove('on');
  renderAll();
}

/* ═══════════════════ TODAY ═══════════════════ */
function calSub(e) {
  const c = e.cal;
  if (!c) return '';
  if (c.s === 'usda') return `${esc(c.pn)} · USDA`;
  if (c.s === 'pack') return `${esc(c.pn)} · ${codesAll()[c.code]?.src === 'off' ? 'Open Food Facts' : 'label'}`;
  return 'your number';
}

function rowHtml(e) {
  const k = kcalOf(e);
  const sub = calOn ? calSub(e) : '';
  const right = !calOn ? ''
    : k != null ? `<span class="fd-k">${fmtK(k)}</span>`
    : `<span class="fd-addk">+ kcal</span>`;
  return `<div class="fd-swipe"><div class="fd-del">Delete</div>
    <div class="fd-row" data-act="open" data-id="${e.id}">
      <div class="fd-row-b">
        <div class="fd-row-t">${e.q !== 1 ? `<span class="fd-q">${fmtQ(e.q)}×</span>` : ''}<span class="fd-n">${esc(e.n)}</span>${e.out ? '<span class="fd-tag">Out</span>' : ''}</div>
        ${sub ? `<div class="fd-row-s">${sub}</div>` : ''}
      </div>
      ${right}
    </div></div>`;
}

function summaryHtml(st) {
  if (!st.n || !calOn) return '';
  const status = st.complete
    ? '<span class="fd-st ok">Complete day</span>'
    : `<span class="fd-st part">${st.n - st.counted} not counted</span>`;
  const mac = st.macros ? `<div class="fd-mac">
      <span><b>${fmtG(st.macros.p)}</b> protein</span><span><b>${fmtG(st.macros.c)}</b> carbs</span><span><b>${fmtG(st.macros.f)}</b> fat</span>
    </div>` : '';
  return `<div class="fd-sum">
    <div class="fd-sum-top"><div class="fd-sum-k"><b>${fmtK(st.kcal)}</b> kcal${st.complete ? '' : ' counted'}</div>${status}</div>
    ${mac}
  </div>`;
}

function renderToday() {
  const head = q('#fd-today-head'), el = q('#fd-today-body');
  if (!el) return;
  const list = entriesOn(day), st = dayStats(day);
  const isToday = day === todayStr();
  /* Newest first, meals and the entries in them alike. The sort is stable,
     so a line typed as "2 eggs, toast" still reads in the order typed. */
  const body = list.length
    ? groups(list).reverse().map(g => `<section class="fd-grp">
        <div class="fd-grp-h"><span>${mealName(g.m)}</span><span class="fd-grp-t">${g.items.some(e => !e.ap) ? fmtTime(g.items.find(e => !e.ap).t) : ''}</span></div>
        ${g.items.slice().sort((a, b) => b.t.localeCompare(a.t)).map(rowHtml).join('')}
      </section>`).join('')
    : `<div class="fd-empty">
        <div class="fd-empty-t">${isToday ? 'Nothing logged yet today' : 'Nothing logged this day'}</div>
        <div class="fd-empty-s">Try <b>2 eggs, toast</b></div>
      </div>`;
  head.innerHTML = `
    <div class="fd-daynav">
      <button class="fd-arrow" data-act="day" data-d="-1" aria-label="Previous day">‹</button>
      <div class="fd-day"><b>${dayLabel(day)}</b><span>${fmtDate(day)}</span></div>
      <button class="fd-arrow" data-act="day" data-d="1" aria-label="Next day"${isToday ? ' disabled' : ''}>›</button>
    </div>`;
  el.innerHTML = checklistHtml() + summaryHtml(st) + body;
  renderQuick();
}

/* ═══════════════════ COMPOSER ═══════════════════

   One text box, pinned to the bottom where a thumb already is. Enter
   logs every comma-separated part at once; a suggestion tap logs the
   whole line with that pick as its last part. Empty, it offers the
   person's own most-eaten foods and the meal they had this time
   yesterday, each one tap. The barcode button sits beside it. */
function suggestions(text) {
  const { n } = parseLine(parseWhen(text).text.split(',').pop() || '');
  const term = lc(n || '');
  if (!term) return [];
  const hits = word => lc(word).startsWith(term) || lc(word).split(/[\s-]+/).some(w => w.startsWith(term));
  const mine = history().filter(h => hits(h.n)).slice(0, 3).map(h => ({ n: h.n, cal: h.cal, src: 'mine', c: h.c }));
  const taken = new Set(mine.filter(m => m.cal?.s === 'usda').map(m => m.cal.fdc));
  if (!calOn) return mine;
  const usda = term.length < 2 ? [] : search(term, 8).filter(f => !taken.has(f.fdc)).slice(0, 6 - mine.length)
    .map(f => ({ n: shortName(f), cal: usdaCal(f), src: 'usda', desc: f.desc }));
  return [...mine, ...usda];
}

function renderSugs() {
  const inp = q('#fd-in'), box = q('#fd-sugs');
  if (!inp || !box) return;
  sugList = suggestions(inp.value);
  const lead = parseLine(parseWhen(inp.value).text.split(',').pop() || '').q;
  paintWhen();
  box.innerHTML = sugList.map((s, i) => {
    const k = s.cal ? kcalOf({ q: lead, cal: s.cal }) : null;
    const meta = !calOn ? '' : s.src === 'mine' ? (s.cal ? esc(s.cal.pn) : '') : `USDA · ${esc(s.desc)} · ${esc(s.cal.pn)}`;
    return `<button class="fd-sug" data-act="sug" data-i="${i}">
      <span class="fd-sug-b"><span class="fd-sug-n">${lead !== 1 ? `${fmtQ(lead)}× ` : ''}${esc(s.n)}</span>${meta ? `<span class="fd-sug-m">${meta}</span>` : ''}</span>
      ${calOn && k != null ? `<span class="fd-sug-k">${fmtK(k)}</span>` : ''}
    </button>`;
  }).join('');
  box.classList.toggle('on', sugList.length > 0);
}

function renderQuick() {
  const el = q('#fd-quick');
  if (!el) return;
  const slot = guessMeal(day === todayStr() ? nowHM() : '12:00');
  const prevMeal = entriesOn(shiftDay(day, -1)).filter(e => mealOf(e) === slot);
  const already = new Set(entriesOn(day).map(e => lc(e.n)));
  const top = history().filter(h => !already.has(lc(h.n))).slice(0, 6);
  el.innerHTML = (prevMeal.length ? `<button class="fd-chip rep" data-act="repeat" data-meal="${slot}">↻ Yesterday's ${mealName(slot).toLowerCase()}</button>` : '')
    + top.map(h => `<button class="fd-chip" data-act="quick" data-n="${esc(h.n)}">${esc(h.n)}</button>`).join('');
}

function commitLine(pick) {
  const inp = q('#fd-in');
  const { text, when: typed } = parseWhen(inp.value);
  if (typed) when = typed;
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length && !pick) return;
  const items = parts.map(parseLine);
  if (pick) {
    const lead = items.length ? items.pop().q : 1;
    items.push({ q: lead, n: pick.n, cal: pick.cal ? { ...pick.cal } : null });
  }
  inp.value = '';
  renderSugs();
  addEntries(items);
}

/* ── when ──

   Entries default to now (noon on a past day). The clock button in the
   bar picks a part of the day or an exact time for the next add, and a
   line can say it itself: "eggs at 8", "toast 7:30am", "pizza tonight",
   "pasta for dinner". The phrase is only read off the end of the line,
   and meal words need their "for"/"at", so "Breakfast burrito" and
   "TV dinner" stay food. */
const SLOTS = [
  { k: 'morning',   n: 'Morning',   t: '08:00', re: /morning/ },
  { k: 'afternoon', n: 'Afternoon', t: '15:00', re: /afternoon/ },
  { k: 'evening',   n: 'Evening',   t: '19:00', re: /evening|tonight/ },
  { k: 'night',     n: 'Night',     t: '22:30', re: /night|late/ },
];
const MEAL_AT = { breakfast: '08:00', brunch: '10:30', lunch: '12:30', dinner: '19:00', supper: '19:00' };
const RX_CLOCK = /\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i;
const RX_AT = /\s+at\s+(\d{1,2})(?::(\d{2}))?$/i;
const RX_PART = /\s+(?:this\s+|in\s+the\s+|at\s+|late\s+)?(morning|afternoon|evening|tonight|night)$/i;
const RX_MEAL = /\s+(?:for|at)\s+(breakfast|brunch|lunch|dinner|supper)$/i;
const hm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/* "at 8" with no am/pm: the latest of 8:00 and 20:00 that has already
   happened today, else the morning one; on a past day, 7 to 11 is
   morning and anything else afternoon or evening. */
function bareHour(h, m) {
  if (h === 0 || h > 12) return hm(h % 24, m);
  const am = hm(h % 12, m), pm = hm(h % 12 + 12, m);
  if (day !== todayStr()) return h >= 7 && h <= 11 ? am : pm;
  const now = nowHM();
  return pm <= now ? pm : am;
}

/* The time phrase at the end of a line, if any, and the line without it. */
function parseWhen(s) {
  let m;
  if ((m = s.match(RX_CLOCK))) {
    let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12;
    const t = hm(h, +(m[2] || 0));
    return { text: s.slice(0, m.index), when: { t, label: fmtTime(t) } };
  }
  if ((m = s.match(RX_AT)) && +m[1] <= 23) {
    const t = bareHour(+m[1], +(m[2] || 0));
    return { text: s.slice(0, m.index), when: { t, label: fmtTime(t) } };
  }
  if ((m = s.match(RX_PART))) {
    const sl = SLOTS.find(x => x.re.test(m[1].toLowerCase()));
    return { text: s.slice(0, m.index), when: { t: sl.t, ap: true, label: sl.n } };
  }
  if ((m = s.match(RX_MEAL))) {
    const w = m[1].toLowerCase();
    return { text: s.slice(0, m.index), when: { t: MEAL_AT[w], ap: true, label: cap(w) } };
  }
  return { text: s, when: null };
}

/* The time for this add, cleared once used so the next add is "now" again. */
function takeWhen() {
  const w = when;
  when = null; whensOpen = false;
  paintWhen();
  return w;
}

function paintWhen() {
  const btn = q('#fd-when'), row = q('#fd-whens'), inp = q('#fd-in');
  if (!btn) return;
  const typed = inp && parseWhen(inp.value).when;
  const w = typed || when;
  btn.classList.toggle('set', !!w);
  btn.querySelector('span').textContent = w ? w.label : 'Now';
  row.classList.toggle('on', whensOpen);
  row.innerHTML = !whensOpen ? '' : `<button class="fd-chip${!when ? ' sel' : ''}" data-act="when-pick" data-k="now">Now</button>`
    + `<label class="fd-chip fd-when-t${when && !when.ap ? ' sel' : ''}">${icon('clock')}<input id="fd-when-t" type="time" value="${when && !when.ap ? when.t : ''}" aria-label="Exact time"></label>`
    + SLOTS.map(s => `<button class="fd-chip${when?.label === s.n ? ' sel' : ''}" data-act="when-pick" data-k="${s.k}">${s.n}</button>`).join('');
  q('#fd-quick')?.classList.toggle('off', whensOpen || !!inp?.value.trim());
}

function pickWhen(k) {
  const s = SLOTS.find(x => x.k === k);
  when = s ? { t: s.t, ap: true, label: s.n } : null;
  whensOpen = false;
  paintWhen();
}

function repeatMeal(slot) {
  const prev = entriesOn(shiftDay(day, -1)).filter(e => mealOf(e) === slot);
  addEntries(prev.map(e => ({ n: e.n, q: e.q, cal: e.cal ? { ...e.cal } : null })));
}

function quickAdd(n) {
  const h = history().find(x => x.n === n);
  if (h) addEntries([{ n: h.n, q: h.q, cal: h.cal ? { ...h.cal } : null }]);
}

/* ═══════════════════ SCAN ═══════════════════

   A barcode you have scanned before logs straight away. A new one asks
   before anything leaves the device — the lookup sends the barcode
   number to Open Food Facts and nothing else — unless lookups were set
   to automatic. Whatever comes back is crowd-sourced, so it is shown
   for checking against the label before it is saved. */
function startScan() {
  import('./scan.js?v=food-3').then(S => { scanMod = S; S.openScanner(onCode); }).catch(() => showUndo('Scanner failed to load', null));
}

function onCode(code) {
  const p = codesAll()[code];
  if (p) { addEntries([{ n: p.n, q: 1, cal: packCal(code, p) }]); return; }
  sheetQ = '';
  openSheet({ kind: 'scan', code, st: offAuto() ? 'loading' : 'ask' });
  if (offAuto()) lookup(code);
}

async function lookup(code) {
  setScan({ st: 'loading' });
  try {
    const p = await offLookup(code);
    if (!sheet || sheet.code !== code) return;
    if (!p) setScan({ st: 'label', why: 'none', draft: blankDraft() });
    else if (p.k100 == null && calOn) setScan({ st: 'label', why: 'nokcal', draft: { ...blankDraft(), n: p.n, sg: p.sg ?? '' }, off: p });
    else setScan({ st: 'found', off: p, name: p.n || '' });
  } catch (e) {
    if (sheet?.code === code) setScan({ st: 'error', err: String(e?.message || e) });
  }
}
const blankDraft = () => ({ n: '', per: 'serving', k: '', p: '', c: '', f: '', sg: '' });
function setScan(patch) { if (sheet?.kind !== 'scan') return; Object.assign(sheet, patch); renderSheet(); }

/* Save a product under its barcode and log one serving of it. */
function saveProduct(p) {
  const all = codesAll();
  all[sheet.code] = p;
  codesSave(all);
  const code = sheet.code;
  closeSheet();
  addEntries([{ n: p.n, q: 1, cal: packCal(code, p) }]);
  renderFoods();
}

function saveFound() {
  const o = sheet.off, name = (q('#sc-name')?.value || '').trim();
  if (!name) { q('#sc-name')?.focus(); return; }
  const sg = num(q('#sc-sg1')?.value);
  saveProduct({ n: name, brand: o.brand, src: 'off', k100: o.k100, p100: o.p100, f100: o.f100, c100: o.c100, sg: sg > 0 ? sg : null });
}

function saveLabel() {
  const d = readDraft();
  const k = num(d.k);
  if (!d.n.trim()) { q('#sc-n')?.focus(); return; }
  if (!calOn) { saveProduct({ n: d.n.trim(), brand: sheet.off?.brand || '', src: 'label' }); return; }
  if (k == null) { q('#sc-k')?.focus(); return; }
  const sg = num(d.sg);
  const base = { n: d.n.trim(), brand: sheet.off?.brand || '', src: 'label', sg: sg > 0 ? sg : null };
  saveProduct(d.per === '100g'
    ? { ...base, k100: k, p100: num(d.p), f100: num(d.f), c100: num(d.c) }
    : { ...base, sk: k, sp: num(d.p), sf: num(d.f), sc: num(d.c) });
}

function readDraft() {
  const d = sheet.draft;
  ['n', 'k', 'p', 'c', 'f', 'sg'].forEach(k => { const el = q('#sc-' + k); if (el) d[k] = el.value; });
  return d;
}

/* The "check it against the label" step for a found product: its numbers
   copied into the form, per 100 g as Open Food Facts stores them. */
function editFound() {
  const o = sheet.off;
  setScan({ st: 'label', why: 'edit', draft: { n: q('#sc-name')?.value || o.n, per: '100g', k: o.k100 ?? '', p: o.p100 ?? '', c: o.c100 ?? '', f: o.f100 ?? '', sg: o.sg ?? '' } });
}

function scanHtml() {
  const s = sheet;
  const head = `    <div class="fd-sh-top"><div class="fd-sh-title">${s.st === 'found' ? 'Found it' : 'New barcode'}</div><button class="fd-x" data-act="close" aria-label="Close">&times;</button></div>
    <div class="sc-code">${esc(s.code)}</div>`;
  if (s.st === 'ask') return head + `
    <button class="fd-btn pri wide" data-act="sc-look">Look up on Open Food Facts</button>
    <button class="fd-tog${offAuto() ? ' on' : ''}" data-act="sc-auto"><span class="fd-tog-b"></span>Always look up</button>
    <button class="fd-btn wide" data-act="sc-label">Enter from label</button>`;
  if (s.st === 'loading') return head + '<div class="sc-wait"><i></i>Looking it up…</div>';
  if (s.st === 'error') return head + `
    <p class="fd-p">Couldn't connect.</p>
    <div class="fd-sh-foot"><button class="fd-btn" data-act="sc-label">Enter from label</button><button class="fd-btn pri" data-act="sc-look">Try again</button></div>`;
  if (s.st === 'found' && !calOn) return head + `
      <input class="fd-in-sm" id="sc-name" value="${esc(s.name)}" placeholder="What is it?" autocomplete="off" aria-label="Name">
      ${s.off.brand ? `<div class="sc-brand">${esc(s.off.brand)}</div>` : ''}
      <div class="fd-sh-foot"><button class="fd-btn pri" data-act="sc-add">Add</button></div>`;
  if (s.st === 'found') {
    const o = s.off, serv = o.sg ? Math.round(o.sg * o.k100 / 100) : null;
    const row = (l, v, u) => `<div><span>${l}</span><b>${v == null ? '—' : (u === 'kcal' ? fmtK(v) : fmtG(v))}</b></div>`;
    return head + `
      <label class="fd-sec-l" for="sc-name">Name</label>
      <input class="fd-in-sm" id="sc-name" value="${esc(s.name)}" placeholder="What is it?" autocomplete="off">
      ${o.brand || o.qty ? `<div class="sc-brand">${esc([o.brand, o.qty].filter(Boolean).join(' · '))}</div>` : ''}
      <div class="fd-sec-l">Per 100 g <span class="fd-opt">· Open Food Facts</span></div>
      <div class="sc-facts">${row('Calories', o.k100, 'kcal')}${row('Protein', o.p100)}${row('Carbs', o.c100)}${row('Fat', o.f100)}</div>
      <label class="sc-sg"><span>One serving</span><input class="fd-in-sm" id="sc-sg1" type="number" inputmode="decimal" min="0" step="any" value="${esc(o.sg ?? '')}" placeholder="g"><span>g</span><b id="sc-sgk">${serv != null ? `= ${fmtK(serv)} kcal` : ''}</b></label>
      <div class="fd-sh-foot"><button class="fd-btn" data-act="sc-edit">Edit numbers</button><button class="fd-btn pri" data-act="sc-add">Add 1 serving</button></div>`;
  }
  const d = s.draft;
  const why = { none: 'Not found.', nokcal: 'No calories listed.' }[s.why] || '';
  if (!calOn) return head + `
    ${why ? `<p class="fd-p">${why}</p>` : ''}
    <input class="fd-in-sm" id="sc-n" value="${esc(d.n)}" placeholder="What is it?" autocomplete="off" aria-label="Name">
    <div class="fd-sh-foot"><button class="fd-btn" data-act="close">Cancel</button><button class="fd-btn pri" data-act="sc-save">Add</button></div>`;
  const fld = (id, l, v, ph) => `<label class="sc-f"><span>${l}</span><input class="fd-in-sm" id="sc-${id}" type="number" inputmode="decimal" min="0" step="any" value="${esc(v)}" placeholder="${ph}"></label>`;
  return head + `
    ${why ? `<p class="fd-p">${why}</p>` : ''}
    <label class="fd-sec-l" for="sc-n">Name</label>
    <input class="fd-in-sm" id="sc-n" value="${esc(d.n)}" placeholder="e.g. Granola bar" autocomplete="off">
    <div class="fd-sec-l">Per</div>
    <div class="fd-seg2"><button class="${d.per === 'serving' ? 'sel' : ''}" data-act="sc-per" data-v="serving">Serving</button><button class="${d.per === '100g' ? 'sel' : ''}" data-act="sc-per" data-v="100g">100 g</button></div>
    <div class="sc-grid">
      ${fld('k', 'Calories', d.k, 'kcal')}${fld('sg', 'Serving size', d.sg, 'g (optional)')}
      ${fld('p', 'Protein', d.p, 'g')}${fld('c', 'Carbs', d.c, 'g')}${fld('f', 'Fat', d.f, 'g')}
    </div>
    <div class="fd-sh-foot"><button class="fd-btn" data-act="close">Cancel</button><button class="fd-btn pri" data-act="sc-save">Save and add</button></div>`;
}

function scanAct(act, btn) {
  if (act === 'sc-look') lookup(sheet.code);
  else if (act === 'sc-auto') { save('food_offauto', !offAuto()); renderSheet(); }
  else if (act === 'sc-label') setScan({ st: 'label', why: 'self', draft: blankDraft() });
  else if (act === 'sc-add') saveFound();
  else if (act === 'sc-edit') editFound();
  else if (act === 'sc-per') { readDraft(); sheet.draft.per = btn.dataset.v; renderSheet(); }
  else if (act === 'sc-save') saveLabel();
}

/* ═══════════════════ ENTRY SHEET ═══════════════════

   Everything about one entry, applied as it changes: there is no Save,
   because there is nothing to lose by closing. The scan flow borrows
   the same sheet with `kind: 'scan'`. */
function openSheet(s) {
  sheet = s; sheetQ = '';
  renderSheet();
  q('#fd-ov').classList.add('on');
  document.documentElement.classList.add('fd-lock');
}
function closeSheet() {
  sheet = null;
  q('#fd-ov')?.classList.remove('on');
  document.documentElement.classList.remove('fd-lock');
}

/* ── keyboard ──

   iOS draws the caret where a field was before the keyboard moved it,
   and a field pinned to the bottom of the screen always moves. So no
   text field here is: the composer sits in the page under the date, and
   the sheet opens from the top. --vvh (the height left above the
   keyboard) only caps the sheet so its lower fields can scroll into view;
   the page behind an open sheet is locked so it cannot scroll either. */
function syncViewport() {
  const vv = window.visualViewport;
  if (vv && root) root.style.setProperty('--vvh', vv.height + 'px');
}

function calHtml(e) {
  if (!calOn) return '';
  const c = e.cal;
  if (c && (c.s === 'usda' || c.s === 'pack')) {
    const m = macrosOf(e), k = kcalOf(e);
    let tag, desc, pors, link;
    if (c.s === 'usda') {
      const f = byFdc(c.fdc);
      tag = '<span class="fd-src-tag">USDA</span>';
      desc = f ? esc(f.desc) : `USDA record ${c.fdc}`;
      pors = f ? portions(f) : [];
      link = `<a class="fd-lnk" href="https://fdc.nal.usda.gov/food-details/${c.fdc}/nutrients" target="_blank" rel="noopener">View on USDA ↗</a>`;
    } else {
      const p = codesAll()[c.code];
      tag = p?.src === 'off' ? '<span class="fd-src-tag off">Open Food Facts</span>' : '<span class="fd-src-tag own">Label</span>';
      desc = esc([p?.brand !== p?.n && p?.brand, p?.n].filter(Boolean).join(' · ') || 'Scanned product') + ` <span class="sc-code sm">${esc(c.code)}</span>`;
      pors = p && c.k100 != null ? packPortions(p) : [];
      link = p?.src === 'off' ? `<a class="fd-lnk" href="${OFF_PAGE}${esc(c.code)}" target="_blank" rel="noopener">View on Open Food Facts ↗</a>` : '';
    }
    const at = pors.findIndex(p => p.g === c.g), custom = c.k100 != null && at < 0;
    const chips = pors.length > 1 || c.k100 != null ? `<div class="fd-pors">${pors.map((p, i) =>
      `<button class="fd-por${i === at ? ' sel' : ''}" data-act="por" data-i="${i}">${esc(p.n)} <em>${p.g} g</em></button>`).join('')}
      ${c.k100 != null ? `<label class="fd-por grams${custom ? ' sel' : ''}"><input id="fd-grams" type="number" inputmode="decimal" min="0" step="any" value="${custom ? c.g : ''}" placeholder="grams"><em>g</em></label>` : ''}</div>` : '';
    const math = c.k100 != null
      ? `${fmtQ(e.q)} × ${esc(c.pn)}${c.pn.includes(`${c.g} g`) ? '' : ` (${c.g} g)`} = ${fmtG(e.q * c.g)} · ${c.k100} kcal per 100 g`
      : `${fmtQ(e.q)} × ${c.k} kcal per serving`;
    return `<div class="fd-sec-l">Calories</div>
      <div class="fd-src">
        <div class="fd-src-top"><span class="fd-src-k"><b>${fmtK(k)}</b> kcal</span>${tag}</div>
        <div class="fd-src-d">${desc}</div>
        ${chips}
        <div class="fd-src-math">${math}</div>
        ${m ? `<div class="fd-mac sm"><span><b>${fmtG(m.p)}</b> protein</span><span><b>${fmtG(m.c)}</b> carbs</span><span><b>${fmtG(m.f)}</b> fat</span></div>` : ''}
        <div class="fd-src-acts"><button class="fd-lnk" data-act="cal-clear">Change</button>${link}</div>
      </div>`;
  }
  if (c?.s === 'own') {
    return `<div class="fd-sec-l">Calories</div>
      <div class="fd-src">
        <div class="fd-src-top"><span class="fd-src-k"><b>${fmtK(kcalOf(e))}</b> kcal</span><span class="fd-src-tag own">Your number</span></div>
        <label class="fd-own"><input class="fd-in-sm" id="fd-own" type="number" inputmode="numeric" min="0" value="${c.k}"><span>kcal${e.q !== 1 ? ' each' : ''}</span></label>
        <div class="fd-src-acts"><button class="fd-lnk" data-act="cal-clear">Change</button></div>
      </div>`;
  }
  return `<div class="fd-sec-l">Calories <span class="fd-opt">optional</span></div>
    <div class="fd-find">
      <input class="fd-in-sm" id="fd-find" type="search" placeholder="Search USDA foods" value="${esc(sheetQ)}" autocomplete="off">
      <div id="fd-find-res">${findHtml(e)}</div>
      <div class="fd-or"><span>or type it from the label</span></div>
      <div class="fd-own-new"><input class="fd-in-sm" id="fd-own-new" type="number" inputmode="numeric" min="0" placeholder="kcal${e.q !== 1 ? ' each' : ''}"><button class="fd-btn" data-act="own-set">Set</button></div>
    </div>`;
}

/* With no search typed, the results start from the entry's own words,
   so "Banana" opens on bananas rather than on an empty box. Every word
   must match: "Chicken burrito" is not a chicken breast. */
let findRes = [];
function findHtml(e) {
  findRes = search(sheetQ || e.n, 6);
  if (!findRes.length) return `<div class="fd-find-none">No match</div>`;
  return findRes.map((f, i) => {
    const p = defaultPortion(f);
    return `<button class="fd-res" data-act="pick" data-i="${i}">
      <span class="fd-res-d">${esc(f.desc)}${f.cat ? `<em>${esc(f.cat)}</em>` : ''}</span>
      <span class="fd-res-k">${fmtK(f.k * p.g / 100)} kcal <em>/ ${esc(p.n)}</em></span>
    </button>`;
  }).join('');
}

function entryHtml(e) {
  return `
    <div class="fd-sh-top">
      <input class="fd-sh-name" id="fd-name" value="${esc(e.n)}" aria-label="Name" autocomplete="off">
      <button class="fd-x" data-act="close" aria-label="Close">&times;</button>
    </div>
    <div class="fd-sh-grid">
      <div><div class="fd-sec-l">Amount</div>
        <div class="fd-step"><button data-act="qty" data-d="-1" aria-label="Less"${e.q <= 0.5 ? ' disabled' : ''}>−</button><b>${fmtQ(e.q)}</b><button data-act="qty" data-d="1" aria-label="More">+</button></div></div>
      <div><div class="fd-sec-l">Time <span class="fd-opt">· ${mealName(mealOf(e))}</span></div>
        <input class="fd-in-sm fd-time" id="fd-time" type="time" value="${e.t}"></div>
    </div>
    <button class="fd-tog${e.out ? ' on' : ''}" data-act="out"><span class="fd-tog-b"></span>Eaten out or takeout</button>
    ${calHtml(e)}
    <div class="fd-sh-foot">
      <button class="fd-btn danger" data-act="del">Delete</button>
      <button class="fd-btn pri" data-act="close">Done</button>
    </div>`;
}

function renderSheet() {
  const el = q('#fd-sheet');
  if (!el || !sheet) return;
  if (sheet.kind === 'scan') { el.innerHTML = scanHtml(); return; }
  if (sheet.kind === 'checks') { el.innerHTML = checksHtml(); return; }
  const e = entry(sheet.id);
  if (e) el.innerHTML = entryHtml(e);
}

/* Name edits repaint the day underneath but never the sheet itself,
   which would throw the caret out of the field mid-word. */
function sheetName(v) {
  const e = sheet?.kind === 'entry' && entry(sheet.id);
  if (!e || !v.trim()) return;
  e.n = v.trim();
  persist();
  renderToday();
}

function sheetAct(act, btn) {
  if (sheet?.kind === 'scan') { scanAct(act, btn); return; }
  if (sheet?.kind === 'checks') { checksAct(act, btn); return; }
  const e = sheet && entry(sheet.id);
  if (!e) return;
  if (act === 'qty') {
    e.q = Math.max(0.5, Math.min(50, e.q + (+btn.dataset.d) * 0.5));
  } else if (act === 'out') {
    e.out = !e.out;
  } else if (act === 'por') {
    const c = e.cal;
    if (c.s === 'usda') { const f = byFdc(c.fdc); if (f) e.cal = usdaCal(f, portions(f)[+btn.dataset.i]); }
    else { const p = codesAll()[c.code]; if (p) e.cal = packCal(c.code, p, packPortions(p)[+btn.dataset.i]); }
  } else if (act === 'pick') {
    const f = findRes[+btn.dataset.i];
    if (f) e.cal = usdaCal(f);
  } else if (act === 'cal-clear') {
    e.cal = null; sheetQ = '';
  } else if (act === 'own-set') {
    const v = num(q('#fd-own-new')?.value);
    if (v == null) return;
    e.cal = { s:'own', k: Math.round(v) };
  } else if (act === 'del') {
    removeEntries([e.id]);
    return;
  } else return;
  persist();
  renderSheet();
  renderToday();
}

/* A weight typed by hand replaces the portion: amount goes back to 1,
   so "35 g" means 35 g eaten, not 35 g times whatever the stepper said. */
function setGrams(v) {
  const e = sheet?.kind === 'entry' && entry(sheet.id), g = num(v);
  if (!e || !e.cal || e.cal.k100 == null || !(g > 0)) return;
  e.cal = { ...e.cal, g, pn: `${g} g` };
  e.q = 1;
  persist();
  renderSheet();
  renderToday();
}

/* ═══════════════════ CHECKLIST ═══════════════════

   Things to tick off each day, beside what was eaten. An item runs every
   day (`days: null`) or on the weekdays listed (0 = Monday), from the
   day it was added (`from`), so it never shows up unticked on days that
   came before it. Ticks are kept per date in food_done: a past day keeps
   what was ticked on it, whatever the list looks like now. */
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekday = d => (new Date(d + 'T12:00:00').getDay() + 6) % 7;
const checksOn = d => checksAll().filter(c => (!c.from || c.from <= d) && (!c.days || c.days.includes(weekday(d))));

/* How many of a day's items were ticked, or null when it has none. */
function checkCount(d) {
  const items = checksOn(d);
  if (!items.length) return null;
  const done = new Set(doneAll()[d] || []);
  return { n: items.length, done: items.filter(c => done.has(c.id)).length };
}

/* ── checklist sections ──

   An item's `at` is null (any time), a SLOTS key, or 'HH:MM'. The card
   groups items under Any time, Morning, Afternoon, Evening and Night, in
   that order. An exact time joins the part of the day it falls in and
   shows its clock time. Within a part, items keep the order of the stored
   list, which is the order set by dragging in Edit; see `place` for where
   a new one lands. */
const PART_END = { morning: '12:00', afternoon: '17:00', evening: '21:00' };
function partOf(at) {
  if (!at) return 'any';
  if (SLOTS.some(s => s.k === at)) return at;
  if (at < '04:00') return 'night';
  return Object.keys(PART_END).find(k => at < PART_END[k]) || 'night';
}
const PARTS = [{ k: 'any', n: 'Any time' }, ...SLOTS.map(s => ({ k: s.k, n: s.n }))];
const exactAt = at => (at && !SLOTS.some(s => s.k === at) ? at : '');

function checklistHtml() {
  const items = checksOn(day);
  if (!items.length) return `<button class="fd-chk-add" data-act="ck-quick">${icon('plus')}Checklist</button>`;
  const done = new Set(doneAll()[day] || []), n = items.filter(c => done.has(c.id)).length;
  const row = c => `<button class="fd-chk${done.has(c.id) ? ' on' : ''}" data-act="ck-tick" data-id="${c.id}" aria-pressed="${done.has(c.id)}"><span class="fd-chk-b"></span><span class="fd-chk-n">${esc(c.n)}</span>${exactAt(c.at) ? `<span class="fd-chk-t">${fmtTime(c.at)}</span>` : ''}</button>`;
  const parts = PARTS.map(p => ({ ...p, items: items.filter(c => partOf(c.at) === p.k) })).filter(p => p.items.length);
  const one = parts.length === 1 && parts[0].k === 'any';
  return `<div class="fd-card fd-chks">
    <div class="fd-card-h"><span>Checklist</span><span class="fd-card-n"><b class="${n === items.length ? 'ok' : ''}">${n}/${items.length}</b><button class="fd-lnk" data-act="ck-quick">Add</button><button class="fd-lnk" data-act="ck-open">Edit</button></span></div>
    ${parts.map(p => {
      const d = p.items.filter(c => done.has(c.id)).length;
      return `${one ? '' : `<div class="fd-chk-h"><span>${p.n}</span><b class="${d === p.items.length ? 'ok' : ''}">${d}/${p.items.length}</b></div>`}${p.items.map(row).join('')}`;
    }).join('')}
  </div>`;
}

/* Tick or untick an item on the day on screen. */
function tick(id) {
  const all = doneAll(), set = new Set(all[day] || []);
  if (set.has(id)) set.delete(id); else set.add(id);
  if (set.size) all[day] = [...set]; else delete all[day];
  save('food_done', all);
  renderToday();
}

/* ── checklist editor ──

   Two views in one sheet. The list shows every item with a one-line
   summary ("Mon, Wed · Morning"); tapping one, or Add, opens a short form
   (name, repeat, time) that changes nothing until Save. Add from the
   Today card goes straight to the form and closes on Save. */
const blankItem = () => ({ n: '', days: null, at: null });
const sameDays = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function daysLabel(days) {
  if (!days) return 'Every day';
  if (sameDays(days, [0, 1, 2, 3, 4])) return 'Weekdays';
  if (sameDays(days, [5, 6])) return 'Weekends';
  return days.map(w => WD_LONG[w].slice(0, 3)).join(', ');
}

function listHtml() {
  const items = checksAll();
  const parts = PARTS.map(p => ({ ...p, items: items.filter(c => partOf(c.at) === p.k) })).filter(p => p.items.length);
  return `
    <div class="fd-sh-top"><div class="fd-sh-title">Checklist</div><button class="fd-x" data-act="close" aria-label="Close">&times;</button></div>
    <button class="fd-btn pri wide ck-addbtn" data-act="ck-new">${icon('plus')}Add item</button>
    <div class="ck-list">${parts.map(p => `<div class="fd-chk-h"><span>${p.n}</span></div><div class="ck-sec">${p.items.map(c => `<button class="ck-row" data-act="ck-edit" data-id="${c.id}">
      <span class="ck-grip" aria-label="Drag to reorder">${icon('grip')}</span>
      <span class="ck-row-b"><span class="ck-row-n">${esc(c.n)}</span><span class="ck-row-s">${[daysLabel(c.days), exactAt(c.at) ? fmtTime(c.at) : ''].filter(Boolean).join(' · ')}</span></span>
      <span class="ck-chev">›</span></button>`).join('')}</div>`).join('')}</div>`;
}

/* ── drag to reorder ──

   The ≡ handle on an Edit row drags it within its own part of the day;
   rows swap as it passes their middle, and the new order is written back
   into the slots that part held in the stored list, so other parts stay
   exactly where they were. */
let reorder = null;
function startReorder(e, grip) {
  const row = grip.closest('.ck-row');
  reorder = { row, sec: row.parentElement, y: e.clientY };
  row.classList.add('lift');
  grip.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function moveReorder(e) {
  const r = reorder;
  let dy = e.clientY - r.y;
  const prev = r.row.previousElementSibling, next = r.row.nextElementSibling;
  if (dy > 0 && next && dy > next.offsetHeight / 2) { next.after(r.row); r.y += next.offsetHeight; dy -= next.offsetHeight; }
  else if (dy < 0 && prev && -dy > prev.offsetHeight / 2) { prev.before(r.row); r.y -= prev.offsetHeight; dy += prev.offsetHeight; }
  r.row.style.transform = `translateY(${dy}px)`;
}
function endReorder() {
  const r = reorder;
  reorder = null;
  r.row.classList.remove('lift');
  r.row.style.transform = '';
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 0);
  const ids = [...r.sec.children].map(x => x.dataset.id);
  const items = checksAll(), byId = new Map(items.map(c => [c.id, c]));
  const slots = items.map((c, i) => (ids.includes(c.id) ? i : -1)).filter(i => i >= 0);
  slots.forEach((pos, k) => { items[pos] = byId.get(ids[k]); });
  checksSave(items);
  renderToday();
}

/* A new item, or one moved to another part of the day, goes last in its
   part, or among exact times by its clock time. */
function place(items, c) {
  const part = partOf(c.at), t = exactAt(c.at);
  const same = items.filter(x => partOf(x.at) === part);
  const later = t && same.find(x => exactAt(x.at) > t);
  if (later) items.splice(items.indexOf(later), 0, c);
  else if (same.length) items.splice(items.indexOf(same.at(-1)) + 1, 0, c);
  else items.push(c);
}

function formHtml() {
  const d = sheet.draft, exact = exactAt(d.at);
  return `
    <div class="fd-sh-top"><div class="fd-sh-title">${d.id ? 'Edit item' : 'New item'}</div><button class="fd-x" data-act="close" aria-label="Close">&times;</button></div>
    <input class="fd-in-sm ck-form-n" id="ck-n" value="${esc(d.n)}" placeholder="e.g. Creatine" autocomplete="off" enterkeyhint="done" aria-label="Name">
    <div class="fd-sec-l">Repeat</div>
    <div class="fd-seg2"><button class="${d.days ? '' : 'sel'}" data-act="ck-rep" data-v="every">Every day</button><button class="${d.days ? 'sel' : ''}" data-act="ck-rep" data-v="days">Some days</button></div>
    ${d.days ? `<div class="ck-wds">${WD.map((l, w) => `<button class="${d.days.includes(w) ? 'sel' : ''}" data-act="ck-wd" data-w="${w}" aria-label="${WD_LONG[w]}" aria-pressed="${d.days.includes(w)}">${l}</button>`).join('')}</div>` : ''}
    <div class="fd-sec-l">Time</div>
    <div class="ck-times">
      ${PARTS.map(p => {
        const on = p.k === 'any' ? !d.at : d.at === p.k;
        return `<button class="${on ? 'sel' : ''}" data-act="ck-time" data-k="${p.k}">${p.n}</button>`;
      }).join('')}
      <label class="ck-exact${exact ? ' sel' : ''}">${icon('clock')}<input id="ck-exact" type="time" value="${exact}" aria-label="Exact time"></label>
    </div>
    <div class="fd-sh-foot">
      ${d.id ? '<button class="fd-btn danger" data-act="ck-del">Delete</button>' : '<button class="fd-btn" data-act="ck-cancel">Cancel</button>'}
      <button class="fd-btn pri" data-act="ck-save">Save</button>
    </div>`;
}

function checksHtml() {
  return sheet.view === 'form' ? formHtml() : listHtml();
}

/* Open the form, fresh or on an existing item. */
function openForm(id, from) {
  const c = id && checksAll().find(x => x.id === id);
  const draft = c ? { id: c.id, n: c.n, days: c.days ? [...c.days] : null, at: c.at || null } : blankItem();
  if (sheet?.kind === 'checks') { Object.assign(sheet, { view: 'form', draft, from: from || sheet.from }); renderSheet(); }
  else openSheet({ kind: 'checks', view: 'form', draft, from });
  if (!c) q('#ck-n')?.focus();
}

/* Back to the list, or shut the sheet when the form was opened from Today. */
function leaveForm() {
  if (sheet.from === 'today') closeSheet();
  else { sheet.view = 'list'; sheet.draft = null; renderSheet(); }
}

function checksAct(act, btn) {
  const d = sheet.draft;
  if (d) d.n = q('#ck-n')?.value ?? d.n;
  if (act === 'ck-new') { openForm(null); return; }
  if (act === 'ck-edit') { openForm(btn.dataset.id); return; }
  if (act === 'ck-cancel') { leaveForm(); return; }
  if (!d) return;
  if (act === 'ck-rep') d.days = btn.dataset.v === 'days' ? (d.days || []) : null;
  else if (act === 'ck-wd') {
    const w = +btn.dataset.w, set = new Set(d.days);
    if (set.has(w)) set.delete(w); else set.add(w);
    d.days = set.size === 7 ? null : [...set].sort((a, b) => a - b);
  } else if (act === 'ck-time') d.at = btn.dataset.k === 'any' ? null : btn.dataset.k;
  else if (act === 'ck-save') { saveItem(); return; }
  else if (act === 'ck-del') {
    const items = checksAll(), i = items.findIndex(x => x.id === d.id), c = items[i];
    if (i < 0) return;
    items.splice(i, 1);
    checksSave(items);
    leaveForm();
    renderToday();
    showUndo(`Removed ${c.n}`, () => { const l = checksAll(); l.splice(Math.min(i, l.length), 0, c); checksSave(l); });
    return;
  } else return;
  renderSheet();
}

function saveItem() {
  const d = sheet.draft, n = (q('#ck-n')?.value || '').trim();
  if (!n) { q('#ck-n')?.focus(); return; }
  if (d.days && !d.days.length) { q('.ck-wds')?.classList.add('need'); return; }
  const items = checksAll();
  const c = d.id && items.find(x => x.id === d.id);
  if (c) {
    const moved = partOf(c.at) !== partOf(d.at);
    Object.assign(c, { n, days: d.days, at: d.at });
    if (moved) { items.splice(items.indexOf(c), 1); place(items, c); }
  } else place(items, { id: uid(), n, days: d.days, at: d.at, from: todayStr() });
  checksSave(items);
  leaveForm();
  renderToday();
}

/* ═══════════════════ WEEK ═══════════════════ */
function weekDays() {
  const t = new Date(todayStr() + 'T12:00:00');
  const mon = shiftDay(todayStr(), -((t.getDay() + 6) % 7) + weekOff * 7);
  return Array.from({ length: 7 }, (_, i) => shiftDay(mon, i));
}
const avgTime = ts => {
  const mins = ts.map(t => +t.slice(0, 2) * 60 + +t.slice(3));
  const a = Math.round(mins.reduce((x, y) => x + y, 0) / mins.length);
  return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
};
const shortDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function renderWeek() {
  const el = q('#fp-week');
  if (!el) return;
  const days = weekDays(), t = todayStr();
  const stats = days.map(d => ({ d, ...dayStats(d), future: d > t }));
  const logged = stats.filter(s => s.n);
  const full = stats.filter(s => s.complete);
  const max = Math.max(BAR_FLOOR, ...full.map(s => s.kcal));

  const chart = !calOn ? '' : `<div class="fd-card">
    <div class="fd-card-h"><span>Calories</span><span class="fd-card-n">${full.length
      ? `avg <b>${fmtK(full.reduce((a, s) => a + s.kcal, 0) / full.length)}</b> over ${full.length} complete ${full.length === 1 ? 'day' : 'days'}`
      : 'no complete days yet'}</span></div>
    <div class="fd-bars">${stats.map(s => {
      const lbl = new Date(s.d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
      const bar = s.complete ? `<i style="height:${Math.max(6, s.kcal / max * 100)}%"></i>`
        : s.n ? '<i class="part" title="Partial day"></i>' : '';
      return `<button class="fd-bar${s.d === t ? ' today' : ''}" data-act="goto" data-d="${s.d}"${s.future ? ' disabled' : ''}>
        <span class="fd-bar-v">${s.complete ? fmtK(s.kcal) : s.n ? '—' : ''}</span>
        <span class="fd-bar-c">${bar}</span><span class="fd-bar-l">${lbl}</span></button>`;
    }).join('')}</div>
    <div class="fd-legend"><span><i></i>complete</span><span><i class="part"></i>partial, not totalled</span></div>
  </div>`;

  const rows = stats.map(s => {
    const meals = new Set(entriesOn(s.d).map(mealOf));
    const ck = s.future ? null : checkCount(s.d);
    const right = !s.n ? '' : !calOn ? `<span class="fd-wk-n">${s.n} ${s.n === 1 ? 'thing' : 'things'}</span>`
      : s.complete ? `<span class="fd-wk-k">${fmtK(s.kcal)}</span>`
      : `<span class="fd-wk-p">partial</span>`;
    return `<button class="fd-wk${s.d === t ? ' today' : ''}" data-act="goto" data-d="${s.d}"${s.future ? ' disabled' : ''}>
      <span class="fd-wk-d"><b>${new Date(s.d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</b> ${+s.d.slice(8)}</span>
      <span class="fd-dots">${MEALS.map(m => `<i class="${meals.has(m.k) ? 'on' : ''}" title="${m.n}">${m.n[0]}</i>`).join('')}</span>
      ${ck ? `<span class="fd-wk-c${ck.done === ck.n ? ' ok' : ''}">${ck.done}/${ck.n}</span>` : ''}
      ${right}
    </button>`;
  }).join('');

  const wk = days.flatMap(entriesOn);
  const sittings = days.flatMap(d => groups(entriesOn(d)));
  const out = sittings.filter(g => g.items.some(e => e.out)).length;
  const counts = new Map();
  wk.forEach(e => counts.set(e.n, (counts.get(e.n) || 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const firsts = logged.map(s => entriesOn(s.d)[0].t), lasts = logged.map(s => entriesOn(s.d).at(-1).t);
  const late = wk.filter(e => e.t >= '22:00' || e.t < '04:00').length;

  const patterns = !wk.length
    ? `<div class="fd-empty"><div class="fd-empty-t">Nothing logged this week</div></div>`
    : `<div class="fd-card">
    <div class="fd-card-h"><span>Patterns</span></div>
    <div class="fd-pat">
      <div><b>${out}</b><span>of ${sittings.length} ${sittings.length === 1 ? 'meal' : 'meals'} eaten out</span></div>
      <div><b>${fmtTime(avgTime(firsts))}</b><span>first bite, on average</span></div>
      <div><b>${fmtTime(avgTime(lasts))}</b><span>last bite, on average</span></div>
      <div><b>${late}</b><span>${late === 1 ? 'thing' : 'things'} after 10 PM</span></div>
    </div>
    <div class="fd-sec-l">Most eaten</div>
    <div class="fd-top">${top.map(([n, c]) => `<div><span>${esc(n)}</span><i style="width:${c / top[0][1] * 100}%"></i><b>${c}×</b></div>`).join('')}</div>
  </div>`;

  el.innerHTML = `
    <div class="fd-daynav">
      <button class="fd-arrow" data-act="week" data-d="-1" aria-label="Previous week">‹</button>
      <div class="fd-day"><b>${weekOff === 0 ? 'This week' : weekOff === -1 ? 'Last week' : 'Week of'}</b><span>${shortDate(days[0])} – ${shortDate(days[6])}</span></div>
      <button class="fd-arrow" data-act="week" data-d="1" aria-label="Next week"${weekOff >= 0 ? ' disabled' : ''}>›</button>
    </div>
    ${chart}
    <div class="fd-card flush">${rows}</div>
    ${patterns}`;
}

/* ═══════════════════ FOODS ═══════════════════ */
function renderFoods() {
  const el = q('#fp-foods');
  if (!el) return;
  const h = history();
  const codes = Object.entries(codesAll()).sort((a, b) => a[1].n.localeCompare(b[1].n));
  const mine = !h.length ? '<div class="fd-find-none">Nothing yet</div>'
    : h.map(x => {
      const k = x.cal ? kcalOf({ q: 1, cal: x.cal }) : null;
      return `<div class="fd-food"><div><div class="fd-food-n">${esc(x.n)}</div><div class="fd-food-s">${x.c}×${calOn ? ' · ' + (x.cal ? calSub({ cal: x.cal }) : 'not counted') : ''}</div></div>
        ${calOn ? `<span class="${k != null ? 'fd-k' : 'fd-addk'}">${k != null ? fmtK(k) : '+ kcal'}</span>` : ''}</div>`;
    }).join('');
  const scanned = codes.map(([code, p]) => {
    const k = kcalOf({ q: 1, cal: packCal(code, p) });
    const kc = k != null ? `<span class="fd-k">${fmtK(k)}</span>` : '<span class="fd-addk">+ kcal</span>';
    return `<div class="fd-food"><div><div class="fd-food-n">${esc(p.n)}</div>
        <div class="fd-food-s">${esc([p.brand, p.src === 'off' ? 'Open Food Facts' : 'label'].filter(Boolean).join(' · '))} · <span class="sc-code sm">${esc(code)}</span></div></div>
        <div class="fd-food-r">${calOn ? kc : ''}<button class="fd-x sm" data-act="forget" data-code="${esc(code)}" aria-label="Forget ${esc(p.n)}">&times;</button></div></div>`;
  }).join('');
  el.innerHTML = `
    <button class="fd-scan" data-act="scan"><span class="fd-scan-i">${icon('scan')}</span><span><b>Scan a barcode</b></span></button>
    ${codes.length ? `<div class="fd-card"><div class="fd-card-h"><span>Scanned products</span><span class="fd-card-n">${codes.length}</span></div><div class="fd-foods">${scanned}</div></div>` : ''}
    <div class="fd-card">
      <div class="fd-card-h"><span>Your foods</span><span class="fd-card-n">${h.length || ''}</span></div>
      <div class="fd-foods">${mine}</div>
    </div>`;
}

/* Forget a saved product. Entries already logged keep their numbers. */
function forgetCode(code) {
  const all = codesAll(), p = all[code];
  if (!p) return;
  delete all[code];
  codesSave(all);
  renderFoods();
  showUndo(`Forgot ${p.n}`, () => { const m = codesAll(); m[code] = p; codesSave(m); });
}

/* ═══════════════════ EVENTS ═══════════════════ */
function switchTab(k) {
  activeTab = k;
  root.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === k));
  root.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'fp-' + k));
  renderAll();
}

function renderAll() {
  renderToday();
  renderWeek();
  renderFoods();
  if (sheet) renderSheet();
  renderSugs();
}

function onClick(e) {
  if (swallowClick) return;
  const btn = e.target.closest('[data-act]');
  if (!btn || !root.contains(btn)) {
    if (e.target.id === 'fd-ov') closeSheet();
    return;
  }
  const act = btn.dataset.act;
  if (act === 'tab') switchTab(btn.dataset.tab);
  else if (act === 'ck-tick') tick(btn.dataset.id);
  else if (act === 'ck-open') openSheet({ kind: 'checks', view: 'list', from: 'list' });
  else if (act === 'ck-quick') openForm(null, 'today');
  else if (act === 'day') { day = shiftDay(day, +btn.dataset.d); if (day > todayStr()) day = todayStr(); renderToday(); }
  else if (act === 'week') { weekOff = Math.min(0, weekOff + +btn.dataset.d); renderWeek(); }
  else if (act === 'goto') { day = btn.dataset.d; switchTab('today'); }
  else if (act === 'open') openSheet({ kind: 'entry', id: btn.dataset.id });
  else if (act === 'close') closeSheet();
  else if (act === 'undo') runUndo();
  else if (act === 'sug') commitLine(sugList[+btn.dataset.i]);
  else if (act === 'send') commitLine();
  else if (act === 'when') { whensOpen = !whensOpen; paintWhen(); }
  else if (act === 'when-pick') pickWhen(btn.dataset.k);
  else if (act === 'scan') startScan();
  else if (act === 'repeat') repeatMeal(btn.dataset.meal);
  else if (act === 'quick') quickAdd(btn.dataset.n);
  else if (act === 'forget') forgetCode(btn.dataset.code);
  else sheetAct(act, btn);
}

function onKeydown(e) {
  if (e.key === 'Escape' && sheet) { closeSheet(); return; }
  if (e.key !== 'Enter') return;
  const id = e.target.id;
  if (id === 'fd-in') { e.preventDefault(); commitLine(); }
  else if (id === 'fd-own-new') { e.preventDefault(); sheetAct('own-set', e.target); }
  else if (id === 'fd-grams') { e.preventDefault(); setGrams(e.target.value); }
  else if (id === 'fd-name') e.target.blur();
  else if (id === 'ck-n') { e.preventDefault(); saveItem(); }
  else if (id === 'sc-name' || id === 'sc-sg1') { e.preventDefault(); saveFound(); }
  else if (id.startsWith('sc-')) { e.preventDefault(); saveLabel(); }
}

function onInput(e) {
  const id = e.target.id;
  if (id === 'fd-in') renderSugs();
  else if (id === 'sc-sg1') {
    const g = num(e.target.value), o = sheet?.off;
    q('#sc-sgk').textContent = o && g > 0 ? `= ${fmtK(g * o.k100 / 100)} kcal` : '';
  }
  else if (id === 'fd-name') sheetName(e.target.value);
  else if (id === 'fd-find') {
    sheetQ = e.target.value;
    const ent = sheet?.kind === 'entry' && entry(sheet.id);
    if (ent) q('#fd-find-res').innerHTML = findHtml(ent);
  } else if (id === 'fd-own') {
    const ent = sheet?.kind === 'entry' && entry(sheet.id), v = num(e.target.value);
    if (ent && v != null) { ent.cal = { s:'own', k: Math.round(v) }; persist(); renderToday(); q('.fd-src-k b').textContent = fmtK(kcalOf(ent)); }
  }
}

function onChange(e) {
  if (e.target.id === 'fd-grams') { setGrams(e.target.value); return; }
  if (e.target.id === 'ck-exact') {
    if (sheet?.draft && e.target.value) { sheet.draft.n = q('#ck-n')?.value ?? sheet.draft.n; sheet.draft.at = e.target.value; renderSheet(); }
    return;
  }
  if (e.target.id === 'fd-when-t') {
    const t = e.target.value;
    if (t) { when = { t, label: fmtTime(t) }; whensOpen = false; paintWhen(); }
    return;
  }
  if (e.target.id !== 'fd-time') return;
  const ent = sheet?.kind === 'entry' && entry(sheet.id);
  if (!ent || !e.target.value) return;
  ent.t = e.target.value;
  delete ent.ap;
  persist();
  renderSheet();
  renderToday();
}

/* ── swipe to delete ──

   Left only, and only once the drag is clearly sideways: a row that
   moved under a vertical scroll would be a row deleted by scrolling.
   The click that ends a drag is swallowed so it never opens the sheet. */
function onDown(e) {
  const grip = e.target.closest('.ck-grip');
  if (grip && e.button <= 0) { startReorder(e, grip); return; }
  const row = e.target.closest('.fd-row');
  if (!row || e.button > 0) return;
  swipe = { row, x: e.clientX, y: e.clientY, dx: 0, on: false };
}
function onMove(e) {
  if (reorder) { moveReorder(e); return; }
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.on) {
    if (Math.abs(dy) > 10) { swipe = null; return; }
    if (dx > -12) return;
    swipe.on = true;
    swipe.row.classList.add('drag');
    swipe.row.setPointerCapture?.(e.pointerId);
  }
  swipe.dx = Math.min(0, dx);
  swipe.row.style.transform = `translateX(${swipe.dx}px)`;
  swipe.row.parentElement.classList.toggle('arm', swipe.dx < -SWIPE);
}
function onUp() {
  if (reorder) { endReorder(); return; }
  if (!swipe) return;
  const s = swipe;
  swipe = null;
  if (!s.on) return;
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 0);
  s.row.classList.remove('drag');
  if (s.dx < -SWIPE) removeEntries([s.row.dataset.id]);
  else { s.row.style.transform = ''; s.row.parentElement.classList.remove('arm'); }
}

/* Settings changed (calories layer), or a backup/reset replaced the data. */
function onDataChange() {
  if (!root) return;
  calOn = calLayer();
  log = logAll();
  if (sheet?.kind === 'entry' && !entry(sheet.id)) closeSheet();
  renderAll();
}

/* ═══════════════════ TEMPLATE + LIFECYCLE ═══════════════════ */
function template() {
  return `<div class="food">
    <nav class="nav"><div class="nav-inner">
      ${TABS.map(t => `<button class="tab" data-act="tab" data-tab="${t.k}">
        <span class="tab-ico">${icon(t.i)}</span><span class="tab-lbl">${t.n}</span>
      </button>`).join('')}
    </div></nav>
    <div class="app-wrap">
      <div class="panel" id="fp-today">
        <div id="fd-today-head"></div>
        <div class="fd-compose">
          <div class="fd-bar-wrap">
            <div class="fd-bar-in">
              <button class="fd-scanbtn" data-act="scan" aria-label="Scan a barcode">${icon('scan')}</button>
              <input id="fd-in" type="text" placeholder="What did you eat?" autocomplete="off" enterkeyhint="done" aria-label="What did you eat?">
              <button class="fd-when" id="fd-when" data-act="when" aria-label="When">${icon('clock')}<span>Now</span></button>
              <button class="fd-send" data-act="send" aria-label="Add">${icon('plus')}</button>
            </div>
            <div class="fd-sugs" id="fd-sugs"></div>
          </div>
          <div class="fd-whens" id="fd-whens"></div>
          <div class="fd-quick" id="fd-quick"></div>
        </div>
        <div id="fd-today-body"></div>
      </div>
      ${TABS.filter(t => t.k !== 'today').map(t => `<div class="panel" id="fp-${t.k}"></div>`).join('')}
    </div>
    <div class="fd-ov" id="fd-ov"><div class="fd-sheet" id="fd-sheet"></div></div>
    <div class="fd-toast" id="fd-toast"></div>
  </div>`;
}

export default {
  id: 'food',
  name: 'Food',
  storagePrefix: 'food_',
  styles: 'apps/food/food.css?v=food-10',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v5a3 3 0 0 0 6 0V3"/><path d="M7 3v18"/><path d="M17 21V3c-2.2 0-4 2.5-4 7v3h4"/></svg>',
  mount(el) {
    root = el;
    log = logAll();
    calOn = calLayer();
    day = todayStr(); weekOff = 0; sheet = null; sheetQ = ''; undo = null;
    root.innerHTML = template();
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    window.addEventListener('bs:datachange', onDataChange);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    syncViewport();
    switchTab(activeTab);
    /* The full USDA list arrives after first paint; until then search
       runs on the common foods, and anything open repaints with it. */
    loadUsda().then(() => { if (!root) return; renderSugs(); if (sheet) renderSheet(); }).catch(() => {});
  },
  unmount() {
    if (root) {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
    }
    window.removeEventListener('bs:datachange', onDataChange);
    window.visualViewport?.removeEventListener('resize', syncViewport);
    window.visualViewport?.removeEventListener('scroll', syncViewport);
    document.documentElement.classList.remove('fd-lock');
    root?.style.removeProperty('--vvh');
    scanMod?.close();
    clearTimeout(undoTimer);
    root = null;
  },
  /* Settings → Danger Zone: what this app holds and how to clear it. */
  resetTargets() {
    const n = logAll().length, c = Object.keys(codesAll()).length, k = checksAll().length;
    return [
      { id: 'log', n: 'Food journal', d: 'Every entry you have logged, on every day.', c: n, cl: `${n} ${n === 1 ? 'entry' : 'entries'}` },
      { id: 'checks', n: 'Checklist', d: 'Your checklist items and every tick.', c: k, cl: `${k} ${k === 1 ? 'item' : 'items'}` },
      { id: 'codes', n: 'Scanned products', d: 'Barcodes saved from scans. Logged entries keep their numbers.', c, cl: `${c} ${c === 1 ? 'product' : 'products'}` },
    ];
  },
  applyReset(ids) {
    if (ids.includes('log')) { remove('food_log'); log = []; }
    if (ids.includes('codes')) remove('food_codes');
    if (ids.includes('checks')) { remove('food_checks'); remove('food_done'); }
  },
};
