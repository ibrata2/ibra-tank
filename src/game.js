import { RescueWinch } from './winch.js';
import { flightFrame } from './adventure-controls.mjs';
import { makeCombinedMission } from './combined.js';
import { createAdventure } from './adventure.js';
import { ADVENTURE, ADVENTURE_REGION } from './adventure-plan.mjs';
import { MODES, MODE_NAMES, vehicleFor, resolveSecret } from './campaign.mjs';
import * as THREE from 'three';
import { World, levelEnv, BIOMES, TIMES } from './world.js';
import { buildTruck, buildAPC, buildCrate, buildFlag, buildProp, SOLDIER_TYPES, mat } from './models.js';
import { buildSoldierHD as buildSoldier, buildTankHD as buildTank, buildHeliHD, buildSUV, buildBoatHD, TANK_FAMILIES } from './models_hd.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FX } from './fx.js';
import { Sfx } from './audio.js';
import { rng, markerTex, iraqFlagTexture, drawIraqFlagCanvas } from './textures.js';

const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

// ============================================================ RENDERER
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 2000);
const world = new World(scene);
const fx = new FX(scene);
const sfx = new Sfx();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1.4 ? 46 : 36;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const ground = (x) => world.driveHeight ? world.driveHeight(x) : world.heightAt(x);
const slopeAt = (x, d = 2.8) => Math.atan2(ground(x + d) - ground(x - d), d * 2);

// ============================================================ SAVE / STATS
const WEAPONS = [
  { id: 'cannon', name: 'المدفع الرئيسي', short: 'مدفع 125', icon: '🎯', reload: 1.15, speed: 52, g: 9.8, dmg: 55, splash: 3.4, size: 1, ammo: Infinity, sound: 'cannon', recoil: 1, kind: 'shell' },
  { id: 'mg', name: 'الرشاش المحوري', short: 'رشاش', icon: '⁂', reload: 0.085, speed: 85, g: 1.5, dmg: 7, splash: 0, spread: 0.025, ammo: Infinity, sound: 'mg', recoil: 0.05, kind: 'bullet' },
  { id: 'he', name: 'قذيفة شديدة الانفجار', short: 'قذيفة كبيرة', icon: '💥', reload: 2.0, speed: 44, g: 9.8, dmg: 115, splash: 7, size: 1.7, ammo: 12, maxAmmo: 12, sound: 'cannon', recoil: 1.4, kind: 'shell' },
  { id: 'rockets', name: 'راجمة صواريخ موجهة', short: 'صواريخ', icon: '🚀', reload: 2.4, burst: 4, burstGap: 0.13, speed: 30, g: 2, dmg: 42, splash: 3.6, size: 0.9, ammo: 10, maxAmmo: 10, sound: 'rocket', recoil: 0.2, kind: 'rocket', homing: true },
  { id: 'cluster', name: 'قذيفة عنقودية', short: 'عنقودية', icon: '✳', reload: 2.6, speed: 40, g: 9.8, dmg: 34, splash: 3.6, size: 1.2, ammo: 8, maxAmmo: 8, sound: 'cannon', recoil: 1.1, kind: 'cluster' },
  { id: 'rail', name: 'المدفع الكهرومغناطيسي', short: 'ليزر', icon: '⚡', reload: 3.0, dmg: 230, ammo: 6, maxAmmo: 6, sound: 'rail', recoil: 1.6, kind: 'rail' },
];

const SAVE_KEY = 'ibra-tank-save-v1';
const defaultSave = () => ({ level: 1, plv: 1, xp: 0, unlocked: [true, true, false, false, false, false], ammo: WEAPONS.map(w => w.ammo === Infinity ? -1 : 0), kills: 0, volume: 0.7, quality: 'high', mode: 'tank' });
let S = defaultSave();
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = { ...S, ...JSON.parse(raw) }; } catch (e) { /* ignore */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
if (!MODES.includes(S.mode)) S.mode = 'tank';
sfx.setVolume(S.volume);

const xpNeed = (l) => Math.round(70 * Math.pow(l, 1.25));
const stats = () => ({
  dmg: 1 + 0.09 * (S.plv - 1),
  maxHp: Math.round(320 * (1 + 0.1 * (S.plv - 1))),
  reload: Math.max(0.5, 1 - 0.03 * (S.plv - 1)),
  speed: Math.min(12, 7.5 * (1 + 0.025 * (S.plv - 1))),
  armor: Math.min(0.5, 0.02 * (S.plv - 1)),
  tier: Math.min(24, S.plv - 1),
});

// ============================================================ PLAYER
const tank = buildTank('player', 3);
scene.add(tank.root);
const headL = new THREE.SpotLight('#fff3d0', 0, 60, 0.45, 0.6, 1.2);
headL.position.set(3.8, 1.4, 0); tank.body.add(headL);
const headT = new THREE.Object3D(); headT.position.set(20, -2, 0); tank.body.add(headT); headL.target = headT;
headL.castShadow = false;

const P = { vehicle: 'tank', x: 8, y: 0, vx: 0, facing: 1, aim: 0.1, hp: 320, hitT: 99, disabled: 0, cd: WEAPONS.map(() => 0), wi: 0, burst: [], recoil: 0, slope: 0, passengers: [], dustT: 0 };

// All campaigns use the same combat, loot and progression systems.
let flight = null, vessel = null, secretStage = null;
const vehicleName = () => P.vehicle === 'bike' ? 'الدراجة العسكرية' : P.vehicle === 'car' ? 'السيارة العسكرية' : P.vehicle === 'soldier' ? 'الجندي' : MODE_NAMES[P.vehicle] || MODE_NAMES.tank;
function refreshVehicle() {
  const riders = G?.friends?.filter(f => f.state === 'ride') || [];
  if (flight) scene.remove(flight.root);
  if (vessel) scene.remove(vessel.root);
  flight = vessel = null;
  tank.root.visible = P.vehicle === 'tank';
  if (P.vehicle === 'heli') { flight = buildHeliHD('player', stats().tier); scene.add(flight.root); flight.root.position.set(P.x, ground(P.x) + (P.alt || 7), 0); }
  if (P.vehicle === 'boat') {
    vessel = buildBoatHD(['patrol', 'gunboat', 'stealth', 'catamaran', 'frigate'][Math.min(4, Math.floor(stats().tier / 5))]);
    scene.add(vessel.root); vessel.root.position.set(P.x, world.waterY - 0.55, 0);
  }
  const body = flight?.body || vessel?.body || tank.body;
  for (const f of riders) body.add(f.m.root);
}
const lootHeight = x => P.vehicle === 'boat' || (G.mission?.combined && world.inRiver(x)) ? world.waterY + 0.1 : ground(x);
// trajectory preview
const TRAJ_N = 48;
const trajGeo = new THREE.BufferGeometry();
trajGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAJ_N * 3), 3));
const traj = new THREE.Points(trajGeo, new THREE.PointsMaterial({ color: '#ffd76a', size: 0.22, transparent: true, opacity: 0.75, depthWrite: false }));
traj.frustumCulled = false; scene.add(traj);

// ============================================================ GAME STATE
const G = {
  state: 'menu', // menu | play | paused | complete
  t: 0, enemies: [], proj: [], crates: [], friends: [], flags: [], wrecks: [], spawns: [],
  mission: null, kills: 0, levelKills: 0, vehicleKills: 0, levelTime: 0, xpGained: 0,
  shake: 0, camX: 0, camY: 0, reinforceT: 20, length: 400, rand: Math.random,
};

const winch = new RescueWinch({scene,P,toast});
const carrierRoot = () => G.special?.carrierRoot?.() || flight?.root;

// ============================================================ ENEMIES
function soldierTypeFor(L, r) {
  const pool = [['rifleman', 10]];
  if (L >= 2) pool.push(['rpg', 3 + L * 0.3], ['mg', 3]);
  if (L >= 3) pool.push(['grenadier', 3], ['officer', 1.5]);
  if (L >= 4) pool.push(['sniper', 2]);
  if (L >= 7) pool.push(['heavy', 1 + L * 0.1]);
  const tot = pool.reduce((a, b) => a + b[1], 0);
  let v = r() * tot;
  for (const [k, w] of pool) { v -= w; if (v <= 0) return k; }
  return 'rifleman';
}

const RANGE = { rifleman: [11, 21], mg: [13, 23], rpg: [14, 25], grenadier: [8, 14], sniper: [23, 31], officer: [12, 20], heavy: [9, 17] };
const levelMul = () => 1 + 0.09 * ((G.mission?.L || S.level) - 1);

let seedCounter = 1;
function spawnSoldier(x, type, fromBehind = false) {
  if (P.vehicle === 'boat' || (G.mission?.combined && world.inRiver(x))) return spawnVehicle('gunboat', x);
  const biome = world.biome;
  const m = buildSoldier(type, biome.uniform, seedCounter++);
  scene.add(m.root);
  const T = SOLDIER_TYPES[type];
  const R = RANGE[type];
  const e = {
    kind: 'soldier', type, m, x, y: ground(x), hp: T.hp * levelMul(), max: T.hp * levelMul(), facing: -1,
    pref: R[0] + Math.random() * (R[1] - R[0]), cd: 1 + Math.random() * 2, burst: 0, walkT: Math.random() * 10,
    w: 0.9, h: m.height, xp: T.xp, dead: false, z: (Math.random() - 0.5) * 2.2, fromBehind,
  };
  m.root.position.set(x, e.y, e.z);
  G.enemies.push(e);
  return e;
}

function spawnVehicle(kind, x) {
  if ((P.vehicle === 'boat' || (G.mission?.combined && world.inRiver(x))) && !['heli', 'ship', 'gunboat'].includes(kind)) kind = kind === 'tank' || kind === 'apc' ? 'ship' : 'gunboat';
  const b = world.biome;
  let m, e;
  const base = { kind, x, y: ground(x), facing: -1, cd: 2 + Math.random() * 2, burst: 0, dead: false, vx: 0, z: 0, wheelSpin: 0 };
  if (kind === 'jeep') { m = buildSUV(b.vehicle === 'desert' ? 'desert' : b.vehicle === 'urban' ? 'urban' : b.vehicle === 'winter' ? 'winter' : 'enemyGreen', 4); e = { ...base, hp: 110, w: 4.6, h: 2.3, xp: 35, pref: 18 + Math.random() * 6, speed: 7 }; }
  else if (kind === 'truck') { m = buildTruck(b.vehicle); e = { ...base, hp: 150, w: 6.4, h: 3.0, xp: 40, pref: 26 + Math.random() * 6, speed: 5.5, unloaded: false }; }
  else if (kind === 'apc') { m = buildAPC(b.enemyTank); e = { ...base, hp: 260, w: 7.0, h: 2.9, xp: 60, pref: 20 + Math.random() * 6, speed: 5 }; }
  else if (kind === 'tank') {
    const t = buildTank(b.enemyTank === 'desert' ? 'enemyGrey' : b.enemyTank, 11 + seedCounter++);
    t.setTier(Math.min(24, Math.floor(S.level * 1.4) + Math.floor(Math.random() * 3)));
    m = { root: t.root, body: t.body, wheels: t.wheels, gunPivot: t.gunPivot, muzzle: t.muzzle, tank: t };
    e = { ...base, hp: 420, w: 7.4, h: 3.0, xp: 100, pref: 22 + Math.random() * 6, speed: 4.2, aim: 0.1 };
  } else if (kind === 'gunboat') { m = buildBoatHD(Math.random() < 0.5 ? 'rhib' : 'gunboat', { enemy: true }); e = { ...base, hp: 120, w: 6.6, h: 2.4, xp: 40, pref: 20 + Math.random() * 6, speed: 6.5, z: (Math.random() - 0.5) * 3 }; }
  else if (kind === 'ship') { m = buildBoatHD('frigate', { enemy: true }); e = { ...base, hp: 420, w: 15, h: 5.5, xp: 110, pref: 30 + Math.random() * 5, speed: 3.2, z: -2.5 }; }
  else if (kind === 'heli') { m = buildHeliHD(b.enemyTank === 'winter' || b.enemyTank === 'urban' ? 'enemyGrey' : 'enemyGreen', Math.min(24, S.level)); e = { ...base, hp: 220, w: 7.5, h: 2.5, xp: 120, speed: 9, alt: 13 + Math.random() * 4, hover: Math.random() * 10 }; }
  e.hp *= levelMul(); e.max = e.hp; e.m = m;
  scene.add(m.root);
  m.root.position.set(x, e.y, 0);
  if (m.tank) m.tank.setFacing(-1); else m.body.rotation.y = Math.PI;
  G.enemies.push(e);
  return e;
}

function enemyAABB(e) {
  if (e.kind === 'heli') return [e.x - e.w / 2, e.y - 1.3, e.x + e.w / 2, e.y + 1.3];
  return [e.x - e.w / 2, e.y, e.x + e.w / 2, e.y + e.h];
}

function damageEnemy(e, dmg, kx = 0, explosive = false) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.hp <= 0) killEnemy(e, kx, explosive);
}

function killEnemy(e, kx, explosive) {
  e.dead = true; e.deadT = 0;
  G.kills++; G.levelKills++; S.kills++;
  const xp = Math.round(e.xp * (1 + S.level * 0.05));
  addXP(xp);
  floater(e.x, e.y + (e.h || 2) + 0.5, '+' + xp + ' XP', '#ffd76a');
  if (e.kind === 'soldier') {
    e.vx = (kx || (Math.random() - 0.5)) * (explosive ? 9 : 3) + (Math.random() - 0.5) * 2;
    e.vy = explosive ? 7 + Math.random() * 5 : 2;
    e.spin = (Math.random() - 0.5) * (explosive ? 14 : 4);
    if (Math.random() < 0.4) sfx.scream();
    if (Math.random() < 0.1 + (e.type === 'officer' ? 0.5 : 0)) spawnCrate(e.x, Math.random() < 0.5 ? 'ammo' : 'repair');
  } else {
    G.vehicleKills++;
    fx.explosion(e.x, e.kind === 'heli' ? e.y : e.y + 1.2, 2.2, { debris: 10, dust: world.biome.track });
    sfx.explosion(2.2, (e.x - P.x) / 30);
    G.shake = Math.max(G.shake, 0.9);
    burnModel(e.m.root);
    e.smokeT = 0; e.burnT = 22;
    if (e.m.tank) { // turret toss
      const tur = e.m.tank.turret;
      e.turretFly = { obj: tur, vx: (Math.random() - 0.5) * 6, vy: 11, spin: (Math.random() - 0.5) * 6 };
    }
    if (e.kind === 'heli') { e.vy = 0; e.falling = true; }
    const r = Math.random();
    spawnCrate(e.x, r < 0.25 ? 'weapon' : r < 0.5 ? 'parts' : r < 0.75 ? 'ammo' : 'repair');
    if (e.kind === 'gunboat' || e.kind === 'ship') e.sinking = true;
  }
  if (G.mission) G.mission.onKill(e);
}

const burntMat = new THREE.MeshStandardMaterial({ color: '#1d1a17', roughness: 1, metalness: 0.2 });
function burnModel(root) {
  root.traverse(o => { if (o.isMesh && !o.material.transparent) o.material = Array.isArray(o.material) ? o.material.map(() => burntMat) : burntMat; });
}

// ============================================================ PROJECTILES
const projGeo = {
  shell: new THREE.CapsuleGeometry(0.11, 0.55, 3, 8).rotateZ(Math.PI / 2),
  bullet: new THREE.BoxGeometry(1.2, 0.05, 0.05),
  rocket: new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8).rotateZ(Math.PI / 2),
  grenade: new THREE.SphereGeometry(0.13, 8, 6),
  bomblet: new THREE.SphereGeometry(0.16, 8, 6),
};
const projMat = {
  shell: new THREE.MeshBasicMaterial({ color: '#ffdd88' }),
  bullet: new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }),
  ebullet: new THREE.MeshBasicMaterial({ color: '#ff6a4a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }),
  rocket: new THREE.MeshStandardMaterial({ color: '#4a4a3a', roughness: 0.5, metalness: 0.5 }),
  grenade: new THREE.MeshStandardMaterial({ color: '#2f3a22', roughness: 0.7 }),
};

function fireProj(o) {
  if (G.special?.depthCombat && o.owner === 'enemy') {
    const time = Math.max(.15, Math.abs(P.x - o.x) / Math.max(1, Math.abs(o.vx)));
    o.z = o.z || 0; o.vz = ((P.z || 0) - o.z) / time;
  }
  const kind = o.kind;
  const geo = projGeo[kind === 'cluster' ? 'shell' : kind === 'snipe' ? 'bullet' : kind] || projGeo.shell;
  const material = kind === 'bullet' || kind === 'snipe' ? (o.owner === 'player' ? projMat.bullet : projMat.ebullet) : kind === 'rocket' ? projMat.rocket : kind === 'grenade' || kind === 'bomblet' ? projMat.grenade : projMat.shell;
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(o.x, o.y, o.z || 0);
  if (o.size) mesh.scale.setScalar(o.size);
  scene.add(mesh);
  G.proj.push({ g: 9.8, life: 6, trailT: 0, ...o, mesh });
}

function playerFire() {
  if (P.disabled > 0) return;
  const W = WEAPONS[P.wi];
  if (!S.unlocked[P.wi]) return;
  if (P.cd[P.wi] > 0) return;
  if (W.ammo !== Infinity && S.ammo[P.wi] <= 0) { toast('نفدت ذخيرة ' + W.name + ' — اجمع صناديق الذخيرة', 'warn'); P.cd[P.wi] = 0.6; selectNextAvailable(); return; }
  const st = stats();
  P.cd[P.wi] = W.reload * st.reload;
  if (W.ammo !== Infinity) S.ammo[P.wi]--;
  const shots = W.burst || 1;
  for (let i = 0; i < shots; i++) P.burst.push({ t: i * (W.burstGap || 0), wi: P.wi });
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function muzzleInfo() {
  if (G.special?.muzzleInfo) return G.special.muzzleInfo();
  const model = P.vehicle === 'heli' ? flight : P.vehicle === 'boat' ? vessel : null;
  if (model) {
    model.root.updateMatrixWorld(true); model.muzzle.getWorldPosition(_v1);
    return { x: _v1.x, y: _v1.y, dx: Math.cos(P.aim) * P.facing, dy: Math.sin(P.aim) };
  }
  tank.root.updateMatrixWorld(true);
  tank.muzzle.getWorldPosition(_v1);
  tank.breech.getWorldPosition(_v2);
  const dx = _v1.x - _v2.x, dy = _v1.y - _v2.y, L = Math.hypot(dx, dy) || 1;
  return { x: _v1.x, y: _v1.y, dx: dx / L, dy: dy / L };
}

function doShot(wi) {
  const W = WEAPONS[wi];
  const st = stats();
  const m = muzzleInfo();
  const dmg = W.dmg * st.dmg;
  if (W.kind === 'rail') {
    railBeam(m, dmg);
  } else {
    let ang = Math.atan2(m.dy, m.dx);
    if (W.spread) ang += (Math.random() - 0.5) * W.spread * 2;
    if (W.kind === 'rocket') ang += (Math.random() - 0.5) * 0.08;
    const sp = W.speed;
    const ox = W.kind === 'bullet' && !G.special?.depthCombat ? -m.dx * 4.5 : 0, oy = W.kind === 'bullet' && !G.special?.depthCombat ? -m.dy * 4.5 - 0.1 : 0; // coax MG sits near mantlet
    fireProj({ owner: 'player', kind: W.kind, x: m.x + ox, y: m.y + oy, z: m.z || 0, vz: (m.dz || 0) * sp, vx: (G.special?.depthCombat ? m.dx : Math.cos(ang)) * sp + P.vx * 0.3, vy: (G.special?.depthCombat ? m.dy : Math.sin(ang)) * sp, g: W.g, dmg, splash: W.splash, size: W.size || 1, homing: W.homing, wid: W.id });
    fx.muzzle(m.x, m.y, m.dx, m.dy, W.kind === 'bullet' ? 0.35 : W.kind === 'rocket' ? 0.5 : (W.size || 1));
  }
  P.recoil = Math.max(P.recoil, W.recoil);
  if (W.recoil > 0.5) G.shake = Math.max(G.shake, 0.25 * W.recoil);
  sfx[W.sound]();
}

function railBeam(m, dmg) {
  let x = m.x, y = m.y, len = 0;
  const hit = new Set();
  for (; len < 90; len += 0.4) {
    x = m.x + m.dx * len; y = m.y + m.dy * len;
    if (G.special?.projectileHit?.({owner:'player',x,y,z:(m.z||0)+(m.dz||0)*len,dmg})) break;
    if (y < ground(x)) break;
    for (const e of G.enemies) {
      if (e.dead || hit.has(e)) continue;
      const [a, b, c, d] = enemyAABB(e);
      if (x > a && x < c && y > b && y < d && (!G.special?.depthCombat || Math.abs((m.z||0)+(m.dz||0)*len-(e.z||0))<3)) { hit.add(e); damageEnemy(e, dmg, m.dx, true); fx.explosion(x, y, 0.6, { debris: 2 }); }
    }
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, len, 8, 1, true).rotateZ(Math.PI / 2).translate(len / 2, 0, 0), new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.set(m.x, m.y, m.z || 0); beam.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),new THREE.Vector3(m.dx,m.dy,m.dz||0).normalize());
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6).rotateZ(Math.PI / 2).translate(len / 2, 0, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  beam.add(core);
  scene.add(beam);
  G.beams = G.beams || [];
  G.beams.push({ mesh: beam, life: 0.35 });
  for (let i = 0; i < 20; i++) fx.spawn({ tex: 'glow', x: m.x + m.dx * len * Math.random(), y: m.y + m.dy * len * Math.random(), vy: Math.random() * 2, life: 0.5, size0: 1.2, size1: 0.2 });
  if (y < ground(x) + 0.5) { fx.explosion(x, ground(x), 1.2, { dust: world.biome.track }); fx.scorch(x, ground(x), 3); }
  fx.light(m.x, m.y, 40, 0.3, '#7fe8ff');
}

function explode(x, y, radius, dmg, owner, opts = {}) {
  const size = Math.max(0.4, radius / 3.2);
  const gy = ground(x);
  const nearGround = y - gy < 1.5;
  fx.explosion(x, Math.max(y, gy), size, { dust: nearGround ? world.biome.track : null, debris: nearGround ? 5 : 1 });
  if (nearGround && radius > 2) fx.scorch(x, gy, radius * 1.1, slopeAt(x));
  const dist = Math.abs(x - P.x);
  sfx.explosion(size, (x - P.x) / 30, clamp(1.2 - dist / 70, 0.15, 1));
  G.shake = Math.max(G.shake, clamp(size * 0.6 - dist * 0.012, 0, 1.2));
  if (owner === 'player') {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const [a, b, c, d] = enemyAABB(e);
      const cx = clamp(x, a, c), cy = clamp(y, b, d);
      const dd = Math.hypot(x - cx, y - cy, G.special?.depthCombat ? (opts.z || 0) - (e.z || 0) : 0);
      if (dd < radius) damageEnemy(e, dmg * (1 - dd / radius * 0.6), Math.sign(e.x - x) || 1, true);
    }
  } else {
    const cx = clamp(x, P.x - 3.7, P.x + 3.7), cy = clamp(y, P.y, P.y + 2.9);
    const dd = Math.hypot(x - cx, y - cy, G.special?.depthCombat ? (opts.z || 0) - (P.z || 0) : 0);
    if (dd < radius) damagePlayer(dmg * (1 - dd / radius * 0.6));
  }
}

function updateProjectiles(dt) {
  for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i];
    p.life -= dt;
    // homing
    if (p.homing && p.owner === 'player') {
      let best = null, bd = 1e9;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.x - p.x; if (Math.sign(dx) !== Math.sign(p.vx) && Math.abs(dx) > 2) continue;
        const d = Math.abs(dx); if (d < bd && d < 60) { bd = d; best = e; }
      }
      const sp = Math.hypot(p.vx, p.vy) + dt * 25;
      let ang = Math.atan2(p.vy, p.vx);
      if (best && p.life < (p.turn ? 5.93 : 5.7)) {
        const tx = best.x, ty = best.kind === 'heli' ? best.y : best.y + (best.h || 2) * 0.5;
        let want = Math.atan2(ty - p.y, tx - p.x);
        let da = want - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        if (G.special?.depthCombat) p.vz = lerp(p.vz || 0, ((best.z || 0) - (p.z || 0)) * 3, Math.min(1,dt*5));
        const tr = p.turn || 3; ang += clamp(da, -tr * dt, tr * dt);
      }
      p.vx = Math.cos(ang) * Math.min(sp, 55); p.vy = Math.sin(ang) * Math.min(sp, 55);
    } else {
      p.vy -= p.g * dt;
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z = (p.z || 0) + (p.vz || 0) * dt;
    p.mesh.position.set(p.x, p.y, p.z || 0);
    p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),new THREE.Vector3(p.vx,p.vy,p.vz||0).normalize());
    if (p.kind === 'grenade' || p.kind === 'bomblet') p.mesh.rotation.x += dt * 10;
    // trails
    p.trailT -= dt;
    if (p.trailT <= 0) {
      if (p.kind === 'rocket') { p.trailT = 0.02; fx.spawn({ tex: 'fire', x: p.x, y: p.y, life: 0.15, size0: 0.8, size1: 0.2 }); fx.spawn({ tex: 'smoke', additive: false, x: p.x, y: p.y, life: 1.2, size0: 0.5, size1: 2.2, alpha: 0.45, color: '#cfcac0', drag: 1 }); }
      else if (p.kind === 'shell' || p.kind === 'cluster') { p.trailT = 0.03; fx.spawn({ tex: 'smoke', additive: false, x: p.x, y: p.y, life: 0.6, size0: 0.25 * (p.size || 1), size1: 0.9 * (p.size || 1), alpha: 0.35, color: '#e0dacc' }); fx.spawn({ tex: 'spark', x: p.x, y: p.y, life: 0.08, size0: 0.9 * (p.size || 1), size1: 0.3 }); }
    }
    // cluster split at apex
    if (p.kind === 'cluster' && !p.split && p.vy < 0) {
      p.split = true;
      for (let k = 0; k < 7; k++) fireProj({ owner: 'player', kind: 'bomblet', x: p.x, y: p.y, vx: p.vx * 0.6 + (k - 3) * 2.6, vy: 2 + Math.random() * 3, g: 12, dmg: p.dmg, splash: p.splash, size: 1 });
      fx.explosion(p.x, p.y, 0.5, { debris: 0 });
      sfx.explosion(0.5, 0, 0.6);
      remove(i); continue;
    }
    if (G.special?.projectileHit?.(p)) { remove(i); continue; }
    let done = false;
    const gy = G.special?.projectileGround ? G.special.projectileGround(p.x,p.z||0) : P.vehicle === 'boat' ? world.waterY : ground(p.x);
    if (p.owner === 'player') {
      for (const e of G.enemies) {
        if (e.dead) continue;
        const [a, b, c, d] = enemyAABB(e);
        const mg = p.kind === 'bullet' ? 0.15 : 0.55;
        if (p.x > a - mg && p.x < c + mg && p.y > b - 0.3 && p.y < d + mg && (!G.special?.depthCombat || Math.abs((p.z||0)-(e.z||0)) < (e.kind === 'soldier' ? 1.4 : 3.5))) {
          if (p.splash > 0) explode(p.x, p.y, p.splash, p.dmg, 'player', {z:p.z||0});
          else { damageEnemy(e, p.dmg, Math.sign(p.vx)); fx.spawn({ tex: 'spark', x: p.x, y: p.y, vx: -p.vx * 0.05, vy: 3, life: 0.2, size0: 0.6, size1: 0.1 }); if (e.kind !== 'soldier') sfx.ping(); }
          done = true; break;
        }
      }
    } else if (!done) {
      if (p.x > P.x - 3.7 && p.x < P.x + 3.7 && p.y > P.y && p.y < P.y + (P.vehicle === 'soldier' ? 1.92 : 2.9) && (!G.special?.depthCombat || Math.abs((p.z||0)-(P.z||0)) < (P.vehicle === 'soldier' ? 1 : 3))) {
        if (p.splash > 0) explode(p.x, p.y, p.splash, p.dmg, 'enemy', {z:p.z||0});
        else { damagePlayer(p.dmg); fx.spawn({ tex: 'spark', x: p.x, y: p.y, vx: -p.vx * 0.04, vy: 2, life: 0.15, size0: 0.5, size1: 0.1 }); if (Math.random() < 0.3) sfx.ping(); }
        done = true;
      }
    }
    if (!done && p.y < gy) {
      if (p.splash > 0) explode(p.x, gy, p.splash, p.dmg, p.owner, {z:p.z||0});
      else fx.dustPuff(p.x, gy, world.biome.track, 0.5);
      done = true;
    }
    if (!done && (p.life <= 0 || Math.abs(p.x - P.x) > 140)) done = true;
    if (done) remove(i);
  }
  function remove(i) { scene.remove(G.proj[i].mesh); G.proj.splice(i, 1); }
}

// ============================================================ PLAYER DAMAGE / XP
function damagePlayer(d) {
  if (P.disabled > 0 || G.state !== 'play') return;
  const st = stats();
  P.hp -= d * (1 - st.armor);
  P.hitT = 0;
  hud.hitFlash = 0.25;
  if (P.hp <= 0 && G.special) { P.hp = 1; return; }
  if (P.hp <= 0) {
    P.hp = 0; P.disabled = 4;
    toast('الدبابة متضررة! جاري الإصلاح التلقائي…', 'warn');
    fx.explosion(P.x, P.y + 2, 1.2, { debris: 4 });
    sfx.explosion(1.5);
  }
}

function addXP(n) {
  S.xp += n; G.xpGained += n;
  let leveled = false;
  while (S.xp >= xpNeed(S.plv)) { S.xp -= xpNeed(S.plv); S.plv++; leveled = true; }
  if (leveled) {
    const st = stats();
    const prevFam = Math.floor(tank.tier / 5);
    P.hp = st.maxHp;
    tank.setTier(st.tier);
    if (P.vehicle !== 'tank' && !G.special) refreshVehicle();
    sfx.levelUp();
    if (P.vehicle !== 'tank') toast(`تطورت ${vehicleName()} — مستوى ${S.plv} · درع وتسليح أقوى`, 'gold');
    else if (Math.floor(st.tier / 5) > prevFam) toast(`دبابة جديدة! ${TANK_FAMILIES[Math.floor(st.tier / 5)].name} — مستوى ${S.plv}`, 'gold');
    else if (st.tier < 25) toast(`تطوّرت الدبابة إلى مستوى ${S.plv} — تجهيزات جديدة على الدبابة`, 'gold');
    else toast(`تطوّرت الدبابة إلى مستوى ${S.plv} — ضرر +9٪ ودرع أقوى`, 'gold');
    for (let i = 0; i < 24; i++) fx.spawn({ tex: 'spark', x: P.x + (Math.random() - 0.5) * 7, y: P.y + Math.random() * 3, vy: 3 + Math.random() * 4, life: 1, size0: 0.6, size1: 0.1, color: '#ffd76a' });
    save();
  }
}

// ============================================================ CRATES
function spawnCrate(x, kind) {
  const c = buildCrate(kind);
  c.root.position.set(x, ground(x), 0);
  scene.add(c.root);
  G.crates.push({ x, kind, c, t: Math.random() * 6, vy: 0, y: lootHeight(x) + 3 });
}

function collectCrate(cr) {
  sfx.pickup();
  const st = stats();
  if (cr.kind === 'weapon') {
    const idx = S.unlocked.findIndex(u => !u);
    if (idx >= 0) {
      S.unlocked[idx] = true; S.ammo[idx] = WEAPONS[idx].maxAmmo;
      P.wi = idx;
      toast(`سلاح جديد: ${WEAPONS[idx].name} — اضغط ${idx + 1} للتبديل`, 'gold');
    } else { addXP(80); refillAmmo(); toast('معدات تطوير! +80 XP وذخيرة كاملة', 'gold'); }
  } else if (cr.kind === 'ammo') { refillAmmo(0.5); toast('ذخيرة إضافية', 'ok'); }
  else if (cr.kind === 'repair') { P.hp = Math.min(st.maxHp, P.hp + st.maxHp * 0.4); toast('تصليح +40٪', 'ok'); }
  else if (cr.kind === 'parts') { const n = 50 + S.level * 12; addXP(n); toast(`قطع تطوير من الحطام +${n} XP`, 'blue'); }
  floater(cr.x, ground(cr.x) + 3, { weapon: 'سلاح!', ammo: 'ذخيرة', repair: 'تصليح', parts: 'قطع' }[cr.kind], '#9ff09a');
  save();
}
function refillAmmo(frac = 1) {
  WEAPONS.forEach((w, i) => { if (S.unlocked[i] && w.maxAmmo) S.ammo[i] = Math.min(w.maxAmmo, S.ammo[i] + Math.ceil(w.maxAmmo * frac)); });
}

// ============================================================ FRIENDS (escort)
const SEATS = [[-2.7, 1.8, 0.75], [-2.7, 1.8, -0.75], [-1.7, 1.78, 1.45], [-1.7, 1.78, -1.45]];
function spawnFriend(x) {
  const types = ['rifleman', 'officer', 'grenadier', 'mg'];
  const m = buildSoldier(types[G.friends.length % types.length], 'desert', 500 + G.friends.length * 7, true, { tier: Math.min(4, Math.floor((S.level - 1) / 4)), drone: false });
  m.root.position.set(x, ground(x), 0.8);
  m.body.rotation.y = Math.PI * 0.75;
  scene.add(m.root);
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex('#5dff8a', 'عراقي'), depthTest: false, transparent: true }));
  marker.scale.set(1.6, 2, 1); marker.position.set(x, ground(x) + 3.6, 0.8); marker.renderOrder = 20;
  scene.add(marker);
  const f = { x, m, marker, state: 'wait', t: Math.random() * 5, seat: -1, idx: G.friends.length };
  G.friends.push(f);
  return f;
}

function boardFriend(f) {
  f.state = 'ride';
  const used = new Set(G.friends.filter(o => o.state === 'ride' && o !== f).map(o => o.seat));
  f.seat = SEATS.findIndex((_, i) => !used.has(i));
  if (f.seat < 0) f.seat = 0;
  (G.special?.carrierBody?.() || (P.vehicle === 'heli' ? flight?.body : P.vehicle === 'boat' ? vessel?.body : tank.body)).add(f.m.root);
  const s = SEATS[f.seat];
  f.m.root.position.set(s[0], P.vehicle==='heli'?0:s[1], s[2]);
  f.m.armL.rotation.z=f.m.armR.rotation.z=1.25;
  f.m.root.rotation.set(0, 0, 0);
  f.m.body.rotation.y = 0;
  f.m.legL.rotation.z = 1.45; f.m.legR.rotation.z = 1.45; f.m.pose(true);
  f.m.body.position.y = -0.85;
  sfx.pickup();
  toast(`صعد الجندي العراقي إلى ${vehicleName()} 🫡`, 'ok');
}

function dropFriend(f, x) {
  f.state = 'done';
  scene.add(f.m.root);
  f.m.root.position.set(P.x - P.facing * 2, ground(P.x), 2.2);
  f.m.body.position.y = 0; f.m.legL.rotation.z = 0; f.m.legR.rotation.z = 0; f.m.pose();
  f.target = x + 1.5;
  f.marker.visible = false;
}

function updateFriends(dt) {
  for (const f of G.friends) {
    f.t += dt;
    if (f.state === 'wait') {
      const y = ground(f.x);
      f.m.root.position.y = y;
      f.marker.position.set(f.x, y + 3.5 + Math.sin(f.t * 4) * 0.2, 0.8);
      const near = Math.abs(P.x - f.x) < 18;
      f.m.armL.rotation.z = near ? 2.8 + Math.sin(f.t * 10) * 0.4 : 1.25;
      f.m.body.rotation.y = near ? (P.x > f.x ? 0 : Math.PI) : Math.PI * 0.75;
      if ((f.optional || G.mission?.canBoard(f)) && Math.abs(P.x-f.x)<6 && P.disabled<=0) {
        if(P.vehicle==='heli')winch.start('friend',f,f.m.root,()=>boardFriend(f));
        else if(!f.optional)boardFriend(f);
      }
    } else if(f.state==='hoist'){f.m.armL.rotation.z=2.8;f.m.armR.rotation.z=2.8;f.m.legL.rotation.z=f.m.legR.rotation.z=0;f.m.pose();
    } else if (f.state === 'ride') {
      f.marker.visible = false;
      f.m.armL.rotation.z = 1.25 + Math.sin(f.t * 3) * 0.05;
      f.m.head.rotation.y = Math.sin(f.t * 0.7) * 0.5;
    } else if (f.state === 'done') {
      const x = f.m.root.position.x;
      const dx = f.target - x;
      if (Math.abs(dx) > 0.2) {
        const nx = x + Math.sign(dx) * 2.4 * dt;
        f.m.root.position.x = nx; f.m.root.position.y = ground(nx);
        f.m.body.rotation.y = dx > 0 ? 0 : Math.PI;
        f.m.legL.rotation.z = Math.sin(f.t * 9) * 0.6; f.m.legR.rotation.z = -Math.sin(f.t * 9) * 0.6; f.m.pose();
      } else {
        f.m.legL.rotation.z = 0; f.m.legR.rotation.z = 0; f.m.pose();
        f.m.body.rotation.y = -Math.PI / 2 + 0.6; // face camera-ish & salute
        f.m.armR.rotation.z = 2.7; f.m.armR.rotation.x = -0.4;
      }
    }
  }
}

// ============================================================ MISSIONS
class Mission {
  constructor(L) {
    this.L = L;
    const r = rng(L * 7919 + 17);
    this.r = r;
    const length = Math.min(320 + L * 45, 1050);
    this.length = length;
    this.objs = [];
    this.idx = 0;
    this.lootPlan = [];
    const pool = ['escort', 'relay', 'convoy', 'assault', 'multi', 'defend'];
    let kinds;
    if (L === 1) kinds = ['reach'];
    else if (L === 2) kinds = ['escort'];
    else if (L === 3) kinds = ['relay'];
    else if (L === 4) kinds = ['assault'];
    else if (L === 5) kinds = ['multi'];
    else if (L === 6) kinds = ['convoy'];
    else if (L === 7) kinds = ['defend'];
    else {
      const n = L >= 14 ? 3 : 2;
      kinds = [];
      for (let i = 0; i < n; i++) kinds.push(pool[Math.floor(r() * pool.length)]);
    }
    if (P.vehicle !== 'tank') {
      const operations = P.vehicle==='heli'?['assault','escort','defend']:['assault', 'convoy', 'defend'];
      kinds = [operations[(L - 1) % 3], operations[L % 3]];
      if (L >= 14) kinds.push(operations[(L + 1) % 3]);
    }
    this.kinds = kinds;
    const seg = (length - 40) / kinds.length;
    kinds.forEach((k, i) => this.build(k, 30 + i * seg, 30 + (i + 1) * seg));
    this.objs.push({ type: 'reach', x: length, label: 'تقدّم وارفع العلم العراقي بنهاية المنطقة' });
  }
  build(kind, s0, s1) {
    const w = s1 - s0, L = this.L;
    const f = (x) => ({ x, i: null });
    if (kind === 'escort') {
      const a = f(s0 + w * 0.15);
      this.objs.push({ type: 'pickup', f: a, label: 'التقط الجندي العراقي' });
      this.objs.push({ type: 'deliver', f: a, x: s1 - w * 0.05, label: 'أوصل الجندي العراقي إلى نقطة التسليم' });
    } else if (kind === 'relay') {
      const a = f(s0 + w * 0.12), c = s0 + w * 0.5, b = f(c + 4);
      this.objs.push({ type: 'pickup', f: a, label: 'التقط الجندي الأول' });
      this.objs.push({ type: 'deliver', f: a, x: c, label: 'سلّم الجندي الأول لنقطة التبديل' });
      this.objs.push({ type: 'pickup', f: b, label: 'استلم الجندي الثاني من نقطة التبديل' });
      this.objs.push({ type: 'deliver', f: b, x: s1 - w * 0.04, label: 'أوصل الجندي الثاني للنقطة الأخيرة' });
    } else if (kind === 'multi') {
      const n = L >= 10 ? 3 : 2 + (this.r() < 0.5 ? 1 : 0);
      const fs = [];
      for (let i = 0; i < n; i++) { const a = f(s0 + w * (0.08 + i * 0.07)); fs.push(a); this.objs.push({ type: 'pickup', f: a, label: `التقط الجندي ${['الأول', 'الثاني', 'الثالث'][i]} (${i + 1}/${n})` }); }
      fs.forEach((a, i) => this.objs.push({ type: 'deliver', f: a, x: s0 + w * (0.45 + (0.53 * (i + 1)) / n) - 2, label: `أوصل الجندي ${['الأول', 'الثاني', 'الثالث'][i]} لنقطته` }));
    } else if (kind === 'assault') {
      const n = 8 + Math.floor(L * 1.2);
      this.objs.push({ type: 'kill', n, label: `اقضِ على ${n} من الأعداء`, startX: s0 });
    } else if (kind === 'convoy') {
      const n = Math.min(6, 2 + Math.floor(L / 4));
      this.objs.push({ type: 'reach', x: s0 + w * 0.25, label: 'تقدّم لاعتراض قافلة العدو' });
      this.objs.push({ type: 'convoy', n, label: `دمّر قافلة العدو (${n} آليات)` });
    } else if (kind === 'defend') {
      const x = s0 + w * 0.5;
      this.objs.push({ type: 'reach', x: x, label: 'تحرّك إلى الموقع المطلوب حمايته' });
      this.objs.push({ type: 'defend', x, t: 25 + Math.min(35, L * 2), label: 'احمِ الموقع حتى انتهاء الوقت' });
    }
    // loot wreck in every segment
    this.lootPlan.push(s0 + w * (0.3 + this.r() * 0.4));
  }
  setup() {
    // friends & flags
    for (const o of this.objs) {
      if (o.type === 'pickup' && !o.f.obj) o.f.obj = spawnFriend(o.f.x);
      if (o.type === 'deliver') {
        o.flag = buildFlag('#2e7d32', '✚', 6);
        o.flag.root.position.set(o.x, lootHeight(o.x), -1.2);
        scene.add(o.flag.root); G.flags.push(o.flag); o.flag.root.visible = false;
      }
      if (o.type === 'defend') {
        o.flag = buildFlag('#ce1126', '', 7, { tex: iraqFlagTexture() });
        o.flag.root.position.set(o.x, lootHeight(o.x), -1.5);
        scene.add(o.flag.root); G.flags.push(o.flag);
        const sb = buildProp('sandbags', Math.random, world.biome); sb.position.set(o.x - 6, ground(o.x - 6), -2.5); scene.add(sb); G.extra.push(sb);
        const sb2 = buildProp('sandbags', Math.random, world.biome); sb2.position.set(o.x + 4, ground(o.x + 4), -2.5); scene.add(sb2); G.extra.push(sb2);
      }
    }
    const end = buildFlag('#c9a84c', '', 8, { tex: iraqFlagTexture() });
    end.root.position.set(this.length, lootHeight(this.length), -1.5);
    scene.add(end.root); G.flags.push(end); this.endFlag = end;
    this.begin();
  }
  get cur() { return this.objs[this.idx]; }
  canBoard(friend) {
    // allowed if the friend's pickup objective is current or still ahead (but not before an earlier deliver of the same friend…)
    const o = this.cur;
    return o && o.type === 'pickup' && o.f.obj === friend;
  }
  begin() {
    const o = this.cur; if (!o) return;
    o.killBase = G.levelKills;
    if (o.type === 'deliver' && o.flag) o.flag.root.visible = true;
    if (o.type === 'convoy') {
      o.convoy = [];
      const kinds = ['jeep', 'truck', 'apc', 'tank', 'jeep', 'apc'];
      for (let i = 0; i < o.n; i++) {
        const k = S.level < 7 && kinds[i] === 'tank' ? 'apc' : kinds[i % kinds.length];
        const e = spawnVehicle(k, P.x + 38 + i * 11);
        e.convoy = true; o.convoy.push(e);
      }
      toast('رُصدت قافلة معادية تتقدم!', 'warn');
    }
    if (o.type === 'defend') { o.left = o.t; o.waveT = 2; }
    if (o.type === 'kill') o.spawnT = 0;
    hud.objPulse = 1;
  }
  onKill(e) { /* counted via G.levelKills */ }
  update(dt) {
    const o = this.cur; if (!o) return;
    let done = false;
    if (o.type === 'reach') done = P.x >= o.x - 3;
    else if (o.type === 'pickup') done = o.f.obj.state === 'ride';
    else if (o.type === 'deliver') {
      o.flag.wave(G.t);
      if (o.f.obj.state === 'ride' && Math.abs(P.x - o.x) < 4.5) { dropFriend(o.f.obj, o.x); done = true; toast('تم تسليم الجندي العراقي بنجاح ✔', 'ok'); }
    } else if (o.type === 'kill') {
      o.prog = G.levelKills - o.killBase;
      done = o.prog >= o.n;
      o.spawnT -= dt;
      const alive = G.enemies.filter(e => !e.dead).length;
      if (!done && alive < 4 && o.spawnT <= 0) {
        o.spawnT = 3;
        const k = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < k; i++) spawnSoldier(P.x + (Math.random() < 0.75 ? 30 + i * 2.5 : -28 - i * 2), soldierTypeFor(S.level, Math.random), false);
      }
    } else if (o.type === 'convoy') {
      o.prog = o.convoy.filter(e => e.dead).length;
      done = o.prog >= o.n;
    } else if (o.type === 'defend') {
      o.flag.wave(G.t);
      const inside = Math.abs(P.x - o.x) < 12;
      if (inside) o.left -= dt;
      o.waveT -= dt;
      if (o.waveT <= 0) {
        o.waveT = Math.max(3.5, 7 - S.level * 0.15);
        const side = Math.random() < 0.6 ? 1 : -1;
        const k = 2 + Math.floor(Math.random() * Math.min(4, 1 + S.level / 3));
        for (let i = 0; i < k; i++) spawnSoldier(o.x + side * (30 + i * 2.2), soldierTypeFor(S.level, Math.random));
        if (S.level >= 5 && Math.random() < 0.25) spawnVehicle(Math.random() < 0.5 ? 'jeep' : 'apc', o.x + 40);
      }
      done = o.left <= 0;
    }
    if (done) {
      if (o.flag && o.type !== 'deliver') o.flag.root.visible = false;
      this.idx++;
      addXP(25 + S.level * 5);
      if (this.idx >= this.objs.length) { levelComplete(); return; }
      sfx.mission();
      toast('✔ ' + o.label, 'ok');
      this.begin();
    }
    this.endFlag.wave(G.t);
  }
  targetX() {
    const o = this.cur; if (!o) return null;
    if (o.type === 'reach' || o.type === 'deliver' || o.type === 'defend') return o.x;
    if (o.type === 'pickup') return o.f.obj.x;
    if (o.type === 'convoy') { const e = o.convoy.find(v => !v.dead); return e ? e.x : null; }
    return null;
  }
  text() {
    const o = this.cur; if (!o) return '';
    let s = o.label;
    if (o.type === 'kill') s += ` <b>${Math.min(o.prog || 0, o.n)}/${o.n}</b>`;
    if (o.type === 'convoy') s += ` <b>${o.prog || 0}/${o.n}</b>`;
    if (o.type === 'defend') s += ` <b>${Math.ceil(Math.max(0, o.left))} ث</b>` + (Math.abs(P.x - o.x) >= 12 ? ' <i>(ادخل المنطقة)</i>' : '');
    const tx = this.targetX();
    if (tx != null) { const d = Math.round(tx - P.x); if (Math.abs(d) > 6) s += `<span class="dist">${d > 0 ? '▶' : '◀'} ${Math.abs(d)} م</span>`; }
    return s;
  }
}

// ============================================================ LEVEL BUILD
const CombinedMission = makeCombinedMission(Mission, { scene, camera, G, P, world, tank, ground, stats, toast, refreshVehicle, addXP, getFlight: () => flight, winch, fx, sfx, spawnFriend });

function clearLevel() {
  winch.cancel();
  for (const e of G.enemies) scene.remove(e.m.root);
  for (const p of G.proj) scene.remove(p.mesh);
  for (const c of G.crates) scene.remove(c.c.root);
  for (const f of G.friends) { f.m.root.parent && f.m.root.parent.remove(f.m.root); scene.remove(f.marker); }
  for (const fl of G.flags) scene.remove(fl.root);
  for (const x of G.extra || []) scene.remove(x);
  for (const b of G.beams || []) scene.remove(b.mesh);
  G.enemies = []; G.proj = []; G.crates = []; G.friends = []; G.flags = []; G.extra = []; G.beams = []; G.spawns = [];
  fx.clear();
}

function buildLevel(L) {
  clearLevel();
  const combinedMode = (secretStage ? secretStage.mode : S.mode) === 'combined';
  P.vehicle = combinedMode ? 'tank' : vehicleFor(secretStage ? secretStage.mode : S.mode, L);
  const mission = combinedMode ? new CombinedMission(L) : new Mission(L);
  G.length = mission.length;
  let { biome, time, region } = levelEnv(L);
  if (secretStage) {
    biome = BIOMES[secretStage.biome]; time = TIMES[secretStage.time];
    region = { ...region, name: secretStage.name, base: secretStage.biome, time: secretStage.time, features: [] };
  }
  const override = { biome, time, region, ...(combinedMode ? {cross:mission.combined.cross,flatZones:[[mission.combined.pad-15,mission.combined.pad+15],[mission.combined.dock-22,mission.combined.dock+2]]} : P.vehicle === 'boat' ? { cross: [-200, mission.length + 200], sea: true } : {}) };
  world.build(L, mission.length, L * 131 + 7 + (secretStage ? 9001 : 0), override);
  refreshVehicle();
  G.region = region;
  G.biome = biome; G.time = time;
  renderer.toneMappingExposure = time.exposure;
  headL.intensity = time.night ? 160 : 0;
  // player
  const st = stats();
  P.x = 8; P.vx = 0; P.facing = 1; P.hp = st.maxHp; P.disabled = 0; P.burst = []; P.aim = P.vehicle === 'heli' ? -0.18 : 0.08; P.alt = 7; P.cd.fill(0);
  tank.setTier(st.tier);
  tank.root.position.set(P.x, ground(P.x), 0);
  if (!S.unlocked[P.wi]) P.wi = 0;
  G.camX = P.x + 8; G.camY = ground(P.x) + 5;
  G.levelKills = 0; G.vehicleKills = 0; G.levelTime = 0; G.xpGained = 0; G.reinforceT = 25;
  G.mission = mission;
  mission.setup();
  // enemy spawn plan
  const r = rng(L * 977 + 3);
  const spawns = [];
  for (let x = 42; x < mission.length - 12; x += Math.max(14, 30 - L * 0.8) + r() * 18) {
    const n = 1 + Math.floor(r() * Math.min(6, 1.5 + L * 0.55));
    spawns.push({ x, soldiers: Array.from({ length: n }, () => soldierTypeFor(L, r)) });
    if (L >= 3 && r() < 0.1 + L * 0.025) spawns.push({ x: x + 8, vehicle: 'jeep' });
    if (L >= 5 && r() < 0.06 + L * 0.015) spawns.push({ x: x + 10, vehicle: 'truck' });
    if (L >= 6 && r() < 0.05 + L * 0.015) spawns.push({ x: x + 12, vehicle: 'apc' });
    if (L >= 8 && r() < 0.04 + L * 0.012) spawns.push({ x: x + 14, vehicle: 'tank' });
    if (L >= 9 && r() < 0.03 + L * 0.01) spawns.push({ x: x + 6, vehicle: 'heli' });
  }
  G.spawns = spawns;
  // loot: wrecks with gear + ground crates
  const firstLocked = S.unlocked.findIndex(u => !u);
  mission.lootPlan.forEach((x, i) => {
    const w = buildProp('wreck', r, biome);
    w.position.set(x, ground(x), -3.4); w.rotation.y = r() * 0.6 - 0.3;
    scene.add(w); G.extra.push(w);
    G.wrecks.push({ x, smokeT: 0 });
    spawnCrate(x + 1.5, i === 0 && firstLocked >= 0 ? 'weapon' : (r() < 0.5 ? 'parts' : 'ammo'));
  });
  for (let x = 60; x < mission.length; x += 70 + r() * 60) spawnCrate(x, ['ammo', 'repair', 'parts'][Math.floor(r() * 3)]);
  hud.setLevel(L, region, time);
  toast(`${vehicleName()} · اجمع الصحة والأسلحة وقطع التطوير بالمرور عليها`, 'blue');
}

function levelComplete() {
  G.state = 'complete';
  sfx.mission();
  const bonus = 100 + S.level * 25;
  addXP(bonus);
  const prev = S.level;
  if (!secretStage) S.level++;
  save();
  $('cmp-title').textContent = `تحرّرت ${G.region ? G.region.name : 'المنطقة'}!`;
  $('cmp-sub').textContent = `المرحلة ${prev} · محافظة ${G.region ? G.region.gov : ''} — عاش العراق`;
  $('cmp-stats').innerHTML = `
    <div><span>الأعداء المقضى عليهم</span><b>${G.levelKills}</b></div>
    <div><span>الآليات المدمرة</span><b>${G.vehicleKills}</b></div>
    <div><span>الوقت</span><b>${Math.floor(G.levelTime / 60)}:${String(Math.floor(G.levelTime % 60)).padStart(2, '0')}</b></div>
    <div><span>الخبرة المكتسبة</span><b>+${G.xpGained}</b></div>
    <div><span>مستوى الدبابة</span><b>${S.plv}</b></div>`;
  const next = levelEnv(S.level);
  $('cmp-next').textContent = `المرحلة ${S.level}: ${next.region.name} (محافظة ${next.region.gov}) — ${next.time.name}`;
  if (secretStage) { $('cmp-title').textContent = `اكتملت: ${secretStage.name}`; $('cmp-next').textContent = 'تم حفظ ترقياتك. ارجع للحملة أو أدخل رقم مرحلة سرية أخرى.'; }
  $('btn-next').textContent = secretStage ? 'العودة إلى الحملة' : 'المرحلة التالية ⟵';
  show('complete');
}

// ============================================================ ENEMY AI
function updateEnemies(dt) {
  const alive = G.enemies.filter(e => !e.dead).length;
  // planned spawns
  for (let i = G.spawns.length - 1; i >= 0; i--) {
    const s = G.spawns[i];
    if (P.x > s.x - 46 && alive < Math.min(36, 14 + S.level) && !G.ceasefire) {
      const x = Math.max(s.x, P.x + 27);
      if (s.vehicle) spawnVehicle(s.vehicle, x + 6);
      else s.soldiers.forEach((t, k) => spawnSoldier(x + k * 2.2 + Math.random(), t));
      G.spawns.splice(i, 1);
    }
  }
  // reinforcements from behind
  if (!G.special && S.level >= 4 && alive < Math.min(24, 6 + S.level * 0.5)) {
    G.reinforceT -= dt;
    if (G.reinforceT <= 0) {
      G.reinforceT = Math.max(12, 30 - S.level);
      if (P.x > 60) for (let k = 0; k < 1 + Math.floor(S.level / 6); k++) spawnSoldier(P.x - 26 - k * 2, soldierTypeFor(S.level, Math.random), true);
    }
  }

  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { updateDead(e, dt); if (e.remove) { scene.remove(e.m.root); G.enemies.splice(i, 1); } continue; }
    if (G.ceasefire) { if (e.kind === 'soldier') { e.m.legL.rotation.z = 0; e.m.legR.rotation.z = 0; e.m.pose(); } else if (e.kind === 'heli') e.m.rotor.rotation.y += dt * 30; }
    else if (e.kind === 'soldier') updateSoldier(e, dt);
    else if (e.kind === 'heli') updateHeli(e, dt);
    else if (e.kind === 'gunboat' || e.kind === 'ship') updateBoatEnemy(e, dt);
    else updateVehicle(e, dt);
    // hit flash
    if (e.flash > 0) e.flash -= dt;
    // despawn if far behind
    if (!e.convoy && (e.x < P.x - 90 || e.x > P.x + 160)) { scene.remove(e.m.root); G.enemies.splice(i, 1); }
  }
}

function enemyShoot(e, kind, from, dmgBase) {
  const tx = P.x + (Math.random() - 0.5) * 3, ty = P.y + 1.4 + Math.random() * 1.2;
  const dx = tx - from.x, dy = ty - from.y;
  const dmg = dmgBase * (1 + 0.04 * (S.level - 1));
  const pan = (from.x - P.x) / 30;
  if (kind === 'bullet' || kind === 'snipe') {
    const sp = kind === 'snipe' ? 90 : 55;
    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * (kind === 'snipe' ? 0.01 : 0.06);
    fireProj({ owner: 'enemy', kind: 'bullet', x: from.x, y: from.y, z: e.z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.5, dmg, splash: 0 });
    fx.muzzle(from.x, from.y, Math.sign(dx), 0, 0.25);
    sfx.enemyShot(pan, 'bullet');
  } else if (kind === 'rocket') {
    const sp = 26;
    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.05;
    fireProj({ owner: 'enemy', kind: 'rocket', x: from.x, y: from.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1.5, dmg, splash: 2.2 });
    fx.muzzle(from.x, from.y, Math.sign(dx), 0, 0.5);
    for (let k = 0; k < 6; k++) fx.spawn({ tex: 'smoke', additive: false, x: from.x - Math.sign(dx) * 1, y: from.y, vx: -Math.sign(dx) * 4, vy: 0.5, life: 1, size0: 0.6, size1: 2, alpha: 0.5, color: '#ccc' });
    sfx.enemyShot(pan, 'rocket');
  } else if (kind === 'grenade' || kind === 'shell' || kind === 'autocannon') {
    const v = kind === 'grenade' ? 15 : kind === 'shell' ? 42 : 48;
    const g = kind === 'grenade' ? 12 : 9.8;
    const ang = ballistic(Math.abs(dx), dy, v, g);
    const s = Math.sign(dx);
    fireProj({ owner: 'enemy', kind: kind === 'grenade' ? 'grenade' : 'shell', x: from.x, y: from.y, vx: s * v * Math.cos(ang), vy: v * Math.sin(ang), g, dmg, splash: kind === 'shell' ? 3 : kind === 'grenade' ? 2.6 : 1.5, size: kind === 'autocannon' ? 0.5 : 1 });
    if (kind !== 'grenade') { fx.muzzle(from.x, from.y, s, Math.sin(ang), kind === 'shell' ? 1 : 0.4); sfx.enemyShot(pan, kind === 'shell' ? 'shell' : 'bullet'); }
  }
}

function ballistic(dx, dy, v, g) {
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
  if (disc < 0) return Math.PI / 4;
  return Math.atan((v2 - Math.sqrt(disc)) / (g * Math.max(0.1, dx)));
}

function updateSoldier(e, dt) {
  const T = SOLDIER_TYPES[e.type];
  const dx = P.x - e.x;
  const dist = Math.abs(dx);
  e.facing = Math.sign(dx) || -1;
  let moving = 0;
  if (dist > e.pref + 1.5) moving = e.facing;
  else if (dist < e.pref - 4 && e.type !== 'grenadier') moving = -e.facing * 0.6;
  const speed = T.speed * (1 + S.level * 0.02);
  e.x += moving * speed * dt;
  if (world.inRiver && world.inRiver(e.x)) e.x -= moving * speed * dt;
  e.y = ground(e.x);
  // crushed by tank
  if (P.vehicle === 'tank' && dist < 3.4 && Math.abs(P.vx) > 1.5 && P.disabled <= 0) { damageEnemy(e, 9999, Math.sign(P.vx), true); G.shake = Math.max(G.shake, 0.15); return; }
  e.walkT += dt * (moving ? 9 : 0);
  const sw = moving ? Math.sin(e.walkT) * 0.65 : 0;
  e.m.legL.rotation.z = sw; e.m.legR.rotation.z = -sw; e.m.pose();
  e.m.root.position.set(e.x, e.y + (moving ? Math.abs(Math.cos(e.walkT)) * 0.06 : 0), e.z);
  e.m.body.rotation.y = e.facing > 0 ? 0 : Math.PI;
  // shooting
  e.cd -= dt;
  const inRange = dist < (RANGE[e.type][1] + 3) && dist < 32;
  if (e.type === 'sniper' || e.type === 'officer') e.m.body.rotation.z = 0;
  if (inRange && e.cd <= 0 && P.disabled <= 0) {
    e.m.root.updateMatrixWorld(true);
    e.m.muzzle.getWorldPosition(_v1);
    const from = { x: _v1.x, y: _v1.y };
    if (T.burst) {
      enemyShoot(e, T.proj, from, T.dmg);
      e.burst++;
      if (e.burst >= T.burst) { e.burst = 0; e.cd = T.burstPause * (0.8 + Math.random() * 0.4); }
      else e.cd = T.fire;
    } else {
      if (T.proj === 'grenade') {
        e.m.armR.rotation.z = 3; e.throwT = 0.3;
        enemyShoot(e, 'grenade', { x: e.x + e.facing * 0.3, y: e.y + 2 }, T.dmg);
      } else enemyShoot(e, T.proj, from, T.dmg);
      e.cd = T.fire * (0.7 + Math.random() * 0.6);
      if (T.proj === 'rocket' && e.m.weapon.userData.rpgWarhead) { e.reloadVis = 2.5; e.m.weapon.userData.rpgWarhead.forEach(w => w.visible = false); }
    }
  }
  if (e.throwT > 0) { e.throwT -= dt; if (e.throwT <= 0) e.m.armR.rotation.z = 0.95; }
  if (e.reloadVis > 0) { e.reloadVis -= dt; if (e.reloadVis <= 0) e.m.weapon.userData.rpgWarhead.forEach(w => w.visible = true); }
  // hit flash: scale pulse
  e.m.body.scale.setScalar(e.flash > 0 ? 1.06 : 1);
}

function updateVehicle(e, dt) {
  const dx = P.x - e.x, dist = Math.abs(dx);
  const want = Math.sign(dx) || -1;
  let move = 0;
  if (e.kind === 'truck' && e.unloaded) {
    move = 0; // parked after unloading troops
  } else if (dist > e.pref + 1) move = want;
  else if (dist < e.pref - 6) move = -want * 0.5;
  e.vx = lerp(e.vx, move * e.speed, dt * 1.5);
  e.x += e.vx * dt;
  // don't drive through player
  if (world.inRiver && world.inRiver(e.x)) { e.x -= e.vx * dt; e.vx = 0; }
  if (P.vehicle === 'tank' && Math.abs(P.x - e.x) < (e.w / 2 + 3.6)) { e.x = P.x - Math.sign(dx) * (e.w / 2 + 3.6); e.vx = 0; }
  e.y = ground(e.x);
  e.facing = want;
  const sl = slopeAt(e.x, e.w * 0.35);
  e.m.root.position.set(e.x, e.y, e.z);
  e.m.root.rotation.z = sl;
  if (e.m.tank) { e.m.tank.setFacing(want); e.m.tank.spinWheels(e.vx * dt * want); }
  else { e.m.body.rotation.y = want > 0 ? 0 : Math.PI; for (const w of e.m.wheels) w.rotation.z -= e.vx * want * dt / 0.5; }
  if (Math.abs(e.vx) > 1 && Math.random() < dt * 8) fx.dustPuff(e.x - want * e.w / 2, e.y, world.biome.track, 1, -e.vx * 0.3);
  // weapons
  e.cd -= dt;
  if (e.kind === 'truck') {
    if (!e.unloaded && dist < e.pref + 3) {
      e.unloaded = true;
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) { const s = spawnSoldier(e.x - want * (3.5 + k * 1.2), soldierTypeFor(S.level, Math.random)); s.z = 1; }
      toast('شاحنة العدو أنزلت جنوداً!', 'warn');
    }
    return;
  }
  if (e.gunPivot || (e.m.gunPivot)) {
    // aim gun toward player
    e.m.root.updateMatrixWorld(true);
    e.m.muzzle.getWorldPosition(_v1);
    const tdx = Math.abs(P.x - _v1.x), tdy = (P.y + 1.5) - _v1.y;
    let a;
    if (e.kind === 'tank') a = ballistic(tdx, tdy, 42, 9.8);
    else a = Math.atan2(tdy, tdx);
    e.aim = lerp(e.aim || 0, clamp(a - sl * want, -0.15, 0.6), dt * 3);
    e.m.gunPivot.rotation.z = e.aim;
  }
  if (dist < 34 && e.cd <= 0 && P.disabled <= 0) {
    e.m.muzzle.getWorldPosition(_v1);
    const from = { x: _v1.x, y: _v1.y };
    if (e.kind === 'jeep') {
      enemyShoot(e, 'bullet', from, 1.3); e.burst++;
      if (e.burst >= 10) { e.burst = 0; e.cd = 2.2; } else e.cd = 0.09;
    } else if (e.kind === 'apc') {
      enemyShoot(e, 'autocannon', from, 4.5); e.burst++;
      if (e.burst >= 3) { e.burst = 0; e.cd = 2.6; } else e.cd = 0.25;
    } else if (e.kind === 'tank') {
      enemyShoot(e, 'shell', from, 18);
      e.cd = 3.6 + Math.random() * 1.5;
      e.m.root.rotation.z += -want * 0.04;
    }
  }
}

function updateBoatEnemy(e, dt) {
  const dx = P.x - e.x, dist = Math.abs(dx), want = Math.sign(dx) || -1;
  let move = 0;
  if (dist > e.pref + 1) move = want; else if (dist < e.pref - 6) move = -want * 0.5;
  e.vx = lerp(e.vx, move * e.speed, dt * 1.2);
  e.x += e.vx * dt;
  if (world.cross) e.x = clamp(e.x, world.cross[0] + 5, world.cross[1] - 5);
  e.y = world.waterY - 0.55 + Math.sin(G.t * 2 + e.x) * 0.08;
  e.m.root.position.set(e.x, e.y, e.z);
  e.m.body.rotation.y = want > 0 ? 0 : Math.PI;
  e.m.root.rotation.z = Math.sin(G.t * 1.4 + e.x) * 0.03;
  if (e.m.root.userData.radar) e.m.root.userData.radar.rotation.y += dt * 3;
  if (Math.abs(e.vx) > 1 && Math.random() < dt * 20) fx.dustPuff(e.x - want * e.w / 2, world.waterY + 0.1, '#e9f4f6', e.kind === 'ship' ? 1.8 : 1, -e.vx * 0.4);
  e.m.root.updateMatrixWorld(true);
  e.m.muzzle.getWorldPosition(_v1);
  const tdx = Math.abs(P.x - _v1.x), tdy = (P.y + 1.4) - _v1.y;
  const a = e.kind === 'ship' ? ballistic(tdx, tdy, 42, 9.8) : Math.atan2(tdy, tdx);
  e.aim = lerp(e.aim || 0, clamp(a, -0.2, 0.7), dt * 3);
  e.m.gunPivot.rotation.z = e.aim;
  e.cd -= dt;
  if (dist < 36 && e.cd <= 0) {
    const from = { x: _v1.x, y: _v1.y };
    if (e.kind === 'gunboat') { enemyShoot(e, 'bullet', from, 1.3); e.burst++; if (e.burst >= 8) { e.burst = 0; e.cd = 2.2; } else e.cd = 0.1; }
    else { enemyShoot(e, 'shell', from, 16); e.cd = 3.4 + Math.random(); }
  }
}

function updateHeli(e, dt) {
  e.hover += dt;
  const side = e.x > P.x ? 1 : -1;
  const tx = P.x + side * (14 + Math.sin(e.hover * 0.4) * 6);
  e.x = lerp(e.x, tx, dt * 0.5);
  const gy = ground(e.x);
  e.y = gy + e.alt + Math.sin(e.hover * 1.3) * 0.8;
  e.facing = -side;
  e.m.root.position.set(e.x, e.y, -1);
  e.m.body.rotation.y = e.facing > 0 ? 0 : Math.PI;
  e.m.root.rotation.z = (tx - e.x) * -0.01 * e.facing;
  e.m.rotor.rotation.y += dt * 30;
  e.m.tailRotor.rotation.z += dt * 40;
  if (Math.random() < dt * 4) fx.dustPuff(e.x + (Math.random() - 0.5) * 8, gy, world.biome.track, 1.2, (Math.random() - 0.5) * 6);
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(P.x - e.x) < 34) {
    e.m.root.updateMatrixWorld(true); e.m.muzzle.getWorldPosition(_v1);
    enemyShoot(e, 'rocket', { x: _v1.x, y: _v1.y }, 13);
    e.burst++;
    if (e.burst >= 2) { e.burst = 0; e.cd = 3.5; } else e.cd = 0.35;
  }
}

function updateDead(e, dt) {
  e.deadT += dt;
  if (e.kind === 'soldier') {
    if (!e.landed) {
      e.vy -= 20 * dt; e.x += e.vx * dt;
      const gy = ground(e.x);
      let y = e.m.root.position.y + e.vy * dt;
      e.m.body.rotation.z += e.spin * dt;
      if (y <= gy && e.vy < 0) { y = gy; e.landed = true; e.m.body.rotation.z = (Math.sign(e.spin) || 1) * Math.PI / 2; e.m.body.position.y = 0.2; fx.dustPuff(e.x, gy, world.biome.track, 0.7); }
      e.m.root.position.set(e.x, y, e.z);
    } else if (e.deadT > 4) {
      e.m.root.position.y -= dt * 0.6;
      if (e.deadT > 6) e.remove = true;
    }
  } else {
    if (e.sinking) {
      e.m.root.position.y -= dt * 0.5; e.m.root.rotation.z += dt * 0.12 * (e.kind === 'ship' ? 1 : 2); e.y = e.m.root.position.y;
      if (e.deadT > 9) e.remove = true;
    }
    // burning wreck
    if (e.turretFly) {
      const t = e.turretFly;
      t.vy -= 18 * dt; t.obj.position.y += t.vy * dt; t.obj.position.x += t.vx * dt; t.obj.rotation.z += t.spin * dt;
      if (t.obj.position.y < -0.5 && t.vy < 0) { t.obj.position.y = -0.5; t.vy = 0; t.vx = 0; t.spin = 0; }
    }
    if (e.falling) {
      e.vy -= 15 * dt; e.y += e.vy * dt; e.m.root.rotation.z += dt * 2; e.m.rotor.rotation.y += dt * 8;
      const gy = ground(e.x);
      if (e.y < gy + 1) { e.y = gy + 1; e.falling = false; fx.explosion(e.x, gy, 2.5, { debris: 10, dust: world.biome.track }); sfx.explosion(2.5, (e.x - P.x) / 30); G.shake = Math.max(G.shake, 0.8); fx.scorch(e.x, gy, 7); }
      e.m.root.position.set(e.x, e.y, -1);
    }
    e.smokeT -= dt;
    if (e.smokeT <= 0 && e.deadT < e.burnT) {
      e.smokeT = 0.07;
      fx.spawn({ tex: 'smoke', additive: false, x: e.x + (Math.random() - 0.5) * 2, y: e.y + 2, z: (Math.random() - 0.5), vx: -0.6, vy: 2.5, life: 3, size0: 1, size1: 5, alpha: 0.6, color: '#222' });
      if (Math.random() < 0.5) fx.spawn({ tex: 'fire', x: e.x + (Math.random() - 0.5) * 2, y: e.y + 1.5, vy: 1.5, life: 0.5, size0: 1.2, size1: 0.4 });
    }
    if (e.deadT > 40) e.remove = true;
  }
}

// ============================================================ HUD
const hud = {
  hitFlash: 0, objPulse: 0, slots: [], lastUpdate: 0,
  build() {
    const bar = $('weapons');
    bar.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `<span class="key">${i + 1}</span><span class="ic">${w.icon}</span><span class="nm">${w.short}</span><span class="am"></span><div class="cd"></div><span class="lock">🔒</span>`;
      el.onclick = () => selectWeapon(i);
      bar.appendChild(el);
      this.slots.push(el);
    });
  },
  setLevel(L, region, time) {
    $('lvl').textContent = `المرحلة ${L}`;
    $('env').textContent = `${region.name} · ${time.name}`;
    const b = $('banner');
    b.innerHTML = `<small>المرحلة ${L} · محافظة ${region.gov}</small><b>${region.name}</b><span>${time.name}</span>`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },
  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    $('hitfx').style.opacity = (this.hitFlash * 3).toFixed(2);
    this.lastUpdate -= dt;
    if (this.lastUpdate > 0) return;
    this.lastUpdate = 0.08;
    const st = stats();
    $('hp-fill').style.width = (P.hp / st.maxHp * 100).toFixed(1) + '%';
    $('hp-txt').textContent = P.disabled > 0 ? 'إصلاح…' : `${Math.ceil(P.hp)} / ${st.maxHp}`;
    $('xp-fill').style.width = (S.xp / xpNeed(S.plv) * 100).toFixed(1) + '%';
    $('xp-txt').textContent = `مستوى ${vehicleName()} ${S.plv} · ${S.xp}/${xpNeed(S.plv)} XP`;
    $('kills').textContent = `☠ ${G.levelKills}`;
    const airTargets=$('air-targets');airTargets.replaceChildren();
    if(P.vehicle==='heli'&&!G.special){
      for(const e of G.enemies.filter(e=>!e.dead&&Math.abs(e.x-P.x)<110).slice(0,14)){
        const q=new THREE.Vector3(e.x,e.y+(e.h||2)+.8,e.z||0).project(camera);
        if(q.z<0||q.z>1||Math.abs(q.x)>.94||Math.abs(q.y)>.85)continue;
        const marker=document.createElement('span');marker.className='story-enemy';marker.innerHTML='◆<small>عدو</small>';marker.style.left=((q.x+1)*50)+'%';marker.style.top=((1-q.y)*50)+'%';airTargets.append(marker);
      }
    }
    $('aim').textContent = `زاوية المدفع ${Math.round(P.aim * 180 / Math.PI)}°`;
    $('spd').textContent = `${Math.round(Math.abs(P.vx) * 3.6)} كم/س`;
    if (G.mission) $('obj').innerHTML = G.mission.text();
    const o = G.mission && G.mission.cur;
    if (!G.special) $('obj-count').textContent = G.mission ? `مهمة ${Math.min(G.mission.idx + 1, G.mission.objs.length)} / ${G.mission.objs.length}` : '';
    // progress track
    const pr = $('track');
    const L = G.length;
    $('trk-tank').style.left = (clamp(P.x / L, 0, 1) * 100) + '%';
    if (G.mission) {
      const tx = G.mission.targetX();
      const tg = $('trk-target');
      if (tx != null) { tg.style.display = 'block'; tg.style.left = (clamp(tx / L, 0, 1) * 100) + '%'; } else tg.style.display = 'none';
      const fr = G.friends.filter(f => f.state === 'ride').length;
      $('passengers').textContent = fr ? `🪖 على الدبابة: ${fr}` : '';
    }
    this.slots.forEach((el, i) => {
      const w = WEAPONS[i];
      el.classList.toggle('active', i === P.wi);
      el.classList.toggle('locked', !S.unlocked[i]);
      el.querySelector('.am').textContent = !S.unlocked[i] ? '' : w.ammo === Infinity ? '∞' : S.ammo[i];
      const cd = P.cd[i] / (w.reload * st.reload);
      el.querySelector('.cd').style.height = (clamp(cd, 0, 1) * 100) + '%';
    });
    $('disabled').style.display = P.disabled > 0 ? 'block' : 'none';
    if (P.disabled > 0) $('disabled').textContent = `الدبابة متضررة — إصلاح تلقائي ${Math.ceil(P.disabled)}`;
  },
};
hud.build();

const toastBox = $('toasts');
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.textContent = msg;
  toastBox.appendChild(el);
  while (toastBox.children.length > 4) toastBox.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

const floaters = [];
function floater(x, y, text, color) {
  const el = document.createElement('div');
  el.className = 'floater'; el.textContent = text; el.style.color = color;
  $('floaters').appendChild(el);
  floaters.push({ el, x, y, life: 1.2 });
}
const _proj = new THREE.Vector3();
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.life -= dt; f.y += dt * 1.5;
    if (f.life <= 0) { f.el.remove(); floaters.splice(i, 1); continue; }
    _proj.set(f.x, f.y, 0).project(camera);
    f.el.style.transform = `translate(${(_proj.x * 0.5 + 0.5) * innerWidth}px, ${(-_proj.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%)`;
    f.el.style.opacity = Math.min(1, f.life * 2);
  }
}

// ============================================================ INPUT
const keys = new Set();
let firing = false;
function selectWeapon(i) {
  if (!S.unlocked[i]) { toast('هذا السلاح مقفل — اجمع صندوق معدات من الحطام لفتحه', 'warn'); return; }
  if (P.wi !== i) { P.wi = i; sfx.click(); }
}
function selectNextAvailable(dir = 1) {
  for (let k = 1; k <= WEAPONS.length; k++) {
    const i = (P.wi + k * dir + WEAPONS.length * 2) % WEAPONS.length;
    if (S.unlocked[i] && (WEAPONS[i].ammo === Infinity || S.ammo[i] > 0)) { P.wi = i; sfx.click(); return; }
  }
}
window.addEventListener('keydown', (ev) => {
  sfx.init();
  const k = ev.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) ev.preventDefault();
  if (ev.target?.matches?.('input, select, textarea')) return;
  keys.add(ev.code);
  if (G.state === 'play') {
    if (G.mission?.transfer && !['Escape','KeyP'].includes(ev.code)) return;
    if (/^Digit[1-6]$/.test(ev.code) || /^Numpad[1-6]$/.test(ev.code)) selectWeapon(parseInt(ev.code.slice(-1), 10) - 1);
    if (ev.code === 'KeyQ') selectNextAvailable(-1);
    if (ev.code === 'KeyE') selectNextAvailable(1);
    if (ev.code === 'Escape' || ev.code === 'KeyP') pause(true);
  } else if (G.state === 'paused' && (ev.code === 'Escape' || ev.code === 'KeyP')) pause(false);
  else if (G.state === 'complete' && (ev.code === 'Enter' || ev.code === 'Space')) nextLevel();
  if (ev.code === 'KeyM') { sfx.setVolume(sfx.volume > 0 ? 0 : (S.volume || 0.7)); toast(sfx.volume > 0 ? 'الصوت مفعّل' : 'الصوت مكتوم', 'ok'); }
  if (ev.code === 'F11' && window.ibra) { ev.preventDefault(); window.ibra.fullscreen(); }
});
window.addEventListener('keyup', (ev) => keys.delete(ev.code));
canvas.addEventListener('mousedown', (ev) => { sfx.init(); if (ev.button === 0) { firing = true; } });
window.addEventListener('mouseup', () => { firing = false; });
canvas.addEventListener('contextmenu',ev=>{if(G.special)ev.preventDefault();});
canvas.addEventListener('wheel', (ev) => { if (G.state === 'play') P.aim = clamp(P.aim - Math.sign(ev.deltaY) * 0.04, P.vehicle === 'heli' ? -1.25 : -0.25, 1.25); }, { passive: true });
window.addEventListener('blur', () => { keys.clear(); firing = false; if (G.state === 'play') pause(true); });
const down = (...codes) => codes.some(c => keys.has(c));

// ============================================================ PLAYER UPDATE
function updatePlayer(dt) {
  const st = stats();
  const left = down('ArrowLeft', 'KeyA'), right = down('ArrowRight', 'KeyD');
  const up = down('ArrowUp', 'KeyW'), dn = down('ArrowDown', 'KeyS');
  let input = G.autoDrive ? 1 : G.lockInput ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
  if (P.disabled > 0) {
    input = 0; P.disabled -= dt;
    if (Math.random() < dt * 12) fx.spawn({ tex: 'smoke', additive: false, x: P.x + (Math.random() - 0.5) * 3, y: P.y + 2.5, vy: 2, life: 2, size0: 1, size1: 4, alpha: 0.6, color: '#333' });
    if (P.disabled <= 0) { P.hp = st.maxHp * 0.75; toast('اكتمل الإصلاح — عدنا للقتال!', 'ok'); }
  }
  if(P.vehicle==='heli'&&winch.busy){input=0;P.vx=0;}
  if (input !== 0) P.facing = input;
  const slope = P.vehicle === 'tank' ? slopeAt(P.x) : 0;
  const target = input * st.speed * (P.vehicle === 'heli' ? 1.65 : P.vehicle === 'boat' ? 1.2 : 1) * (1 - Math.sin(slope) * input * 0.6);
  P.vx = lerp(P.vx, target, dt * (input ? 2.2 : 3.5));
  const xMin = G.xMin ?? 2, xMax = G.xMax ?? G.length + 25;
  P.x = clamp(P.x + P.vx * dt, xMin, xMax);
  if (P.x <= xMin || P.x >= xMax) P.vx = 0;
  if (P.vehicle === 'heli' && flight) {
    if (down('KeyR') && P.disabled <= 0) P.alt += dt * 5;
    if (down('KeyF') && P.disabled <= 0) P.alt -= dt * 5;
    P.alt = clamp(P.alt || 7, 2, 19);
    P.y = ground(P.x) + P.alt;
    flight.root.position.set(P.x, P.y, 0); flight.body.rotation.y = P.facing > 0 ? 0 : Math.PI;
    flight.root.rotation.z = -P.vx * 0.008;
    flight.rotor.rotation.y += dt * 34; flight.tailRotor.rotation.z += dt * 45;
  } else if (P.vehicle === 'boat' && vessel) {
    P.y = world.waterY - 0.55 + Math.sin(G.t * 2) * 0.08;
    vessel.root.position.set(P.x, P.y, 0); vessel.body.rotation.y = P.facing > 0 ? 0 : Math.PI;
    vessel.root.rotation.z = Math.sin(G.t * 1.4) * 0.025;
    vessel.gunPivot.rotation.z = P.aim;
    if (vessel.root.userData.radar) vessel.root.userData.radar.rotation.y += dt * 3;
    if (Math.abs(P.vx) > 1 && Math.random() < dt * 16) fx.dustPuff(P.x - P.facing * vessel.w / 2, world.waterY, '#daefff', 1, -P.vx * 0.3);
  } else P.y = ground(P.x);
  P.slope = lerp(P.slope, slope, dt * 8);
  // barrel
  if (P.disabled <= 0) {
    if (up && !G.lockInput) P.aim = Math.min(1.25, P.aim + dt * 0.9);
    if (dn && !G.lockInput) P.aim = Math.max(P.vehicle === 'heli' ? -1.25 : -0.25, P.aim - dt * 0.9);
  }
  // recoil
  P.recoil = Math.max(0, P.recoil - dt * 4);
  tank.root.position.set(P.x, P.y, 0);
  tank.root.rotation.z = P.slope + P.recoil * 0.035 * P.facing * (P.recoil > 0.5 ? 1 : 0);
  tank.setFacing(P.facing);
  tank.setAim(P.aim);
  tank.waveFlag(G.t, P.vx);
  tank.recoil(P.recoil);
  tank.turret.position.y = (tank.turret.userData.baseY || 0) + Math.sin(G.t * 30) * 0.008 * Math.min(1, Math.abs(P.vx));
  tank.spinWheels(P.vx * P.facing * dt);
  tank.treadMap.offset.y -= P.vx * P.facing * dt * 0.17;
  // dust & exhaust
  P.dustT -= dt;
  if (P.dustT <= 0 && P.vehicle === 'tank') {
    P.dustT = 0.05;
    if (Math.abs(P.vx) > 1.2) fx.dustPuff(P.x - P.facing * 3.2, P.y, world.biome.track, 1.2, -P.vx * 0.3);
    if (Math.random() < 0.4) fx.spawn({ tex: 'smoke', additive: false, x: P.x - P.facing * 3.9, y: P.y + 1.5, z: -0.6, vx: -P.facing * 1.5, vy: 1, life: 1.2, size0: 0.3, size1: 1.6, alpha: 0.3 + Math.min(0.3, Math.abs(P.vx) * 0.05), color: '#555' });
  }
  updateCombat(dt);
}

function updateCombat(dt) {
  const st = stats();
  winch.update(dt,P.vehicle==='heli'?carrierRoot():null);
  // regen
  P.hitT += dt;
  if (P.hitT > 4 && P.disabled <= 0) P.hp = Math.min(st.maxHp, P.hp + dt * (4 + S.plv * 0.6));
  // weapon cooldowns
  for (let i = 0; i < P.cd.length; i++) P.cd[i] = Math.max(0, P.cd[i] - dt);
  if (!G.lockInput && (down('Space') || firing)) playerFire();
  for (let i = P.burst.length - 1; i >= 0; i--) { P.burst[i].t -= dt; if (P.burst[i].t <= 0) { doShot(P.burst[i].wi); P.burst.splice(i, 1); } }
  // crates
  for (let i = G.crates.length - 1; i >= 0; i--) {
    const c = G.crates[i];
    c.t += dt;
    const gy = G.special?.depthCombat ? ground(c.x) : lootHeight(c.x);
    if(P.vehicle==='heli'&&Math.abs(c.x-P.x)<7)c.y=lerp(c.y,P.y,Math.min(1,dt*8));
    if (c.y > gy) { c.vy -= 18 * dt; c.y = Math.max(gy, c.y + c.vy * dt); }
    c.c.root.position.set(c.x, c.y, 0);
    c.c.box.position.y = 0.6 + Math.sin(c.t * 3) * 0.12;
    c.c.box.rotation.y += dt;
    c.c.ring.scale.setScalar(1 + Math.sin(c.t * 4) * 0.1);
    if (Math.abs(c.x - P.x) < 3.2 && P.disabled <= 0) { collectCrate(c); scene.remove(c.c.root); G.crates.splice(i, 1); }
  }
  sfx.engine(P.vx, G.state === 'play');
  // trajectory preview
  const W = WEAPONS[P.wi];
  const pos = trajGeo.attributes.position;
  const m = muzzleInfo();
  traj.visible = G.state === 'play' && P.disabled <= 0;
  if (W.kind === 'rail' || W.kind === 'bullet' || W.kind === 'rocket') {
    for (let i = 0; i < TRAJ_N; i++) { const d = 1 + i * (W.kind === 'rail' ? 1.6 : 0.9); pos.setXYZ(i, m.x + m.dx * d, m.y + m.dy * d, 0); }
    traj.material.color.set(W.kind === 'rail' ? '#7fe8ff' : '#ffd76a');
  } else {
    let x = m.x, y = m.y, vx = m.dx * W.speed + P.vx * 0.3, vy = m.dy * W.speed;
    const stepT = 0.07;
    let ended = false;
    for (let i = 0; i < TRAJ_N; i++) {
      if (!ended) { x += vx * stepT; y += vy * stepT; vy -= W.g * stepT; if (y < ground(x)) { y = ground(x) + 0.1; ended = true; } }
      pos.setXYZ(i, x, y, 0);
    }
    traj.material.color.set('#ffd76a');
  }
  pos.needsUpdate = true;
}

// ============================================================ CAMERA
function updateCamera(dt, t) {
  if (G.state === 'menu') {
    const cx = P.x + 2 + Math.sin(t * 0.15) * 5;
    camera.position.set(cx + Math.sin(t * 0.1) * 6, ground(P.x) + 4.5, 20 + Math.cos(t * 0.12) * 3);
    camera.lookAt(P.x, ground(P.x) + 1.8, 0);
    world.followSun(P.x, ground(P.x));
    return;
  }
  if(P.vehicle==='heli'){
    const gy=ground(P.x),f=flightFrame(P.y-gy);
    G.camX=lerp(G.camX,P.x+P.facing*24,dt*2.8);G.camY=lerp(G.camY,gy+f.focus,dt*3);
    camera.fov=lerp(camera.fov,f.fov,dt*4);camera.updateProjectionMatrix();
    G.shake=Math.max(0,G.shake-dt*2);camera.position.set(G.camX,gy+f.height,f.distance);camera.lookAt(G.camX,G.camY,0);world.followSun(G.camX,G.camY);return;
  }
  camera.fov=lerp(camera.fov,window.innerWidth/window.innerHeight<1.4?46:36,dt*4);camera.updateProjectionMatrix();
  const look = P.facing * 9 + P.vx * 0.6;
  G.camX = lerp(G.camX, P.x + look, dt * 2.2);
  const aimLift = Math.max(0, P.aim - 0.4) * 6;
  G.camY = lerp(G.camY, P.y + 5.5 + aimLift, dt * 2.5);
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const s = G.shake * G.shake;
  camera.position.set(G.camX + (Math.random() - 0.5) * s * 1.2, G.camY + 2.6 + (Math.random() - 0.5) * s * 1.2, 36);
  camera.lookAt(G.camX, G.camY - 0.6, 0);
  world.followSun(G.camX, G.camY);
}

// ============================================================ UI SCREENS
function show(id) {
  for (const s of ['menu', 'pause', 'complete', 'help', 'settings', 'codes']) $(s).classList.toggle('show', s === id);
  $('hud').classList.toggle('show', id === null || id === 'pause' || id === 'complete');
  document.body.classList.toggle('playing', id === null);
}
function startGame() {
  sfx.init();
  endSpecial();
  secretStage = null;
  buildLevel(S.level);
  G.state = 'play';
  show(null);
}
// ============================================================ SPECIAL STAGE
function startSpecial() {
  sfx.init();
  endSpecial();
  clearLevel();
  G.mission = null;
  secretStage = null;
  if (flight) { scene.remove(flight.root); flight = null; }
  if (vessel) { scene.remove(vessel.root); vessel = null; }
  const region = { ...ADVENTURE_REGION };
  world.build(0, ADVENTURE.length, 4242, { biome: BIOMES[region.base], time: TIMES[region.time], region, cross: ADVENTURE.cross, flatZones: [[-10,40], [900,950], [1420,1460], [2760,2810], [3320,3380], [5070,5230]] });
  G.region = region; G.biome = world.biome; G.time = world.time; G.length = ADVENTURE.length;
  renderer.toneMappingExposure = TIMES[region.time].exposure; headL.intensity = 0;
  const st = stats();
  Object.assign(P, { hp: st.maxHp, disabled: 0, burst: [], aim: 0.08, x: 8, vx: 0, facing: 1, vehicle: 'tank', wi: 0 });
  tank.setTier(st.tier); tank.root.visible = true; tank.root.position.set(8, ground(8), 0);
  G.levelKills = 0; G.vehicleKills = 0; G.levelTime = 0; G.xpGained = 0; G.spawns = [];
  G.lvlForSpecial = Math.max(3, S.level);
  G.camX = P.x + 8; G.camY = ground(P.x) + 5;
  G.special = createAdventure({
    scene, camera, world, fx, sfx, tank, P, G, keys, ground, stats, toast, fireProj, updatePlayer, updateCombat, winch, spawnFriend, weapons: WEAPONS, spawnSoldier, spawnVehicle, damageEnemy, pause: () => pause(true), exit: exitSpecialToMenu, tierIdx: () => stats().tier,
    down: (...c) => down(...c), isFiring: () => firing,
    updateCamera: (dt) => updateCamera(dt, G.t),
    hideTraj: () => { traj.visible = false; },
    setTankUI: (v) => { $('weapons').style.display = v ? '' : 'none'; },

  });
  $('lvl').textContent = 'عملية الرافدين'; $('env').textContent = 'هدية الإصدار · جولة قصصية طويلة';
  G.state = 'play';
  show(null);
  addXP(0);
}
function endSpecial() {
  if (!G.special) return;
  G.special.dispose(); G.special = null;
  G.xMin = undefined; G.xMax = undefined; G.lockInput = false; G.autoDrive = false; G.ceasefire = false;
  P.vehicle = 'tank'; P.z = 0; tank.root.rotation.set(0,0,0); tank.root.visible = true; $('weapons').style.display = '';
}
function exitSpecialToMenu() {
  endSpecial();
  buildLevel(S.level);
  G.state = 'menu'; save(); refreshMenu(); show('menu');
}

function pause(p) {
  if (p && G.state === 'play') { firing = false; G.state = 'paused'; show('pause'); }
  else if (!p && G.state === 'paused') { G.state = 'play'; show(null); }
}
function nextLevel() {
  if (G.state !== 'complete') return;
  secretStage = null;
  buildLevel(S.level);
  G.state = 'play';
  show(null);
}
function refreshMenu() {
  $('btn-play').textContent = S.level > 1 ? `متابعة — المرحلة ${S.level}` : 'ابدأ اللعب';
  $('menu-info').textContent = S.level > 1 ? `مستوى ${vehicleName()} ${S.plv} · الأسلحة المفتوحة ${S.unlocked.filter(Boolean).length}/6 · مجموع القتلى ${S.kills}` : '';
  $('btn-new').style.display = '';
  $('mode').value = S.mode;
  $('mode-toggle').textContent = $('mode').selectedOptions[0].textContent + ' ▾';
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === S.mode)));
}
$('btn-play').onclick = () => { sfx.click(); startGame(); };
$('btn-new').onclick = () => {
  if (!confirm('بدء لعبة جديدة؟ سيتم حذف التقدّم الحالي.')) return;
  const selectedMode = $('mode').value;
  const v = S.volume, q = S.quality; S = defaultSave(); S.volume = v; S.quality = q; save();
  S.mode = selectedMode; save(); secretStage = null; tank.setTier(0); refreshMenu(); startGame(); sfx.click();
};
$('btn-help').onclick = () => { sfx.click(); show('help'); };
$('btn-settings').onclick = () => { sfx.click(); show('settings'); };
$('btn-exit').onclick = () => { if (window.ibra) window.ibra.quit(); else window.close(); };
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { sfx.click(); show(G.state === 'paused' ? 'pause' : 'menu'); });
$('btn-resume').onclick = () => pause(false);
$('btn-menu').onclick = () => { if (G.special) { exitSpecialToMenu(); return; } secretStage = null; G.state = 'menu'; save(); refreshMenu(); show('menu'); };
$('mode').onchange = e => { S.mode = e.target.value; save(); refreshMenu(); };
function closeModePicker() { $('mode-options').hidden = true; $('mode-toggle').setAttribute('aria-expanded','false'); }
$('mode-toggle').onclick = () => {
  const opened = $('mode-options').hidden;
  $('mode-options').hidden = !opened; $('mode-toggle').setAttribute('aria-expanded',String(opened));
  if(opened) document.querySelector(`[data-mode="${S.mode}"]`).focus();
};
document.querySelectorAll('[data-mode]').forEach((button,i,buttons) => {
  button.onclick = () => { $('mode').value=button.dataset.mode; $('mode').dispatchEvent(new Event('change')); closeModePicker(); $('mode-toggle').focus(); };
  button.onkeydown = e => {
    if(e.key==='Escape'){ e.preventDefault(); closeModePicker(); $('mode-toggle').focus(); }
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault(); const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length; buttons[next].focus();
    }
  };
});
document.addEventListener('click',e=>{if(!e.target.closest('.mode-picker'))closeModePicker();});
$('btn-special').onclick = () => { sfx.click(); show('codes'); };
$('btn-story').onclick = () => { sfx.click(); startSpecial(); };
$('code-form').onsubmit = e => {
  e.preventDefault();
  const stage = resolveSecret($('secret-code').value);
  if (!stage) { $('code-error').textContent = 'الرقم غير صحيح. اطلب رقمك مجاناً عبر التليكرام.'; return; }
  sfx.init(); endSpecial(); secretStage = stage; buildLevel(stage.level); G.state = 'play'; show(null);
};
$('btn-pause-help').onclick = () => show('help');
$('btn-next').onclick = () => { sfx.click(); nextLevel(); };
$('vol').value = S.volume;
$('vol').oninput = (e) => { S.volume = parseFloat(e.target.value); sfx.setVolume(S.volume); save(); };
$('quality').value = S.quality;
function applyQuality() {
  const hi = S.quality === 'high';
  renderer.shadowMap.enabled = S.quality !== 'low';
  world.sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.75 : S.quality === 'medium' ? 1.25 : 1));
  resize();
  scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
}
$('quality').onchange = (e) => { S.quality = e.target.value; save(); applyQuality(); };
$('btn-fs').onclick = () => { if (window.ibra) window.ibra.fullscreen(); else if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
document.querySelectorAll('a[data-ext]').forEach(a => a.onclick = (e) => { e.preventDefault(); if (window.ibra) window.ibra.open(a.href); else window.open(a.href, '_blank'); });

// ============================================================ LOOP
function stepPlay(dt) {
  G.levelTime += dt;
  if (G.special) G.special.update(dt); else if (G.mission?.transfer) { G.mission.tickTransfer(dt); traj.visible = false; } else updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateFriends(dt);
  if (G.mission && G.state === 'play') G.mission.update(dt);
  for (const w of world.smokeEmitters) {
    if (Math.abs(w.x - P.x) > 90) continue;
    w.t -= dt; if (w.t <= 0) { w.t = w.rate; fx.spawn({ tex: 'smoke', additive: false, x: w.x + (Math.random() - 0.5) * 2, y: ground(w.x) + 1, z: w.z, vx: -0.8, vy: 3, life: 6, size0: 3, size1: 14, alpha: 0.5, color: '#2a2622', drag: 0.1 }); }
  }
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  G.t += dt;
  if (G.state === 'play') { stepPlay(dt); hud.update(dt); updateFloaters(dt); }
  else if (G.state === 'menu') {
    // idle tank in menu
    tank.setFacing(1); tank.setAim(0.12 + Math.sin(G.t * 0.5) * 0.05); tank.waveFlag(G.t, 1.5);
    tank.root.position.set(P.x, ground(P.x), 0);
    traj.visible = false;
    sfx.engine(0, false);
  } else {
    sfx.engine(0, false);
  }
  if (G.beams) for (let i = G.beams.length - 1; i >= 0; i--) { const b = G.beams[i]; b.life -= dt; b.mesh.material.opacity = b.life / 0.35; b.mesh.scale.y = b.mesh.scale.z = b.life / 0.35 + 0.2; if (b.life <= 0) { scene.remove(b.mesh); G.beams.splice(i, 1); } }
  if (G.state !== 'paused') {
    fx.update(dt, ground);
    world.update(dt, G.state === 'menu' ? P.x : G.camX, G.t);
  }
  if (G.freeCam) { /* debug */ } else if (G.special && G.state !== 'menu') G.special.camera(dt); else if(G.mission?.transfer)G.mission.camera(dt);else updateCamera(dt, G.t);
  renderer.render(scene, camera);
}

// ============================================================ BOOT
document.querySelectorAll('canvas.iqflag').forEach(c => drawIraqFlagCanvas(c.getContext('2d'), c.width, c.height));
buildLevel(S.level);
tank.setTier(stats().tier);
refreshMenu();
applyQuality();
show('menu');
frame();
setTimeout(() => document.body.classList.add('ready'), 100);

// debug hooks for automated tests
window.__w = world; window.__tank = tank;
window.__game = { renderer, THREE, scene, camera, world, models: { buildSoldier, buildTank, buildHeliHD, buildSUV, buildBoatHD }, startSpecial, G, P, get S() { return S; }, startGame, buildLevel, WEAPONS, spawnVehicle, spawnSoldier, spawnFriend, winch, muzzleInfo, spawnCrate, collectCrate, resolveSecret, vehicleFor, addXP, keys, stepPlay, fx, ground, nextLevel };
