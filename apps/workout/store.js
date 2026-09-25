/* ═══════════════════════════════════════════════════════════
   WORKOUT STORAGE — whose workout this is, and their own keys.

   Settings → Program picks whose program the app runs. Each person keeps
   their own log, weights, reps, body entries and awards: a session index
   means a different day in each program (bp_log's `di` is a position in
   PROGRAM), so one shared log would read Andrew's Tuesday as Edrin's.

   Edrin is the default and keeps the plain keys, so the data already on
   this device is his with no migration. Anyone else gets the same keys
   with their id after the prefix — bp_log becomes bp_andrew_log — which
   still starts with bp_, so backup, the storage bar and the Danger Zone
   pick them up without being told. A reset only ever clears whoever is
   selected.

   The switch itself and the equipment flags belong to the device, not a
   person, so they keep their plain keys (SHARED) — Settings reads the
   equipment ones straight out of localStorage.

   Every module in this app reads storage through here rather than
   storage.js directly; a key that went round this would land in the
   wrong person's data.
   ═══════════════════════════════════════════════════════════ */

import { load as ld, save as sv, remove as rm } from '../../assets/js/storage.js?v=grip-sep24';
export { todayStr, dateStr } from '../../assets/js/storage.js?v=grip-sep24';

export const USER_KEY = 'bp_user';
export const USERS = ['edrin', 'andrew'];      // the ids in PEOPLE, data.js
const who = ld(USER_KEY, 'edrin');
export const USER = USERS.includes(who) ? who : 'edrin';

const SHARED = new Set([USER_KEY, 'bp_bar', 'bp_wheel', 'bp_barbell', 'bp_dyno']);
const own = key => USER === 'edrin' || SHARED.has(key) || !key.startsWith('bp_')
  ? key : `bp_${USER}_${key.slice(3)}`;

export const load   = (key, fallback) => ld(own(key), fallback);
export const save   = (key, value) => sv(own(key), value);
export const remove = key => rm(own(key));
