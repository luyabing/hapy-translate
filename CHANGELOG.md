# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## v1.0.0 — 2026-11-14

首个公开版本。

### 新增

- 左侧翻译提示词面板：44 种目标语言、搜索、字符计数、清空/粘贴/复制。
- `<translate_input>` 翻译提示词模板，要求 AI 只输出译文并保留格式。
- 右侧多 AI 网页工作台：DeepSeek、ChatGPT、Gemini、Claude、Kimi、豆包、Qwen、Grok。
- 自定义网站、自动抓取 favicon、显示/隐藏/删除网站。
- 持久化登录会话与启动预加载。
- 前进、后退、刷新、在系统浏览器中打开。
- 无边框窗口、窗口状态记忆、面板宽度记忆。
- 系统托盘：关闭到托盘、显示/隐藏、刷新、设置、退出。
- 自定义网页右键菜单。
- 单实例锁与安全的 preload IPC 桥接。
- Ubuntu / Debian `.deb` 安装包，内含 Electron 运行时，可从应用菜单启动。
