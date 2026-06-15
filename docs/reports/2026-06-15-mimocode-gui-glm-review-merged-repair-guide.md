# MiMoCode GUI GLM 审核核对与合并返修指导

> 日期：2026-06-15  
> 工作目录：`E:\code\mimocode-gui`  
> 依据：GLM 审核截图、GLM pasted-text 审核全文、当前源码核对、当前测试/构建结果  
> 当前验证：`npm test -- --run` 通过 78/78；`npm run build` 通过；`npm run build:electron` 通过；`git diff --check` 无空白错误，仅 CRLF 提示  

## 一、核对摘要

GLM 报告中的多数问题可以在当前源码中定位到，但严重程度需要重新校准：

- 已确认且应优先修：API Key 明文 localStorage、`validateCwd` 以 `process.cwd()` 作为项目边界、IPC 缺少 channel 白名单、WebView 未限制加载来源、会话版本快照不完整、右侧版本面板 fallback 可跨项目误选。
- 已确认但可降级：`httpGet` 的 `req` 闭包写法、CSS 单文件过大、硬编码颜色、搜索/消息渲染性能、终端危险命令黑名单可绕过。
- 不建议作为本轮主线：大规模 CSS 拆分、全量 IPC 架构重构、终端改为完全白名单。它们收益存在，但会扩大改动面，适合后续专项。

## 二、合并后的返修范围

### 必须修复（P0/P1）

| 优先级 | 位置 | 问题 | 核对结论 | 返修要求 |
|---|---|---|---|---|
| P0 | `src/stores/modelStore.ts:59`、`src/components/Settings/ProviderFormModal.tsx`、`electron/main.ts:173` | API Key 存在渲染层 localStorage，并经 IPC 明文传入主进程 | 属实，桌面端风险低于 Web，但一旦 XSS/DevTools/插件脚本可读就会泄漏 | 将 API Key 迁移到 Electron 主进程安全存储；渲染层只保存 provider 元数据和 key 是否存在；获取模型由主进程代理 |
| P0 | `electron/preload.ts:6` | `safeInvoke(channel, ...)` 没有 channel 白名单 | 属实。contextIsolation 只能限制暴露面，但暴露出的通用 invoke 仍应自校验 | 增加 `ALLOWED_CHANNELS`，只允许当前显式暴露的 channel；未知 channel 直接返回 `{ success:false }` |
| P1 | `electron/main.ts:51`、`src/components/WebUI/WebUIHost.tsx:124` | `webviewTag: true` 且 WebView 无主进程 `will-attach-webview` 限制 | 属实。当前仍有 WebUI 宿主组件，不能简单删除 | 添加 `will-attach-webview` 拦截：限制 URL 到本地 MiMo serve / localhost 白名单，关闭不必要 preload/node 权限；如果 GUI 不再依赖 WebUI，隐藏入口并保留防线 |
| P1 | `electron/security-ipc.ts:25` | `validateCwd` 使用 `process.cwd()` 作为项目根，导致用户选择的真实工作区可能被 Git/Terminal 拒绝 | 属实，且影响核心工作流 | 改成“用户授权工作区白名单”：创建/选择项目时记录 cwd，Git/Terminal 仅允许这些 cwd 及其子目录；保留 `realpath` 防符号链接绕过 |
| P1 | `src/stores/sessionStore.ts:181`、`src/types/session.ts:32`、`src/components/Panel/VersionHistory.tsx:37` | 会话版本只保存/恢复 messages，不保存完整 session 状态 | 属实，与“会话版本”语义不一致 | 扩展 `SessionVersion` 为完整快照或新增 `snapshot` 字段，恢复时还原 `messages/changes/tags/cwd/status` 等必要字段，同时避免恢复后残留重复版本 |
| P1 | `src/components/Panel/RightPanel.tsx:24`、`src/utils/projectVersions.ts:7` | 没有 active session 时，版本面板 fallback 可能选到任意项目的归档版本 | 属实，可能跨项目展示错误历史 | 版本入口必须绑定当前项目；无项目上下文时显示空态，不要跨项目猜测 |

### 应修复（P2）

| 优先级 | 位置 | 问题 | 核对结论 | 返修要求 |
|---|---|---|---|---|
| P2 | `electron/cli-bridge.ts:216` | JSON 流解析依赖 `text.includes('"type"')`，chunk 边界可能导致缓冲遗留或文本乱序 | 属实，影响流式体验稳定性 | 改为统一行缓冲：所有 stdout chunk 进入 buffer，按行尝试 JSON parse，失败再作为纯文本事件 |
| P2 | `electron/main.ts:354` | `mimo-serve-output` handler 每调用一次注册一次主进程监听，未使用 unsubscribe | 属实，但触发频率取决于调用方式 | 改为单例监听，或提供 start/stop subscription；避免重复注册 |
| P2 | `electron/security-ipc.ts:84`、`electron/main.ts:385` | 危险命令检测黑名单可绕过，终端安全边界说明不足 | 属实；终端本身允许执行 shell，不能简单禁止所有 shell 特性 | 增强常见绕过正则，执行高风险命令前二次确认；文案明确“终端会执行真实系统命令” |
| P2 | `src/App.tsx:265`、`src/stores/sessionStore.ts:86` | `loadData` 失败仅日志或静默 loaded=true，用户无感知 | 属实 | 增加 store 错误状态或 toast/状态栏提示，并提供重试入口 |
| P2 | `src/App.tsx:269` | URL `sessionId` 未验证存在即 `setActiveSession` | 属实 | 等数据加载完成后校验 session 是否存在，不存在则清理参数/显示提示 |
| P2 | `electron/main.ts:518`、`electron/main.ts:582` | 部分 dialog 使用非空断言/冗余非空断言 | 属实，低概率异常 | 移除非空断言，窗口不存在时走无 parent dialog 或返回错误 |
| P2 | `electron/main.ts:393`、`src/components/Panel/RightPanel.tsx:133` | 终端进程 timeout/组件卸载未主动 kill 当前进程 | 属实 | timeout 分支同步清理 Map；TerminalPanel 卸载时 kill 自己创建的进程 |

### 建议优化（P3）

| 优先级 | 位置 | 问题 | 返修建议 |
|---|---|---|---|
| P3 | `src/components/Chat/MessageList.tsx:19` | 每次渲染 `reverse().find()` 创建数组 | 从尾部 for 循环查找，或用 `useMemo` |
| P3 | `src/components/Chat/MessageList.tsx:65` | 每条消息每次 render 都 parse display | 对消息展示解析加 `useMemo` 或在消息入库时标准化 |
| P3 | `src/App.tsx:168` | 搜索每次输入遍历所有 session/messages | 搜索输入加 debounce；数据量继续增长时再考虑 Web Worker |
| P3 | `src/components/Panel/VersionHistory.tsx:13` | 每次 render flatMap 项目内所有版本 | 提供 store selector/helper，或至少 `useMemo` |
| P3 | `src/components/Sidebar/ProjectNode.tsx:37` | 项目右键菜单未 clamp viewport | 根据菜单预估宽高限制 x/y |
| P3 | `src/components/Chat/WorkbenchOverview.tsx`、`src/App.css` | 响应式阈值散落 JS/CSS | 统一常量或尽量 CSS 驱动 |
| P3 | `src/App.css` | 单文件 CSS 已超过 6000 行且仍有硬编码颜色 | 本轮仅修主题错色；后续分阶段拆为 `chat/sidebar/settings/panel` 等文件 |
| P3 | `src/stores/modelStore.ts:108` | `loaded` 一次性标志让 provider 外部变更后刷新不直观 | 提供 `reloadProviders()`，用于设置保存、CLI 配置同步后强制刷新 |

## 三、暂不采纳或降级说明

- `electron/main.ts:136` 的 `httpGet` 中 `setTimeout` 回调引用 `req`：当前 timer 在当前调用栈结束后才可能触发，正常情况下 `req` 已初始化；建议作为可读性优化，不列为中危阻塞。
- “终端使用 `cmd.exe /c` 是命令注入”：该面板本质是用户主动输入命令的终端，不应按普通表单注入处理；真正问题是高风险命令防护和授权提示不足。
- “全局异常仅打印日志”：可改进，但不应先于 API Key、IPC、CWD、版本语义等核心问题。
- “CSS 全量拆分”：代码健康问题属实，但一次性拆分风险大，应在功能返修完成后独立处理。

## 四、验收标准

### 功能验收

1. 用户选择任意本地项目目录后，Git 审查、终端、会话发送都能使用该 cwd，不再被 `process.cwd()` 错误拦截。
2. API Key 不再出现在 `localStorage.getItem('mimocode-providers')` 中；Provider 页面仍能显示“已配置/未配置”，并能获取模型列表。
3. 会话版本保存后能恢复完整 session 关键状态；恢复后该版本从历史中移除，再归档不会重复生成同一个历史项。
4. 无 active session 但有项目上下文时，右侧会话版本只展示该项目版本；无项目上下文时显示空态。
5. WebView 只能加载允许的本地/localhost MiMo 地址；非白名单 URL 被阻止并记录日志。
6. 流式对话不会因为 JSON chunk 分割出现“未返回内容”、重复文本、思考状态迟迟不结束。

### 验证命令

```powershell
npm test -- --run
npm run build
npm run build:electron
git diff --check
```

### 建议新增/更新测试

- `electron/security-ipc.test.ts`：授权 cwd、未授权 cwd、符号链接/realpath、路径大小写。
- `electron/preload.test.ts` 或等价单元测试：未知 IPC channel 被拒绝。
- `electron/cli-message.test.ts` / `electron/cli-bridge` 流解析测试：JSON 行跨 chunk、纯文本混合 JSON、stderr thinking。
- `src/stores/__tests__/sessionStore.test.ts`：完整 session version snapshot 保存/恢复。
- `src/components/Panel/__tests__/RightPanel.versions.test.tsx`：跨项目版本不可见、无上下文为空态。
- `src/stores/__tests__/modelStore.test.ts`：Provider metadata 不保存 API Key 明文；reload 后状态一致。

## 五、返修提示词

```text
你现在执行一次 MiMoCode GUI 的窄范围返修任务。

工作目录：
E:\code\mimocode-gui

背景：
项目是 MiMoCode GUI，定位是专属编程与工作工具。不得加入写作工作台，不得恢复 Phase 5 写作功能，不得把产品方向偏移到通用写作/内容创作。UI 和功能应继续保持中文优先、Codex Desktop 式简洁，同时保留 MiMo 的 Compose / Plan / Build、会话版本、插件、MCP、Provider 等编程工作流。

任务目标：
修复 GLM 审核与本地核对后确认的安全、工作区、会话版本和流式稳定性问题。保持改动聚焦，不做大规模无关重构。

必须修复：
1. API Key 安全存储：
   - 不允许继续把 API Key 明文保存在渲染层 localStorage。
   - Provider 元数据可留在渲染层，但 key 只能以“是否已配置/掩码状态”展示。
   - 获取模型列表由 Electron 主进程代理，主进程从安全存储或 CLI auth/env 中取 key。
2. IPC channel 白名单：
   - 在 electron/preload.ts 的 safeInvoke 增加显式 ALLOWED_CHANNELS。
   - 未列入白名单的 channel 必须拒绝，不允许透传。
3. WebView 安全限制：
   - 保留 webviewTag 的前提下，在主进程添加 will-attach-webview 拦截。
   - 只允许 MiMo 本地 serve / localhost / 127.0.0.1 等必要地址。
   - 禁止 webview 获得 nodeIntegration/preload 等不必要能力。
4. 工作区 cwd 授权：
   - 不要再用 process.cwd() 当用户项目安全边界。
   - 用户创建/选择项目目录后，将 cwd 作为授权工作区。
   - Git/Terminal/read-file 等相关操作只允许授权工作区及其子路径。
   - 使用 fs.realpath/path.resolve 防止符号链接或前缀绕过。
5. 会话版本语义修复：
   - SessionVersion 不应只保存 messages。
   - 保存/归档版本时记录完整或足够完整的 session snapshot。
   - 恢复时恢复 messages、changes、tags、cwd/status 等关键状态，并把已恢复版本从历史中移除。
   - 避免恢复后再次归档产生重复历史项。
6. 右侧会话版本上下文：
   - RightPanel/VersionHistory 不能在无 active session 时跨项目随便找归档版本。
   - 版本历史必须绑定当前项目；无项目上下文时显示空态。
7. MiMo CLI 流式解析：
   - cli-bridge 的 stdout 解析改为统一行缓冲。
   - JSON 行跨 chunk、纯文本混合 JSON、stderr thinking 都要稳定处理。
   - 结束时不能因为残留 buffer 导致“未返回内容”或思考动画延迟不结束。
8. 资源/错误处理补强：
   - mimo-serve-output 监听改为单例或可清理订阅。
   - terminal timeout 后清理 Map；TerminalPanel 卸载时 kill 当前进程。
   - loadData 失败要有 UI 可见反馈或可重试状态。
   - URL sessionId 必须在数据加载完成后校验存在。

可以顺手处理：
1. MessageList 用尾部遍历替代 reverse().find()。
2. 搜索输入加 debounce。
3. VersionHistory 聚合版本加 useMemo 或 store helper。
4. ProjectNode 右键菜单增加 viewport clamp。
5. 修复少量主题错色，把明显硬编码的状态色迁移到 CSS 变量。

不允许修改：
1. 不要加入写作工作台、文章生成、内容创作类入口。
2. 不要重写整体 UI，不要大规模拆分 6000 行 CSS，除非是修复主题错色所必需。
3. 不要删除现有 Compose / Plan / Build、插件、MCP、Provider、会话版本能力。
4. 不要做与本轮安全/工作区/版本/流式稳定性无关的格式化或重构。

执行要求：
1. 先检查 git status，确认当前未提交改动。
2. 每个修复点都要能对应到具体文件和测试/验证。
3. 如果发现某条反馈不属实，必须说明证据，不要盲改。
4. 修改要保持简单、局部、可回滚。
5. 新增测试优先覆盖：cwd 授权、IPC 白名单、会话版本完整恢复、RightPanel 跨项目隔离、CLI JSON 跨 chunk 解析、Provider key 不落 localStorage。

验证命令：
npm test -- --run
npm run build
npm run build:electron
git diff --check

完成后按以下格式汇报：
1. 修改了哪些文件
2. 每个必须修复项如何处理
3. 新增/更新了哪些测试
4. 执行了哪些验证命令及结果
5. 是否仍有未解决问题或需要用户手动验证的内容
```

