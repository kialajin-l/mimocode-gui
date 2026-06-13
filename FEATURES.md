# MiMoCode v1.0 功能清单

> 生成日期：2026-06-13
> 版本：v1.0 (29 commits)

---

## 一、MiMoCode GUI 功能列表

### 1. 核心功能

| 功能 | 说明 | Phase |
|------|------|-------|
| CLI 流式通信 | 通过 `mimo run` 实现流式输出，实时显示 AI 回复 | 1 |
| 会话持久化 | 自动保存到 `userData/sessions.json`，刷新不丢失 | 2 |
| 多窗口支持 | 右键会话可在新窗口打开独立会话 | 5 |

### 2. 侧边栏

| 功能 | 说明 | Phase |
|------|------|-------|
| 项目树 | 可折叠/展开，带颜色标识的项目分组 | 2 |
| 会话管理 | 创建、删除、重命名（双击编辑） | 1-2 |
| 搜索 | Ctrl+K 全局搜索会话和消息 | 2 |
| 右键菜单 | 重命名、在新窗口打开、删除 | 5 |
| 新建项目 | 底部按钮创建新项目分组 | 2 |

### 3. 聊天功能

| 功能 | 说明 | Phase |
|------|------|-------|
| Markdown 渲染 | 支持标题、列表、表格、引用等格式 | 2 |
| 代码高亮 | highlight.js 语法高亮，支持复制 | 4 |
| 流式输出 | 实时显示 AI 回复过程 | 1 |
| 取消 | 运行中可取消 AI 回复 | 1 |
| 消息书签 | 星标重要消息 | 7 |
| 消息复制 | 一键复制消息内容 | 8 |
| 工具调用显示 | 可折叠查看工具调用详情 | 9 |

### 4. 输入功能

| 功能 | 说明 | Phase |
|------|------|-------|
| 模型选择 | MiMo Auto / Pro / Lite | 2 |
| 权限控制 | 只读 / 允许编辑 / 允许执行 | 2 |
| 快捷键 | Ctrl+Enter 发送，Shift+Enter 换行 | 1 |

### 5. 右侧面板

| 功能 | 说明 | Phase |
|------|------|-------|
| 审查面板 | 显示文件 Diff，支持 Accept/Reject | 2 |
| 终端 | 真实命令执行，流式输出 | 2 |
| 版本历史 | 保存/恢复会话快照 | 5 |
| 书签面板 | 查看所有书签消息 | 8 |

### 6. 自动化

| 功能 | 说明 | Phase |
|------|------|-------|
| 预定义工作流 | Code Review / Bug Fix / Feature / Documentation | 3 |
| 步骤执行 | 分步执行工作流，可视化进度 | 3 |
| 插件管理 | 启用/禁用插件 | 3 |

### 7. 导入导出

| 功能 | 说明 | Phase |
|------|------|-------|
| 导出 | 会话导出为 Markdown 文件 | 3 |
| 导入 | 从 Markdown 文件导入会话 | 8 |

### 8. 主题与布局

| 功能 | 说明 | Phase |
|------|------|-------|
| 暗色/亮色切换 | 点击太阳/月亮图标切换 | 4 |
| macOS 标题栏 | 自定义标题栏 + 菜单 | 1 |
| 响应式布局 | 适配平板和手机屏幕 | 10 |

### 9. 国际化

| 功能 | 说明 | Phase |
|------|------|-------|
| 中英文切换 | 标题栏 中/EN 按钮 | 6 |
| 自动检测 | 根据浏览器语言选择 | 6 |
| 持久化 | localStorage 保存偏好 | 6 |

### 10. 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+B | 切换右侧面板 |
| Ctrl+K | 打开搜索 |
| Ctrl+N | 新建会话 |
| Ctrl+E | 导出会话 |
| Ctrl+I | 导入会话 |
| 点击「帮助」 | 显示快捷键帮助 |

---

## 二、mimo CLI 功能列表

### 1. 基础命令

| 命令 | 说明 |
|------|------|
| `mimo` | 启动 TUI 界面 |
| `mimo run <message>` | 运行单条消息 |
| `mimo attach <url>` | 连接到运行中的服务器 |
| `mimo serve` | 启动无头服务器 |
| `mimo web` | 启动服务器并打开 Web 界面 |

### 2. 会话管理

| 命令 | 说明 |
|------|------|
| `mimo session list` | 列出所有会话 |
| `mimo session delete <id>` | 删除会话 |
| `mimo session import-claude` | 导入 Claude Code 会话 |
| `mimo export [sessionID]` | 导出会话为 JSON |
| `mimo import <file>` | 从 JSON 文件导入会话 |

### 3. 模型与提供商

| 命令 | 说明 |
|------|------|
| `mimo models [provider]` | 列出可用模型 |
| `mimo providers` | 管理 AI 提供商和凭证 |

### 4. 工具与集成

| 命令 | 说明 |
|------|------|
| `mimo mcp` | 管理 MCP 服务器 |
| `mimo plugin <module>` | 安装插件 |
| `mimo github` | 管理 GitHub agent |
| `mimo pr <number>` | 拉取 GitHub PR 并运行 |
| `mimo acp` | 启动 ACP 服务器 |

### 5. 调试与统计

| 命令 | 说明 |
|------|------|
| `mimo debug` | 调试和故障排除工具 |
| `mimo stats` | 显示 token 使用和成本统计 |
| `mimo db` | 数据库工具 |

### 6. 运行选项

| 选项 | 说明 |
|------|------|
| `-m, --model` | 指定模型 (provider/model) |
| `-c, --continue` | 继续上一个会话 |
| `-s, --session` | 指定会话 ID 继续 |
| `--fork` | 分叉会话 |
| `--format` | 输出格式 (default/json) |
| `-f, --file` | 附加文件 |
| `--agent` | 指定 agent |
| `-p, --password` | 基本认证密码 |
| `--dangerously-skip-permissions` | 自动批准权限 |

### 7. 系统命令

| 命令 | 说明 |
|------|------|
| `mimo upgrade` | 升级到最新版本 |
| `mimo uninstall` | 卸载 mimocode |
| `mimo completion` | 生成 shell 补全脚本 |

---

## 三、技术架构

### GUI 技术栈

- **前端**：React 18 + Zustand + TypeScript
- **构建**：Vite + Code Splitting
- **后端**：Electron 28 + Node.js IPC
- **CLI**：mimo 命令行工具集成
- **样式**：CSS 变量 + 暗色主题
- **Markdown**：react-markdown + remark-gfm
- **代码高亮**：highlight.js

### 项目结构

```
mimocode-gui/
├── electron/              # Electron 主进程
│   ├── main.ts           # IPC 处理器、窗口管理
│   ├── preload.ts        # API 暴露到渲染进程
│   └── cli-bridge.ts     # mimo CLI 集成
├── src/
│   ├── components/        # React 组件
│   │   ├── Chat/         # 聊天相关
│   │   ├── Panel/        # 右侧面板
│   │   ├── Sidebar/      # 侧边栏
│   │   ├── Search/       # 搜索
│   │   ├── Help/         # 快捷键帮助
│   │   └── Settings/     # 设置
│   ├── hooks/            # React hooks
│   ├── stores/           # Zustand 状态管理
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   └── i18n/             # 国际化
└── ui/                   # HTML 原型
```

### 提交历史（29 commits）

```
b98c689 fix: code review fixes - 3 medium issues + 4 suggestions
e307802 feat: Phase 10 - responsive layout and session tags
43af1ca feat: Phase 9 - tool calls, shortcuts help, message search
aacb251 feat: Phase 8 - copy button, bookmarks panel, session import
8b2bfb9 feat: Phase 7 - message bookmark/star feature
bbfcacd feat: Phase 6 - internationalization (i18n) with Chinese/English support
162e1ef feat: Phase 5 - multi-window, version history, code splitting
b6e967e feat: Phase 4 - syntax highlighting, theme switching, session versioning
2929f75 feat: Phase 3 - plugin system, automation workflows, export
ccf329b feat: Phase 2 - performance, features, security fixes
5d161c8 fix: review fixes - terminal exit channel, hardcoded path, unused code
1aecb75 feat: add Accept/Reject buttons to review panel
a8a0d4c feat: add session rename via double-click
20fc985 feat: add Ctrl+B keyboard shortcut to toggle right panel
c6702d9 feat: auto-detect file changes after AI completes message
ce37e9a feat: implement real terminal execution in right panel
7de148a feat: add diff viewer in review panel
9dccca6 fix: revive Date objects when loading persisted sessions
bb771c1 feat: add session delete button with hover reveal
7d97cca feat: add right panel with review and terminal tabs
2b7f382 feat: add markdown rendering + input enhancements
ec86136 feat: sidebar upgrade with project tree + UI layout + session persistence
21d8fa4 fix: rewrite CLI bridge to message-based streaming
ce41dd8 feat: complete desktop GUI
5eba070 feat: add main layout with sidebar and chat area
58a667e feat: initial project scaffolding
```

---

*文档结束*
