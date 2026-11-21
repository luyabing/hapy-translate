#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/hapy-translate"
DESKTOP_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/applications/hapy-translate.desktop"

if [[ -d "$INSTALL_DIR" ]]; then
  echo "正在移除应用文件：$INSTALL_DIR"
  rm -rf "$INSTALL_DIR"
fi
if [[ -f "$DESKTOP_FILE" ]]; then
  rm -f "$DESKTOP_FILE"
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${XDG_DATA_HOME:-$HOME/.local/share}/applications" >/dev/null 2>&1 || true
fi

echo "Hapy翻译 已卸载。"
echo "登录数据与设置仍保留在：${XDG_CONFIG_HOME:-$HOME/.config}/hapy-translate"
