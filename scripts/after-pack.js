// Sets the Windows .exe icon + version info without needing Wine (pure JS via resedit).
const path = require('path');
const fs = require('fs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const pkg = context.packager.appInfo;
  const exe = path.join(context.appOutDir, `${pkg.productFilename}.exe`);
  const data = fs.readFileSync(exe);
  const exeObj = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const resObj = ResEdit.NtExecutableResource.from(exeObj);
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(resObj.entries, 1, 1033, iconFile.icons.map((i) => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(resObj.entries)[0];
  if (vi) {
    const v = pkg.version.split('.').map((n) => parseInt(n, 10) || 0);
    vi.setFileVersion(v[0], v[1], v[2], 0, 1033);
    vi.setProductVersion(v[0], v[1], v[2], 0, 1033);
    vi.setStringValues({ lang: 1033, codepage: 1200 }, {
      FileDescription: 'IBRA TANK - Desert Shield',
      ProductName: 'IBRA TANK',
      CompanyName: 'IBRAPROGRAM',
      LegalCopyright: '© Ibrahim Al-Khazraji',
      OriginalFilename: `${pkg.productFilename}.exe`,
      InternalName: 'IBRA TANK',
    });
    vi.outputToResourceEntries(resObj.entries);
  }
  resObj.outputResource(exeObj);
  fs.writeFileSync(exe, Buffer.from(exeObj.generate()));
  console.log('  • exe icon & version info set via resedit');
};
