import * as THREE from 'three';

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(g, w, h, amount, r) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// Military camouflage
export function camoTexture(colors, seed = 7, scale = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = colors[0]; g.fillRect(0, 0, w, h);
    for (let layer = 1; layer < colors.length; layer++) {
      g.fillStyle = colors[layer];
      const count = 26 - layer * 4;
      for (let i = 0; i < count; i++) {
        const x = r() * w, y = r() * h;
        const rx = (30 + r() * 70) * scale, ry = (14 + r() * 30) * scale;
        // draw wrapped so the texture tiles
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
          g.beginPath();
          const blobs = 4 + Math.floor(r() * 3);
          for (let b = 0; b < blobs; b++) {
            g.ellipse(x + ox + (r() - 0.5) * rx, y + oy + (r() - 0.5) * ry, rx * (0.4 + r() * 0.6), ry * (0.4 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
          }
          g.fill();
        }
      }
    }
    noise(g, w, h, 22, r);
    // dirt / wear streaks
    g.globalAlpha = 0.08;
    for (let i = 0; i < 200; i++) {
      g.fillStyle = r() > 0.5 ? '#000' : '#fff';
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 4 + r() * 30);
    }
    g.globalAlpha = 1;
  });
}

export function plainTexture(color, seed = 3, amount = 18) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    noise(g, w, h, amount, r);
  });
}

export function treadTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#26241f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = '#3d3a33'; g.fillRect(0, y, w, 10);
      g.fillStyle = '#55524a'; g.fillRect(0, y, w, 2);
      g.fillStyle = '#151410'; g.fillRect(w * 0.45, y + 2, w * 0.1, 8);
    }
  });
}

export function wheelTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#1b1a17'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4b4a40'; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.fill();
    g.fillStyle = '#5d5c50'; g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.fill();
    g.fillStyle = '#2a2925'; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.fillStyle = '#7a796c';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      g.beginPath(); g.arc(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 3, 0, 7); g.fill();
    }
    g.strokeStyle = '#0d0c0a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.stroke();
  }, { wrap: false });
}

export function radialTex(stops, size = 128) {
  return canvasTex(size, size, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (const [o, c] of stops) grd.addColorStop(o, c);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { wrap: false });
}

export function smokeTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(11);
    for (let i = 0; i < 18; i++) {
      const x = w / 2 + (r() - 0.5) * 50, y = h / 2 + (r() - 0.5) * 50, rad = 20 + r() * 30;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.35)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }, { wrap: false });
}

export function skyTexture(t) {
  return canvasTex(512, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, t.skyTop);
    grd.addColorStop(0.55, t.skyMid);
    grd.addColorStop(1, t.skyBottom);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(5);
    if (t.stars) {
      for (let i = 0; i < 500; i++) {
        g.globalAlpha = 0.3 + r() * 0.7;
        g.fillStyle = '#fff';
        const s = r() < 0.05 ? 2 : 1;
        g.fillRect(r() * w, r() * h * 0.7, s, s);
      }
      g.globalAlpha = 1;
    }
    if (t.sun) {
      const { x, y, color, size } = t.sun;
      const sx = x * w, sy = y * h;
      const halo = g.createRadialGradient(sx, sy, 0, sx, sy, size * 6);
      halo.addColorStop(0, color); halo.addColorStop(0.15, color + 'aa'); halo.addColorStop(1, color + '00');
      g.fillStyle = halo; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(sx, sy, size, 0, 7); g.fill();
    }
    if (t.moon) {
      const sx = 0.78 * w, sy = 0.18 * h;
      const halo = g.createRadialGradient(sx, sy, 0, sx, sy, 90);
      halo.addColorStop(0, 'rgba(200,215,255,0.5)'); halo.addColorStop(1, 'rgba(200,215,255,0)');
      g.fillStyle = halo; g.fillRect(0, 0, w, h);
      g.fillStyle = '#eef2ff'; g.beginPath(); g.arc(sx, sy, 18, 0, 7); g.fill();
      g.fillStyle = 'rgba(150,160,190,0.5)';
      g.beginPath(); g.arc(sx - 5, sy - 4, 4, 0, 7); g.arc(sx + 6, sy + 5, 3, 0, 7); g.fill();
    }
    // clouds
    if (t.clouds) {
      for (let i = 0; i < 14; i++) {
        const cx = r() * w, cy = h * (0.15 + r() * 0.35), cw = 60 + r() * 120;
        for (let k = 0; k < 8; k++) {
          const px = cx + (r() - 0.5) * cw, py = cy + (r() - 0.5) * 18, pr = 14 + r() * 26;
          const grd2 = g.createRadialGradient(px, py, 0, px, py, pr);
          grd2.addColorStop(0, t.clouds); grd2.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grd2; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
      }
    }
  }, { wrap: false });
}

// Distant silhouettes
export function skylineTexture(type, color, seed = 9) {
  return canvasTex(2048, 512, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    const base = h;
    if (type === 'dunes' || type === 'hills' || type === 'mountains' || type === 'snow') {
      g.beginPath(); g.moveTo(0, base);
      const amp = type === 'dunes' ? 90 : type === 'hills' ? 110 : 260;
      const f1 = 2 + Math.floor(r() * 3), f2 = 5 + Math.floor(r() * 4), f3 = 13;
      const p1 = r() * 6, p2 = r() * 6;
      for (let x = 0; x <= w; x += 4) {
        const u = x / w * Math.PI * 2;
        let y = Math.sin(u * f1 + p1) * 0.5 + Math.sin(u * f2 + p2) * 0.3;
        if (type === 'mountains' || type === 'snow') y += Math.abs(Math.sin(u * f3)) * 0.35;
        g.lineTo(x, h * 0.62 - y * amp * 0.5 - amp * 0.3);
      }
      g.lineTo(w, base); g.closePath(); g.fill();
      if (type === 'snow') {
        // snow caps
        g.globalCompositeOperation = 'source-atop';
        const grd = g.createLinearGradient(0, h * 0.1, 0, h * 0.55);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      }
      if (type === 'hills') {
        // tree bumps
        for (let i = 0; i < 160; i++) {
          const x = r() * w;
          g.beginPath(); g.arc(x, h * 0.62 + r() * 80, 6 + r() * 10, 0, 7); g.fill();
        }
      }
    } else if (type === 'city' || type === 'ruins') {
      let x = 0;
      while (x < w) {
        const bw = 30 + r() * 80;
        const bh = type === 'city' ? 80 + r() * 300 : 30 + r() * 140;
        const top = base - bh;
        g.beginPath();
        g.moveTo(x, base); g.lineTo(x, top);
        // broken jagged top
        const steps = 3 + Math.floor(r() * 4);
        for (let s = 1; s <= steps; s++) {
          g.lineTo(x + bw * s / steps, top + (r() < 0.6 ? r() * 40 : 0));
        }
        g.lineTo(x + bw, base); g.closePath(); g.fill();
        // holes / windows
        g.globalCompositeOperation = 'destination-out';
        for (let wy = top + 14; wy < base - 20; wy += 18) for (let wx = x + 6; wx < x + bw - 10; wx += 14) {
          if (r() < 0.35) g.fillRect(wx, wy, 6, 8);
        }
        if (r() < 0.4) { g.beginPath(); g.arc(x + bw * r(), top + 30 + r() * 40, 8 + r() * 14, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        // minarets / domes in city
        if (type === 'city' && r() < 0.08) {
          g.fillRect(x + bw / 2 - 5, top - 120, 10, 120);
          g.beginPath(); g.arc(x + bw / 2, top - 120, 9, Math.PI, 0); g.fill();
        }
        if (r() < 0.1) { g.beginPath(); g.arc(x + bw / 2, top + 5, bw * 0.35, Math.PI, 0); g.fill(); }
        x += bw + r() * 12;
      }
    }
  }, { wrap: true });
}

export function groundTex(seed = 4) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const v = 100 + r() * 70;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.globalAlpha = 0.25;
      g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 3);
    }
    g.globalAlpha = 0.12;
    for (let i = 0; i < 60; i++) {
      const v = r() > 0.5 ? 255 : 40;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 40, 4 + r() * 12, r() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    noise(g, w, h, 30, r);
  }, { srgb: false });
}

export function wallTexture(base, seed = 2) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    noise(g, w, h, 26, r);
    // windows
    for (let y = 24; y < h; y += 64) for (let x = 20; x < w; x += 64) {
      g.fillStyle = r() < 0.3 ? '#2a2420' : '#141210';
      g.fillRect(x, y, 26, 34);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 3, y + 34, 32, 4);
    }
    // cracks & burn marks
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = r() * w, y = r() * h;
      const grd = g.createRadialGradient(x, y, 0, x, y, 40);
      grd.addColorStop(0, 'rgba(0,0,0,0.6)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - 40, y - 40, 80, 80);
    }
  });
}

export function crateTexture(kind) {
  const conf = {
    weapon: { bg: '#5a4a1e', mark: '#f0c24a', icon: 'gun' },
    ammo: { bg: '#3f4a2a', mark: '#d8e0b0', icon: 'ammo' },
    repair: { bg: '#e8e6dc', mark: '#c62828', icon: 'cross' },
    parts: { bg: '#2c3c4c', mark: '#7fc8ff', icon: 'gear' },
  }[kind];
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = conf.bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke();
    g.fillStyle = conf.mark; g.strokeStyle = conf.mark;
    const c = w / 2;
    if (conf.icon === 'cross') { g.fillRect(c - 10, c - 32, 20, 64); g.fillRect(c - 32, c - 10, 64, 20); }
    else if (conf.icon === 'gear') {
      g.lineWidth = 10; g.beginPath(); g.arc(c, c, 22, 0, 7); g.stroke();
      for (let i = 0; i < 8; i++) { g.save(); g.translate(c, c); g.rotate(i * Math.PI / 4); g.fillRect(-6, -40, 12, 14); g.restore(); }
    } else if (conf.icon === 'ammo') {
      for (let i = 0; i < 3; i++) { g.fillRect(c - 34 + i * 24, c - 18, 16, 46); g.beginPath(); g.moveTo(c - 34 + i * 24, c - 18); g.lineTo(c - 26 + i * 24, c - 38); g.lineTo(c - 18 + i * 24, c - 18); g.fill(); }
    } else {
      g.fillRect(c - 44, c - 8, 80, 14); g.fillRect(c - 44, c - 2, 18, 30); g.fillRect(c + 10, c - 14, 26, 6);
      g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('NEW', c, c + 44);
    }
  }, { wrap: false });
}

export function flagTexture(color, symbol) {
  return canvasTex(128, 80, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(symbol, w / 2, h / 2 + 2);
  }, { wrap: false });
}

export function markerTex(color, text) {
  return canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(w / 2, h - 6); g.lineTo(w / 2 - 26, h - 52); g.lineTo(w / 2 + 26, h - 52); g.closePath(); g.fill();
    g.beginPath(); g.roundRect(14, 20, w - 28, 66, 16); g.fill();
    g.fillStyle = '#0b0b0b'; g.font = 'bold 34px Tahoma, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, 54);
  }, { wrap: false });
}
