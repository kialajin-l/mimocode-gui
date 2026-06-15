# MiMoCode GUI 用户反馈整改反馈文档

> 反馈日期：2026-06-14
> 反馈版本：R5 后（b5250b1）
> 文档类型：用户问题反馈单（用于交付开发方修改）
> 报告人：产品/QA
> 代码仓库：E:\code\mimocode-gui

---

## 总览

本次反馈共 **8 个用户问题**，按优先级分类如下：

| 优先级 | 数量 | 问题类型 |
|--------|------|---------|
| 高危（功能不可用） | 2 | 对话报错（#8）、插件/技能页无功能（#6） |
| 中危（交互缺陷） | 3 | 搜索关闭（#1）、状态卡层级（#2）、模型选择器不完整（#3） |
| 中危（导航缺陷） | 2 | 设置页退出（#4a）、`/` 命令源（#5） |
| 体验优化 | 1 | mode 颜色区分（#8b） |
| 功能新增 | 2 | 设置页 MCP（#7）、插件 GitHub 安装（#6b） |

---

## #1 搜索面板无法点击周围关闭

**用户描述**：点击搜索后弹出搜索会话内容。点击周围区域无法关闭，只能通过 esc 取消界面。

**实际状态**：⚠️ 部分实现，存在 bug

**证据**：
- 文件：`src/components/Search/SearchBar.tsx:57-65`
  ```tsx
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])
  ```
- 容器引用结构：
  ```tsx
  <div className="search-overlay" ref={containerRef}>  ← L73
    <div className="search-bar">                        ← L74
  ```
- **bug 原因**：`containerRef` 指向 `.search-overlay`，但 `.search-overlay` 背景透明覆盖整屏，`.search-bar` 才是视觉上的弹窗。点击空白区域时，`e.target` 在 `.search-overlay` 内部（因为 `.search-overlay` 是全屏），所以 `containerRef.current.contains(e.target)` 永远为 `true`，**永远不会触发 onClose**。

**根因**：外层 `search-overlay` 的全屏覆盖层也被视作"容器内"。

**复现步骤**：
1. 点击左栏"搜索"或按 `Ctrl+K`
2. 点击搜索框外的任意空白处
3. 预期：搜索面板关闭 → 实际：面板保留，只能按 Esc

**修复建议**：
- **方案 A**（推荐）：把 `containerRef` 改到 `.search-bar` 上（视觉弹窗），让 `.search-overlay` 作为透明背景层：
  ```tsx
  <div className="search-overlay" onClick={onClose}>
    <div className="search-bar" ref={containerRef} onClick={e => e.stopPropagation()}>
  ```
- **方案 B**：在 `handleClickOutside` 中判断点击目标是否是 `.search-overlay` 自身（用 `e.target === e.currentTarget`）。
- **方案 C**：保留外层 ref，但在 `handleClickOutside` 中判断"点击的是 overlay 自身"（`e.target.classList.contains('search-overlay')`）。

**修复位置**：`src/components/Search/SearchBar.tsx:57-65, 72-74`

**验收标准**：
- 点击搜索框外空白处 → 面板关闭
- 点击搜索结果项 → 跳转到对应会话并关闭
- 按 Esc → 关闭（保留原行为）
- 点击 `×` 清空按钮 → 只清空 query 不关闭（保留原行为）

---

## #2 状态卡片层级不对，其他页面应隐藏

**用户描述**：状态卡片只能在对话界面显示，进入设置等其他界面后将不再显示。

**实际状态**：❌ 当前实现错误

**证据**：
- 文件：`src/App.tsx:525`
  ```tsx
  {showStatusCard && <SideStatusCard session={activeSession} project={activeProject} />}
  ```
- 条件 `showStatusCard` 仅与用户设置开关有关，与当前 `workspaceView` 无关
- 当前行为：进入"插件" / "设置" / "自动化" 页面时，状态卡仍显示在右侧，挤占视觉空间

**修复建议**：
将渲染条件改为双条件：设置开启 **且** 处于对话视图。

```tsx
{showStatusCard && workspaceView === 'workbench' && (
  <SideStatusCard session={activeSession} project={activeProject} />
)}
```

**修复位置**：`src/App.tsx:525`

**验收标准**：
- 在对话页面（`workbench`）→ 状态卡按设置显示
- 进入设置 / 插件 / 自动化页面 → 状态卡自动隐藏
- 退出这些页面 → 状态卡恢复显示
- 状态卡仍受用户设置 `showStatusCard` 开关控制

---

## #3 模型选择器需接入 `/models` 真实能力 + 添加模型

**用户描述**：将 CLI 里的 `/models` 指令内容接入，将可选模型以及添加模型的功能添加上。UI 设计可以参考其他软件。

**实际状态**：⚠️ 半联通

**证据**：
- 文件：`src/components/Chat/MessageInput.tsx:55, 63-72`
  ```tsx
  const [models, setModels] = useState<string[]>(() => prefs.model ? [prefs.model] : FALLBACK_MODELS)
  useEffect(() => {
    let mounted = true
    window.electronAPI?.listModels?.().then(result => {
      if (!mounted || !result?.success || !result.models?.length) return
      const uniqueModels = Array.from(new Set(result.models))
      setModels(uniqueModels)
      if (!model) setModel(uniqueModels[0] || DEFAULT_MODEL)
    })
  }, [])
  ```
- 文件：`electron/cli-bridge.ts:44-58`
  ```ts
  export function listModels(): string[] {
    try {
      return execSync(`"${MIMO_PATH}" models`, {...})
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.includes('/') && !line.includes(' '))
        .slice(0, 200)
    } catch { return [] }
  }
  ```
- 文件：`src/components/Settings/SettingsPage.tsx:90-100`
  ```tsx
  <select value={defaultModel} onChange={...}>
    <option value="auto">自动选择</option>
    <option value="mimo-7b">MiMo-7B</option>
    <option value="mimo-32b">MiMo-32B</option>
    <option value="mimo-72b">MiMo-72B</option>
  </select>
  ```

**问题拆解**：

### 3a. 设置页"默认模型"下拉是写死 3 个假选项
- **位置**：`src/components/Settings/SettingsPage.tsx:90-100`
- **修复**：调用同一个 `api.listModels()` 动态填充；提供"添加自定义模型"输入框

### 3b. 输入框"模型"下拉无"添加模型"入口
- **位置**：`src/components/Chat/MessageInput.tsx:208-218`
- **修复**：在 `<select>` 后加"+ Add model"入口，弹窗输入 `provider/model` 形式

### 3c. 无 Recent / Favorites / Provider 分类
- **现状**：扁平列表
- **参考 UI**（用户附图）：右侧浮层，按 `Recent` / Provider 分类，含 `Add model` 项

**修复建议（参考 Codex-style 模型选择面板）**：

1. 新建组件 `src/components/Chat/ModelPicker.tsx`
2. main 端扩展：`api.listModels()` 返回结构化数据：
   ```ts
   { recent: string[], providers: { name: string, models: string[] }[], custom: string[] }
   ```
3. UI 形态（参考用户截图）：
   ```
   ┌─ Select model ─────────── esc ─┐
   │ Recent                        │
   │   MiMo Auto / MiMo-V2.5-Pro   │
   │ MiMo                          │
   │   + Add model                 │
   │   MiMo-V2-Flash               │
   │ Connect provider  Ctrl+A      │
   │ Favorite  Ctrl+F              │
   └───────────────────────────────┘
   ```
4. 自定义模型持久化到 `userData/custom-models.json`（main 端新增 IPC）
5. Esc 关闭面板

**修复位置**：
- `src/components/Chat/MessageInput.tsx:208-218`（替换为 ModelPicker 触发器）
- `src/components/Chat/ModelPicker.tsx`（新增）
- `src/components/Settings/SettingsPage.tsx:90-100`（同样接入 ModelPicker）
- `electron/cli-bridge.ts:44-58`（返回结构化数据）
- `electron/main.ts`（新增 `custom-models-get/set` IPC）

**验收标准**：
- 点击模型下拉 → 弹出按 Provider 分类的面板
- 面板包含 Recent / Provider / Add model 入口
- 添加的自定义模型持久化，刷新后保留
- 在设置页"默认模型"同样使用此面板
- Esc 关闭面板

---

## #4 设置页无退出入口 + 缺少 Esc 退出快捷键

**用户描述**：点击进入设置后，点击旁边的会话等不能直接跳转，得点击上方的对话图标才能退出页面。请在该页面添加退出的图标，放在右上角即可。另外添加 esc 的指令，方便使用。

**实际状态**：❌ 实际有退出按钮，但用户未看到；且没有 Esc 退出

**证据**：
- 文件：`src/components/Settings/SettingsPage.tsx:27-31`
  ```tsx
  <button className="settings-close-btn" onClick={onClose} title="返回工作台">
    <svg ...>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
  ```
- **问题 1**：退出按钮存在但视觉上可能不够突出
- **问题 2**：三个视图（`plugins` / `settings` / `automation`）都没有 Esc 退出快捷键
- 文件：`src/hooks/useKeyboardShortcuts.ts` 缺少 view-level Esc 处理

**修复建议**：

1. **统一头部设计**：将退出按钮样式与插件页 `plugin-manager-actions` 对齐（参考 `PluginManager.tsx:58-62`）
2. **新增 Esc 退出**（推荐在 `App.tsx` 顶层监听）：

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && workspaceView !== 'workbench') {
      e.stopPropagation()
      navigateTo('workbench')
    }
  }
  window.addEventListener('keydown', handleKeyDown, true)
  return () => window.removeEventListener('keydown', handleKeyDown, true)
}, [workspaceView, navigateTo])
```

3. **同时覆盖** `plugins` / `settings` / `automation` 三个视图
4. 提示用户：在 `.settings-page` 头部加 `Esc 退出` 提示文案

**修复位置**：
- `src/components/Settings/SettingsPage.tsx:27-31`（视觉强化）
- `src/components/Settings/PluginManager.tsx:58-62`（同样强化）
- `src/components/Panel/WorkflowPanel.tsx`（添加退出按钮，若缺失）
- `src/App.tsx` 或 `src/hooks/useKeyboardShortcuts.ts`（新增 Esc 监听）

**验收标准**：
- 在设置/插件/自动化页面按 Esc → 自动回到工作台
- 三个页面右上角均有显眼的 × 退出按钮
- 退出按钮 hover 有视觉反馈

---

## #5 `/` 快捷命令应参考 CLI 而非 GUI 功能开关

**用户描述**：`/` 的快捷指令请参照 cli 里的快捷指令，而不是现在的 gui 的一些功能开关指令。

**实际状态**：❌ 当前是 GUI 功能入口

**证据**：
- 文件：`src/components/Chat/SlashCommandMenu.tsx:9-17`
  ```ts
  const SLASH_COMMANDS: SlashCommand[] = [
    { id: 'new', label: '/new', description: '新建会话' },
    { id: 'file', label: '/file', description: '添加文件' },
    { id: 'plan', label: '/plan', description: '切换到 Plan 模式' },
    { id: 'build', label: '/build', description: '切换到 Build 模式' },
    { id: 'plugins', label: '/plugins', description: '打开插件管理' },
    { id: 'workflow', label: '/workflow', description: '打开自动化' },
    { id: 'status', label: '/status', description: '切换状态卡片' },
  ]
  ```
- **问题**：所有命令都是 GUI 内部导航 / 模式切换，没有真正调用 CLI 子命令

**修复建议**：

替换为 **CLI 子命令**（与 `mimo run` 配合），命令来源为：
1. **CLI 子命令**：`/dream`、`/distill`、`/dream-start`、`/dream-resume`、`/dream-status`、`/dream-stop`（参考 MiMoCode CLI 的 dream 系列）
2. **CLI prompt 命令**：`/plan`、`/build` 触发 CLI 内对应 prompt 模板
3. **CLI 项目命令**：从 `AGENTS.md` / `.mimo/commands/*.md` 解析
4. **插件命令**：从 `pluginStore.plugins` 派生命令

**示例命令源**：

```ts
const CLI_SLASH_COMMANDS: SlashCommand[] = [
  // mimo run 内置
  { id: 'dream', label: '/dream', description: '进入 Dream 模式（深度背景收集）' },
  { id: 'distill', label: '/distill', description: '从当前上下文提炼要点' },
  { id: 'plan', label: '/plan', description: '进入 Plan 模式（不直接改代码）' },
  { id: 'build', label: '/build', description: '进入 Build 模式（执行实现）' },
  // 项目命令
  { id: 'commit', label: '/commit', description: '自动 commit 改动（需 AGENTS.md）' },
  { id: 'review', label: '/review', description: '代码审查（需 AGENTS.md）' },
  // 系统
  { id: 'help', label: '/help', description: '显示所有可用命令' },
  { id: 'clear', label: '/clear', description: '清空当前会话上下文' },
]
```

**实现路径**：
- 命令前缀 `/dream`、`/distill` 拼接为 `mimo dream ...` / `mimo distill ...` 子命令调用
- 命令前缀 `/plan`、`/build` 仅设置 `mode` 状态
- 命令前缀 `/commit`、`/review` 读取 `.mimo/commands/*.md` 中的 prompt 模板

**修复位置**：
- `src/components/Chat/SlashCommandMenu.tsx:9-17`（替换命令源）
- `electron/cli-bridge.ts`（新增 `mimo dream/distill` 子命令支持，或将 `/dream` 转为 prompt 前缀）
- `src/hooks/useSession.ts`（执行时区分 command 与 prompt）

**验收标准**：
- `/` 触发的命令菜单不再是"打开插件/状态卡"等 GUI 入口
- 输入 `/` 看到的是 `dream` / `distill` / `plan` / `build` / `commit` / `review` / `help` / `clear` 等可执行命令
- `/dream` 触发后能在 CLI 实际执行 dream 模式（可观察 stderr 的 mode metadata）
- 仍保留 `Ctrl+K` 搜索（搜索是 GUI 入口，与 `/` 命令互不冲突）

---

## #6 插件页需支持 skill 扫描 + 本地/GitHub 安装 + 搜索

**用户描述**：插件页面现在没有相应功能，需要能够扫描 skill，安装 skill，安装包括从本地安装和从 github 安装。添加查找功能。参考对象：skills-manage，harnesskit 等。

**实际状态**：⚠️ 仅有 npm 包名安装，无 skill 概念

**证据**：
- 文件：`src/components/Settings/PluginManager.tsx:78-91`
  ```tsx
  <input
    type="text"
    className="plugin-install-input"
    placeholder="模块名（npm 包或路径）"
    value={installModule}
    onChange={e => setInstallModule(e.target.value)}
  />
  <button className="plugin-install-btn" onClick={handleInstall} ...>
    {installing ? '安装中...' : '安装'}
  </button>
  ```
- 文件：`src/stores/pluginStore.ts:88-97`（installPlugin 调用）
- 文件：`electron/plugin-scanner.ts`（仅扫描 OpenCode/MiMo 插件目录，无 skill 概念）

**修复建议（参考 skills-manage / harnesskit）**：

### 6a. 引入"技能"（Skill）类型，与"插件"（Plugin）并列

```ts
interface Skill {
  id: string
  name: string
  description: string
  path: string
  source: 'local' | 'github' | 'discovered'
  version?: string
  enabled: boolean
  installedAt?: number
}
```

### 6b. 扫描路径
- `~/.mimo/skills/`（本地已安装）
- `~/.mimo/skills/.git/...`（Git 仓库）
- 项目内 `.mimo/skills/`
- npm：`@mimo-ai/*` scope

### 6c. 安装来源

| 来源 | 输入 | 命令 |
|------|------|------|
| 本地路径 | `file path` | 复制到 `~/.mimo/skills/{name}/` |
| GitHub | `owner/repo` 或完整 URL | `git clone https://github.com/owner/repo ~/.mimo/skills/{name}/` |
| npm | `@mimo-ai/<skill>` | `npm install -g @mimo-ai/<skill>` |

### 6d. 搜索功能
- 顶部加搜索框，客户端过滤插件名/描述/路径
- 安装源（本地/GitHub/npm）切换 tab

### 6e. 修复文件：
- `electron/plugin-scanner.ts` → 拆分为 `plugin-scanner.ts` + `skill-scanner.ts`
- `src/stores/pluginStore.ts` → 新增 `skillStore.ts`
- `src/components/Settings/PluginManager.tsx` → 重构为"扩展"页（plugin + skill 双 tab）
- `electron/main.ts` → 新增 IPC：
  - `skill-list-scan` / `skill-install-local` / `skill-install-github` / `skill-remove`

**修复位置**：
- `electron/main.ts`（新增 skill IPC handlers）
- `electron/plugin-scanner.ts`（拆出 skill-scanner）
- `src/stores/skillStore.ts`（新增）
- `src/components/Settings/PluginManager.tsx`（重构）
- `src/components/Settings/SkillManager.tsx`（新增）
- `src/types/electron.d.ts`（新增 IPC 类型）

**验收标准**：
- 页面顶部有搜索框，可过滤已发现技能
- 三个安装源：本地路径 / GitHub URL / npm 包名
- GitHub 安装：输入 `owner/repo` 自动 clone
- 扫描：发现 `~/.mimo/skills/` 下的所有技能
- 与 OpenCode 插件共存不冲突

---

## #7 设置页需添加 MCP 服务管理

**用户描述**：设置页面添加 MCP 服务，支持 MCP 的状态查看和添加。可参考 codex desktop。

**实际状态**：❌ 完全缺失

**证据**：
- 文件：`src/components/Settings/SettingsPage.tsx` 全文 157 行，**无 MCP 相关 section**
- 文件：`src/components/Status/SideStatusCard.tsx:71-76` 仅有静态"codegraph 待接入"提示
- main 端 `electron/main.ts` 无 MCP 相关 IPC handler

**修复建议（参考 Codex Desktop）**：

### 7a. 设置页新增"服务"section
位置：`src/components/Settings/SettingsPage.tsx` 增加 `<section className="settings-section">`

```tsx
<section className="settings-section">
  <h4>服务（MCP）</h4>
  {/* 现有 MCP 列表 */}
  {mcps.map(mcp => (
    <McpServerRow mcp={mcp} onToggle={...} onRemove={...} onEdit={...} />
  ))}
  {/* 添加 MCP */}
  <button onClick={() => setMcpFormOpen(true)}>+ 添加 MCP</button>
</section>
```

### 7b. McpServerRow 字段
- 名称、命令/URL、状态（连接/断开/错误）、启用开关
- 操作：编辑 / 删除 / 重新连接

### 7c. 添加 MCP 表单
- 类型：`stdio` / `http` / `sse`
- 名称、命令、参数、环境变量、URL
- 校验：路径合法、命令存在

### 7d. main 端实现
- 新增 IPC：`mcp-list` / `mcp-add` / `mcp-remove` / `mcp-toggle` / `mcp-test`
- 配置文件：`userData/mcp.json`（与 `~/.mimo/mcp.json` 双向同步）
- 子进程管理：stdio 模式用 `child_process.spawn`、http 模式用健康检查 GET

### 7e. UI 参考 Codex Desktop
- 列表 + 状态指示灯（绿/黄/红）
- 折叠的编辑面板
- 顶部"+ Add MCP"按钮

**修复位置**：
- `src/components/Settings/SettingsPage.tsx`（新增 section）
- `src/components/Settings/McpServerRow.tsx`（新增）
- `src/components/Settings/McpForm.tsx`（新增）
- `src/stores/mcpStore.ts`（新增）
- `electron/main.ts`（新增 IPC）
- `electron/mcp-manager.ts`（新增，子进程/连接管理）
- `src/types/electron.d.ts`（新增类型）

**验收标准**：
- 设置页有"服务"section，列出所有 MCP
- 每个 MCP 显示连接状态（绿/黄/红）
- 可添加 stdio / http / sse 类型 MCP
- 可启用/停用/删除 MCP
- 添加后 SideStatusCard 的 MCP 区块同步显示状态

---

## #8 对话报错 + mode 应有颜色区分

**用户描述**：
- 现在对话有问题，无法正常使用，会回复错误信息
- mode: plan 这个模式，请将模式放在对话的分割线上面。用 cli 中不同模式的颜色来区分
- 同时该模式对话下，模型回复的对话框可以将会话框的边框或者 mimo code 的名称改成该模式的相应颜色

### 8a. 对话报错

**实际状态**：❌ 存在错误

**证据**：
- 文件：`src/hooks/useSession.ts:204-215`
  ```ts
  upsertAssistantDraft({
    content: `MiMo 执行失败：${result?.error || '未返回内容'}`,
    parts: [{
      id: crypto.randomUUID(),
      type: 'error',
      title: '执行失败',
      content: result?.error || '未返回内容',
      ...
    }]
  })
  ```
- 错误来源：
  - `electron/cli-bridge.ts:46-50` `execSync` 在 PATH 没有 `mimo` 时抛错，吞掉
  - `electron/cli-bridge.ts:79-90` 实际 `spawn` 时的参数可能不正确（`run` 子命令、`--model` 是否被支持未知）
  - 用户看到的是 `MiMo 执行失败：<err>`

**修复建议**：

1. **CLI 路径探测失败时给明确提示**：
   - `cli-bridge.ts:6-38` `findMimoBin()` 失败后回退到 `'mimo'`，但 `MIMO_PATH` 仍是字符串
   - 在 `main.ts` 启动时探测一次 `mimo --version`，若失败 → 在 UI 端弹 toast 提示用户安装
2. **验证 `mimo run` 子命令是否存在**：
   - 跑 `mimo --help` / `mimo run --help` 检查输出
   - 若 `run` 不存在，回退到根命令或显示"CLI 版本不兼容"提示
3. **错误信息更可读**：
   - `result.error` 中若包含 `ENOENT` → 显示"找不到 mimo 可执行文件，请确认已安装 MiMo CLI"
   - 若包含 `EACCES` → 显示"权限不足"
4. **增加重试按钮**：在错误消息体旁加"重试"按钮

**修复位置**：
- `electron/cli-bridge.ts:6-38`（探测失败时 throw 而非静默回退）
- `electron/main.ts`（启动时验证 CLI 健康）
- `src/hooks/useSession.ts:204-215`（友好错误提示）
- `src/components/Chat/MessageList.tsx`（错误消息加重试按钮）

### 8b. mode 颜色区分

**实际状态**：⚠️ mode 标签存在但无颜色

**证据**：
- 文件：`src/components/Chat/MessageList.tsx:230-247`
  ```ts
  function parseMessageDisplay(content: string) {
    const lines = content.split('\n')
    const badges: string[] = []
    ...
    if (bodyLines[0]?.startsWith('Mode:')) {
      const mode = bodyLines.shift()?.replace('Mode:', '').replace('.', '').trim()
      if (mode) badges.push(mode)
    }
    ...
    return { content: bodyLines.join('\n'), badges }
  }
  ```
- **问题 1**：当前发送时 mode 格式是 `---\nmode: ${mode}\n---\n\n`（R3 修复后的），而 `parseMessageDisplay` 解析的是旧版 `Mode: Compose.\n` 格式，**badge 解析失效**（用户截图显示无 mode badge）
- 文件：`src/components/Chat/MessageList.tsx:53-57`
  ```tsx
  {display.badges.length > 0 && (
    <div className="message-badges">
      {display.badges.map(badge => <span key={badge}>{badge}</span>}
    </div>
  )}
  ```
- 无 mode 颜色 class

**修复建议**：

1. **统一 mode 解析逻辑**（修 `parseMessageDisplay` 支持新格式）：
   ```ts
   function parseMessageDisplay(content: string) {
     // 匹配新格式：---\nmode: <mode>\n---
     const modeMatch = content.match(/^---\nmode:\s*(compose|plan|build)\n---/)
     let mode: string | null = null
     let body = content
     if (modeMatch) {
       mode = modeMatch[1]
       body = content.slice(modeMatch[0].length).replace(/^\n+/, '')
     }
     ...
     return { content: body, badges: mode ? [mode] : [], mode }
   }
   ```

2. **CSS 颜色变量**（参考 CLI 中不同模式的颜色）：
   ```css
   :root {
     --mode-compose: #3b82f6;  /* 蓝 - Compose */
     --mode-plan: #f59e0b;     /* 橙 - Plan */
     --mode-build: #10b981;    /* 绿 - Build */
   }
   .message-badges .mode-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
   .message-badges .mode-compose { background: var(--mode-compose); color: white; }
   .message-badges .mode-plan { background: var(--mode-plan); color: black; }
   .message-badges .mode-build { background: var(--mode-build); color: white; }
   ```

3. **对话气泡边框 / 标题色**：
   - `MessageList.tsx:30` `<div className={...} message-${role}}>` 增加 `data-mode={mode}` 属性
   - CSS：
     ```css
     .message[data-mode="compose"] .message-stack { border-left: 3px solid var(--mode-compose); }
     .message[data-mode="plan"] .message-stack { border-left: 3px solid var(--mode-plan); }
     .message[data-mode="build"] .message-stack { border-left: 3px solid var(--mode-build); }
     .message[data-mode="plan"] .message-role { color: var(--mode-plan); }
     .message[data-mode="build"] .message-role { color: var(--mode-build); }
     ```

4. **mode 标签在分割线之上**（用户要求）：
   - 在 message header 中渲染 `<div className="mode-divider">plan</div>` 而非底部 badge
   - 实际效果：
     ```
     ┌─── plan ────  ← (divider with mode color)
     │ MiMoCode · 12:34
     │ [回复内容]
     ```

**修复位置**：
- `src/components/Chat/MessageList.tsx:230-247`（修 parseMessageDisplay 解析新格式）
- `src/components/Chat/MessageList.tsx:30-91`（渲染 mode divider + data-mode 属性）
- `src/App.css`（新增 mode 颜色变量和 class）
- `src/components/Chat/MessageInput.tsx:120-122`（若需调整发送格式）

**验收标准**：
- 输入 `/plan` 后发送 → 消息顶部有橙色 `plan` 分割线
- 输入 `/build` 后发送 → 消息顶部有绿色 `build` 分割线
- 切换 mode 后，对话框左边框 / 标题颜色随之变化
- 用户从对话区域可一眼区分当前 mode

---

## 修复优先级建议

| 优先级 | 问题 | 预估工作量 |
|--------|------|----------|
| P0 | #8a 对话报错 | 1-2 天 |
| P0 | #6 插件页 skill 扫描/安装 | 3-5 天 |
| P1 | #1 搜索点击关闭 | 0.5 小时 |
| P1 | #2 状态卡层级 | 0.5 小时 |
| P1 | #3 模型选择器 | 2-3 天 |
| P1 | #4 设置页退出 | 1 小时 |
| P1 | #5 `/` 命令源 | 2-3 天 |
| P1 | #7 设置页 MCP | 3-5 天 |
| P2 | #8b mode 颜色 | 1-2 天 |

**总预估**：2-3 周。

---

## 修复后回归测试清单

1. `npm run build` 通过
2. `npm run build:electron` 通过
3. `npm test -- --run` 通过（建议新增 skill / MCP / mode 测试）
4. 手动回归：
   - 搜索弹窗 → 点击空白处关闭
   - 进入设置页 → 状态卡消失
   - 设置页 → 按 Esc 退出
   - 模型下拉 → 显示 Provider 分类 + 可添加
   - 输入 `/dream` → 真正执行 dream 模式
   - 插件页 → 输入 GitHub URL 安装
   - 设置页 → 添加 stdio 类型 MCP
   - 输入 `/plan` → 对话框有橙色 plan 标识

---

## 关联文档

- [2026-06-14-mimocode-gui-code-review.md](./2026-06-14-mimocode-gui-code-review.md) — R1 首次审查
- [2026-06-14-mimocode-gui-code-review-r5.md](./2026-06-14-mimocode-gui-code-review-r5.md) — R5 终审
- [2026-06-14-mimocode-gui-test-report.md](./2026-06-14-mimocode-gui-test-report.md) — 测试报告
- [2026-06-14-mimocode-gui-audit-report.md](../compose/specs/2026-06-14-mimocode-gui-audit-report.md) — 首次联通审查
