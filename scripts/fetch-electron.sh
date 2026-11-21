#!/usr/bin/env bash
# 下载与项目匹配的 Electron 运行时到 .runtime/，供 run.sh 和 install.sh 使用。
set -euo pipefail

VERSION="${ELECTRON_VERSION:-38.2.0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/.runtime/electron-linux-x64"

case "$(uname -m)" in
  x86_64 | amd64) ARCH="x64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *)
    echo "不支持的 CPU 架构：$(uname -m)" >&2
    echo "请手动下载 Electron v$VERSION 的 Linux 运行时并解压到 $DEST" >&2
    exit 1
    ;;
esac

if [[ -x "$DEST/electron" ]]; then
  echo "Electron 运行时已存在：$("$DEST/electron" --version 2>/dev/null || echo "$DEST")"
  exit 0
fi

URL="https://github.com/electron/electron/releases/download/v${VERSION}/electron-v${VERSION}-linux-${ARCH}.zip"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "正在下载 Electron v${VERSION}（linux-${ARCH}）…"
echo "  $URL"
if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 --progress-bar -o "$TMP_DIR/electron.zip" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$TMP_DIR/electron.zip" "$URL"
else
  echo "需要 curl 或 wget 才能下载。" >&2
  exit 1
fi

mkdir -p "$DEST"
unzip -q "$TMP_DIR/electron.zip" -d "$DEST"
chmod +x "$DEST/electron" "$DEST/chrome-sandbox" 2>/dev/null || true

echo "完成：$("$DEST/electron" --version)"
echo "现在可以运行 ./run.sh"
