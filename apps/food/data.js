/* ═══════════════════════════════════════════════════════════
   COMMON FOODS — everyday names mapped to their USDA record.

   foods.json holds all of USDA SR Legacy, but its descriptions are
   written for a database ("Bananas, raw"), not for someone typing
   "banana". This table is the bridge: an exact alias match here is one
   of only two ways an entry gets calories without being asked (the
   other is a name you counted before), and its first portion is the
   one a bare "banana" means.

   Every number in COMMON is USDA FoodData Central, SR Legacy (public
   domain), copied from the food's own FDC record: `k` is kcal and
   `p`/`f`/`c` grams of protein, fat and carbohydrate, all per 100 g.
   `fdc` is the record id, so any value here can be checked against
   fdc.nal.usda.gov/food-details/<fdc>/nutrients. `desc` is USDA's
   description, word for word bar a trailing program note (the apple's
   "Includes foods for USDA's Food Distribution Program"), and is what
   the app shows as the source: "Banana, 105 kcal" says nothing about
   which banana.

   Portions are USDA's household measures for that record, first one
   the default. Three are halved or split from a USDA measure rather
   than listed by it (½ cup dry oats from 1 cup = 81 g, 1 tbsp peanut
   butter from 2 tbsp = 32 g, ½ cup rice from 1 cup = 158 g), which
   is arithmetic on the same weight, not an estimate.
   ═══════════════════════════════════════════════════════════ */

export const COMMON = [
  { fdc:171287, n:'Egg', desc:'Egg, whole, raw, fresh', k:143, p:12.6, f:9.51, c:0.72,
    alias:['egg', 'eggs', 'boiled egg', 'boiled eggs'],
    por:[{ n:'large', g:50 }, { n:'medium', g:44 }, { n:'extra large', g:56 }, { n:'small', g:38 }] },
  { fdc:172688, n:'Whole-wheat bread', desc:'Bread, whole-wheat, commercially prepared', k:252, p:12.4, f:3.5, c:42.7,
    alias:['toast', 'bread', 'whole wheat toast', 'whole-wheat toast', 'whole wheat bread', 'whole-wheat bread'],
    por:[{ n:'slice', g:32 }, { n:'oz', g:28.35 }] },
  { fdc:173944, n:'Banana', desc:'Bananas, raw', k:89, p:1.09, f:0.33, c:22.8,
    alias:['banana', 'bananas'],
    por:[{ n:'medium', g:118 }, { n:'small', g:101 }, { n:'large', g:136 }, { n:'cup, sliced', g:150 }] },
  { fdc:170903, n:'Greek yogurt', desc:'Yogurt, Greek, plain, lowfat', k:73, p:9.95, f:1.92, c:3.94,
    alias:['greek yogurt', 'yogurt', 'yoghurt'],
    por:[{ n:'container (7 oz)', g:200 }, { n:'100 g', g:100 }] },
  { fdc:173904, n:'Oats', desc:'Cereals, oats, regular and quick, not fortified, dry', k:379, p:13.2, f:6.52, c:67.7,
    alias:['oats', 'oatmeal', 'porridge'],
    por:[{ n:'½ cup, dry', g:40.5 }, { n:'⅓ cup, dry', g:27 }, { n:'cup, dry', g:81 }] },
  { fdc:172470, n:'Peanut butter', desc:'Peanut butter, smooth style, without salt', k:598, p:22.2, f:51.4, c:22.3,
    alias:['peanut butter', 'pb'],
    por:[{ n:'tbsp', g:16 }, { n:'2 tbsp', g:32 }] },
  { fdc:171688, n:'Apple', desc:'Apples, raw, with skin', k:52, p:0.26, f:0.17, c:13.8,
    alias:['apple', 'apples'],
    por:[{ n:'medium (3" dia)', g:182 }, { n:'small', g:149 }, { n:'large', g:223 }, { n:'cup, slices', g:109 }] },
  { fdc:171477, n:'Chicken breast', desc:'Chicken, broilers or fryers, breast, meat only, cooked, roasted', k:165, p:31, f:3.57, c:0,
    alias:['chicken', 'chicken breast', 'grilled chicken'],
    por:[{ n:'½ breast', g:86 }, { n:'cup, diced', g:140 }, { n:'100 g', g:100 }] },
  { fdc:168878, n:'White rice', desc:'Rice, white, long-grain, regular, enriched, cooked', k:130, p:2.69, f:0.28, c:28.2,
    alias:['rice', 'white rice'],
    por:[{ n:'cup', g:158 }, { n:'½ cup', g:79 }] },
  { fdc:169967, n:'Broccoli', desc:'Broccoli, cooked, boiled, drained, without salt', k:35, p:2.38, f:0.41, c:7.18,
    alias:['broccoli'],
    por:[{ n:'½ cup, chopped', g:78 }, { n:'spear', g:37 }] },
  { fdc:175168, n:'Salmon', desc:'Fish, salmon, Atlantic, farmed, cooked, dry heat', k:206, p:22.1, f:12.4, c:0,
    alias:['salmon'],
    por:[{ n:'3 oz', g:85 }, { n:'½ fillet', g:178 }] },
  { fdc:171265, n:'Whole milk', desc:'Milk, whole, 3.25% milkfat, with added vitamin D', k:61, p:3.15, f:3.25, c:4.8,
    alias:['milk', 'whole milk'],
    por:[{ n:'cup', g:244 }, { n:'tbsp', g:15 }, { n:'fl oz', g:30.5 }] },
];
