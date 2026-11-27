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
export const GLB_FILES = { tank0: 'tank_t62.glb', tank1: 'tank_abrams.glb', tank2: 'tank_t90.glb', tank3: 'tank_sep.glb', tank4: 'tank_future.glb', heli0: 'heli_blackhawk.glb', heli1: 'heli_attack.glb', heli2: 'heli_stealth.glb', truck: 'car_truck.glb', suv: 'car_suv.glb', apc: 'car_apc.glb', taxi: 'car_taxi.glb', kia: 'car_minibus.glb', b_fishing: 'boat_mashoof.glb', b_rhib: 'boat_rhib.glb', b_patrol: 'boat_patrol.glb', b_warship: 'boat_warship.glb', b_stealth: 'boat_stealth.glb', b_frigate: 'boat_frigate.glb', sold0: 'soldier_iq_1.glb', sold1: 'soldier_iq_2.glb', sold2: 'soldier_iq_3.glb', sold3: 'soldier_iq_4.glb', sold4: 'soldier_iq_5.glb', en_fighter: 'enemy_fighter.glb', en_heavy: 'enemy_heavy.glb', en_sniper: 'enemy_sniper.glb', en_officer: 'enemy_officer.glb' };
export function loadAllGLB() { return Promise.all(Object.entries(GLB_FILES).map(([k, f]) => loadGLB(k, f))); }

// مركبة بعجلات (شاحنة، سيارة…) — يضيف الجسم ويفصل العجلات حتى تدور
// cfg: { s, rotY, wheels: [[x, y, r], ...], wz: نسبة |z| الدنيا للعجلات, oy: إزاحة عمودية }
const vehCache = {}, vehTint = {};
export function glbVehicle(key, cfg, parent, tint, opts = {}) {
  if (!GLB[key]) return null;
  const sp = vehCache[key] || (vehCache[key] = splitGLB(GLB[key], (x, y, z, bb) => {
    const zmax = Math.max(-bb.min.z, bb.max.z);
    if (cfg.gun && x > cfg.gun[0] && Math.abs(y - cfg.gun[1]) < cfg.gun[2] && Math.abs(z) < cfg.gun[3]) return 'gun';
    if (Math.abs(z) > (cfg.wz || 0.5) * zmax) for (let i = 0; i < cfg.wheels.length; i++) { const w = cfg.wheels[i]; if (Math.hypot(x - w[0], y - w[1]) < w[2]) return 'w' + i; }
    return 'body';
  }, cfg.rotY || 0));
  if (!sp) return null;
  let m = sp.material;
  if (opts.burnt) m = vehTint[key + 'burnt'] || (vehTint[key + 'burnt'] = (() => { const q = m.clone(); q.color = new THREE.Color(0.17, 0.15, 0.14); q.roughness = 1; return q; })());
  else if (tint) m = vehTint[key + tint] || (vehTint[key + tint] = (() => { const q = m.clone(); q.color = new THREE.Color(1, 1, 1).lerp(new THREE.Color(tint), 0.6).multiplyScalar(1.2); return q; })());
  const S = cfg.s, oy = cfg.oy || 0;
  const mk = (g) => { const mm = new THREE.Mesh(g, m); mm.scale.setScalar(S); mm.castShadow = mm.receiveShadow = true; mm.userData.keep = true; return mm; };
  const bodyMesh = mk(sp.parts.body); bodyMesh.position.y = oy; parent.add(bodyMesh);
  const wheels = [];
  cfg.wheels.forEach((w, i) => {
    if (!sp.parts['w' + i]) return;
    const piv = new THREE.Group(); piv.position.set(w[0] * S, w[1] * S + oy, 0); piv.userData.r = w[2] * S; parent.add(piv);
    const mm = mk(sp.parts['w' + i]); mm.position.set(-w[0] * S, -w[1] * S, 0); piv.add(mm); wheels.push(piv);
  });
  let gun = null;
  if (sp.parts.gun) { // مدفع ينرفع وينزل
    gun = mk(sp.parts.gun);
    if (opts.gunPivot) { opts.gunPivot.position.set(cfg.gun[0] * S, cfg.gun[1] * S + oy, 0); gun.position.set(-cfg.gun[0] * S, -cfg.gun[1] * S, 0); opts.gunPivot.add(gun); }
    else { gun.position.y = oy; parent.add(gun); }
  }
  return { mesh: bodyMesh, wheels, gun };
}
