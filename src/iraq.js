// العراق: المناطق، المعالم، البنايات، اللافتات، العلم
import * as THREE from 'three';
import { canvasTex, rng } from './textures.js';
import { buildProp, buildFlag, mat } from './models.js';

const std = (color, rough = 0.85, metal = 0.05, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const AR_FONT = 'Tahoma, "Segoe UI", "Noto Kufi Arabic", "Noto Sans Arabic", Arial, sans-serif';
const pick = (r, a) => a[Math.floor(r() * a.length)];

function shadow(g, cast = true) { g.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } }); return g; }

// ============================================================ FLAG
export function drawIraqFlag(g, w, h) {
  g.fillStyle = '#ce1126'; g.fillRect(0, 0, w, h / 3 + 1);
  g.fillStyle = '#ffffff'; g.fillRect(0, h / 3, w, h / 3 + 1);
  g.fillStyle = '#000000'; g.fillRect(0, (2 * h) / 3, w, h / 3 + 1);
  g.fillStyle = '#007a3d';
  g.font = `bold ${Math.round(h * 0.25)}px ${AR_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('الله أكبر', w / 2, h / 2 + 1);
}
let flagT;
export function iraqFlagTex() {
  if (!flagT) flagT = canvasTex(300, 200, (g, w, h) => drawIraqFlag(g, w, h), { wrap: false });
  return flagT;
}
export function iraqFlagPole(h = 7, ring = false) {
  return buildFlag('#ce1126', '', h, { tex: iraqFlagTex(), ring });
}

// ============================================================ TEXT TEXTURES
const texCache = new Map();
function cached(key, make) { if (!texCache.has(key)) texCache.set(key, make()); return texCache.get(key); }

function fitFont(g, text, maxW, size, weight = '900') {
  let fs = size;
  g.font = `${weight} ${fs}px ${AR_FONT}`;
  while (g.measureText(text).width > maxW && fs > 14) { fs -= 2; g.font = `${weight} ${fs}px ${AR_FONT}`; }
  return fs;
}

export function signTex(text, sub, bg, fg = '#ffffff', border = 'rgba(0,0,0,.35)') {
  return cached(`sign|${text}|${sub}|${bg}|${fg}`, () => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(0.5, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = border; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, text, w - 40, sub ? 54 : 64);
    g.fillText(text, w / 2, sub ? h * 0.4 : h * 0.52);
    if (sub) { fitFont(g, sub, w - 60, 24, 'bold'); g.globalAlpha = 0.92; g.fillText(sub, w / 2, h * 0.8); g.globalAlpha = 1; }
  }, { wrap: false }));
}

function roadSignTex(lines, bg = '#0f6b3a') {
  return cached('road|' + lines.join('|') + bg, () => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((l, i) => { fitFont(g, l, w - 70, i === 0 ? 50 : 38, i === 0 ? '900' : 'bold'); g.fillText(l, w / 2, h * (i + 0.5) / n + (n > 2 ? 4 : 0)); });
  }, { wrap: false }));
}

// ============================================================ DATA
export const SHOPS = [
  ['أسواق الرافدين', 'مواد غذائية', '#b71c1c'], ['كباب أبو علي', 'كباب · تكة · معلاك', '#c62828'], ['مخبز دجلة', 'صمون حجري · خبز تنور', '#e65100'],
  ['صيدلية الشفاء', 'أدوية · مستلزمات طبية', '#2e7d32'], ['حلويات الزهراء', 'زلابية · بقلاوة · كاهي', '#ad1457'], ['مقهى الأصدقاء', 'شاي · دومينو · طاولي', '#4e342e'],
  ['معجنات الفرات', 'فطائر · سمبوسة', '#ef6c00'], ['مكتبة الجواهري', 'قرطاسية · كتب', '#1565c0'], ['عصائر الربيع', 'عصير · شربت زبيب', '#00897b'],
  ['تكة أبو حسين', 'مشويات', '#bf360c'], ['فلافل الحاج رحيم', 'فلافل · عمبة · باذنجان', '#f9a825'], ['مطعم المسكوف', 'سمك مسكوف · بني', '#0277bd'],
  ['العراقية للسفر والسياحة', 'حجز تذاكر · زيارات', '#283593'], ['عطارية الحاج كريم', 'بهارات · كجرات · نومي بصرة', '#6d4c41'], ['صالون الأناقة', 'حلاقة رجالية', '#37474f'],
  ['مولدة الحي الأهلية', 'اشتراك أمبيرات', '#424242'], ['أدوات احتياطية أبو مصطفى', 'كيا · سايبا · تويوتا', '#455a64'], ['معرض بابل للأثاث', 'غرف نوم · قنفات', '#5d4037'],
  ['مرطبات الأمير', 'آيس كريم · موطا', '#d81b60'], ['شاي أبو حيدر', 'شاي مهيل', '#3e2723'], ['قيمر وكاهي السيد', 'فطور عراقي', '#f57f17'],
  ['محلات الأمانة للأقمشة', 'أقمشة · دشاديش', '#6a1b9a'], ['موبايلات الرافدين', 'هواتف · كارتات', '#0d47a1'], ['كبة السراي', 'كبة حلب · كبة برغل', '#8d6e63'],
  ['دولمة أم علي', 'أكلات بيتية', '#7cb342'], ['روسم للتجميل', 'وشم تاتو · ليزر', '#111111'], ['مخبز الصمون الحجري', 'صمون حار', '#e64a19'],
  ['كهربائيات النهرين', 'مبردات · سبالت', '#0288d1'], ['خياطة الرشيد', 'بدلات · دشاديش', '#546e7a'], ['قاعة الفرح', 'حفلات · مناسبات', '#880e4f'],
];
export const SLOGANS = ['العراق أولاً', 'معاً نحمي الوطن', 'الجيش العراقي درع الوطن', 'عاش العراق', 'بلاد الرافدين', 'وطن واحد · شعب واحد'];
const STREETS_GENERIC = ['شارع الوطن', 'شارع الجمهورية', 'شارع الكورنيش', 'شارع السوق', 'شارع المحافظة', 'شارع 20', 'شارع الجيش', 'ساحة الحرية', 'شارع المستشفى'];

// كل منطقة: الاسم، المحافظة، البيئة الأساسية، الوقت، الإضافات
export const IRAQ_REGIONS = [
  { name: 'صحراء الأنبار', gov: 'الأنبار', base: 'desert', time: 'day', features: ['road'], props: { palm: 2, wreck: 2 } },
  { name: 'بغداد – الكرادة', gov: 'بغداد', base: 'city', time: 'day', features: ['street', 'tower'], streets: ['شارع الكرادة داخل', 'شارع أبو نؤاس', 'شارع العطار', 'ساحة كهرمانة'] },
  { name: 'البصرة – شط العرب', gov: 'البصرة', base: 'palms', time: 'noon', features: ['river', 'boats', 'road'], streets: ['كورنيش شط العرب'] },
  { name: 'الموصل – المدينة القديمة', gov: 'نينوى', base: 'ruins', time: 'sunset', features: ['street', 'hadba'], damaged: true, streets: ['شارع النجفي', 'باب الطوب', 'شارع الفاروق'] },
  { name: 'ديالى – بساتين بعقوبة', gov: 'ديالى', base: 'countryside', time: 'day', features: ['road'], props: { orange: 7, palm: 3, tree: 1 } },
  { name: 'الأهوار – الجبايش', gov: 'ذي قار', base: 'marsh', time: 'dawn', features: ['marsh', 'mudhif', 'boats'] },
  { name: 'بابل الأثرية', gov: 'بابل', base: 'desert', time: 'day', features: ['ishtar', 'road'], props: { palm: 6 } },
  { name: 'كركوك – حقول النفط', gov: 'كركوك', base: 'desert', time: 'sunset', features: ['oil', 'road'], props: { palm: 0, cactus: 0 } },
  { name: 'أربيل – القلعة', gov: 'أربيل', base: 'city', time: 'day', features: ['street', 'citadel'], skyline: [['mountains', '#7c8a78'], ['city', '#6e6a62']], streets: ['شارع 60 متري', 'شارع 100 متري', 'سوق القيصرية'] },
  { name: 'جبال السليمانية – بنجوين', gov: 'السليمانية', base: 'ice', time: 'day', features: ['road'] },
  { name: 'سامراء – الملوية', gov: 'صلاح الدين', base: 'desert', time: 'noon', features: ['malwiya', 'road'], props: { palm: 3 } },
  { name: 'بغداد – شارع الرشيد', gov: 'بغداد', base: 'city', time: 'night', features: ['street', 'shanasheel', 'freedom'], streets: ['شارع الرشيد', 'شارع المتنبي', 'سوق الشورجة', 'ساحة التحرير', 'ساحة الميدان'] },
  { name: 'الناصرية – زقورة أور', gov: 'ذي قار', base: 'desert', time: 'dawn', features: ['ziggurat', 'road'], props: { palm: 1 } },
  { name: 'زاخو – جسر دلال', gov: 'دهوك', base: 'mountains', time: 'day', features: ['river', 'dalal', 'road'] },
  { name: 'بادية السماوة', gov: 'المثنى', base: 'desert', time: 'night', features: ['road'], props: { palm: 0, rock: 5, cactus: 0 } },
];

// مخزن مدن وأقضية ونواحي العراق للمراحل المتولدة بلا نهاية
const PLACES = [
  ['المنصور', 'بغداد', 'city'], ['الأعظمية', 'بغداد', 'city'], ['زيونة', 'بغداد', 'city'], ['بغداد الجديدة', 'بغداد', 'city'], ['الدورة', 'بغداد', 'city'],
  ['الشعلة', 'بغداد', 'city'], ['اليرموك', 'بغداد', 'city'], ['الحرية', 'بغداد', 'city'], ['الغزالية', 'بغداد', 'city'], ['حي العامل', 'بغداد', 'city'],
  ['السيدية', 'بغداد', 'city'], ['الصليخ', 'بغداد', 'city'], ['البياع', 'بغداد', 'city'], ['الحبيبية', 'بغداد', 'city'], ['شارع فلسطين', 'بغداد', 'city'],
  ['أبو غريب', 'بغداد', 'countryside'], ['التاجي', 'بغداد', 'countryside'], ['الطارمية', 'بغداد', 'palms'], ['المحمودية', 'بغداد', 'countryside'], ['اليوسفية', 'بغداد', 'palms'],
  ['الرمادي', 'الأنبار', 'city'], ['الفلوجة', 'الأنبار', 'ruins'], ['هيت', 'الأنبار', 'palms'], ['حديثة', 'الأنبار', 'palms'], ['عنة', 'الأنبار', 'palms'],
  ['القائم', 'الأنبار', 'desert'], ['الرطبة', 'الأنبار', 'desert'], ['النخيب', 'الأنبار', 'desert'], ['الحبانية', 'الأنبار', 'countryside'],
  ['البصرة القديمة', 'البصرة', 'city'], ['الزبير', 'البصرة', 'desert'], ['أبو الخصيب', 'البصرة', 'palms'], ['الفاو', 'البصرة', 'palms'], ['أم قصر', 'البصرة', 'desert'],
  ['القرنة', 'البصرة', 'marsh'], ['شط العرب', 'البصرة', 'palms'], ['الرميلة', 'البصرة', 'desert'],
  ['الحلة', 'بابل', 'city'], ['المسيب', 'بابل', 'palms'], ['المحاويل', 'بابل', 'countryside'], ['الهاشمية', 'بابل', 'countryside'],
  ['الكوت', 'واسط', 'city'], ['الصويرة', 'واسط', 'palms'], ['النعمانية', 'واسط', 'countryside'], ['الحي', 'واسط', 'countryside'], ['بدرة', 'واسط', 'desert'],
  ['العمارة', 'ميسان', 'city'], ['المجر الكبير', 'ميسان', 'marsh'], ['قلعة صالح', 'ميسان', 'marsh'], ['علي الغربي', 'ميسان', 'desert'],
  ['الناصرية', 'ذي قار', 'city'], ['سوق الشيوخ', 'ذي قار', 'marsh'], ['الشطرة', 'ذي قار', 'countryside'], ['الرفاعي', 'ذي قار', 'countryside'], ['الچبايش', 'ذي قار', 'marsh'],
  ['الديوانية', 'القادسية', 'city'], ['عفك', 'القادسية', 'countryside'], ['الشامية', 'القادسية', 'countryside'], ['الحمزة', 'القادسية', 'palms'],
  ['السماوة', 'المثنى', 'city'], ['الرميثة', 'المثنى', 'countryside'], ['السلمان', 'المثنى', 'desert'], ['الخضر', 'المثنى', 'palms'],
  ['الموصل الجديدة', 'نينوى', 'city'], ['تلعفر', 'نينوى', 'ruins'], ['سنجار', 'نينوى', 'mountains'], ['الحمدانية', 'نينوى', 'countryside'], ['القيارة', 'نينوى', 'desert'], ['بعشيقة', 'نينوى', 'countryside'],
  ['تكريت', 'صلاح الدين', 'city'], ['بيجي', 'صلاح الدين', 'ruins'], ['الشرقاط', 'صلاح الدين', 'countryside'], ['بلد', 'صلاح الدين', 'palms'], ['الدجيل', 'صلاح الدين', 'palms'], ['طوزخورماتو', 'صلاح الدين', 'desert'],
  ['بعقوبة', 'ديالى', 'city'], ['خانقين', 'ديالى', 'mountains'], ['المقدادية', 'ديالى', 'palms'], ['بلدروز', 'ديالى', 'countryside'], ['مندلي', 'ديالى', 'desert'],
  ['كركوك', 'كركوك', 'city'], ['الحويجة', 'كركوك', 'countryside'], ['دبس', 'كركوك', 'countryside'], ['داقوق', 'كركوك', 'desert'],
  ['أربيل', 'أربيل', 'city'], ['شقلاوة', 'أربيل', 'mountains'], ['سوران', 'أربيل', 'mountains'], ['كويسنجق', 'أربيل', 'mountains'],
  ['السليمانية', 'السليمانية', 'city'], ['حلبجة', 'حلبجة', 'mountains'], ['رانية', 'السليمانية', 'mountains'], ['دربندخان', 'السليمانية', 'mountains'], ['جمجمال', 'السليمانية', 'countryside'],
  ['دهوك', 'دهوك', 'city'], ['العمادية', 'دهوك', 'ice'], ['عقرة', 'دهوك', 'mountains'],
  ['الكوفة', 'النجف', 'city'], ['بحر النجف', 'النجف', 'desert'], ['المناذرة', 'النجف', 'palms'],
  ['عين التمر', 'كربلاء', 'palms'], ['الهندية', 'كربلاء', 'palms'], ['بحيرة الرزازة', 'كربلاء', 'desert'],
];
const OIL_GOVS = ['البصرة', 'كركوك', 'ميسان', 'صلاح الدين'];
const RIVER_PLACES = /(دجلة|الفرات|شط|الكوت|العمارة|الحلة|المسيب|الصويرة|هيت|حديثة|عنة|القرنة|الكوفة|الهندية|الموصل|تكريت|بلد|الشرقاط|الرميثة|الخضر|الشامية|الناصرية|سوق الشيوخ)/;
const TIME_KEYS = ['day', 'day', 'noon', 'dawn', 'sunset', 'night'];

export function regionForLevel(L) {
  if (L <= IRAQ_REGIONS.length) return { ...IRAQ_REGIONS[L - 1], id: L };
  const r = rng(L * 7717 + 99);
  const p = pick(r, PLACES), q = pick(r, PLACES.filter(x => x[1] !== p[1]));
  let base = p[2];
  const tpl = r();
  let name;
  if (base === 'city') name = tpl < 0.45 ? `${p[1] === p[0] ? p[0] : p[1] + ' – ' + p[0]}` : tpl < 0.75 ? `سوق ${p[0]}` : `أحياء ${p[0]}`;
  else if (base === 'desert') name = tpl < 0.5 ? `بادية ${p[0]}` : tpl < 0.8 ? `طريق ${p[0]} – ${q[0]}` : `أطراف ${p[0]}`;
  else if (base === 'marsh') name = `أهوار ${p[0]}`;
  else if (base === 'mountains' || base === 'ice') name = tpl < 0.5 ? `جبال ${p[0]}` : `وادي ${p[0]}`;
  else name = tpl < 0.4 ? `بساتين ${p[0]}` : tpl < 0.7 ? `قرى ${p[0]}` : `ضواحي ${p[0]}`;
  if (base === 'mountains' && r() < 0.3) base = 'ice';
  const features = ['road'];
  if (base === 'city' || base === 'ruins') { features.length = 0; features.push('street'); if (r() < 0.35) features.push('shanasheel'); }
  if (OIL_GOVS.includes(p[1]) && base !== 'city' && r() < 0.6) features.push('oil');
  if (RIVER_PLACES.test(p[0]) && base !== 'marsh' && base !== 'ice') { features.push('river'); if (r() < 0.6) features.push('boats'); }
  if (base === 'marsh') features.push('marsh', 'mudhif', 'boats');
  const time = base === 'ice' && r() < 0.5 ? 'day' : pick(r, TIME_KEYS);
  const props = base === 'countryside' && r() < 0.5 ? { orange: 5 } : base === 'palms' ? { palm: 9 } : {};
  return { name, gov: p[1], base, time, features, props, damaged: base === 'ruins' || r() < 0.25, generated: true, id: L, other: q[0] };
}

// ============================================================ TEXTURES (buildings)
const BRICKS = [
  ['#c9a46c', '#b48f5a'], ['#d8bf8e', '#c4a878'], ['#bfa78a', '#a99170'], ['#e3d6bf', '#cfc0a6'], ['#a8876a', '#957457'], ['#d2c6b0', '#bcae96'],
];
function brickTex(pal, variant, night) {
  return cached(`brick|${pal[0]}|${variant}|${night}`, () => {
    const r = rng(variant * 31 + pal[0].length * 7 + 3);
    const W = 512, H = 256; // = 8m x 4m  (2 floors, 4 windows)
    const lit = [];
    const map = canvasTex(W, H, (g) => {
      g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
      // yellow brick (طابوق)
      for (let y = 0; y < H; y += 8) {
        const off = (y / 8) % 2 ? 10 : 0;
        for (let x = -20 + off; x < W; x += 20) {
          const v = (r() - 0.5) * 22;
          g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 240 : 0},${v > 0 ? 210 : 0},${Math.abs(v) / 120})`;
          g.fillRect(x + 1, y + 1, 18, 6);
        }
        g.fillStyle = 'rgba(255,250,235,0.18)'; g.fillRect(0, y, W, 1);
      }
      // windows: 4 across, 2 rows
      for (let row = 0; row < 2; row++) for (let c = 0; c < 4; c++) {
        const x = c * 128 + 34, y = row * 128 + 30, w = 60, h = 72;
        g.fillStyle = pal[1]; g.fillRect(x - 8, y - 8, w + 16, h + 16); // frame
        const on = night ? r() < 0.45 : false; lit.push(on);
        g.fillStyle = on ? '#ffd98a' : (r() < 0.5 ? '#26323a' : '#1d2226'); g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, w / 2, h);
        // iron grill (شبابيك حديد)
        g.strokeStyle = 'rgba(40,40,40,0.85)'; g.lineWidth = 3;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (w * k) / 4, y); g.lineTo(x + (w * k) / 4, y + h); g.stroke(); }
        g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 10, y + h + 6, w + 20, 5); // sill
        // AC stains / dirt streaks
        g.fillStyle = 'rgba(60,40,20,0.15)'; g.fillRect(x + 4, y + h + 11, 6, 30 + r() * 30);
      }
    });
    let emissive = null;
    if (night) {
      let i = 0;
      emissive = canvasTex(W, H, (g) => {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        for (let row = 0; row < 2; row++) for (let c = 0; c < 4; c++) {
          if (lit[i++]) { g.fillStyle = '#ffcf70'; g.fillRect(c * 128 + 34, row * 128 + 30, 60, 72); }
        }
      });
    }
    return { map, emissive };
  });
}
function houseMat(pal, variant, night) {
  return mat(`housemat|${pal[0]}|${variant}|${night}`, () => {
    const { map, emissive } = brickTex(pal, variant, night);
    const m = std(0xffffff, 0.92, 0, { map });
    if (emissive) { m.emissiveMap = emissive; m.emissive = new THREE.Color('#ffd27a'); m.emissiveIntensity = 1.2; }
    return m;
  });
}
const latticeTex = () => cached('lattice', () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5a3a1e'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8a5f34'; g.lineWidth = 4;
  for (let i = -w; i < w * 2; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  g.fillStyle = '#3e2712'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 8, h); g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, h / 2 - 4, w, 8);
}, { wrap: true }));
const shutterTex = () => cached('shutter', () => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#8b8f92'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) { g.fillStyle = '#a7abae'; g.fillRect(0, y, w, 3); g.fillStyle = '#6b6f72'; g.fillRect(0, y + 6, w, 2); }
  g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(0, h - 24, w, 24);
}, { wrap: true }));
const reedTex = () => cached('reed', () => canvasTex(256, 256, (g, w, h) => {
  const r = rng(77);
  g.fillStyle = '#c9b07a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,90,40,0.35)' : 'rgba(250,230,170,0.35)'; g.fillRect(r() * w, 0, 1 + r() * 2, h); }
  for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(90,60,25,0.6)'; g.fillRect(0, y, w, 4); }
}, { wrap: true }));
const ishtarTex = () => cached('ishtar', () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#1d4f9a'; g.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? -12 : 0; x < w; x += 24) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,40'},${0.04 + r() * 0.08})`; g.fillRect(x + 1, y + 1, 22, 10);
  }
  // rows of golden animals (stylized)
  for (const row of [110, 300]) for (let x = 40; x < w; x += 150) {
    g.fillStyle = '#e9c35a';
    g.beginPath(); g.ellipse(x + 40, row, 42, 20, 0, 0, 7); g.fill();
    g.fillRect(x + 8, row + 10, 8, 34); g.fillRect(x + 64, row + 10, 8, 34);
    g.beginPath(); g.ellipse(x + 86, row - 18, 14, 12, -0.4, 0, 7); g.fill();
    g.fillRect(x + 90, row - 46, 4, 24); g.fillRect(x - 6, row - 6, 10, 4);
  }
  g.fillStyle = '#f2f2f2'; for (const y of [30, 210, 400]) for (let x = 12; x < w; x += 36) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = '#e9c35a'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#f2f2f2'; }
}, { wrap: true }));
const oldBrickTex = (color) => cached('oldbrick' + color, () => canvasTex(256, 256, (g, w, h) => {
  const r = rng(color.length * 13);
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? -14 : 0; x < w; x += 28) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(x + 1, y + 1, 26, 8); }
  g.fillStyle = 'rgba(255,255,255,0.1)'; for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 1);
}, { wrap: true }));
const hadbaTex = () => cached('hadba', () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#b88f5c'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) {
    g.fillStyle = '#9d7646'; g.fillRect(0, y, w, 28);
    g.strokeStyle = '#d8b582'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 28) { g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x + 14, y); g.lineTo(x + 28, y + 14); g.lineTo(x + 14, y + 28); g.closePath(); g.stroke(); }
  }
}, { wrap: true }));

// ============================================================ BUILDINGS
export function iraqHouse(r, o = {}) {
  const g = new THREE.Group();
  const floors = o.floors ?? (1 + Math.floor(r() * 3));
  const w = o.w ?? (6 + Math.floor(r() * 3) * 2), d = o.d ?? (6 + r() * 3), H = floors * 4;
  const pal = pick(r, BRICKS);
  const m = houseMat(pal, Math.floor(r() * 3), !!o.night);
  const damaged = !!o.damaged;
  const geo = new THREE.BoxGeometry(w, H + 2, d, damaged ? 6 : 1, damaged ? 6 : 1, 1);
  geo.translate(0, (H + 2) / 2 - 2, 0);
  if (damaged) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > H - 0.01 && r() < 0.8) pos.setY(i, H - r() * Math.min(H * 0.45, 5));
    geo.computeVertexNormals();
  }
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 8, (uv.getY(i) * (H + 2) - 2) / 8 + 0.0);
  const box = new THREE.Mesh(geo, m); g.add(box);
  const fz = d / 2;
  const trim = mat('trim' + pal[1], () => std(pal[1], 0.9, 0));
  // floor bands
  for (let f = 1; f < floors; f++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.18, 0.12), trim); b.position.set(0, f * 4, fz + 0.04); g.add(b); }
  if (!damaged) {
    // parapet
    for (const [px, pz, sx, sz] of [[0, fz, w, 0.2], [0, -fz, w, 0.2], [w / 2, 0, 0.2, d], [-w / 2, 0, 0.2, d]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.6, sz), trim); p.position.set(px, H + 0.3, pz); g.add(p);
    }
    // water tanks (خزانات الماء)
    const nt = o.plainRoof ? 0 : 1 + Math.floor(r() * 3);
    for (let i = 0; i < nt; i++) {
      const tc = pick(r, ['#1b1b1b', '#efefef', '#2b6cb0', '#e0d6b8', '#1b1b1b']);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 14), mat('tank' + tc, () => std(tc, 0.5, 0.1)));
      tank.position.set(-w / 2 + 1 + r() * (w - 2), H + 1.15, -fz + 1.2 + r() * (d - 2.4)); g.add(tank);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), mat('rebar', () => std('#4a3020', 0.6, 0.7))); stand.position.set(tank.position.x, H + 0.3, tank.position.z); g.add(stand);
    }
    // satellite dish (ستلايت)
    if (!o.plainRoof && r() < 0.7) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 6, 0, Math.PI * 2, 0, 0.9), mat('dish', () => std('#e9e9e6', 0.5, 0.3, { side: THREE.DoubleSide })));
      dish.position.set(-w / 2 + 0.8 + r() * (w - 1.6), H + 1.0, fz - 0.8); dish.rotation.x = 1.0 + r() * 0.3; dish.rotation.z = (r() - 0.5); g.add(dish);
    }
    if (!o.plainRoof && r() < 0.18) { const f = iraqFlagPole(3.2); f.root.position.set(w / 2 - 0.6, H, fz - 0.6); g.add(f.root); g.userData.flags = [f]; }
  } else {
    // shell holes
    const hm = mat('hole', () => new THREE.MeshBasicMaterial({ color: '#0d0b09' }));
    for (let i = 0; i < 2 + r() * 3; i++) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.3 + r() * 0.5, 7), hm);
      hole.position.set((r() - 0.5) * (w - 2), 4 + r() * Math.max(0.5, H - 6), fz + 0.03); hole.rotation.z = r() * 3; g.add(hole);
    }
  }
  // AC units on facade
  const acm = mat('ac', () => std('#d9d9d4', 0.6, 0.2));
  for (let f = 1; f < floors; f++) if (r() < 0.75) { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.5), acm); ac.position.set(-w / 2 + 1 + Math.floor(r() * (w / 2)) * 2, f * 4 + 0.6, fz + 0.25); g.add(ac); }
  // shanasheel (شناشيل)
  if (o.shanasheel && floors >= 2 && !damaged) {
    const sw = Math.min(w - 1.5, 4 + r() * 2);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(sw, 2.8, 1.0), [mat('woodside', () => std('#4a2f17', 0.8, 0)), mat('woodside'), mat('woodside'), mat('woodside'), mat('lattice', () => std(0xffffff, 0.8, 0, { map: latticeTex() })), mat('woodside')]);
    sh.position.set((r() - 0.5) * (w - sw) * 0.8, 4 + 1.8, fz + 0.5); g.add(sh);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.3, 0.2, 1.2), mat('woodside')); cap.position.set(sh.position.x, 4 + 3.3, fz + 0.55); g.add(cap);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.9), mat('woodside')); c.position.set(sh.position.x + s * (sw / 2 - 0.3), 4.2, fz + 0.45); g.add(c); }
  }
  // ground-floor shop with sign
  if (o.shop) {
    const s = o.shop;
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 2.7, 0.1), mat('shutter', () => std(0xffffff, 0.5, 0.6, { map: shutterTex() })));
    shutter.position.set(0, 1.35, fz + 0.05);
    if (r() < 0.5 && !damaged) { // open shop: dark interior + goods
      shutter.material = mat('shopin', () => std('#1a1612', 1, 0));
      const gm = [mat('goods1', () => std('#c0392b', 0.8, 0)), mat('goods2', () => std('#f1c40f', 0.8, 0)), mat('goods3', () => std('#27ae60', 0.8, 0)), mat('goods4', () => std('#ecf0f1', 0.8, 0))];
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), gm[i % 4]); b.position.set(-w / 2 + 1 + i * (w - 2) / 6, 0.25 + (i % 2) * 0.5, fz + 0.4); g.add(b); }
      const shopLight = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.2, 0.12), mat('tubelight', () => new THREE.MeshBasicMaterial({ color: '#f4fbff' }))); shopLight.position.set(0, 2.55, fz + 0.11); g.add(shopLight);
    }
    g.add(shutter);
    const sw = w - 0.4, sh = Math.min(1.4, sw / 4);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: signTex(s[0], s[1], s[2]), fog: true }));
    sign.position.set(0, 2.7 + sh / 2 + 0.05, fz + 0.12);
    if (damaged) { sign.rotation.z = (r() - 0.5) * 0.25; sign.material.color.set('#9a9a9a'); }
    g.add(sign);
  }
  g.userData.w = w; g.userData.d = d; g.userData.h = H;
  return shadow(g);
}

export function tWalls(n = 5) {
  const g = new THREE.Group();
  const m = mat('concrete', () => std('#b7b2a6', 0.95, 0));
  for (let i = 0; i < n; i++) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.6, 0.3), m); wall.position.set(i * 1.55, 1.8, 0); g.add(wall);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.4), m); foot.position.set(i * 1.55, 0.25, 0); g.add(foot);
  }
  return shadow(g);
}

export function cableSpan(len, r) {
  const g = new THREE.Group();
  const pm = mat('cpole', () => std('#6a6a66', 0.7, 0.5));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), pm); pole.position.y = 4; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.6), pm); arm.position.y = 7.6; g.add(arm);
  const wm = mat('wire', () => new THREE.MeshBasicMaterial({ color: '#141414' }));
  const n = 5 + Math.floor(r() * 6); // مولدات الحي: أسلاك متشابكة
  for (let i = 0; i < n; i++) {
    const y0 = 6.2 + r() * 1.6, y1 = 6.2 + r() * 1.6, z0 = (r() - 0.5) * 1.4, z1 = (r() - 0.5) * 1.4;
    const sag = 0.6 + r() * 2.2;
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, y0, z0), new THREE.Vector3(len / 2, (y0 + y1) / 2 - sag * 2, (z0 + z1) / 2 + (r() - 0.5)), new THREE.Vector3(len, y1, z1));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.025, 3), wm));
  }
  pole.castShadow = true;
  return g;
}

export function streetSign(text) {
  const g = new THREE.Group();
  const pm = mat('signpole', () => std('#8a8f94', 0.5, 0.6));
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), pm); p.position.y = 1.6; g.add(p);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTex(text, null, '#1d4f9c', '#ffffff', '#ffffff'), fog: true, side: THREE.DoubleSide }));
  s.position.y = 3.0; g.add(s);
  return shadow(g);
}

export function billboard(lines, bg) {
  const g = new THREE.Group();
  const pm = mat('signpole', () => std('#8a8f94', 0.5, 0.6));
  for (const x of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), pm); p.position.set(x, 2, 0); g.add(p); }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.7, 0.2), mat('bbback', () => std('#444', 0.7, 0.4)));
  panel.position.y = 5.6; g.add(panel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.5), new THREE.MeshBasicMaterial({ map: roadSignTex(lines, bg), fog: true }));
  face.position.set(0, 5.6, 0.11); g.add(face);
  return shadow(g);
}

export function checkpoint() {
  const g = new THREE.Group();
  const booth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), mat('booth', () => std('#d9d4c4', 0.8, 0.1))); booth.position.set(0, 1.3, -3.2); g.add(booth);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.8), mat('boothroof', () => std('#3c5a3a', 0.8, 0.1))); roof.position.set(0, 2.72, -3.2); g.add(roof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }))); win.position.set(0, 1.7, -2.09); g.add(win);
  const tw = tWalls(4); tw.position.set(-9, 0, -4.8); g.add(tw);
  const barrier = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), mat('barrier', () => std('#d32f2f', 0.6, 0.2))); bar.position.set(0, 1.1, 0); barrier.add(bar);
  barrier.position.set(1.6, 0, -1.6); barrier.rotation.x = -1.2; g.add(barrier);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex('سيطرة الجيش العراقي', 'أهلاً بكم', '#2f4a2c'), fog: true }));
  sign.position.set(0, 3.3, -2.05); g.add(sign);
  const f = iraqFlagPole(6.5); f.root.position.set(-1.8, 0, -3.4); g.add(f.root);
  g.userData.flags = [f];
  return shadow(g);
}

function carBody(color, stripe) {
  const g = new THREE.Group();
  const paint = mat('car' + color, () => std(color, 0.4, 0.4));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));
  const tire = mat('tire', () => std('#151514', 0.95, 0.05));
  const low = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.7), paint); low.position.y = 0.75; g.add(low);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.55), paint); cab.position.set(-0.2, 1.5, 0); g.add(cab);
  const w = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.5, 1.58), glass); w.position.set(-0.2, 1.52, 0); g.add(w);
  if (stripe) { const s = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.22, 1.72), mat('car' + stripe, () => std(stripe, 0.4, 0.3))); s.position.y = 0.95; g.add(s); }
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12); wg.rotateX(Math.PI / 2);
  for (const x of [-1.35, 1.35]) for (const z of [-0.8, 0.8]) { const t = new THREE.Mesh(wg, tire); t.position.set(x, 0.36, z); g.add(t); }
  return g;
}
export function taxi(r) { // تكسي بغداد برتقالي وأبيض
  const g = carBody('#f28c28', '#ffffff');
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.3), mat('taxisign', () => std('#ffffff', 0.4, 0, { emissive: '#ffffaa', emissiveIntensity: 0.3 }))); sign.position.set(-0.2, 1.97, 0); g.add(sign);
  if (r && r() < 0.5) { g.traverse(o => { if (o.isMesh && o !== sign) o.material = mat('burnt', () => std('#1d1a17', 1, 0.2)); }); g.rotation.z = (r() - 0.5) * 0.1; }
  return shadow(g);
}
export function kiaBus(r) { // كيا
  const g = new THREE.Group();
  const paint = mat('kia', () => std('#f2f0ea', 0.45, 0.3));
  const glass = mat('glass', () => std('#9ad4ff', 0.1, 0.9, { emissive: '#163040', emissiveIntensity: 0.6 }));
  const b = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.0, 2.0), paint); b.position.y = 1.4; g.add(b);
  const st = new THREE.Mesh(new THREE.BoxGeometry(5.22, 0.25, 2.02), mat('kiastripe', () => std('#1565c0', 0.5, 0.2))); st.position.y = 1.0; g.add(st);
  const wnd = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 2.02), glass); wnd.position.set(-0.1, 1.95, 0); g.add(wnd);
  const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12); wg.rotateX(Math.PI / 2);
  for (const x of [-1.7, 1.7]) for (const z of [-0.9, 0.9]) { const t = new THREE.Mesh(wg, mat('tire', () => std('#151514', 0.95, 0.05))); t.position.set(x, 0.38, z); g.add(t); }
  if (r && r() < 0.5) g.traverse(o => { if (o.isMesh) o.material = mat('burnt', () => std('#1d1a17', 1, 0.2)); });
  return shadow(g);
}

export function orangeTree(r) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), mat('trunk', () => std('#4e3a26', 0.95, 0))); t.position.y = 0.8; g.add(t);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + r() * 0.5, 1), mat('orangeleaf', () => std('#2f5a22', 0.85, 0, { flatShading: true }))); crown.position.y = 2.4; crown.scale.y = 0.85; g.add(crown);
  const om = mat('orangefruit', () => std('#ff8f1a', 0.5, 0));
  const og = new THREE.SphereGeometry(0.13, 8, 6);
  for (let i = 0; i < 14; i++) { const o = new THREE.Mesh(og, om); const a = r() * 6.28, b = r() * 1.4 - 0.2; o.position.set(Math.cos(a) * Math.cos(b) * 1.55, 2.4 + Math.sin(b) * 1.3, Math.sin(a) * Math.cos(b) * 1.55); g.add(o); }
  return shadow(g);
}

export function reeds(r, n = 40) { // قصب الأهوار
  const geo = new THREE.ConeGeometry(0.05, 1, 4); geo.translate(0, 0.5, 0);
  const m = mat('reedplant', () => std('#a89a5a', 0.9, 0));
  const im = new THREE.InstancedMesh(geo, m, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    o.position.set((r() - 0.5) * 3.5, 0, (r() - 0.5) * 2.5);
    o.rotation.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
    o.scale.set(1, 2.5 + r() * 2.2, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, new THREE.Color().setHSL(0.13 + r() * 0.06, 0.35, 0.35 + r() * 0.2));
  }
  im.castShadow = true;
  const g = new THREE.Group(); g.add(im); return g;
}

export function mudhif(r) { // مضيف القصب
  const g = new THREE.Group();
  const rm = mat('reedwall', () => std(0xffffff, 0.95, 0, { map: reedTex(), side: THREE.DoubleSide }));
  const len = 12 + r() * 6;
  const roofGeo = new THREE.CylinderGeometry(3.6, 3.6, len, 18, 1, true, -Math.PI / 2, Math.PI);
  roofGeo.rotateZ(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, rm); roof.scale.set(1, 1.25, 1); g.add(roof);
  const bundle = mat('reedbundle', () => std('#b39a62', 0.95, 0));
  for (const x of [-len / 2, len / 2]) for (let k = -3; k <= 3; k++) {
    const a = (k / 3) * (Math.PI / 2) * 0.95;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 6), bundle);
    c.position.set(x, Math.cos(a) * 3.6 * 1.25, Math.sin(a) * 3.6); g.add(c);
  }
  for (const x of [-len / 2 - 0.3, len / 2 + 0.3]) for (const z of [-1.5, 1.5]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 5.5, 8), bundle); t.position.set(x, 2.75, z); g.add(t); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), mat('hole', () => new THREE.MeshBasicMaterial({ color: '#0d0b09' }))); door.position.set(0, 1.1, 3.58); g.add(door);
  return shadow(g);
}

export function boat(r) { // مشحوف
  const geo = new THREE.BoxGeometry(6, 0.5, 1.0, 12, 1, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 3; p.setZ(i, p.getZ(i) * (1 - x * x * 0.92)); p.setY(i, p.getY(i) + x * x * 0.5); }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const hull = new THREE.Mesh(geo, mat('mashoof', () => std('#2a1e14', 0.7, 0.1))); hull.position.y = 0.1; g.add(hull);
  if (r() < 0.6) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 5), mat('trunk', () => std('#4e3a26', 0.95, 0))); pole.position.set(1, 1.5, 0); pole.rotation.z = 0.5; g.add(pole); }
  return shadow(g);
}

export function pumpjack() {
  const g = new THREE.Group();
  const steel = mat('pjsteel', () => std('#2a3a55', 0.5, 0.6));
  const yel = mat('pjyellow', () => std('#e8b923', 0.5, 0.4));
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 1.8), mat('concrete', () => std('#b7b2a6', 0.95, 0))); base.position.y = 0.3; g.add(base);
  for (const z of [-0.6, 0.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.4, 0.25), steel); leg.position.set(0, 2.6, z); leg.rotation.x = z > 0 ? 0.12 : -0.12; g.add(leg); }
  const beamPivot = new THREE.Group(); beamPivot.position.set(0, 4.8, 0); g.add(beamPivot);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 0.4), yel); beamPivot.add(beam);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12, 1, false, -0.9, 1.8), yel); head.rotation.x = Math.PI / 2; head.position.set(3.4, 0, 0); beamPivot.add(head);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 5), steel); rod.position.set(4.4, -2.2, 0); beamPivot.add(rod);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.3), steel); crank.position.set(-2.8, 1.8, 0.7); g.add(crank);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), steel); motor.position.set(-3, 1.2, 0); g.add(motor);
  const off = Math.random() * 6;
  g.userData.update = (t) => { beamPivot.rotation.z = Math.sin(t * 1.3 + off) * 0.22; rod.position.y = -2.2 + Math.sin(t * 1.3 + off) * 0.7; crank.rotation.z = t * 1.3 + off; };
  return shadow(g);
}

let fireTexC;
function fireTex() {
  if (!fireTexC) fireTexC = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.6, w / 2);
    grd.addColorStop(0, 'rgba(255,255,220,1)'); grd.addColorStop(0.25, 'rgba(255,200,60,0.95)'); grd.addColorStop(0.6, 'rgba(255,90,10,0.55)'); grd.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { wrap: false });
  return fireTexC;
}
export function flareStack() { // شعلة غاز
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 20, 10), mat('flarepipe', () => std('#8c8c88', 0.5, 0.7))); p.position.y = 10; g.add(p);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 10), mat('pjred', () => std('#c62828', 0.6, 0.3))); b.position.y = 5 + i * 6; g.add(b); }
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  fl.position.y = 22.5; fl.scale.set(4, 7, 1); g.add(fl);
  const off = Math.random() * 10;
  g.userData.update = (t) => { const k = 1 + Math.sin(t * 13 + off) * 0.12 + Math.sin(t * 7.3 + off) * 0.1; fl.scale.set(4 * k, 7.5 * k, 1); fl.position.y = 22.5 + (k - 1) * 3; };
  shadow(g); fl.castShadow = false;
  return g;
}
export function oilTank() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 9, 28), mat('oiltank', () => std('#e8e6df', 0.6, 0.3))); t.position.y = 4.5; g.add(t);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.05, 6.05, 1, 28), mat('pjred', () => std('#c62828', 0.6, 0.3))); band.position.y = 6.5; g.add(band);
  return shadow(g);
}

// ============================================================ LANDMARKS (معالم)
export function landmark(kind, r) {
  const g = new THREE.Group();
  if (kind === 'hadba') { // منارة الحدباء
    const m = mat('hadbam', () => { const t = hadbaTex(); t.repeat.set(3, 4); return std(0xffffff, 0.95, 0, { map: t }); });
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 8), mat('hadbabase', () => std(0xffffff, 0.95, 0, { map: oldBrickTex('#a88456') }))); base.position.y = 5; g.add(base);
    const tower = new THREE.Group(); tower.position.y = 10; tower.rotation.z = 0.075; g.add(tower);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.1, 42, 24), m); shaft.position.y = 21; tower.add(shaft);
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 1.6, 24), mat('hadbabase')); balcony.position.y = 42; tower.add(balcony);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 5, 16), m); top.position.y = 45; tower.add(top);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('hadbabase')); dome.position.y = 47.5; tower.add(dome);
  } else if (kind === 'malwiya') { // ملوية سامراء
    const m = mat('malwiyam', () => std(0xffffff, 0.95, 0, { map: oldBrickTex('#bf9f6a') }));
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 32), m); plinth.position.y = 1.5; g.add(plinth);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 13, 50, 32), m); core.position.y = 28; g.add(core);
    const pts = [];
    for (let i = 0; i <= 600; i++) { const k = i / 600, a = k * Math.PI * 2 * 5, y = 3 + k * 50, rad = THREE.MathUtils.lerp(13.6, 4.1, k); pts.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad)); }
    const ramp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 1.1, 4), m); g.add(ramp);
    const pav = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 6, 16), m); pav.position.y = 56; g.add(pav);
  } else if (kind === 'ziggurat') { // زقورة أور
    const m = mat('zigm', () => { const t = oldBrickTex('#a9845a'); t.repeat.set(6, 3); return std(0xffffff, 0.95, 0, { map: t }); });
    const tier = (wTop, wBot, h, depthK, y, z) => {
      const geo = new THREE.CylinderGeometry(wTop / Math.SQRT2, wBot / Math.SQRT2, h, 4, 1); geo.rotateY(Math.PI / 4);
      const t = new THREE.Mesh(geo, m); t.scale.z = depthK; t.position.set(0, y + h / 2, z); g.add(t); return t;
    };
    tier(56, 64, 11, 0.66, 0, 0);
    tier(36, 42, 8, 0.7, 11, -4);
    tier(20, 24, 6, 0.75, 19, -6);
    const shrine = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), m); shrine.position.set(0, 27, -6); g.add(shrine);
    const run = 22, rise = 11;
    for (const [x, ang] of [[0, 0], [-11, 0.55], [11, -0.55]]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(5, 1, Math.hypot(run, rise)), m);
      st.position.set(x + Math.sin(ang) * 6, rise / 2, 21 + run / 2 - 2); st.rotation.x = Math.atan2(rise, run); st.rotation.y = ang; g.add(st);
    }
  } else if (kind === 'ishtar') { // بوابة عشتار
    const blue = mat('ishtarm', () => { const t = ishtarTex(); t.repeat.set(1, 1); return std(0xffffff, 0.45, 0.1, { map: t }); });
    const s = new THREE.Shape(); s.moveTo(-7, 0); s.lineTo(7, 0); s.lineTo(7, 20); s.lineTo(-7, 20); s.closePath();
    const hole = new THREE.Path(); hole.moveTo(-3.2, 0); hole.lineTo(3.2, 0); hole.lineTo(3.2, 9); hole.absarc(0, 9, 3.2, 0, Math.PI, false); hole.lineTo(-3.2, 0);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: false }); geo.translate(0, 0, -4);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 14, uv.getY(i) / 14);
    g.add(new THREE.Mesh(geo, blue));
    for (const x of [-10.5, 10.5]) { const t = new THREE.Mesh(new THREE.BoxGeometry(7, 26, 10), blue); t.position.set(x, 13, 0); g.add(t); }
    const cren = new THREE.BoxGeometry(1.2, 1.6, 1.2);
    for (let x = -13.5; x <= 13.5; x += 2) { const c = new THREE.Mesh(cren, blue); c.position.set(x, Math.abs(x) > 7 ? 26.8 : 20.8, 4.2); g.add(c); }
    const wall = mat('babwall', () => { const t = oldBrickTex('#c4a46e'); t.repeat.set(10, 2); return std(0xffffff, 0.95, 0, { map: t }); });
    for (const x of [-45, 45]) { const w = new THREE.Mesh(new THREE.BoxGeometry(56, 13, 6), wall); w.position.set(x, 6.5, -1); g.add(w); for (let k = -26; k <= 26; k += 4) { const c = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 6.2), wall); c.position.set(x + k, 14, -1); g.add(c); } }
  } else if (kind === 'citadel') { // قلعة أربيل
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(55, 75, 26, 48), mat('mound', () => std('#a4895f', 1, 0, { flatShading: true }))); mound.scale.z = 0.55; mound.position.y = 13; g.add(mound);
    const wm = mat('citwall', () => { const t = oldBrickTex('#c9a874'); t.repeat.set(12, 1); return std(0xffffff, 0.95, 0, { map: t }); });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, h = 8 + r() * 5;
      const b = new THREE.Mesh(new THREE.BoxGeometry(14, h, 6), wm);
      b.position.set(Math.cos(a) * 52, 26 + h / 2, Math.sin(a) * 52 * 0.55); b.rotation.y = -a + Math.PI / 2; g.add(b);
    }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 8), wm); gate.position.set(0, 30, 30); g.add(gate);
    const arch = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), mat('hole', () => new THREE.MeshBasicMaterial({ color: '#0d0b09' }))); arch.position.set(0, 25.5, 34.05); g.add(arch);
    const f = iraqFlagPole(10); f.root.position.set(0, 38, 30); g.add(f.root); g.userData.flags = [f];
  } else if (kind === 'tower') { // برج بغداد
    const cm = mat('towerc', () => std('#d9d3c7', 0.7, 0.1));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.5, 120, 20), cm); shaft.position.y = 60; g.add(shaft);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 14, 24), cm); bulb.position.y = 112; g.add(bulb);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 4, 24), mat('towerglass', () => std('#3a6a8a', 0.2, 0.8, { emissive: '#1a3a50', emissiveIntensity: 0.5 }))); ring.position.y = 110; g.add(ring);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 30, 8), mat('antred', () => std('#c62828', 0.6, 0.3))); ant.position.y = 134; g.add(ant);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3030' })); light.position.y = 149; g.add(light);
  } else if (kind === 'freedom') { // نصب الحرية
    const slabM = mat('travertine', () => std('#ece6d8', 0.8, 0));
    const slab = new THREE.Mesh(new THREE.BoxGeometry(50, 10, 1.6), slabM); slab.position.y = 11; g.add(slab);
    for (const x of [-20, 0, 20]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 1.4), slabM); p.position.set(x, 3, 0); g.add(p); }
    const bronze = mat('bronze', () => std('#5a3e22', 0.5, 0.8));
    for (let i = 0; i < 14; i++) {
      const fig = new THREE.Group();
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const bh = 1.6 + r() * 1.6;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, bh, 0.5), bronze); b.position.set(k * 0.75 - n * 0.35, bh / 2 - 2.6, 0); b.rotation.z = (r() - 0.5) * 0.5; fig.add(b);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), bronze); hd.position.set(b.position.x + Math.sin(-b.rotation.z) * bh / 2, bh - 2.4, 0); fig.add(hd);
        if (r() < 0.5) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), bronze); arm.position.set(b.position.x + 0.3, bh - 2.9, 0.1); arm.rotation.z = -0.6 - r(); fig.add(arm); }
      }
      fig.position.set(-23 + i * 3.5, 11, 1.1); g.add(fig);
    }
  } else if (kind === 'dalal') { // جسر دلال
    const s = new THREE.Shape();
    s.moveTo(-26, -6); s.lineTo(-26, 3); s.quadraticCurveTo(0, 9, 26, 3); s.lineTo(26, -6); s.lineTo(-26, -6);
    const h1 = new THREE.Path(); h1.moveTo(-9, -6); h1.lineTo(-9, -1); h1.absarc(0, -1, 9, Math.PI, 0, true); h1.lineTo(9, -6); h1.lineTo(-9, -6);
    s.holes.push(h1);
    for (const cx of [-18, 18]) { const h = new THREE.Path(); h.moveTo(cx - 3.5, -6); h.lineTo(cx - 3.5, -2); h.absarc(cx, -2, 3.5, Math.PI, 0, true); h.lineTo(cx + 3.5, -6); h.lineTo(cx - 3.5, -6); s.holes.push(h); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false }); geo.translate(0, 6, -2.5);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8);
    g.add(new THREE.Mesh(geo, mat('stonebr', () => std(0xffffff, 0.95, 0, { map: oldBrickTex('#9e9584') }))));
  }
  return shadow(g);
}

// ============================================================ PROP DISPATCH
export function buildIraqProp(kind, r, biome, region) {
  switch (kind) {
    case 'orange': return orangeTree(r);
    case 'reeds': return reeds(r);
    case 'mudhif': return mudhif(r);
    case 'boat': return boat(r);
    case 'taxi': return taxi(r);
    case 'kia': return kiaBus(r);
    case 'twall': return tWalls(3 + Math.floor(r() * 4));
    case 'pump': return pumpjack();
    case 'flare': return flareStack();
    case 'oiltank': return oilTank();
    case 'flagpole': { const f = iraqFlagPole(6 + r() * 2); f.root.userData.flags = [f]; return f.root; }
    case 'building': return iraqHouse(r, { floors: 3 + Math.floor(r() * 4), night: region && region.night, damaged: region && region.damaged && r() < 0.6 });
    case 'house': return iraqHouse(r, { floors: 1 + (r() < 0.3 ? 1 : 0), night: region && region.night, damaged: region && region.damaged && r() < 0.5 });
    default: return buildProp(kind, r, biome);
  }
}

export function streetNames(region) {
  return [...(region.streets || []), ...STREETS_GENERIC];
}
const MAIN_CITIES = ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'كركوك', 'النجف', 'كربلاء', 'الحلة', 'الكوت', 'العمارة', 'الناصرية', 'الديوانية', 'السماوة', 'الرمادي', 'بعقوبة', 'تكريت', 'دهوك', 'السليمانية', 'الفلوجة', 'سامراء', 'زاخو', 'حديثة', 'القائم'];
export function roadSignLines(region, r) {
  const others = MAIN_CITIES.filter(c => !region.name.includes(c) && c !== region.gov).map(c => [c]);
  const a = pick(r, others), b = pick(r, others);
  return [region.generated ? region.name : region.name.split(' – ')[0], `${a[0]} ${20 + Math.floor(r() * 180)} كم`, `${b[0]} ${40 + Math.floor(r() * 300)} كم`];
}
export { pick };
