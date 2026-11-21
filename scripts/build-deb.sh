#!/usr/bin/env bash
# 构建 Ubuntu / Debian 安装包，内含 Electron 运行时。
set -euo pipefail
umask 022

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${VERSION:-$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)}"
VERSION="${VERSION:-1.0.0}"
ARCH="${ARCH:-$(dpkg --print-architecture 2>/dev/null || echo amd64)}"
RUNTIME="$ROOT/.runtime/electron-linux-x64"
OUT="${OUT:-$ROOT/dist/hapy-translate_${VERSION}_${ARCH}.deb}"

if [[ "$ARCH" != "amd64" ]]; then
  echo "当前安装包只支持 amd64（x86_64）；检测到：$ARCH" >&2
  exit 1
fi
if [[ ! -x "$RUNTIME/electron" ]]; then
  echo "缺少 Electron 运行时：$RUNTIME" >&2
  echo "请先运行 ./scripts/fetch-electron.sh" >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKGROOT="$STAGE/hapy-translate_${VERSION}_${ARCH}"
APPDIR="$PKGROOT/opt/hapy-translate"
BINDIR="$PKGROOT/usr/bin"
APPSDIR="$PKGROOT/usr/share/applications"
ICONROOT="$PKGROOT/usr/share/icons/hicolor"
DOCDIR="$PKGROOT/usr/share/doc/hapy-translate"

echo "==> 准备应用文件"
mkdir -p "$APPDIR" "$BINDIR" "$APPSDIR" \
  "$ICONROOT/256x256/apps" "$ICONROOT/512x512/apps" "$ICONROOT/scalable/apps" \
  "$DOCDIR" "$PKGROOT/DEBIAN"

for item in main.js preload.js package.json README.md README.en.md LICENSE src assets .runtime; do
  cp -a "$ROOT/$item" "$APPDIR/"
done
cp -a "$ROOT/run.sh" "$APPDIR/run.sh"
chmod 0755 "$APPDIR/run.sh" "$APPDIR/.runtime/electron-linux-x64/electron"
# Electron 的 SUID sandbox 必须由 root 拥有并带 setuid 位。
chmod 4755 "$APPDIR/.runtime/electron-linux-x64/chrome-sandbox"

cat >"$BINDIR/hapy-translate" <<'EOF'
#!/bin/sh
exec /opt/hapy-translate/run.sh "$@"
EOF
chmod 0755 "$BINDIR/hapy-translate"

cat >"$APPSDIR/hapy-translate.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Version=1.0
Name=Hapy翻译
Name[en]=Hapy Translate
GenericName=AI Translation Workbench
Comment=左侧生成翻译提示词，右侧使用多个 AI 网页完成翻译
Comment[en]=Build translation prompts on the left and translate with multiple AI sites on the right
Exec=/usr/bin/hapy-translate
TryExec=/usr/bin/hapy-translate
Icon=hapy-translate
Terminal=false
Categories=Utility;Translation;
Keywords=翻译;AI;AI翻译;Hapy;HapyTop;Translate;
StartupNotify=true
StartupWMClass=hapy-translate
EOF

install -m 0644 "$ROOT/assets/icon-256.png" "$ICONROOT/256x256/apps/hapy-translate.png"
install -m 0644 "$ROOT/assets/icon-512.png" "$ICONROOT/512x512/apps/hapy-translate.png"
install -m 0644 "$ROOT/assets/icon.svg" "$ICONROOT/scalable/apps/hapy-translate.svg"

install -m 0644 "$ROOT/README.md" "$DOCDIR/README.md"
install -m 0644 "$ROOT/README.en.md" "$DOCDIR/README.en.md"
install -m 0644 "$ROOT/LICENSE" "$DOCDIR/copyright"
gzip -9 -n -c "$ROOT/CHANGELOG.md" > "$DOCDIR/changelog.gz"

cat >"$PKGROOT/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
exit 0
EOF

cat >"$PKGROOT/DEBIAN/postrm" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
exit 0
EOF
chmod 0755 "$PKGROOT/DEBIAN/postinst" "$PKGROOT/DEBIAN/postrm"

INSTALLED_SIZE="$(du -sk "$PKGROOT" | cut -f1)"
cat >"$PKGROOT/DEBIAN/control" <<EOF
Package: hapy-translate
Version: $VERSION
Architecture: $ARCH
Maintainer: HapyTop <28698332+luyabing@users.noreply.github.com>
Installed-Size: $INSTALLED_SIZE
Section: utils
Priority: optional
Homepage: https://github.com/luyabing/hapy-translate
Depends: libgtk-3-0t64 | libgtk-3-0, libnss3, libxss1, libxtst6, libatspi2.0-0t64 | libatspi2.0-0, libuuid1, libsecret-1-0, libasound2t64 | libasound2, libgbm1, xdg-utils
Recommends: fonts-noto-cjk
Description: 左侧生成翻译提示词，右侧多 AI 网页工作台
 Hapy翻译把翻译提示词编辑器和多个 AI 网页放进同一个窗口：
 选择 44 种目标语言、生成结构化提示词，并在 DeepSeek、ChatGPT、
 Gemini、Claude 等网站之间直接切换。
 .
 登录状态保存在本机，关闭窗口后继续留在系统托盘。
EOF

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
echo "==> 构建 deb"
dpkg-deb --build --root-owner-group "$PKGROOT" "$OUT" >/dev/null

echo
echo "安装包已生成：$OUT"
sha256sum "$OUT"
dpkg-deb --info "$OUT" | sed -n '1,18p'
