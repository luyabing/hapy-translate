# Hapy翻译

> 左侧写好提示词，右侧直接问 AI。  
> 由 **HapyTop** 打造的 Ubuntu 桌面翻译工作台。

[![License: MIT](https://img.shields.io/badge/license-MIT-6256F3.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Ubuntu%20%7C%20Linux-191B24.svg)](#兼容性说明)
[![Electron](https://img.shields.io/badge/Electron-38.2.0-6256F3.svg)](https://www.electronjs.org/)

[English](README.en.md) · 简体中文

![Hapy翻译 界面预览](assets/screenshot.png)

Hapy翻译把「生成翻译提示词」和「多 AI 网页」放进同一个窗口：在左侧选好目标语言、粘贴原文、一键复制提示词；在右侧切换到 DeepSeek、ChatGPT、Gemini 等 AI 页面，直接粘贴发送。不用再反复复制、切换标签页、寻找翻译入口。

---

## 功能亮点

### 左侧：专注的提示词编辑器

- **44 种目标语言**，支持中文名、英文名、语言代码搜索，选择后提示词自动更新。
- **一键生成翻译提示词**，严格使用 `<translate_input>` 包裹原文，并要求 AI 只输出译文、保留原始格式。
- **清空 / 粘贴 / 复制提示词**三个快捷操作；`Ctrl + Enter` 也可以直接复制提示词。
- 实时字符计数、复制成功反馈、空内容防误触。
- 面板宽度可拖动调整，并自动记忆。

### 右侧：多 AI 网页工作台

- 内置 **DeepSeek、ChatGPT、Gemini、Claude、Kimi、豆包、Qwen、Grok** 八个常用 AI。
- **自定义网站**：点击标签栏最右侧的 `+`，输入名称和网址即可添加；Logo 会自动抓取（支持 PNG / JPEG / WebP / GIF / SVG / ICO）。
- **登录状态保留**：所有 AI 页面共享一个持久化会话，登录一次，下次打开仍然有效。
- **启动预加载**：可在设置中为常用网站开启预载，切换标签几乎无等待。
- **显示 / 隐藏与删除**：内置网站可以隐藏，自定义网站可以移除；登录数据仍保存在本机。
- 前进、后退、刷新、在系统浏览器中打开当前页面。
- 网页内右键支持撤销、剪切、复制、粘贴、全选，以及复制/打开链接和图片。
- 无边框窗口 + 自绘标题栏，支持最小化、最大化、还原和关闭。
- **系统托盘**：关闭窗口后应用继续留在托盘，可显示/隐藏窗口、刷新当前 AI 页面、打开设置或彻底退出。

---

## 快速开始

### 下载安装包（推荐）

前往 [Releases](https://github.com/luyabing/hapy-translate/releases) 下载 `hapy-translate_1.0.0_amd64.deb`，然后安装：

```bash
sudo apt install ./hapy-translate_1.0.0_amd64.deb
```

安装包已包含 Electron 运行时，安装后从应用菜单启动「Hapy翻译」即可。卸载：

```bash
sudo apt remove hapy-translate
```

卸载不会删除 `~/.config/hapy-translate` 中的配置和登录数据。

当前安装包面向 64 位 x86（amd64）Ubuntu / Debian。其他架构可以从源码运行。

### 从源码运行

需要 Ubuntu 22.04+、`curl`（或 `wget`）和 `unzip`。项目不要求预装 Node.js。

```bash
git clone https://github.com/luyabing/hapy-translate.git
cd hapy-translate
./scripts/fetch-electron.sh   # 首次运行：下载 Electron 38.2.0 运行时
./run.sh
```

首次启动时，右侧会自动打开 DeepSeek；其他 AI 可以在标签栏切换，或点击标题栏的「网站与预加载」按钮进行管理。

> Electron 运行时约 286 MB（下载包约 120 MB），不放入 Git 仓库，避免仓库膨胀。下载脚本会把它解压到 `.runtime/electron-linux-x64/`。

### 安装到应用菜单

```bash
./install.sh
```

安装脚本会把应用复制到 `~/.local/share/hapy-translate`，并创建桌面入口 `hapy-translate.desktop`。安装完成后，在 Ubuntu 应用菜单中搜索「Hapy翻译」即可启动。

### 卸载

```bash
./uninstall.sh
```

卸载只会移除应用文件和桌面入口，**不会删除**配置与登录数据。

---

## 使用方式

1. 在左侧点击语言按钮，选择目标语言（默认法语）。
2. 把要翻译的内容粘贴到编辑框。
3. 点击「复制提示词」。
4. 在右侧选择任意 AI，把提示词粘贴到对话框并发送。
5. AI 返回的内容就是目标语言的译文。

点击窗口右上角的关闭按钮时，应用会收起到系统托盘（Ubuntu 顶部栏 / AppIndicator）。点击托盘图标可以显示或隐藏窗口、刷新当前页面、打开网站设置；选择「退出 Hapy翻译」才会真正结束进程。

生成的提示词结构如下（目标语言会自动替换）：

```text
You are a translation expert. Your only task is to translate text enclosed with
<translate_input> from input language to French, provide the translation result
directly without any explanation, without `TRANSLATE` and keep original format.
...
<translate_input>
这里是你输入的原文
</translate_input>
Translate the above text enclosed with <translate_input> into French without
<translate_input>. ...
```

---

## 数据与隐私

| 内容 | 位置 |
| --- | --- |
| 应用配置（语言、网站列表、预载设置、窗口位置） | `~/.config/hapy-translate/config.json` |
| AI 网站登录状态与缓存 | `~/.config/hapy-translate/Partitions/hapy-ai/` |
| 应用本体（deb 安装） | `/opt/hapy-translate/` |
| 应用本体（`install.sh` 用户安装） | `~/.local/share/hapy-translate/` |

- 编辑框中的原文**不会写入磁盘**；关闭应用后即清除。
- 所有 AI 页面都在启用上下文隔离的 `webview` 中运行，已关闭 Node.js 集成。
- 网站登录信息只保存在本机，不会上传到任何本项目控制的服务器。
- 「在系统浏览器中打开」和右键菜单会调用系统默认浏览器打开链接。
- 应用不包含统计、广告或远程配置 SDK。

---

## 兼容性说明

- 面向 **Ubuntu / GNOME** 桌面设计，窗口最小尺寸为 1040 × 680。
- 系统托盘使用 AppIndicator / StatusNotifierItem，Ubuntu 默认的 `ubuntu-appindicators` 扩展即可正常显示。
- 默认通过 **XWayland** 运行，以确保复制/粘贴与 GNOME 桌面完全同步。  
  如果你希望使用原生 Wayland，可以这样启动：

  ```bash
  HAPY_NATIVE_WAYLAND=1 ./run.sh
  ```

  注意：部分 GNOME + Electron 组合下，原生 Wayland 剪贴板可能无法与其他应用同步。
- 网页登录依赖各 AI 官方网站的网络与账号状态；如果页面打不开，可点击「用浏览器打开」在系统浏览器中重试。
- 应用需要能访问对应 AI 网站的网络环境。

---

## 项目结构

```text
.
├── main.js               # Electron 主进程：窗口、配置、网站管理、Logo 抓取、安全策略
├── preload.js            # 安全的 IPC 桥接（window.hapy）
├── src/
│   ├── index.html        # 界面结构与图标
│   ├── styles.css        # 视觉样式与响应式布局
│   └── renderer.js       # 语言、编辑器、标签页、webview、设置等交互
├── assets/
│   ├── icon.png          # 应用图标
│   ├── screenshot.png    # README 预览图
│   └── logos/            # 内置 AI 图标
├── scripts/
│   ├── fetch-electron.sh # 下载便携 Electron 运行时
│   ├── build-deb.sh      # 构建含运行时的 Ubuntu deb 安装包
│   └── check.sh          # 本地 JS / Shell 语法检查
├── run.sh                # 本地启动
├── install.sh            # 安装到用户目录并创建桌面入口
├── uninstall.sh          # 卸载
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

### 技术说明

- Electron 38.2.0（Chromium 140），原生 HTML / CSS / JavaScript，无前端构建步骤。
- AI 网站通过 `<webview>` 直接嵌入真实页面，而不是 iframe——多数 AI 网站通过 `X-Frame-Options` / CSP 禁止被 iframe 嵌入。
- 单实例锁、窗口状态记忆、持久化会话分区。
- 渲染进程沙箱化，仅通过 `preload.js` 暴露白名单 IPC。

---

## 开发

```bash
./scripts/check.sh
```

脚本会检查 `main.js`、`preload.js`、`src/renderer.js` 的 JavaScript 语法和所有 Shell 脚本；未安装 Node.js 时会自动使用项目内置 Electron 的 Node 模式。

构建安装包：

```bash
./scripts/fetch-electron.sh   # 首次构建
./scripts/build-deb.sh        # 输出 dist/hapy-translate_1.0.0_amd64.deb
```

欢迎提交 Issue 和 PR，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私密报告。

---

## 常见问题

**点击「复制提示词」后，其他应用粘贴不出来？**  
请使用 `./run.sh` 或桌面入口启动应用。应用默认加上了 `--ozone-platform=x11` 来避免原生 Wayland 剪贴板不同步的问题，并确认 `DISPLAY` 环境变量存在。

**添加自定义网站后没有 Logo？**  
Logo 会从网站 HTML 的图标声明、`/favicon.ico`、`/favicon.png` 以及公共 favicon 服务依次尝试。若网站禁止抓取或网络不通，会显示网站名称首字母的彩色占位图标，不影响使用。

**关闭窗口后程序还在运行？**  
这是系统托盘模式：窗口会收起，应用继续在后台保留 AI 网页的登录状态。点击 Ubuntu 顶部栏的 Hapy翻译托盘图标，选择「显示主窗口」即可重新打开；选择「退出 Hapy翻译」才会真正退出。

**顶部栏没有托盘图标？**  
系统托盘依赖 GNOME 的 AppIndicator 支持，Ubuntu 默认启用的扩展是 `ubuntu-appindicators@ubuntu.com`。可以用下面的命令确认：

```bash
gnome-extensions list --enabled | grep appindicator
```

如果扩展被禁用，请在「扩展」应用中重新启用它，然后重新启动 Hapy翻译。

**AI 页面要求重新登录？**  
请确认使用的是同一个系统用户，并保留 `~/.config/hapy-translate/Partitions/hapy-ai/`。清理该目录会同时清除所有 AI 网站的登录状态。

**应用无法启动 / 提示缺少 Electron？**  
运行 `./scripts/fetch-electron.sh` 下载运行时，或确认 `.runtime/electron-linux-x64/electron` 存在且具有执行权限：

```bash
chmod +x .runtime/electron-linux-x64/electron
./run.sh
```

---

## 许可证

[MIT License](LICENSE) © 2026 HapyTop

第三方 AI 网站、名称与图标归各自所有者所有；本项目仅提供网页工作台与提示词工具，与这些网站没有隶属关系。
