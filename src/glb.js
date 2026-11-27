// تحميل مجسمات GLB الاحترافية (من مجلد src/assets) وتقسيمها لقطع متحركة
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const GLB = {};
const pending = new Set();
const subs = new Set();
export const glbPending = () => pending.size > 0;
export function onGLB(fn) { subs.add(fn); return () => subs.delete(fn); }

async function readAsset(name) {
  if (window.ibra && window.ibra.asset) {
    const u8 = await window.ibra.asset(name);
    if (u8) return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }
  const r = await fetch('assets/' + name);
  if (!r.ok) throw new Error('missing ' + name);
  return r.arrayBuffer();
}

export function loadGLB(key, file) {
  pending.add(key);
  return readAsset(file)
    .then((buf) => new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej)))
    .then((gltf) => { GLB[key] = gltf.scene; })
    .catch((e) => console.warn('GLB', file, e && e.message))
    .finally(() => {
      pending.delete(key);
      if (GLB[key]) for (const f of [...subs]) f(key);
      if (!pending.size) subs.clear();
    });
}

// يدمج كل meshes المجسم (بعد تطبيق التحويلات) ويقسم المثلثات حسب دالة تصنيف
// classify(cx, cy, cz, boundingBox, maxEdge) => اسم القطعة. يرجع { parts: {name: BufferGeometry}, material }
export function splitGLB(scene, classify, rotY = 0) {
  scene.updateMatrixWorld(true);
  let src = null, material = null;
  scene.traverse((o) => { if (o.isMesh && !src) { src = o; material = o.material; } });
  if (!src) return null;
  const g = src.geometry.clone(); g.applyMatrix4(src.matrixWorld); if (rotY) g.rotateY(rotY);
  const pos = g.attributes.position;
  g.computeBoundingBox(); const bb = g.boundingBox;
  const idx = g.index ? g.index.array : [...Array(pos.count).keys()];
  const lists = {};
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a), bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b), qx = pos.getX(c), qy = pos.getY(c), qz = pos.getZ(c);
    const ed = Math.max(Math.hypot(ax - bx, ay - by, az - bz), Math.hypot(bx - qx, by - qy, bz - qz), Math.hypot(qx - ax, qy - ay, qz - az));
    const k = classify(cx, cy, cz, bb, ed);
    (lists[k] || (lists[k] = [])).push(a, b, c);
  }
  const parts = {};
  for (const k in lists) {
    const pg = new THREE.BufferGeometry();
    for (const n in g.attributes) pg.setAttribute(n, g.attributes[n]);
    pg.setIndex(lists[k]);
    parts[k] = pg;
  }
  return { parts, material };
}

// قائمة المجسمات المتوفرة باللعبة — كل ما يوصل مجسم جديد يضاف هنا
export const GLB_FILES = { tank0: 'tank_t62.glb', tank1: 'tank_abrams.glb', tank2: 'tank_t90.glb', tank3: 'tank_sep.glb', tank4: 'tank_future.glb', heli0: 'heli_blackhawk.glb', heli1: 'heli_attack.glb' };
export function loadAllGLB() { return Promise.all(Object.entries(GLB_FILES).map(([k, f]) => loadGLB(k, f))); }
