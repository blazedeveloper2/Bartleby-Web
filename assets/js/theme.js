/* ═══════════════════════════════════════════════════════════
   THEME — reads/writes the active theme and applies it to <html>.

   The palettes and the motion sets live in assets/css/themes.css.
   Adding a theme means adding a block there and an entry to THEMES
   below — including its `motion`, which is what the CSS keys the
   animation set off. Themes that want the same motion just name the
   same set rather than duplicating it.

   The key is `bs_theme`, which the shell's backup includes (see
   BACKUP_PREFIXES) so your theme travels with your data.
   ═══════════════════════════════════════════════════════════ */

export const THEMES = [
  { id:'arcade', name:'Arcade',   motion:'loud',  desc:'Orange game-HUD. Glow, sweeps, scanlines.',  sw:['#ff7a18','#ffb43f','#150f0a'] },
  { id:'black',  name:'Dark',     motion:'quiet', desc:'True black and silver. No colour cast.',     sw:['#e4e4e7','#767677','#000000'] },
  { id:'dark',   name:'Midnight', motion:'quiet', desc:'Cool blue-grey. Quiet, event-driven motion.', sw:['#3b82f6','#8b5cf6','#10121a'] },
  { id:'light',  name:'Daylight', motion:'none',  desc:'Bright paper-white. Calm, no motion.',       sw:['#2563eb','#7c3aed','#ffffff'] },
];

const KEY = 'bs_theme';
export const DEFAULT_THEME = 'arcade';

export function getTheme() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY));
    if (THEMES.some(x => x.id === t)) return t;
  } catch {}
  return DEFAULT_THEME;
}

export function applyTheme(id) {
  const def = THEMES.find(x => x.id === id) || THEMES.find(x => x.id === DEFAULT_THEME);
  const t = def.id;
  document.documentElement.setAttribute('data-theme', t);
  /* Separate from data-theme so a motion set can be shared: Midnight and
     Dark are two palettes wearing the same one. */
  document.documentElement.setAttribute('data-motion', def.motion || 'none');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0705');
  }
  return t;
}

export function setTheme(id) {
  const t = applyTheme(id);
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch {}
  return t;
}
