#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON="$APP_DIR/.runtime/electron-linux-x64/electron"

if [[ ! -x "$ELECTRON" ]]; then
  cat >&2 <<'EOF'
未找到 Electron 运行环境。

首次从源码运行请先下载运行时（约 120 MB）：
  ./scripts/fetch-electron.sh

如果 .runtime/electron-linux-x64/ 已存在但丢失执行权限，请运行：
  chmod +x .runtime/electron-linux-x64/electron

也可以手动下载 Electron 38.2.0 的 Linux 版本，解压到 .runtime/electron-linux-x64/。
EOF
  exit 1
fi

# Chromium's native Wayland clipboard is not synchronised with XWayland on some
# GNOME sessions (writes never reach other apps). XWayland keeps copy/paste
# reliable; set HAPY_NATIVE_WAYLAND=1 to opt back into native Wayland.
ARGS=(--class=hapy-translate)
if [[ "${HAPY_NATIVE_WAYLAND:-0}" != "1" && -n "${DISPLAY:-}" ]]; then
  ARGS=(--ozone-platform=x11 "${ARGS[@]}")
fi

exec "$ELECTRON" "${ARGS[@]}" "$APP_DIR" "$@"
