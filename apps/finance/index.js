/* ═══════════════════════════════════════════════════════════
   FINANCE APP — where the money goes, and how much of it is left.
   Add (amount · category · custom calendar · note), a filterable
   History with tap-to-view details, Insights (interactive category
   donut + jump-to-any-month/year + 12-month trend), and Net Worth
   (see networth.js) — the total itself, logged over and over.
   Local-first; event-delegated; mount/unmount.
   ═══════════════════════════════════════════════════════════ */

import { DEFAULT_CATS, PALETTE } from './data.js?v=3d-oct14d';
import { load, save, remove, todayStr } from '../../assets/js/storage.js?v=3d-oct14d';
import { toast } from '../../assets/js/ui.js?v=3d-oct14d';
import { renderNetWorth, nwClick, nwKeydown, nwReset } from './networth.js?v=3d-nov17a';

/* ── tab bar ──

   Same shape as the Workout app's: one table drives the buttons, the
   panels and the render dispatch, so the three cannot disagree about
   which tabs exist.

   The icons are declared here rather than imported from the workout
   app. They are drawn to the same recipe — 24×24, stroke, 1.8 width,
   round caps — because the two tab bars should look like one idea, but
   Finance reaching into rank.js for four paths would couple the apps
   over nothing.

   "Net Worth" is the reason this matters here. It is the only two-word
   label in either app, and at 12px uppercase with 0.8px letter-spacing
   it is about 75px in an 86px slot on a phone — the same squeeze the
   workout bar had, arriving one tab sooner. The CSS in finance.css
   stacks the icon over the label below 560px rather than shrinking it. */
const ICO = {
  add:    '<circle cx="12" cy="12" r="9"/><path d="M12 8.5v7"/><path d="M8.5 12h7"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  bars:   '<path d="M3 20h18"/><path d="M6.5 20V12"/><path d="M12 20V5"/><path d="M17.5 20v-5.5"/>',
  trend:  '<polyline points="3 16.5 9 10.5 13 14.5 21 6.5"/><polyline points="15.5 6.5 21 6.5 21 12"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;

const TABS = [
  { k:'add',      n:'Add',       i:'add' },
  { k:'history',  n:'History',   i:'clock' },
  { k:'insights', n:'Insights',  i:'bars' },
  { k:'networth', n:'Net Worth', i:'trend' },
];

/* ── storage ── */
const txAll    = () => load('fin_tx', []);
const txSave   = l => save('fin_tx', l);
const getCats  = () => [...load('fin_cats', DEFAULT_CATS)].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
const catsSave = l => save('fin_cats', l);

/* ── state ── */
let root = null;
let activeTab = 'add';
let editId = null, viewId = null;
/* The tab an edit was opened from, so Cancel can hand you back to it. */
let editFrom = '';
let addingCat = false, managingCats = false, editCat = null;
let selCat = null, newCatColor = PALETTE[0];
/* An empty `date` means "today, whichever day that is" — not today's date
   frozen at the moment the form was drawn. An installed PWA can sit
   resumed in memory overnight, and a date captured at mount would log the
   first expense of the morning on yesterday. Only a day you picked on the
   calendar (or an expense you are editing) pins it. */
let draft = { amt: '', date: '', note: '' };
const blankDraft = () => ({ amt: '', date: '', note: '' });
/* The day the panels were last drawn for — see onResume(). */
let dayKey = '';
/* The last delete, held for the Undo button on its toast. */
let undoDel = null, undoTimer = null;
const UNDO_MS = 4500;
let noteSugs = [];
let calOpen = false, calView = '';
let histMonth = 'all', histCat = 'all', histDay = '', histQ = '';
let histCalOpen = false, histCalView = '';
let insMode = 'month', insMonth = '', insYear = '';
let insPickOpen = false, insPickYear = '';
let insNote = '', insNoteAll = false;

const q = s => root.querySelector(s);
const curMonth = () => todayStr().slice(0, 7);
const curYear  = () => todayStr().slice(0, 4);

/* ── helpers ── */
const uid = () => (crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(16).slice(2)));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtMoney  = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoneyC = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const catColor = name => (getCats().find(c => c.name === name) || {}).color || '#8b92a8';
/* name → colour, read once per render. catColor() parses and sorts the
   whole category list from storage, which is fine for one lookup and
   wasteful for every row of a long History. */
const catMap = () => { const m = {}; getCats().forEach(c => { m[c.name] = c.color; }); return m; };
/* Money is stored in cents' worth of precision — 4.999 typed into a number
   field is $5.00, not a third decimal that every total then carries. */
const cents = n => Math.round(n * 100) / 100;

function fmtDateShort(d) {
  const o = { month: 'short', day: 'numeric' };
  if (d.slice(0, 4) !== curYear()) o.year = 'numeric';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', o);
}
function fmtDateFull(d) {
  const o = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.slice(0, 4) !== curYear()) o.year = 'numeric';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', o);
}
const fmtDateBtn  = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateLong = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
function monthLabel(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
function shiftMonth(ym, delta) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
const sum = l => l.reduce((a, t) => a + t.amt, 0);
function byCategory(list) {
  const map = {};
  list.forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amt; });
  return Object.entries(map).map(([name, amount]) => ({ name, amount, color: catColor(name) })).sort((a, b) => b.amount - a.amount);
}

const CAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

/* ═══════════════════ tx row (note primary, category secondary) ═══════════════════ */
function txRow(t, cm = catMap()) {
  const color = cm[t.cat] || '#8b92a8';
  const primary = t.note ? esc(t.note.split('\n')[0]) : esc(t.cat);
  const secondary = t.note ? `<div class="tx-sub">${esc(t.cat)}</div>` : '';
  return `<div class="tx-row" data-act="view-tx" data-id="${t.id}">
    <span class="tx-dot" style="background:${color}"></span>
    <div class="tx-body"><div class="tx-cat">${primary}</div>${secondary}</div>
    <div class="tx-meta"><div class="tx-amt">${fmtMoney(t.amt)}</div></div>
  </div>`;
}

/* ═══════════════════ ADD TAB ═══════════════════ */
function captureDraft() {
  const a = q('#fx-amount'), n = q('#fx-note');
  if (a) draft.amt = a.value;
  if (n) draft.note = n.value;
}
const reRender = () => { captureDraft(); renderAdd(); };

function calGrid(view) {
  const [y, m] = view.split('-').map(Number);
  const startDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const sel = draft.date || todayStr(), today = todayStr();
  const head = `<div class="cal-head">
    <button class="cal-nav" data-act="cal-shift" data-d="-12" title="Prev year">«</button>
    <button class="cal-nav" data-act="cal-shift" data-d="-1" title="Prev month">‹</button>
    <div class="cal-title">${monthLabel(view)}</div>
    <button class="cal-nav" data-act="cal-shift" data-d="1" title="Next month">›</button>
    <button class="cal-nav" data-act="cal-shift" data-d="12" title="Next year">»</button>
  </div>`;
  const dows = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let day = 1; day <= days; day++) {
    const ds = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const cls = ['cal-day']; if (ds === sel) cls.push('sel'); if (ds === today) cls.push('today');
    cells += `<button class="${cls.join(' ')}" data-act="cal-pick" data-d="${ds}">${day}</button>`;
  }
  return `<div class="fx-cal">${head}<div class="cal-grid">${dows}</div><div class="cal-grid">${cells}</div><div class="cal-foot"><button class="fx-btn gho" data-act="cal-today">Jump to Today</button></div></div>`;
}

function renderAdd() {
  const cats = getCats();
  const all = txAll();
  const editing = editId !== null;
  const date = draft.date || todayStr();

  const chips = cats.map(c => {
    if (managingCats) {
      const ed = c.name === editCat;
      const st = ed ? `border-color:${c.color};box-shadow:0 0 0 1px ${c.color}` : '';
      return `<button class="fx-cat manage ${ed ? 'sel' : ''}" data-act="edit-cat" data-cat="${esc(c.name)}" style="${st}"><span class="fx-dot" style="background:${c.color}"></span>${esc(c.name)}</button>`;
    }
    const on = c.name === selCat;
    const style = on ? `background:${c.color}26;border-color:${c.color};box-shadow:0 0 0 1px ${c.color}` : '';
    return `<button class="fx-cat ${on ? 'sel' : ''}" data-act="pick-cat" data-cat="${esc(c.name)}" data-color="${c.color}" style="${style}"><span class="fx-dot" style="background:${c.color}"></span>${esc(c.name)}${on ? '<span class="fx-check">✓</span>' : ''}</button>`;
  }).join('');

  /* Deleting a category leaves its label on the expenses that used it. Edit
     one of those and there is no chip for that label, so nothing showed as
     selected and keeping it was impossible. Offer the old label as a chip
     of its own for as long as the edit is open, so saving can keep it. */
  const orphan = (editing && !managingCats) ? (all.find(t => t.id === editId) || {}).cat : null;
  const orphanChip = (orphan && !cats.some(c => c.name === orphan)) ? (() => {
    const on = selCat === orphan, col = '#8b92a8';
    const style = on ? `background:${col}26;border-color:${col};box-shadow:0 0 0 1px ${col}` : '';
    return `<button class="fx-cat ${on ? 'sel' : ''}" data-act="pick-cat" data-cat="${esc(orphan)}" data-color="${col}" style="${style}" title="No longer a category, kept on this expense"><span class="fx-dot" style="background:${col}"></span>${esc(orphan)}${on ? '<span class="fx-check">✓</span>' : ''}</button>`;
  })() : '';

  const catExtra = managingCats
    ? ''
    : `<button class="fx-cat fx-cat-new" data-act="new-cat-open">＋ New</button>`;

  const newCatBlock = addingCat ? `
    <div class="fx-newcat">
      <input class="fx-newcat-in" id="fx-newcat-in" placeholder="New category name" maxlength="24" autocomplete="off">
      <div class="fx-sw-lbl">Color <span class="fx-opt">(tap the wheel for any color)</span></div>
      <div class="fx-sw-row">
        ${PALETTE.map(c => `<button class="fx-sw ${c.toLowerCase() === newCatColor.toLowerCase() ? 'sel' : ''}" data-act="new-cat-color" data-c="${c}" style="background:${c}"></button>`).join('')}
        <span class="fx-color-wrap"><input type="color" class="fx-color" id="fx-color" value="${newCatColor}" title="Pick any color"></span>
      </div>
      <div class="fx-newcat-btns"><button class="fx-btn pri" data-act="new-cat-save">Add Category</button><button class="fx-btn gho" data-act="new-cat-cancel">Cancel</button></div>
    </div>` : '';

  const editCatBlock = (managingCats && editCat && cats.some(c => c.name === editCat)) ? `
    <div class="fx-newcat">
      <input class="fx-newcat-in" id="fx-editcat-in" value="${esc(editCat)}" maxlength="24" autocomplete="off">
      <div class="fx-sw-lbl">Color <span class="fx-opt">(tap the wheel for any color)</span></div>
      <div class="fx-sw-row">
        ${PALETTE.map(c => `<button class="fx-sw ${c.toLowerCase() === newCatColor.toLowerCase() ? 'sel' : ''}" data-act="new-cat-color" data-c="${c}" style="background:${c}"></button>`).join('')}
        <span class="fx-color-wrap"><input type="color" class="fx-color" id="fx-color" value="${newCatColor}" title="Pick any color"></span>
      </div>
      <div class="fx-newcat-btns"><button class="fx-btn pri" data-act="editcat-save">Save</button><button class="fx-btn danger" data-act="editcat-del">Delete</button><button class="fx-btn gho" data-act="editcat-cancel">Cancel</button></div>
    </div>` : '';

  const manageHint = (managingCats && !editCat) ? '<div class="fx-manage-hint">Tap a category to rename, recolor, or delete it.</div>' : '';

  const today = all.filter(t => t.d === todayStr());
  const month = all.filter(t => t.d.startsWith(curMonth()));

  let h = `
    <div class="fx-form ${editing ? 'editing' : ''}">
      <div class="fx-form-title"><span>${editing ? 'Edit Expense' : 'New Expense'}</span>${editing ? '<span class="fx-editing-tag">Editing</span>' : ''}</div>
      <div class="fx-amount-wrap"><span class="fx-cur">$</span><input class="fx-amount" id="fx-amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${draft.amt}"></div>

      <div class="fx-lbl fx-lbl-row"><span>Category</span><button class="fx-manage" data-act="cat-manage">${managingCats ? 'Done' : 'Manage'}</button></div>
      <div class="fx-cats">${orphanChip}${chips}${catExtra}</div>
      ${manageHint}${newCatBlock}${editCatBlock}

      <div class="fx-field fx-field-b"><div class="fx-lbl">Date</div><button class="fx-datebtn ${calOpen ? 'open' : ''}" data-act="cal-toggle"><span>${fmtDateBtn(date)}</span>${CAL_SVG}</button></div>
      ${calOpen ? calGrid(calView) : ''}
      <div class="fx-field fx-field-b"><div class="fx-lbl">Note <span class="fx-opt">(optional)</span></div><textarea class="fx-in fx-note" id="fx-note" rows="1" placeholder="e.g. Costco" maxlength="200">${esc(draft.note)}</textarea><div class="fx-sug" id="fx-sug"></div></div>

      <div class="fx-actions">
        <button class="fx-btn pri" data-act="save-tx">${editing ? 'Update Expense' : 'Add Expense'}</button>
        ${editing ? '<button class="fx-btn gho" data-act="cancel-edit">Cancel</button>' : ''}
      </div>
    </div>`;

  if (!editing) {
    h += `<div class="fx-stats two">
      <div class="fx-stat"><div class="fx-stat-v">${fmtMoneyC(sum(today))}</div><div class="fx-stat-l">Today</div></div>
      <div class="fx-stat accent"><div class="fx-stat-v">${fmtMoneyC(sum(month))}</div><div class="fx-stat-l">This Month</div></div>
    </div>`;

    // Today's expenses
    const todayList = today.slice().reverse(), cm = catMap();
    h += `<div class="day-card"><div class="day-top"><div class="day-top-l"><span class="day-badge" style="background:var(--green)">Today</span><span class="day-title">${todayList.length} ${todayList.length===1?'Expense':'Expenses'}</span></div></div>`;
    h += todayList.length ? `<div class="tx-list">${todayList.map(t => txRow(t, cm)).join('')}</div>` : `<div class="fx-empty" style="padding:26px 16px">Nothing logged today yet.</div>`;
    h += `</div>`;
  }

  q('#fp-add').innerHTML = h;
  sizeNote();
}

function sizeNote() {
  const el = q('#fx-note');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden';
}

/* Note autocomplete — notes you've written before, matched against what
   you're typing. Prefix matches outrank substring matches; ties break by
   how often the note recurs, then by how recently. Picking one fills the
   field, so "Costco" is two keys and a tap after the first time. */
function noteMatches(query) {
  const qq = query.trim().toLowerCase();
  if (!qq) return [];
  const stats = new Map();
  txAll().forEach(t => {
    const note = (t.note || '').trim();
    if (!note) return;
    const k = note.toLowerCase();
    const s = stats.get(k);
    if (s) { s.count++; if (t.d > s.last) { s.last = t.d; s.note = note; } }
    else stats.set(k, { note, count: 1, last: t.d });
  });
  const tier = s => {
    const k = s.note.toLowerCase();
    if (k === qq) return -1;  // already typed in full — nothing to fill
    if (k.startsWith(qq)) return 0;
    if (k.includes(qq)) return 1;
    return -1;
  };
  return [...stats.values()]
    .map(s => ({ ...s, tier: tier(s) }))
    .filter(s => s.tier >= 0)
    .sort((a, b) => a.tier - b.tier || b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, 5);
}

function hideNoteSugs() {
  noteSugs = [];
  const box = q('#fx-sug');
  if (box) { box.innerHTML = ''; box.classList.remove('on'); }
}

function renderNoteSugs() {
  const box = q('#fx-sug'), el = q('#fx-note');
  if (!box || !el) return;
  noteSugs = noteMatches(el.value);
  if (!noteSugs.length) { hideNoteSugs(); return; }
  box.innerHTML = noteSugs.map((s, i) =>
    `<button class="fx-sug-row" data-act="note-sug" data-i="${i}"><span class="fx-sug-t">${esc(s.note.split('\n')[0])}</span>${s.count > 1 ? `<span class="fx-sug-n">×${s.count}</span>` : ''}</button>`).join('');
  box.classList.add('on');
}

function pickNoteSug(i) {
  const s = noteSugs[+i], el = q('#fx-note');
  if (!s || !el) return;
  el.value = s.note;
  draft.note = s.note;
  /* A past note usually means a past purchase, so the rest of it comes
     along — but only into what is still blank. Whatever you already chose
     or typed outranks a guess from history. The category is the one used
     last time (if it still exists); the amount only when every past entry
     under this note cost the same, since an average would be a number you
     never actually paid. */
  const k = s.note.trim().toLowerCase();
  const past = txAll().filter(t => (t.note || '').trim().toLowerCase() === k);
  if (past.length) {
    const last = past.reduce((a, t) => (t.d >= a.d ? t : a));
    if (!selCat && !managingCats && getCats().some(c => c.name === last.cat)) pickCat(last.cat);
    const amt = q('#fx-amount');
    if (amt && amt.value === '' && past.every(t => t.amt === past[0].amt)) { amt.value = String(past[0].amt); draft.amt = amt.value; }
  }
  hideNoteSugs();
  sizeNote();
  el.focus();
}

function pickCat(name) {
  selCat = name;
  root.querySelectorAll('.fx-cat[data-cat]').forEach(c => {
    const on = c.dataset.cat === name;
    c.classList.toggle('sel', on);
    c.style.background = on ? c.dataset.color + '26' : '';
    c.style.borderColor = on ? c.dataset.color : '';
    c.style.boxShadow = on ? `0 0 0 1px ${c.dataset.color}` : '';
    const chk = c.querySelector('.fx-check');
    if (on && !chk) c.insertAdjacentHTML('beforeend', '<span class="fx-check">✓</span>');
    if (!on && chk) chk.remove();
  });
}
function openNewCat() { managingCats = false; editCat = null; addingCat = true; reRender(); setTimeout(() => q('#fx-newcat-in')?.focus(), 40); }
function cancelNewCat() { addingCat = false; reRender(); }
function updateNewColor(val) {
  newCatColor = val;
  const w = q('#fx-color'); if (w && w.value.toLowerCase() !== val.toLowerCase()) w.value = val;
  root.querySelectorAll('.fx-sw').forEach(s => s.classList.toggle('sel', (s.dataset.c || '').toLowerCase() === val.toLowerCase()));
}
function saveNewCat() {
  const name = (q('#fx-newcat-in')?.value || '').trim();
  if (!name) { toast('Name the category'); return; }
  const cats = getCats();
  if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast('That category exists'); return; }
  cats.push({ name, color: newCatColor });
  catsSave(cats);
  selCat = name; addingCat = false;
  newCatColor = PALETTE[cats.length % PALETTE.length];
  reRender();
  toast(`Added “${name}”`);
}
function openEditCat(name) {
  const c = getCats().find(x => x.name === name); if (!c) return;
  editCat = name; addingCat = false; newCatColor = c.color;
  reRender();
  setTimeout(() => { const el = q('#fx-editcat-in'); if (el) { el.focus(); el.select?.(); } }, 40);
}
function saveEditCat() {
  const oldName = editCat; if (!oldName) return;
  const newName = (q('#fx-editcat-in')?.value || '').trim();
  if (!newName) { toast('Name cannot be empty'); return; }
  const cats = getCats();
  if (newName.toLowerCase() !== oldName.toLowerCase() && cats.some(c => c.name.toLowerCase() === newName.toLowerCase())) { toast('That name already exists'); return; }
  catsSave(cats.map(c => c.name === oldName ? { name: newName, color: newCatColor } : c));
  if (newName !== oldName) {
    txSave(txAll().map(t => t.cat === oldName ? { ...t, cat: newName } : t));  // migrate existing expenses
    if (selCat === oldName) selCat = newName;
    if (histCat === oldName) histCat = newName;
  }
  editCat = null;
  renderAll();
  toast('Category updated');
}
function editCatDelete() {
  const name = editCat; if (!name) return;
  const used = txAll().filter(t => t.cat === name).length;
  const msg = used ? `Delete “${name}”?\n\n${used} expense${used>1?'s':''} use it. They keep the label but lose the color.` : `Delete “${name}”?`;
  if (!confirm(msg)) return;
  catsSave(getCats().filter(c => c.name !== name));
  if (selCat === name) selCat = null;
  editCat = null;
  renderAll();
  toast(`Deleted “${name}”`);
}

function saveTx() {
  const val = cents(parseFloat(q('#fx-amount').value));
  if (!selCat) { toast('Pick a category'); return; }
  if (isNaN(val) || val <= 0) { toast('Enter an amount'); return; }
  const date = draft.date || todayStr();   // resolved now, not when the form was drawn
  const note = (q('#fx-note').value || '').trim();

  const list = txAll();
  if (editId) {
    const i = list.findIndex(t => t.id === editId);
    if (i >= 0) list[i] = { ...list[i], d: date, cat: selCat, amt: val, note };
    txSave(list);
    editId = null; editFrom = ''; calOpen = false; draft = blankDraft();
    renderAll(false); switchTab('history');
    toast('Updated');
  } else {
    list.push({ id: uid(), d: date, cat: selCat, amt: val, note });
    txSave(list);
    calOpen = false; draft = blankDraft();  // reset to today; keep category for fast repeat
    renderAll(false);
    toast(`Logged ${fmtMoney(val)}`);
    q('#fx-amount')?.focus();
  }
}

function editTx(id) {
  const t = txAll().find(x => x.id === id); if (!t) return;
  /* switchTab first: leaving Add mid-edit drops that edit, and this one
     has not started yet. */
  const from = activeTab;
  switchTab('add');
  editId = id; editFrom = from; selCat = t.cat; addingCat = false; managingCats = false; calOpen = false;
  draft = { amt: String(t.amt), date: t.d, note: t.note || '' };
  renderAdd();
  setTimeout(() => q('#fx-amount')?.focus(), 40);
}
/* An edit only lives on the Add tab. Walking away from it used to leave
   the form saying "Update Expense" with the stats hidden, waiting for the
   next thing typed there to overwrite an old entry by surprise — so
   leaving the tab drops the edit, exactly as Cancel would. */
function dropEdit() { editId = null; editFrom = ''; selCat = null; calOpen = false; draft = blankDraft(); hideNoteSugs(); renderAdd(); }
function cancelEdit() {
  const back = editFrom;
  dropEdit();
  if (back === 'history') switchTab('history');   // hand you back where the edit began
}
function delTx(id) {
  const list = txAll(), i = list.findIndex(x => x.id === id), t = list[i]; if (!t) return;
  if (!confirm(`Delete ${fmtMoney(t.amt)}, ${t.cat}?`)) return;
  txSave(list.filter(x => x.id !== id));
  const wasEditing = editId === id;
  if (wasEditing) { editId = null; editFrom = ''; draft = blankDraft(); }
  renderAll(!wasEditing);
  showUndo(`Deleted ${fmtMoney(t.amt)}, ${t.cat}`, { t, i });
}

/* ═══════════════════ UNDO TOAST ═══════════════════
   The suite's toast has no button, and an undo you cannot tap is not one.
   The confirm() stays — this is the way back from a yes you didn't mean.
   The expense goes back where it was in the log, under its old id, so the
   Today list and History order come back exactly as they were. */
function showUndo(msg, del) {
  undoDel = del;
  const el = q('#fx-toast'); if (!el) return;
  el.innerHTML = `<span>${esc(msg)}</span><button data-act="undo-del">Undo</button>`;
  el.classList.add('on');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, UNDO_MS);
}
function hideUndo() {
  clearTimeout(undoTimer); undoTimer = null; undoDel = null;
  q('#fx-toast')?.classList.remove('on');
}
function runUndo() {
  const u = undoDel; hideUndo();
  if (!u) return;
  const list = txAll();
  if (list.some(x => x.id === u.t.id)) return;   // already back
  list.splice(Math.min(u.i, list.length), 0, u.t);
  txSave(list);
  renderAll();
  toast('Restored');
}

/* ═══════════════════ DETAIL MODAL ═══════════════════ */
function viewTx(id) {
  const t = txAll().find(x => x.id === id); if (!t) return;
  viewId = id;
  const color = catColor(t.cat);
  q('#fx-modal-body').innerHTML = `
    <div class="fx-ov-head"><div class="fx-ov-amt">${fmtMoney(t.amt)}</div><button class="mm-close" data-act="modal-close">&times;</button></div>
    <div class="fx-ov-cat"><span class="tx-dot" style="background:${color}"></span>${esc(t.cat)}</div>
    <div class="fx-ov-rows">
      <div class="fx-ov-row"><span>Date</span><b>${fmtDateLong(t.d)}</b></div>
      <div class="fx-ov-row"><span>Note</span><b class="fx-ov-note">${t.note ? esc(t.note) : '—'}</b></div>
    </div>
    <div class="fx-ov-actions">
      <button class="fx-btn gho" data-act="modal-edit" data-id="${t.id}">Edit</button>
      <button class="fx-btn danger" data-act="modal-del" data-id="${t.id}">Delete</button>
    </div>`;
  q('#fx-modal').classList.add('on');
}
function closeModal() { q('#fx-modal').classList.remove('on'); viewId = null; }

/* A month at a glance, each day carrying what it cost. The old control here
   was a bare <input type="date"> whose picker button `appearance:none` had
   stripped away, so it looked like an empty strip and did nothing when
   tapped. A calendar answers the same question and shows the answer without
   being asked — you can see which days were expensive before picking one. */
function histCalHTML(all) {
  const view = histCalView || (histDay || todayStr()).slice(0, 7);
  const [y, m] = view.split('-').map(Number);
  const startDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const today = todayStr();

  const spend = {};
  all.forEach(t => { if (t.d.startsWith(view)) spend[t.d] = (spend[t.d] || 0) + t.amt; });
  const peak = Math.max(0, ...Object.values(spend));

  const dows = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let day = 1; day <= days; day++) {
    const ds = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const amt = spend[ds] || 0;
    /* opacity carries relative spend, so a heavy day reads as heavy */
    const heat = peak ? 0.14 + (amt / peak) * 0.5 : 0;
    const cls = ['cal-day', 'fx-cal-d'];
    if (ds === histDay) cls.push('sel');
    if (ds === today) cls.push('today');
    if (!amt) cls.push('none');
    cells += `<button class="${cls.join(' ')}" data-act="hist-day-pick" data-d="${ds}"
        ${amt ? `style="--heat:${heat.toFixed(2)}"` : ''} title="${fmtDateLong(ds)}${amt ? ', ' + fmtMoney(amt) : ', nothing logged'}">
      <span class="fx-cal-n">${day}</span>
      <span class="fx-cal-a">${amt ? (amt >= 1000 ? Math.round(amt/1000) + 'k' : Math.round(amt)) : ''}</span>
    </button>`;
  }

  const monthTotal = Object.values(spend).reduce((a, n) => a + n, 0);
  const daysWith = Object.keys(spend).length;
  return `<div class="fx-cal fx-histcal">
    <div class="cal-head">
      <button class="cal-nav" data-act="hist-cal-shift" data-d="-1" title="Previous month">‹</button>
      <div class="cal-title">${monthLabel(view)}</div>
      <button class="cal-nav" data-act="hist-cal-shift" data-d="1" title="Next month">›</button>
    </div>
    <div class="cal-grid">${dows}</div>
    <div class="cal-grid">${cells}</div>
    <div class="fx-cal-foot">
      <span>${fmtMoney(monthTotal)} this month</span>
      <span>${daysWith} day${daysWith === 1 ? '' : 's'} with spending</span>
    </div>
  </div>`;
}

/* ═══════════════════ HISTORY TAB ═══════════════════ */
function renderHistory() {
  const all = txAll();
  const months = [...new Set(all.map(t => t.d.slice(0, 7)).concat(histMonth === 'all' ? [] : [histMonth]))].sort().reverse();
  /* Every label an expense actually carries — including ones whose category
     was deleted, which keep their label (see editCatDelete) and would
     otherwise be impossible to filter to. Same order the chips use. */
  const used = new Set(all.map(t => t.cat));
  const cats = [...used].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const monthOpts = ['<option value="all">All time</option>']
    .concat(months.map(m => `<option value="${m}" ${m === histMonth ? 'selected' : ''}>${monthLabel(m)}</option>`)).join('');
  const catOpts = ['<option value="all">All categories</option>']
    .concat(cats.map(c => `<option value="${esc(c)}" ${c === histCat ? 'selected' : ''}>${esc(c)}</option>`)).join('');

  /* A single day is a different question from a month, so the controls say
     which one you're looking at rather than leaving both half-applied. */
  const h = `<div class="fx-filters">
      <select class="fx-select" id="hist-month" ${histDay ? 'disabled' : ''}>${monthOpts}</select>
      <select class="fx-select" id="hist-cat">${catOpts}</select>
      <button class="fx-calbtn ${histCalOpen ? 'on' : ''}" data-act="hist-cal" title="Pick a day">${CAL_SVG}</button>
    </div>
    <div class="fx-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="hist-q" type="search" placeholder="Search notes" value="${esc(histQ)}" autocomplete="off">
      ${histQ ? HIST_Q_X : ''}
    </div>
    ${histCalOpen ? histCalHTML(all) : ''}
    ${histDay ? `<div class="fx-dayon">
        <div><div class="fx-dayon-l">Showing one day</div><div class="fx-dayon-d">${fmtDateLong(histDay)}</div></div>
        <button class="fx-dayon-x" data-act="hist-day-clear">Show the month</button>
      </div>` : ''}`;
  q('#fp-history').innerHTML = h + `<div id="hist-res">${histResultsHTML(all)}</div>`;
}

const HIST_Q_X = '<button class="fx-search-x" data-act="hist-q-clear" title="Clear search">&times;</button>';

/* Typing in the search box repaints only what it changes: the results, and
   whether the clear button shows. Rebuilding the whole tab threw the input
   away on every key, and handing focus and the caret back by hand fought
   iOS autocorrect, which was mid-word in the element that just vanished. */
function renderHistoryResults() {
  const res = q('#hist-res'), box = q('#fp-history .fx-search');
  if (!res || !box) { renderHistory(); return; }
  res.innerHTML = histResultsHTML(txAll());
  const x = box.querySelector('.fx-search-x');
  if (histQ && !x) box.insertAdjacentHTML('beforeend', HIST_Q_X);
  else if (!histQ && x) x.remove();
}

function histResultsHTML(all) {
  let filtered = all.slice();
  if (histDay)             filtered = filtered.filter(t => t.d === histDay);
  else if (histMonth !== 'all') filtered = filtered.filter(t => t.d.startsWith(histMonth));
  if (histCat !== 'all')   filtered = filtered.filter(t => t.cat === histCat);
  const qq = histQ.trim().toLowerCase();
  if (qq) filtered = filtered.filter(t =>
    (t.note || '').toLowerCase().includes(qq) || t.cat.toLowerCase().includes(qq));
  filtered.sort((a, b) => b.d.localeCompare(a.d));

  const label = histDay ? fmtDateLong(histDay) : null;
  let h = `<div class="fx-stats">
    <div class="fx-stat accent"><div class="fx-stat-v">${fmtMoneyC(sum(filtered))}</div><div class="fx-stat-l">${label ? 'Spent That Day' : 'Total'}</div></div>
    <div class="fx-stat"><div class="fx-stat-v">${filtered.length}</div><div class="fx-stat-l">Purchases</div></div>
    <div class="fx-stat"><div class="fx-stat-v">${filtered.length ? fmtMoneyC(sum(filtered) / filtered.length) : '$0'}</div><div class="fx-stat-l">Avg / Buy</div></div>
  </div>`;

  if (!filtered.length) {
    const why = !all.length ? 'No expenses logged yet.<br>Add your first on the Add tab.'
              : qq         ? `No notes or categories match “${esc(histQ.trim())}”${histDay ? ` on ${label}` : histMonth !== 'all' ? ` in ${monthLabel(histMonth)}` : ''}.`
              : histDay    ? `Nothing logged on ${label}.`
              : histMonth !== 'all' && histCat === 'all' ? `Nothing logged in ${monthLabel(histMonth)}.`
              :              'Nothing matches these filters.';
    return h + `<div class="fx-empty">${why}</div>`;
  }

  /* Every day carries its own total. That is the number you actually want
     when scanning back through a month, and it costs one row to show. */
  const dayTotals = {}, cm = catMap();
  filtered.forEach(t => { dayTotals[t.d] = (dayTotals[t.d] || 0) + t.amt; });

  h += `<div class="day-card"><div class="tx-list">`;
  let lastDate = null;
  filtered.forEach(t => {
    if (t.d !== lastDate) {
      /* tapping the header narrows to that one day — the fastest path to
         "what did I spend on this day" is the day already on screen */
      h += `<div class="tx-group ${histDay ? 'solo' : ''}" ${histDay ? '' : `data-act="hist-day-pick" data-d="${t.d}"`}>
        <span class="tx-group-d">${fmtDateFull(t.d)}${histDay ? '' : '<i class="tx-group-go">›</i>'}</span>
        <span class="tx-group-t">${fmtMoney(dayTotals[t.d])}</span>
      </div>`;
      lastDate = t.d;
    }
    h += txRow(t, cm);
  });
  return h + `</div></div>`;
}

/* ═══════════════════ INSIGHTS TAB ═══════════════════ */
function donutSVG(segs, total) {
  const r = 58, cx = 80, cy = 80, sw = 20, C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segs.map(s => {
    const f = s.amount / total, len = Math.max(f * C - 2, 0.001), off = -acc * C, pct = (f * 100).toFixed(0);
    acc += f;
    return `<circle class="fx-arc" data-act="arc" data-name="${esc(s.name)}" data-amt="${fmtMoneyC(s.amount)}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"><title>${esc(s.name)}: ${fmtMoney(s.amount)} (${pct}%)</title></circle>`;
  }).join('');
  return `<svg viewBox="0 0 160 160"><g transform="rotate(-90 ${cx} ${cy})"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${sw}"/>${arcs}</g></svg>`;
}
/* Bars in an SVG stretched to the card, month labels in HTML under it —
   the same split as the Net Worth chart (see networth.js). Inside the
   stretched SVG the labels were squashed to slivers on a phone, and the
   colours were Midnight's hex baked in, so on Daylight an empty month drew
   as a dark slab. The fills are classes now (finance.css), on the theme's
   own tokens; on Midnight they resolve to exactly the old colours. */
function trendSVG(months) {
  const max = Math.max(...months.map(m => m.total), 1);
  const W = 600, H = 174, PADL = 6, PADR = 6, PADT = 12;
  const innerW = W - PADL - PADR, innerH = H - PADT, n = months.length, slot = innerW / n, bw = slot * 0.58;
  let bars = '', labels = '';
  months.forEach((m, i) => {
    const x = PADL + slot * i + (slot - bw) / 2, hgt = (m.total / max) * innerH, y = PADT + innerH - hgt;
    const hot = insMode === 'month' && m.ym === insMonth;
    const cls = hot ? 'hot' : (m.total ? 'has' : 'nil');
    bars += `<rect class="fx-tb ${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(hgt,1).toFixed(1)}" rx="3" style="cursor:pointer" data-act="ins-bar" data-ym="${m.ym}"><title>${monthLabel(m.ym)}: ${fmtMoney(m.total)}</title></rect>`;
    /* every other month, counted back from the current one, so each label
       has room to be a word rather than a letter */
    if ((n - 1 - i) % 2 === 0) labels += `<span style="left:${((x + bw / 2) / W * 100).toFixed(2)}%">${m.short}</span>`;
  });
  return `<div class="fx-trend"><svg class="fx-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="fx-trend-x">${labels}</div></div>`;
}
function last12() {
  const all = txAll(), out = [];
  let ym = curMonth();
  for (let i = 0; i < 12; i++) { out.unshift(ym); ym = shiftMonth(ym, -1); }
  return out.map(ym => {
    const [y, m] = ym.split('-').map(Number);
    return { ym, short: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }), total: sum(all.filter(t => t.d.startsWith(ym))) };
  });
}
function insPicker() {
  if (insMode === 'month') {
    const yr = insPickYear;
    const grid = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((mn, i) => {
      const ym = `${yr}-${String(i+1).padStart(2,'0')}`, dis = ym > curMonth(), on = ym === insMonth;
      return `<button class="ins-mo ${on ? 'sel' : ''}" data-act="ins-pick-month" data-ym="${ym}" ${dis ? 'disabled' : ''}>${mn}</button>`;
    }).join('');
    return `<div class="fx-picker"><div class="cal-head"><button class="cal-nav" data-act="ins-pick-year" data-d="-1">‹</button><div class="cal-title">${yr}</div><button class="cal-nav" data-act="ins-pick-year" data-d="1" ${+yr >= +curYear() ? 'disabled' : ''}>›</button></div><div class="ins-mo-grid">${grid}</div></div>`;
  }
  const years = []; for (let y = +curYear(); y >= +curYear() - 9; y--) years.push(y);
  return `<div class="fx-picker"><div class="ins-mo-grid">${years.map(y => `<button class="ins-mo ${String(y) === insYear ? 'sel' : ''}" data-act="ins-pick-yr" data-y="${y}">${y}</button>`).join('')}</div></div>`;
}
/* ═══════════════════ WHERE THE MONEY GOES (notes) ═══════════════════ */
/* The category says "Groceries". The note says "Costco". Grouping by the note
   is what turns a pile of rows into "10 trips, $412" — which is the question
   people actually ask about their own spending, and the one the category
   donut structurally cannot answer.

   Matching is on a normalised first line, so "Trader Joe's", "trader joes"
   and "Trader Joes " are one place rather than three. Deliberately no fuzzy
   matching beyond that: "Costco" and "Costco gas" are arguably different
   trips, and a grouping you can't predict is worse than one you can. */
const firstLine = t => (t.note || '').split('\n')[0].trim();
const noteKey = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
const daysApart = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
/* The sparkline spans a year, so its end labels need the year on them —
   "September … August" alone reads as five months, backwards. */
const ymShort = ym => {
  const [y, m] = ym.split('-').map(Number);
  return `${new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })} '${String(y).slice(2)}`;
};

function noteGroups(list) {
  const map = new Map();
  list.forEach(t => {
    const raw = firstLine(t), k = noteKey(raw);
    if (!k) return;
    let g = map.get(k);
    if (!g) map.set(k, g = { key: k, label: raw, total: 0, count: 0, cats: {} });
    g.total += t.amt; g.count++;
    g.cats[t.cat] = (g.cats[t.cat] || 0) + t.amt;
  });
  return [...map.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}
const topCat = g => Object.entries(g.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

/* The rows above follow the period selector; this panel does not. "How much
   have I ever spent at Costco, and is it climbing" is a different question
   from "what did July cost", and scoping it to the period would leave the
   sparkline redrawing itself every time you paged a month. */
function noteDetailHTML(g, color) {
  const mine = txAll().filter(t => noteKey(firstLine(t)) === g.key);
  if (!mine.length) return '';

  const months = []; let ym = curMonth();
  for (let i = 0; i < 12; i++) { months.unshift(ym); ym = shiftMonth(ym, -1); }
  const rows = months.map(m => ({ ym: m, total: sum(mine.filter(t => t.d.startsWith(m))) }));
  const peak = Math.max(...rows.map(r => r.total), 1);
  const bars = rows.map(r => `<i style="height:${Math.max(2, r.total / peak * 100).toFixed(1)}%;${
    r.total ? `background:${color}` : ''}" class="${r.total ? '' : 'nil'}"
    title="${monthLabel(r.ym)}, ${r.total ? fmtMoney(r.total) : 'nothing'}"></i>`).join('');

  const ds = mine.map(t => t.d).sort();
  const first = ds[0], last = ds[ds.length - 1];
  const span = daysApart(first, last);
  const every = mine.length > 1 && span > 0 ? Math.round(span / (mine.length - 1)) : null;
  const cats = Object.entries(g.cats).sort((a, b) => b[1] - a[1]);

  return `<div class="fx-nt-det">
    <div class="fx-nt-spark">${bars}</div>
    <div class="fx-nt-spark-l"><span>${ymShort(rows[0].ym)}</span><span>Last 12 months</span><span>${ymShort(rows[11].ym)}</span></div>
    <div class="fx-nt-rows">
      <div><span>All time</span><b>${fmtMoney(sum(mine))}, ${mine.length} purchase${mine.length === 1 ? '' : 's'}</b></div>
      <div><span>Largest</span><b>${fmtMoney(Math.max(...mine.map(t => t.amt)))}</b></div>
      <div><span>First</span><b>${fmtDateShort(first)}</b></div>
      <div><span>Latest</span><b>${fmtDateShort(last)}, ${daysApart(last, todayStr())} days ago</b></div>
      ${every ? `<div><span>Cadence</span><b>about every ${every} day${every === 1 ? '' : 's'}</b></div>` : ''}
      ${cats.length > 1 ? `<div><span>Categories</span><b>${cats.map(([n, v]) => `${esc(n)} ${fmtMoney(v)}`).join(', ')}</b></div>` : ''}
    </div>
    <button class="fx-leg-go fx-nt-go" data-act="ins-see-note" data-q="${esc(g.label)}">See these expenses ›</button>
  </div>`;
}

function noteRowHTML(g, peak) {
  const color = catColor(topCat(g));
  const open = insNote === g.key;
  return `<div class="fx-nt ${open ? 'open' : ''}">
    <button class="fx-nt-hd" data-act="ins-note" data-k="${g.key}">
      <span class="fx-nt-top">
        <span class="fx-nt-n">${esc(g.label)}</span>
        <span class="fx-nt-c">×${g.count}</span>
        <span class="fx-nt-t">${fmtMoney(g.total)}</span>
      </span>
      <span class="fx-nt-bar"><i style="width:${(peak ? g.total / peak * 100 : 0).toFixed(1)}%;background:${color}"></i></span>
    </button>
    ${open ? noteDetailHTML(g, color) : ''}
  </div>`;
}

function noteTrendHTML(list) {
  const groups = noteGroups(list);
  const repeat = groups.filter(g => g.count >= 2);

  if (!repeat.length) {
    const why = !list.length
      ? 'No spending in this period.'
      : !groups.length
      ? 'Add a note like “Costco” to your expenses and repeats add up here.'
      : 'No repeated notes in this period yet.';
    return `<div class="fx-nt-card">
      <div class="fx-chart-title">Where It Keeps Going</div>
      <div class="fx-empty" style="padding:24px 8px">${why}</div>
    </div>`;
  }

  const shown = insNoteAll ? repeat : repeat.slice(0, 6);
  const peak = repeat[0].total;
  /* The card is the list. A summary line over it, three facts under each
     row and a sentence under the lot all restated what the rows show. */
  return `<div class="fx-nt-card">
    <div class="fx-chart-title">Where It Keeps Going</div>
    <div class="fx-nt-list">${shown.map(g => noteRowHTML(g, peak)).join('')}</div>
    ${repeat.length > 6 ? `<button class="fx-nt-more" data-act="ins-note-all">${
      insNoteAll ? 'Show top 6' : `Show all ${repeat.length}`}</button>` : ''}
  </div>`;
}

function renderInsights() {
  const all = txAll();
  let list, label, showNav = true, canNext;
  if (insMode === 'month')      { list = all.filter(t => t.d.startsWith(insMonth)); label = monthLabel(insMonth); canNext = insMonth < curMonth(); }
  else if (insMode === 'year')  { list = all.filter(t => t.d.startsWith(insYear));  label = insYear;             canNext = insYear < curYear(); }
  else                          { list = all; showNav = false; }

  const segs = byCategory(list), total = sum(list);

  let h = `<div class="fx-seg">${['month','year','all'].map(m => `<button class="fx-seg-btn ${m===insMode?'sel':''}" data-act="ins-mode" data-m="${m}">${m==='all'?'All Time':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>`;

  if (showNav) {
    h += `<div class="fx-navbar">
      <button class="fx-nav-btn" data-act="ins-prev">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'}</button>
      <button class="fx-nav-lbl ${insPickOpen ? 'open' : ''}" data-act="ins-pick-toggle">${label}</button>
      <button class="fx-nav-btn" data-act="ins-next" ${!canNext ? 'disabled' : ''}>${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'}</button>
    </div>`;
    if (insPickOpen) h += insPicker();
  }

  /* No tile row here: the total is the middle of the donut and the
     categories are its list, so three tiles said both a second time. The
     purchase count rides under the total. */
  const nBuys = `${list.length} purchase${list.length === 1 ? '' : 's'}`;

  if (total > 0) {
    const legend = segs.map(s => {
      const pct = (s.amount / total * 100).toFixed(0);
      return `<div class="fx-leg-row" data-act="arc-leg" data-name="${esc(s.name)}"><span class="fx-leg-dot" style="background:${s.color}"></span><span class="fx-leg-name">${esc(s.name)}</span><span class="fx-leg-pct">${pct}%</span><span class="fx-leg-amt">${fmtMoney(s.amount)}</span></div>`;
    }).join('');
    h += `<div class="fx-donut-card"><div class="fx-donut-wrap">
      <div class="fx-donut">${donutSVG(segs, total)}<div class="fx-donut-mid" id="fx-donut-mid" data-total="${fmtMoneyC(total)}" data-sub="${nBuys}"><div class="fx-donut-total" id="fx-donut-total">${fmtMoneyC(total)}</div><div class="fx-donut-sub" id="fx-donut-sub">${nBuys}</div></div></div>
      <div class="fx-legend">${legend}<button class="fx-leg-go" id="fx-leg-go" data-act="ins-see-cat" hidden></button></div>
    </div></div>`;
  } else {
    h += `<div class="fx-donut-card"><div class="fx-empty">No spending in this period.</div></div>`;
  }

  h += noteTrendHTML(list);
  h += `<div class="fx-chart-card"><div class="fx-chart-title">Last 12 Months</div>${trendSVG(last12())}</div>`;
  q('#fp-insights').innerHTML = h;
  fitDonutTotal();
}

/* donut hover/tap */
/* the amount can outgrow the ring's 96px hole — step the font down until it fits */
function fitDonutTotal() {
  const tot = q('#fx-donut-total'); if (!tot) return;
  tot.style.fontSize = '';
  for (let size = 20; size > 11 && tot.scrollWidth > tot.clientWidth; size--)
    tot.style.fontSize = size + 'px';
}
function donutHover(name) {
  const tot = q('#fx-donut-total'), sub = q('#fx-donut-sub'); if (!tot) return;
  const arc = root.querySelector(`.fx-arc[data-name="${CSS.escape(name)}"]`);
  if (arc) tot.textContent = arc.dataset.amt;
  sub.textContent = name;
  fitDonutTotal();
  root.querySelectorAll('.fx-arc').forEach(a => a.classList.toggle('hot', a.dataset.name === name));
  /* The donut answers "how much"; the next question is "on what", and the
     answer is a History filter away. Shown once a category has been picked,
     and left up when the pointer drifts off the ring — it names its
     category, so it can't be mistaken for the total in the middle. History
     filters by month, not year, so a Year or All Time view opens the
     category's full list and says so. */
  const go = q('#fx-leg-go');
  if (go) {
    go.dataset.name = name;
    go.textContent = insMode === 'month' ? `See ${name} in ${monthLabel(insMonth)} ›` : `See all ${name} expenses ›`;
    go.hidden = false;
  }
}

/* Open History on exactly one question, clearing whatever it was last
   filtered to so nothing left over narrows the answer. */
function openHistory({ month = 'all', cat = 'all', search = '' }) {
  histMonth = month; histCat = cat; histQ = search;
  histDay = ''; histCalOpen = false; histCalView = '';
  renderHistory();
  switchTab('history');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function donutReset() {
  const mid = q('#fx-donut-mid'); if (!mid) return;
  q('#fx-donut-total').textContent = mid.dataset.total;
  q('#fx-donut-sub').textContent = mid.dataset.sub || 'Spent';
  fitDonutTotal();
  root.querySelectorAll('.fx-arc').forEach(a => a.classList.remove('hot'));
}

/* ═══════════════════ TABS + EVENTS ═══════════════════ */
function switchTab(tab) {
  if (editId !== null && activeTab === 'add' && tab !== 'add') dropEdit();
  activeTab = tab;
  root.querySelectorAll('.fin .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  root.querySelectorAll('.fin .panel').forEach(p => p.classList.remove('active'));
  q('#fp-' + tab).classList.add('active');
  if (tab === 'insights') fitDonutTotal(); // hidden panels measure 0, so fit once visible
}
/* Read the Add form back before repainting it, the way renderNetWorth()
   does for its own: renaming a category, deleting an expense or a theme
   change used to wipe a half-typed amount and note. The one caller that
   must not read back is a save or delete that has just cleared the draft
   on purpose — the fields still hold the old values — so it passes false. */
function renderAll(keep = true) { if (keep) captureDraft(); renderAdd(); renderHistory(); renderInsights(); renderNetWorth(root); }

function onClick(e) {
  if (e.target.id === 'fx-modal') { closeModal(); return; }
  if (noteSugs.length && !e.target.closest('#fx-sug') && e.target.id !== 'fx-note') hideNoteSugs();
  const el = e.target.closest('[data-act]');
  if (!el || !root.contains(el)) return;
  const a = el.dataset;
  if (a.act.startsWith('nw-')) { nwClick(a, root); return; }   // Net Worth owns its own actions
  switch (a.act) {
    case 'tab':           switchTab(a.tab); break;
    case 'hist-day-pick': histPickDay(a.d); break;
    case 'hist-day-clear':histClearDay(); break;
    case 'hist-q-clear':  histQ = ''; renderHistory(); break;
    case 'undo-del':      runUndo(); break;
    case 'ins-see-cat':   openHistory({ month: insMode === 'month' ? insMonth : 'all', cat: a.name }); break;
    case 'ins-see-note':  openHistory({ search: a.q }); break;
    case 'hist-cal':      histToggleCal(); break;
    case 'hist-cal-shift':histCalShift(+a.d); break;
    case 'pick-cat':      pickCat(a.cat); break;
    case 'cat-manage':    managingCats = !managingCats; addingCat = false; editCat = null; reRender(); break;
    case 'edit-cat':      openEditCat(a.cat); break;
    case 'editcat-save':  saveEditCat(); break;
    case 'editcat-del':   editCatDelete(); break;
    case 'editcat-cancel':editCat = null; reRender(); break;
    case 'new-cat-open':  openNewCat(); break;
    case 'new-cat-color': updateNewColor(a.c); break;
    case 'new-cat-save':  saveNewCat(); break;
    case 'new-cat-cancel':cancelNewCat(); break;
    case 'cal-toggle':    captureDraft(); calOpen = !calOpen; if (calOpen) calView = (draft.date || todayStr()).slice(0,7); renderAdd(); break;
    case 'cal-shift':     captureDraft(); calView = shiftMonth(calView, +a.d); renderAdd(); break;
    case 'cal-pick':      captureDraft(); draft.date = a.d; calOpen = false; renderAdd(); break;
    case 'cal-today':     captureDraft(); draft.date = editId !== null ? todayStr() : ''; calView = curMonth(); calOpen = false; renderAdd(); break;  // "today" keeps following the day, except on an edit
    case 'note-sug':      pickNoteSug(a.i); break;
    case 'save-tx':       saveTx(); break;
    case 'cancel-edit':   cancelEdit(); break;
    case 'view-tx':       viewTx(a.id); break;
    case 'modal-close':   closeModal(); break;
    case 'modal-edit':    closeModal(); editTx(a.id); break;
    case 'modal-del':     closeModal(); delTx(a.id); break;
    case 'ins-mode':      insMode = a.m; insPickOpen = false; renderInsights(); break;
    case 'ins-prev':      insShift(-1); break;
    case 'ins-next':      insShift(1); break;
    case 'ins-bar':       insMode = 'month'; insMonth = a.ym; insPickOpen = false; renderInsights(); break;
    case 'ins-pick-toggle': insPickOpen = !insPickOpen; insPickYear = insMode === 'month' ? insMonth.slice(0,4) : insYear; renderInsights(); break;
    case 'ins-pick-year': insPickYear = String(+insPickYear + (+a.d)); renderInsights(); break;
    case 'ins-pick-month':insMonth = a.ym; insPickOpen = false; renderInsights(); break;
    case 'ins-pick-yr':   insYear = a.y; insPickOpen = false; renderInsights(); break;
    case 'ins-note':      insNote = insNote === a.k ? '' : a.k; renderInsights(); break;
    case 'ins-note-all':  insNoteAll = !insNoteAll; renderInsights(); break;
    case 'arc':           donutHover(el.dataset.name); break;
    case 'arc-leg':       donutHover(a.name); break;
  }
}
function insShift(delta) {
  if (insMode === 'month') { const nx = shiftMonth(insMonth, delta); if (delta > 0 && nx > curMonth()) return; insMonth = nx; }
  else if (insMode === 'year') { const nx = String(+insYear + delta); if (delta > 0 && nx > curYear()) return; insYear = nx; }
  insPickOpen = false; renderInsights();
}
function onChange(e) {
  if (e.target.id === 'hist-month') { histMonth = e.target.value; histCalView = ''; renderHistory(); }
  else if (e.target.id === 'hist-cat') { histCat = e.target.value; renderHistory(); }
  else if (e.target.id === 'fx-color') updateNewColor(e.target.value);
}

/* Picking a day pins the month select to that day's month, so clearing the
   day drops you back into the month you were just looking at. */
function histPickDay(d) {
  histDay = d || '';
  if (histDay) { histMonth = histDay.slice(0, 7); histCalView = histDay.slice(0, 7); }
  renderHistory();
}
function histClearDay() { histDay = ''; renderHistory(); }
function histToggleCal() {
  histCalOpen = !histCalOpen;
  if (histCalOpen && !histCalView) {
    /* open on the month you're already looking at, not always on today */
    histCalView = histDay ? histDay.slice(0, 7)
                : histMonth !== 'all' ? histMonth
                : todayStr().slice(0, 7);
  }
  renderHistory();
}
function histCalShift(delta) {
  const view = histCalView || todayStr().slice(0, 7);
  histCalView = shiftMonth(view, delta);
  renderHistory();
}
function onKeydown(e) {
  if (e.key !== 'Enter') return;
  if (nwKeydown(e, root)) return;
  if (e.target.id === 'fx-amount') { e.preventDefault(); saveTx(); }
  else if (e.target.id === 'fx-newcat-in') { e.preventDefault(); saveNewCat(); }
  else if (e.target.id === 'fx-editcat-in') { e.preventDefault(); saveEditCat(); }
  // #fx-note is a textarea — let Enter add a new line
}
function onInput(e) {
  if (e.target.id === 'fx-note') { sizeNote(); renderNoteSugs(); }
  else if (e.target.id === 'fx-color') updateNewColor(e.target.value);
  else if (e.target.id === 'hist-q') {
    histQ = e.target.value;
    renderHistoryResults();   // the input itself is left alone — see there
  }
}
function onOver(e) { const arc = e.target.closest?.('.fx-arc'); if (arc && root.contains(arc)) donutHover(arc.dataset.name); }
function onOut(e) { const arc = e.target.closest?.('.fx-arc'); if (!arc) return; const to = e.relatedTarget; if (to && to.closest?.('.fx-arc')) return; donutReset(); }

/* The trend chart and the net worth line bake the palette into their SVG,
   so a theme change has to repaint them — CSS alone can't reach inside. */
function onDataChange() { if (root) renderAll(); }

/* Resuming the installed app the next morning brings back yesterday's
   page: the Today and This Month figures, the Insights month and anything
   still meant to be "today" were all worked out when it was drawn. When
   the day has turned over since, move whatever was still on the old today
   (or its month, or its year) forward and repaint. Anything you picked
   yourself is a different day from the old today and stays put. The form
   dates themselves follow on their own — see `draft` above. */
function onResume() {
  if (!root || document.visibilityState === 'hidden') return;
  const now = todayStr(), was = dayKey;
  if (now === was) return;
  dayKey = now;
  const wasM = was.slice(0, 7), wasY = was.slice(0, 4);
  if (insMonth === wasM) insMonth = curMonth();
  if (histMonth === wasM) histMonth = curMonth();
  if (insYear === wasY) insYear = curYear();
  if (calOpen && !draft.date && calView === wasM) calView = curMonth();
  renderAll();
}

/* ═══════════════════ TEMPLATE + LIFECYCLE ═══════════════════ */
function template() {
  return `<div class="fin">
    <nav class="nav"><div class="nav-inner">
      ${TABS.map((t, i) => `<button class="tab${i ? '' : ' active'}" data-act="tab" data-tab="${t.k}">
        <span class="tab-ico">${icon(t.i)}</span><span class="tab-lbl">${t.n}</span>
      </button>`).join('')}
    </div></nav>
    <div class="app-wrap">
      ${TABS.map((t, i) => `<div class="panel${i ? '' : ' active'}" id="fp-${t.k}"></div>`).join('')}
    </div>
    <div class="fx-ov" id="fx-modal"><div class="fx-ov-card" id="fx-modal-body"></div></div>
    <div class="fx-toast" id="fx-toast"></div>
  </div>`;
}

export default {
  id: 'finance',
  name: 'Finance',
  storagePrefix: 'fin_',
  styles: 'apps/finance/finance.css?v=3d-nov17a',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  mount(el) {
    root = el;
    /* activeTab survives a remount, so returning to the app puts you back
       on the tab you left rather than on Add. */
    editId = null; editFrom = ''; viewId = null; addingCat = false; managingCats = false; editCat = null;
    selCat = null; newCatColor = PALETTE[0]; calOpen = false; calView = curMonth();
    draft = blankDraft();
    dayKey = todayStr(); undoDel = null; clearTimeout(undoTimer);
    noteSugs = [];
    /* History opens on this month: All Time is every expense ever logged
       in one list, and the month picker is one tap away. */
    histMonth = curMonth(); histCat = 'all'; histDay = ''; histQ = ''; histCalOpen = false; histCalView = '';
    insMode = 'month'; insMonth = curMonth(); insYear = curYear(); insPickOpen = false;
    insNote = ''; insNoteAll = false;
    nwReset();

    root.innerHTML = template();
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('input', onInput);
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    window.addEventListener('bs:datachange', onDataChange);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('focus', onResume);
    renderAll();
    switchTab(activeTab);
  },
  unmount() {
    if (root) {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('input', onInput);
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout', onOut);
    }
    window.removeEventListener('bs:datachange', onDataChange);
    document.removeEventListener('visibilitychange', onResume);
    window.removeEventListener('pageshow', onResume);
    window.removeEventListener('focus', onResume);
    clearTimeout(undoTimer); undoTimer = null; undoDel = null;
    root = null;
  },
  /* Settings → Danger Zone: what this app holds and how to clear it. The
     shell owns the confirmation and broadcasts bs:datachange afterwards,
     which repaints a mounted app through onDataChange. */
  resetTargets() {
    const n = txAll().length, k = load('fin_cats', null)?.length || 0, w = load('fin_nw', []).length;
    return [
      { id: 'tx', n: 'Expenses', d: 'Every expense you have logged, on every day. History, Insights and the "came in" figures on Net Worth all count from these.', c: n, cl: `${n} ${n === 1 ? 'expense' : 'expenses'}` },
      { id: 'cats', n: 'Custom categories', d: 'Your category list (added, renamed, recoloured or deleted) back to the eight defaults. Expenses keep the labels they were logged under.', c: k, cl: `${k} ${k === 1 ? 'category' : 'categories'}` },
      { id: 'nw', n: 'Net worth snapshots', d: 'Every total logged on the Net Worth tab, and the line drawn through them.', c: w, cl: `${w} ${w === 1 ? 'snapshot' : 'snapshots'}` },
    ];
  },
  applyReset(ids) {
    if (ids.includes('tx')) {
      remove('fin_tx');
      /* nothing left to edit, view or bring back — dropEdit() also repaints
         the form blank, so the repaint after the reset can't read the old
         entry's figures back out of its fields */
      if (root) { if (editId !== null) dropEdit(); hideUndo(); closeModal(); }
      editId = null; editFrom = ''; undoDel = null;
    }
    if (ids.includes('cats')) {
      remove('fin_cats');
      if (selCat && !DEFAULT_CATS.some(c => c.name === selCat)) selCat = null;
      managingCats = false; editCat = null; addingCat = false;
    }
    if (ids.includes('nw')) remove('fin_nw');
    if (histCat !== 'all' && !txAll().some(t => t.cat === histCat)) histCat = 'all';
  },
};
