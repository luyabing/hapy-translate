# 贡献指南

感谢你愿意改进 Hapy翻译。这个项目刻意保持简单：Electron 主进程 + 原生 HTML/CSS/JavaScript，没有前端构建步骤。

## 本地运行

```bash
git clone https://github.com/luyabing/hapy-translate.git
cd hapy-translate
./scripts/fetch-electron.sh   # 首次运行，下载 Electron 运行时
./run.sh
```

修改 `src/`、`main.js` 或 `preload.js` 后，关闭应用并重新运行 `./run.sh` 即可看到效果。

## 提交前检查

```bash
./scripts/check.sh
```

同时请手动验证：

- 应用能启动，且能打开至少一个 AI 网站（如 DeepSeek）。
- 输入文字后「复制提示词」可用，粘贴到 AI 输入框内容完整。
- 切换语言、切换标签、打开设置、添加/删除自定义网站正常。
- 窗口缩放和托盘行为没有回归。

## 代码风格

- 使用 2 空格缩进、单引号、分号；保持现有文件的风格。
- 新功能尽量不引入前端框架或打包工具。
- 主进程与渲染进程之间只通过 `preload.js` 暴露的白名单 IPC 通信，不要在渲染进程开启 Node.js 集成。
- 涉及用户数据、Cookie、外部链接的改动，请在 PR 中说明安全影响。

## 提交 PR

1. Fork 仓库并从 `main` 创建分支。
2. 一个 PR 只做一件事，避免混入格式化无关文件的改动。
3. 写清楚改了什么、为什么改、如何测试，必要时附截图。
4. 如果是界面改动，请同时检查 1040×680 最小窗口和较大窗口下的布局。

## 许可证

提交贡献即表示你同意以本仓库的 MIT License 发布你的贡献。
