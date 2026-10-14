// node reduce.mjs <scene.gltf> <out.json> <targetTris>
// Welds the sculpt's chunks into one surface (y up, cm), simplifies it,
// and writes positions + indices as JSON for the next steps.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';
const [, , src, out, tgt] = process.argv;
const g = JSON.parse(readFileSync(src, 'utf8'));
const bin = readFileSync(join(dirname(src), g.buffers[0].uri));
const acc = i => {
  const a = g.accessors[i], v = g.bufferViews[a.bufferView];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const n = a.count * ({ SCALAR: 1, VEC3: 3 }[a.type]);
  const T = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
  return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * T.BYTES_PER_ELEMENT));
};
const pos = [], idx = [], key = new Map(), nrm = [];
for (const m of g.meshes) for (const p of m.primitives) {
  const P = acc(p.attributes.POSITION), I = acc(p.indices), N = acc(p.attributes.NORMAL);
  const remap = new Uint32Array(P.length / 3);
  for (let i = 0; i < P.length / 3; i++) {
    // Z-up to Y-up (the file's root matrix): (x, y, z) -> (x, z, -y)
    const x = P[i * 3], y = P[i * 3 + 2], z = -P[i * 3 + 1];
    const k = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let id = key.get(k);
    if (id === undefined) { id = pos.length / 3; key.set(k, id); pos.push(x, y, z); nrm.push(0, 0, 0); }
    nrm[id * 3] += N[i * 3]; nrm[id * 3 + 1] += N[i * 3 + 2]; nrm[id * 3 + 2] -= N[i * 3 + 1];   // the file's own normals, same turn as the points
    remap[i] = id;
  }
  for (const i of I) idx.push(remap[i]);
}
console.log('welded verts', pos.length / 3, 'tris', idx.length / 3);
/* The sculpt's triangles don't all wind the same way (its viewer shows
   both sides and uses the stored normals), so each triangle is turned to
   face the way its corners' stored normals point. */
let flipped = 0;
for (let t = 0; t < idx.length; t += 3) {
  const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
  const e1 = [0, 1, 2].map(k => pos[b * 3 + k] - pos[a * 3 + k]), e2 = [0, 1, 2].map(k => pos[c * 3 + k] - pos[a * 3 + k]);
  const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  let d = 0; for (const v of [a, b, c]) for (let k = 0; k < 3; k++) d += fn[k] * nrm[v * 3 + k];
  if (d < 0) { idx[t + 1] = c; idx[t + 2] = b; flipped++; }
}
console.log('triangles turned to face out:', flipped);
await MeshoptSimplifier.ready;
const P = new Float32Array(pos), I = new Uint32Array(idx);
const target = Math.floor(+tgt * 3);
const [S, err] = target >= I.length ? [I, 0] : MeshoptSimplifier.simplify(I, P, 3, target, 0.02, []);   // asked for at least what it has: keep it all
console.log('simplified tris', S.length / 3, 'error', err);
// compact
/* Every point kept is one of the sculpt's own, so it keeps the sculpt's
   own smooth normal (the stored ones, summed where chunks meet). Normals
   worked out again from the fewer, longer triangles come out blotchy. */
const used = new Map(), np = [], ni = [], nn = [];
for (const i of S) {
  let j = used.get(i);
  if (j === undefined) {
    j = np.length / 3; used.set(i, j); np.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) || 1;
    nn.push(nrm[i * 3] / l, nrm[i * 3 + 1] / l, nrm[i * 3 + 2] / l);
  }
  ni.push(j);
}
writeFileSync(out, JSON.stringify({ pos: np.map(v => +v.toFixed(3)), nor: nn.map(v => +v.toFixed(4)), idx: ni }));
console.log('out verts', np.length / 3);
