import * as THREE from 'three';
import { skyTexture, skylineTexture, groundTex, rng } from './textures.js';
import { bake } from './models_hd.js';
import { regionForLevel, buildIraqProp, iraqHouse, landmark, cableSpan, streetSign, billboard, checkpoint, tWalls, taxi, kiaBus, reeds, mudhif, boat, pumpjack, flareStack, oilTank, iraqFlagPole, SHOPS, SLOGANS, streetNames, roadSignLines, pick as pickOne } from './iraq.js';

export const BIOMES = {
  desert: {
    id: 'desert', name: 'صحراء', hills: 1.1,
    ground: ['#d8b47a', '#c9a065', '#e6c792', '#b88c55'], track: '#b8935e',
    skyline: [['dunes', '#d9b07a'], ['dunes', '#c69a62']],
    props: { palm: 5, rock: 2, bush: 3, cactus: 1, wreck: 1, sandbags: 1, barrels: 1, kia: 0.5 },
    uniform: 'desert', enemyTank: 'desert', vehicle: 'desert', weather: 'dust', rock: '#b8956a', bush: '#7e8a46',
    fogTint: '#e8cfa0',
  },
  ruins: {
    id: 'ruins', name: 'منطقة مدمرة', hills: 0.8,
    ground: ['#8c7c62', '#7a6a52', '#9c8b70', '#5e5242'], track: '#5e5040',
    skyline: [['ruins', '#7c6e5c'], ['dunes', '#8e7c62']],
    props: { wreck: 3, ruin: 4, sandbags: 2, barbed: 2, rock: 1, debris: 3, pole: 1, barrels: 1, taxi: 1, kia: 1 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: 'ash', smoke: true, rock: '#7c6e5c', bush: '#5e5a3a',
    fogTint: '#a89a84',
  },
  city: {
    id: 'city', name: 'مدينة', hills: 0.35,
    ground: ['#6e6862', '#5e5852', '#7c766e', '#4a4540'], track: '#3e3a36',
    skyline: [['city', '#4e4b4a'], ['city', '#66625e']],
    props: { building: 4, ruin: 2, wreck: 1, debris: 2, palm: 2, barrels: 1, sandbags: 1, taxi: 2, kia: 1 },
    uniform: 'urban', enemyTank: 'urban', vehicle: 'urban', weather: null, rock: '#6e6862', bush: '#4e5a34',
    fogTint: '#8c8680',
  },
  countryside: {
    id: 'countryside', name: 'ريف', hills: 1.3,
    ground: ['#6d8f43', '#5c7d36', '#7fa050', '#8a7a4c'], track: '#7a6542',
    skyline: [['hills', '#4f6e3a'], ['mountains', '#6c8a6a']],
    props: { tree: 4, house: 2, palm: 4, fence: 2, bush: 4, rock: 1 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: null, leaf: '#4d6e2a', rock: '#8a8a7a', bush: '#4e6e2a',
    fogTint: '#b8cfc0',
  },
  palms: {
    id: 'palms', name: 'بساتين النخيل', hills: 0.7,
    ground: ['#8f8158', '#7c6f4a', '#a09064', '#6a5c3c'], track: '#7a6542',
    skyline: [['hills', '#55703a'], ['dunes', '#a58f68']],
    props: { palm: 10, house: 2, bush: 2, fence: 1, barrels: 0.5 },
    uniform: 'desert', enemyTank: 'desert', vehicle: 'desert', weather: null, leaf: '#4f7a2a', rock: '#9a8a6a', bush: '#5e7a34',
    fogTint: '#d8c8a0',
  },
  marsh: {
    id: 'marsh', name: 'أهوار', hills: 0.25,
    ground: ['#6f7a4a', '#5f6a3e', '#7f8a56', '#4f5a34'], track: '#6a5e3e',
    skyline: [['hills', '#7c8a5a'], ['dunes', '#a0a080']],
    props: { reeds: 8, palm: 1, bush: 2 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: null, rock: '#7a7a6a', bush: '#5a6e34',
    fogTint: '#c8d0b8',
  },
  mountains: {
    id: 'mountains', name: 'جبال', hills: 1.8,
    ground: ['#7f7a5a', '#6e6a4c', '#8f8a68', '#5e5a40'], track: '#6e5e44',
    skyline: [['mountains', '#6a7a6a'], ['mountains', '#8a9aa0']],
    props: { rock: 4, tree: 4, bush: 3, pine: 1, house: 1 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: null, leaf: '#3f5e2a', rock: '#7c7468', bush: '#4e6a2e',
    fogTint: '#c0ccc8',
  },
  ice: {
    id: 'ice', name: 'ثلوج', hills: 1.2,
    ground: ['#eef3f7', '#dce6ee', '#f8fbfd', '#c6d4e0'], track: '#b9c6d2',
    skyline: [['snow', '#8fa3b8'], ['snow', '#aebfd0']],
    props: { pine: 6, rock: 2, snowman_rock: 3, wreck: 1, house: 1 },
    uniform: 'winter', enemyTank: 'winter', vehicle: 'winter', weather: 'snow', rock: '#7c8894', bush: '#5a6e5a',
    fogTint: '#dfe8f0',
  },
};

export const TIMES = {
  dawn: { name: 'فجر', skyTop: '#33416e', skyMid: '#d98c6a', skyBottom: '#f6d3a2', sun: { x: 0.2, y: 0.62, color: '#ffb070', size: 22 }, sunPos: [-60, 25, 40], sunColor: '#ffbf8a', sunI: 2.0, hemiSky: '#9aa6d0', hemiGround: '#7a5a42', hemiI: 0.75, fog: '#e6b996', fogNear: 70, fogFar: 380, exposure: 1.0, clouds: 'rgba(255,200,170,0.45)' },
  day: { name: 'نهار', skyTop: '#2f72c4', skyMid: '#7fb4e6', skyBottom: '#d7e7f3', sun: { x: 0.3, y: 0.18, color: '#fff3c8', size: 20 }, sunPos: [-30, 60, 40], sunColor: '#fff2dc', sunI: 3.0, hemiSky: '#bcd6f0', hemiGround: '#8a7a5a', hemiI: 1.0, fog: '#cfdeea', fogNear: 90, fogFar: 450, exposure: 1.0, clouds: 'rgba(255,255,255,0.7)' },
  noon: { name: 'ظهر', skyTop: '#4d8fd8', skyMid: '#a9cbe8', skyBottom: '#f1e8d2', sun: { x: 0.5, y: 0.06, color: '#ffffff', size: 24 }, sunPos: [-8, 80, 25], sunColor: '#fffaf0', sunI: 3.6, hemiSky: '#d6e6f6', hemiGround: '#a08a62', hemiI: 1.15, fog: '#ecdfc2', fogNear: 70, fogFar: 380, exposure: 1.05, clouds: 'rgba(255,255,255,0.45)' },
  sunset: { name: 'غروب', skyTop: '#241f45', skyMid: '#c4523b', skyBottom: '#f3a65a', sun: { x: 0.75, y: 0.66, color: '#ff8a40', size: 30 }, sunPos: [60, 18, 30], sunColor: '#ff9a5a', sunI: 2.2, hemiSky: '#8a6aa0', hemiGround: '#6a3a2a', hemiI: 0.7, fog: '#d0805a', fogNear: 60, fogFar: 340, exposure: 1.0, clouds: 'rgba(255,150,100,0.5)' },
  night: { name: 'ليل', skyTop: '#02040c', skyMid: '#0b1736', skyBottom: '#22335a', stars: true, moon: true, sunPos: [30, 55, 45], sunColor: '#9fb4ff', sunI: 1.5, hemiSky: '#6a7cb8', hemiGround: '#2a2a34', hemiI: 0.9, fog: '#101a30', fogNear: 60, fogFar: 300, exposure: 1.35, night: true },
};

export function levelEnv(level) {
  const region = regionForLevel(level);
  const time = TIMES[region.time] || TIMES.day;
  region.night = !!time.night;
  return { biome: BIOMES[region.base] || BIOMES.desert, time, region };
}

const _wp = new THREE.Vector3();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.hemi = new THREE.HemisphereLight('#fff', '#888', 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 30; sc.bottom = -20; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun); scene.add(this.sun.target);
    this.weather = null;
    this.smokeEmitters = [];
    this.groundMap = groundTex();
    this.groundMap.wrapS = this.groundMap.wrapT = THREE.RepeatWrapping;
    this.groundMap.repeat.set(60, 6);
  }

  heightAt(x) {
    const s = this.seeds, h = this.hills;
    let y = h * (1.4 * Math.sin(x * 0.028 + s[0]) + 0.7 * Math.sin(x * 0.071 + s[1]) + 0.22 * Math.sin(x * 0.19 + s[2]));
    // flatten spawn & end area
    let flat = Math.min(1, Math.max(0, (x - 4) / 20)) * Math.min(1, Math.max(0, (this.length + 10 - x) / 20));
    if (this.flatZones) for (const [a, b] of this.flatZones) flat *= 1 - THREE.MathUtils.smoothstep(x, a - 12, a) * (1 - THREE.MathUtils.smoothstep(x, b, b + 12));
    y *= flat;
    if (this.cross) y = y * (1 - this.riverK(x)) - 3.6 * this.riverK(x);
    return y;
  }
  riverK(x) { const [a, b] = this.cross; return THREE.MathUtils.smoothstep(x, a - 5, a + 1) * (1 - THREE.MathUtils.smoothstep(x, b - 1, b + 5)); }
  inRiver(x) { return !!this.cross && x > this.cross[0] - 1 && x < this.cross[1] + 1; }

  farHeight(x, z) {
    const az = Math.abs(z);
    const k = THREE.MathUtils.smoothstep(az, 5, 40);
    const b = this.biome.id === 'city' ? 0.4 : this.biome.id === 'mountains' ? 1.8 : 1;
    const rk = this.cross ? 1 - this.riverK(x) : 1;
    let y = rk * k * b * (3.5 * Math.sin(x * 0.05 + z * 0.08 + this.seeds[3]) + 2.2 * Math.sin(x * 0.013 - z * 0.05) + 1.5 * Math.sin(z * 0.2 + x * 0.11)) * (z < 0 ? 1.4 : 0.35);
    if (this.water === 'river') {
      const w = THREE.MathUtils.smoothstep(-z, 11, 15) * (1 - THREE.MathUtils.smoothstep(-z, 30, 35));
      y = y * (1 - w) - 3.2 * w - this.heightAt(x) * w;
    } else if (this.water === 'marsh') {
      const w = THREE.MathUtils.smoothstep(az, 4.5, 8);
      const island = Math.max(0, Math.sin(x * 0.045 + z * 0.11 + this.seeds[2]) * Math.sin(z * 0.07 - x * 0.02)) * 3.2;
      y = y * (1 - w) * 0.3 + w * (-2.2 + island) - this.heightAt(x) * w;
    }
    return y;
  }
  groundY(x, z) { return this.heightAt(x) + this.farHeight(x, z); }

  build(level, length, seed, override = null) {
    this.clear();
    const { biome, time, region } = override || levelEnv(level);
    this.sea = !!override?.sea;
    this.cross = override && override.cross || null;
    this.flatZones = override && override.flatZones || null;
    this.biome = biome; this.time = time; this.length = length; this.region = region;
    const F = new Set(region.features || []);
    this.water = F.has('marsh') ? 'marsh' : F.has('river') ? 'river' : null;
    this.waterY = this.water === 'marsh' ? -0.75 : -1.3;
    if (this.cross) this.waterY = -1.1;
    this.animated = []; this.flags = [];
    const r = rng(seed);
    this.seeds = [r() * 6, r() * 6, r() * 6, r() * 6];
    this.hills = biome.hills;

    const scene = this.scene;
    scene.background = skyTexture(time);
    const fogCol = new THREE.Color(time.fog).lerp(new THREE.Color(biome.fogTint), time.night ? 0.08 : 0.35);
    scene.fog = new THREE.Fog(fogCol, time.fogNear, time.fogFar);
    this.hemi.color.set(time.hemiSky); this.hemi.groundColor.set(time.hemiGround); this.hemi.intensity = time.hemiI;
    this.sun.color.set(time.sunColor); this.sun.intensity = time.sunI;
    this.sunOffset = new THREE.Vector3(...time.sunPos);

    // --- ground mesh
    const x0 = -120, x1 = length + 160, z0 = -150, z1 = 120;
    const segX = Math.min(900, Math.floor((x1 - x0) / 1.5)), segZ = 72;
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cols = biome.ground.map(c => new THREE.Color(c));
    const track = new THREE.Color(biome.track);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // non-uniform z spacing: compress near the gameplay lane
      const y = this.heightAt(x) + this.farHeight(x, z);
      pos.setY(i, y);
      const n = (Math.sin(x * 0.13 + z * 0.31) + Math.sin(x * 0.037 - z * 0.09) * 1.3 + Math.sin(z * 0.6 + x * 0.02)) / 3.3;
      const n2 = (Math.sin(x * 0.7 + z * 1.3) * 0.5 + 0.5);
      tmp.copy(cols[0]).lerp(cols[1], THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1)).lerp(cols[2], n2 * 0.25);
      if (Math.abs(z) < 2.6) tmp.lerp(track, 0.45 * (1 - Math.abs(z) / 2.6) + 0.15);
      if (y > 3 && biome.id !== 'ice') tmp.lerp(cols[3], Math.min(0.5, (y - 3) * 0.08));
      if (this.water && y < this.waterY + 0.6) tmp.lerp(new THREE.Color('#4a4430'), 0.55);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.groundMap.repeat.set((x1 - x0) / 8, (z1 - z0) / 8);
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.groundMap, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(geo, gm);
    ground.receiveShadow = true;
    this.group.add(ground);

    // --- tread marks strip slightly above ground on the lane (darker)
    // skyline layers
    const skyMix = new THREE.Color(time.skyBottom).lerp(fogCol, 0.5);
    (region.skyline || biome.skyline).forEach(([type, color], i) => {
      const c = new THREE.Color(color).lerp(skyMix, time.night ? 0.72 + i * 0.1 : 0.38 + i * 0.22);
      if (time.night) c.multiplyScalar(0.55);
      const tex = skylineTexture(type, '#' + c.getHexString(), seed + i * 17);
      const W = 3000, H = i === 0 ? 120 : 190;
      tex.repeat.set(i === 0 ? 3 : 2, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
      m.position.set(length / 2, H / 2 - 48 - i * 8, -240 - i * 150);
      m.renderOrder = -10 + i;
      this.group.add(m);
    });

    // --- water (دجلة والفرات / الأهوار)
    if (this.water) {
      const wm = new THREE.MeshPhongMaterial({ color: time.night ? '#1a2a40' : this.water === 'marsh' ? '#4f7a72' : '#3f6f86', specular: '#ffffff', shininess: 90, transparent: true, opacity: 0.88 });
      const bands = this.water === 'river' ? [[-36, -10]] : [[-150, -4.6], [4.6, z1]];
      for (const [za, zb] of bands) {
        const wg = new THREE.PlaneGeometry(x1 - x0, zb - za); wg.rotateX(-Math.PI / 2);
        const water = new THREE.Mesh(wg, wm); water.position.set((x0 + x1) / 2, this.waterY, (za + zb) / 2); water.receiveShadow = true;
        this.group.add(water);
      }
      this.waterMat = wm;
    }

    if (this.cross) {
      const [a, b] = this.cross;
      const wm2 = new THREE.MeshPhongMaterial({ color: time.night ? '#1a2a40' : '#3f6f86', specular: '#ffffff', shininess: 90, transparent: true, opacity: 0.9 });
      const wg = new THREE.PlaneGeometry(b - a + 16, z1 - z0, Math.min(260, Math.ceil((b - a) / 4)), 32); wg.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(wg, wm2); water.position.set((a + b) / 2, this.waterY, (z0 + z1) / 2); water.receiveShadow = true; this.group.add(water);
      this.waterMat = wm2;
      const points = wg.attributes.position;
      this.animated.push(t => {
        for (let i = 0; i < points.count; i++) {
          const x = points.getX(i), z = points.getZ(i);
          points.setY(i, Math.sin(x * 0.16 + t * 1.7) * 0.09 + Math.sin(z * 0.35 + x * 0.08 - t) * 0.055);
        }
        points.needsUpdate = true; wg.computeVertexNormals();
      });
    }

    // --- props
    const weightsObj = { ...biome.props, ...(region.props || {}) };
    if (F.has('oil')) Object.assign(weightsObj, { pump: 2, oiltank: 1 });
    const weights = Object.entries(weightsObj).filter(([, w]) => w > 0);
    const total = weights.reduce((a, b) => a + b[1], 0);
    const pick = () => { let v = r() * total; for (const [k, w] of weights) { v -= w; if (v <= 0) return k; } return weights[0][0]; };
    const isWet = (x, z) => (this.water || this.cross) && this.groundY(x, z) < this.waterY + 0.6;
    const add = (obj, x, z, yOff = 0) => {
      if (this.sea && Math.abs(z) < 12) { obj.visible = false; }
      if (!obj.userData.noBake) bake(obj);
      obj.position.set(x, this.groundY(x, z) - 0.05 + yOff, z);
      this.group.add(obj);
      obj.traverse(o => { if (o.userData.update) this.animated.push(o.userData.update); if (o.userData.flags) this.flags.push(...o.userData.flags); });
      return obj;
    };
    const place = (x, z, kind, scale = 1) => {
      if (isWet(x, z) && kind !== 'reeds' && kind !== 'boat') return null;
      const p = buildIraqProp(kind, r, biome, region);
      p.rotation.y = (kind === 'ruin' || kind === 'building' || kind === 'house' || kind === 'pump' || kind === 'taxi' || kind === 'kia') ? (r() - 0.5) * 0.4 : r() * Math.PI * 2;
      p.scale.setScalar(scale);
      return add(p, x, z);
    };
    const reserved = [], lmXs = [];
    const isReserved = (x) => reserved.some(([a, b]) => x > a && x < b);

    const T0 = performance.now(); this.perf = {};
    // --- landmarks (معالم العراق)
    const LM = ['hadba', 'malwiya', 'ziggurat', 'ishtar', 'citadel', 'tower', 'freedom', 'dalal'].filter(k => F.has(k));
    for (const k of LM) {
      const conf = { hadba: [-48, 220, 1], malwiya: [-95, 300, 1], ziggurat: [-80, 280, 1], ishtar: [-38, 240, 1], citadel: [-120, 360, 1], tower: [-170, 420, 1], freedom: [-58, 260, 1], dalal: [-22, 230, 1] }[k];
      for (let x = 70; x < length + 60; x += conf[1]) {
        const lm = landmark(k, r);
        lm.scale.setScalar(conf[2]);
        const z = conf[0];
        let y = this.groundY(x, z);
        if (k === 'dalal') y = this.waterY - 0.2;
        bake(lm); lm.position.set(x, y - 0.3, z); lmXs.push([x, k === 'citadel' ? 70 : k === 'tower' ? 25 : 40]);
        this.group.add(lm);
        lm.traverse(o => { if (o.userData.flags) this.flags.push(...o.userData.flags); });
        if (z > -60) reserved.push([x - (k === 'freedom' ? 32 : 26), x + (k === 'freedom' ? 32 : 26)]);
      }
    }

    this.perf.lm = performance.now() - T0;
    // --- start: Iraqi army checkpoint (سيطرة)
    add(checkpoint(), -4, -1.2);

    // --- streets: Iraqi houses with shops, signs, generator cables
    if (F.has('street')) {
      const damaged = !!region.damaged || biome.id === 'ruins';
      const names = streetNames(region);
      let x = -60, lastPole = null, si = 0;
      while (x < length + 120) {
        if (isReserved(x + 4)) { x += 6; lastPole = null; continue; }
        const shop = r() < (damaged ? 0.45 : 0.8) ? pickOne(r, SHOPS) : null;
        const h = iraqHouse(r, { shop, night: region.night, damaged: damaged && r() < 0.7, shanasheel: F.has('shanasheel') && r() < 0.55, floors: 1 + Math.floor(r() * 3) });
        const w = h.userData.w, d = h.userData.d;
        const cx = x + w / 2, z = -(4.2 + d / 2);
        h.position.set(cx, Math.min(this.groundY(x, z), this.groundY(x + w, z), this.groundY(cx, z)) - 0.1, z);
        bake(h); this.group.add(h);
        h.traverse(o => { if (o.userData.flags) this.flags.push(...o.userData.flags); });
        x += w + (r() < 0.18 ? 4 + r() * 6 : 0.05);
        // generator wires & poles in front of houses
        if (lastPole === null || x - lastPole > 18 + r() * 10) {
          const len = 20;
          const c = cableSpan(len, r); add(c, x, -3.4); lastPole = x;
        }
        if (r() < 0.1) { const s = streetSign(names[si++ % names.length]); add(s, x, -2.9); }
      }
      // second row: taller buildings
      for (let x2 = -60; x2 < length + 140;) {
        const nearLM = lmXs.some(([lx, rad]) => Math.abs(x2 - lx) < rad);
        const h = iraqHouse(r, { floors: (nearLM ? 1 : 2) + Math.floor(r() * (nearLM ? 2 : 4)), night: region.night, damaged: damaged && r() < 0.6, shanasheel: F.has('shanasheel') && r() < 0.3 });
        const w = h.userData.w;
        if (!isReserved(x2 + w / 2)) { const z = -(19 + r() * 6); h.position.set(x2 + w / 2, this.groundY(x2 + w / 2, z) - 0.3, z); bake(h); this.group.add(h); }
        x2 += w + 1 + r() * 6;
      }
    }

    this.perf.street = performance.now() - T0;
    // --- background band
    for (let x = x0; x < x1; x += (F.has('street') ? 14 : 7) + r() * 9) {
      const z = -(F.has('street') ? 30 : 10) - r() * 70;
      if (isReserved(x) && z > -60) continue;
      place(x, z, pick(), 0.9 + r() * 0.5);
    }
    // --- mid band right behind the lane (non-street regions)
    if (!F.has('street')) {
      for (let x = 10; x < length + 60; x += 14 + r() * 18) {
        let k = pick();
        if (k === 'building') k = r() < 0.5 ? 'ruin' : 'house';
        if (k === 'pump' || k === 'oiltank') { place(x, -9 - r() * 4, k, 1); continue; }
        if (isReserved(x)) continue;
        place(x, -5.5 - r() * 4, k, 0.8 + r() * 0.3);
      }
    }
    // --- foreground (near camera) small things
    const fg = ['rock', 'bush', 'debris', 'barrels'].filter(k => biome.props[k] || k === 'rock');
    if (F.has('street')) fg.push('taxi', 'kia', 'taxi', 'barrels');
    if (biome.id === 'marsh') fg.push('reeds', 'reeds', 'reeds');
    if (region.props && region.props.orange) fg.push('orange');
    for (let x = x0 + 20; x < x1; x += 10 + r() * 16) {
      const k = fg[Math.floor(r() * fg.length)];
      place(x, 5 + r() * 9, k, k === 'taxi' || k === 'kia' ? 1 : k === 'reeds' ? 0.45 : 0.7 + r() * 0.5);
    }

    this.perf.bands = performance.now() - T0;
    // --- Iraqi flags along the road & welcome signs
    for (let x = 90; x < length; x += 110 + r() * 60) if (!isReserved(x)) { const f = iraqFlagPole(7.5); add(f.root, x, -3.2); this.flags.push(f); }
    for (const f of this.flags) f.phase = r() * 6;
    const welcome = F.has('street')
      ? billboard([`أهلاً بكم في ${region.name.split(' – ').pop()}`, `محافظة ${region.gov}`, pickOne(r, SLOGANS)], '#1d4f9c')
      : billboard(roadSignLines(region, r), '#0f6b3a');
    add(welcome, 28, -4.6);
    for (let x = 220; x < length - 40; x += 260) add(billboard([pickOne(r, SLOGANS), `محافظة ${region.gov}`], '#7a1f1f'), x, -4.8);

    // --- oil fields (حقول النفط)
    if (F.has('oil')) {
      for (let x = 40; x < length + 80; x += 45 + r() * 50) add(flareStack(), x, -35 - r() * 40);
      for (let x = 20; x < length + 80; x += 30 + r() * 30) add(pumpjack(), x, -14 - r() * 10).rotation.y = (r() - 0.5) * 0.3;
      const pm = new THREE.MeshStandardMaterial({ color: '#8a8a84', metalness: 0.7, roughness: 0.4 });
      const pg = new THREE.CylinderGeometry(0.45, 0.45, x1 - x0, 12); pg.rotateZ(Math.PI / 2);
      const pipe = new THREE.Mesh(pg, pm); pipe.position.set((x0 + x1) / 2, this.groundY(0, -11) + 1.0, -11); pipe.castShadow = true; this.group.add(pipe);
      for (let x = x0; x < x1; x += 12) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.8), pm); s.position.set(x, this.groundY(x, -11) + 0.4, -11); this.group.add(s); }
    }
    // --- marshes: reeds, mudhif, boats
    if (biome.id === 'marsh') {
      for (let i = 0; i < length / 3; i++) { const x = x0 + r() * (x1 - x0), z = -6 - r() * 60; const rd = reeds(r, 30); add(rd, x, z); rd.position.y = Math.max(rd.position.y, this.waterY - 0.6); }
      for (let x = 30; x < length + 60; x += 50 + r() * 50) { const m = mudhif(r); const z = -16 - r() * 18; m.position.set(x, this.waterY + 0.15, z); this.group.add(m); const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1, 20), new THREE.MeshStandardMaterial({ color: '#6a5a3a', roughness: 1 })); base.scale.z = 0.6; base.position.set(x, this.waterY - 0.3, z); this.group.add(base); }
    }
    if (F.has('boats') && this.water) {
      for (let x = 20; x < length + 80; x += 25 + r() * 40) {
        const b = boat(r); const z = this.water === 'river' ? -18 - r() * 12 : (r() < 0.7 ? -8 - r() * 20 : 7 + r() * 8);
        b.position.set(x, this.waterY, z); b.rotation.y = (r() - 0.5) * 0.6; this.group.add(b);
        const off = r() * 6; this.animated.push((t) => { b.position.y = this.waterY + Math.sin(t * 1.5 + off) * 0.06; b.rotation.z = Math.sin(t * 1.1 + off) * 0.03; });
      }
    }
    this.perf.end = performance.now() - T0;
    // smoke columns
    this.smokeEmitters = [];
    if (biome.smoke || region.damaged) {
      for (let x = 30; x < length + 100; x += 40 + r() * 60) this.smokeEmitters.push({ x, z: -15 - r() * 60, t: 0, rate: 0.12 });
    }

    // --- weather particles
    this.setupWeather(biome.weather, time);
  }

  setupWeather(kind, time) {
    if (this.weather) { this.scene.remove(this.weather.points); this.weather.points.geometry.dispose(); this.weather = null; }
    if (!kind) return;
    const N = kind === 'snow' ? 2500 : 1200;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 140; p[i * 3 + 1] = Math.random() * 40; p[i * 3 + 2] = -40 + Math.random() * 60; }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const color = kind === 'snow' ? '#ffffff' : kind === 'ash' ? '#4a4440' : '#d9b88a';
    const m = new THREE.PointsMaterial({ color, size: kind === 'snow' ? 0.22 : 0.14, transparent: true, opacity: kind === 'snow' ? 0.9 : 0.55, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.weather = { points: pts, kind, N };
  }

  update(dt, camX, t) {
    for (const f of this.animated || []) f(t);
    for (const fl of this.flags || []) if (Math.abs(fl.root.getWorldPosition(_wp).x - camX) < 70) fl.wave(t);
    if (this.weather) {
      const p = this.weather.points.geometry.attributes.position;
      const k = this.weather.kind;
      for (let i = 0; i < this.weather.N; i++) {
        let x = p.getX(i), y = p.getY(i);
        if (k === 'snow') { y -= dt * (2 + (i % 5) * 0.4); x += Math.sin(t + i) * dt * 0.8 - dt * 1.2; }
        else if (k === 'dust') { x -= dt * (8 + (i % 7)); y += Math.sin(t * 2 + i) * dt * 0.5; }
        else { y -= dt * 0.8; x -= dt * 2; }
        if (y < -2) y = 40;
        if (x < camX - 70) x += 140; if (x > camX + 70) x -= 140;
        p.setXYZ(i, x, y, p.getZ(i));
      }
      p.needsUpdate = true;
    }
  }

  clear() {
    this.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    this.animated = []; this.flags = [];
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  followSun(x, y) {
    this.sun.position.set(x + this.sunOffset.x, y + this.sunOffset.y, this.sunOffset.z);
    this.sun.target.position.set(x, y, 0);
  }
}
