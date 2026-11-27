// يبني ملف اللعبة: node scripts/bundle.mjs  (ويندوز)  |  node scripts/bundle.mjs mobile  (أندرويد/آيفون → مجلد www)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobile = process.argv[2] === 'mobile';
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
fs.writeFileSync(path.join(root, 'src', 'version.json'), JSON.stringify({ version }) + '\n');

const out = mobile ? path.join(root, 'www') : path.join(root, 'src');
if (mobile) { fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'assets'), { recursive: true }); }
await build({
  entryPoints: [path.join(root, 'src', 'game.js')],
  bundle: true, minify: true, format: 'iife',
  outfile: path.join(out, 'game.bundle.js'),
  define: { __LITE__: mobile ? 'true' : 'false' },
  // الموبايل: صيغة جافاسكربت قديمة حتى تشتغل على نسخ WebView القديمة بأجهزة الأندرويد
  ...(mobile ? { target: ['es2017'] } : {}),
});
if (mobile) {
  fs.copyFileSync(path.join(root, 'src', 'index.html'), path.join(out, 'index.html'));
  // المجسمات: النسخة المخففة من assets-m إذا موجودة، وإلا الأصلية. نسخ البنايات البعيدة (_far) تصير هي القريبة.
  const hd = path.join(root, 'src', 'assets'), lite = path.join(root, 'src', 'assets-m');
  let total = 0, n = 0;
  for (const f of fs.readdirSync(hd)) {
    if (!f.endsWith('.glb') || /_far\.glb$/.test(f)) continue;
    const far = path.join(hd, f.replace(/\.glb$/, '_far.glb'));
    const src = fs.existsSync(path.join(lite, f)) ? path.join(lite, f) : fs.existsSync(far) ? far : path.join(hd, f);
    fs.copyFileSync(src, path.join(out, 'assets', f)); total += fs.statSync(src).size; n++;
  }
  console.log(`www: ${n} models, ${(total / 1048576).toFixed(1)} MB, v${version}`);
} else console.log(`bundle v${version}`);
