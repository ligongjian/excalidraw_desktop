# Excalidraw 桌面版

一款基于 **Rust + Tauri** 的桌面手绘白板工具，前端使用 **React + TypeScript**，
样式采用 **Tailwind CSS**，白板内核使用 **@excalidraw/excalidraw** 组件。

## 关于 excalidraw-cn（重要说明）

需求中提供的组件库 `korbinjoe/excalidraw-cn` 是 Excalidraw 的**完整源码 fork**
（Handraw 的前身），它是一个可独立运行的 React 应用，**并未发布为可安装的 npm
组件包**，且依赖 firebase/sentry/协同服务等重依赖，直接整仓接入不利于桌面工程化。

因此本项目采用工程上等价的方案：

- 白板内核使用 excalidraw-cn 的上游官方组件 **`@excalidraw/excalidraw`**（excalidraw-cn
  正是基于它 fork 的），它是一个真正可安装、可维护的白板组件库；
- **复刻 excalidraw-cn 的核心价值**：
  - **中文手写字体**：通过 CSS 将画布文字设置为「楷体 / 华文楷体」等中文手写字体
    （Windows 系统内置，无需联网加载，离线可用）；
  - **简体中文界面**：白板 UI 语言设为 `zh-CN`。

如果你希望直接基于 excalidraw-cn 源码整仓打包，可告知，我再切换接入方式。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面壳 | Rust + Tauri 2（`src-tauri/`） |
| 前端框架 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS |
| 白板组件 | `@excalidraw/excalidraw` 0.18 |
| 原生文件对话框 | Rust `rfd` crate（保存/打开/导出） |

## 已实现功能

- **完整白板能力**：手绘画笔、图形、箭头、文字（中文手写字体）、涂鸦风格、素材库、框选/成组等，均由 Excalidraw 内核提供；
- **文件保存/打开**：序列化为 `.excalidraw` JSON 场景文件，走系统原生对话框读写；
- **导出图片**：导出 PNG / WebP；
- **深色/浅色主题切换**；
- **桌面壳**：无边框窗口 + 自绘标题栏（拖拽移动、最小化、最大化、关闭），顶部工具栏显示文件名与未保存状态。

## 目录结构

```
excalidraw_desktop/
├─ index.html
├─ vite.config.ts
├─ tailwind.config.js
├─ postcss.config.js
├─ src/                        # 前端
│  ├─ main.tsx
│  ├─ App.tsx                  # 桌面外壳 + Excalidraw 集成
│  ├─ index.css                # Tailwind + 中文手写字体重写
│  ├─ components/
│  │  ├─ TitleBar.tsx          # 自绘标题栏（窗口控制）
│  │  └─ Toolbar.tsx           # 顶部工具栏
│  └─ lib/file.ts              # Tauri 命令封装
└─ src-tauri/                  # Rust/Tauri 后端
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ src/main.rs
   ├─ src/lib.rs               # save_scene / open_scene / export_image 命令
   └─ icons/                   # 由 app-icon.png 生成
```

## 环境要求

- Node.js ≥ 20
- Rust（rustup stable）
- Windows：Microsoft Visual C++ Build Tools（含 MSVC 链接器）+ WebView2（Win10/11 自带）

## 使用

```bash
# 1) 安装依赖
npm install

# 2) 开发模式运行（自动启动 Vite + Tauri 桌面窗口）
npm run tauri dev

# 3) 构建正式发布版
npm run tauri build          # 生成安装包（NSIS/MSI）
npm run tauri build -- --no-bundle   # 仅生成可独立运行的 exe（内置前端资源，无需 dev 服务器）
```

发布版可执行文件位于 `src-tauri/target/release/excalidraw-desktop.exe`，双击即可运行。

## 排障：Excalidraw 样式引入

Excalidraw 组件需要引入其样式表，请在 `src/main.tsx` 顶部使用**包声明的规范子路径**引入：

```ts
import "@excalidraw/excalidraw/index.css";
```

⚠️ 不要直接引包内部 `dist` 路径（如 `@excalidraw/excalidraw/dist/prod/index.css`），
该路径不在包的 `exports` 白名单内，vite 会报
`"./dist/prod/index.css" is not exported under the conditions [...]`。
用上面规范写法即可，vite 会按 dev/prod 环境自动解析到对应样式文件。

## 验证情况

- 前端：`tsc --noEmit` 类型检查通过；`vite build` 生产构建成功；
- 后端：`cargo build` 全量编译成功（Rust 1.94 / Tauri 2.11）；
- 运行：应用进程启动后稳定运行不崩溃；WebView 成功加载前端页面。
- 已知限制：像素级 UI 截图确认受本机另一常驻置顶窗口干扰，未完成；逻辑与构建层均通过验证。
