/* ═══════════════════════════════════════════════════════════
   WORKOUT — REST BETWEEN SETS

   How long the timer runs after you log a set, per exercise. Five bands,
   each from what the research actually measured rather than one number
   for everything:

     compound   3:00  Schoenfeld et al. 2016 (J Strength Cond Res): trained
                      men on 8–12RM, 3 minutes against 1 grew more quad and
                      gained more squat and bench. Multi-joint lifts are
                      where cutting rest short costs reps on the next set.
     unilateral 2:00  the same lifts done one side at a time. Each side
                      already rests while the other one works, so the gap
                      after both is shorter.
     bodyweight 2:00  push-ups, pike and wall handstand push-ups: multi-joint, but
                      low load and few reps, so less to recover from than
                      a loaded press.
     skill      2:30  static holds and calisthenics skills — the planche,
                      handstand and lever lines. 2–3 minutes is the usual
                      prescription for static strength work: a hold is
                      near-maximal, and a tired one practises bad form.
     isolation  1:30  single-joint work. The same review that argues for
                      long rests on compounds puts isolation at the end of
                      the session on shorter ones, 60–90 seconds.
     small      1:00  abs, calves, forearms, scapular drills: small
                      muscles that recover fast and are trained for reps.
     prep       0:30  warm-ups, mobility, cardio — nothing to recover from,
                      just the walk to the next thing.

   Matched by name first, then by the ladder a movement belongs to, then
   by pattern, so a new exercise lands somewhere sensible without an entry.
   ═══════════════════════════════════════════════════════════ */

export const BANDS = {
  compound:   { s:180, n:'Compound lift' },
  unilateral: { s:120, n:'One side at a time' },
  bodyweight: { s:120, n:'Bodyweight compound' },
  skill:      { s:150, n:'Skill / static hold' },
  isolation:  { s:90,  n:'Isolation' },
  small:      { s:60,  n:'Small muscle group' },
  prep:       { s:30,  n:'Warm-up / mobility' },
};

/* Exceptions the patterns below would get wrong. */
const BY_NAME = {
  'Dumbbell Pullovers':        'isolation',     // "pull" but a single shoulder joint
  'Cable Lat Pullover':        'isolation',
  'Nordic Curl Negatives':     'bodyweight',    // eccentric-heavy, but few reps
  'Dead Hangs':                'isolation',
  'Scapular Push-Ups':         'small',
  'Scapular Pulls':            'small',
  'Arch Hangs':                'small',
  'Reverse Snow Angels':       'isolation',
  'Reverse Hyperextensions':   'isolation',
  'Weighted Reverse Hyperextensions': 'isolation',
  'Incline One-Arm Push-Ups':  'skill',
  'One-Arm Push-Ups':          'skill',
  'One-Arm Push-Ups, Feet Together': 'skill',
};

/* A ladder's band, for every step on it that the name table doesn't catch. */
const BY_LINE = {
  handstand: 'skill',
  planche:   'skill',
  lever:     'skill',
  pushup:    'bodyweight',
  hspu:      'bodyweight',
  rollout:   'small',
  hollow:    'small',
  arch:      'small',
};

const COMPOUND = /press|row\b|rows\b|pull-?ups?|chin-?ups?|pulldown|squat|deadlift|thrust|lunge|dip/i;
const SMALL    = /abs|obliques|tva|rectus|calf|calves|gastrocnemius|soleus|wrist|forearm/i;

export function restBand(ex) {
  if (!ex) return 'isolation';
  if (BY_NAME[ex.n]) return BY_NAME[ex.n];
  if (ex.k === '-' || /\beasy\b|min\b|your pick/.test(ex.s || '')) return 'prep';
  if (ex.line && BY_LINE[ex.line]) return BY_LINE[ex.line];
  const uni = /\/\s*(leg|side|arm)/i.test(ex.s || '');
  if (COMPOUND.test(ex.n) && !/pushdown/i.test(ex.n)) return uni ? 'unilateral' : 'compound';
  /* The primary muscle is listed first; that is what decides it. */
  const primary = (ex.m || '').split(',')[0];
  if (SMALL.test(primary)) return 'small';
  return 'isolation';
}

export const restOf = ex => BANDS[restBand(ex)].s;
export const fmtRest = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
