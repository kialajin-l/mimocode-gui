# MiMoCode GUI 三方测试汇总与后续修改计划

> 汇总日期：2026-06-14  
> 汇总范围：`docs/reports` 下 3 份 GUI 测试/审查报告  
> 验证方式：静态代码核查 + CLI 帮助验证 + 构建/测试命令复跑  
> 综合评分：58/100  
> 阶段结论：不通过，核心对话与编程工作台方向可保留，但大量入口仍未真实联通

## 1. 汇总结论

三份报告的核心判断一致：项目已经具备 Electron + React 桌面壳、基础对话、模型列表、权限/推理选项、右侧审查/终端/版本等基础能力，但仍处在“界面原型向可用产品过渡”的阶段。

当前最大问题不是构建失败，而是“界面看起来像完整产品，但部分入口是空壳、mock 或仅本地缓存”。这会让用户在使用中产生强烈落差。

必须继续坚持 MiMoCode GUI 的定位：

- 专属编程和工作 GUI，不回退到 WebUI 作为主路径。
- 不恢复 Phase 5 写作工作台。
- 保留 MiMo 特征：Compose / Plan / Build、Dream、Distill，但要明确其真实能力边界。
- 优先补齐编程工作流联通，而不是继续增加展示型 UI。

## 2. 输入报告

| 报告 | 主要结论 | 评分/状态 |
| --- | --- | --- |
| `docs/reports/2026-06-14-mimocode-gui-audit-report.md` | 核心对话可用，但顶部菜单、设置、自动化、斜杠命令、插件真实源缺失 | 62/100 |
| `docs/reports/2026-06-14-mimocode-gui-test-report.md` | 构建和单测全部通过，但自动化测试覆盖严重不足 | CI 绿灯，产品红灯 |
| `docs/reports/MiMoCode-GUI-测试报告.md` | IPC/CLI/Git 基础通道较好，UI 联通性与真实数据源不足 | 52/100 |

## 3. 本次复核命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run build` | 通过 | Vite 构建成功，535 modules；仍有 chunk size 警告 |
| `npm run build:electron` | 通过 | Electron 主进程与 preload TypeScript 编译通过 |
| `npm test -- --run` | 通过 | 4 个测试文件、21 个测试全部通过 |
| `mimo run --help` | 通过 | 确认 `run` 支持 `--model`、`--variant`、`--agent`、`--command`、`--thinking`，无 `--mode` |
| `mimo --help` | 通过 | 确认存在 `mimo plugin <module>`、`mimo mcp`、`mimo agent` 等命令 |
| `mimo session list --format json` | 通过 | 确认 `/continue` 使用的是 MiMo CLI 原生会话列表 |
| `mimo export <sessionId>` | 通过 | 确认原生会话可导出 `info + messages`，可作为 GUI 会话导入/预览数据源 |

## 4. 冲突结论复核

| 争议点 | 报告冲突 | 复核结论 | 证据 |
| --- | --- | --- | --- |
| 终端是否只有单向执行 | 一份报告称“终端执行回显单向”；另一份报告称终端可用 | 终端实时回显已实现，但不支持交互式 stdin、kill 按钮和 cwd 选择 | `electron/main.ts` 发送 `terminal-output`，`electron/preload.ts` 暴露 `onTerminalOutput`，`src/components/Panel/RightPanel.tsx` 注册监听 |
| 消息取消是否缺失 | 一份报告称前端无直观取消按钮 | 取消按钮已存在，但只在 `isRunning` 且主输入栏可见时显示；提前解锁后取消按钮会消失 | `src/components/Chat/MessageInput.tsx` 中 `cancel-button`，`src/App.tsx` 传入 `cancelMessage` |
| 主题入口是否隐藏 | 一份报告称主题入口隐藏 | 主题切换在顶部右侧可见且持久化，不应作为缺失项 | `src/components/Settings/ThemeSwitcher.tsx`，`src/stores/themeStore.ts` |
| 国际化是否完全缺失 | 一份报告称所有 UI 文本无 i18n | i18n 基础存在，但大量新增中文文案仍硬编码；问题应定义为“国际化覆盖不完整” | `src/i18n/zh.json`、`src/i18n/en.json` 存在，`src/App.tsx` 与多个组件仍有硬编码中文 |
| Compose/Plan/Build 是否应传 `--mode` | 报告建议传 `--mode` | CLI 当前无 `--mode` 参数，不能直接按此修；需要设计为 `--agent` / `--command` / prompt contract 映射 | `mimo run --help` 复核无 `--mode`，有 `--agent`、`--command` |
| 插件是否完全无生命周期管理 | 一份报告称插件页无安装/卸载/启停能力 | 本地缓存层已有启停/移除 UI，但缺失真实 CLI/目录扫描、安装和配置落地 | `src/components/Settings/PluginManager.tsx`、`src/stores/pluginStore.ts` |
| `/continue` 会话记录是否等同右侧会话版本 | 用户截图显示 `/continue` 可选择历史 Sessions；右侧“会话版本”也展示历史 | 不等同。`/continue` 是 MiMo CLI 原生全局会话列表；右侧“会话版本”是 GUI 当前会话内手动保存的消息快照。二者相关但语义不同，应放入同一入口下分区展示，不应直接混为一种数据 | `mimo session list --format json` 返回 `id/title/created/updated/directory`；`mimo export <sessionId>` 返回 `info/messages`；`src/components/Panel/VersionHistory.tsx` 只读写 `session.versions` |

## 5. 已达成共识的问题

### P0：必须修复

| 等级 | 问题 | 位置 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P0 | 顶部菜单 4/5 无响应 | `src/App.tsx` 顶部 title-bar | 用户点击“快速对话/文件/编辑/视图”无反馈 | 改为真实菜单、禁用态说明，或隐藏未实现入口 |
| P0 | 设置入口无实现 | `src/App.tsx` 侧边底部 | 用户无法配置模型、默认权限、快捷键、插件目录等 | 新增 Settings 页面/抽屉并接入持久化 |
| P0 | 自动化入口无实现 | `src/App.tsx` 侧边栏 | `WorkflowPanel` 是死代码，点击自动化无效果 | 接入自动化页面；若不能完成执行引擎，至少先提供可运行工作流列表 |
| P0 | `/` 命令菜单缺失 | `src/components/Chat/MessageInput.tsx` | 无法快速调用命令、附件、工作流、模式 | 实现 slash command palette，首批接入会话/文件/插件/终端/工作流命令 |
| P0 | 插件真实源缺失 | `src/stores/pluginStore.ts`、`electron/main.ts` | 插件页只读缓存，不发现 MiMo/OpenCode 真实插件 | 增加 IPC 扫描和 `mimo plugin` 兼容能力 |
| P0 | SideStatusCard 数据 mock | `src/components/Status/SideStatusCard.tsx` | 用户看到的 Context、MCP、Goal、Tasks 等可能不真实 | 接入真实会话、git、mcp、模型统计；无法获取的字段显示“未连接/待接入” |

### P1：建议修复

| 等级 | 问题 | 影响 | 建议 |
| --- | --- | --- | --- |
| P1 | Compose/Plan/Build 仅 prompt 前缀 | 用户可能误以为是 CLI 原生模式 | 先文档化为“GUI 工作模式”，再评估 `--agent` 或 `--command` 映射 |
| P1 | 输入附件按钮未联通 | 用户点击加号无效果 | 接入 `openFile`，调用 `mimo run --file` 或在 prompt 中引用附件 |
| P1 | 顶部导入/导出与文件菜单割裂 | 有图标功能，但菜单无功能 | 统一到 File 菜单，下拉展示导入/导出 |
| P1 | 工作流内容偏英文/偏通用 | 与中文 GUI、MiMo 产品风格不一致 | 中文化并改为编程工作流：审查、修 bug、实现功能、生成测试 |
| P1 | IPC 暴露未用能力 | 增加维护面和攻击面 | 梳理 `readFile`、`gitDiffStat` 等，未接入则移除或补 UI |
| P1 | 测试覆盖不足 | 绿灯不能代表产品可用 | 增加 MessageInput、useSession、cli-bridge、IPC 与关键 UI 点击测试 |

### P2：后续优化

| 等级 | 问题 | 建议 |
| --- | --- | --- |
| P2 | Vite chunk 超 500 kB | 后续通过 route/page dynamic import 拆分插件页、右侧面板、markdown 渲染 |
| P2 | i18n 覆盖不完整 | 当前中文优先可接受，多语言版本前统一抽取硬编码 |
| P2 | WebUIHost 仍残留组件 | 如不再作为主路径，应标记为诊断入口或清理未使用组件 |
| P2 | Electron E2E 缺失 | 引入 Playwright Electron 测试覆盖“建项目 → 发消息 → 接收流 → 审查 diff” |

## 6. 当前能力状态矩阵

| 模块 | 当前状态 | 判定 |
| --- | --- | --- |
| 原生对话 | 可用，支持流式内容、运行状态和取消入口 | 可继续增强 |
| 模型选择 | 从 `mimo models` 获取真实列表 | 基本可用 |
| 推理强度 | 映射为 `mimo run --variant` | 基本可用 |
| 权限控制 | `execute` 映射为 `--dangerously-skip-permissions` | 可用，但需更清晰风险提示 |
| Compose/Plan/Build | GUI prompt contract，非 CLI 原生模式 | 半成品 |
| Dream/Distill | 顶部状态展示，部分读取本地 memory/checkpoint | 半成品 |
| 插件页 | 页面和本地启停/移除 UI 存在 | 半成品，缺真实源 |
| 自动化 | store 和面板存在但未接入入口 | 不可用 |
| 设置 | 按钮存在但无页面 | 不可用 |
| `/` 命令 | 无触发逻辑 | 不可用 |
| 右侧审查 | Diff/接受/拒绝基本可用 | 可用 |
| 终端 | 实时输出可用，非交互式 | 基本可用 |
| 会话版本 | 保存/恢复入口存在 | 基本可用 |
| MiMo 原生会话记录 | CLI 已支持 `session list` 和 `export`，GUI 已有 IPC adapter，但未放入会话版本页 | 半成品，未暴露给用户 |
| 侧边状态卡 | 大量静态/估算数据 | 不可信 |

## 7. 后续修改计划

### Phase A：先消灭空壳入口

目标：所有可点击入口要么可用，要么明确禁用并说明原因。

1. 顶部菜单改造
   - `快速对话`：切回 workbench，并聚焦输入框。
   - `文件`：下拉显示导入会话、导出会话、选择工作区。
   - `编辑`：短期禁用，提示“后续接入撤销/重做/查找”。
   - `视图`：下拉显示侧栏、右侧面板、主题切换。
   - `帮助`：保留快捷键帮助。

2. 设置入口接入
   - 新增 `workspaceView: 'settings'` 或独立抽屉。
   - 首批设置项：主题、语言、默认模型、默认推理强度、默认权限、插件目录、是否显示状态卡。
   - 持久化优先复用 localStorage；涉及文件目录再通过 IPC。

3. 自动化入口接入
   - 将 `WorkflowPanel` 接入主工作区。
   - 中文化预设工作流。
   - 工作流执行调用现有 `sendMessage`，不要新增独立执行引擎。

验收：

- 点击顶部每个菜单都有反馈。
- 点击设置可进入设置页。
- 点击自动化可看到并执行至少一个工作流。
- `npm run build`、`npm test -- --run` 通过。

### Phase B：补齐输入工作流

目标：让底部输入框成为真正的 MiMoCode 操作中枢。

1. 实现 `/` 命令菜单
   - `/new` 新建会话
   - `/file` 附加文件
   - `/plan` 切换 Plan
   - `/build` 切换 Build
   - `/plugins` 打开插件页
   - `/workflow` 打开自动化
   - `/status` 展开状态卡

2. 接入附件按钮
   - 点击加号调用 `openFile`。
   - 将附件路径加入待发送附件列表。
   - 后续 CLI 层支持 `mimo run --file`。

3. 明确模式 contract
   - Compose：帮助组织需求，默认不强调改代码。
   - Plan：要求先输出计划与风险，不直接修改。
   - Build：允许执行实现与验证。
   - 由于 CLI 无 `--mode`，短期继续用 prompt 前缀；中期评估是否映射到 `--agent` 或 `--command`。

验收：

- 输入 `/` 弹出菜单并支持键盘选择。
- 附件按钮能选择文件并在发送前展示。
- 模式切换、模型、推理、权限都能被测试覆盖。

### Phase C：真实插件系统

目标：插件页不再只展示缓存，而是反映 MiMo/OpenCode 真实插件能力。

1. 新增插件 IPC
   - `plugin-list`：扫描配置与插件目录。
   - `plugin-install`：调用 `mimo plugin <module>`。
   - `plugin-enable` / `plugin-disable`：如 CLI 无对应命令，则先维护 GUI 配置层并明确标注。
   - `plugin-remove`：删除 GUI 注册项；真实卸载需确认 CLI 支持后再接。

2. 插件页改造
   - 区分“已发现”“已启用”“GUI 注册”“需要配置”。
   - 配置按钮不能再是空按钮；未实现时禁用。

验收：

- 插件页能显示至少一个真实来源或明确显示扫描路径。
- 本地缓存插件和真实插件来源不混淆。

### Phase C2：会话版本页接入 MiMo 原生会话记录

目标：把 `/continue` 中看到的 MiMo CLI 原生会话列表放到右侧“会话版本”能力附近，让用户能在 GUI 内查看、继续或导入 CLI 历史，但不把它误当作当前 GUI 会话的版本快照。

验证结论：

- `/continue` 显示的是 `mimo session list` 的原生 Sessions。
- `mimo session list --format json` 返回字段包括 `id`、`title`、`created`、`updated`、`projectId`、`directory`。
- `mimo export <sessionId>` 返回 `info + messages`，其中 `info` 包含原生 session 元数据，`messages` 包含消息与 parts。
- 当前右侧 `VersionHistory` 写入的是 `session.versions`，是 GUI 本地当前会话的手动快照。
- 二者不是同一个功能，但都属于“会话历史/恢复”场景，适合放在同一个右侧入口下用子标签区分。

建议设计：

1. 将右侧 tab 文案从“会话版本”扩展为“会话历史”或保持“会话版本”，内部增加二级分区：
   - `当前会话版本`：保留现有手动保存/恢复快照。
   - `MiMo 原生会话`：展示 `mimo session list --format json` 的结果，对应 `/continue` 列表。

2. 在 `MiMo 原生会话` 分区提供三类操作：
   - `预览`：调用 `exportSessionData(sessionId)`，展示 title、directory、created/updated、消息数量与前几条消息摘要。
   - `导入到 GUI`：将 `mimo export` 的 `messages` 转换为 GUI `Session.messages`，创建一个新的 GUI 会话。
   - `继续此会话`：后续通过 `mimo run --session <sessionId>` 或 `--continue` 接入；实现前先禁用并注明“待接入继续执行”。

3. 复用已有 IPC，不重复造桥：
   - `electron/cli-data-adapter.ts` 已有 `fetchSessionList()` 和 `exportSession()`。
   - `electron/main.ts` 已暴露 `fetch-sessions` 与 `export-session-data`。
   - `src/stores/inspectorStore.ts` 已有 `fetchSessions()` 与 `exportSessionDetail()`，但目前只服务 Inspector，需要抽成更通用的 native session store 或由 VersionHistory 直接调用。

4. 数据转换要明确边界：
   - 原生 session `info.title` → GUI `Session.name`。
   - 原生 session `info.directory` → GUI `Session.cwd`。
   - 原生 message `info.role` → GUI `Message.role`。
   - 原生 text part 合并为 GUI `Message.content`。
   - 非 text part 可映射到 GUI `Message.parts`，避免丢失工具调用/元数据。

验收：

- 右侧会话历史可以看到与 `/continue` 基本一致的原生 session 列表。
- GUI 本地“当前会话版本”和 MiMo 原生 sessions 有明显分区，不混淆。
- 用户可以预览一个原生 session。
- 用户可以将一个原生 session 导入为 GUI 会话。
- “继续此会话”若未实现，必须禁用并显示原因；实现时必须确认传递 `mimo run --session <id>` 的行为安全。

### Phase D：状态卡真实化

目标：状态卡只展示真实数据，无法获取时明确写“未连接/待接入”。

1. Context
   - 当前可先保留估算 token，但必须标注“估算”。
   - 成本 `$0.00 spent` 暂时移除或改为“统计待接入”。

2. MCP / LSP
   - MCP 至少通过配置或命令探测真实状态。
   - LSP 未接入前显示“待接入”，不要使用英文占位。

3. Goal / Tasks
   - 不再基于消息数虚构任务。
   - 若没有真实 goal/task 数据，隐藏该区块或显示“当前未设置目标”。

验收：

- 状态卡没有虚构成功态。
- 所有英文占位中文化。
- 状态卡内容能解释数据来源。

### Phase E：测试补强

目标：避免“测试全绿但产品不可用”。

1. P0 单元测试
   - `MessageInput`：模式、模型、推理、权限、`/` 命令。
   - `useSession`：sendMessage 参数、流式 chunk、取消、提前解锁。
   - `pluginStore`：真实扫描结果合并、本地启停。
   - `workflowStore`：启动、推进、停止。

2. IPC 测试
   - `cli-bridge` 参数拼装。
   - `terminal-execute` 输出回流。
   - `git-diff` 越权 cwd 拦截。

3. E2E  smoke
   - 启动应用。
   - 创建项目。
   - 创建会话。
   - 发送消息。
   - 打开右侧面板。
   - 打开插件/设置/自动化。

验收：

- P0 修复同步增加测试。
- `npm test -- --run` 覆盖新增行为。
- 后续若条件允许加入 Electron E2E。

## 8. 推荐执行顺序

1. Phase A：消灭空壳入口。
2. Phase B：补齐输入工作流。
3. Phase C2：会话版本页接入 MiMo 原生会话记录。
4. Phase D：状态卡真实化。
5. Phase C：真实插件系统。
6. Phase E：测试补强贯穿每个阶段同步执行。

不要先做视觉优化或大规模重构。当前产品主要短板是“可点击但不真实”，优先把用户能看见的入口接通。

## 9. 下一轮给执行 Agent 的提示词

```text
你在 E:\code\mimocode-gui 项目中工作。请阅读 docs/reports/2026-06-14-mimocode-gui-consolidated-review-and-plan.md，并按 Phase A 优先修复：

1. 顶部菜单栏不允许再有无响应入口：
   - 快速对话：切回 workbench 并聚焦底部输入框。
   - 文件：实现下拉菜单，接入已有导入会话、导出会话能力；没有 activeSession 时导出置灰。
   - 编辑：短期做禁用态/提示，不要假装可用。
   - 视图：实现下拉菜单，至少能切换右侧面板、插件/工作台视图、主题。
   - 帮助保持现有快捷键面板。

2. 设置入口必须联通：
   - 新增 Settings 页面或抽屉。
   - 首批包含：主题、语言、默认模型、默认推理强度、默认权限、状态卡显示开关。
   - 复用现有 localStorage 偏好，不引入复杂配置系统。

3. 自动化入口必须联通：
   - 接入已有 WorkflowPanel。
   - 中文化 workflow 文案。
   - 点击某个工作流后通过现有 sendMessage 执行，不另建执行引擎。

4. 会话版本页补充 MiMo 原生会话记录：
   - 先确认当前右侧“会话版本”是 GUI 本地快照，不要直接覆盖。
   - 在会话版本页内部增加“MiMo 原生会话”分区或二级 tab。
   - 使用已有 fetchSessions/exportSessionData IPC 显示与 /continue 基本一致的 session list。
   - 支持预览原生 session；支持导入为 GUI 新会话。
   - “继续此会话”如未完成 CLI 联通，必须禁用并标明待接入，不要做假按钮。

5. 保持产品方向：
   - 不恢复 WebUI 作为主路径。
   - 不加入 Phase 5 写作工作台。
   - 保持 MiMoCode GUI 是编程和工作专属桌面。

6. 需要补测试：
   - 顶部菜单/设置/自动化至少添加可点击或状态测试。
   - 会话历史新增 native sessions 的列表/预览/导入测试。
   - 保持 npm run build、npm run build:electron、npm test -- --run 通过。

完成后输出修改清单、测试结果和仍未解决的问题。
```
