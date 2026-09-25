/* ═══════════════════════════════════════════════════════════
   SHELL — app registry + router + settings/backup.

   Each app is a self-contained module that default-exports:
     { id, name, icon, styles?, soon?, mount(root), unmount?() }

   To add a new app: import it and drop it into the APPS array.
   ═══════════════════════════════════════════════════════════ */

import workout from '../../apps/workout/index.js?v=avg-sep24';
import finance from '../../apps/finance/index.js?v=avg-sep24';
import { toast } from './ui.js?v=avg-sep24';
import { THEMES, getTheme, setTheme, applyTheme } from './theme.js?v=avg-sep24';

// Scripture is parked in archive/ for now — to bring it back, move
// archive/apps/scripture and archive/assets/data back to their old paths,
// then import it here and add it to APPS.
const APPS = [workout, finance];
const ACTIVE_KEY = 'bartleby_active_app';
// Each app declares its own storage prefix, so a new app joins the backup
// and the storage breakdown by existing rather than by being listed twice.
// bs_ carries suite-level settings (theme) and belongs to no app.
const SUITE_PREFIX = 'bs_';
const OWNERS = [
  ...APPS.filter(a => a.storagePrefix).map(a => ({ p: a.storagePrefix, name: a.name })),
  { p: SUITE_PREFIX, name: 'Settings' },
];
const BACKUP_PREFIXES = OWNERS.map(o => o.p);
const STORAGE_BUDGET = 5 * 1024 * 1024;       // ~5 MB typical localStorage cap

const root = document.getElementById('app-root');
const nav = document.getElementById('app-nav');
const loadedStyles = new Set();
/* Where each app was scrolled to when you last left it. Switching away to
   check something else and coming back to the top of a long program list
   loses your place, so the shell holds the position instead. */
const scrollPos = new Map();
let current = null;

/* ── styles ── */
function loadStyles(href) {
  if (!href || loadedStyles.has(href)) return;
  /* index.html carries a render-blocking <link> for every app shipped today,
     so this normally finds one already there and does nothing. It stays for
     an app added later whose <link> nobody remembered: that app loads its
     CSS late and flashes once, rather than rendering with no styles at all. */
  if (document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) {
    loadedStyles.add(href);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  loadedStyles.add(href);
}

/* ── nav ── */
function renderNav() {
  /* The label is hidden on the mobile top bar, so the title carries the
     name for a long-press and for screen readers. */
  nav.innerHTML = APPS.map(app => `
    <button class="app-btn" data-app="${app.id}" title="${app.name}" aria-label="${app.name}">
      <span class="app-ico">${app.icon || ''}</span>
      <span class="app-lbl">${app.name}</span>
      ${app.soon ? '<span class="app-soon">Soon</span>' : ''}
    </button>`).join('');
  nav.querySelectorAll('.app-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTo(btn.dataset.app)));
}

function switchTo(id) {
  const app = APPS.find(a => a.id === id) || APPS[0];
  if (current && current.id === app.id) return;

  if (current) {
    scrollPos.set(current.id, window.scrollY);
    if (typeof current.unmount === 'function') {
      try { current.unmount(); } catch (e) { console.error(e); }
    }
  }
  root.innerHTML = '';

  loadStyles(app.styles);
  current = app;
  app.mount(root);

  /* Restore twice on purpose. Reading scrollHeight forces layout, so the
     page has its real height back and the first jump lands correctly even
     in a hidden tab, where requestAnimationFrame never fires. The frame
     afterwards corrects for a stylesheet still arriving on a first visit.
     `instant` overrides the global scroll-behavior:smooth — returning to
     a position should look like you never left, not like a ride down. */
  const y = scrollPos.get(app.id) || 0;
  const jump = () => window.scrollTo({ top: y, behavior: 'instant' });
  void document.documentElement.scrollHeight;
  jump();
  requestAnimationFrame(jump);

  nav.querySelectorAll('.app-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.app === app.id));
  save(ACTIVE_KEY, app.id);
  if (location.hash.slice(1) !== app.id) history.replaceState(null, '', '#' + app.id);
}

function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function loadActive() {
  const fromHash = location.hash.slice(1);
  if (APPS.some(a => a.id === fromHash)) return fromHash;
  try {
    const stored = JSON.parse(localStorage.getItem(ACTIVE_KEY));
    if (APPS.some(a => a.id === stored)) return stored;
  } catch {}
  return APPS[0].id;
}

/* ═══════════════════ SETTINGS / BACKUP ═══════════════════ */
const isBackupKey = k => BACKUP_PREFIXES.some(p => k.startsWith(p));

/* Storage split by whoever owns it. "On-device storage: 2.9 KB" says you
   are fine but not what is costing you anything, which is the only useful
   thing to know when you are near the cap. Anything matching no prefix
   (the remembered active app, say) lands in Other. */
function usageBreakdown() {
  const groups = OWNERS.map(o => ({ ...o, bytes: 0, keys: [] }));
  const other = { p: null, name: 'Other', bytes: 0, keys: [] };
  let total = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const n = k.length + (localStorage.getItem(k) || '').length;
    total += n;
    (groups.find(g => k.startsWith(g.p)) || other).bytes += n;
    (groups.find(g => k.startsWith(g.p)) || other).keys.push({ k, n });
  }

  const rows = [...groups, other]
    .filter(g => g.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
  rows.forEach(r => r.keys.sort((a, b) => b.n - a.n));
  return { rows, total };
}

const fmtBytes = n => n < 1024 ? `${n} B`
                  : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB`
                  : `${(n / 1024 / 1024).toFixed(2)} MB`;

/* Fixed hues rather than theme accents: these are labels, and a legend
   that changes meaning with the palette is not a legend. */
const OWNER_COLOR = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#f472b6', '#64748b'];

function buildSettings() {
  const el = document.createElement('div');
  el.className = 'sx-overlay';
  el.id = 'sx-ol';
  el.innerHTML = `
    <div class="sx-card">
      <div class="sx-head"><div class="sx-title">Settings</div><button class="sx-close" data-sx="close">&times;</button></div>
      <div class="sx-body">
        ${PEOPLED ? `<div class="sx-sec-lbl">Program</div>
        <div class="sx-eq" id="sx-who"></div>` : ''}

        <div class="sx-sec-lbl${PEOPLED ? ' mt' : ''}">Theme</div>
        <div class="sx-themes" id="sx-themes"></div>

        <div id="sx-eq-sec">
        <div class="sx-sec-lbl mt">Equipment</div>
        <div class="sx-eq" id="sx-eq"></div>
        </div>

        ${SKILLED.length ? `<div id="sx-lv-sec"><div class="sx-sec-lbl mt">Calisthenics Level</div>
        <div class="sx-lv" id="sx-lv"></div></div>` : ''}

        <div class="sx-sec-lbl mt">Data &amp; Backup</div>
        <div class="sx-usage">
          <div class="sx-usage-top"><span>On-device storage</span><span id="sx-usage-txt"></span></div>
          <div class="sx-bar" id="sx-bar"></div>
          <div class="sx-legend" id="sx-legend"></div>
          <div class="sx-hint">All your data lives only in this browser. Export a backup file before switching phones or browsers, then import it on the new one to restore everything.</div>
        </div>
        <div class="sx-actions">
          <button class="sx-btn pri" data-sx="export">Export Backup</button>
          <button class="sx-btn" data-sx="import">Import Backup</button>
        </div>
        <input type="file" id="sx-file" accept="application/json,.json" hidden>

        <div class="sx-sec-lbl mt danger">Danger Zone</div>
        <div class="sx-danger" id="sx-danger"></div>
      </div>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener('click', e => {
    if (e.target === el) { closeSettings(); return; }
    const btn = e.target.closest('[data-sx]');
    const act = btn?.dataset.sx;
    if (act === 'close') closeSettings();
    else if (act === 'export') exportBackup();
    else if (act === 'import') el.querySelector('#sx-file').click();
    else if (act === 'who') pickPerson(btn.dataset.id);
    else if (act === 'theme') pickTheme(btn.dataset.t);
    else if (act === 'eq') pickEquip(btn.dataset.id, btn.dataset.v === '1');
    else if (act === 'lv') pickLevel(btn.dataset.k, +btn.dataset.i);
    else if (act === 'lv-all') toggleLadder(btn.dataset.k);
    else if (act === 'rs-tgl') toggleReset(btn.dataset.k);
    else if (act === 'rs-all') toggleResetAll();
    else if (act === 'rs-go') runReset();
  });
  el.querySelector('#sx-file').addEventListener('change', importBackup);
  return el;
}

/* ── theme + equipment settings ── */
function pickTheme(id) {
  if (id === getTheme()) return;
  setTheme(id);
  syncSettings();
  broadcast();                       // apps re-render: some bake colours into SVG
  toast(`${THEMES.find(t => t.id === id)?.name || id} theme`);
}

/* One entry per piece of optional kit the workout program can do without.
   The keys pair with `req` in apps/workout/data.js — an exercise naming a
   `req` that is off resolves to its `alt`. Read straight out of storage
   rather than imported from the app: the shell owns the setting, and it
   must not pull an app module in just to paint a toggle. Adding kit here
   plus a `req` there is the whole job.

   The pull-up bar and ab wheel default ON, so the program reads as written
   for a first-time visitor and turning a toggle off is what changes it — not
   the other way round. The barbell defaults OFF (`def:false`) by the same
   logic from the other side: the program is written for dumbbells, and the
   bar is the upgrade. Its default must match OWNED in apps/workout/rank.js. */
const EQUIP = [
  { id:'bar', key:'bp_bar', name:'Pull-Up Bar', on:'Have One', off:'No Bar',
    subOn:'Pull-Ups, Chin-Ups, Scap Pulls & Leg Raises need one.',
    subOff:'Swapped to dumbbell & bench alternatives.',
    toastOn:'Pull-up bar exercises on', toastOff:'Swapped to no-bar alternatives' },
  { id:'wheel', key:'bp_wheel', name:'Ab Wheel', on:'Have One', off:'No Wheel',
    subOn:"Saturday's rollouts need one.",
    subOff:'Swapped back to the hollow body hold.',
    toastOn:'Ab wheel rollouts on', toastOff:'Swapped to the hollow body hold' },
  { id:'barbell', key:'bp_barbell', def:false, name:'Barbell', on:'Have One', off:'No Barbell',
    subOn:'RDLs, front squats & hip thrusts run on the bar.',
    subOff:'Dumbbell versions, as the program is written.',
    toastOn:'Barbell lifts on', toastOff:'Back to the dumbbell versions' },
  /* Not a swap: no exercise has a `req` for it. It shows or hides the grip
     card on the Rank tab (apps/workout/grip.js, whose default must match),
     and a grip means something in any program — so it stays in the list
     when the kit rows above leave with a program that has no use for them. */
  { id:'dyno', key:'bp_dyno', always:true, name:'Grip Dynamometer', on:'Have One', off:'No Dynamometer',
    subOn:'Log your grip on the Rank tab and it ranks against men your age.',
    subOff:'Grip card hidden. Any readings you logged are kept.',
    toastOn:'Grip strength on the Rank tab', toastOff:'Grip card hidden — readings kept' },
];
const eqOn = eq => {
  const d = eq.def ?? true;
  try { return JSON.parse(localStorage.getItem(eq.key)) ?? d; } catch { return d; }
};

function pickEquip(id, v) {
  const eq = EQUIP.find(e => e.id === id);
  if (!eq || v === eqOn(eq)) return;
  localStorage.setItem(eq.key, JSON.stringify(v));
  syncSettings();
  broadcast();
  toast(v ? eq.toastOn : eq.toastOff);
}

/* ── whose program ──

   The same app-declares, shell-paints split as the levels below: the
   workout app knows the people (`people`/`setPerson` on its module) and
   keeps each one's data apart; this only draws the choice. Picking one
   reloads, since the program is fixed when the app's modules load. The
   equipment toggles only mean something to a program that swaps on kit
   (`usesKit`), so they leave with it. */
const PEOPLED = APPS.find(a => a.people && a.setPerson);
const kitInUse = () => APPS.some(a => a.usesKit ? a.usesKit() : false);

function paintPeople() {
  const el = document.getElementById('sx-who');
  if (!el || !PEOPLED) return;
  const list = PEOPLED.people(), at = list.find(p => p.on) || list[0];
  el.innerHTML = `
    <div class="sx-row">
      <div class="sx-row-l">
        <div class="sx-row-t">Whose workout</div>
        <div class="sx-row-s">${at.sub} Each person keeps their own log.</div>
      </div>
      <div class="sx-seg">${list.map(p =>
        `<button class="sx-seg-btn ${p.on ? 'sel' : ''}" data-sx="who" data-id="${p.id}">${p.n}</button>`).join('')}
      </div>
    </div>`;
}

function pickPerson(id) {
  if (!PEOPLED?.setPerson(id)) return;
  const p = PEOPLED.people().find(x => x.id === id);
  toast(`Switching to ${p ? p.n : id}'s program`);
  setTimeout(() => location.reload(), 350);
}

/* Tell the mounted app that shared state changed. */
const broadcast = () => window.dispatchEvent(new CustomEvent('bs:datachange'));

/* ── calisthenics level ──

   Same split as the danger zone below: the shell paints the controls, and
   the app declares what its ladders are (`skillLines`/`setSkill` on the
   module). A row is one ladder — the step you are on, where it sits on the
   way to Elite, and what you should be able to do before the next one.
   "All levels" opens the whole ladder, and any step in it can be picked
   directly, which is also the way back down. */
const SKILLED = APPS.filter(a => a.skillLines && a.setSkill);
const TIER_CLS = { Beginner:'beg', Novice:'nov', Intermediate:'int', Advanced:'adv', Elite:'eli' };
const tierCls = t => 't-' + (TIER_CLS[t] || 'beg');

/* Which ladders are expanded, as "<appId>:<line>". Survives repaints, so
   picking a step from an open ladder does not fold it shut under you. */
const lvOpen = new Set();

const levelRows = () => SKILLED.flatMap(app =>
  app.skillLines().map(l => ({ ...l, app, uid: `${app.id}:${l.id}` })));

function paintLevels() {
  const el = document.getElementById('sx-lv');
  if (!el) return;
  const rows = levelRows();
  if (!rows.length) { el.innerHTML = '<div class="sx-hint">No skill work in the program right now.</div>'; return; }

  el.innerHTML = rows.map(l => {
    const st = l.steps[l.at], nx = l.steps[l.at + 1], open = lvOpen.has(l.uid);
    const pips = l.steps.map((s, i) =>
      `<i class="${tierCls(s.tier)}${i <= l.at ? ' on' : ''}" title="${s.tier} · ${s.n}"></i>`).join('');
    const list = !open ? '' : `<ol class="sx-lv-list">${l.steps.map((s, i) => `
      <li><button class="sx-lv-li${i === l.at ? ' sel' : ''}" data-sx="lv" data-k="${l.uid}" data-i="${i}">
        <span class="sx-lv-li-h"><span class="sx-lv-li-n">${i + 1}. ${s.n}</span><span class="sx-lv-tier ${tierCls(s.tier)}">${s.tier}</span></span>
        <span class="sx-lv-li-up">${s.up ? `Move up at ${s.up}` : 'Top of the ladder'}</span>
      </button></li>`).join('')}</ol>`;
    return `
    <div class="sx-lv-row">
      <div class="sx-lv-head">
        <div class="sx-lv-t"><span class="sx-lv-n">${l.n}</span><span class="sx-lv-tier ${tierCls(st.tier)}">${st.tier}</span></div>
        <div class="sx-lv-step">
          <button class="sx-seg-btn" data-sx="lv" data-k="${l.uid}" data-i="${l.at - 1}"${l.at ? '' : ' disabled'} aria-label="${l.n}: level down">&minus;</button>
          <span class="sx-lv-at">${l.at + 1}/${l.steps.length}</span>
          <button class="sx-seg-btn" data-sx="lv" data-k="${l.uid}" data-i="${l.at + 1}"${nx ? '' : ' disabled'} aria-label="${l.n}: level up">+</button>
        </div>
      </div>
      <div class="sx-lv-ex">${st.n}</div>
      <div class="sx-lv-bar">${pips}</div>
      <div class="sx-lv-foot">
        <span class="sx-lv-next">${l.ready ? '<span class="sx-lv-ready">Passed</span> ' : ''}${nx ? `Next: <b>${nx.n}</b> at ${st.up}` : 'Top of the ladder.'}</span>
        <button class="sx-lv-all" data-sx="lv-all" data-k="${l.uid}" aria-expanded="${open}">${open ? 'Hide' : 'All levels'}</button>
      </div>
      ${list}
    </div>`;
  }).join('');
}

function pickLevel(uid, i) {
  const row = levelRows().find(r => r.uid === uid);
  if (!row || i === row.at || !row.steps[i]) return;
  if (!row.app.setSkill(row.id, i)) return;
  syncSettings();
  broadcast();
  toast(`${row.n}: ${row.steps[i].n}`);
}

function toggleLadder(uid) {
  if (lvOpen.has(uid)) lvOpen.delete(uid); else lvOpen.add(uid);
  paintLevels();
}

/* ── danger zone ──

   Resetting used to live inside the Workout app, three taps down a tab you
   otherwise open to read numbers. It belongs here instead: next to the
   backup export that is the only way back from it, and behind the red that
   says what kind of control it is.

   The shell owns the dangerous UI — the red panel, the tick list, the
   confirmation — and each app owns the knowledge of what its records are
   and how much is in them, declared as `resetTargets`/`applyReset` on its
   module the same way `storagePrefix` is. An app that declares neither
   simply contributes nothing here. */
const RESETTABLE = APPS.filter(a => a.resetTargets && a.applyReset);

/* Which boxes are ticked, as "<appId>:<targetId>". Deliberately cleared
   whenever the modal opens: coming back tomorrow to boxes you ticked today
   is how an accident happens. */
const resetSel = new Set();

/* Every app's targets flattened into one list, each carrying the app it
   came from so a reset can be routed back to the right module. */
const resetRows = () => RESETTABLE.flatMap(app =>
  app.resetTargets().map(t => ({ ...t, app, uid: `${app.id}:${t.id}` })));

function paintDanger() {
  const el = document.getElementById('sx-danger');
  if (!el) return;
  const rows = resetRows();
  const held = rows.filter(r => r.c > 0);

  if (!rows.length) { el.innerHTML = '<div class="sx-hint">Nothing here can be reset.</div>'; return; }

  const allOn = held.length > 0 && held.every(r => resetSel.has(r.uid));
  const sel = rows.filter(r => resetSel.has(r.uid));

  el.innerHTML = `
    <div class="sx-dz-warn"><b>Deletes data permanently.</b> Whatever you tick below is erased from this
      device for good — there is no undo. Export a backup first if there is any chance you want it back.</div>
    <div class="sx-dz-head">
      <span>${held.length} of ${rows.length} hold data</span>
      <button class="sx-dz-all" data-sx="rs-all"${held.length ? '' : ' disabled'}>${allOn ? 'Select none' : 'Select everything'}</button>
    </div>
    <div class="sx-dz-list">${rows.map(r => `
      <button class="sx-dz ${resetSel.has(r.uid) ? 'on' : ''}" data-sx="rs-tgl" data-k="${r.uid}"${r.c ? '' : ' disabled'}>
        <span class="sx-dz-box"></span>
        <span class="sx-dz-b">
          <span class="sx-dz-h"><span class="sx-dz-n">${r.n}</span><span class="sx-dz-c">${r.cl}</span></span>
          <span class="sx-dz-d">${r.d}</span>
        </span>
      </button>`).join('')}</div>
    <button class="sx-dz-go" data-sx="rs-go"${sel.length ? '' : ' disabled'}>${
      sel.length ? `Reset ${sel.length} Selected` : 'Nothing Selected'}</button>`;
}

function toggleReset(uid) {
  if (resetSel.has(uid)) resetSel.delete(uid); else resetSel.add(uid);
  paintDanger();
}

function toggleResetAll() {
  const held = resetRows().filter(r => r.c > 0);
  const allOn = held.length > 0 && held.every(r => resetSel.has(r.uid));
  resetSel.clear();
  if (!allOn) held.forEach(r => resetSel.add(r.uid));
  paintDanger();
}

/* The confirmation names every record and how much is in it before anything
   happens. "Are you sure?" on its own is not consent to delete four months
   of sessions — you have to be able to see that that is what it is. */
function runReset() {
  const sel = resetRows().filter(r => resetSel.has(r.uid));
  if (!sel.length) return;
  const lines = sel.map(r => `  •  ${r.n} — ${r.cl}`).join('\n');
  if (!confirm(`Permanently delete the following? This cannot be undone.\n\n${lines}\n\n`
    + `Your program, equipment settings and theme are left alone.`)) return;

  RESETTABLE.forEach(app => {
    const ids = sel.filter(r => r.app === app).map(r => r.id);
    if (ids.length) app.applyReset(ids);
  });
  resetSel.clear();
  paintDanger();
  openSettings();                    // storage bar and legend both moved
  broadcast();                       // the mounted app repaints from empty
  toast(sel.length === 1 ? `${sel[0].n} reset` : `${sel.length} records reset`);
}

/* Paint the current values into an already-built settings modal. */
function syncSettings() {
  const el = document.getElementById('sx-ol');
  if (!el) return;
  const active = getTheme();
  el.querySelector('#sx-themes').innerHTML = THEMES.map(t => `
    <button class="sx-theme ${t.id === active ? 'sel' : ''}" data-sx="theme" data-t="${t.id}">
      <span class="sx-sw">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="sx-theme-txt"><b>${t.name}</b><em>${t.desc}</em></span>
      <span class="sx-tick"></span>
    </button>`).join('');

  const kit = kitInUse();
  const shown = EQUIP.filter(eq => eq.always || kit);
  el.querySelector('#sx-eq').innerHTML = shown.map(eq => {
    const on = eqOn(eq);
    return `
    <div class="sx-row">
      <div class="sx-row-l">
        <div class="sx-row-t">${eq.name}</div>
        <div class="sx-row-s">${on ? eq.subOn : eq.subOff}</div>
      </div>
      <div class="sx-seg">
        <button class="sx-seg-btn ${on ? 'sel' : ''}" data-sx="eq" data-id="${eq.id}" data-v="1">${eq.on}</button>
        <button class="sx-seg-btn ${on ? '' : 'sel'}" data-sx="eq" data-id="${eq.id}" data-v="0">${eq.off}</button>
      </div>
    </div>`;
  }).join('');
  el.querySelector('#sx-eq-sec').hidden = !shown.length;
  paintPeople();
  paintLevels();                     // the bar toggle adds and removes ladders
  const lv = el.querySelector('#sx-lv-sec');
  if (lv) lv.hidden = !levelRows().length;
}

function openSettings() {
  const fresh = !document.getElementById('sx-ol')?.classList.contains('on');
  if (fresh) resetSel.clear();
  const el = document.getElementById('sx-ol') || buildSettings();
  const { rows, total } = usageBreakdown();

  el.querySelector('#sx-usage-txt').textContent = `${fmtBytes(total)} of ~5 MB`;

  /* One segment per owner, each scaled against the 5 MB cap so the bar
     keeps meaning what it meant before — the share of what's left. */
  el.querySelector('#sx-bar').innerHTML = rows.map((r, i) => {
    const pct = Math.min(100, (r.bytes / STORAGE_BUDGET) * 100);
    return `<div class="sx-bar-fill" style="width:${Math.max(pct, 0.4)}%;background:${OWNER_COLOR[i % OWNER_COLOR.length]}"
                 title="${r.name} · ${fmtBytes(r.bytes)}"></div>`;
  }).join('') || '<div class="sx-bar-fill" style="width:0"></div>';

  el.querySelector('#sx-legend').innerHTML = rows.length ? rows.map((r, i) => `
    <div class="sx-leg">
      <span class="sx-leg-d" style="background:${OWNER_COLOR[i % OWNER_COLOR.length]}"></span>
      <span class="sx-leg-n">${r.name}</span>
      <span class="sx-leg-k">${r.keys.length} key${r.keys.length === 1 ? '' : 's'}</span>
      <span class="sx-leg-v">${fmtBytes(r.bytes)}</span>
      <span class="sx-leg-p">${total ? Math.round((r.bytes / total) * 100) : 0}%</span>
    </div>`).join('') : '<div class="sx-leg empty">Nothing stored yet.</div>';

  syncSettings();
  paintDanger();
  el.classList.add('on');
}
function closeSettings() { document.getElementById('sx-ol')?.classList.remove('on'); }

function exportBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isBackupKey(k)) data[k] = localStorage.getItem(k);
  }
  const payload = { app: 'bartleby-software', version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bartleby-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Backup exported');
}

function importBackup(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let payload;
    try { payload = JSON.parse(reader.result); } catch { toast('Not a valid backup file'); return; }
    if (!payload || typeof payload.data !== 'object') { toast('Not a Bartleby backup'); return; }
    const keys = Object.keys(payload.data).filter(isBackupKey);
    if (!keys.length) { toast('Backup has no data'); return; }
    const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'unknown date';
    if (!confirm(`Import backup from ${when}?\n\nThis replaces all current workout and finance data on this device.`)) return;
    keys.forEach(k => localStorage.setItem(k, payload.data[k]));
    toast('Backup imported — reloading');
    setTimeout(() => location.reload(), 600);
  };
  reader.readAsText(file);
}

document.getElementById('settings-btn')?.addEventListener('click', openSettings);

/* ── boot ── */
applyTheme(getTheme());
renderNav();
// Preload every app's stylesheet up front so switching tabs never flashes
// unstyled markup (the CSS is already applied before mount() injects HTML).
APPS.forEach(app => loadStyles(app.styles));
switchTo(loadActive());

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (APPS.some(a => a.id === id)) switchTo(id);
});
