import * as THREE from 'three';
import { camoTexture, plainTexture, treadTexture, wheelTexture, wallTexture, crateTexture, flagTexture, rng, iraqFlagTexture } from './textures.js';

const matCache = new Map();
export function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}
const std = (color, rough = 0.8, metal = 0.1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

function shadowAll(obj) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

function extrude(points, depth, bevel = 0.04) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function stadium(x0, x1, y0, y1) {
  const r = (y1 - y0) / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

// ------------------------------------------------------------------ TANK
export const TANK_SCHEMES = {
  player: ['#8a7a4e', '#5d5a34', '#a8946a', '#3b3a26'],
  desert: ['#b49a68', '#8c7148', '#cbb88c', '#5e4c33'],
  enemyGreen: ['#4b5338', '#2f3524', '#6b6a48', '#1d2017'],
  enemyGrey: ['#5c615e', '#3e4240', '#7c807a', '#262928'],
  winter: ['#d9dcd8', '#9aa09a', '#f2f2ef', '#5e625e'],
  urban: ['#6d6d6a', '#4a4a48', '#8f8f8a', '#2c2c2b'],
};

export function buildTank(scheme = 'player', seed = 3) {
  const colors = TANK_SCHEMES[scheme] || TANK_SCHEMES.player;
  const camo = mat('camo-' + scheme, () => {
    const t = camoTexture(colors, seed, 0.8); t.repeat.set(0.35, 0.35);
    return std(0xffffff, 0.72, 0.25, { map: t });
  });
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  const metal = mat('tankmetal', () => std('#3c3c35', 0.5, 0.7));
  const tread = mat('tread', () => { const t = treadTexture(); t.repeat.set(1, 6); return std(0xffffff, 0.95, 0.3, { map: t }); });
  const wheelSide = mat('wheelside', () => std('#1d1c18', 0.9, 0.2));
  const wheelFace = mat('wheelface', () => std(0xffffff, 0.6, 0.5, { map: wheelTexture() }));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));

  const root = new THREE.Group();      // world position + slope
  const body = new THREE.Group();      // facing
  root.add(body);

  // tracks
  const trackShape = stadium(-3.55, 3.45, 0.02, 1.05);
  trackShape.holes.push(stadium(-3.38, 3.28, 0.17, 0.9));
  const trackGeo = new THREE.ExtrudeGeometry(trackShape, { depth: 0.62, bevelEnabled: false, curveSegments: 10 });
  const wheels = [];
  for (const side of [-1, 1]) {
    const tr = new THREE.Mesh(trackGeo, tread);
    tr.position.z = side * 1.45 - 0.31;
    body.add(tr);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.5, 18);
    wheelGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Mesh(wheelGeo, [wheelSide, wheelFace, wheelFace]);
      w.position.set(-2.55 + i * 1.0, 0.44, side * 1.45);
      body.add(w); wheels.push(w);
    }
    const spGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.52, 12); spGeo.rotateX(Math.PI / 2);
    for (const [x, y] of [[3.0, 0.54], [-3.1, 0.54]]) {
      const w = new THREE.Mesh(spGeo, [metal, wheelFace, wheelFace]);
      w.position.set(x, y, side * 1.45); body.add(w); wheels.push(w);
    }
    const rr = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8); rr.rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(rr, metal); m.position.set(-1.6 + i * 1.6, 0.92, side * 1.45); body.add(m); }
  }
  // lower hull between tracks
  const lower = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.7, 2.2), dark);
  lower.position.set(0, 0.7, 0); body.add(lower);
  // upper hull
  const hull = new THREE.Mesh(extrude([[-3.72, 1.02], [-3.8, 1.62], [-2.4, 1.78], [2.2, 1.78], [3.85, 1.25], [3.62, 1.02]], 3.5), camo);
  body.add(hull);
  // driver hatch + periscopes
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 14), camo);
  hatch.position.set(2.0, 1.82, 0.5); body.add(hatch);
  const peri = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.5), glass);
  peri.position.set(2.3, 1.82, 0.5); body.add(peri);
  // headlights
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), mat('lamp', () => std('#fff6d0', 0.2, 0.2, { emissive: '#ffe9a0', emissiveIntensity: 1.5 })));
  hl.rotation.z = Math.PI / 2; hl.position.set(3.72, 1.38, 1.4); body.add(hl);
  const hl2 = hl.clone(); hl2.position.z = -1.4; body.add(hl2);
  // exhaust + rear boxes
  const ex = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 1.2), dark); ex.position.set(-3.82, 1.35, -0.6); body.add(ex);
  const fuel = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 12); fuel.rotateX(Math.PI / 2);
  for (const z of [-1.1, 1.1]) { const f = new THREE.Mesh(fuel, camo); f.position.set(-3.55, 1.95, z); body.add(f); }
  // fender tool boxes
  for (const z of [-1.6, 1.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.3), camo); b.position.set(-1.2, 1.92, z); body.add(b); }

  // turret
  const turret = new THREE.Group();
  turret.position.set(-0.35, 0, 0);
  body.add(turret);
  const tShell = new THREE.Mesh(extrude([[-2.05, 1.78], [-2.2, 2.5], [-0.6, 2.82], [1.25, 2.8], [2.05, 2.38], [1.85, 1.78]], 2.7, 0.08), camo);
  turret.add(tShell);
  // turret bustle basket
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 2.4), mat('basket', () => std('#3a3a2c', 0.9, 0.3, { wireframe: false })));
  basket.position.set(-2.55, 2.25, 0); turret.add(basket);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.34, 16), camo);
  cupola.position.set(-0.55, 2.98, 0.55); turret.add(cupola);
  const cHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), camo);
  cHatch.position.set(-0.75, 3.2, 0.55); cHatch.rotation.z = 0.5; turret.add(cHatch);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.4), camo); sight.position.set(0.6, 2.98, -0.6); turret.add(sight);
  const sightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.3), glass); sightGlass.position.set(0.84, 2.98, -0.6); turret.add(sightGlass);
  // commander MG
  const mg = new THREE.Group();
  const mgBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.12), metal); mgBody.position.x = 0.2; mg.add(mgBody);
  const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), metal); mgBarrel.rotation.z = Math.PI / 2; mgBarrel.position.x = 0.85; mg.add(mgBarrel);
  mg.position.set(-0.45, 3.28, 0.55); turret.add(mg);
  // antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 2.6, 4), dark);
  ant.position.set(-1.9, 4.0, -0.9); ant.rotation.z = 0.12; turret.add(ant);
  const ant2 = ant.clone(); ant2.position.set(-1.8, 3.6, 0.95); ant2.scale.y = 0.7; turret.add(ant2);
  // smoke launchers
  const smk = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8); smk.rotateZ(Math.PI / 2 - 0.5);
  for (const z of [-1.2, 1.2]) for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(smk, dark); s.position.set(1.1 - i * 0.18, 2.55 + i * 0.08, z * (1 + i * 0.02)); turret.add(s);
  }

  // gun
  const gunPivot = new THREE.Group();
  gunPivot.position.set(1.85, 2.3, 0);
  turret.add(gunPivot);
  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 0.9), camo); mantlet.position.x = 0.15; gunPivot.add(mantlet);
  const barrelGeo = new THREE.CylinderGeometry(0.11, 0.14, 5.0, 14); barrelGeo.rotateZ(-Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, camo); barrel.position.x = 2.8; gunPivot.add(barrel);
  const fume = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 14), camo); fume.rotation.z = Math.PI / 2; fume.position.x = 2.4; gunPivot.add(fume);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.35, 12), dark); brake.rotation.z = Math.PI / 2; brake.position.x = 5.2; gunPivot.add(brake);
  const coax = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), metal); coax.rotation.z = Math.PI / 2; coax.position.set(0.6, -0.1, 0.38); gunPivot.add(coax);
  const muzzle = new THREE.Object3D(); muzzle.position.set(5.45, 0, 0); gunPivot.add(muzzle);
  const breech = new THREE.Object3D(); breech.position.set(0, 0, 0); gunPivot.add(breech);

  // --- upgrade parts (visual evolution)
  const upgrades = [];
  // tier1: side skirts
  const skirts = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.5, 0.06), camo);
      p.position.set(-2.75 + i * 1.12, 1.1, side * 1.8); p.rotation.x = side * 0.04; skirts.add(p);
    }
  }
  body.add(skirts); upgrades.push(skirts);
  // tier2: ERA bricks on turret + glacis
  const era = new THREE.Group();
  const brick = new THREE.BoxGeometry(0.42, 0.22, 0.36);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
    const b = new THREE.Mesh(brick, camo);
    b.position.set(1.55 - r * 0.42 + 0.0, 2.45 + r * 0.2, -1.05 + c * 0.42); b.rotation.z = -0.45; era.add(b);
  }
  for (let c = 0; c < 7; c++) {
    const b = new THREE.Mesh(brick, camo); b.position.set(3.0, 1.62, -1.3 + c * 0.43); b.rotation.z = -0.3; era.add(b);
    const b2 = new THREE.Mesh(brick, camo); b2.position.set(3.4, 1.42, -1.3 + c * 0.43); b2.rotation.z = -0.3; era.add(b2);
  }
  turret.add(era); upgrades.push(era);
  // tier3: remote weapon station
  const rws = new THREE.Group();
  const rwsBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), dark); rws.add(rwsBase);
  const rwsGun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), metal); rwsGun.rotation.z = Math.PI / 2; rwsGun.position.set(0.75, 0.05, 0); rws.add(rwsGun);
  const rwsCam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), glass); rwsCam.position.set(0.1, 0.32, 0.15); rws.add(rwsCam);
  rws.position.set(0.2, 3.05, -0.35); turret.add(rws); upgrades.push(rws);
  // tier4: rocket pod
  const pod = new THREE.Group();
  const podBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.75), camo); pod.add(podBox);
  const tubeGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10); tubeGeo.rotateZ(Math.PI / 2);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const t = new THREE.Mesh(tubeGeo, mat('tubeend', () => std('#101010', 0.9, 0.2))); t.position.set(0.71, -0.15 + r * 0.3, -0.17 + c * 0.34); pod.add(t);
  }
  pod.position.set(-1.0, 3.15, -0.75); pod.rotation.z = 0.12; turret.add(pod); upgrades.push(pod);
  // tier5: slat armor + extra plates (looks like a futuristic tank)
  const slat = new THREE.Group();
  const slatMat = mat('slat', () => std('#3b3a30', 0.6, 0.6));
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 3.0), slatMat); s.position.set(-4.0 - (i % 2) * 0.02, 2.2, 0); s.position.y = 1.6 + i * 0.12; s.scale.y = 0.12; slat.add(s);
  }
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 3.0), slatMat); cage.position.set(-4.1, 2.1, 0); slat.add(cage);
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 2.6), camo); topPlate.position.set(0.0, 2.95, 0); topPlate.rotation.z = -0.03; slat.add(topPlate);
  body.add(slat); upgrades.push(slat);
  // tier hack: put slat's top plate on turret, not needed exactly
  turret.attach(topPlate);

  // العلم العراقي على الدبابة
  let flagWave = null;
  if (scheme === 'player') {
    const fm = mat('iqflagdecal', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    for (const z of [1, -1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), fm);
      d.position.set(-1.25, 2.3, z * 1.445); if (z < 0) d.rotation.y = Math.PI; turret.add(d);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), fm);
      d2.position.set(-2.6, 1.52, z * 1.86); if (z < 0) d2.rotation.y = Math.PI; body.add(d2);
    }
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.2, 6), mat('flagpole', () => std('#cfcfcf', 0.4, 0.8)));
    fp.position.set(-2.1, 3.4, 0.95); turret.add(fp);
    const cg = new THREE.PlaneGeometry(1.1, 0.72, 10, 3); cg.translate(-0.55, 0, 0);
    const cloth = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.position.set(-2.1, 4.12, 0.95); turret.add(cloth);
    const cb = cg.attributes.position.array.slice();
    flagWave = (t, speed) => {
      const p = cg.attributes.position; const k = 0.5 + Math.min(1, Math.abs(speed) / 6);
      for (let i = 0; i < p.count; i++) { const x = -cb[i * 3]; p.setZ(i, Math.sin(x * 3 - t * (6 + k * 4)) * 0.09 * x * k); p.setY(i, cb[i * 3 + 1] - x * x * 0.08 * (1.2 - k * 0.6)); }
      p.needsUpdate = true;
    };
  }
  shadowAll(root);
  // disable shadow casting for tiny parts (perf)
  ant.castShadow = ant2.castShadow = false;

  const api = {
    root, body, turret, gunPivot, muzzle, breech, wheels, upgrades,
    treadMap: tread.map,
    setTier(n) { upgrades.forEach((u, i) => { u.visible = i < n; }); },
    setFacing(f) { body.rotation.y = f > 0 ? 0 : Math.PI; },
    setAim(a) { gunPivot.rotation.z = a; },
    spinWheels(d) { for (const w of wheels) w.rotation.z -= d / 0.4; },
    waveFlag(t, speed) { if (flagWave) flagWave(t, speed); },
  };
  api.setTier(0);
  return api;
}

// ------------------------------------------------------------------ SOLDIERS
export const SOLDIER_TYPES = {
  rifleman: { name: 'جندي بندقية', hp: 20, range: [14, 30], speed: 2.2, fire: 1.4, dmg: 1.6, proj: 'bullet', xp: 10, gear: 'helmet', weapon: 'rifle' },
  mg: { name: 'رامي رشاش', hp: 32, range: [16, 30], speed: 1.6, fire: 0.1, burst: 8, burstPause: 2.2, dmg: 1.0, proj: 'bullet', xp: 14, gear: 'helmet', weapon: 'mg', scale: 1.08 },
  rpg: { name: 'رامي آر بي جي', hp: 22, range: [18, 34], speed: 2.0, fire: 4.6, dmg: 12, proj: 'rocket', xp: 18, gear: 'scarf', weapon: 'rpg' },
  grenadier: { name: 'رامي قنابل', hp: 22, range: [10, 18], speed: 2.6, fire: 3.0, dmg: 9, proj: 'grenade', xp: 14, gear: 'cap', weapon: 'rifle' },
  sniper: { name: 'قناص', hp: 16, range: [32, 48], speed: 1.8, fire: 3.4, dmg: 6, proj: 'snipe', xp: 16, gear: 'boonie', weapon: 'sniper' },
  officer: { name: 'ضابط', hp: 30, range: [16, 26], speed: 2.0, fire: 1.0, dmg: 1.4, proj: 'bullet', xp: 22, gear: 'beret', weapon: 'pistol' },
  heavy: { name: 'جندي مدرع', hp: 70, range: [12, 22], speed: 1.3, fire: 0.12, burst: 12, burstPause: 2.6, dmg: 1.3, proj: 'bullet', xp: 30, gear: 'heavy', weapon: 'mg', scale: 1.22 },
};

export const UNIFORMS = {
  desert: ['#a8916a', '#7d6a4a', '#c2ad86'],
  green: ['#5b6644', '#3e4730', '#717a55'],
  urban: ['#5e6063', '#3c3e42', '#808285'],
  winter: ['#dfe3e6', '#a9b0b6', '#f5f7f8'],
  black: ['#2c2d30', '#1a1b1d', '#45474b'],
  friend: ['#bba57c', '#8d7a56', '#d2bf96'],
};
const SKINS = ['#c99a74', '#a8764f', '#8d5a3b', '#d9b08c', '#6e452b'];

export function buildSoldier(typeKey, uniformKey = 'desert', seed = 1, friendly = false) {
  const T = SOLDIER_TYPES[typeKey] || SOLDIER_TYPES.rifleman;
  const r = rng(seed * 977 + 13);
  const uni = UNIFORMS[friendly ? 'friend' : uniformKey];
  const uMat = mat('uni-' + (friendly ? 'f' : uniformKey) + (seed % 3), () => {
    const t = camoTexture([uni[0], uni[1], uni[2]], 40 + seed % 3, 0.25); t.repeat.set(1.5, 1.5);
    return std(0xffffff, 0.95, 0, { map: t });
  });
  const skin = mat('skin' + (seed % SKINS.length), () => std(SKINS[seed % SKINS.length], 0.7, 0));
  const black = mat('sblack', () => std('#1a1a18', 0.8, 0.2));
  const gearMat = mat('gear-' + uniformKey, () => std(uni[1], 0.85, 0.1));
  const vest = mat('vest' + (friendly ? 'f' : uniformKey), () => std(friendly ? '#2b3d26' : uni[1], 0.9, 0.05));
  const metalM = mat('gunmetal', () => std('#2d2d2b', 0.45, 0.8));

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const s = T.scale || (0.95 + r() * 0.12);

  const legGeo = new THREE.BoxGeometry(0.2, 0.82, 0.22); legGeo.translate(0, -0.41, 0);
  const bootGeo = new THREE.BoxGeometry(0.3, 0.14, 0.24); bootGeo.translate(0.04, -0.82, 0);
  const mkLeg = (z) => {
    const g = new THREE.Group(); g.position.set(0, 0.92, z);
    g.add(new THREE.Mesh(legGeo, uMat)); g.add(new THREE.Mesh(bootGeo, black));
    body.add(g); return g;
  };
  const legL = mkLeg(0.13), legR = mkLeg(-0.13);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.5), uMat); torso.position.y = 1.22; body.add(torso);
  const vestM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.54), vest); vestM.position.y = 1.28; body.add(vestM);
  if (typeKey === 'heavy') { vestM.scale.set(1.25, 1.3, 1.15); }
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.4), gearMat); pouch.position.set(0.22, 1.18, 0); body.add(pouch);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.42), gearMat); pack.position.set(-0.3, 1.3, 0); body.add(pack);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), skin); neck.position.y = 1.58; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), skin); head.position.y = 1.72; head.scale.set(1, 1.1, 0.95); body.add(head);
  // face details
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.2), black); eye.position.set(0.14, 1.75, 0); body.add(eye);
  if (friendly && r() < 0.6) { const mus = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.16), black); mus.position.set(0.145, 1.67, 0); body.add(mus); }

  // headgear
  const gear = T.gear;
  if (gear === 'helmet' || gear === 'heavy') {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), gearMat);
    h.position.set(0, 1.76, 0); body.add(h);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.22, 0.04, 14), gearMat); rim.position.set(0, 1.76, 0); body.add(rim);
    if (gear === 'heavy') { const visor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.28), mat('visor', () => std('#111', 0.1, 0.9))); visor.position.set(0.17, 1.72, 0); body.add(visor); }
    if (r() < 0.4) { const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), black); goggles.position.set(0.12, 1.86, 0); body.add(goggles); }
  } else if (gear === 'scarf') {
    const sc = mat('balaclava' + (seed % 2), () => std(seed % 2 ? '#2b2b2b' : '#3d3f38', 0.95, 0));
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), sc); h.position.set(0, 1.74, 0); h.scale.set(1.0, 1.12, 1.0); body.add(h);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.26), sc); mask.position.set(0.12, 1.66, 0); body.add(mask);
  } else if (gear === 'cap') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.12, 12), gearMat); c.position.y = 1.86; body.add(c);
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.24), gearMat); bill.position.set(0.18, 1.82, 0); body.add(bill);
  } else if (gear === 'boonie') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 12), uMat); c.position.y = 1.86; body.add(c);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), uMat); brim.position.y = 1.81; body.add(brim);
    // ghillie strips
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), uMat); st.position.set(-0.2 + r() * 0.1, 1.4 - i * 0.07, -0.25 + r() * 0.5); body.add(st); }
  } else if (gear === 'beret') {
    const bc = friendly ? '#2f7d32' : '#7a1e1e';
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.08, 14), mat('beret' + bc, () => std(bc, 0.95, 0)));
    b.position.set(0.0, 1.87, 0.0); b.rotation.x = 0.25; body.add(b);
    if (!friendly) { const stars = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.4), mat('gold', () => std('#d4af37', 0.3, 0.9))); stars.position.set(0, 1.52, 0); body.add(stars); }
  }
  if (friendly && gear !== 'beret') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.08, 14), mat('beretf', () => std('#2f7d32', 0.95, 0)));
    b.position.set(0.0, 1.87, 0.0); b.rotation.x = 0.25; body.add(b);
  }

  // arms (hold weapon pointing forward)
  const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.15); armGeo.translate(0, -0.27, 0);
  const handGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1); handGeo.translate(0, -0.58, 0);
  const mkArm = (z) => {
    const g = new THREE.Group(); g.position.set(0.02, 1.48, z);
    g.add(new THREE.Mesh(armGeo, uMat)); g.add(new THREE.Mesh(handGeo, skin));
    body.add(g); return g;
  };
  const armL = mkArm(0.3), armR = mkArm(-0.3);
  if (friendly) {
    const pm = mat('iqpatch', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.8 }));
    for (const [arm, z] of [[armL, 0.0765], [armR, -0.0765]]) {
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), pm);
      patch.position.set(0, -0.12, z); if (z < 0) patch.rotation.y = Math.PI; arm.add(patch);
    }
    const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), pm); chest.position.set(0.205, 1.38, 0.12); chest.rotation.y = Math.PI / 2; body.add(chest);
  }

  // weapon
  const weapon = new THREE.Group();
  weapon.position.set(0.25, 1.22, 0);
  const W = T.weapon;
  if (W === 'rifle') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.09, 0.06), metalM); b.position.x = 0.2; weapon.add(b);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), mat('wood', () => std('#5a3a1e', 0.8, 0))); stock.position.set(-0.25, -0.02, 0); weapon.add(stock);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.05), metalM); mag.position.set(0.15, -0.12, 0); mag.rotation.z = 0.25; weapon.add(mag);
  } else if (W === 'mg') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.1), metalM); b.position.x = 0.3; weapon.add(b);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.18), gearMat); box.position.set(0.05, -0.16, 0.06); weapon.add(box);
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.03), metalM); bipod.position.set(0.7, -0.12, 0); weapon.add(bipod);
  } else if (W === 'rpg') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 10), mat('rpgtube', () => std('#4a4a34', 0.7, 0.4))); tube.rotation.z = Math.PI / 2; tube.position.set(0.05, 0.3, 0); weapon.add(tube);
    const war = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 10), mat('rpgwar', () => std('#55603a', 0.6, 0.3))); war.rotation.z = -Math.PI / 2; war.position.set(0.75, 0.3, 0); weapon.add(war);
    const warb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.12, 10), war.material); warb.rotation.z = Math.PI / 2; warb.position.set(0.55, 0.3, 0); weapon.add(warb);
    weapon.userData.rpgWarhead = [war, warb];
  } else if (W === 'sniper') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.05), metalM); b.position.x = 0.35; weapon.add(b);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), black); sc.rotation.z = Math.PI / 2; sc.position.set(0.15, 0.09, 0); weapon.add(sc);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.06), uMat); stock.position.set(-0.28, -0.02, 0); weapon.add(stock);
  } else if (W === 'pistol') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.05), metalM); b.position.x = 0.3; weapon.add(b);
    weapon.position.y = 1.32;
  }
  body.add(weapon);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(W === 'mg' ? 0.85 : W === 'sniper' ? 1.0 : W === 'rpg' ? 0.9 : W === 'pistol' ? 0.45 : 0.6, W === 'rpg' ? 0.3 : 0.02, 0);
  weapon.add(muzzle);
  // arms point toward weapon
  armL.rotation.z = W === 'rpg' ? 2.6 : 1.25; armR.rotation.z = W === 'rpg' ? 1.9 : 0.95;

  root.scale.setScalar(s * 1.12);
  shadowAll(root);
  return { root, body, legL, legR, armL, armR, weapon, muzzle, head, height: 1.95 * s * 1.12, type: typeKey };
}

// ------------------------------------------------------------------ VEHICLES
function wheelMesh(r, w) {
  const g = new THREE.CylinderGeometry(r, r, w, 18); g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, [mat('tire', () => std('#151514', 0.95, 0.05)), mat('wheelface', () => std(0xffffff, 0.6, 0.5, { map: wheelTexture() })), mat('wheelface')]);
}

export function buildJeep(scheme = 'desert') {
  const colors = TANK_SCHEMES[scheme] || TANK_SCHEMES.desert;
  const paint = mat('jeep-' + scheme, () => { const t = camoTexture(colors, 21, 0.6); t.repeat.set(0.4, 0.4); return std(0xffffff, 0.6, 0.35, { map: t }); });
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const chassis = new THREE.Mesh(extrude([[-2.3, 0.55], [-2.35, 1.25], [0.2, 1.3], [0.9, 1.25], [2.3, 1.1], [2.35, 0.6]], 2.0, 0.06), paint);
  body.add(chassis);
  const cab = new THREE.Mesh(extrude([[-0.4, 1.25], [-0.35, 2.0], [0.5, 2.0], [0.95, 1.25]], 1.9, 0.04), paint); body.add(cab);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 1.7), glass); ws.position.set(0.72, 1.62, 0); ws.rotation.z = 0.5; body.add(ws);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 1.92), glass); win.position.set(0.1, 1.66, 0); body.add(win);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 2.1), dark); bumper.position.set(2.35, 0.75, 0); body.add(bumper);
  const wheels = [];
  for (const x of [-1.45, 1.45]) for (const z of [-1, 1]) { const w = wheelMesh(0.48, 0.38); w.position.set(x, 0.48, z * 0.95); body.add(w); wheels.push(w); }
  // MG on bed
  const mgPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), dark); mgPost.position.set(-1.3, 1.65, 0); body.add(mgPost);
  const gunPivot = new THREE.Group(); gunPivot.position.set(-1.3, 2.05, 0); body.add(gunPivot);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.14), dark); gun.position.x = 0.5; gunPivot.add(gun);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.6), paint); shield.position.x = 0.15; gunPivot.add(shield);
  const muzzle = new THREE.Object3D(); muzzle.position.x = 1.25; gunPivot.add(muzzle);
  const spare = wheelMesh(0.4, 0.25); spare.rotation.y = Math.PI / 2; spare.position.set(-2.45, 1.1, 0); body.add(spare);
  shadowAll(root);
  return { root, body, wheels, gunPivot, muzzle, w: 4.8, h: 2.3 };
}

export function buildTruck(scheme = 'desert') {
  const colors = TANK_SCHEMES[scheme] || TANK_SCHEMES.desert;
  const paint = mat('truck-' + scheme, () => { const t = camoTexture(colors, 31, 0.6); t.repeat.set(0.3, 0.3); return std(0xffffff, 0.7, 0.3, { map: t }); });
  const canvas = mat('canvas-' + scheme, () => std(colors[1], 1, 0));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.35, 1.6), dark); frame.position.set(0, 0.95, 0); body.add(frame);
  const cab = new THREE.Mesh(extrude([[1.6, 1.1], [1.6, 2.7], [2.6, 2.7], [3.25, 1.9], [3.3, 1.1]], 2.2, 0.06), paint); body.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.9), glass); win.position.set(2.95, 2.3, 0); win.rotation.z = 0.85; body.add(win);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 2.3), paint); bed.position.set(-0.75, 1.4, 0); body.add(bed);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.3, 16, 1, false, 0, Math.PI), canvas);
  cover.rotation.z = Math.PI / 2; cover.rotation.y = Math.PI / 2; cover.rotation.set(0, 0, Math.PI / 2); cover.rotation.x = 0;
  cover.geometry.rotateZ(0); cover.position.set(-0.75, 1.7, 0);
  const coverGeo = new THREE.CylinderGeometry(1.15, 1.15, 4.3, 16, 1, false, -Math.PI / 2, Math.PI); coverGeo.rotateZ(Math.PI / 2);
  cover.geometry = coverGeo; cover.rotation.set(0, 0, 0); cover.scale.y = 1.1; body.add(cover);
  const wheels = [];
  for (const x of [-2.2, -1.1, 2.3]) for (const z of [-1, 1]) { const w = wheelMesh(0.55, 0.42); w.position.set(x, 0.55, z * 1.0); body.add(w); wheels.push(w); }
  shadowAll(root);
  const muzzle = new THREE.Object3D(); muzzle.position.set(-2.8, 1.5, 0); body.add(muzzle);
  return { root, body, wheels, muzzle, w: 6.6, h: 3.0 };
}

export function buildAPC(scheme = 'enemyGreen') {
  const colors = TANK_SCHEMES[scheme] || TANK_SCHEMES.enemyGreen;
  const paint = mat('apc-' + scheme, () => { const t = camoTexture(colors, 41, 0.7); t.repeat.set(0.3, 0.3); return std(0xffffff, 0.7, 0.3, { map: t }); });
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hull = new THREE.Mesh(extrude([[-3.5, 0.8], [-3.55, 2.0], [-1.0, 2.25], [2.0, 2.25], [3.6, 1.55], [3.5, 0.8]], 2.6, 0.08), paint); body.add(hull);
  const wheels = [];
  for (let i = 0; i < 4; i++) for (const z of [-1, 1]) { const w = wheelMesh(0.55, 0.45); w.position.set(-2.4 + i * 1.55, 0.6, z * 1.2); body.add(w); wheels.push(w); }
  const turret = new THREE.Mesh(extrude([[-0.8, 2.25], [-0.8, 2.85], [0.6, 2.9], [0.95, 2.25]], 1.4, 0.05), paint); body.add(turret);
  const gunPivot = new THREE.Group(); gunPivot.position.set(0.8, 2.6, 0); body.add(gunPivot);
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), dark); gun.rotation.z = Math.PI / 2; gun.position.x = 1.2; gunPivot.add(gun);
  const muzzle = new THREE.Object3D(); muzzle.position.x = 2.45; gunPivot.add(muzzle);
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.3), dark); p.position.set(-1.6 + i * 0.6, 1.8, 1.32); body.add(p); }
  shadowAll(root);
  return { root, body, wheels, gunPivot, muzzle, w: 7.2, h: 2.9 };
}

export function buildHeli(scheme = 'enemyGreen') {
  const colors = TANK_SCHEMES[scheme] || TANK_SCHEMES.enemyGreen;
  const paint = mat('heli-' + scheme, () => { const t = camoTexture(colors, 51, 0.6); t.repeat.set(0.4, 0.4); return std(0xffffff, 0.5, 0.4, { map: t }); });
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fus = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), paint); fus.scale.set(2.4, 1.0, 0.9); body.add(fus);
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), glass); can.scale.set(1.3, 0.7, 0.7); can.position.set(1.5, 0.45, 0); body.add(can);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 5, 10), paint); boom.rotation.z = Math.PI / 2; boom.position.set(-4.2, 0.3, 0); body.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.08), paint); fin.position.set(-6.5, 0.9, 0); fin.rotation.z = -0.3; body.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.04), dark); tailRotor.position.set(-6.5, 0.9, 0.12); body.add(tailRotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), dark); mast.position.set(0, 1.1, 0); body.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.4, 0); body.add(rotor);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.04, 0.3), dark); b.rotation.y = i * Math.PI / 4 * 2 / 2 + i * Math.PI / 4; rotor.add(b); }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.02, 32), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.12, depthWrite: false })); rotor.add(disc);
  for (const z of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.4), paint); wing.position.set(-0.2, -0.2, z * 1.1); body.add(wing);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10), dark); pod.rotation.z = Math.PI / 2; pod.position.set(-0.1, -0.45, z * 1.5); body.add(pod);
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.08), dark); skid.position.set(0, -1.2, z * 0.8); body.add(skid);
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.6, -0.45, 0); body.add(muzzle);
  shadowAll(root);
  return { root, body, rotor, tailRotor, muzzle, w: 8, h: 2.6 };
}

// ------------------------------------------------------------------ PROPS
export function buildProp(kind, r, biome) {
  const g = new THREE.Group();
  if (kind === 'palm') {
    const trunkM = mat('palmtrunk', () => std('#6b5136', 0.95, 0));
    const leafM = mat('palmleaf-' + biome.id, () => std(biome.id === 'desert' ? '#5d7a2c' : '#4f7a2a', 0.85, 0, { side: THREE.DoubleSide }));
    const h = 6 + r() * 5, lean = (r() - 0.5) * 0.3;
    let y = 0, x = 0;
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.012, 0.28 - i * 0.012, h / 7, 7), trunkM);
      x += lean * h / 7; y += h / 7; seg.position.set(x, y - h / 14, 0); seg.rotation.z = -lean; g.add(seg);
    }
    const leafGeo = new THREE.PlaneGeometry(4.2, 0.9, 8, 1);
    const lp = leafGeo.attributes.position;
    for (let k = 0; k < lp.count; k++) {
      const lx = lp.getX(k) + 2.1, w = lp.getY(k) * (1 - lx / 4.2 * 0.8);
      lp.setXYZ(k, lx, -0.09 * lx * lx + w * 0.55, w * 0.85);
    }
    leafGeo.computeVertexNormals();
    for (let i = 0; i < 12; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafM);
      leaf.position.set(x, y, 0);
      leaf.rotation.y = i / 12 * Math.PI * 2 + r() * 0.3;
      leaf.rotation.z = 0.35 + r() * 0.4;
      leaf.rotation.x = (r() - 0.5) * 0.8;
      g.add(leaf);
    }
  } else if (kind === 'tree') {
    const trunkM = mat('trunk', () => std('#4e3a26', 0.95, 0));
    const leafM = mat('treeleaf' + biome.id, () => std(biome.leaf || '#4d6e2a', 0.9, 0));
    const h = 2.5 + r() * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, h, 7), trunkM); t.position.y = h / 2; g.add(t);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + r() * 1.0, 1), leafM);
      b.position.set((r() - 0.5) * 2, h + r() * 1.6, (r() - 0.5) * 2); g.add(b);
    }
  } else if (kind === 'pine') {
    const trunkM = mat('trunk', () => std('#4e3a26', 0.95, 0));
    const leafM = mat('pineleaf', () => std('#2f4a32', 0.9, 0));
    const snowM = mat('snowcap', () => std('#f4f8fb', 0.8, 0));
    const h = 5 + r() * 5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h * 0.3, 6), trunkM); t.position.y = h * 0.15; g.add(t);
    for (let i = 0; i < 4; i++) {
      const rr = (1.8 - i * 0.35) * h / 7;
      const c = new THREE.Mesh(new THREE.ConeGeometry(rr, h * 0.32, 8), leafM); c.position.y = h * 0.3 + i * h * 0.17; g.add(c);
      if (biome.id === 'ice') { const s = new THREE.Mesh(new THREE.ConeGeometry(rr * 0.75, h * 0.14, 8), snowM); s.position.y = c.position.y + h * 0.1; g.add(s); }
    }
  } else if (kind === 'rock') {
    const rm = mat('rock' + biome.id, () => std(biome.rock || '#8a7a64', 0.95, 0, { flatShading: true }));
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + r() * 1.3, 0), rm);
      m.position.set(i * 1.1, 0.3, (r() - 0.5)); m.scale.y = 0.6 + r() * 0.5; m.rotation.set(r() * 3, r() * 3, r() * 3); g.add(m);
    }
  } else if (kind === 'bush') {
    const m = mat('bush' + biome.id, () => std(biome.bush || '#6b7a3a', 0.95, 0, { flatShading: true }));
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.5, 0), m); b.position.set(i * 0.5, 0.25, (r() - 0.5) * 0.6); g.add(b); }
  } else if (kind === 'ruin' || kind === 'building' || kind === 'house') {
    const base = kind === 'house' ? (biome.id === 'countryside' ? '#c9b48e' : '#cdbfa6') : ['#9b8f7e', '#a89a80', '#857a6e', '#b4a58a'][Math.floor(r() * 4)];
    const wm = mat('wall' + base + kind, () => { const t = wallTexture(base, Math.floor(r() * 99)); t.repeat.set(1, 1); return std(0xffffff, 0.95, 0, { map: t }); });
    const w = kind === 'building' ? 7 + r() * 8 : 4 + r() * 4, d = 5 + r() * 4;
    const h = kind === 'building' ? 8 + r() * 16 : kind === 'house' ? 3.2 + r() * 1.5 : 2.5 + r() * 5;
    const geo = new THREE.BoxGeometry(w, h, d, 6, 6, 1);
    if (kind !== 'house') {
      // jagged destroyed top
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > h / 2 - 0.01) pos.setY(i, h / 2 - r() * h * 0.35);
      geo.computeVertexNormals();
    }
    // texture tiling by size
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * h / 4);
    const m = new THREE.Mesh(geo, wm); m.position.y = h / 2; g.add(m);
    if (kind === 'house') {
      const roofM = mat('roof' + biome.id, () => std(biome.id === 'ice' ? '#e9eef2' : '#7a4a32', 0.9, 0));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.75, 1.8, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.y = h + 0.9; g.add(roof);
    } else {
      // rubble
      const rm = mat('rubble', () => std('#7d7468', 0.95, 0, { flatShading: true }));
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3 + r() * 1.2, 0.3 + r() * 0.6, 0.3 + r() * 1.2), rm); b.position.set((r() - 0.5) * (w + 3), 0.2, d / 2 + r() * 2); b.rotation.set(r(), r(), r()); g.add(b); }
      // rebar
      const rb = mat('rebar', () => std('#4a3020', 0.6, 0.7));
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), rb); b.position.set((r() - 0.5) * w, h * 0.6 + r() * 0.5, d / 2); b.rotation.z = (r() - 0.5); g.add(b); }
    }
  } else if (kind === 'wreck') {
    const burnt = mat('burnt', () => { const t = camoTexture(['#2b2622', '#1a1715', '#3d3329', '#4e3a28'], 77, 0.5); t.repeat.set(0.4, 0.4); return std(0xffffff, 1, 0.2, { map: t }); });
    const type = r();
    if (type < 0.5) {
      const c = new THREE.Mesh(extrude([[-2.2, 0.3], [-2.2, 1.0], [-0.6, 1.1], [-0.2, 1.7], [1.0, 1.7], [1.6, 1.0], [2.2, 0.9], [2.2, 0.3]], 1.8, 0.05), burnt);
      c.rotation.z = (r() - 0.5) * 0.2; g.add(c);
    } else {
      const hull = new THREE.Mesh(extrude([[-3.4, 0.2], [-3.5, 1.4], [2.2, 1.5], [3.6, 0.9], [3.4, 0.2]], 3.0, 0.05), burnt); g.add(hull);
      const tur = new THREE.Mesh(extrude([[-1.5, 0], [-1.6, 0.7], [1.2, 0.8], [1.6, 0]], 2.2, 0.05), burnt);
      tur.position.set(2 + r() * 2, 0.4, 1.8); tur.rotation.set(0.3, r() * 2, 0.8); g.add(tur);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 4, 8), burnt); bar.rotation.z = 1.2; bar.position.set(3.8, 1.2, 2); g.add(bar);
    }
  } else if (kind === 'sandbags') {
    const sm = mat('sandbag', () => std('#b39b70', 0.95, 0));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 3, 8), sm); b.rotation.z = Math.PI / 2;
      b.position.set(i * 0.78 + row * 0.39, 0.22 + row * 0.38, 0); g.add(b);
    }
  } else if (kind === 'barbed') {
    const wm = mat('wire', () => std('#55524a', 0.5, 0.8));
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 4, 16), wm); t.rotation.y = Math.PI / 2; t.position.set(i * 0.7, 0.5, 0); g.add(t);
    }
    for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), mat('trunk', () => std('#4e3a26', 0.95, 0))); p.position.set(i * 2.8, 0.6, 0); g.add(p); }
  } else if (kind === 'pole') {
    const pm = mat('pole', () => std('#5a4a38', 0.9, 0));
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), pm); p.position.y = 4; p.rotation.z = (r() - 0.5) * 0.3; g.add(p);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), pm); c.position.y = 7.4; g.add(c);
  } else if (kind === 'barrels') {
    const bm = mat('barrel' + Math.floor(r() * 2), () => std(r() < 0.5 ? '#5c3a1e' : '#3e5a3a', 0.6, 0.6));
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 12), bm); b.position.set(i * 0.75, 0.48, (r() - 0.5) * 0.4); if (r() < 0.2) { b.rotation.z = Math.PI / 2; b.position.y = 0.35; } g.add(b); }
  } else if (kind === 'fence') {
    const fm = mat('fence', () => std('#7a5a3a', 0.95, 0));
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), fm); p.position.set(i * 1.2, 0.55, 0); g.add(p); }
    for (const y of [0.4, 0.85]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 0.06), fm); rl.position.set(3, y, 0); g.add(rl); }
  } else if (kind === 'debris') {
    const rm = mat('rubble', () => std('#7d7468', 0.95, 0, { flatShading: true }));
    for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + r() * 0.5, 0), rm); b.position.set(r() * 3, 0.15, (r() - 0.5) * 2); g.add(b); }
  } else if (kind === 'snowman_rock') {
    const sm = mat('snowmound', () => std('#f1f5f8', 0.9, 0));
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.5 + r() * 2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sm); m.scale.y = 0.4; g.add(m);
  } else if (kind === 'cactus') {
    const cm = mat('cactus', () => std('#5b7a3c', 0.8, 0));
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.8, 4, 8), cm); t.position.y = 1.1; g.add(t);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.6, 4, 8), cm); a.position.set(0.35, 1.3, 0); g.add(a);
  }
  shadowAll(g);
  return g;
}

export function buildCrate(kind) {
  const m = mat('crate-' + kind, () => std(0xffffff, 0.7, 0.15, { map: crateTexture(kind) }));
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), m); box.position.y = 0.6; g.add(box);
  box.castShadow = true;
  const color = { weapon: '#ffc94a', ammo: '#b8f06a', repair: '#ff6060', parts: '#6ac8ff' }[kind];
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.y = 3; g.add(beam);
  return { root: g, box, ring };
}

export function buildFlag(color, symbol, poleH = 6, opts = {}) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, poleH, 8), mat('flagpole', () => std('#cfcfcf', 0.4, 0.8)));
  pole.position.y = poleH / 2; g.add(pole);
  const clothGeo = new THREE.PlaneGeometry(2.2, 1.4, 12, 4); clothGeo.translate(1.1, 0, 0);
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ map: opts.tex || flagTexture(color, symbol), side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.position.y = poleH - 0.75; g.add(cloth);
  const base = clothGeo.attributes.position.array.slice();
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; if (opts.ring !== false) g.add(ring);
  shadowAll(g); ring.castShadow = false;
  return {
    root: g, ring,
    wave(t) {
      const p = clothGeo.attributes.position;
      const ph = this.phase || 0;
      for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(x * 2.2 - t * 6 + ph) * 0.18 * x / 2.2); }
      p.needsUpdate = true;
    },
  };
}
