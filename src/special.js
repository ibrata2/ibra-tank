// المرحلة الخاصة — "من تمل من هاي اللعبة تعال هنا"
// دبابة ← عمارة ومصعد ← هليكوبتر ← رسالة المبرمج ← دبابة ← هليكوبتر ← النهر ← قارب ← النهاية
import * as THREE from 'three';
import { iraqHouse, iraqFlagPole } from './iraq.js';
import { buildFlag, mat } from './models.js';
import { buildSoldierHD, buildHeliHD, buildBoatHD, boatKindForTier } from './models_hd.js';
import { iraqFlagTexture, canvasTex, camoTexture } from './textures.js';

const std = (color, rough = 0.7, metal = 0.2, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ease = (t) => t * t * (3 - 2 * t);

export const SP = {
  length: 1760,
  flag1: 300, bx: 326, floors: 8,
  pad1: 662, tank2: 684,
  flag2: 958, pad2: 980,
  pad3: 1236, cross: [1262, 1540],
  bank2: 1558, tank3: 1574, end: 1740,
};
export const SPECIAL_REGION = { name: 'المرحلة الخاصة', gov: 'بغداد', base: 'palms', time: 'day', features: ['road'], props: { palm: 8, house: 2 }, special: true, night: false };
export const SPECIAL_FLATS = [[SP.flag1 - 12, SP.bx + 14], [SP.pad1 - 10, SP.tank2 + 8], [SP.flag2 - 10, SP.pad2 + 10], [SP.pad3 - 12, SP.cross[0] - 4], [SP.cross[1] + 4, SP.tank3 + 10]];

// ------------------------------------------------------------ boats
function hullGeo(len, beam, h) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, h * 0.15); s.lineTo(len / 2 - len * 0.18, 0); s.quadraticCurveTo(len / 2 - len * 0.04, 0.05, len / 2 + len * 0.06, h);
  s.lineTo(-len / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: beam, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  g.translate(0, 0, -beam / 2);
  return g;
}
function shadow(g) { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

export function buildGunboat() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = mat('gunboat', () => std('#3c4247', 0.6, 0.4));
  body.add(new THREE.Mesh(hullGeo(6.5, 2.2, 1.2), paint));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), mat('gbcab', () => std('#2a2e31', 0.5, 0.5))); cab.position.set(-0.8, 1.7, 0); body.add(cab);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.5), mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }))); ws.position.set(0.05, 1.9, 0); body.add(ws);
  const gunPivot = new THREE.Group(); gunPivot.position.set(1.8, 1.7, 0); body.add(gunPivot);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.14), mat('tankdark', () => std('#2a2a24', 0.7, 0.4))); gun.position.x = 0.6; gunPivot.add(gun);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), mat('tankdark')); post.position.set(1.8, 1.45, 0); body.add(post);
  const muzzle = new THREE.Object3D(); muzzle.position.x = 1.35; gunPivot.add(muzzle);
  return { root: shadow(root), body, gunPivot, muzzle, w: 6.6, h: 2.4 };
}
export function buildShip() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = mat('shipgrey', () => std('#5d656b', 0.6, 0.4));
  const dark = mat('shipdark', () => std('#2f3438', 0.6, 0.5));
  body.add(new THREE.Mesh(hullGeo(15, 4, 2.4), paint));
  const sup = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 3), paint); sup.position.set(-2.5, 3.6, 0); body.add(sup);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 2.6), paint); bridge.position.set(-2.2, 5.4, 0); body.add(bridge);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 2.2), mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }))); win.position.set(-0.88, 5.5, 0); body.add(win);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), dark); mast.position.set(-2.6, 7.8, 0); body.add(mast);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.3), dark); radar.position.set(-2.6, 9, 0); body.add(radar);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.6, 10), dark); funnel.position.set(-5, 3.4, 0); body.add(funnel);
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.8, 14), paint); tur.position.set(3.6, 2.8, 0); body.add(tur);
  const gunPivot = new THREE.Group(); gunPivot.position.set(3.9, 3.0, 0); body.add(gunPivot);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 10), dark); barrel.rotation.z = Math.PI / 2; barrel.position.x = 1.6; gunPivot.add(barrel);
  const muzzle = new THREE.Object3D(); muzzle.position.x = 3.2; gunPivot.add(muzzle);
  root.userData.radar = radar;
  return { root: shadow(root), body, gunPivot, muzzle, w: 15, h: 5.5 };
}
function buildPlayerBoat() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = mat('pboat', () => { const t = camoTexture(['#8a7a4e', '#5d5a34', '#a8946a', '#3b3a26'], 12, 0.6); t.repeat.set(0.4, 0.4); return std(0xffffff, 0.6, 0.3, { map: t }); });
  const dark = mat('tankdark', () => std('#2a2a24', 0.7, 0.4));
  body.add(new THREE.Mesh(hullGeo(9.5, 3.0, 1.6), paint));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2.3), paint); cab.position.set(-1.6, 2.35, 0); body.add(cab);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 2.0), mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }))); ws.position.set(-0.28, 2.6, 0); body.add(ws);
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.6, 14), paint); tur.position.set(2.4, 1.9, 0); body.add(tur);
  const gunPivot = new THREE.Group(); gunPivot.position.set(2.6, 2.15, 0); body.add(gunPivot);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.6, 10), dark); barrel.rotation.z = Math.PI / 2; barrel.position.x = 1.3; gunPivot.add(barrel);
  const muzzle = new THREE.Object3D(); muzzle.position.x = 2.6; gunPivot.add(muzzle);
  const fm = mat('iqflagdecal2', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
  for (const z of [1, -1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.66), fm); d.position.set(-1.6, 2.4, z * 1.17); if (z < 0) d.rotation.y = Math.PI; body.add(d); }
  const flag = iraqFlagPole(3.4); flag.root.position.set(-3.6, 1.6, 0); flag.root.scale.setScalar(0.7); body.add(flag.root);
  return { root: shadow(root), body, gunPivot, muzzle, flag };
}

// ------------------------------------------------------------ tower with external glass elevator
function hTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4d50'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill();
    g.strokeStyle = '#f2d34a'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 18, 0, 7); g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', w / 2, h / 2 + 6);
  }, { wrap: false });
}
function helipad(r = 5.5) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshStandardMaterial({ map: hTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  const lm = new THREE.MeshBasicMaterial({ color: '#7cff8a' });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), lm); l.position.set(Math.cos(a) * (r + 0.2), 0.1, Math.sin(a) * (r + 0.2)); g.add(l); }
  return g;
}
function buildTower(r) {
  const g = new THREE.Group();
  const H = SP.floors * 4;
  const b = iraqHouse(r, { floors: SP.floors, w: 16, d: 12, plainRoof: true, shop: ['برج الرافدين', 'مكاتب · مصعد للسطح', '#1d4f9c'] });
  g.add(b);
  const shaftX = -5, shaftZ = 7.15, sh = H + 3.6;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.5, sh, 2.3), new THREE.MeshStandardMaterial({ color: '#9fd0ea', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.6, depthWrite: false }));
  glass.position.set(shaftX, sh / 2, shaftZ); g.add(glass);
  const fm = mat('shaftframe', () => std('#3d4246', 0.5, 0.7));
  for (const dx of [-1.25, 1.25]) for (const dz of [-1.15, 1.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, sh, 0.14), fm); p.position.set(shaftX + dx, sh / 2, shaftZ + dz); g.add(p); }
  for (let y = 0; y <= sh; y += 4) { const ring = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.4), fm); ring.position.set(shaftX, y, shaftZ); g.add(ring); }
  const cabin = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2.0), fm); cabin.add(floor);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 2.0), fm); roof.position.y = 2.7; cabin.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, 0.08), mat('cabinwall', () => std('#c9c3b6', 0.4, 0.6))); back.position.set(0, 1.35, -0.96); cabin.add(back);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); lamp.position.y = 2.62; cabin.add(lamp);
  cabin.position.set(shaftX, 0.05, shaftZ); g.add(cabin);
  // roof stairwell (بيت الدرج) with door
  const sw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 3.6), mat('stairwell', () => std('#cbbf9f', 0.9, 0)));
  sw.position.set(shaftX, H + 1.8, 4.2); g.add(sw);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), mat('rdoor', () => std('#5a3a1e', 0.8, 0)));
  door.rotation.y = Math.PI / 2; door.position.set(shaftX + 1.72, H + 1.15, 4.2); g.add(door);
  const pad = helipad(4.6); pad.position.set(3, H + 0.06, -0.5); g.add(pad);
  const sign = iraqFlagPole(5); sign.root.position.set(7, H, 5); g.add(sign.root);
  return { g: shadow(g), cabin, H, shaftX, shaftZ, door: [shaftX + 2.3, 4.2], padX: 3, padZ: -0.5, flag: sign };
}

// ------------------------------------------------------------ main
export function createSpecial(ctx) {
  const { scene, camera, world, fx, sfx, tank, P, G, keys } = ctx;
  const ground = ctx.ground;
  const grp = new THREE.Group(); scene.add(grp);
  const r = Math.random;
  let mode = 'cut';
  let lastVeh = 'tank';
  let dtNow = 0;
  let camTarget = null;
  const camPos = camera.position.clone(), camLook = new THREE.Vector3(P.x, P.y + 2, 0);
  const flags = [];
  const anims = [];

  // --- scenery
  const tower = buildTower(r);
  const TX = SP.bx, TZ = -9.6;
  tower.g.position.set(TX, ground(TX) - 0.1, TZ); grp.add(tower.g);
  flags.push(tower.flag);
  const roofY = () => tower.g.position.y + tower.H;
  const shaftW = () => [TX + tower.shaftX, TZ + tower.shaftZ];
  const mkFlag = (x) => { const f = buildFlag('#ce1126', '', 8, { tex: iraqFlagTexture() }); f.root.position.set(x, ground(x), -1.6); grp.add(f.root); flags.push(f); return f; };
  mkFlag(SP.flag1); mkFlag(SP.flag2);
  for (const x of [SP.pad1, SP.pad2, SP.pad3]) { const p = helipad(5.5); p.position.set(x, ground(x) + 0.05, 0); grp.add(p); }
  // jetty on the river banks
  const jm = mat('jetty', () => std('#6b4f33', 0.9, 0));
  for (const [x0, x1] of [[SP.cross[0] - 6, SP.cross[0] + 6], [SP.cross[1] - 6, SP.cross[1] + 6]]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.3, 2.6), jm); j.position.set((x0 + x1) / 2, world.waterY + 0.9, 3.2); grp.add(j);
    for (let x = x0 + 0.5; x < x1; x += 2.4) for (const z of [2.1, 4.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), jm); p.position.set(x, world.waterY - 1, z); grp.add(p); }
  }
  // farewell sign by the far bank
  // vehicles
  const TI = ctx.tierIdx();
  const heli = buildHeliHD('desert', TI);
  const fdm = mat('iqflagdecal3', () => new THREE.MeshStandardMaterial({ map: iraqFlagTexture(), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
  for (const z of [1, -1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.72), fdm); d.position.set(-0.7, 0.15, z * 0.93); if (z < 0) d.rotation.y = Math.PI; heli.body.add(d); }
  grp.add(heli.root);
  const HL = { x: 0, y: 0, z: 0, vx: 0, alt: 11, facing: 1, rotor: 0, cdMG: 0, cdR: 0, min: 0, max: 0 };
  const placeHeli = (x, y, z, facing = 1) => { HL.x = x; HL.y = y; HL.z = z; HL.facing = facing; HL.vx = 0; heli.root.position.set(x, y, z); heli.body.rotation.y = facing > 0 ? 0 : Math.PI; heli.root.rotation.set(0, 0, 0); };
  placeHeli(TX + tower.padX, roofY() + 1.75, TZ + tower.padZ);

  const boatM = buildBoatHD(boatKindForTier(TI), { flagPole: () => iraqFlagPole(3.4) }); grp.add(boatM.root); if (boatM.flag) flags.push(boatM.flag);
  const BT = { x: SP.cross[0] + 9, vx: 0, facing: 1, cd: 0, min: 0, max: 0 };
  boatM.root.position.set(BT.x, world.waterY - 0.5, 3.2);

  const hero = buildSoldierHD('rifleman', 'desert', 7777, true, { tier: Math.min(4, Math.floor(TI / 5)) });
  hero.root.visible = false; grp.add(hero.root);
  const H = { x: 0, y: 0, z: 0, walkT: 0 };
  const heroAt = (x, y, z) => { H.x = x; H.y = y; H.z = z; hero.root.position.set(x, y, z); hero.root.visible = true; };
  const faceCam = () => { hero.body.rotation.y = -Math.PI / 2; };

  // --- DOM: speech bubble & credits
  const bubble = document.createElement('div'); bubble.id = 'speech'; document.body.appendChild(bubble);
  const credits = document.createElement('div'); credits.id = 'credits'; document.body.appendChild(credits);
  let holding = false, clicked = false;
  const onDown = (e) => { if (e.target && e.target.closest && e.target.closest('a')) return; holding = true; };
  const onUp = () => { if (holding) clicked = true; holding = false; };
  const onKD = (e) => { if (e.code === 'Space' || e.code === 'Enter') { holding = true; } };
  const onKU = (e) => { if (e.code === 'Space' || e.code === 'Enter') { holding = false; clicked = true; } };
  window.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', onKD); window.addEventListener('keyup', onKU);
  bubble.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); if (window.ibra) window.ibra.open(a.href); else window.open(a.href, '_blank'); } });
  const _hp = new THREE.Vector3();
  function placeBubble() {
    if (!bubble.classList.contains('show')) return;
    _hp.set(H.x, H.y + hero.height + 0.5, H.z).project(camera);
    const x = (_hp.x * 0.5 + 0.5) * innerWidth, y = (-_hp.y * 0.5 + 0.5) * innerHeight;
    const bh = bubble.offsetHeight || 120, bw = bubble.offsetWidth || 400;
    bubble.style.left = clamp(x, bw / 2 + 16, innerWidth - bw / 2 - 16) + 'px';
    bubble.style.top = clamp(y, bh + 24, innerHeight - 40) + 'px';
  }

  // --- coroutine helpers
  function* wait(t) { while (t > 0) { t -= dtNow; yield; } }
  function* until(fn) { while (!fn()) yield; }
  function* walkTo(x, z, speed = 3.2, yFn = null) {
    hero.root.visible = true;
    for (;;) {
      const dx = x - H.x, dz = z - H.z, d = Math.hypot(dx, dz);
      if (d < 0.06) break;
      const st = Math.min(d, speed * dtNow);
      H.x += (dx / d) * st; H.z += (dz / d) * st;
      H.y = yFn ? yFn(H.x, H.z) : ground(H.x);
      hero.body.rotation.y = Math.atan2(-dz, dx);
      H.walkT += dtNow * 9;
      const sw = Math.sin(H.walkT) * 0.6;
      hero.legL.rotation.z = sw; hero.legR.rotation.z = -sw; hero.pose();
      hero.root.position.set(H.x, H.y + Math.abs(Math.cos(H.walkT)) * 0.05, H.z);
      yield;
    }
    hero.legL.rotation.z = 0; hero.legR.rotation.z = 0; hero.pose();
  }
  function* jumpTo(x, y, z, dur = 0.6) {
    const x0 = H.x, y0 = H.y, z0 = H.z; let t = 0;
    hero.root.visible = true; hero.body.rotation.y = Math.atan2(-(z - z0), x - x0 || 0.001);
    while (t < dur) { t += dtNow; const k = Math.min(1, t / dur); H.x = lerp(x0, x, k); H.z = lerp(z0, z, k); H.y = lerp(y0, y, k) + Math.sin(k * Math.PI) * 1.2; hero.root.position.set(H.x, H.y, H.z); hero.legL.rotation.z = 0.6; hero.legR.rotation.z = -0.3; yield; }
    hero.legL.rotation.z = 0; hero.legR.rotation.z = 0;
  }
  function* say(html, o = {}) {
    holding = false; clicked = false;
    let foot = '';
    if (o.hold) foot = `<div class="hold"><div class="holdbar"><i></i></div><span>اضغط مطوّلاً ${o.hold} ثواني على أي مكان حتى تكمل</span></div>`;
    else if (o.click) foot = '<div class="cont">اضغط على الشاشة للمتابعة ⏎</div>';
    bubble.className = 'show' + (o.big ? ' big' : '') + (o.shout ? ' shout' : '');
    bubble.innerHTML = `<div class="who">🪖 المقاتل العراقي</div><div class="txt">${html}</div>${foot}`;
    const bar = bubble.querySelector('.holdbar i');
    let held = 0, shown = 0, t = o.time || 0;
    for (;;) {
      shown += dtNow;
      placeBubble();
      if (o.hold) {
        held = holding ? held + dtNow : 0;
        if (bar) bar.style.width = Math.min(100, (held / o.hold) * 100) + '%';
        if (held >= o.hold) break;
      } else if (o.click) { if (clicked && shown > 0.8) break; clicked = clicked && shown > 0.8 ? clicked : false; }
      else { t -= dtNow; if (t <= 0) break; }
      yield;
    }
    bubble.className = ''; holding = false; clicked = false;
  }
  const setObj = (html) => { const el = document.getElementById('obj'); if (el) el.innerHTML = html; };
  const near = (rad = 45) => G.enemies.filter(e => !e.dead && Math.abs(e.x - P.x) < rad).length;
  const camHero = (dist = 9, h = 2.4, side = 0, look = 1.4) => { camTarget = { fn: () => [H.x + side, H.y + h, H.z + dist, H.x, H.y + look, H.z], k: 2.2 }; };
  const types = () => { const L = Math.max(3, G.lvlForSpecial); const a = ['rifleman', 'rifleman', 'rpg', 'mg', 'grenadier', 'officer']; if (L >= 4) a.push('sniper'); if (L >= 7) a.push('heavy'); return a; };
  const plan = (x0, x1, step, veh = []) => {
    const out = [];
    for (let x = x0; x < x1; x += step + Math.random() * step * 0.5) {
      const n = 2 + Math.floor(Math.random() * 3), T = types();
      out.push({ x, soldiers: Array.from({ length: n }, () => T[Math.floor(Math.random() * T.length)]) });
    }
    for (const [x, kind] of veh) out.push({ x, vehicle: kind });
    G.spawns = out;
  };

  // --- vehicles control
  function heliControl(dt, auto = null) {
    const st = ctx.stats();
    let input = 0, vin = 0;
    if (!auto) {
      input = (ctx.down('ArrowRight', 'KeyD') ? 1 : 0) - (ctx.down('ArrowLeft', 'KeyA') ? 1 : 0);
      vin = (ctx.down('ArrowUp', 'KeyW') ? 1 : 0) - (ctx.down('ArrowDown', 'KeyS') ? 1 : 0);
      if (input) HL.facing = input;
      HL.vx = lerp(HL.vx, input * 13, dt * 1.8);
      HL.x = clamp(HL.x + HL.vx * dt, HL.min, HL.max);
      HL.alt = clamp(HL.alt + vin * 8 * dt, 5.5, 20);
      HL.y = lerp(HL.y, ground(HL.x) + HL.alt, dt * 3);
      HL.z = lerp(HL.z, 0, dt * 1.5);
    }
    heli.root.position.set(HL.x, HL.y, HL.z);
    heli.body.rotation.y = HL.facing > 0 ? 0 : Math.PI;
    heli.root.rotation.z = lerp(heli.root.rotation.z, -HL.vx * 0.022, dt * 4);
    heli.rotor.rotation.y += dt * 30 * HL.rotor; heli.tailRotor.rotation.z += dt * 40 * HL.rotor;
    const gy = ground(HL.x);
    if (HL.rotor > 0.5 && HL.y - gy < 12 && Math.random() < dt * 10) fx.dustPuff(HL.x + (Math.random() - 0.5) * 9, gy, world.biome.track, 1.3, (Math.random() - 0.5) * 8);
    P.x = HL.x; P.y = HL.y - 1.3; P.vx = HL.vx; P.facing = HL.facing;
    sfx.engine(9 * HL.rotor, HL.rotor > 0.1);
    if (auto) return;
    // weapons: رشاش + صواريخ موجهة
    HL.cdMG -= dt; HL.cdR -= dt;
    if (ctx.down('Space') || ctx.isFiring()) {
      heli.root.updateMatrixWorld(true);
      const m = heli.muzzle.getWorldPosition(new THREE.Vector3());
      // smart aim: nearest enemy in front
      let tgt = null, bd = 1e9;
      for (const e of G.enemies) { if (e.dead) continue; const ddx = (e.x - HL.x) * HL.facing; if (ddx > 1 && ddx < 48 && ddx < bd) { bd = ddx; tgt = e; } }
      let ang = -(0.24 + (HL.y - gy - 8) * 0.018);
      if (tgt) { const ty = tgt.kind === 'heli' ? tgt.y : tgt.y + (tgt.h || 1.8) * 0.5; ang = clamp(Math.atan2(ty - m.y, Math.abs(tgt.x - m.x)), -1.05, 0.6); }
      const dx = HL.facing * Math.cos(ang), dy = Math.sin(ang);
      if (HL.cdMG <= 0) {
        HL.cdMG = 0.08;
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.05;
        ctx.fireProj({ owner: 'player', kind: 'bullet', x: m.x + dx * 1.5, y: m.y, vx: Math.cos(a) * 85 + HL.vx * 0.5, vy: Math.sin(a) * 85, g: 1.5, dmg: 8 * st.dmg, splash: 0 });
        fx.muzzle(m.x + dx * 1.5, m.y, dx, dy, 0.3); sfx.mg();
      }
      if (HL.cdR <= 0) {
        HL.cdR = 1.1 * st.reload;
        for (const s of [-1, 1]) ctx.fireProj({ owner: 'player', kind: 'rocket', homing: true, turn: 7, x: m.x, y: m.y - 0.2, z: s * 1.4, vx: dx * 30, vy: dy * 30, g: 2, dmg: 40 * st.dmg, splash: 3.6, size: 0.9 });
        sfx.rocket();
      }
    }
  }
  function boatControl(dt, auto = null) {
    const st = ctx.stats();
    if (!auto) {
      const input = (ctx.down('ArrowRight', 'KeyD') ? 1 : 0) - (ctx.down('ArrowLeft', 'KeyA') ? 1 : 0);
      if (ctx.down('ArrowUp', 'KeyW')) P.aim = Math.min(1.1, P.aim + dt * 0.9);
      if (ctx.down('ArrowDown', 'KeyS')) P.aim = Math.max(-0.12, P.aim - dt * 0.9);
      if (input) BT.facing = input;
      BT.vx = lerp(BT.vx, input * 8, dt * 1.4);
      BT.x = clamp(BT.x + BT.vx * dt, BT.min, BT.max);
    }
    const y = world.waterY - 0.5 + Math.sin(G.t * 1.8) * 0.08;
    boatM.root.position.set(BT.x, y, lerp(boatM.root.position.z, auto ? 3.2 : 0, dt * 1.5));
    boatM.body.rotation.y = BT.facing > 0 ? 0 : Math.PI;
    boatM.root.rotation.z = Math.sin(G.t * 1.3) * 0.025 - BT.vx * BT.facing * 0.004;
    boatM.gunPivot.rotation.z = P.aim;
    if (Math.abs(BT.vx) > 1 && Math.random() < dt * 25) fx.dustPuff(BT.x - BT.facing * 4.5, world.waterY + 0.1, '#e9f4f6', 1.1, -BT.vx * 0.4);
    P.x = BT.x; P.y = y - 0.2; P.vx = BT.vx; P.facing = BT.facing;
    sfx.engine(Math.abs(BT.vx) + 3, true);
    if (auto) return;
    BT.cd -= dt;
    if ((ctx.down('Space') || ctx.isFiring()) && BT.cd <= 0) {
      boatM.root.updateMatrixWorld(true);
      const m = boatM.muzzle.getWorldPosition(new THREE.Vector3());
      const dx = BT.facing * Math.cos(P.aim), dy = Math.sin(P.aim);
      if (P.wi === 1) {
        BT.cd = 0.09;
        ctx.fireProj({ owner: 'player', kind: 'bullet', x: m.x, y: m.y, vx: dx * 85, vy: dy * 85, g: 1.5, dmg: 8 * st.dmg, splash: 0 });
        fx.muzzle(m.x, m.y, dx, dy, 0.3); sfx.mg();
      } else {
        BT.cd = 1.0 * st.reload;
        ctx.fireProj({ owner: 'player', kind: 'shell', x: m.x, y: m.y, vx: dx * 50, vy: dy * 50, g: 9.8, dmg: 65 * st.dmg, splash: 3.6, size: 1 });
        fx.muzzle(m.x, m.y, dx, dy, 0.9); sfx.cannon(); G.shake = Math.max(G.shake, 0.2);
      }
    }
  }
  function* heliAuto(x, y, z, dur, facing = 1) {
    const x0 = HL.x, y0 = HL.y, z0 = HL.z; let t = 0;
    HL.facing = facing;
    while (t < dur) { t += dtNow; const k = ease(Math.min(1, t / dur)); const px = HL.x; HL.x = lerp(x0, x, k); HL.vx = (HL.x - px) / Math.max(dtNow, 1e-3); HL.y = lerp(y0, y, k); HL.z = lerp(z0, z, k); heliControl(dtNow, true); yield; }
    HL.vx = 0;
  }
  function* rotorTo(v, dur) { const v0 = HL.rotor; let t = 0; while (t < dur) { t += dtNow; HL.rotor = lerp(v0, v, Math.min(1, t / dur)); heliControl(dtNow, true); yield; } }
  function* boatAuto(x, dur) { const x0 = BT.x; let t = 0; while (t < dur) { t += dtNow; const k = ease(Math.min(1, t / dur)); const px = BT.x; BT.x = lerp(x0, x, k); BT.vx = (BT.x - px) / Math.max(dtNow, 1e-3); boatControl(dtNow, true); yield; } BT.vx = 0; }
  function* stopTank() { G.lockInput = true; yield* until(() => Math.abs(P.vx) < 0.25); yield* wait(0.3); }
  function* exitTank() {
    mode = 'cut'; G.ceasefire = true; ctx.setTankUI(false);
    camHero(11, 3);
    heroAt(P.x - 0.4, P.y + 3.3, 0.55);
    yield* wait(0.4);
    yield* jumpTo(P.x - 1.6, ground(P.x - 1.6), 2.3, 0.6);
  }
  function enterTank(x, xMax) {
    hero.root.visible = false;
    tank.root.visible = true;
    P.x = x; P.vx = 0; P.facing = 1; P.y = ground(x); P.vehicle = 'tank';
    G.xMin = x - 12; G.xMax = xMax; G.lockInput = false; G.ceasefire = false;
    mode = 'tank'; lastVeh = 'tank'; camTarget = null; ctx.setTankUI(true);
    G.camX = P.x + 8; G.camY = P.y + 5;
  }

  const MSG1 = `<b>إذا تريد تكمّل هالمود 🔥</b><br>تابع صفحة المبرمج <b>إبراهيم</b> على تليجرام<br><a href="https://t.me/ibraprogram">t.me/ibraprogram</a><br><br>وإذا عندك اقتراحات تكدر تكتبها هناك…<br>وأني أدري شنو راح تقترح، لأن كلها براسي 😄<br><b>بس أحب أشوف منكم آراء ❤️</b>`;
  const MSG2 = `<b>أدري بيك… 😏</b><br>هذا الشي إنت متخيّله<br>وتريد تكتبه بالاقتراحات!<br><br>وإذا مو هالشي…<br><b>روح اكتبه واقترح عليّ شنو أسوي 😉</b><br><a href="https://t.me/ibraprogram">t.me/ibraprogram</a>`;
  const MSG3 = `<b>لا تنسى… 🤍</b><br>كل هالشي <b>مجاني</b> — لا عبالك بفلوس 😄<br>المهم <b>الدعاء بظهر الغيب</b> 🤲<br><br><span class="sig">إبراهيم الخزرجي برمجني وطوّرني</span>`;

  function* script() {
    // ===== 1) Tank
    enterTank(8, SP.flag1);
    plan(45, SP.flag1 - 40, 26, [[150, 'jeep'], [235, 'apc']]);
    ctx.banner('المرحلة الخاصة', 'من تمل من هاي اللعبة… تعال هنا 😉', 'بغداد · نهار');
    setObj('🎬 تقدّم بالدبابة وقاتل حتى توصل للعلم العراقي');
    yield* until(() => P.x >= SP.flag1 - 4 && near() === 0);
    yield* stopTank();
    // ===== 2) Walk to the tower, elevator to the roof
    yield* exitTank();
    setObj('🏢 المقاتل نزل من الدبابة… رايح للمصعد');
    const [sx, sz] = shaftW();
    yield* walkTo(sx, 2.3);
    yield* walkTo(sx, sz + 0.2, 2.2);
    hero.body.rotation.y = -Math.PI / 2;
    camTarget = { fn: () => [sx + 4, H.y + 3, sz + 16, sx, H.y + 1.5, sz], k: 2.5 };
    setObj('🛗 المصعد يصعد للسطح…');
    const cab = tower.cabin, base = tower.g.position.y;
    let t = 0; const dur = 6.5;
    sfx.ping();
    while (t < dur) { t += dtNow; const k = ease(Math.min(1, t / dur)); cab.position.y = 0.05 + k * tower.H; H.y = base + cab.position.y + 0.08; hero.root.position.y = H.y; yield; }
    sfx.ping();
    yield* wait(0.3);
    const ry = () => roofY() + 0.02;
    camTarget = { fn: () => [H.x + 2, H.y + 4, H.z + 15, H.x + 2, H.y + 1, H.z - 2], k: 2.2 };
    yield* walkTo(sx, TZ + 4.2, 2.4, ry);
    yield* walkTo(TX + tower.door[0] + 0.6, TZ + 4.2, 2.4, ry);
    setObj('🚁 طلع من باب السطح… للطيارة!');
    yield* walkTo(HL.x - 0.5, HL.z + 1.6, 3.4, ry);
    hero.root.visible = false;
    // ===== 3) Helicopter
    yield* rotorTo(1, 2.2);
    yield* heliAuto(HL.x + 4, HL.y + 6, HL.z, 2.0);
    tank.root.position.set(SP.tank2, ground(SP.tank2), 0); tank.setFacing(1); tank.setAim(0.1);
    mode = 'heli'; lastVeh = 'heli'; P.vehicle = 'heli'; G.ceasefire = false; camTarget = null;
    HL.min = SP.bx - 10; HL.max = SP.pad1 + 6; HL.alt = 13;
    plan(SP.bx + 30, SP.pad1 - 50, 24, [[420, 'jeep'], [470, 'heli'], [540, 'truck'], [590, 'heli'], [610, 'apc']]);
    ctx.toast('🚁 الأسهم للحركة والارتفاع · Space رشاش + صواريخ موجّهة', 'gold');
    setObj('🚁 قاتل بالطيارة وتقدّم لمهبط الطائرات <span class="dist">H</span>');
    yield* until(() => HL.x >= SP.pad1 - 16 && near(50) === 0);
    mode = 'cut'; G.ceasefire = true;
    setObj('🛬 الهبوط…');
    camTarget = { fn: () => [HL.x, HL.y + 3, HL.z + 30, HL.x, HL.y - 1, 0], k: 1.8 };
    yield* heliAuto(SP.pad1, ground(SP.pad1) + 1.75, 0, 3.2, 1);
    yield* rotorTo(0.15, 1.5);
    // ===== 4) The message
    heroAt(SP.pad1 + 0.5, ground(SP.pad1), 1.3);
    camHero(10, 2.6);
    yield* walkTo(SP.pad1 + 5, 3.0, 2.6);
    faceCam();
    camHero(8.5, 2.4, 0, 2.3);
    const armR0 = hero.armR.rotation.z, armL0 = hero.armL.rotation.z;
    hero.armR.rotation.z = 2.8; hero.armL.rotation.z = 2.8;
    sfx.scream(); sfx.scream();
    yield* say('<b class="yell">اسمعوووني زيييين!! 📢</b>', { time: 2.2, shout: true });
    hero.armR.rotation.z = armR0; hero.armL.rotation.z = armL0;
    setObj('📢 رسالة من المبرمج…');
    yield* say(MSG1, { hold: 5, big: true });
    // ===== 5) Tank again
    yield* walkTo(SP.tank2 - 3, 2.2);
    yield* walkTo(SP.tank2 - 1, 0.6);
    enterTank(SP.tank2, SP.flag2);
    plan(SP.tank2 + 40, SP.flag2 - 40, 24, [[780, 'apc'], [860, 'tank'], [900, 'jeep']]);
    setObj('🎯 رجعنا للدبابة! قاتل حتى العلم الثاني');
    yield* until(() => P.x > SP.tank2 + 60);
    placeHeli(SP.pad2, ground(SP.pad2) + 1.75, 0, 1); HL.rotor = 0.15;
    yield* until(() => P.x >= SP.flag2 - 4 && near() === 0);
    yield* stopTank();
    // ===== 6) Helicopter again
    yield* exitTank();
    setObj('🚁 للطيارة مرة ثانية!');
    yield* walkTo(SP.pad2 - 1.2, 2.0, 3.6);
    hero.root.visible = false;
    yield* rotorTo(1, 1.8);
    yield* heliAuto(SP.pad2 + 4, ground(SP.pad2) + 11, 0, 2.2);
    mode = 'heli'; lastVeh = 'heli'; P.vehicle = 'heli'; G.ceasefire = false; camTarget = null;
    HL.min = SP.pad2 - 10; HL.max = SP.pad3 + 6; HL.alt = 11;
    tank.root.position.set(SP.tank3, ground(SP.tank3), 0); tank.setFacing(1);
    plan(SP.pad2 + 30, SP.pad3 - 45, 22, [[1060, 'heli'], [1110, 'jeep'], [1160, 'heli'], [1180, 'apc']]);
    setObj('🚁 قاتل وتقدّم نحو النهر');
    yield* until(() => HL.x >= SP.pad3 - 16 && near(50) === 0);
    mode = 'cut'; G.ceasefire = true;
    camTarget = { fn: () => [HL.x, HL.y + 3, HL.z + 30, HL.x, HL.y - 1, 0], k: 1.8 };
    yield* heliAuto(SP.pad3, ground(SP.pad3) + 1.75, 0, 3, 1);
    yield* rotorTo(0.15, 1.2);
    // ===== 7) The river — close-up
    heroAt(SP.pad3 + 0.5, ground(SP.pad3), 1.3);
    camHero(10, 2.6);
    setObj('🌊 وصلنا للنهر…');
    yield* walkTo(SP.cross[0] - 4, 2.6, 2.4);
    faceCam();
    camHero(6.5, 2.3, 1.2, 2.35);
    yield* wait(1.2);
    yield* say(MSG2, { click: true, big: true });
    // ===== 8) Boat
    camHero(12, 3.5);
    yield* walkTo(SP.cross[0] + 4, 3.2, 3, () => world.waterY + 1.05);
    yield* jumpTo(BT.x - 1, world.waterY + 1.1, 3.2, 0.5);
    hero.root.visible = false;
    mode = 'boat'; lastVeh = 'boat'; P.vehicle = 'boat'; G.ceasefire = false; camTarget = null;
    BT.min = SP.cross[0] + 6; BT.max = SP.cross[1] - 8; P.aim = 0.08; P.wi = 0;
    plan(99999, 99999, 1, [[SP.cross[0] + 40, 'gunboat'], [SP.cross[0] + 80, 'gunboat'], [SP.cross[0] + 120, 'ship'], [SP.cross[0] + 165, 'gunboat'], [SP.cross[0] + 200, 'gunboat'], [SP.cross[0] + 230, 'ship']]);
    ctx.toast('🚤 ← → حركة · ↑ ↓ المدفع · Space رمي · 1 مدفع · 2 رشاش', 'gold');
    setObj('🚤 اركب القارب واضرب السفن والزوارق لحد الضفة الثانية');
    yield* until(() => BT.x >= SP.cross[1] - 14 && near(60) === 0);
    mode = 'cut'; G.ceasefire = true;
    yield* boatAuto(SP.cross[1] - 3, 3);
    // ===== 9) Farewell
    heroAt(BT.x, world.waterY + 1.1, 3.2);
    hero.root.visible = true;
    camHero(10, 3);
    yield* jumpTo(SP.cross[1] + 2, world.waterY + 1.05, 3.2, 0.5);
    yield* walkTo(SP.cross[1] + 6, 3.2, 3, () => world.waterY + 1.05);
    yield* walkTo(SP.bank2, 2.4, 3);
    hero.body.rotation.y = 0;
    yield* wait(0.5);
    faceCam();
    camHero(6.5, 2.3, -1.2, 2.35);
    yield* wait(1.0);
    setObj('🤍');
    yield* say(MSG3, { click: true, big: true });
    hero.body.rotation.y = 0;
    camHero(11, 3.2);
    yield* walkTo(SP.tank3 - 2, 1.0, 3);
    hero.root.visible = false;
    // ===== 10) Drive off, camera rises, credits
    enterTank(SP.tank3, SP.end + 60);
    G.lockInput = true; G.autoDrive = true; G.ceasefire = true;
    mode = 'cut';
    let rise = 0;
    camTarget = { fn: () => [P.x - 6, P.y + 6 + rise * 60, 32 + rise * 50, P.x + 6, P.y + 2 + rise * 10, 0], k: 1.2 };
    setObj('❤️ شكراً');
    ctx.setTankUI(false);
    ctx.creditsShow(credits);
    for (;;) { rise = Math.min(1, rise + dtNow * 0.05); ctx.updatePlayer(dtNow); yield; }
  }

  const gen = script();
  const api = {
    dbg() { return { mode, hl: Math.round(HL.x), bt: Math.round(BT.x), hero: [Math.round(H.x), Math.round(H.y), Math.round(H.z)], bubble: bubble.className, cam: !!camTarget }; },
    update(dt) {
      dtNow = dt;
      for (const f of anims) f(dt);
      if (mode === 'tank') ctx.updatePlayer(dt);
      else if (mode === 'heli') heliControl(dt);
      else if (mode === 'boat') boatControl(dt);
      else { ctx.hideTraj(); if (HL.rotor > 0 && mode === 'cut') { heli.rotor.rotation.y += dt * 30 * HL.rotor; heli.tailRotor.rotation.z += dt * 40 * HL.rotor; } }
      if (mode !== 'tank') ctx.hideTraj();
      if (P.hp < 1) P.hp = 1;
      if (mode === 'heli' || mode === 'boat' || mode === 'cut') { P.hitT += dt; const mx = ctx.stats().maxHp; if (P.hitT > 3 || mode === 'cut') P.hp = Math.min(mx, P.hp + dt * (mode === 'cut' ? mx * 0.3 : 8 + mx * 0.02)); }
      for (const f of flags) f.wave(G.t);
      gen.next();
      placeBubble();
    },
    camera(dt) {
      if (mode === 'tank' && !camTarget) { ctx.updateCamera(dt); camPos.copy(camera.position); camLook.set(G.camX, G.camY - 0.6, 0); return; }
      let px, py, pz, lx, ly, lz, k = 2.2;
      if (camTarget) { [px, py, pz, lx, ly, lz] = camTarget.fn(); k = camTarget.k; }
      else if (mode === 'heli' || lastVeh === 'heli') { const gy = ground(HL.x); const mid = (HL.y + gy) / 2 + 1; const ax = HL.x + HL.facing * 9 + HL.vx * 0.5; px = ax; py = mid + 4; pz = 46; lx = ax; ly = mid; lz = 0; }
      else if (lastVeh === 'tank') { const ax = P.x + 6; px = ax; py = P.y + 8; pz = 36; lx = ax; ly = P.y + 2; lz = 0; }
      else { const ax = BT.x + BT.facing * 9 + BT.vx * 0.6; px = ax; py = world.waterY + 8.5; pz = 36; lx = ax; ly = world.waterY + 3; lz = 0; }
      const a = 1 - Math.exp(-k * dt);
      camPos.x = lerp(camPos.x, px, a); camPos.y = lerp(camPos.y, py, a); camPos.z = lerp(camPos.z, pz, a);
      camLook.x = lerp(camLook.x, lx, a); camLook.y = lerp(camLook.y, ly, a); camLook.z = lerp(camLook.z, lz, a);
      G.shake = Math.max(0, G.shake - dt * 2.2);
      const s = G.shake * G.shake;
      camera.position.set(camPos.x + (Math.random() - 0.5) * s, camPos.y + (Math.random() - 0.5) * s, camPos.z);
      camera.lookAt(camLook);
      G.camX = camLook.x; G.camY = camLook.y;
      world.followSun(camLook.x, camLook.y);
    },
    dispose() {
      scene.remove(grp);
      window.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU);
      bubble.remove(); credits.remove();
    },
  };
  return api;
}
