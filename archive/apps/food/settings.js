/* ═══════════════════════════════════════════════════════════
   ARCHIVED 2026-10-31 — the Food app's Settings rows, cut from
   assets/js/shell.js along with the app. Not imported anywhere; see
   archive/README.md for how to put it back.
   ═══════════════════════════════════════════════════════════ */

/* The Food app's switches, painted and stored the same way. Defaults
   must match where apps/food/index.js reads them (calLayer, offAuto). */
export const FOOD_PREFS = [
  { id:'foodcal', key:'food_cal', def:false, name:'Calorie Tracking', on:'On', off:'Off',
    subOn:'Calories and daily totals.',
    subOff:'Just the journal.',
    toastOn:'Calorie tracking on', toastOff:'Calorie tracking off' },
  { id:'foodoff', key:'food_offauto', def:false, name:'Barcode Lookup', on:'Automatic', off:'Ask First',
    subOn:'New barcodes look up on Open Food Facts.',
    subOff:'Asks before looking up a new barcode.',
    toastOn:'Barcodes look up automatically', toastOff:'Barcodes ask before looking up' },
];
