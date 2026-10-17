# The athlete

The anatomical figure in the Workout app's 3D animations and the anatomy
bench (tools/anatomy/).

- **Body:** "Male body" by Chin Eeyang
  (https://sketchfab.com/3d-models/male-body-5c818a5be6c84f898826d989f02932b0),
  licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
  Changed here: reduced from 1.37 million to about 90,000 triangles, cut at
  the neck and wrists, rigged, given shorts built from its own surface and a
  skin material.
- **Head and hands:** Microsoft Rocketbox Male_Adult_01
  (https://github.com/microsoft/Microsoft-Rocketbox), MIT; the licence is
  below. Its head and hand textures are head.jpg, head_n.jpg and hands.jpg.
  Gonzalez-Franco et al., *The Rocketbox library and the utility of freely
  available rigged avatars*, Frontiers in Virtual Reality (2020),
  doi:10.3389/frvir.2020.561558.
- **Shorts shape:** a hand edit by Edrin, applied by
  tools/howto/trainer/build_athlete.mjs from shorts_shape.json, and tidied
  when the model loads (avatar.js, the shorts' `fit` entry).
- **Shorts textures:** drawn from code by tools/howto/trainer/shorts_texture.py
  to the same design (ribbed waistband, mesh side panel with piping, the
  diagonal accent and mark, hem stitching). No outside licence.

- **Internal organs and torso skeleton** (organs.json, organs.bin):
  BodyParts3D, © The Database Center for Life Science licensed under CC
  Attribution 4.0 International
  (https://creativecommons.org/licenses/by/4.0/). Changed here: parts
  combined from their element meshes, simplified, the lungs rebuilt as the
  shell round their airway trees, and fitted into this body by
  tools/organs/build_organs.py.

How it is built is in tools/howto/README.md.

---

Rocketbox (head and hands):

MIT License

Copyright (c) 2020 Microsoft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
