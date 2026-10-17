/* Collision scan for the anatomy bench: poses the athlete through each
   exercise's rep and reports where the body goes into the kit (the bench,
   the bar, what is held) or below the floor, worst first.
   In the bench's console:
     const S = await import('./scan.js'); await S.scanAll()            // every exercise
     await S.scan('Pull-Ups')                                           // one
   Hands on what they grip, and the body resting on a pad by under 1.2,
   are contact, not collision.
   snaps() plays a rep at 30 frames a second and reports the skin point
   whose speed changes most in one frame: a limb that flips or a body
   that jumps, rather than moves.
     await S.snaps('Push-Ups')    // [size, bone, at seconds]
     await S.snapsAll()           // every exercise, worst first */
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import * as STAGE from '../../apps/workout/stage.js?v=3d-oct16h';
import { MOTION } from '../../apps/workout/moves.js?v=3d-oct16g';

const PART = n => n.replace(/^[LR]_/, '').replace(/Finger.*/, 'Finger').replace(/^(Spine\d?|Pelvis|Clavicle|ShoulderHelper)$/, 'Torso').replace(/\d+$/, '');

export async function scan(name, { frames = 10, model = 'athlete', min = 1.2 } = {}) {
  await STAGE.ready(model);
  const st = new STAGE.Stage(name, document.documentElement), m = MOTION[name];
  const items = [];
  (m.scene || []).forEach((s, k) => {
    const o = st.kit[k];
    if (!o || s.k === 'mat') return;
    o.updateMatrixWorld(true);
    o.traverse(c => { if (c.isMesh && !c.isInstancedMesh) items.push({ kind: c.userData.wallX !== undefined ? 'wall' : s.k, mesh: c, held: false }); });
  });
  st.held.forEach(o => o.traverse(c => { if (c.isMesh) items.push({ kind: 'held', mesh: c, held: true }); }));
  for (const it of items) it.mesh.geometry.computeBoundingBox();
  const body = st.body.mesh, g = body.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, bones = st.body.T.bones;
  const idx = [], part = [];
  for (let i = 0; i < g.attributes.position.count; i += 17) {
    let b = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (w > bw) { bw = w; b = SI.getComponent(i, j); } }
    idx.push(i); part.push(PART(bones[b].name));
  }
  const worst = {}, v = new THREE.Vector3(), inv = new THREE.Matrix4();
  const note = (key, d, when) => { if (!worst[key] || d > worst[key][0]) worst[key] = [+d.toFixed(1), when]; };
  for (let f = 0; f < frames; f++) {
    const t = (f / frames) * st.tl.total;
    st.pose(st.tl.at(t));
    const when = m.tempo[st.tl.step(t).i][2];
    for (const o of st.held) o.updateMatrixWorld(true);
    const pts = idx.map(i => body.getVertexPosition(i, new THREE.Vector3()));
    pts.forEach((p, k) => { const d = (st.floorTop ?? 0) - p.y; if (d > 0.6) note('floor:' + part[k], d, when); });
    for (const it of items) {
      inv.copy(it.mesh.matrixWorld).invert();
      const bb = it.mesh.geometry.boundingBox, sc = it.mesh.matrixWorld.getMaxScaleOnAxis();
      pts.forEach((p, k) => {
        const pr = part[k];
        if (it.held && /Hand|Finger|Forearm/.test(pr)) return;
        if (/^(bar|hbar|anchor)$/.test(it.kind) && /Hand|Finger/.test(pr)) return;
        if (it.kind === 'wall' && /Hand|Finger|Foot|Toe/.test(pr) && !/^(bar|hbar)$/.test((m.scene || [])[0]?.k)) return;   // planted on the wall on purpose
        v.copy(p).applyMatrix4(inv);
        if (!bb.containsPoint(v)) return;
        const d = Math.min(v.x - bb.min.x, bb.max.x - v.x, v.y - bb.min.y, bb.max.y - v.y, v.z - bb.min.z, bb.max.z - v.z) * sc;
        note(`${it.kind}:${pr}`, d, when);
      });
    }
  }
  st.dispose();
  return Object.entries(worst).filter(([, [d]]) => d > min).sort((a, b) => b[1][0] - a[1][0]).map(([k, [d, w]]) => `${k} ${d} @${w}`);
}

export async function scanAll(opts) {
  const out = {};
  for (const n of Object.keys(MOTION)) { const r = await scan(n, opts); if (r.length) out[n] = r.slice(0, 4); }
  return out;
}

/* The largest one-frame change in speed of any sampled skin point over a
   rep: smooth motion stays under about 4; a flip or a jump shows as 10 or
   more. */
export async function snaps(name, { fps = 30, model = 'athlete' } = {}) {
  await STAGE.ready(model);
  const st = new STAGE.Stage(name, document.documentElement), B = st.body;
  const ids = B.sampleOf(/./, 61), g = B.mesh.geometry, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
  let prev = null, pv = null, worst = [0, '', 0];
  const n = Math.round(st.tl.total * fps);
  for (let f = 0; f <= n + 1; f++) {
    st.pose(st.tl.at(f / fps));
    const o = B.skinAt(ids).slice();
    if (prev) {
      const d = o.map((x, k) => x - prev[k]);
      if (pv) for (let k = 0; k < ids.length; k++) {
        const a = Math.hypot(d[3 * k] - pv[3 * k], d[3 * k + 1] - pv[3 * k + 1], d[3 * k + 2] - pv[3 * k + 2]);
        if (a > worst[0]) {
          let b = 0, bw = -1;
          for (let j = 0; j < 4; j++) if (SW[4 * ids[k] + j] > bw) { bw = SW[4 * ids[k] + j]; b = SI[4 * ids[k] + j]; }
          worst = [a, B.T.bones[b].name, f / fps];
        }
      }
      pv = d;
    }
    prev = o;
  }
  st.dispose();
  return [+worst[0].toFixed(1), worst[1], +worst[2].toFixed(2)];
}

export async function snapsAll(opts) {
  const out = [];
  for (const n of Object.keys(MOTION)) out.push([n, ...await snaps(n, opts)]);
  return out.sort((a, b) => b[1] - a[1]);
}
