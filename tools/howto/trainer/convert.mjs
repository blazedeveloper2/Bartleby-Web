// node tools/howto/trainer/convert.mjs <Male_Adult_01.fbx> <outDir> <three examples/jsm dir>
// The jsm dir is three.js r160's examples/jsm (FBXLoader and its imports),
// with their `from 'three'` pointed at assets/vendor/three/three.module.min.js.
// Turns a Rocketbox FBX into trainer.json + trainer.bin: an indexed mesh in
// its bind pose (cm, y up, facing +z), the bones kept for posing with their
// bind positions and rotations, and up to four skin weights per vertex.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {}, addEventListener() {}, getContext: () => null }) };
const [, , src, outDir, jsm] = process.argv;
const THREE = await import(new URL('../../../assets/vendor/three/three.module.min.js', import.meta.url).href);
const { FBXLoader } = await import(pathToFileURL(jsm + '/loaders/FBXLoader.js').href);
const buf = readFileSync(src);
const mgr = new THREE.LoadingManager(); mgr.setURLModifier(() => 'data:,');
const _warn = console.warn; console.warn = () => {};
const obj = new FBXLoader(mgr).parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
console.warn = _warn;
obj.updateMatrixWorld(true);
let mesh; obj.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
const g = mesh.geometry, sk = mesh.skeleton;

/* Bones kept: the body, the hands' fingers. Face bones and the root fold
   into their nearest kept ancestor. */
const keep = n => /^Bip01_(Pelvis|Spine\d?|Neck|Head|[LR]_(Clavicle|UpperArm|Forearm|Hand|Finger\d+|Thigh|Calf|Foot|Toe0))$/.test(n);
const kept = sk.bones.filter(b => keep(b.name));
const idxOf = new Map(kept.map((b, i) => [b, i]));
const mapBone = b => { while (b && !idxOf.has(b)) b = b.parent; return b ? idxOf.get(b) : 0; };

/* Bind pose = the pose the file loads in (its A-pose): each bone's world
   matrix as loaded, and every vertex skinned into world space with the
   same matrices, so mesh and bones agree. */
sk.update();
const boneMat = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
const bones = kept.map(b => {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  b.matrixWorld.decompose(p, q, s);
  let par = b.parent; while (par && !idxOf.has(par)) par = par.parent;
  return { name: b.name.replace('Bip01_', ''), parent: par ? idxOf.get(par) : -1, p: p.toArray().map(v => +v.toFixed(3)), q: q.toArray().map(v => +v.toFixed(5)), s: s.toArray().map(v => +v.toFixed(4)) };
});
const skinMat = k => {
  const M = new THREE.Matrix4().set(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0);
  for (let j = 0; j < 4; j++) {
    const w = g.attributes.skinWeight.getComponent(k, j); if (!w) continue;
    const B = boneMat[g.attributes.skinIndex.getComponent(k, j)];
    for (let e = 0; e < 16; e++) M.elements[e] += B.elements[e] * w;
  }
  return new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, new THREE.Matrix4().multiplyMatrices(mesh.bindMatrixInverse, M.multiply(mesh.bindMatrix)));
};
const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
const v = new THREE.Vector3(), n = new THREE.Vector3();
const verts = [], key2i = new Map(), groups = [];
const order = [...g.groups].sort((a, b) => a.materialIndex - b.materialIndex);
const idxByMat = {};
for (const gr of order) {
  for (let k = gr.start; k < gr.start + gr.count; k++) {
    const SM = skinMat(k);
    v.fromBufferAttribute(P, k).applyMatrix4(SM);
    n.fromBufferAttribute(N, k).applyMatrix3(new THREE.Matrix3().getNormalMatrix(SM)).normalize();
    const u = [UV.getX(k), UV.getY(k)];
    // weights: fold to kept bones, keep the strongest four
    const w = new Map();
    for (let j = 0; j < 4; j++) { const wt = SW.getComponent(k, j); if (wt <= 0) continue; const bi = mapBone(sk.bones[SI.getComponent(k, j)]); w.set(bi, (w.get(bi) || 0) + wt); }
    const ws = [...w].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = ws.reduce((a, [, x]) => a + x, 0) || 1;
    const key = [v.x, v.y, v.z].map(x => x.toFixed(3)).join(',') + '|' + [n.x, n.y, n.z].map(x => x.toFixed(2)).join(',') + '|' + u.map(x => x.toFixed(4)).join(',') + '|' + gr.materialIndex;
    let id = key2i.get(key);
    if (id === undefined) {
      id = verts.length; key2i.set(key, id);
      verts.push({ p: [v.x, v.y, v.z], n: [n.x, n.y, n.z], u, si: ws.map(([b]) => b), sw: ws.map(([, x]) => x / tot) });
    }
    (idxByMat[gr.materialIndex] ||= []).push(id);
  }
}
const mats = [].concat(mesh.material).map(m => m.name);
const index = []; const ranges = [];
for (const [mi, arr] of Object.entries(idxByMat)) { ranges.push({ mat: mats[mi], start: index.length, count: arr.length }); index.push(...arr); }

/* Pack: positions int16 (cm ×50), normals int8, uv uint16, skin uint8 ×4 ×2, index uint16. */
const V = verts.length;
const lo = [0, 1, 2].map(k => Math.min(...verts.map(x => x.p[k]))), hi = [0, 1, 2].map(k => Math.max(...verts.map(x => x.p[k])));
const pos = new Int16Array(V * 3), nor = new Int8Array(V * 3), uv = new Uint16Array(V * 2), si = new Uint8Array(V * 4), sw = new Uint8Array(V * 4);
const PS = 50;
verts.forEach((x, i) => {
  for (let k = 0; k < 3; k++) { pos[i * 3 + k] = Math.round(x.p[k] * PS); nor[i * 3 + k] = Math.round(x.n[k] * 127); }
  uv[i * 2] = Math.round(Math.min(1, Math.max(0, x.u[0])) * 65535); uv[i * 2 + 1] = Math.round(Math.min(1, Math.max(0, x.u[1])) * 65535);
  let acc = 0;
  for (let j = 0; j < 4; j++) {
    si[i * 4 + j] = x.si[j] ?? 0;
    const q = j < 3 ? Math.round((x.sw[j] ?? 0) * 255) : 0; sw[i * 4 + j] = q; acc += q;
  }
  sw[i * 4 + 3] = Math.max(0, 255 - acc) * (x.sw.length > 3 ? 1 : 0) || (acc < 255 ? 0 : 0);
  // put any rounding remainder on the strongest weight
  const sum = sw[i * 4] + sw[i * 4 + 1] + sw[i * 4 + 2] + sw[i * 4 + 3];
  sw[i * 4] += 255 - sum;
});
if (V > 65535) throw new Error('too many vertices for uint16');
const ind = new Uint16Array(index);
const parts = [['position', pos], ['normal', nor], ['uv', uv], ['skinIndex', si], ['skinWeight', sw], ['index', ind]];
let off = 0; const layout = {};
const chunks = [];
for (const [name, a] of parts) {
  const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; }
  layout[name] = { offset: off, length: a.length, type: a.constructor.name };
  chunks.push(new Uint8Array(a.buffer)); off += a.byteLength;
}
mkdirSync(outDir, { recursive: true });
writeFileSync(outDir + '/trainer.bin', Buffer.concat(chunks.map(c => Buffer.from(c))));
writeFileSync(outDir + '/trainer.json', JSON.stringify({ source: 'Microsoft Rocketbox Male_Adult_01 (MIT)', units: 'cm', posScale: 1 / PS, vertices: V, layout, ranges, bones }, null, 0));
console.log('verts', V, 'tris', index.length / 3, 'bytes', off, 'bones', bones.length, 'ranges', JSON.stringify(ranges));
console.log('bbox', lo.map(x => x.toFixed(1)), hi.map(x => x.toFixed(1)));
for (const b of bones.slice(0, 12)) console.log(b.name, b.p, b.s);
