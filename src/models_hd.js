// نماذج واقعية مفصّلة: الجنود، الدبابات (5 عائلات × 5 تطويرات)، الهليكوبتر، السيارات العسكرية، القوارب
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex, rng, treadTexture, wheelTexture, iraqFlagTexture } from './textures.js';
import { mat, SOLDIER_TYPES, UNIFORMS } from './models.js';

const std = (color, rough = 0.75, metal = 0.25, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const gcache = new Map();
const geo = (key, make) => { if (!gcache.has(key)) gcache.set(key, make()); return gcache.get(key); };
const RB = (w, h, d, r = 0.03, s = 2) => geo(`rb${w}|${h}|${d}|${r}|${s}`, () => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
const CAP = (rad, len, rs = 10) => geo(`cap${rad}|${len}|${rs}`, () => new THREE.CapsuleGeometry(rad, len, 4, rs));
const CYL = (a, b, h, s = 12) => geo(`cyl${a}|${b}|${h}|${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const SPH = (r, w = 16, h = 12) => geo(`sph${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
const M = (g, m, x = 0, y = 0, z = 0, parent = null) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (parent) parent.add(o); return o; };
// دمج القطع الثابتة داخل كل مفصل في mesh واحد (أداء أعلى بكثير)
export function bake(node) {
  const meshes = node.children.filter(c => c.isMesh && !c.isInstancedMesh && !c.userData.keep && c.children.length === 0 && !Array.isArray(c.material));
  if (meshes.length >= 2) {
    const mats = [], geos = [];
    for (const m of meshes) {
      m.updateMatrix();
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
      g.applyMatrix4(m.matrix);
      geos.push(g);
      let mi = mats.indexOf(m.material); if (mi < 0) { mats.push(m.material); mi = mats.length - 1; }
      m.userData.mi = mi;
    }
    const merged = mergeGeometries(geos, true);
    if (merged) {
      merged.groups.forEach((gr, i) => { gr.materialIndex = meshes[i].userData.mi; });
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, mats.length === 1 ? mats[0] : mats);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.baked = true;
      if (mats.length === 1) merged.clearGroups();
      for (const m of meshes) node.remove(m);
      node.add(mesh);
    }
  }
  for (const c of [...node.children]) if (!c.isMesh) bake(c);
  return node;
}
function shadowAll(o) { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; }

// ------------------------------------------------------------ textures
function digiCamo(cols, seed, px = 5) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = cols[0]; g.fillRect(0, 0, w, h);
    for (let layer = 1; layer < cols.length; layer++) {
      g.fillStyle = cols[layer];
      const n = 70 - layer * 12;
      for (let i = 0; i < n; i++) {
        let x = Math.floor(r() * w / px) * px, y = Math.floor(r() * h / px) * px;
        const len = 4 + Math.floor(r() * 9);
        for (let k = 0; k < len; k++) {
          g.fillRect(x, y, px * (1 + Math.floor(r() * 3)), px * (1 + Math.floor(r() * 2)));
          g.fillRect((x + w) % w, (y + h) % h, px, px);
          x += (Math.floor(r() * 3) - 1) * px; y += (Math.floor(r() * 3) - 1) * px;
        }
      }
    }
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
function armorTex(base, seed, opts = {}) { // painted steel with dirt, panel lines and rivets
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (opts.camo) {
      for (let li = 0; li < opts.camo.length; li++) {
        g.fillStyle = opts.camo[li];
        for (let i = 0; i < 16; i++) {
          const x = r() * w, y = r() * h, rx = 40 + r() * 90, ry = 18 + r() * 40;
          for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); for (let k = 0; k < 4; k++) g.ellipse(x + ox + (r() - 0.5) * rx, y + oy + (r() - 0.5) * ry, rx * (0.4 + r() * 0.5), ry * (0.4 + r() * 0.5), r() * 3, 0, 7); g.fill(); }
        }
      }
    }
    // dust gradient + streaks
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,240,210,0.05)'); grd.addColorStop(1, 'rgba(90,70,40,0.22)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.07;
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 6 + r() * 40); }
    g.globalAlpha = 1;
    // panel lines
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 120; i++) { g.beginPath(); g.arc(r() * w, r() * h, 1.6, 0, 7); g.fill(); }
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
const paintMat = (key, base, seed, opts = {}) => mat('paint|' + key, () => { const t = armorTex(base, seed, opts); t.repeat.set(opts.rep || 0.3, opts.rep || 0.3); return std(0xffffff, opts.rough ?? 0.72, opts.metal ?? 0.28, { map: t }); });
const glassM = () => mat('hdglass2', () => std('#4d6470', 0.12, 0.35, { envMapIntensity: 1.4 }));
const darkM = () => mat('hddark', () => std('#25261f', 0.7, 0.45));
const steelM = () => mat('hdsteel', () => std('#55574f', 0.45, 0.75));
const rubberM = () => mat('hdrubber', () => std('#141413', 0.95, 0.02));

// ============================================================ SOLDIERS
const FRIEND_TIERS = [
  { uni: ['#56633f', '#46522f', '#647149', '#3c4629'], vest: '#4c5634', helm: '#4e5a37', boots: '#2a2620' }, // الجندي المتدرب
  { uni: ['#b9a27a', '#8d7a56', '#d2bf96', '#6e5f42'], vest: '#8d7d5a', helm: '#a8946c', boots: '#7a6448' }, // المقاتل الأساسي
  { uni: ['#b4a27c', '#8a7a58', '#cdbd98', '#6b5e44'], vest: '#a8966e', helm: '#9c8b66', boots: '#7a6448', nvg: true }, // العمليات المتقدم
  { uni: ['#a89a76', '#7c6e4f', '#5b5a3e', '#c8b994'], vest: '#9a8c68', helm: '#8f8566', boots: '#6e5c44', nvg: true }, // القابل للتكيف
  { uni: ['#9a9d98', '#6f736f', '#c4c6c1', '#4f534f'], vest: '#6d716c', helm: '#5c605c', boots: '#3a3a38', future: true }, // جندي المستقبل
];
const SKINS = ['#c99a74', '#a8764f', '#8d5a3b', '#d9b08c', '#b98962'];

function buildWeapon(kind, m) {
  const g = new THREE.Group();
  const gun = mat('gunmetal2', () => std('#2b2c2a', 0.42, 0.75));
  const poly = mat('polymer', () => std('#1f201d', 0.8, 0.1));
  const tan = mat('polytan', () => std('#8b7a58', 0.8, 0.1));
  let muzzleX = 0.6, muzzleY = 0.02;
  if (kind === 'rifle' || kind === 'pistol0') {
    M(RB(0.3, 0.075, 0.05, 0.012), gun, 0.05, 0, 0, g); // receiver
    M(RB(0.26, 0.06, 0.055, 0.015), m.friendly && m.tier >= 2 ? tan : poly, 0.32, 0.005, 0, g); // handguard
    const bar = M(CYL(0.011, 0.011, 0.24, 8), gun, 0.56, 0.01, 0, g); bar.rotation.z = Math.PI / 2;
    M(RB(0.04, 0.03, 0.03, 0.006), gun, 0.68, 0.01, 0, g); // flash hider
    const mag = M(RB(0.05, 0.16, 0.03, 0.01), poly, 0.09, -0.1, 0, g); mag.rotation.z = 0.22;
    const grip = M(RB(0.04, 0.1, 0.035, 0.01), poly, -0.06, -0.07, 0, g); grip.rotation.z = -0.35;
    M(RB(0.22, 0.065, 0.04, 0.015), m.friendly && m.tier >= 2 ? tan : poly, -0.24, -0.01, 0, g); // stock
    M(RB(0.07, 0.02, 0.025, 0.004), gun, -0.32, 0.03, 0, g);
    const opt = M(CYL(0.022, 0.022, 0.1, 10), poly, 0.05, 0.07, 0, g); opt.rotation.z = Math.PI / 2;
    M(RB(0.06, 0.03, 0.03, 0.006), poly, 0.05, 0.045, 0, g);
    if (m.friendly && m.tier >= 2) { M(RB(0.05, 0.03, 0.03, 0.008), poly, 0.36, -0.045, 0.0, g); M(CYL(0.012, 0.012, 0.06, 6), poly, 0.33, -0.08, 0, g); }
    muzzleX = 0.72;
  } else if (kind === 'mg') {
    M(RB(0.36, 0.1, 0.07, 0.015), gun, 0.05, 0, 0, g);
    const bar = M(CYL(0.018, 0.018, 0.5, 8), gun, 0.5, 0.0, 0, g); bar.rotation.z = Math.PI / 2;
    M(RB(0.2, 0.065, 0.075, 0.015), poly, 0.33, 0.0, 0, g);
    M(RB(0.14, 0.13, 0.11, 0.02), mat('ammobox', () => std('#4a5034', 0.8, 0.2)), 0.05, -0.12, 0.03, g);
    M(RB(0.24, 0.075, 0.045, 0.015), poly, -0.24, -0.02, 0, g);
    const grip = M(RB(0.04, 0.1, 0.035, 0.01), poly, -0.08, -0.08, 0, g); grip.rotation.z = -0.35;
    M(RB(0.18, 0.03, 0.02, 0.006), gun, 0.05, 0.075, 0, g); // carry handle
    for (const z of [-0.02, 0.02]) { const bp = M(CYL(0.007, 0.007, 0.25, 5), gun, 0.62, -0.06, z, g); bp.rotation.z = Math.PI / 2 + 0.25; }
    muzzleX = 0.78;
  } else if (kind === 'rpg') {
    const tube = M(CYL(0.045, 0.045, 1.0, 14), mat('rpgtube2', () => std('#4a4a34', 0.65, 0.35)), 0.05, 0.0, 0, g); tube.rotation.z = Math.PI / 2;
    const war = M(geo('rpgcone', () => new THREE.ConeGeometry(0.085, 0.3, 14)), mat('rpgwar2', () => std('#55603a', 0.6, 0.3)), 0.75, 0, 0, g); war.rotation.z = -Math.PI / 2;
    const warb = M(CYL(0.085, 0.05, 0.14, 14), war.material, 0.53, 0, 0, g); warb.rotation.z = Math.PI / 2;
    M(RB(0.04, 0.1, 0.035, 0.01), poly, 0.1, -0.08, 0, g); M(RB(0.04, 0.1, 0.035, 0.01), poly, -0.1, -0.08, 0, g);
    M(RB(0.08, 0.06, 0.04, 0.01), poly, 0.0, 0.07, 0.05, g);
    g.userData.rpgWarhead = [war, warb];
    muzzleX = 0.9; muzzleY = 0;
  } else if (kind === 'sniper') {
    M(RB(0.3, 0.07, 0.05, 0.012), gun, 0.05, 0, 0, g);
    const bar = M(CYL(0.012, 0.014, 0.6, 8), gun, 0.52, 0.01, 0, g); bar.rotation.z = Math.PI / 2;
    M(RB(0.3, 0.07, 0.05, 0.02), mat('sniperstock', () => std('#5b5240', 0.8, 0.1)), -0.26, -0.01, 0, g);
    const sc = M(CYL(0.025, 0.03, 0.3, 12), poly, 0.06, 0.08, 0, g); sc.rotation.z = Math.PI / 2;
    M(RB(0.04, 0.12, 0.03, 0.01), poly, 0.12, -0.09, 0, g);
    for (const z of [-0.025, 0.025]) { const bp = M(CYL(0.007, 0.007, 0.25, 5), gun, 0.45, -0.1, z, g); bp.rotation.z = 0.5; }
    muzzleX = 0.84;
  } else { // pistol
    M(RB(0.18, 0.05, 0.03, 0.01), gun, 0.06, 0, 0, g);
    const grip = M(RB(0.04, 0.09, 0.028, 0.01), poly, -0.0, -0.06, 0, g); grip.rotation.z = -0.25;
    muzzleX = 0.16;
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(muzzleX, muzzleY, 0); g.add(muzzle);
  return { g, muzzle };
}

const soldierProto = new Map();
export function buildSoldierHD(typeKey, uniformKey = 'desert', seed = 1, friendly = false, opts = {}) {
  const key = [typeKey, uniformKey, friendly ? 1 : 0, opts.tier ?? 1, seed % 4, opts.drone === false ? 0 : 1, opts.armor ? 1 : 0].join('|');
  if (!soldierProto.has(key)) soldierProto.set(key, buildSoldierRaw(typeKey, uniformKey, seed % 4 + 1, friendly, opts));
  const proto = soldierProto.get(key);
  const root = proto.root.clone(true);
  const q = (n) => root.getObjectByName(n);
  const L = { hip: q('hipL'), knee: q('kneeL') }, R2 = { hip: q('hipR'), knee: q('kneeR') };
  const weapon = q('weapon');
  if (proto.warheadNames) weapon.userData.rpgWarhead = proto.warheadNames.map(n => q(n));
  const pose = (sit = false) => {
    for (const leg of [L, R2]) { const h = leg.hip.rotation.z; leg.knee.rotation.z = sit ? -1.5 : -0.05 - Math.max(0, -h) * 1.25 - Math.max(0, h) * 0.25; }
  };
  return { root, body: q('body'), legL: L.hip, legR: R2.hip, armL: q('armL'), armR: q('armR'), weapon, muzzle: q('muzzle'), head: q('head'), height: 1.92, type: typeKey, pose };
}
function buildSoldierRaw(typeKey, uniformKey, seed, friendly, opts) {
  const T = SOLDIER_TYPES[typeKey] || SOLDIER_TYPES.rifleman;
  const r = rng(seed * 977 + 13);
  const tier = friendly ? Math.max(0, Math.min(4, opts.tier ?? 1)) : 0;
  const FT = FRIEND_TIERS[tier];
  const pal = friendly ? FT.uni : (UNIFORMS[uniformKey] || UNIFORMS.desert).concat(['#2e2f2a']);
  const ukey = (friendly ? 'f' + tier : 'e' + uniformKey) + (seed % 2);
  const uni = mat('uniHD|' + ukey, () => { const t = digiCamo(pal, 40 + (seed % 2), friendly ? 4 : 6); t.repeat.set(1.6, 1.6); return std(0xffffff, 0.92, 0.0, { map: t }); });
  const vest = mat('vestHD|' + ukey, () => { const t = digiCamo(friendly ? [FT.vest, pal[1], pal[2]] : ['#34352e', '#2a2b25', '#3e3f36'], 70 + (seed % 2), 4); t.repeat.set(1.2, 1.2); return std(0xffffff, 0.88, 0.05, { map: t }); });
  const vestDark = mat('vestDark|' + (friendly ? FT.vest : 'e'), () => std(new THREE.Color(friendly ? FT.vest : '#2b2c26').multiplyScalar(0.8), 0.85, 0.05));
  const skin = mat('skinHD' + (seed % SKINS.length), () => std(SKINS[seed % SKINS.length], 0.62, 0.0));
  const boots = mat('boots' + (friendly ? FT.boots : 'e'), () => std(friendly ? FT.boots : '#1d1c1a', 0.75, 0.05));
  const black = mat('sblack2', () => std('#121212', 0.7, 0.1));
  const glove = mat('glove' + (friendly && tier >= 1 ? 't' : 'b'), () => std(friendly && tier >= 1 ? '#6d5d44' : '#1c1c1a', 0.8, 0.05));

  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.name = 'body';
  // legs (hip → knee → boot)
  const mkLeg = (z) => {
    const hip = new THREE.Group(); hip.position.set(0, 0.93, z); body.add(hip); hip.name = z > 0 ? 'hipL' : 'hipR';
    M(CAP(0.088, 0.28), uni, 0, -0.21, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee); knee.name = z > 0 ? 'kneeL' : 'kneeR';
    M(RB(0.07, 0.13, 0.12, 0.03), vestDark, 0.075, 0.0, 0, knee); // knee pad
    M(CAP(0.074, 0.28), uni, 0, -0.2, 0, knee);
    M(RB(0.28, 0.13, 0.125, 0.04), boots, 0.05, -0.43, 0, knee);
    M(RB(0.29, 0.035, 0.13, 0.012), black, 0.05, -0.49, 0, knee); // sole
    return { hip, knee };
  };
  const L = mkLeg(0.105), R = mkLeg(-0.105);
  // pelvis / torso
  M(RB(0.26, 0.2, 0.36, 0.07), uni, 0, 0.99, 0, body);
  M(RB(0.28, 0.06, 0.38, 0.02), mat('belt', () => std('#2c2a22', 0.8, 0.1)), 0, 1.08, 0, body);
  const torso = M(CAP(0.16, 0.26, 12), uni, 0, 1.33, 0, body); torso.scale.set(0.85, 1, 1.22);
  const heavy = typeKey === 'heavy' || (friendly && opts.armor);
  const vb = M(RB(0.3, 0.42, 0.44, 0.06), vest, 0.01, 1.33, 0, body);
  if (heavy) vb.scale.set(1.25, 1.18, 1.12);
  for (let i = 0; i < 3; i++) M(RB(0.07, 0.13, 0.095, 0.02), vestDark, 0.175, 1.22, -0.105 + i * 0.105, body); // mag pouches
  M(RB(0.06, 0.09, 0.08, 0.02), vestDark, 0.17, 1.4, 0.12, body);
  M(RB(0.17, 0.32, 0.3, 0.05), vestDark, -0.21, 1.35, 0, body); // back pack / radio
  if (friendly ? tier >= 2 : r() < 0.4) { const ant = M(CYL(0.006, 0.006, 0.55, 4), black, -0.27, 1.75, -0.1, body); ant.rotation.z = 0.15; }
  M(RB(0.12, 0.05, 0.3, 0.02), uni, 0.02, 1.55, 0, body); // collar
  M(CYL(0.052, 0.058, 0.1, 10), skin, 0, 1.6, 0, body);
  const head = M(SPH(0.112), skin, 0.005, 1.71, 0, body); head.scale.set(1.0, 1.13, 0.95); head.name = 'head'; head.userData.keep = true;
  M(RB(0.035, 0.05, 0.03, 0.01), skin, 0.112, 1.695, 0, body); // nose
  for (const z of [0.042, -0.042]) M(SPH(0.012, 6, 4), black, 0.098, 1.73, z, body); // eyes
  for (const z of [0.108, -0.108]) M(SPH(0.025, 6, 4), skin, -0.005, 1.7, z, body); // ears
  if (friendly && r() < 0.6) M(RB(0.03, 0.022, 0.1, 0.008), black, 0.11, 1.665, 0, body); // mustache

  // headgear
  const gear = T.gear;
  const helmMat = mat('helm|' + (friendly ? tier : uniformKey), () => { const t = digiCamo(friendly ? [FT.helm, pal[1], pal[2]] : [pal[1], pal[0], '#2e2f2a'], 90, 4); t.repeat.set(1, 1); return std(0xffffff, 0.8, 0.05, { map: t }); });
  const helmet = (scale = 1) => {
    const h = M(geo('helmetg', () => new THREE.SphereGeometry(0.138, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56)), helmMat, -0.005, 1.735, 0, body);
    h.scale.set(1.08 * scale, 0.96 * scale, 1.02 * scale);
    const rim = M(geo('helmrim', () => new THREE.TorusGeometry(0.138, 0.012, 6, 20)), helmMat, -0.005, 1.74, 0, body); rim.rotation.x = Math.PI / 2; rim.scale.set(1.08, 1.02, 1);
    M(RB(0.015, 0.09, 0.012, 0.004), black, 0.04, 1.66, 0.11, body); M(RB(0.015, 0.09, 0.012, 0.004), black, 0.04, 1.66, -0.11, body); // straps
  };
  if (friendly) {
    if (FT.future) {
      const h = M(SPH(0.15, 18, 14), helmMat, 0, 1.73, 0, body); h.scale.set(1.08, 1.05, 1.0);
      const visor = M(geo('visor2', () => new THREE.SphereGeometry(0.152, 18, 10, -0.9, 1.8, 1.1, 0.75)), mat('visorHD', () => std('#0d1418', 0.05, 0.95)), 0.0, 1.73, 0, body); visor.scale.set(1.08, 1.05, 1.0);
    } else {
      helmet();
      if (FT.nvg) { M(RB(0.05, 0.04, 0.06, 0.01), black, 0.12, 1.79, 0, body); const nv = M(CYL(0.02, 0.022, 0.08, 8), black, 0.14, 1.83, 0, body); nv.rotation.z = Math.PI / 2 + 0.5; }
      if (tier >= 1) M(RB(0.06, 0.035, 0.24, 0.01), mat('goggle', () => std('#2f2a22', 0.6, 0.2)), 0.07, 1.82, 0, body);
    }
  } else if (gear === 'helmet' || gear === 'heavy') {
    helmet(gear === 'heavy' ? 1.05 : 1);
    if (gear === 'heavy') M(RB(0.05, 0.13, 0.24, 0.02), mat('visorHD', () => std('#0d1418', 0.05, 0.95)), 0.14, 1.7, 0, body);
  } else if (gear === 'scarf') { // balaclava
    const sc = mat('balaHD' + (seed % 2), () => std(seed % 2 ? '#262624' : '#3a3c34', 0.95, 0));
    const h = M(SPH(0.122), sc, 0, 1.72, 0, body); h.scale.set(1.0, 1.15, 0.98);
    M(RB(0.03, 0.035, 0.14, 0.01), skin, 0.108, 1.735, 0, body);
  } else if (gear === 'cap') {
    const c = M(CYL(0.12, 0.125, 0.09, 16), uni, 0, 1.79, 0, body);
    M(RB(0.12, 0.015, 0.2, 0.006), uni, 0.12, 1.76, 0, body); void c;
  } else if (gear === 'boonie') {
    M(CYL(0.11, 0.125, 0.09, 16), uni, 0, 1.8, 0, body);
    M(CYL(0.22, 0.22, 0.015, 20), uni, 0, 1.76, 0, body);
    for (let i = 0; i < 8; i++) { const st = M(RB(0.03, 0.22, 0.03, 0.008), mat('ghillie', () => std('#5c5a3c', 1, 0)), -0.18 + r() * 0.08, 1.45 - i * 0.04, -0.2 + r() * 0.4, body); st.rotation.z = (r() - 0.5) * 0.6; }
  } else if (gear === 'beret') {
    const b = M(CYL(0.14, 0.12, 0.06, 16), mat('beretE', () => std('#2b2b2b', 0.95, 0)), -0.01, 1.81, 0.01, body); b.rotation.x = 0.22;
  }

  // arms: shoulder → elbow → glove
  const mkArm = (z, sh, el) => {
    const shoulder = new THREE.Group(); shoulder.position.set(0.0, 1.47, z); body.add(shoulder);
    M(SPH(0.07, 10, 8), vest, 0, 0, 0, shoulder);
    M(CAP(0.06, 0.19), uni, 0, -0.15, 0, shoulder);
    const elbow = new THREE.Group(); elbow.position.y = -0.3; shoulder.add(elbow);
    M(CAP(0.052, 0.18), uni, 0, -0.13, 0, elbow);
    M(SPH(0.05, 10, 8), glove, 0, -0.29, 0, elbow);
    shoulder.rotation.z = sh; elbow.rotation.z = el;
    return { shoulder, elbow };
  };
  const W = T.weapon;
  const poses = { rifle: [0.35, 1.55, 0.75, 1.05], mg: [0.25, 1.5, 0.7, 0.95], rpg: [0.95, 1.6, 1.35, 0.7], sniper: [0.35, 1.55, 0.8, 1.05], pistol: [1.25, 0.25, 1.15, 0.25] }[W] || [0.35, 1.55, 0.75, 1.05];
  const armR = mkArm(-0.215, poses[0], poses[1]); armR.shoulder.name = 'armR';
  const armL = mkArm(0.215, poses[2], poses[3]); armL.shoulder.name = 'armL';
  if (friendly) {
    const pm = mat('iqpatch', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.8 }));
    const patch = new THREE.Mesh(geo('patchg', () => new THREE.PlaneGeometry(0.11, 0.075)), pm); patch.position.set(0, -0.1, 0.063); armL.shoulder.add(patch);
    const p2 = new THREE.Mesh(patch.geometry, pm); p2.position.set(0, -0.1, -0.063); p2.rotation.y = Math.PI; armR.shoulder.add(p2);
    const chest = new THREE.Mesh(patch.geometry, pm); chest.position.set(0.168, 1.47, 0.11); chest.rotation.y = Math.PI / 2; body.add(chest);
  }
  // weapon
  const w = buildWeapon(W, { friendly, tier });
  const weapon = w.g; weapon.name = 'weapon'; w.muzzle.name = 'muzzle';
  let warheadNames = null;
  if (weapon.userData.rpgWarhead) { warheadNames = ['wh0', 'wh1']; weapon.userData.rpgWarhead.forEach((m, i) => { m.name = warheadNames[i]; m.userData.keep = true; }); }
  if (W === 'rpg') weapon.position.set(0.05, 1.53, -0.16);
  else if (W === 'pistol') weapon.position.set(0.55, 1.36, -0.02);
  else weapon.position.set(0.32, 1.29, -0.05);
  body.add(weapon);
  // drone for tier 4 / 5 friendlies (المعدات الخاصة)
  if (friendly && tier >= 3 && opts.drone !== false) {
    const dr = buildDrone(0.35); dr.position.set(-0.3, 2.6, 0.4); root.add(dr); root.userData.drone = dr;
  }
  shadowAll(root);
  bake(root);
  void L; void R;
  return { root, warheadNames };
}

// small quadcopter drone
export function buildDrone(s = 1) {
  const g = new THREE.Group();
  const dm = mat('droneM', () => std('#2c2f31', 0.5, 0.5));
  M(RB(0.5, 0.12, 0.3, 0.04), dm, 0, 0, 0, g);
  const props = [];
  for (const [x, z] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) {
    const arm = M(RB(0.5, 0.04, 0.05, 0.01), dm, x / 2, 0.02, z / 2, g); arm.rotation.y = Math.atan2(-z, x);
    const p = M(CYL(0.2, 0.2, 0.01, 16), mat('propblur', () => new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.35, depthWrite: false })), x, 0.08, z, g); props.push(p);
  }
  const cam = M(SPH(0.07, 10, 8), mat('hdglass2', () => std('#0d1418', 0.1, 0.9)), 0.15, -0.09, 0, g);
  void cam;
  const off = Math.random() * 10;
  g.userData.update = (t) => { g.position.y += Math.sin(t * 2 + off) * 0.004; g.rotation.y = Math.sin(t * 0.5 + off) * 0.3; };
  g.scale.setScalar(s);
  return shadowAll(g);
}

// ============================================================ TANK (5 families × 5 upgrades)
export const TANK_FAMILIES = [
  { name: 'T-62', base: '#5f6450', camo: null, wheels: 5, wr: 0.5, skirts: false, len: 6.8 },
  { name: 'M1 Abrams', base: '#b59f74', camo: null, wheels: 7, wr: 0.38, skirts: true, len: 7.6 },
  { name: 'T-90', base: '#5b6340', camo: ['#3e4530', '#7d7a55'], wheels: 6, wr: 0.42, skirts: true, len: 7.2 },
  { name: 'M1A2 SEP', base: '#9a9168', camo: ['#7a7450', '#b7ad86'], wheels: 7, wr: 0.38, skirts: true, len: 7.8 },
  { name: 'Future MBT', base: '#6e7270', camo: null, wheels: 7, wr: 0.36, skirts: true, len: 8.0 },
];

function stadium(x0, x1, y0, y1) {
  const r = (y1 - y0) / 2, s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(x0 + r, y1); s.absarc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}
function ext(points, depth, bevel = 0.05, taper = null) {
  const s = new THREE.Shape(); s.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2);
  if (taper) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * taper(p.getX(i), p.getY(i))); g.computeVertexNormals(); }
  return g;
}

function buildFamily(fi, paint, opts) {
  const F = TANK_FAMILIES[fi];
  const g = new THREE.Group();
  const dark = darkM(), steel = steelM(), rubber = rubberM();
  const tread = mat('treadHD', () => { const t = treadTexture(); t.repeat.set(1, 7); return std(0xffffff, 0.92, 0.35, { map: t }); });
  const wheelFace = mat('wheelfaceHD', () => std(0xffffff, 0.6, 0.45, { map: wheelTexture() }));
  const half = F.len / 2;
  const W = fi === 0 ? 3.1 : 3.5;
  const tz = W / 2 - 0.3;
  // tracks
  const trackShape = stadium(-half + 0.05, half - 0.1, 0.02, fi === 0 ? 1.0 : 0.95);
  trackShape.holes.push(stadium(-half + 0.22, half - 0.27, 0.17, fi === 0 ? 0.85 : 0.8));
  const tg = new THREE.ExtrudeGeometry(trackShape, { depth: 0.62, bevelEnabled: false, curveSegments: 12 });
  const wheels = [];
  const wg = CYL(F.wr, F.wr, 0.5, 20); const wgr = geo('wg' + F.wr, () => { const c = new THREE.CylinderGeometry(F.wr, F.wr, 0.5, 20); c.rotateX(Math.PI / 2); return c; });
  void wg;
  for (const side of [-1, 1]) {
    const tr = new THREE.Mesh(tg, tread); tr.position.z = side * tz - 0.31; g.add(tr);
    const span = (F.len - 1.4);
    for (let i = 0; i < F.wheels; i++) {
      const w = new THREE.Mesh(wgr, [rubber, wheelFace, wheelFace]);
      w.position.set(-span / 2 + (i * span) / (F.wheels - 1), F.wr + 0.08, side * tz); g.add(w); wheels.push(w); w.userData.keep = true;
    }
    const spg = geo('spr', () => { const c = new THREE.CylinderGeometry(0.33, 0.33, 0.52, 14); c.rotateX(Math.PI / 2); return c; });
    for (const x of [half - 0.55, -half + 0.5]) { const w = new THREE.Mesh(spg, [steel, wheelFace, wheelFace]); w.position.set(x, 0.55, side * tz); g.add(w); wheels.push(w); w.userData.keep = true; }
    if (fi >= 2) for (let i = 0; i < 3; i++) M(geo('rr', () => { const c = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8); c.rotateX(Math.PI / 2); return c; }), steel, -1.6 + i * 1.6, 0.86, side * tz, g);
  }
  M(RB(F.len - 0.6, 0.6, W - 1.2, 0.05), dark, 0, 0.72, 0, g); // lower hull
  // ---- hull
  let hullPts;
  if (fi === 0) hullPts = [[-half, 0.98], [-half - 0.05, 1.45], [half - 0.9, 1.5], [half + 0.25, 1.02]];
  else if (fi === 4) hullPts = [[-half, 0.95], [-half - 0.1, 1.55], [-half + 0.8, 1.72], [half - 2.0, 1.72], [half + 0.3, 1.22], [half + 0.15, 0.95]];
  else hullPts = [[-half, 0.98], [-half - 0.05, 1.6], [half - 2.0, 1.68], [half + 0.25, 1.15], [half + 0.05, 0.98]];
  const hull = M(ext(hullPts, W, 0.06), paint, 0, 0, 0, g);
  void hull;
  // side skirts
  if (F.skirts) {
    const n = fi === 4 ? 4 : 6;
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
      const pw = (F.len - 0.4) / n;
      const p = M(RB(pw - 0.04, fi === 4 ? 0.75 : 0.52, 0.07, 0.02), paint, -half + 0.2 + pw * (i + 0.5), fi === 4 ? 1.05 : 1.12, side * (W / 2 + 0.06), g);
      p.rotation.x = side * 0.03;
    }
    if (fi === 2) for (const side of [-1, 1]) for (let i = 0; i < 10; i++) M(RB(0.6, 0.28, 0.04, 0.01), rubber, -half + 0.5 + i * 0.68, 0.78, side * (W / 2 + 0.07), g);
  } else {
    for (const side of [-1, 1]) M(RB(F.len - 0.3, 0.05, 0.5, 0.01), paint, 0, 1.03, side * (W / 2 - 0.05), g); // fender
  }
  // headlights + tow hooks
  for (const side of [-1, 1]) { const hl = M(CYL(0.09, 0.09, 0.12, 10), mat('lampHD', () => std('#f2ecd0', 0.2, 0.3, { emissive: '#3a3420', emissiveIntensity: 0.4 })), half - 0.25, 1.35, side * (W / 2 - 0.25), g); hl.rotation.z = Math.PI / 2; }
  // engine deck grills
  for (let i = 0; i < 4; i++) M(RB(0.5, 0.03, W - 1.1, 0.01), dark, -half + 0.6 + i * 0.6, (fi === 0 ? 1.5 : 1.62), 0, g);

  // ---- turret
  const turret = new THREE.Group();
  const tx = fi === 0 ? -0.2 : -0.45;
  const topY = hullPts.reduce((a, p) => Math.max(a, p[1]), 0);
  turret.position.set(tx, topY - 0.02, 0); turret.userData.baseY = topY - 0.02; g.add(turret);
  let gunY, gunX, barrelLen, barrelR;
  if (fi === 0) {
    const dome = M(geo('domeT', () => new THREE.SphereGeometry(1.0, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), paint, 0, 0, 0, turret); dome.scale.set(1.55, 0.78, 1.25);
    M(CYL(0.32, 0.36, 0.25, 16), paint, -0.35, 0.82, 0.4, turret); // cupola
    M(CYL(0.3, 0.3, 0.05, 16), paint, -0.35, 0.96, 0.4, turret);
    M(CYL(0.28, 0.28, 0.08, 16), paint, -0.3, 0.8, -0.45, turret); // loader hatch
    const ir = M(CYL(0.22, 0.22, 0.32, 16), paint, 0.6, 0.85, -0.85, turret); ir.rotation.z = Math.PI / 2; // IR searchlight
    const lens = M(CYL(0.19, 0.19, 0.02, 16), glassM(), 0.77, 0.85, -0.85, turret); lens.rotation.z = Math.PI / 2;
    gunY = 0.42; gunX = 1.35; barrelLen = 4.9; barrelR = 0.1;
  } else {
    let tp, depth, taper;
    if (fi === 1 || fi === 3) { tp = [[-2.55, 0], [-2.7, 0.72], [-0.4, 0.86], [1.6, 0.84], [2.45, 0.5], [2.35, 0]]; depth = 3.2; taper = (x) => x > 0.9 ? THREE.MathUtils.lerp(1, 0.7, Math.min(1, (x - 0.9) / 1.55)) : 1; }
    else if (fi === 2) { tp = [[-1.8, 0], [-1.95, 0.6], [-0.3, 0.8], [1.3, 0.72], [2.05, 0.38], [1.95, 0]]; depth = 2.9; taper = (x) => x > 0.2 ? THREE.MathUtils.lerp(1, 0.62, Math.min(1, (x - 0.2) / 1.85)) : 1; }
    else { tp = [[-2.4, 0], [-2.55, 0.5], [-1.5, 0.68], [1.4, 0.66], [2.4, 0.35], [2.3, 0]]; depth = 3.1; taper = (x) => x > 1.0 ? THREE.MathUtils.lerp(1, 0.78, Math.min(1, (x - 1.0) / 1.4)) : 1; }
    M(ext(tp, depth, 0.07, taper), paint, 0, 0, 0, turret);
    const tTop = tp.reduce((a, p) => Math.max(a, p[1]), 0);
    if (fi !== 4) {
      M(RB(0.9, 0.42, 2.8, 0.03), mat('basketHD', () => std('#3a392e', 0.9, 0.3)), -3.05, 0.42, 0, turret); // bustle rack
      M(CYL(0.36, 0.4, 0.26, 16), paint, -0.6, tTop + 0.12, 0.6, turret); // commander cupola
      M(RB(0.5, 0.36, 0.42, 0.04), paint, 0.55, tTop + 0.16, -0.75, turret); // gunner sight
      M(RB(0.04, 0.22, 0.34, 0.01), glassM(), 0.81, tTop + 0.16, -0.75, turret);
      M(RB(0.55, 0.05, 0.6, 0.02), paint, -0.6, tTop + 0.02, -0.55, turret); // loader hatch
    } else {
      M(RB(0.7, 0.3, 0.7, 0.08), paint, -0.8, tTop + 0.14, 0.6, turret); // sensor mast base
      const sens = M(SPH(0.22, 14, 10), glassM(), -0.8, tTop + 0.42, 0.6, turret); void sens;
      for (const z of [-1.3, 1.3]) for (let i = 0; i < 2; i++) M(RB(0.3, 0.22, 0.24, 0.04), paint, 0.9 - i * 0.4, 0.55, z, turret); // APS
    }
    if (fi === 2) { // Kontakt ERA chevrons + Shtora
      const era = mat('eraHD', () => std('#4f5838', 0.8, 0.2));
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const b = M(RB(0.5, 0.18, 0.62, 0.02), era, 1.2 - i * 0.28, 0.25 + i * 0.13, side * (0.45 + i * 0.12), turret); b.rotation.y = side * 0.55; b.rotation.z = -0.35; }
      for (const side of [-1, 1]) M(RB(0.22, 0.2, 0.22, 0.03), mat('shtora', () => std('#7a1a14', 0.3, 0.2, { emissive: '#3a0805', emissiveIntensity: 0.5 })), 1.25, 0.45, side * 0.95, turret);
    }
    gunY = fi === 2 ? 0.38 : 0.42; gunX = tp[4][0] - 0.1; barrelLen = fi === 4 ? 4.6 : 5.1; barrelR = fi === 4 ? 0.16 : 0.13;
  }
  // antennas
  for (const [x, z, h] of [[-1.9, -1.0, 2.6], [-1.75, 1.0, 1.9]]) { const a = M(CYL(0.012, 0.02, h, 4), dark, x + (fi === 0 ? 0.8 : 0), (fi === 0 ? 0.8 : 0.9) + h / 2, z, turret); a.castShadow = false; }
  // smoke grenade launchers
  if (fi !== 4) for (const z of [-1.25, 1.25]) for (let i = 0; i < 3; i++) { const s = M(geo('smk', () => { const c = new THREE.CylinderGeometry(0.065, 0.065, 0.32, 8); c.rotateZ(Math.PI / 2 - 0.5); return c; }), dark, (fi === 0 ? 0.6 : 1.3) - i * 0.17, (fi === 0 ? 0.62 : 0.55) + i * 0.07, z * (fi === 0 ? 0.85 : 1), turret); void s; }
  // ---- gun
  const gunPivot = new THREE.Group(); gunPivot.position.set(gunX, gunY, 0); turret.add(gunPivot);
  if (fi === 4) M(RB(1.2, 0.55, 0.75, 0.08), paint, 0.3, 0, 0, gunPivot);
  else M(RB(0.6, 0.62, 0.95, 0.06), paint, 0.15, 0, 0, gunPivot); // mantlet
  const bg = geo(`barrel${barrelLen}|${barrelR}`, () => { const c = new THREE.CylinderGeometry(barrelR * 0.85, barrelR, barrelLen, 16); c.rotateZ(-Math.PI / 2); return c; });
  M(bg, fi === 4 ? paint : paint, 0.3 + barrelLen / 2, 0, 0, gunPivot);
  if (fi === 0) M(geo('evac', () => { const c = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 14); c.rotateZ(Math.PI / 2); return c; }), paint, 0.3 + barrelLen * 0.62, 0, 0, gunPivot);
  else if (fi !== 4) { for (let i = 0; i < 3; i++) M(geo('sleeve', () => { const c = new THREE.CylinderGeometry(0.155, 0.155, 0.08, 14); c.rotateZ(Math.PI / 2); return c; }), dark, 1.0 + i * 1.3, 0, 0, gunPivot); M(RB(0.18, 0.12, 0.12, 0.02), dark, 0.3 + barrelLen - 0.15, 0.17, 0, gunPivot); }
  else { M(RB(barrelLen * 0.75, 0.36, 0.36, 0.05), paint, 0.3 + barrelLen * 0.42, 0, 0, gunPivot); } // future shroud
  const coax = M(geo('coax', () => { const c = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6); c.rotateZ(Math.PI / 2); return c; }), dark, 0.62, -0.12, 0.42, gunPivot); void coax;
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.3 + barrelLen + 0.1, 0, 0); gunPivot.add(muzzle);
  const breech = new THREE.Object3D(); gunPivot.add(breech);

  // ---- upgrades (5 per family)
  const ups = [];
  const tTopY = fi === 0 ? 0.8 : 0.85;
  // 1: crew machine gun
  const mg = new THREE.Group();
  M(RB(0.6, 0.12, 0.12, 0.02), dark, 0.25, 0, 0, mg); M(geo('mgb', () => { const c = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6); c.rotateZ(Math.PI / 2); return c; }), dark, 0.9, 0.0, 0, mg);
  M(RB(0.1, 0.18, 0.4, 0.02), paint, 0.05, 0.05, 0, mg);
  mg.position.set(fi === 0 ? -0.3 : -0.55, tTopY + 0.45, fi === 0 ? -0.45 : -0.55); turret.add(mg); ups.push(mg);
  // 2: armor kit (ERA / TUSK / extra plates)
  const kit = new THREE.Group();
  const era = mat('eraKit' + fi, () => std(new THREE.Color(F.base).multiplyScalar(0.85), 0.8, 0.25));
  if (fi === 0 || fi === 2) { for (let i = 0; i < 7; i++) { const b = M(RB(0.4, 0.2, 0.42, 0.02), era, half - 0.6, 1.32, -1.35 + i * 0.45, kit); b.rotation.z = -0.45; } }
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) M(RB(0.62, 0.42, 0.12, 0.02), era, -half + 1.2 + i * 0.7, 1.05, side * (W / 2 + 0.16), kit);
  g.add(kit); ups.push(kit);
  // 3: remote weapon station
  const rws = new THREE.Group();
  M(RB(0.55, 0.32, 0.5, 0.04), dark, 0, 0, 0, rws);
  M(geo('rwsg', () => { const c = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8); c.rotateZ(Math.PI / 2); return c; }), dark, 0.8, 0.04, 0, rws);
  M(RB(0.22, 0.22, 0.24, 0.03), glassM(), 0.1, 0.27, 0.18, rws);
  rws.position.set(0.2, tTopY + 0.5, 0.5); turret.add(rws); ups.push(rws);
  // 4: family special — dozer blade (3) / missile pod (1,4) / cage armor (0,2)
  const sp = new THREE.Group();
  if (fi === 3) { const bl = M(ext([[0, 0], [0.2, 0], [0.55, 0.9], [0.35, 0.95]], W + 0.2, 0.03), paint, half + 0.25, 0.2, 0, sp); void bl; for (const z of [-1, 1]) { const arm = M(RB(1.3, 0.14, 0.14, 0.02), dark, half - 0.3, 0.6, z * 1.1, sp); arm.rotation.z = 0.25; } }
  if (fi === 1 || fi === 3 || fi === 4) { const pod = new THREE.Group(); M(RB(1.3, 0.7, 0.72, 0.06), paint, 0, 0, 0, pod); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) M(geo('tube', () => { const c = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12); c.rotateZ(Math.PI / 2); return c; }), mat('tubeend2', () => std('#0b0b0b', 0.9, 0.1)), 0.66, -0.15 + a * 0.3, -0.17 + b * 0.34, pod); pod.position.set(-1.2, tTopY + 0.65, -0.85); pod.rotation.z = 0.15; turret.add(pod); ups.push(pod); }
  if (fi === 0 || fi === 2) { for (let i = 0; i < 8; i++) M(RB(0.05, 0.9, 3.0, 0.01), steel, -half - 0.25 - (i % 2) * 0.03, 1.3, 0, sp); }
  g.add(sp); ups.push(sp);
  // 5: camo net / drone
  const top = new THREE.Group();
  if (fi === 4 || fi === 3) { const d = buildDrone(1.2); d.position.set(0, 4.3, 0); top.add(d); top.userData.drone = d; }
  else { const net = M(RB(1.6, 0.25, 2.2, 0.12), mat('net', () => std('#4c5532', 1, 0)), -2.2, 1.85, 0, top); void net; }
  g.add(top); ups.push(top);

  // Iraqi flag (player)
  if (opts.flag) {
    const fm = mat('iqflagdecalHD', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }));
    const pg = geo('flagdecal', () => new THREE.PlaneGeometry(0.7, 0.46));
    for (const z of [1, -1]) {
      const d = new THREE.Mesh(pg, fm);
      d.position.set(fi === 0 ? -1.2 : -1.6, fi === 0 ? 0.45 : 0.4, z * (fi === 0 ? 1.3 : 1.66)); if (z < 0) d.rotation.y = Math.PI; turret.add(d);
      const d2 = new THREE.Mesh(pg, fm); d2.position.set(-half + 1.0, 1.3, z * (W / 2 + (F.skirts ? 0.13 : 0.02))); if (z < 0) d2.rotation.y = Math.PI; g.add(d2);
    }
  }
  shadowAll(g);
  bake(g);
  return { group: g, turret, gunPivot, muzzle, breech, wheels, ups, gunBaseX: gunX, flagPos: [fi === 0 ? -1.3 : -2.3, (fi === 0 ? 0.8 : 0.9) + 0.6, fi === 0 ? 0.85 : 1.05] };
}

export function buildTankHD(scheme = 'player', seed = 3) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const player = scheme === 'player';
  const enemyCols = { enemyGreen: ['#4b5338', ['#2f3524', '#6b6a48']], enemyGrey: ['#5c615e', ['#3e4240', '#7c807a']], desert: ['#9c8a62', ['#7d6a48', '#b8a37a']], winter: ['#c9ccc8', ['#9aa09a', '#e8e8e4']], urban: ['#6d6d6a', ['#4a4a48', '#8f8f8a']] };
  const fams = [];
  let cur = -1, idx = 0;
  const ensure = (fi) => {
    if (fams[fi]) return fams[fi];
    const F = TANK_FAMILIES[fi];
    const ec = enemyCols[scheme] || enemyCols.enemyGreen;
    const paint = player ? paintMat('tank' + fi, F.base, 11 + fi, { camo: F.camo }) : paintMat('etank' + scheme + fi, ec[0], 31 + fi, { camo: ec[1] });
    const f = buildFamily(fi, paint, { flag: player });
    f.group.visible = false; body.add(f.group);
    // waving flag on turret
    if (player) {
      const fp = M(CYL(0.025, 0.03, 2.2, 6), mat('flagpole', () => std('#cfcfcf', 0.4, 0.8)), f.flagPos[0], f.flagPos[1] + 1.1, f.flagPos[2], f.turret);
      const cg = new THREE.PlaneGeometry(1.1, 0.72, 10, 3); cg.translate(-0.55, 0, 0);
      const cloth = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 }));
      cloth.position.set(f.flagPos[0], f.flagPos[1] + 1.82, f.flagPos[2]); f.turret.add(cloth); cloth.castShadow = true;
      f.cloth = { cg, base: cg.attributes.position.array.slice() }; void fp;
    }
    fams[fi] = f; return f;
  };
  const api = {
    root, body,
    get family() { return fams[cur]; },
    get turret() { return fams[cur].turret; },
    get gunPivot() { return fams[cur].gunPivot; },
    get muzzle() { return fams[cur].muzzle; },
    get breech() { return fams[cur].breech; },
    get wheels() { return fams[cur].wheels; },
    get upgrades() { return fams[cur].ups; },
    get gunBaseX() { return fams[cur].gunBaseX; },
    treadMap: null,
    setTier(n) {
      idx = Math.max(0, Math.min(24, n | 0));
      const fi = Math.min(4, Math.floor(idx / 5)), sub = idx % 5;
      ensure(fi);
      if (cur !== fi) { if (cur >= 0) fams[cur].group.visible = false; fams[fi].group.visible = true; cur = fi; }
      fams[fi].ups.forEach((u, i) => { u.visible = i < sub; });
      api.treadMap = mat('treadHD').map;
    },
    get tier() { return idx; },
    setFacing(f) { body.rotation.y = f > 0 ? 0 : Math.PI; },
    setAim(a) { fams[cur].gunPivot.rotation.z = a; },
    recoil(k) { fams[cur].gunPivot.position.x = fams[cur].gunBaseX - Math.min(k, 1) * 0.45; },
    spinWheels(d) { for (const w of fams[cur].wheels) w.rotation.z -= d / 0.4; },
    waveFlag(t, speed) {
      const f = fams[cur]; if (!f || !f.cloth) return;
      const p = f.cloth.cg.attributes.position, cb = f.cloth.base, k = 0.5 + Math.min(1, Math.abs(speed) / 6);
      for (let i = 0; i < p.count; i++) { const x = -cb[i * 3]; p.setZ(i, Math.sin(x * 3 - t * (6 + k * 4)) * 0.09 * x * k); p.setY(i, cb[i * 3 + 1] - x * x * 0.08 * (1.2 - k * 0.6)); }
      p.needsUpdate = true;
      for (const u of f.ups) if (u.visible && u.userData.drone) u.userData.drone.userData.update(t);
    },
  };
  api.setTier(0);
  return api;
}

// ============================================================ HELICOPTER (Black Hawk style)
export function buildHeliHD(scheme = 'desert', idx = 0) {
  const cols = { desert: ['#a99470', ['#8a7756', '#bfae88']], enemyGreen: ['#3e4433', ['#2e3326', '#4f5640']], enemyGrey: ['#3c3f42', ['#2c2f31', '#55595c']], green: ['#4a5340', null], stealth: ['#5b5f62', null] };
  const c = cols[scheme] || cols.desert;
  const paint = paintMat('heli' + scheme, c[0], 51, { camo: c[1], rep: 0.25, metal: 0.35, rough: 0.6 });
  const dark = darkM(), steel = steelM(), rubber = rubberM();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const stealth = idx >= 15 && idx < 20;
  // fuselage side profile (x forward), bottom at -0.95
  const fp = stealth
    ? [[-2.9, -0.85], [2.4, -0.95], [3.7, -0.55], [4.5, 0.1], [3.4, 0.95], [1.6, 1.4], [-1.4, 1.4], [-2.9, 0.9]]
    : [[-2.7, -0.95], [2.5, -0.95], [3.5, -0.7], [4.25, -0.05], [4.1, 0.4], [3.05, 1.2], [1.8, 1.4], [-1.3, 1.4], [-2.7, 0.95]];
  M(ext(fp, 1.9, 0.3, (x, y) => { const t = (y + 0.95) / 2.35; let k = 1 - 0.3 * Math.max(0, t - 0.5) / 0.5; if (x > 2.6) k *= 1 - 0.4 * Math.min(1, (x - 2.6) / 1.7); return k; }), paint, 0, 0, 0, body);
  // tail boom
  M(ext([[-2.6, 0.05], [-2.6, 1.15], [-8.4, 0.95], [-8.4, 0.55]], 0.7, 0.12, (x) => THREE.MathUtils.lerp(0.5, 1, Math.min(1, Math.max(0, (x + 8.4) / 5.8)))), paint, 0, 0, 0, body);
  // fin + stabilator
  M(ext([[-8.0, 0.6], [-8.9, 3.0], [-9.6, 3.1], [-9.1, 0.6]], 0.16, 0.05), paint, 0, 0, 0, body);
  M(RB(1.1, 0.07, 3.0, 0.03), paint, -8.6, 0.85, 0, body);
  // engine housings + mast
  M(RB(3.2, 0.62, 1.5, 0.22), paint, -0.2, 1.65, 0, body);
  for (const z of [-0.55, 0.55]) { const ex = M(CYL(0.22, 0.26, 0.6, 12), dark, -1.85, 1.68, z, body); ex.rotation.z = Math.PI / 2; }
  M(CYL(0.13, 0.16, 0.55, 10), steel, 0.3, 2.15, 0, body);
  // glass
  const gl = glassM();
  for (const z of [1, -1]) {
    const w1 = M(geo('cockwin', () => new THREE.PlaneGeometry(1.0, 0.65)), gl, 3.2, 0.6, z * 1.05, body); if (z < 0) w1.rotation.y = Math.PI; w1.rotation.z = -0.25 * (z < 0 ? -1 : 1);
    const w2 = M(geo('cabwin', () => new THREE.PlaneGeometry(0.6, 0.45)), gl, 1.0, 0.65, z * 1.18, body); if (z < 0) w2.rotation.y = Math.PI;
    const w3 = M(geo('cabwin'), gl, -0.4, 0.65, z * 1.18, body); if (z < 0) w3.rotation.y = Math.PI;
  }
  const ws = M(ext([[3.2, 0.4], [3.95, 0.35], [3.15, 1.12], [2.55, 1.18]], 1.6, 0.05), gl, 0.05, 0.02, 0, body); void ws;
  // landing gear (wheels)
  for (const z of [-1.15, 1.15]) {
    const st = M(RB(0.1, 0.75, 0.1, 0.02), dark, 2.2, -1.2, z, body); st.rotation.x = z > 0 ? -0.3 : 0.3;
    const wh = M(geo('hwheel', () => { const c = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 14); c.rotateX(Math.PI / 2); return c; }), rubber, 2.2, -1.45, z * 1.15, body); void wh;
  }
  M(geo('hwheel'), rubber, -7.6, 0.22, 0, body);
  // main rotor
  const rotor = new THREE.Group(); rotor.position.set(0.3, 2.45, 0); body.add(rotor);
  M(CYL(0.28, 0.28, 0.22, 12), steel, 0, 0, 0, rotor);
  const bladeG = geo('blade', () => { const b = new THREE.BoxGeometry(7.2, 0.05, 0.42); b.translate(3.6, 0, 0); return b; });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(bladeG, dark); b.rotation.y = (i * Math.PI) / 2; b.rotation.x = 0.02; rotor.add(b); }
  const disc = M(geo('disc', () => new THREE.CylinderGeometry(7.2, 7.2, 0.02, 40)), mat('rotorblur', () => new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.1, depthWrite: false })), 0, 0, 0, rotor); disc.castShadow = false;
  // tail rotor
  const tailRotor = new THREE.Group(); tailRotor.position.set(-9.1, 2.5, 0.22); body.add(tailRotor);
  for (let i = 0; i < 4; i++) { const b = M(RB(0.08, 1.5, 0.03, 0.01), dark, 0, 0, 0, tailRotor); b.rotation.z = (i * Math.PI) / 2; }
  // ESSS stub wings with rocket pods / fuel tanks / door guns (upgrades)
  const sub = idx % 5, fam = Math.floor(idx / 5);
  const ups = new THREE.Group(); body.add(ups);
  if (sub >= 1 || fam >= 1) { // door gun (M134)
    for (const z of [1.3, -1.3]) { const dg = M(geo('m134', () => { const c = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8); c.rotateZ(Math.PI / 2); return c; }), dark, 1.9, 0.35, z, ups); void dg; }
  }
  if (sub >= 2 || fam >= 1) {
    for (const z of [1, -1]) {
      M(RB(0.7, 0.08, 1.6, 0.03), paint, 0.25, 0.95, z * 1.75, ups);
      const pod = M(geo('rpod', () => { const c = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 14); c.rotateZ(Math.PI / 2); return c; }), dark, 0.35, 0.6, z * 2.2, ups); void pod;
      if (sub >= 3 || fam >= 2) { const tank = M(geo('ftank', () => { const c = new THREE.CapsuleGeometry(0.3, 1.3, 4, 12); c.rotateZ(Math.PI / 2); return c; }), paint, 0.25, 0.55, z * 1.55, ups); void tank; }
    }
  }
  if (fam >= 3 || sub >= 4) { M(SPH(0.32, 14, 10), glassM(), 4.0, -0.75, 0, ups); M(RB(0.4, 0.2, 0.4, 0.05), dark, 3.9, -0.55, 0, ups); } // FLIR turret
  if (fam >= 4) { const d = buildDrone(1.0); d.position.set(1.5, 4.2, 2.2); ups.add(d); const d2 = buildDrone(1.0); d2.position.set(-2.5, 4.0, -2.2); ups.add(d2); ups.userData.drones = [d, d2]; }
  const muzzle = new THREE.Object3D(); muzzle.position.set(2.4, 0.35, 0); body.add(muzzle);
  disc.userData.keep = true;
  shadowAll(root); disc.castShadow = false;
  bake(root);
  return { root, body, rotor, tailRotor, muzzle, w: 9, h: 2.6, ups };
}

// ============================================================ MILITARY SUV (Bronco style)
export function buildSUV(scheme = 'green', variant = 0) {
  const colors = { green: ['#465036', ['#3a4330', '#55603f']], desert: ['#a48f68', ['#8a7553', '#bfad86']], enemyGreen: ['#3d4232', ['#2d3125', '#4b5240']], urban: ['#55585a', ['#3e4143', '#6a6d6f']], enemyGrey: ['#4a4d50', null], winter: ['#bfc3c2', ['#9aa09f', '#d8dbda']] };
  const c = colors[scheme] || colors.green;
  const paint = paintMat('suv' + scheme, c[0], 61, { camo: c[1], rep: 0.35, metal: 0.4, rough: 0.55 });
  const dark = darkM(), rubber = rubberM(), gl = glassM();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // body: lower tub + cabin (boxy, rounded)
  M(ext([[-2.3, 0.62], [-2.35, 1.35], [0.4, 1.4], [2.25, 1.32], [2.35, 0.95], [2.3, 0.62]], 1.85, 0.12), paint, 0, 0, 0, body);
  M(ext([[-2.15, 1.38], [-2.1, 2.25], [0.15, 2.25], [0.6, 1.4]], 1.75, 0.08), paint, 0, 0, 0, body);
  // windows
  for (const z of [1, -1]) {
    for (const [x, w] of [[-1.55, 0.9], [-0.45, 0.9]]) { const p = M(geo('suvwin' + w, () => new THREE.PlaneGeometry(w, 0.6)), gl, x, 1.86, z * 0.96, body); if (z < 0) p.rotation.y = Math.PI; }
  }
  const wsh = M(geo('suvws', () => new THREE.PlaneGeometry(1.5, 0.75)), gl, 0.42, 1.85, 0, body); wsh.rotation.y = Math.PI / 2; wsh.rotation.x = 0; wsh.rotation.z = 0; wsh.rotation.order = 'YXZ'; wsh.rotation.x = -0.35;
  // grille, bumpers, lights
  M(RB(0.08, 0.42, 1.5, 0.02), dark, 2.38, 1.08, 0, body);
  for (const z of [-0.62, 0.62]) { const l = M(geo('suvlamp', () => { const cc = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 14); cc.rotateZ(Math.PI / 2); return cc; }), mat('lampHD', () => std('#f2ecd0', 0.2, 0.3, { emissive: '#3a3420', emissiveIntensity: 0.4 })), 2.43, 1.12, z, body); void l; }
  M(RB(0.25, 0.22, 2.0, 0.04), dark, 2.42, 0.7, 0, body); M(RB(0.25, 0.22, 2.0, 0.04), dark, -2.42, 0.7, 0, body);
  // fender flares
  for (const x of [1.45, -1.45]) for (const z of [1, -1]) { const f = M(geo('arch', () => { const t = new THREE.TorusGeometry(0.6, 0.08, 6, 16, Math.PI); return t; }), dark, x, 0.55, z * 1.02, body); void f; }
  // wheels
  const wheels = [];
  const tg = geo('suvtire', () => { const cc = new THREE.CylinderGeometry(0.5, 0.5, 0.38, 22); cc.rotateX(Math.PI / 2); return cc; });
  const rim = mat('rimHD', () => std('#2a2b28', 0.5, 0.7));
  for (const x of [1.45, -1.45]) for (const z of [-0.98, 0.98]) {
    const w = new THREE.Group(); w.position.set(x, 0.5, z); body.add(w); wheels.push(w);
    M(tg, rubber, 0, 0, 0, w);
    const rm = M(geo('suvrim', () => { const cc = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 8); cc.rotateX(Math.PI / 2); return cc; }), rim, 0, 0, 0, w); void rm;
    for (let i = 0; i < 10; i++) { const k = M(RB(0.12, 0.1, 0.4, 0.02), rubber, Math.cos(i / 10 * Math.PI * 2) * 0.48, Math.sin(i / 10 * Math.PI * 2) * 0.48, 0, w); k.rotation.z = i / 10 * Math.PI * 2; }
  }
  // spare on back
  const sp = M(tg, rubber, -2.55, 1.35, 0, body); sp.rotation.y = Math.PI / 2;
  // variants: roof rack, antennas, RWS gun, ambulance
  let gunPivot = null, muzzle = new THREE.Object3D(); muzzle.position.set(2.4, 1.3, 0); body.add(muzzle);
  if (variant === 1 || variant >= 3) { const rack = M(RB(2.1, 0.08, 1.7, 0.02), dark, -1.0, 2.38, 0, body); void rack; for (let i = 0; i < 3; i++) M(RB(0.5, 0.3, 0.6, 0.06), mat('bags', () => std('#5a5a40', 0.95, 0)), -1.7 + i * 0.7, 2.55, (i % 2 - 0.5) * 0.5, body); }
  if (variant >= 2) for (const [x, z, h] of [[-1.9, 0.7, 2.4], [-1.7, -0.7, 1.6]]) M(CYL(0.012, 0.02, h, 4), dark, x, 2.25 + h / 2, z, body);
  if (variant === 4) {
    gunPivot = new THREE.Group(); gunPivot.position.set(-0.6, 2.75, 0); body.add(gunPivot);
    M(RB(0.6, 0.4, 0.55, 0.05), dark, -0.6, 2.45, 0, body);
    M(RB(0.5, 0.25, 0.4, 0.04), paint, 0.1, 0, 0, gunPivot);
    M(geo('suvgun', () => { const cc = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8); cc.rotateZ(Math.PI / 2); return cc; }), dark, 0.85, 0.02, 0, gunPivot);
    muzzle = new THREE.Object3D(); muzzle.position.set(1.5, 0.02, 0); gunPivot.add(muzzle);
  }
  if (variant === 5) { // ambulance
    M(RB(2.4, 1.3, 1.95, 0.06), paint, -1.1, 2.0, 0, body);
    const cm = mat('redcross', () => std('#b71c1c', 0.6, 0));
    for (const z of [1, -1]) { M(RB(0.5, 0.14, 0.02, 0.005), cm, -1.1, 2.1, z * 0.99, body); M(RB(0.14, 0.5, 0.02, 0.005), cm, -1.1, 2.1, z * 0.99, body); }
  }
  shadowAll(root);
  bake(root);
  return { root, body, wheels, gunPivot, muzzle, w: 4.9, h: 2.4 };
}

// ============================================================ BOATS
function vHull(len, beam, depth, opts = {}) {
  // lofted V-hull: sections along x, points across (deck edge → keel → deck edge)
  const NX = 18, NP = 9;
  const pos = [], idx = [];
  for (let i = 0; i <= NX; i++) {
    const u = i / NX, x = -len / 2 + u * len;
    const bowK = u > 0.62 ? Math.pow((u - 0.62) / 0.38, 1.6) : 0;
    const halfB = beam / 2 * (1 - bowK * 0.97) * (u < 0.05 ? 0.92 + u * 1.6 : 1);
    const sheer = depth + bowK * (opts.bowRise ?? 0.45);
    const keel = bowK * (opts.keelRise ?? depth * 0.55);
    for (let j = 0; j <= NP; j++) {
      const v = j / NP, a = (v - 0.5) * 2; // -1..1
      const z = a * halfB;
      const dead = opts.flat ? 0.15 : 0.55; // deadrise
      const y = keel + Math.pow(Math.abs(a), 1.4) * (sheer - keel) * (1 - dead) + Math.abs(a) * (sheer - keel) * dead;
      pos.push(x, Math.min(y, sheer), z);
    }
  }
  const row = NP + 1;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NP; j++) { const a = i * row + j, b = a + row; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  // deck
  const base = pos.length / 3;
  for (let i = 0; i <= NX; i++) { pos.push(pos[(i * row) * 3], pos[(i * row) * 3 + 1], pos[(i * row) * 3 + 2]); pos.push(pos[(i * row + NP) * 3], pos[(i * row + NP) * 3 + 1], pos[(i * row + NP) * 3 + 2]); }
  for (let i = 0; i < NX; i++) { const a = base + i * 2, b = a + 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  // transom
  const tb = pos.length / 3; for (let j = 0; j <= NP; j++) pos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
  const tc = pos.length / 3; pos.push(-len / 2, depth, 0);
  for (let j = 0; j < NP; j++) idx.push(tc, tb + j + 1, tb + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const BOAT_FAMILIES = ['patrol', 'gunboat', 'stealth', 'catamaran', 'frigate'];
export function buildBoatHD(kind = 'patrol', opts = {}) {
  const enemy = !!opts.enemy;
  const base = opts.color || (enemy ? '#4b5257' : '#8f8a74');
  const paint = paintMat('boat' + kind + base, base, 71, { camo: enemy ? null : ['#7a7560', '#a39d84'], rep: 0.25, metal: 0.35, rough: 0.55 });
  const hullDark = mat('boathull2' + (enemy ? 'e' : 'p'), () => std(enemy ? '#4a5056' : '#66727a', 0.55, 0.35, { side: THREE.DoubleSide }));
  const white = mat('boatwhite', () => std('#d9d9d2', 0.6, 0.2));
  const dark = darkM(), gl = glassM();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  let gunPivot = new THREE.Group(), L = 9, Hh = 2.6;
  const addGun = (x, y, big) => {
    gunPivot.position.set(x, y, 0); body.add(gunPivot);
    M(CYL(big ? 0.75 : 0.35, big ? 0.85 : 0.4, big ? 0.6 : 0.3, 16), paint, x - 0.1, y - 0.2, 0, body);
    if (big) M(RB(1.1, 0.55, 0.9, 0.1), paint, 0.2, 0.1, 0, gunPivot);
    const bl = big ? 2.6 : 1.3;
    M(geo('bgun' + bl, () => { const c = new THREE.CylinderGeometry(big ? 0.08 : 0.05, big ? 0.11 : 0.05, bl, 10); c.rotateZ(Math.PI / 2); return c; }), dark, bl / 2 + 0.4, 0, 0, gunPivot);
    const m = new THREE.Object3D(); m.position.set(bl + 0.45, 0, 0); gunPivot.add(m); return m;
  };
  let muzzle;
  if (kind === 'fishing') { // قارب صيد خشبي
    L = 7; const h = new THREE.Mesh(vHull(7, 2.2, 1.1, { bowRise: 0.6 }), mat('woodhull', () => std('#6b4a2b', 0.85, 0.05, { side: THREE.DoubleSide }))); body.add(h);
    M(CYL(0.05, 0.06, 3.5, 6), mat('trunk', () => std('#4e3a26', 0.95, 0)), 0.5, 2.6, 0, body);
    muzzle = addGun(2.0, 1.4, false); Hh = 2;
  } else if (kind === 'rhib') {
    L = 6.5; const h = new THREE.Mesh(vHull(6.5, 2.4, 0.9, { bowRise: 0.3 }), hullDark); body.add(h);
    for (const z of [-1, 1]) { const tube = M(geo('rhibtube', () => { const c = new THREE.CapsuleGeometry(0.28, 5.2, 4, 10); c.rotateZ(Math.PI / 2); return c; }), mat('rhibtubeM', () => std('#c2552d', 0.7, 0.05)), -0.2, 0.95, z * 1.05, body); void tube; }
    M(RB(0.8, 0.9, 0.9, 0.08), dark, -0.8, 1.3, 0, body); M(RB(0.5, 0.6, 0.5, 0.05), dark, -2.9, 1.1, 0, body);
    muzzle = addGun(1.6, 1.5, false); Hh = 2.2;
  } else if (kind === 'catamaran') {
    L = 9;
    for (const z of [-1.1, 1.1]) { const h = new THREE.Mesh(vHull(9, 0.9, 1.0, { flat: true, bowRise: 0.25 }), hullDark); h.position.z = z; body.add(h); }
    M(ext([[-3.8, 1.0], [-3.9, 2.2], [0.8, 2.3], [2.6, 1.1]], 2.6, 0.08), paint, 0, 0, 0, body);
    M(RB(0.06, 0.5, 2.2, 0.02), gl, 1.2, 2.0, 0, body);
    muzzle = addGun(-1.2, 2.55, false); Hh = 3;
  } else if (kind === 'frigate') {
    L = 15; const h = new THREE.Mesh(vHull(15, 3.6, 2.0, { bowRise: 0.7 }), hullDark); body.add(h);
    M(ext([[-6.5, 2.0], [-6.5, 3.6], [-3.5, 4.0], [1.0, 3.9], [2.5, 2.0]], 3.0, 0.1), paint, 0, 0, 0, body);
    M(ext([[-4.5, 3.9], [-4.5, 5.6], [-1.5, 5.6], [-0.4, 3.9]], 2.4, 0.08), paint, 0, 0, 0, body);
    M(RB(0.06, 0.4, 2.0, 0.01), gl, -0.62, 4.9, 0, body);
    const mast = M(ext([[-3.6, 5.6], [-3.3, 8.6], [-2.8, 8.6], [-2.3, 5.6]], 1.0, 0.04), paint, 0, 0, 0, body); void mast;
    const radar = M(RB(1.4, 0.15, 0.3, 0.02), dark, -3.05, 8.8, 0, body); root.userData.radar = radar;
    for (let i = 0; i < 2; i++) M(RB(0.9, 0.55, 0.8, 0.06), dark, -5.6, 4.0, -0.7 + i * 1.4, body); // VLS / CIWS
    muzzle = addGun(4.2, 2.65, true); Hh = 5.5;
  } else if (kind === 'stealth') {
    L = 10; const h = new THREE.Mesh(vHull(10, 2.8, 1.3, { bowRise: 0.2, keelRise: 0.3 }), hullDark); body.add(h);
    M(ext([[-4.6, 1.3], [-4.4, 2.3], [-1.5, 2.9], [1.5, 2.7], [3.3, 1.3]], 2.4, 0.04), paint, 0, 0, 0, body);
    M(ext([[-1.2, 2.5], [0.6, 2.6], [1.2, 2.2], [-0.8, 2.2]], 2.42, 0.01), gl, 0, 0, 0, body);
    M(CYL(0.05, 0.08, 1.6, 6), dark, -1.0, 3.6, 0, body);
    muzzle = addGun(2.4, 2.25, false); Hh = 3;
  } else if (kind === 'gunboat') {
    L = 9; const h = new THREE.Mesh(vHull(9, 2.8, 1.35, { bowRise: 0.5 }), hullDark); body.add(h);
    M(ext([[-3.4, 1.35], [-3.4, 2.6], [-0.4, 2.75], [0.6, 1.35]], 2.2, 0.08), paint, 0, 0, 0, body);
    M(RB(0.06, 0.55, 1.9, 0.02), gl, 0.12, 2.2, 0, body);
    for (const z of [-1, 1]) for (let i = 0; i < 6; i++) M(CYL(0.025, 0.025, 0.6, 5), steelM(), -3.5 + i * 1.3, 1.65, z * 1.3, body);
    M(CYL(0.05, 0.07, 2.2, 6), dark, -2.0, 3.8, 0, body); M(RB(0.9, 0.1, 0.2, 0.02), dark, -2.0, 4.6, 0, body);
    muzzle = addGun(2.3, 1.8, false); Hh = 2.8;
  } else { // patrol (default, player tier 1)
    L = 9.5; const h = new THREE.Mesh(vHull(9.5, 3.0, 1.45, { bowRise: 0.5 }), hullDark); body.add(h);
    M(ext([[-3.6, 1.45], [-3.6, 2.9], [-0.5, 3.0], [0.6, 1.45]], 2.4, 0.08), paint, 0, 0, 0, body);
    M(RB(0.06, 0.6, 2.1, 0.02), gl, 0.22, 2.4, 0, body);
    for (const z of [1, -1]) { const p = M(geo('patrolwin', () => new THREE.PlaneGeometry(1.8, 0.5)), gl, -1.7, 2.45, z * 1.29, body); if (z < 0) p.rotation.y = Math.PI; }
    M(RB(9, 0.14, 0.08, 0.02), white, -0.3, 1.3, 1.52, body); M(RB(9, 0.14, 0.08, 0.02), white, -0.3, 1.3, -1.52, body);
    muzzle = addGun(2.7, 1.95, false); Hh = 3;
  }
  // Iraqi flag + decals (player)
  let flag = null;
  if (!enemy) {
    const fm = mat('iqflagdecalB', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }));
    for (const z of [1, -1]) { const d = M(geo('bflag', () => new THREE.PlaneGeometry(0.9, 0.6)), fm, -L * 0.18, 1.05, z * (kind === 'catamaran' ? 1.56 : 1.45), body); if (z < 0) d.rotation.y = Math.PI; }
    flag = opts.flagPole ? opts.flagPole() : null;
    if (flag) { flag.root.position.set(-L / 2 + 0.6, Hh * 0.5, 0); flag.root.scale.setScalar(0.7); body.add(flag.root); }
  }
  if (flag) flag.root.traverse(o => { if (o.isMesh) o.userData.keep = true; });
  shadowAll(root);
  bake(root);
  return { root, body, gunPivot, muzzle, flag, w: L, h: Hh };
}
export function boatKindForTier(idx) { return BOAT_FAMILIES[Math.min(4, Math.floor(idx / 5))]; }
