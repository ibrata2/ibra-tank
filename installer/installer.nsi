; IBRA TANK — Windows installer (NSIS, built with makensis; no Wine needed)
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
RequestExecutionLevel user
ManifestDPIAware true

!ifndef VERSION
  !define VERSION "1.0.0"
!endif
!ifndef SRCDIR
  !define SRCDIR "..\dist\win-unpacked"
!endif
!ifndef OUTFILE
  !define OUTFILE "..\dist\IBRA-TANK-Setup-${VERSION}.exe"
!endif

!define APPNAME "IBRA TANK"
!define APPEXE "IBRA TANK.exe"
!define COMPANY "IBRAPROGRAM"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\IBRA-TANK"

Name "${APPNAME}"
Caption "${APPNAME} — درع الصحراء ${VERSION}"
BrandingText "IBRAPROGRAM · تصميم وتطوير إبراهيم الخزرجي"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\IBRA TANK"
InstallDirRegKey HKCU "Software\IBRA TANK" "InstallDir"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=0 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=0 "CompanyName" "${COMPANY}"
VIAddVersionKey /LANG=0 "FileDescription" "IBRA TANK Setup"
VIAddVersionKey /LANG=0 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=0 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=0 "LegalCopyright" "© Ibrahim Al-Khazraji"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "..\build\icon.ico"
!define MUI_UNICON "..\build\icon.ico"
!define MUI_ABORTWARNING
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "side.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "side.bmp"
!define MUI_WELCOMEPAGE_TITLE "أهلاً بك في تنصيب IBRA TANK"
!define MUI_WELCOMEPAGE_TEXT "لعبة دبابة ثلاثية الأبعاد بمراحل لا تنتهي:$\r$\n$\r$\nصحراء، مدن مدمرة، ريف وجليد — نهار وليل.$\r$\nطوّر دبابتك مع كل قتال واجمع أسلحة جديدة من الحطام.$\r$\n$\r$\nاضغط «التالي» للمتابعة."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APPEXE}"
!define MUI_FINISHPAGE_RUN_TEXT "تشغيل IBRA TANK الآن"
!define MUI_FINISHPAGE_LINK "قناة تليكرام IBRAPROGRAM"
!define MUI_FINISHPAGE_LINK_LOCATION "https://t.me/ibraprogram"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  StrCpy $LANGUAGE ${LANG_ARABIC}
FunctionEnd

Section "Install"
  ; close a running copy so files can be replaced (update over the installed version)
  nsExec::Exec 'taskkill /F /IM "${APPEXE}"'
  Sleep 400
  SetOutPath "$INSTDIR"
  File /r "${SRCDIR}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall IBRA TANK.exe"
  CreateDirectory "$SMPROGRAMS\IBRA TANK"
  CreateShortcut "$SMPROGRAMS\IBRA TANK\IBRA TANK.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\${APPEXE}" 0
  CreateShortcut "$SMPROGRAMS\IBRA TANK\إزالة IBRA TANK.lnk" "$INSTDIR\Uninstall IBRA TANK.exe"
  CreateShortcut "$DESKTOP\IBRA TANK.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\${APPEXE}" 0
  WriteRegStr HKCU "Software\IBRA TANK" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "IBRA TANK — درع الصحراء"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\${APPEXE}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "${COMPANY}"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Uninstall IBRA TANK.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${APPEXE}"'
  Delete "$DESKTOP\IBRA TANK.lnk"
  RMDir /r "$SMPROGRAMS\IBRA TANK"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTKEY}"
  DeleteRegKey HKCU "Software\IBRA TANK"
SectionEnd
