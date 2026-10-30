import * as THREE from 'three';
import { radialTex, smokeTex } from './textures.js';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.tex = {
      fire: radialTex([[0, 'rgba(255,255,230,1)'], [0.2, 'rgba(255,210,90,0.95)'], [0.5, 'rgba(255,100,20,0.6)'], [1, 'rgba(120,20,0,0)']]),
      flash: radialTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,240,180,0.8)'], [1, 'rgba(255,180,60,0)']]),
      spark: radialTex([[0, 'rgba(255,255,220,1)'], [0.4, 'rgba(255,200,80,0.8)'], [1, 'rgba(255,120,0,0)']], 32),
      smoke: smokeTex(),
      glow: radialTex([[0, 'rgba(160,240,255,1)'], [0.4, 'rgba(60,180,255,0.6)'], [1, 'rgba(0,80,255,0)']]),
      scorch: radialTex([[0, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(10,8,5,0.55)'], [1, 'rgba(0,0,0,0)']]),
    };
    this.particles = [];
    this.pool = [];
    for (let i = 0; i < 700; i++) {
      const m = new THREE.SpriteMaterial({ map: this.tex.smoke, transparent: true, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s); this.pool.push(s);
    }
    // debris
    this.debris = [];
    const dg = new THREE.BoxGeometry(0.25, 0.18, 0.2);
    this.debrisMat = new THREE.MeshStandardMaterial({ color: '#3a332b', roughness: 1 });
    this.debrisPool = [];
    for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(dg, this.debrisMat); m.visible = false; m.castShadow = true; scene.add(m); this.debrisPool.push(m); }
    // scorch decals
    this.scorches = [];
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: this.tex.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      m.visible = false; scene.add(m); this.scorches.push({ m, life: 0 });
    }
    this.scorchIdx = 0;
    // flash lights
    this.lights = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#ffb060', 0, 40, 1.6); scene.add(l); this.lights.push({ l, life: 0, max: 1, power: 0 }); }
    this.lightIdx = 0;
  }

  spawn(o) {
    const s = this.pool.pop();
    if (!s) return;
    const additive = o.additive ?? (o.tex !== 'smoke');
    s.material.map = this.tex[o.tex || 'smoke'];
    s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    s.material.color.set(o.color || '#ffffff');
    s.material.opacity = o.alpha ?? 1;
    s.material.rotation = Math.random() * Math.PI * 2;
    s.position.set(o.x, o.y, o.z ?? 0);
    s.scale.setScalar(o.size0 ?? 1);
    s.visible = true;
    s.renderOrder = additive ? 5 : 2;
    this.particles.push({ s, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life, max: o.life, size0: o.size0 ?? 1, size1: o.size1 ?? (o.size0 ?? 1), a0: o.alpha ?? 1, g: o.g || 0, drag: o.drag ?? 0, spin: (Math.random() - 0.5) * (o.spin ?? 1) });
  }

  light(x, y, power = 30, life = 0.25, color = '#ffb060') {
    const L = this.lights[this.lightIdx++ % this.lights.length];
    L.l.position.set(x, y + 1, 2); L.l.color.set(color); L.power = power; L.life = life; L.max = life; L.l.intensity = power;
  }

  scorch(x, y, size, slope = 0) {
    const s = this.scorches[this.scorchIdx++ % this.scorches.length];
    s.m.position.set(x, y + 0.04, (Math.random() - 0.5) * 1.5);
    s.m.rotation.set(0, Math.random() * 6, 0);
    s.m.rotation.z = slope;
    s.m.scale.set(size, 1, size);
    s.m.visible = true; s.life = 25; s.m.material.opacity = 1;
  }

  explosion(x, y, size = 1, opts = {}) {
    const n = Math.round(10 * size) + 6;
    this.spawn({ tex: 'flash', x, y: y + 0.5, life: 0.14, size0: 4 * size, size1: 9 * size, alpha: 1 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI, sp = (2 + Math.random() * 6) * size;
      this.spawn({ tex: 'fire', x: x + (Math.random() - 0.5) * size, y: y + Math.random() * size, z: (Math.random() - 0.5) * size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.9 + 1, vz: (Math.random() - 0.5) * sp * 0.5, life: 0.35 + Math.random() * 0.4, size0: 1.6 * size, size1: 3.5 * size, drag: 2.5, color: i % 3 ? '#ffffff' : '#ffcf80' });
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI, sp = (1 + Math.random() * 3) * size;
      const dark = opts.dark ?? 0.25;
      const c = new THREE.Color().setRGB(dark + Math.random() * 0.1, dark * 0.95 + Math.random() * 0.1, dark * 0.9 + Math.random() * 0.1);
      this.spawn({ tex: 'smoke', additive: false, x: x + (Math.random() - 0.5) * size * 2, y: y + Math.random() * size, z: (Math.random() - 0.5) * size * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 1.2, life: 1.8 + Math.random() * 2.2, size0: 1.5 * size, size1: 6 * size, alpha: 0.75, drag: 1.2, color: '#' + c.getHexString() });
    }
    // dust ring from ground
    if (opts.dust) {
      for (let i = 0; i < 10; i++) {
        const dir = i < 5 ? -1 : 1;
        this.spawn({ tex: 'smoke', additive: false, x, y: y + 0.3, z: (Math.random() - 0.5) * 2, vx: dir * (3 + Math.random() * 5) * size, vy: 0.5, life: 1.2 + Math.random(), size0: 1 * size, size1: 4 * size, alpha: 0.6, drag: 2.5, color: opts.dust });
      }
    }
    for (let i = 0; i < Math.round(6 * size); i++) {
      this.spawn({ tex: 'spark', x, y: y + 0.5, vx: (Math.random() - 0.5) * 22 * size, vy: Math.random() * 16 * size, life: 0.5 + Math.random() * 0.6, size0: 0.35, size1: 0.1, g: 18, drag: 0.5 });
    }
    const nd = Math.round((opts.debris ?? 5) * size);
    for (let i = 0; i < nd; i++) this.debrisPiece(x, y + 0.3, (Math.random() - 0.5) * 14 * size, 4 + Math.random() * 10 * size, opts.debrisColor);
    this.light(x, y, 40 * size, 0.3);
  }

  debrisPiece(x, y, vx, vy, color) {
    const m = this.debrisPool.pop(); if (!m) return;
    m.visible = true; m.position.set(x, y, (Math.random() - 0.5) * 3);
    const s = 0.5 + Math.random() * 1.6; m.scale.set(s, s * (0.5 + Math.random()), s);
    this.debris.push({ m, vx, vy, vz: (Math.random() - 0.5) * 6, rx: Math.random() * 10, ry: Math.random() * 10, life: 3 + Math.random() * 2, smokeT: 0, burning: Math.random() < 0.3 });
  }

  muzzle(x, y, dirx, diry, size = 1) {
    this.spawn({ tex: 'flash', x: x + dirx * 0.4 * size, y: y + diry * 0.4 * size, z: 0.2, life: 0.07, size0: 2.2 * size, size1: 3.2 * size });
    this.spawn({ tex: 'fire', x: x + dirx * 0.8 * size, y: y + diry * 0.8 * size, z: 0.2, vx: dirx * 8, vy: diry * 8, life: 0.12, size0: 1.2 * size, size1: 2 * size });
    if (size > 0.6) {
      for (let i = 0; i < 6; i++) this.spawn({ tex: 'smoke', additive: false, x: x + dirx, y: y + diry, vx: dirx * (2 + Math.random() * 5) + (Math.random() - 0.5) * 2, vy: diry * 3 + Math.random() * 2, life: 1 + Math.random(), size0: 0.8 * size, size1: 3.5 * size, alpha: 0.5, drag: 2, color: '#d8d2c6' });
      this.light(x, y, 18 * size, 0.1, '#ffd890');
    }
  }

  dustPuff(x, y, color, size = 1, vx = 0) {
    this.spawn({ tex: 'smoke', additive: false, x: x + (Math.random() - 0.5), y: y + 0.2, z: (Math.random() - 0.5) * 2.5, vx: vx + (Math.random() - 0.5), vy: 0.4 + Math.random() * 0.8, life: 0.8 + Math.random() * 0.8, size0: 0.6 * size, size1: 2.4 * size, alpha: 0.45, drag: 1.5, color });
  }

  update(dt, groundAt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; this.pool.push(p.s); this.particles.splice(i, 1); continue; }
      const k = 1 - p.life / p.max;
      p.vy -= p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.scale.setScalar(p.size0 + (p.size1 - p.size0) * k);
      p.s.material.opacity = p.a0 * (1 - k) * (k < 0.1 ? k * 10 * 0.5 + 0.5 : 1);
      p.s.material.rotation += p.spin * dt;
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.vy -= 22 * dt;
      d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
      d.m.rotation.x += d.rx * dt; d.m.rotation.y += d.ry * dt;
      const gy = groundAt(d.m.position.x);
      if (d.m.position.y < gy + 0.1) { d.m.position.y = gy + 0.1; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; d.rx *= 0.5; d.ry *= 0.5; }
      if (d.burning) { d.smokeT -= dt; if (d.smokeT < 0) { d.smokeT = 0.08; this.spawn({ tex: 'smoke', additive: false, x: d.m.position.x, y: d.m.position.y, z: d.m.position.z, vy: 1, life: 0.8, size0: 0.3, size1: 1.2, alpha: 0.5, color: '#333' }); } }
      if (d.life <= 0) { d.m.visible = false; this.debrisPool.push(d.m); this.debris.splice(i, 1); }
    }
    for (const s of this.scorches) if (s.m.visible) { s.life -= dt; if (s.life < 5) s.m.material.opacity = s.life / 5; if (s.life <= 0) s.m.visible = false; }
    for (const L of this.lights) { if (L.life > 0) { L.life -= dt; L.l.intensity = Math.max(0, L.power * L.life / L.max); } else L.l.intensity = 0; }
  }

  clear() {
    for (const p of this.particles) { p.s.visible = false; this.pool.push(p.s); }
    this.particles = [];
    for (const d of this.debris) { d.m.visible = false; this.debrisPool.push(d.m); }
    this.debris = [];
    for (const s of this.scorches) s.m.visible = false;
  }
}
