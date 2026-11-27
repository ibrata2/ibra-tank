// منصة الموبايل (أندرويد / آيفون): أزرار اللمس، الروابط، زر الرجوع، فحص التحديث
import pkgVersion from './version.json';

const CAP = window.Capacitor || null;
export const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
export const PLATFORM = NATIVE ? CAP.getPlatform() : (window.ibra ? 'windows' : 'web');
const qs = new URLSearchParams(location.search);
// شاشة لمس: تطبيق الموبايل، أو متصفح موبايل، أو ?touch للفحص
export const TOUCH = NATIVE || qs.has('touch') || (!window.ibra && window.matchMedia && matchMedia('(pointer:coarse)').matches);
// نسخة الموبايل تنبني بمجسمات مخففة
export const LITE = typeof __LITE__ !== 'undefined' && __LITE__;
export const VERSION = pkgVersion.version;
const plugin = (n) => { try { return NATIVE && CAP.Plugins ? CAP.Plugins[n] : null; } catch (e) { return null; } };

export function openExt(url) {
  if (window.ibra && window.ibra.open) return window.ibra.open(url);
  if (NATIVE) { location.href = url; return; } // كاباسيتور يفتحه بالتطبيق أو المتصفح الخارجي
  window.open(url, '_blank', 'noopener');
}

// يتأكد إن الجهاز يدعم WebGL2 قبل ما تبدأ اللعبة — وإذا لا يطلع رسالة واضحة بدل شاشة سودة
export function checkWebGL() {
  let ok = false;
  try { const c = document.createElement('canvas'); ok = !!c.getContext('webgl2'); } catch (e) { ok = false; }
  if (ok) return true;
  const l = document.getElementById('loader');
  if (l) {
    l.classList.add('fatal');
    const android = PLATFORM === 'android' || /Android/i.test(navigator.userAgent);
    l.innerHTML = `<div><b>اللعبة تحتاج دعم الرسوم ثلاثية الأبعاد (WebGL 2)</b><p>${android
      ? 'حدّث تطبيق «Android System WebView» و «Google Chrome» من متجر Play وبعدها افتح اللعبة من جديد.'
      : 'حدّث نظام الجهاز لآخر إصدار (iOS 15 أو أحدث) وبعدها افتح اللعبة من جديد.'}</p>${android
      ? '<button id="fix-webview">فتح صفحة التحديث بالمتجر</button>' : ''}</div>`;
    const b = document.getElementById('fix-webview');
    if (b) b.onclick = () => openExt('https://play.google.com/store/apps/details?id=com.google.android.webview');
  }
  return false;
}

// ---------------------------------------------------------------- أزرار اللمس
// كل زر يضيف كود مفتاح الكيبورد المقابل لمجموعة keys — فاللعبة كلها (كل المودات) تشتغل بدون تغيير
export function initTouch({ keys, onPause, onGesture }) {
  document.body.classList.add('touch');
  if (NATIVE) document.body.classList.add('native', 'plat-' + PLATFORM);
  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = `
    <div class="tc pad h" id="tc-move"><span data-c="ArrowLeft">◀</span><span data-c="ArrowRight">▶</span></div>
    <div class="tc pad v" id="tc-alt"><span data-c="KeyR">⤒<small>ارتفاع</small></span><span data-c="KeyF">⤓<small>نزول</small></span></div>
    <div class="tc pad v" id="tc-aim"><span data-c="ArrowUp">▲</span><span data-c="ArrowDown">▼</span></div>
    <div class="tc round" id="tc-fire"><span data-c="Space">رمي</span></div>
    <div class="tc small" id="tc-pause">❚❚</div>`;
  document.body.appendChild(root);
  const pad = (node, codeFor) => {
    let pid = null, cur = null;
    const set = (c) => {
      if (c === cur) return;
      if (cur) keys.delete(cur);
      cur = c; if (c) keys.add(c);
      node.querySelectorAll('[data-c]').forEach((s) => s.classList.toggle('on', s.dataset.c === c));
    };
    const at = (e) => { const r = node.getBoundingClientRect(); set(codeFor((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)); };
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (onGesture) onGesture();
      pid = e.pointerId; try { node.setPointerCapture(pid); } catch (err) { /* ignore */ }
      at(e);
    });
    node.addEventListener('pointermove', (e) => { if (e.pointerId === pid) at(e); });
    const end = (e) => { if (e.pointerId === pid) { pid = null; set(null); } };
    node.addEventListener('pointerup', end); node.addEventListener('pointercancel', end);
    return () => { pid = null; set(null); };
  };
  const resets = [
    pad(root.querySelector('#tc-move'), (x) => (x < 0.5 ? 'ArrowLeft' : 'ArrowRight')),
    pad(root.querySelector('#tc-aim'), (x, y) => (y < 0.5 ? 'ArrowUp' : 'ArrowDown')),
    pad(root.querySelector('#tc-alt'), (x, y) => (y < 0.5 ? 'KeyR' : 'KeyF')),
    pad(root.querySelector('#tc-fire'), () => 'Space'),
  ];
  const pz = root.querySelector('#tc-pause');
  pz.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  pz.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
  // منع التكبير والتمرير واللمسة المطولة
  const cv = document.getElementById('game');
  cv.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  root.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'contextmenu']) document.addEventListener(ev, (e) => e.preventDefault());
  let lastTap = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTap < 320 && !e.target.closest('input,select,a,button,.slot')) e.preventDefault(); lastTap = n; }, { passive: false });
  return {
    reset() { resets.forEach((f) => f()); },
    // يظهر أزرار الارتفاع بس وقت الهليكوبتر
    setHeli(on) { if (root.classList.contains('heli') !== on) root.classList.toggle('heli', on); },
  };
}

// زر الرجوع بالأندرويد + الإيقاف وقت ما التطبيق يروح للخلفية
export function initNative({ onBack, onBackground, onForeground }) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) onBackground(); else if (onForeground) onForeground(); });
  if (!NATIVE) return;
  const app = plugin('App');
  try {
    if (app) {
      app.addListener('backButton', () => { if (onBack() === 'exit') app.exitApp(); });
      app.addListener('pause', () => onBackground());
      app.addListener('resume', () => { if (onForeground) onForeground(); });
    }
  } catch (e) { /* ignore */ }
  try { const sb = plugin('StatusBar'); if (sb) sb.hide(); } catch (e) { /* ignore */ }
}
export function exitApp() {
  const app = plugin('App');
  if (app && PLATFORM === 'android') { try { app.exitApp(); } catch (e) { /* ignore */ } }
  else window.close();
}

// ---------------------------------------------------------------- فحص التحديث
const REPO_API = 'https://api.github.com/repos/ibrata2/ibra-tank/releases/latest';
const UPD = { state: 'checking', latest: null, url: null, apk: null, p: 0 };
const verCmp = (a, b) => { const pa = a.split('.').map(Number), pb = b.split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
const updPlugin = () => (PLATFORM === 'android' ? plugin('IbraUpdate') : null);
let updListen = false;
function renderUpdate() {
  for (const el of document.querySelectorAll('.upd')) {
    el.className = 'upd'; el.onclick = null;
    if (UPD.state === 'checking') el.textContent = `الإصدار ${VERSION} · جاري فحص التحديث…`;
    else if (UPD.state === 'latest') { el.classList.add('ok'); el.textContent = `الإصدار ${VERSION} · عندك آخر إصدار ✓`; }
    else if (UPD.state === 'new') { el.classList.add('new'); el.textContent = `⬇ تحديث جديد ${UPD.latest} — اضغط ${updPlugin() && UPD.apk ? 'للتثبيت' : 'للتنزيل'}`; el.onclick = startUpdate; }
    else if (UPD.state === 'downloading') { el.classList.add('new'); el.textContent = `جاري تنزيل ${UPD.latest}… ${UPD.p >= 0 ? Math.round(UPD.p * 100) + '%' : ''}`; }
    else if (UPD.state === 'installing') { el.classList.add('new'); el.textContent = 'اكتمل التنزيل — وافق على التثبيت'; el.onclick = startUpdate; }
    else if (UPD.state === 'allow') { el.classList.add('new'); el.textContent = 'اسمح للعبة بتثبيت التحديث ثم اضغط هنا مرة ثانية'; el.onclick = startUpdate; }
    else if (UPD.state === 'error') { el.classList.add('new'); el.textContent = 'تعذّر التنزيل — اضغط للمحاولة من جديد'; el.onclick = startUpdate; }
    else el.textContent = `الإصدار ${VERSION}`;
  }
}
async function startUpdate() {
  if (UPD.state === 'downloading') return;
  const pl = updPlugin();
  if (!pl || !UPD.apk) return openExt(UPD.url);
  UPD.state = 'downloading'; UPD.p = 0; renderUpdate();
  try {
    if (!updListen) { try { await pl.addListener('progress', (d) => { UPD.p = d.p; UPD.state = d.p >= 1 ? 'installing' : 'downloading'; renderUpdate(); }); } catch (e) { /* ignore */ } updListen = true; }
    const r = await pl.install({ url: UPD.apk });
    UPD.state = r && r.needPermission ? 'allow' : 'installing'; renderUpdate();
  } catch (e) { UPD.state = 'error'; renderUpdate(); }
}
export async function checkUpdate() {
  renderUpdate();
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(REPO_API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal, cache: 'no-store' });
    clearTimeout(to);
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json(); const tag = String(j.tag_name || '').replace(/^v/, '');
    if (!tag) throw new Error('no tag');
    UPD.latest = tag;
    const want = PLATFORM === 'android' ? /\.apk$/i : PLATFORM === 'ios' ? /\.ipa$/i : /\.exe$/i;
    const asset = (j.assets || []).find((a) => want.test(a.name));
    const apk = (j.assets || []).find((a) => /\.apk$/i.test(a.name));
    UPD.apk = apk ? apk.browser_download_url : null;
    // إذا النسخة الجديدة بعدها ما انرفع ملف منصتنا — ما نعرض تحديث
    UPD.url = asset ? asset.browser_download_url : null;
    UPD.state = verCmp(tag, VERSION) > 0 && (UPD.url || PLATFORM === 'web') ? 'new' : 'latest';
    if (!UPD.url) UPD.url = j.html_url;
  } catch (e) { UPD.state = 'idle'; }
  renderUpdate();
}
