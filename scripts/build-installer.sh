#!/usr/bin/env bash
# Builds dist/IBRA-TANK-Setup-<version>.exe on Linux/macOS without Wine.
# (On Windows just run: npm run dist)
set -e
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
npm run bundle
npx electron-builder --win dir --x64
NSIS_DIR=$(ls -d ~/.cache/electron-builder/nsis-3.*/nsis-3.* 2>/dev/null | grep -v '\.' | head -1 || true)
[ -z "$NSIS_DIR" ] && NSIS_DIR=$(ls -d ~/.cache/electron-builder/nsis-3*/nsis-3*-* | head -1)
MAKENSIS="$NSIS_DIR/linux/makensis"; [ "$(uname)" = "Darwin" ] && MAKENSIS="$NSIS_DIR/mac/makensis"
chmod +x "$MAKENSIS"
cd installer
NSISDIR="$NSIS_DIR" "$MAKENSIS" -V2 -DVERSION="$VERSION" -DSRCDIR="../dist/win-unpacked" -DOUTFILE="../dist/IBRA-TANK-Setup-$VERSION.exe" installer.nsi
echo "Installer: dist/IBRA-TANK-Setup-$VERSION.exe"
