# Hapy Translate

> Write the prompt on the left, ask AI on the right.  
> An Ubuntu desktop translation workbench by **HapyTop**.

[![License: MIT](https://img.shields.io/badge/license-MIT-6256F3.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Ubuntu%20%7C%20Linux-191B24.svg)](#compatibility)
[![Electron](https://img.shields.io/badge/Electron-38.2.0-6256F3.svg)](https://www.electronjs.org/)

English · [简体中文](README.md)

![Hapy Translate screenshot](assets/screenshot.png)

Hapy Translate puts prompt generation and multiple AI websites in one window. Pick a target language, paste the source text, copy the generated prompt, then switch to DeepSeek, ChatGPT, Gemini, or any other AI tab and paste it. No more copying, tab switching, or hunting for a translate button.

## Highlights

- **44 target languages** with search by Chinese name, English name, or language code.
- Generates a strict `<translate_input>` translation prompt that asks the AI to return only the translation and preserve the original formatting.
- Clear, paste, and copy actions; `Ctrl + Enter` copies the prompt.
- Live character count, copy feedback, and guard against empty input.
- Resizable prompt panel with remembered width.
- Built-in sites: **DeepSeek, ChatGPT, Gemini, Claude, Kimi, Doubao, Qwen, Grok**.
- Add custom AI sites with automatic favicon discovery.
- Persistent login state shared across all AI pages.
- Optional startup preloading for frequently used sites.
- Show/hide built-in sites and delete custom ones.
- Back, forward, refresh, and open the current page in the system browser.
- Native right-click menu for editing, links, and images.
- Frameless window with a custom title bar.
- **System tray**: closing the window keeps the app and AI sessions alive; show/hide, refresh, open settings, or quit from the tray.

## Quick start

### Run from source

Requirements: Ubuntu 22.04+, `curl` (or `wget`), and `unzip`. Node.js is not required.

```bash
git clone https://github.com/luyabing/hapy-translate.git
cd hapy-translate
./scripts/fetch-electron.sh   # first run: downloads the Electron 38.2.0 runtime
./run.sh
```

The Electron runtime is about 286 MB unpacked (~120 MB download) and is intentionally not committed to Git. The script places it in `.runtime/electron-linux-x64/`.

### Install to the application menu

```bash
./install.sh
```

This copies the app to `~/.local/share/hapy-translate` and creates a desktop entry. Search for “Hapy翻译” in the Ubuntu app grid.

### Uninstall

```bash
./uninstall.sh
```

This removes the application files and desktop entry but keeps configuration and login data.

## Usage

1. Choose a target language in the left panel (French by default).
2. Paste the source text.
3. Click **Copy prompt**.
4. Switch to any AI tab, paste into its composer, and send.
5. The AI reply is the translation.

Closing the window hides it to the system tray. Use the tray menu to show/hide the window, refresh the current AI page, open settings, or quit.

## Privacy

| Data | Location |
| --- | --- |
| Configuration (language, sites, preload, window state) | `~/.config/hapy-translate/config.json` |
| AI site sessions and cache | `~/.config/hapy-translate/Partitions/hapy-ai/` |
| Installed application | `~/.local/share/hapy-translate/` |

- Source text is **not written to disk**.
- AI pages run in isolated `webview` guests with Node.js integration disabled.
- Login cookies stay on your machine and are never uploaded to a server controlled by this project.
- No analytics, ads, or remote-config SDKs.

## Compatibility

- Designed for **Ubuntu / GNOME**; minimum window size is 1040 × 680.
- The tray uses AppIndicator / StatusNotifierItem. Ubuntu’s default `ubuntu-appindicators` extension works out of the box.
- The app runs through **XWayland** by default for reliable clipboard synchronization with GNOME. Set `HAPY_NATIVE_WAYLAND=1 ./run.sh` to opt into native Wayland; clipboard behavior may vary by setup.
- AI websites require network access to their own domains.
- You are responsible for complying with each AI website’s terms of service.

## Development

```bash
./scripts/check.sh
```

The script checks JavaScript syntax in `main.js`, `preload.js`, and `src/renderer.js`, plus every shell script. If Node.js is not installed, it falls back to the project’s Electron runtime in Node mode.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and PR guidelines. Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## Project structure

```text
main.js               Electron main process: windows, config, sites, favicon fetching
preload.js            Whitelisted IPC bridge (window.hapy)
src/                  Renderer: HTML, CSS, languages, editor, tabs, settings
assets/               Icons, AI logos, screenshot
scripts/              Electron runtime download and local syntax checks
run.sh                Run locally
install.sh            Install to ~/.local/share and create a desktop entry
uninstall.sh          Remove app files and desktop entry
```

## License

[MIT License](LICENSE) © 2026 HapyTop

Third-party AI websites, names, and logos belong to their respective owners. This project is an independent web workbench and is not affiliated with those websites.
