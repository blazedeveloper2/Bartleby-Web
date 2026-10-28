/* ═══════════════════════════════════════════════════════════
   USDA — all of SR Legacy (foods.json), loaded once, searched
   locally. Nothing leaves the device to search it.

   foods.json is USDA's SR Legacy JSON trimmed to what the app reads:
   per-100 g kcal/protein/fat/carbs and USDA's own household portions,
   values unchanged. SR Legacy is a frozen 2018 release, so a
   record never changes under an entry that points at it.
   ═══════════════════════════════════════════════════════════ */

import { COMMON } from './data.js?v=food-1';

let db = null, loading = null;

const STOP = new Set(['a', 'an', 'and', 'or', 'of', 'the', 'with', 'w', 'in', 'on']);
/* Plurals off long words only, so "eggs" finds "egg", "potatoes" finds
   "potato" and "berries" finds "berry", while "oats" and "peas" keep
   enough of themselves to match */
function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('oes')) return w.slice(0, -2);
  return w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}
const tokens = s => s.toLowerCase().split(/[^a-z0-9%]+/).filter(w => w && !STOP.has(w)).map(stem);

function build(d) {
  const foods = d.f.map(r => {
    const segs = r[1].toLowerCase().split(', ').map(tokens);
    return { fdc: r[0], desc: r[1], cat: d.cats[r[2]], k: r[3], p: r[4], f: r[5], c: r[6],
      por: r[7].map(([n, g]) => ({ n, g })), segs };
  });
  return { foods, by: new Map(foods.map(f => [f.fdc, f])) };
}

/* Fetch and index foods.json; safe to call repeatedly. */
export function loadUsda() {
  loading ||= fetch(new URL('foods.json?v=food-1', import.meta.url))
    .then(r => { if (!r.ok) throw new Error('foods.json ' + r.status); return r.json(); })
    .then(d => { db = build(d); return db; })
    .catch(e => { loading = null; throw e; });
  return loading;
}
export const usdaReady = () => !!db;

/* A USDA record by id: the full list once loaded, the common table before. */
export function byFdc(fdc) {
  return db?.by.get(fdc) || COMMON.find(f => f.fdc === fdc) || null;
}

/* What to call a record in the journal: the common name if it has one,
   else its first real segment ("Nuts, almonds" → Almonds, "McDONALD'S,
   BIG MAC" → Big mac), since nobody writes "Bananas, raw" in a diary. */
export function shortName(f) {
  const c = COMMON.find(x => x.fdc === f.fdc);
  if (c) return c.n;
  const segs = f.desc.split(', ');
  let n = segs[0];
  if (segs.length > 1 && (HEADS.has(stem(n.toLowerCase())) || /^[A-Z][A-Z' ]{2,}$/.test(n.replace(/^Mc/, '')))) n = segs[1];
  if (n === n.toUpperCase()) n = n.toLowerCase();
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/* Portions to offer for a record, always ending in plain 100 g. */
export function portions(f) {
  const list = (db?.by.get(f.fdc) || f).por.slice();
  if (!list.some(p => p.g === 100 && /^100 ?g$/.test(p.n))) list.push({ n: '100 g', g: 100 });
  return list;
}

/* The portion a bare mention means. A common food says so itself; for
   the rest, USDA lists cups first, and "1 cup" of almonds is 828 kcal —
   so a named size wins, then the label serving, then ounces, then the
   smallest portion that is still a mouthful. */
export function defaultPortion(f) {
  const c = COMMON.find(x => x.fdc === f.fdc);
  if (c) return c.por[0];
  const list = portions(f);
  return list.find(p => /^medium\b/.test(p.n))
    || list.find(p => /^NLEA serving/.test(p.n))
    || list.find(p => /^(\d+ )?oz\b/.test(p.n))
    || list.filter(p => p.g >= 20).sort((a, b) => a.g - b.g)[0]
    || list[0];
}

/* ── search ranking ──

   Every query word must start a word of the description; the rest is
   ordering. A word landing in an earlier comma-segment ranks higher
   ("Bananas, raw" is a banana; "Bread, banana" is bread), a whole-word
   hit beats a prefix ("egg" is not "eggnog"), and USDA's filing heads
   ("Nuts, almonds") do not count as a segment. Brand-name restaurant
   items, baby food and processed forms (oil, flour, powder...) sink
   below the plain food unless the query asks for them, and a common
   food whose alias is the whole query goes first. */
const HEADS = new Set(['beverages', 'nuts', 'cereals', 'seeds', 'spices', 'snacks', 'candies', 'fish'].map(stem));
const FORMS = ['oil', 'flour', 'powder', 'dried', 'dehydrated', 'paste', 'bran', 'mix', 'crackers', 'noodles',
  'juice', 'concentrate', 'babyfood', 'cookies', 'cake', 'bread', 'pickled', 'syrup', 'instant'].map(stem);
const BRAND = /\b[A-Z][A-Z']{2,}/;
const PENALTY_BRAND = 10;
const PENALTY_FORM = 6;
const PENALTY_BABY = 15;

function rank(f, qt) {
  const off = f.segs.length > 1 && HEADS.has(f.segs[0].join(' ')) ? 1 : 0;
  let score = 0;
  for (const w of qt) {
    let best = null;
    for (let s = off; s < f.segs.length && best == null; s++) {
      const i = f.segs[s].findIndex(t => t.startsWith(w));
      if (i >= 0) best = (s - off) * 10 + i - (f.segs[s][i] === w ? 3 : 0);
    }
    if (best == null && off) {
      const i = f.segs[0].findIndex(t => t.startsWith(w));
      if (i >= 0) best = 5 + i;
    }
    if (best == null) return null;
    score += best;
  }
  const all = f.segs.flat();
  if (BRAND.test(f.desc)) score += PENALTY_BRAND;
  if (f.cat === 'Baby Foods' && !qt.includes('baby')) score += PENALTY_BABY;
  if (FORMS.some(x => all.includes(x) && !qt.includes(x))) score += PENALTY_FORM;
  return score + f.desc.length / 100;
}

/* Up to n USDA records for a query, best first. */
export function search(q, n = 8) {
  const qt = tokens(q);
  if (!qt.length) return [];
  const pin = COMMON.find(f => f.alias.includes(q.trim().toLowerCase()));
  if (!db) {
    return COMMON.filter(f => qt.every(w => tokens(f.desc + ' ' + f.alias.join(' ')).some(t => t.startsWith(w)))).slice(0, n);
  }
  const out = [];
  for (const f of db.foods) {
    const s = rank(f, qt);
    if (s != null) out.push({ f, s: pin && f.fdc === pin.fdc ? -1e9 : s });
  }
  if (pin && !out.some(r => r.f.fdc === pin.fdc)) out.push({ f: db.by.get(pin.fdc), s: -1e9 });
  return out.sort((a, b) => a.s - b.s).slice(0, n).map(r => r.f);
}
