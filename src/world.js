import * as THREE from 'three';
import { skyTexture, skylineTexture, groundTex, rng } from './textures.js';
import { buildProp } from './models.js';

export const BIOMES = {
  desert: {
    id: 'desert', name: 'الصحراء', hills: 1.1,
    ground: ['#d8b47a', '#c9a065', '#e6c792', '#b88c55'], track: '#b8935e',
    skyline: [['dunes', '#d9b07a'], ['dunes', '#c69a62']],
    props: { palm: 5, rock: 2, bush: 3, cactus: 1, wreck: 1, sandbags: 1, barrels: 1 },
    uniform: 'desert', enemyTank: 'desert', vehicle: 'desert', weather: 'dust', rock: '#b8956a', bush: '#7e8a46',
    fogTint: '#e8cfa0',
  },
  ruins: {
    id: 'ruins', name: 'المنطقة المدمرة', hills: 0.8,
    ground: ['#8c7c62', '#7a6a52', '#9c8b70', '#5e5242'], track: '#5e5040',
    skyline: [['ruins', '#7c6e5c'], ['dunes', '#8e7c62']],
    props: { wreck: 4, ruin: 4, sandbags: 2, barbed: 2, rock: 1, debris: 3, pole: 1, barrels: 1 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: 'ash', smoke: true, rock: '#7c6e5c', bush: '#5e5a3a',
    fogTint: '#a89a84',
  },
  city: {
    id: 'city', name: 'المدينة المدمرة', hills: 0.35,
    ground: ['#6e6862', '#5e5852', '#7c766e', '#4a4540'], track: '#3e3a36',
    skyline: [['city', '#4e4b4a'], ['city', '#66625e']],
    props: { building: 6, ruin: 3, wreck: 3, debris: 3, pole: 2, barrels: 1, sandbags: 1 },
    uniform: 'urban', enemyTank: 'urban', vehicle: 'urban', weather: 'ash', smoke: true, rock: '#6e6862', bush: '#4e5a34',
    fogTint: '#8c8680',
  },
  countryside: {
    id: 'countryside', name: 'الريف', hills: 1.3,
    ground: ['#6d8f43', '#5c7d36', '#7fa050', '#8a7a4c'], track: '#7a6542',
    skyline: [['hills', '#4f6e3a'], ['mountains', '#6c8a6a']],
    props: { tree: 5, house: 2, palm: 2, fence: 2, bush: 4, rock: 1 },
    uniform: 'green', enemyTank: 'enemyGreen', vehicle: 'enemyGreen', weather: null, leaf: '#4d6e2a', rock: '#8a8a7a', bush: '#4e6e2a',
    fogTint: '#b8cfc0',
  },
  ice: {
    id: 'ice', name: 'الجليد', hills: 1.2,
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

export const ROTATION = [
  ['desert', 'day'], ['desert', 'noon'], ['desert', 'night'], ['ruins', 'sunset'],
  ['city', 'day'], ['countryside', 'day'], ['city', 'night'], ['ice', 'day'],
  ['desert', 'dawn'], ['ruins', 'day'], ['countryside', 'sunset'], ['ice', 'night'],
  ['city', 'sunset'], ['countryside', 'dawn'], ['ruins', 'night'], ['desert', 'sunset'],
];

export function levelEnv(level) {
  const [b, t] = ROTATION[(level - 1) % ROTATION.length];
  return { biome: BIOMES[b], time: TIMES[t] };
}

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
    const flat = Math.min(1, Math.max(0, (x - 4) / 20)) * Math.min(1, Math.max(0, (this.length + 10 - x) / 20));
    return y * flat;
  }

  farHeight(x, z) {
    const az = Math.abs(z);
    const k = THREE.MathUtils.smoothstep(az, 5, 40);
    const b = this.biome.id === 'city' ? 0.4 : 1;
    return k * b * (3.5 * Math.sin(x * 0.05 + z * 0.08 + this.seeds[3]) + 2.2 * Math.sin(x * 0.013 - z * 0.05) + 1.5 * Math.sin(z * 0.2 + x * 0.11)) * (z < 0 ? 1.4 : 0.35);
  }

  build(level, length, seed) {
    this.clear();
    const { biome, time } = levelEnv(level);
    this.biome = biome; this.time = time; this.length = length;
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
    const x0 = -120, x1 = length + 160, z0 = -150, z1 = 22;
    const segX = Math.min(900, Math.floor((x1 - x0) / 1.5)), segZ = 48;
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
    biome.skyline.forEach(([type, color], i) => {
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

    // --- props
    const weights = Object.entries(biome.props);
    const total = weights.reduce((a, b) => a + b[1], 0);
    const pick = () => { let v = r() * total; for (const [k, w] of weights) { v -= w; if (v <= 0) return k; } return weights[0][0]; };
    const place = (x, z, kind, scale = 1) => {
      const p = buildProp(kind, r, biome);
      p.position.set(x, this.heightAt(x) + this.farHeight(x, z) - 0.05, z);
      p.rotation.y = (kind === 'ruin' || kind === 'building' || kind === 'house') ? (r() - 0.5) * 0.4 : r() * Math.PI * 2;
      p.scale.setScalar(scale);
      this.group.add(p);
      return p;
    };
    // background band
    for (let x = x0; x < x1; x += 7 + r() * 9) {
      const z = -10 - r() * 70;
      const k = pick();
      place(x, z, k, 0.9 + r() * 0.5);
    }
    // mid band right behind the lane
    for (let x = 10; x < length + 60; x += 14 + r() * 18) {
      let k = pick();
      if (k === 'building') k = r() < 0.5 ? 'ruin' : 'building';
      place(x, -5.5 - r() * 4, k, 0.8 + r() * 0.3);
    }
    // foreground (near camera) small things
    const fg = ['rock', 'bush', 'debris', 'barrels'].filter(k => biome.props[k] || k === 'rock');
    for (let x = x0 + 20; x < x1; x += 10 + r() * 16) {
      const k = fg[Math.floor(r() * fg.length)];
      place(x, 5 + r() * 9, k, 0.7 + r() * 0.5);
    }
    // smoke columns
    this.smokeEmitters = [];
    if (biome.smoke) {
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
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  followSun(x, y) {
    this.sun.position.set(x + this.sunOffset.x, y + this.sunOffset.y, this.sunOffset.z);
    this.sun.target.position.set(x, y, 0);
  }
}
