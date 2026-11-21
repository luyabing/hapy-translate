#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/hapy-translate"
APPLICATION_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP_FILE="$APPLICATION_DIR/hapy-translate.desktop"
ELECTRON="$INSTALL_DIR/.runtime/electron-linux-x64/electron"

if [[ ! -x "$APP_DIR/.runtime/electron-linux-x64/electron" ]]; then
  echo "缺少 Electron 运行时。请先运行 ./scripts/fetch-electron.sh 下载。" >&2
  exit 1
fi

echo "正在安装 Hapy翻译 到：$INSTALL_DIR"
mkdir -p "$INSTALL_DIR" "$APPLICATION_DIR"

for item in main.js preload.js package.json README.md LICENSE src assets .runtime; do
  rm -rf "$INSTALL_DIR/$item"
  cp -a "$APP_DIR/$item" "$INSTALL_DIR/"
done
cp -a "$APP_DIR/run.sh" "$INSTALL_DIR/run.sh"
chmod +x "$INSTALL_DIR/run.sh" "$ELECTRON"
chmod +x "$INSTALL_DIR/.runtime/electron-linux-x64/chrome-sandbox" 2>/dev/null || true

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Hapy翻译
GenericName=AI Translation Workbench
Comment=左侧生成翻译提示词，右侧使用多个 AI 网页完成翻译
Exec="$INSTALL_DIR/run.sh"
Icon=$INSTALL_DIR/assets/icon.png
Terminal=false
Categories=Utility;Translation;
Keywords=翻译;AI;AI翻译;Hapy;HapyTop;Translate;
StartupNotify=true
StartupWMClass=hapy-translate
EOF

chmod +x "$DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATION_DIR" >/dev/null 2>&1 || true
fi

echo
echo "安装完成。"
echo "现在可以在应用菜单中搜索「Hapy翻译」，也可以直接运行："
echo "  $INSTALL_DIR/run.sh"
echo
echo "提示：如果你使用 GNOME，可在应用图标上右键选择“添加到收藏夹”。"
