# MiMoCode Desktop GUI 设计文档

> 版本: 1.0 | 日期: 2026-06-11 | 状态: 已批准

## [S1] 问题定义

MiMoCode 目前只有 CLI 界面，用户需要一个图形化桌面应用来：
- 更直观地与 AI 对话
- 管理会话历史
- 查看文件变更
- 切换主题

**目标用户**: MiMoCode 用户，希望有更友好的交互界面

**成功标准**:
- 可以通过 GUI 与 MiMoCode 对话
- 支持多会话管理
- 支持主题切换
- 响应时间 < 100ms（本地操作）

## [S2] 架构概览

```
┌─────────────────────────────────────────────────┐
│                 Electron 主进程                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  CLI 调用层  │  │  API 调用层  │  │ 文件监控  │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
├─────────────────────────────────────────────────┤
│                 Renderer 进程 (React)            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  聊天界面    │  │  会话管理    │  │  设置    │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │              主题系统 (CSS Variables)         │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**关键设计决策**:
1. 每个会话 = 独立的 MiMoCode CLI 进程
2. 双模式后端：CLI 调用 + API 直接调用
3. 复用 NightShift 2.0 的 Electron 框架
4. 复用 Hermes-Pro 的 Chat 组件

## [S3] 核心组件

### 3.1 聊天界面

**组件**: `MessageList`, `MessageInput`, `ToolCallDisplay`

**功能**:
- 消息列表（支持 Markdown 渲染）
- 输入框（支持多行、代码块）
- 工具调用展示
- 流式响应显示

**数据流**:
```
用户输入 → useSession.sendMessage() → CLI/API 调用 → 流式响应 → 更新 messages[]
```

### 3.2 会话管理

**组件**: `SessionList`, `SessionItem`

**功能**:
- 侧边栏会话列表
- 新建/删除/重命名会话
- 会话搜索
- 会话分组

**数据模型**:
```typescript
interface Session {
  id: string;           // 唯一标识
  name: string;         // 会话名称
  pid: number;          // CLI 进程 ID
  status: 'running' | 'idle' | 'error';
  cwd: string;          // 工作目录
  messages: Message[];  // 消息历史
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 主题系统

**组件**: `ThemeSwitcher`

**功能**:
- 暗色/亮色/自定义主题
- CSS Variables 实现
- 主题切换动画

**实现**:
```css
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}

:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #000000;
}
```

## [S4] 后端交互

### 4.1 CLI 模式

```typescript
// 调用 MiMoCode CLI
const cliBridge = {
  sendMessage: (sessionId: string, message: string) => {
    const proc = spawn('mimocode', [
      'chat',
      '--session', sessionId,
      '--message', message
    ]);
    return proc.stdout;  // 流式输出
  }
}
```

### 4.2 API 模式

```typescript
// 直接调用 MiMoCode API (SSE)
const apiBridge = {
  sendMessage: (sessionId: string, message: string) => {
    const eventSource = new EventSource(
      `/api/chat?session=${sessionId}&message=${encodeURIComponent(message)}`
    );
    return eventSource;
  }
}
```

### 4.3 自动检测

```typescript
// 优先使用 API，fallback 到 CLI
async function sendMessage(sessionId: string, message: string) {
  if (apiAvailable) {
    return apiBridge.sendMessage(sessionId, message);
  }
  return cliBridge.sendMessage(sessionId, message);
}
```

## [S5] 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 框架 | Electron 28+ | 成熟、跨平台，复用 NightShift 2.0 |
| UI | React 18 + TypeScript | 类型安全、生态丰富 |
| 状态管理 | Zustand | 轻量、简单，复用 NightShift 2.0 |
| 样式 | Tailwind CSS | 快速开发、主题支持 |
| Markdown | react-markdown + rehype | 支持代码高亮 |
| 构建 | electron-builder | 成熟的打包方案 |

## [S6] 项目结构

```
E:\code\mimocode-gui\
├── electron/
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   ├── cli-bridge.ts        # CLI 调用封装
│   └── api-bridge.ts        # API 调用封装
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ToolCallDisplay.tsx
│   │   ├── Sidebar/
│   │   │   ├── SessionList.tsx
│   │   │   └── SessionItem.tsx
│   │   └── Settings/
│   │       └── ThemeSwitcher.tsx
│   ├── hooks/
│   │   ├── useSession.ts
│   │   └── useTheme.ts
│   ├── services/
│   │   ├── mimocode-cli.ts
│   │   └── mimocode-api.ts
│   ├── stores/
│   │   ├── sessionStore.ts
│   │   └── themeStore.ts
│   └── themes/
│       ├── dark.css
│       ├── light.css
│       └── variables.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

## [S7] MVP 功能列表

### Phase 1: 核心功能
- [ ] 聊天界面（消息列表 + 输入框）
- [ ] 会话管理（新建/切换/删除）
- [ ] CLI 后端调用
- [ ] 基础主题切换（暗色/亮色）

### Phase 2: 增强功能
- [ ] 文件浏览器
- [ ] 代码差异展示
- [ ] 工具调用可视化
- [ ] 自定义主题

### Phase 3: 高级功能
- [ ] 多窗口支持
- [ ] 插件系统
- [ ] 会话导出/导入
- [ ] 快捷键系统

## [S8] 复用计划

### 从 NightShift 2.0 复用
- Electron 主进程结构
- Vite 配置
- Zustand stores
- electron-builder 配置

### 从 Hermes-Pro 复用
- Chat 组件结构
- App Shell 布局
- Conversation 模式

### 从 Nexus-Core 复用
- SQLite 集成（如果需要本地存储）
- 知识管理逻辑（可选）

## [S9] 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| CLI 调用性能 | 高 | 优先使用 API 模式 |
| Electron 包体大小 | 中 | 使用 tree-shaking，优化依赖 |
| 跨平台兼容性 | 中 | 测试 Windows/macOS/Linux |
| 主题一致性 | 低 | 使用 CSS Variables，统一设计系统 |

## [S10] 下一步

1. 创建项目脚手架
2. 实现 CLI 调用层
3. 实现基础聊天界面
4. 实现会话管理
5. 实现主题切换
6. 测试与优化
