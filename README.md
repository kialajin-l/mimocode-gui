# MiMoCode GUI

> A focused desktop workspace for MiMoCode — coding, planning, building, reviewing, and shipping from one clean GUI.

![Version](https://img.shields.io/badge/Version-v0.1.0-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28-47848f.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)

<p align="center">
  <img src="docs/mimocode-banner.png" alt="MiMoCode Banner" width="100%">
</p>

**MiMoCode GUI** 是 MiMoCode 的桌面端图形界面：它把 CLI 的编程能力、项目会话、模型配置、MCP、插件、代码审查和终端操作整合到一个更接近成熟桌面产品的工作台里。

它的目标很简单：**保留 MiMoCode 的专属编程工作流，同时减少切换窗口、记命令、找上下文的摩擦。**

---

## ✨ 核心能力

| 能力 | 说明 |
|------|------|
| 🧭 **Compose / Plan / Build** | MiMo 专属工作模式，适合快速对话、方案规划和执行构建 |
| 💬 **流式会话** | 对接 MiMo CLI，展示实时输出、思考状态和工具调用过程 |
| 🗂️ **项目与会话管理** | 按工作区组织项目，会话编号、归档、恢复和历史版本跟随项目 |
| 🧩 **插件与 Skill** | 面向 opencode / MiMo 生态的插件与 Skill 管理入口 |
| 🔌 **MCP 服务** | 读取并管理 MiMo CLI 侧 MCP 配置，服务状态集中展示 |
| 🤖 **Provider / 模型配置** | 统一展示 MiMo CLI、内置和自定义 Provider，支持模型拉取 |
| 🧪 **代码审查面板** | 查看 Diff，执行 Accept / Reject，辅助审查本地改动 |
| 🖥️ **内置终端** | 在当前项目工作区执行命令，减少 GUI 与 CLI 往返切换 |
| ⭐ **书签与会话版本** | 标记重要消息，保存和恢复本地会话版本 |
| 🎨 **中文优先界面** | 当前阶段以中文体验为主，多语言会在后续统一整理 |

---

## 🧠 产品边界

MiMoCode GUI 是一个**编程与工作项目**，不是通用写作工作台。

- 保留：编码、项目协作、规划、构建、审查、终端、MCP、插件、Skill。
- 不做：长文写作工作台、内容创作平台、与编程工作流无关的 Phase 5 写作功能。
- 设计方向：参考 Codex Desktop 的简洁高效，但保留 MiMoCode 自身的模式、状态和工作流特色。

---

## 🏗️ 架构概览

```text
mimocode-gui/
├── electron/             # Electron 主进程、preload、CLI / MCP / Provider 桥接
├── src/
│   ├── components/       # Chat、Sidebar、Panel、Settings 等 UI 组件
│   ├── stores/           # Zustand 状态：session/model/mcp/settings/theme
│   ├── hooks/            # 会话、快捷键等 React hooks
│   ├── utils/            # Diff、导入导出、项目版本、布局工具
│   └── types/            # Session / Electron 类型定义
├── build/icons/          # 应用图标
├── docs/                 # 公开展示资产
└── electron-builder.json # 桌面端打包配置
```

### 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron 28 |
| 前端 | React 18 + TypeScript |
| 状态管理 | Zustand |
| 构建 | Vite + electron-builder |
| Markdown | react-markdown + remark-gfm |
| 代码高亮 | highlight.js |
| 测试 | Vitest + Testing Library |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- 已安装并可运行 MiMoCode CLI（`mimo`）

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run electron:dev
```

### 运行测试

```bash
npm test
```

### 构建前端与 Electron

```bash
npm run build
npm run build:electron
```

### 打包桌面应用

```bash
npm run electron:build
```

打包产物默认输出到 `release/`。

---

## ⌨️ 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + K` | 搜索会话和消息 |
| `Ctrl + B` | 打开/关闭右侧面板 |
| `Ctrl + N` | 新建会话 |
| `Ctrl + E` | 导出当前会话 |
| `Ctrl + I` | 导入会话 |
| `Ctrl + Enter` | 发送消息 |
| `Shift + Enter` | 输入换行 |

---

## 🔐 安全说明

MiMoCode GUI 会调用本地 CLI、读取项目工作区并执行用户确认的命令。请注意：

- 只在可信项目目录中使用终端和 Git 操作。
- Provider API Key 属敏感信息，后续版本会继续加强主进程安全存储。
- MCP / 插件 / Skill 可能扩展本地能力，启用前请确认来源可信。
- WebUI 仅作为兼容入口，主要体验应以 GUI 工作台为准。

---

## 🗺️ v0.1 状态

v0.1 是 MiMoCode GUI 的早期桌面版本，重点是把核心工作流跑通：

- [x] 项目 / 会话 / 归档 / 会话版本
- [x] Compose / Plan / Build 模式选择与记忆
- [x] MiMo CLI 流式对话桥接
- [x] Provider、模型、MCP、插件入口
- [x] 右侧审查、终端、书签、检查器
- [x] 自定义标题栏、亮/暗主题、可调侧边栏
- [x] Windows Electron 打包配置

后续重点会放在安全存储、工作区授权、更多自动化联通、MCP 状态可视化和更完整的多语言体验上。

---

## 🤝 贡献

```bash
git clone https://github.com/kialajin-l/mimocode-gui.git
cd mimocode-gui
npm install
npm run electron:dev
```

提交前建议运行：

```bash
npm test
npm run build
npm run build:electron
git diff --check
```

---

## 📄 License

License 待确认。

