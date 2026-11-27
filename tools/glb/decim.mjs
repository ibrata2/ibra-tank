// decim.mjs raw.glb out.ply targetTris [error]  — لحم الرؤوس بالموقع فقط ثم تبسيط meshopt (يحافظ على الشكل أفضل للبنايات)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
await MeshoptSimplifier.ready;
const [,, inp, out, tgt, errArg] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
const map = new Map(), remap = new Uint32Array(pos.length / 3), wp = [];
for (let i = 0; i < pos.length / 3; i++) {
  const k = Math.round(pos[i * 3] * 1e5) + ',' + Math.round(pos[i * 3 + 1] * 1e5) + ',' + Math.round(pos[i * 3 + 2] * 1e5);
  let j = map.get(k); if (j === undefined) { j = wp.length / 3; map.set(k, j); wp.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
  remap[i] = j;
}
const widx = []; for (let t = 0; t < idx.length; t += 3) { const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]]; if (a !== b && b !== c && a !== c) widx.push(a, b, c); }
const P = new Float32Array(wp), I = new Uint32Array(widx);
const [res, err] = MeshoptSimplifier.simplify(I, P, 3, Math.min(I.length, (+tgt) * 3), +(errArg || 0.02));
console.log('welded', P.length / 3, 'tris', I.length / 3, '->', res.length / 3, 'err', err.toFixed(5));
// compact + write binary PLY (Y-up: x, -z, y)
const used = new Map(); const V = []; const F = new Uint32Array(res.length);
for (let i = 0; i < res.length; i++) { let j = used.get(res[i]); if (j === undefined) { j = V.length / 3; used.set(res[i], j); V.push(P[res[i] * 3], -P[res[i] * 3 + 2], P[res[i] * 3 + 1]); } F[i] = j; }
const head = `ply\nformat binary_little_endian 1.0\nelement vertex ${V.length / 3}\nproperty float x\nproperty float y\nproperty float z\nelement face ${F.length / 3}\nproperty list uchar int vertex_indices\nend_header\n`;
const vb = Buffer.from(new Float32Array(V).buffer), fb = Buffer.alloc(F.length / 3 * 13);
for (let t = 0; t < F.length / 3; t++) { fb.writeUInt8(3, t * 13); fb.writeInt32LE(F[t * 3], t * 13 + 1); fb.writeInt32LE(F[t * 3 + 1], t * 13 + 5); fb.writeInt32LE(F[t * 3 + 2], t * 13 + 9); }
fs.writeFileSync(out, Buffer.concat([Buffer.from(head), vb, fb]));
