# The athlete

The anatomical figure in the Workout app's 3D animations and the anatomy
bench (tools/anatomy/).

- **Body:** "Male body" by Chin Eeyang
  (https://sketchfab.com/3d-models/male-body-5c818a5be6c84f898826d989f02932b0),
  licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
  Changed here: reduced from 1.37 million to about 90,000 triangles, cut at
  the neck and wrists, rigged, given shorts built from its own surface and a
  skin material.
- **Head and hands:** Microsoft Rocketbox Male_Adult_01 (MIT); its license
  is in ../trainer/LICENSE.md.
- **Shorts shape:** a hand edit by Edrin, applied by
  tools/howto/trainer/build_athlete.mjs from shorts_shape.json, and tidied
  when the model loads (avatar.js, the shorts' `fit` entry).
- **Shorts textures:** drawn from code by tools/howto/trainer/shorts_texture.py
  to the same design (ribbed waistband, mesh side panel with piping, the
  diagonal accent and mark, hem stitching). No outside licence.

How it is built is in tools/howto/README.md.
