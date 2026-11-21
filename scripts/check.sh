#!/usr/bin/env bash
# 本地语法检查；无需预装 Node.js，会回退到项目内置 Electron 的 Node 模式。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if command -v node >/dev/null 2>&1; then
  NODE=(node)
elif [[ -x "$ROOT/.runtime/electron-linux-x64/electron" ]]; then
  NODE=(env ELECTRON_RUN_AS_NODE=1 "$ROOT/.runtime/electron-linux-x64/electron")
else
  echo "未找到 node，也未找到 .runtime/electron-linux-x64/electron。" >&2
  echo "请先运行 ./scripts/fetch-electron.sh，或安装 Node.js。" >&2
  exit 1
fi

echo "检查 JavaScript 语法…"
for file in main.js preload.js src/renderer.js; do
  "${NODE[@]}" --check "$file"
  echo "  ✓ $file"
done

echo "检查 Shell 脚本语法…"
for file in run.sh install.sh uninstall.sh scripts/fetch-electron.sh scripts/check.sh; do
  bash -n "$file"
  echo "  ✓ $file"
done

echo "全部通过。"
