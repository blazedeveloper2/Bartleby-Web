// Shared loader for the packed Rocketbox trainer (a <trainer> folder made by convert.mjs; a build input, not shipped).
import { readFileSync } from 'node:fs';
export function loadRB(dir) {
  const meta = JSON.parse(readFileSync(dir + '/trainer.json', 'utf8'));
  const b = readFileSync(dir + '/trainer.bin');
  const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const arr = (n, T) => new T(buf, meta.layout[n].offset, meta.layout[n].length);
  const p16 = arr('position', Int16Array), pos = Float32Array.from(p16, v => v * meta.posScale);
  return {
    meta, pos, nor: arr('normal', Int8Array), uv: arr('uv', Uint16Array),
    si: arr('skinIndex', Uint8Array), sw: arr('skinWeight', Uint8Array), idx: arr('index', Uint16Array),
    bones: meta.bones, ranges: meta.ranges,
  };
}
export const dominant = (R, i) => { let b = 0, w = -1; for (let j = 0; j < 4; j++) if (R.sw[i * 4 + j] > w) { w = R.sw[i * 4 + j]; b = R.si[i * 4 + j]; } return b; };
