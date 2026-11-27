// الطبيعة من مجسمات GLB: أشجار وصخور وشجيرات.
// الجذع والأغصان من المجسم، والأوراق تنضاف بالكود (كروت شفافة) لأن أدوات التحويل لثريدي تضيّع الورق،
// وكلها تتمايل مع الهوا. بالمناطق الثلجية ينزل ثلج على الأسطح اللي وجهها لفوق.
import * as THREE from 'three';
import { GLB, splitGLB } from './glb.js';
import { canvasTex, rng } from './textures.js';

const TIME = { value: 0 };
const tick = () => { TIME.value = performance.now() / 1000; };
const matCache = {};

// يضيف حركة الهوا (انحناء يزيد مع الارتفاع + رفرفة للأوراق) والثلج واللون لأي مادة
export function windMat(base, key, o) {
  if (matCache[key]) return matCache[key];
  const m = base.clone();
  if (o.tint) m.color = new THREE.Color(1, 1, 1).lerp(new THREE.Color(o.tint), o.tintK ?? 0.7).multiplyScalar(o.tintGain ?? 1.2);
  // uWind = (مدى انحناء الشجرة عند القمة، ارتفاع الشجرة، مدى رفرفة الورق، تردد الرفرفة على طول الورقة)
  const uWind = { value: new THREE.Vector4(o.amp || 0, o.height || 1, o.flutter || 0, o.freq ?? 40) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = TIME; sh.uniforms.uWind = uWind;
    sh.vertexShader = 'uniform float uTime; uniform vec4 uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        float wph = modelMatrix[3].x * 0.37 + modelMatrix[3].z * 0.23;
        float wh = clamp(position.y / uWind.y, 0.0, 1.0); wh *= wh;
        transformed.x += (sin(uTime * 1.15 + wph) + 0.45 * sin(uTime * 2.7 + wph * 1.9)) * uWind.x * wh;
        transformed.z += cos(uTime * 0.9 + wph * 1.3) * uWind.x * 0.6 * wh;
        ${o.flutter ? `float fl = 1.0 - uv.y; // الطرف الحر يتحرك أكثر (v=1 عند نقطة التعليق)
        float fph = wph + position.x * uWind.w * 0.78 + position.y * uWind.w + position.z * uWind.w * 0.92;
        transformed.x += sin(uTime * 3.1 + fph) * uWind.z * fl * 0.7;
        transformed.z += cos(uTime * 2.6 + fph * 0.9) * uWind.z * fl * 0.7;
        transformed.y += sin(uTime * 2.2 + fph * 1.1) * uWind.z * fl * fl;` : ''}
      }`);
    if (o.snow) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 wN = inverseTransformDirection( normal, viewMatrix ); float sn = smoothstep( 0.15, 0.7, wN.y ); diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.96, 1.0 ), sn * 0.92 ); }`);
  };
  m.customProgramCacheKey = () => 'wind|' + (o.flutter ? 'f' : '') + (o.snow ? 's' : '');
  m.onBeforeRender = tick;
  return (matCache[key] = m);
}

// ---------- رسم الأوراق (نسيج شفاف بنصفين، بكل نص غصن مختلف)
function leafShape(g, x, y, ang, len, wid, col, rib) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.38, -wid, len, wid * 0.25);
  g.quadraticCurveTo(len * 0.45, wid * 0.9, 0, 0); g.fill();
  g.strokeStyle = rib; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 0); g.quadraticCurveTo(len * 0.5, -wid * 0.1, len * 0.96, wid * 0.2); g.stroke();
  g.restore();
}
// يوكالبتوس: أغصان رفيعة نازلة من فوق وعليها أوراق طويلة متدلية
function eucLeafTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(771), cols = ['#4f6a45', '#5e7a52', '#42583a', '#6c8760', '#4a6040', '#587348'];
    g.clearRect(0, 0, w, h);
    for (let half = 0; half < 2; half++) {
      const ox = half * 256;
      g.save(); g.beginPath(); g.rect(ox + 3, 0, 250, h); g.clip();
      const stems = 7;
      for (let s = 0; s < stems; s++) {
        const dir = (s / (stems - 1) - 0.5) * 2;
        let x = ox + 128 + dir * 10 + (r() - 0.5) * 14, y = 4, vx = dir * (11 + r() * 7), vy = 13 + r() * 7;
        const pts = [[x, y]];
        for (let k = 0; k < 17 && y < 430; k++) { x += vx; y += vy; vx *= 0.84; vy += 1.5; pts.push([x, y]); }
        g.strokeStyle = '#8a7a58'; g.lineWidth = 2.4; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        for (let k = 1; k < pts.length; k++) for (let j = 0; j < 2; j++) {
          const [px, py] = pts[k], side = j ? 1 : -1;
          const ang = Math.PI / 2 + side * (0.2 + r() * 0.6) + (r() - 0.5) * 0.25;
          leafShape(g, px, py, ang, 44 + r() * 34, 8 + r() * 5, cols[Math.floor(r() * cols.length)], 'rgba(190,205,170,0.55)');
        }
      }
      g.restore();
    }
  }, { wrap: false });
}
// شجيرة: أغصان قصيرة طالعة من النص لكل الاتجاهات وعليها أوراق صغيرة بيضوية
function bushLeafTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(915), cols = ['#86a84c', '#73953f', '#93b356', '#647f38', '#7c9c46'];
    g.clearRect(0, 0, w, h);
    for (let half = 0; half < 2; half++) {
      const ox = half * 256;
      g.save(); g.beginPath(); g.rect(ox + 3, 3, 250, h - 6); g.clip();
      const stems = 11;
      for (let s = 0; s < stems; s++) {
        const a0 = (s / stems) * Math.PI * 2 + r() * 0.5;
        let x = ox + 128, y = 256, vx = Math.cos(a0) * 15, vy = Math.sin(a0) * 21;
        const pts = [[x, y]];
        for (let k = 0; k < 9; k++) { x += vx; y += vy; vx += (r() - 0.5) * 5; vy += (r() - 0.5) * 5; pts.push([x, y]); }
        g.strokeStyle = '#6d6a44'; g.lineWidth = 2; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        for (let k = 1; k < pts.length; k++) for (let j = 0; j < 2; j++) {
          const [px, py] = pts[k], dir = Math.atan2(pts[k][1] - pts[k - 1][1], pts[k][0] - pts[k - 1][0]);
          leafShape(g, px, py, dir + (j ? 1 : -1) * (0.7 + r() * 0.5), 22 + r() * 13, 10 + r() * 5, cols[Math.floor(r() * cols.length)], 'rgba(215,230,170,0.5)');
        }
      }
      g.restore();
    }
  }, { wrap: false });
}

// ---------- معلومات المجسم ونقاط تعليق الأوراق
function meshInfo(geom) {
  const p = geom.attributes.position; let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const H = maxY - minY; let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < minY + 0.25 * H) { cx += p.getX(i); cz += p.getZ(i); n++; }
  return { minY, maxY, H, cx: cx / n, cz: cz / n };
}
// كروت الأوراق: تتعلق على أطراف الأغصان وحواليها. كل كرت وجهين بنفس الناظم (إضاءة ناعمة مثل كتلة ورق)
function foliageGeo(geom, info, o, seed) {
  const r = rng(seed), p = geom.attributes.position, { minY, H, cx, cz } = info;
  const cell = o.cell * H, cells = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < minY + o.minH * H) continue;
    const k = Math.floor(x / cell) + '|' + Math.floor(y / cell) + '|' + Math.floor(z / cell);
    let c = cells.get(k); if (!c) cells.set(k, (c = [0, 0, 0, 0]));
    c[0] += x; c[1] += y; c[2] += z; c[3]++;
  }
  const all = [];
  for (const c of cells.values()) {
    const a = { x: c[0] / c[3], y: c[1] / c[3], z: c[2] / c[3] };
    const d = Math.hypot(a.x - cx, a.z - cz), top = a.y > minY + o.topH * H;
    if (d < o.trunkR * H && !top) continue; // على الجذع نفسه — بدون أوراق
    all.push({ ...a, s: 1 });
    for (let k = 0; k < o.extra; k++) { // أغصان صغيرة وهمية حوالين الطرف حتى التاج يمتلي
      const ang = Math.atan2(a.z - cz, a.x - cx) + (r() - 0.5) * 2.2, rad = (0.03 + r() * o.spread) * H;
      all.push({ x: a.x + Math.cos(ang) * rad, y: a.y + (r() * 0.13 - 0.03) * H, z: a.z + Math.sin(ang) * rad, s: 0.75 + r() * 0.45 });
    }
  }
  let cy = 0; for (const a of all) cy += a.y; cy /= all.length || 1;
  const P = [], N = [], UV = [], I = [], CL = [];
  for (const a of all) for (let k = 0; k < o.cards; k++) {
    const shade = 0.66 + 0.34 * r();
    const w = o.size * H * a.s * (0.8 + r() * 0.45), h = w * o.aspect;
    const yaw = r() * Math.PI * 2, rx = Math.cos(yaw) * w / 2, rz = Math.sin(yaw) * w / 2;
    const od = Math.hypot(a.x - cx, a.z - cz) || 1, lean = h * o.lean * (0.4 + r()), lx = ((a.x - cx) / od) * lean, lz = ((a.z - cz) / od) * lean;
    const top = a.y + h * o.above, u0 = r() < 0.5 ? 0 : 0.5, flip = r() < 0.5;
    const quad = [[a.x - rx, top, a.z - rz, 0, 1], [a.x + rx, top, a.z + rz, 1, 1], [a.x + rx + lx, top - h, a.z + rz + lz, 1, 0], [a.x - rx + lx, top - h, a.z - rz + lz, 0, 0]];
    const b = P.length / 3;
    for (const [x, y, z, u, v] of quad) {
      P.push(x, y, z);
      const nx = x - cx, ny = y - cy + 0.2 * H, nz = z - cz, nl = Math.hypot(nx, ny, nz) || 1; N.push(nx / nl, ny / nl, nz / nl);
      UV.push(u0 + (flip ? 1 - u : u) * 0.5, v);
      const sh = shade * (v > 0.5 ? 1 : o.shadeLow ?? 0.74); CL.push(sh, sh, sh); // الطرف النازل أغمق (ظل داخل التاج)
    }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3, b, b + 2, b + 1, b, b + 3, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
  g.setIndex(I);
  return g;
}

// ---------- الأنواع (h = الارتفاع بالمتر داخل اللعبة)
const DRY = { desert: 1, ruins: 1, city: 1 };
const NATURE = {
  // يوكالبتوس: جذع أبيض وأغصان من المجسم + أوراق متدلية بالكود
  tree: { key: 't_euc', h: [9.5, 14], sink: 0.12, wind: 0.02,
    leaves: { tex: eucLeafTex, minH: 0.5, topH: 0.93, trunkR: 0.04, cell: 0.1, extra: 2, spread: 0.13, cards: 2, size: 0.2, aspect: 1.0, lean: 0.1, above: 0.3, flutter: 0.009, variants: 3 } },
  // صنوبر: المجسم كامل (جذع وإبر)
  pine: { key: 't_pine', h: [9, 14], sink: 0.12, wind: 0.016 },
  // صخور: بدون حركة، ولونها يتبع المنطقة
  rock: { key: 'n_rock', h: [1.1, 2.3], sink: 0.1, sinkK: 0.07, wind: 0, tintBy: 'rock' },
  // شجيرة: يابسة بالصحراء والمدن، وخضرة بباقي المناطق
  bush: { key: 'n_shrub', h: [0.8, 1.35], sink: 0.03, sinkK: 0.04, wind: 0.03,
    leaves: { tex: bushLeafTex, green: true, minH: 0.22, topH: 2, trunkR: 0, cell: 0.13, extra: 1, spread: 0.07, cards: 2, size: 0.42, aspect: 1, lean: 0, above: 0.55, flutter: 0.012, variants: 3 } },
};
const cache = {};
function parts(kind) {
  if (cache[kind]) return cache[kind];
  const T = NATURE[kind], sp = splitGLB(GLB[T.key], () => 'all');
  if (!sp) return null;
  const geom = sp.parts.all, info = meshInfo(geom), C = { T, geom, info, material: sp.material };
  if (T.leaves) {
    const L = T.leaves; C.leafTex = L.tex();
    C.leafGeos = []; for (let i = 0; i < L.variants; i++) C.leafGeos.push(foliageGeo(geom, info, L, 4100 + i * 37));
    C.leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: C.leafTex, alphaTest: 0.3 });
    C.leafBase = new THREE.MeshStandardMaterial({ map: C.leafTex, alphaTest: 0.3, roughness: 0.85, metalness: 0, vertexColors: true });
  }
  return (cache[kind] = C);
}

// يرجع العنصر جاهز من مجسم GLB، أو null إذا المجسم مو محمّل (فيبقى الشكل المرسوم بالكود)
export function glbNature(kind, r, biome) {
  const T = NATURE[kind];
  if (!T || !GLB[T.key]) return null;
  const C = parts(kind); if (!C) return null;
  const bid = (biome && biome.id) || '', snow = bid === 'ice';
  const h = T.h[0] + r() * (T.h[1] - T.h[0]), S = h / C.info.H;
  const tint = T.tintBy && biome ? biome[T.tintBy] : null;
  const g = new THREE.Group();
  const add = (geom, m) => { const mm = new THREE.Mesh(geom, m); mm.scale.setScalar(S); mm.position.y = -C.info.minY * S - T.sink - (T.sinkK || 0) * h; mm.castShadow = mm.receiveShadow = true; mm.userData.keep = true; g.add(mm); return mm; };
  add(C.geom, windMat(C.material, kind + '|body|' + (snow ? 's' : '') + (tint || ''), { amp: T.wind, height: C.info.maxY, snow, tint }));
  const L = T.leaves;
  if (L && !(L.green && DRY[bid]) && !(snow && L.green)) {
    const lt = L.green ? (biome && biome.bush) || '#6b7a3a' : null;
    const lm = add(C.leafGeos[Math.floor(r() * C.leafGeos.length)], windMat(C.leafBase, kind + '|leaf|' + (lt || ''), { amp: T.wind, height: C.info.maxY, flutter: L.flutter, tint: lt, tintK: 0.55, tintGain: 1.5 }));
    lm.customDepthMaterial = C.leafDepth; lm.receiveShadow = false;
  }
  g.userData.noBake = true;
  return g;
}

// ============================================================ تاج النخلة: سعف بالكود (شكله كامل ومرتب ويتحرك مع الهوا) + عذوق تمر
function frondTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const r = rng(333), cols = ['#4f6e34', '#5c7c3c', '#45622d', '#688a46', '#547339'];
    g.clearRect(0, 0, w, h); g.lineCap = 'round';
    const y0 = 44; // أول السعفة (فوق بالنسيج) عود بدون خوص
    for (let y = y0; y < h - 5; y += 3.1) {
      const t = (y - y0) / (h - y0 - 5); // 0 عند القاعدة ← 1 عند الطرف
      const len = (w / 2 - 4) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 0.5) * (1 - t * 0.25);
      for (const side of [-1, 1]) {
        g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = 3.3 + r() * 1.3;
        const sweep = 15 + r() * 9; // الخوص مايل باتجاه الطرف
        g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + side * len * 0.55, y + sweep * 0.25, w / 2 + side * len, y + sweep); g.stroke();
      }
    }
    for (let y = 8; y < y0; y += 7) for (const side of [-1, 1]) { g.strokeStyle = '#8f8a48'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + side * 9, y + 6); g.stroke(); } // شوك
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#9a8848'); grad.addColorStop(0.25, '#8e984c'); grad.addColorStop(1, '#6c883e');
    g.strokeStyle = grad; g.lineCap = 'butt';
    g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, y0 + 10); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, y0); g.lineTo(w / 2, h * 0.7); g.stroke();
    g.lineWidth = 2.6; g.beginPath(); g.moveTo(w / 2, h * 0.65); g.lineTo(w / 2, h - 6); g.stroke();
  }, { wrap: false });
}
// السعف: من الصغير الواقف بالنص للكبير المتدلي، كل سعفة مقطعها بشكل V وتنحني لتحت مع طولها
function frondGeo(seed, n = 22) {
  const r = rng(seed), P = [], N = [], UV = [], I = [], C = [], SEG = 8;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), yaw = i * 2.39996 + r() * 0.5;
    const elev = THREE.MathUtils.lerp(1.3, -0.3, Math.pow(t, 0.8)) + (r() - 0.5) * 0.2;
    const L = (3.5 + r() * 1.0) * (0.68 + 0.32 * Math.sin(Math.PI * Math.min(1, t + 0.3)));
    const droop = 0.5 + t * 0.9 + r() * 0.3, halfW = 0.4 + r() * 0.12, twist = (r() - 0.5) * 0.7;
    const dx = Math.cos(yaw), dz = Math.sin(yaw), sx = -dz, sz = dx;
    const b = P.length / 3, shade = 0.7 + 0.3 * (1 - t) + (r() - 0.5) * 0.12;
    let px = 0.12, py = 0;
    for (let s = 0; s <= SEG; s++) {
      const u = s / SEG, ang = elev - droop * Math.pow(u, 1.4);
      if (s > 0) { const am = elev - droop * Math.pow((s - 0.5) / SEG, 1.4), dl = L / SEG; px += Math.cos(am) * dl; py += Math.sin(am) * dl; }
      const wv = halfW * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.9)), 0.5) * (1 - u * 0.25) + 0.03;
      const upx = -Math.sin(ang), upy = Math.cos(ang), tw = twist * u, ct = Math.cos(tw), st = Math.sin(tw);
      for (const k of [-1, 0, 1]) {
        const lift = Math.abs(k) * wv * 0.45, side = k * wv * ct, rise = lift + k * wv * st;
        const X = dx * (px + upx * rise) + sx * side, Y = py + upy * rise, Z = dz * (px + upx * rise) + sz * side;
        P.push(X, Y, Z); UV.push((k + 1) / 2, 1 - u);
        const nx = dx * upx * 0.7 + X * 0.06, ny = upy * 0.7 + 0.45, nz = dz * upx * 0.7 + Z * 0.06, nl = Math.hypot(nx, ny, nz) || 1; N.push(nx / nl, ny / nl, nz / nl);
        const sh = shade * (0.8 + 0.2 * u), dry = Math.max(0, (t - 0.82) / 0.18) * (0.35 + 0.65 * u); // السعف القديم اللي تحت مصفر
        C.push(sh * (1 + dry * 0.55), sh * (1 + dry * 0.2), sh * (1 - dry * 0.35));
      }
      if (s > 0) { const a = b + (s - 1) * 3, c = b + s * 3; for (const q of [0, 1]) I.push(a + q, c + q, c + q + 1, a + q, c + q + 1, a + q + 1, a + q, c + q + 1, c + q, a + q, a + q + 1, c + q + 1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  return g;
}
// عذوق التمر: عرجون أصفر نازل من قلب النخلة وبطرفه عذق مليان تمر
function dateTex() {
  return canvasTex(64, 64, (g, w, h) => {
    const r = rng(52); g.fillStyle = '#a8742a'; g.fillRect(0, 0, w, h);
    const cols = ['#d9861c', '#c96f16', '#e39a28', '#b45c14', '#eab040', '#8a4a16'];
    for (let i = 0; i < 260; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.ellipse(r() * w, r() * h, 2.6, 3.6, r() * 0.6 - 0.3, 0, Math.PI * 2); g.fill(); }
  });
}
function datesGeo(seed) {
  const r = rng(seed), P = [], N = [], UV = [], C = [], I = [];
  const ico = new THREE.IcosahedronGeometry(1, 1), ip = ico.attributes.position, inn = ico.attributes.normal, iu = ico.attributes.uv;
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + r() * 0.7, dx = Math.cos(yaw), dz = Math.sin(yaw);
    const out = 0.42 + r() * 0.3, drop = 0.55 + r() * 0.4, k0 = 0.85 + r() * 0.3;
    const b = P.length / 3; // العرجون: شريط منحني لونه أصفر (نقطة صفرا بالنسيج)
    for (let s = 0; s <= 4; s++) {
      const u = s / 4, x = out * Math.sin(u * 1.45) / Math.sin(1.45), y = 0.2 - drop * u * u;
      for (const k of [-1, 1]) { P.push(dx * x - dz * k * 0.03, y, dz * x + dx * k * 0.03); N.push(0, 1, 0); UV.push(0.02, 0.02); C.push(1.9, 1.5, 0.5); }
      if (s > 0) { const a = b + (s - 1) * 2, c = b + s * 2; I.push(a, c, c + 1, a, c + 1, a + 1, a, c + 1, c, a, a + 1, c + 1); }
    }
    // العذق: شكل بيضوي طويل مدبب من فوق
    const rx = 0.15 + r() * 0.05, ry = 0.3 + r() * 0.1, cx = dx * out, cy = 0.2 - drop - ry * 0.8, cz = dz * out, vb = P.length / 3;
    for (let v = 0; v < ip.count; v++) {
      const yy = ip.getY(v), pin = yy > 0 ? 1 - 0.55 * yy : 1;
      P.push(cx + ip.getX(v) * rx * pin, cy + yy * ry, cz + ip.getZ(v) * rx * pin); N.push(inn.getX(v), inn.getY(v), inn.getZ(v)); UV.push(iu.getX(v) * 3, iu.getY(v) * 2);
      const k = k0 * (0.75 + 0.25 * ((yy + 1) / 2)); C.push(k, k, k); I.push(vb + v);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  return g;
}
let PALM = null;
// k = حجم التاج نسبةً لنخلة طولها 8.5 متر. يرجع مجموعة تنحط على راس الجذع.
export function palmCrown(r, k = 1) {
  if (!PALM) {
    const tex = frondTex();
    PALM = {
      fronds: [0, 1, 2, 3].map((i) => frondGeo(900 + i * 53)), dates: [0, 1, 2].map((i) => datesGeo(700 + i * 31)),
      mat: windMat(new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.3, roughness: 0.8, metalness: 0, vertexColors: true }), 'palm|frond', { flutter: 0.2, freq: 0.9 }),
      depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.3 }),
      dateMat: new THREE.MeshStandardMaterial({ map: dateTex(), roughness: 0.55, metalness: 0, vertexColors: true }),
    };
  }
  const g = new THREE.Group();
  const f = new THREE.Mesh(PALM.fronds[Math.floor(r() * PALM.fronds.length)], PALM.mat); f.customDepthMaterial = PALM.depth; f.castShadow = true; f.receiveShadow = false; f.userData.keep = true; f.userData.noReceive = true; g.add(f);
  if (r() < 0.65) { const d = new THREE.Mesh(PALM.dates[Math.floor(r() * PALM.dates.length)], PALM.dateMat); d.castShadow = true; d.userData.keep = true; g.add(d); }
  g.scale.setScalar(k); g.rotation.y = r() * Math.PI * 2;
  return g;
}
