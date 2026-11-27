#!/usr/bin/env bash
# يجهّز مشروع الآيفون: شاشة بالعرض، ملء الشاشة، رقم النسخة، الاسم
set -e
V="$1"; P=ios/App/App/Info.plist; PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleShortVersionString $V" "$P" || $PB -c "Add :CFBundleShortVersionString string $V" "$P"
$PB -c "Set :CFBundleVersion $V" "$P" || $PB -c "Add :CFBundleVersion string $V" "$P"
$PB -c "Set :CFBundleDisplayName IBRA TANK" "$P" || $PB -c "Add :CFBundleDisplayName string IBRA TANK" "$P"
for K in UISupportedInterfaceOrientations "UISupportedInterfaceOrientations~ipad"; do
  $PB -c "Delete :$K" "$P" || true
  $PB -c "Add :$K array" "$P"
  $PB -c "Add :$K:0 string UIInterfaceOrientationLandscapeLeft" "$P"
  $PB -c "Add :$K:1 string UIInterfaceOrientationLandscapeRight" "$P"
done
$PB -c "Add :UIRequiresFullScreen bool true" "$P" || $PB -c "Set :UIRequiresFullScreen true" "$P"
$PB -c "Add :UIStatusBarHidden bool true" "$P" || $PB -c "Set :UIStatusBarHidden true" "$P"
$PB -c "Add :UIViewControllerBasedStatusBarAppearance bool false" "$P" || $PB -c "Set :UIViewControllerBasedStatusBarAppearance false" "$P"
$PB -c "Add :ITSAppUsesNonExemptEncryption bool false" "$P" || $PB -c "Set :ITSAppUsesNonExemptEncryption false" "$P"
echo "ios patched: $V"
# الشاشة تبقى شغالة وقت اللعب
sed -i '' 's|// Override point for customization after application launch.|application.isIdleTimerDisabled = true|' ios/App/App/AppDelegate.swift || true
