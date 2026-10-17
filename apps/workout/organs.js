/* ═══════════════════════════════════════════════════════════
   WORKOUT — INSIDE THE BODY (the Anatomy tab)

   The internal organs and the torso's skeleton, from BodyParts3D (the
   Database Center for Life Science's 3D anatomy set, CC BY 4.0), fitted into
   the athlete by tools/organs/build_organs.py and stored in
   assets/models/athlete/organs.json + organs.bin.

   Each part rides on the bone nearest it — the brain and skull on the
   head, everything else on the pelvis or the spine joint level with its
   middle — so the inside moves with the body in every pose. The parts are
   in the model's own bind units, exactly as the skin is, so a bone's
   skinning matrix places them where it places the skin around them.

   muscleview.js owns the scene: it adds `group`, calls `follow()` before
   each frame, asks `pick()` what a tap lands on, and `spotOf()` where a
   part is for the label line and the camera.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from '../../assets/vendor/three/three.module.min.js';

const BASE = new URL('../../assets/models/athlete/', import.meta.url);
let LOADING = null;

/* Muted, true-ish organ colours on a slightly glossy, wet-looking surface;
   bone matte ivory. */
function material(p) {
  const bone = p.system === 'Skeletal', lung = p.id.startsWith('lung');
  /* the lungs are shells round their airway trees (see build_organs.py),
     drawn half see-through so the heart shows between them */
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(p.colour), roughness: bone ? 0.72 : 0.42, metalness: 0,
    emissive: new THREE.Color(p.colour).multiplyScalar(bone ? 0.04 : 0.1), side: THREE.DoubleSide,
    transparent: lung, opacity: lung ? 0.55 : 1, depthWrite: !lung,
  });
}

/* Load once; resolves { group, parts: Map(id → { mesh, system, bone, c, size }) }. */
export function loadOrgans(T) {
  return (LOADING ||= (async () => {
    const [meta, bin] = await Promise.all([
      fetch(new URL('organs.json?v=2', BASE)).then(r => { if (!r.ok) throw new Error('organs.json'); return r.json(); }),
      fetch(new URL('organs.bin?v=2', BASE)).then(r => { if (!r.ok) throw new Error('organs.bin'); return r.arrayBuffer(); }),
    ]);
    const group = new THREE.Group(), parts = new Map();
    const spineAt = name => T.bones[T.byName[name]]?.P;
    /* the spine joints a torso part may ride on, low to high */
    const SPINE = ['Pelvis', 'Spine', 'Spine1', 'Spine2'].filter(spineAt);
    for (const p of meta.parts) {
      const [off, n] = p.v, q = new Int16Array(bin, off, n * 3), pos = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) { const a = i % 3; pos[i] = p.lo[a] + ((q[i] + 32768) / 65535) * p.span[a]; }
      const [ioff, ni, bits] = p.i;
      const idx = bits === 32 ? new Uint32Array(bin, ioff, ni) : new Uint16Array(bin, ioff, ni);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material(p));
      mesh.matrixAutoUpdate = false;
      /* drawn before the glass skin, which would otherwise hide whatever
         see-through part comes after it */
      mesh.renderOrder = -1;
      mesh.userData.organ = p.id;
      const c = geo.boundingBox.getCenter(new THREE.Vector3()), sz = geo.boundingBox.getSize(new THREE.Vector3());
      let bone = 'Head';
      if (p.attach !== 'head') {
        bone = SPINE[0];
        for (const b of SPINE) if (Math.abs(spineAt(b).y - c.y) < Math.abs(spineAt(bone).y - c.y)) bone = b;
      }
      group.add(mesh);
      parts.set(p.id, { mesh, system: p.system, bone, c, size: Math.max(sz.x, sz.y, sz.z) });
    }
    group.visible = false;
    return { group, parts };
  })());
}

/* Before a frame: each part takes its bone's skinning matrix, so it sits
   where the skin round it sits. `show` is { organs, bones }. */
export function follow(O, body, show) {
  const { byName } = body.T;
  let any = false;
  for (const [, p] of O.parts) {
    const on = p.system === 'Skeletal' ? show.bones : show.organs;
    p.mesh.visible = on;
    if (!on) continue;
    any = true;
    const b = body.bones[byName[p.bone]];
    if (b) p.mesh.matrix.copy(b.matrixWorld);
    p.mesh.matrixWorldNeedsUpdate = true;
  }
  O.group.visible = any;
}

/* What a ray hits first among the parts showing: { id, point } or null. */
export function pick(O, ray) {
  if (!O?.group.visible) return null;
  const hits = ray.intersectObjects([...O.parts.values()].filter(p => p.mesh.visible).map(p => p.mesh), false);
  return hits.length ? { id: hits[0].object.userData.organ, point: hits[0].point } : null;
}

/* Where a part is now (world), and how big: for the label line and the
   camera. */
const _c = new THREE.Vector3();
export function spotOf(O, id) {
  const p = O?.parts.get(id);
  if (!p) return null;
  _c.copy(p.c).applyMatrix4(p.mesh.matrix);
  const s = p.mesh.matrix.getMaxScaleOnAxis();
  return { c: _c.clone(), size: p.size * s };
}

/* Highlight one part (the selected one) with a soft glow of `colour`. */
export function mark(O, id, colour) {
  for (const [pid, p] of O?.parts || []) {
    const on = pid === id;
    p.mesh.material.emissive.set(on ? colour : p.mesh.material.color).multiplyScalar(on ? 0.45 : p.system === 'Skeletal' ? 0.04 : 0.1);
  }
}
