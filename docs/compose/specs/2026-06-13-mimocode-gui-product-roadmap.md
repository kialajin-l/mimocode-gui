# MiMoCode GUI 产品路线规划设计

> 日期: 2026-06-13  
> 状态: 修订版 v2  
> 适用范围: MiMoCode GUI 后续产品、架构、UI 改造路线  
> 参考来源: 当前 `mimocode-gui` 代码审查、MiMo Code 源码能力梳理、本机 MiMo 能力摸底反馈

## 1. 背景与修订结论

当前 `mimocode-gui` 已具备 Electron + React + Zustand 的桌面应用雏形，包括会话列表、聊天区、右侧审查面板、主题切换、终端面板和基础 MiMo CLI 调用。但当前实现本质上仍是一个包装 `mimo run` 的聊天壳，无法充分承接 MiMo Code / OpenCode 的完整交互能力。

初版路线曾假设 `mimo serve` 提供可外部调用的 REST API、SDK 和 event stream。摸底后需要修正：`mimo serve` 实际提供的是 OpenCode Web UI SPA，所有路径返回同一个前端 HTML；结构化事件和 bus 系统存在于内部，但未作为稳定外部 REST/event API 暴露。因此，路线不能再以"自研 `mimoClient` 对接 REST/SDK"作为主线。

修订后的现实路线是：

1. 保留 Phase 0 稳定性修复，先解决当前 GUI 的高危问题。
2. 将安全 IPC 收敛纳入 Phase 0，不等到 Web UI 嵌入后再处理。
3. 以嵌入 OpenCode Web UI 作为主交互路径，快速获得成熟的 session、tool、diff、terminal、theme 等体验。
4. 继续摸底 `mimo acp`。如果 ACP 可用，用它获取结构化事件和控制能力。
5. 如果 ACP 不可用，则通过 `mimo export`、`mimo session list --format json`、SQLite 和 memory 文件轮询，为右侧定制面板提供数据。
6. 将 GUI 的差异化价值放在 OpenCode Web UI 未覆盖或不适合覆盖的部分：定制审查面板、项目上下文管理、本地窗口体验和项目启动器。

## 2. 产品定位

MiMoCode GUI 不应重复实现 OpenCode Web UI 已经做好的完整交互，也不应停留在简单 CLI stdout wrapper。它的定位应调整为：

> 一个面向 MiMo/OpenCode 的编程桌面工作台：主交互区复用成熟 Web UI，侧边和右侧面板承载本项目专属的审查、上下文管理和本地桌面能力。

核心用户：

- **开发者**：使用 MiMo 完成代码阅读、修改、命令执行、diff 审查和长期任务。
- **项目维护者**：管理项目上下文、memory、checkpoint、task，跟踪长期变更。
- **技术工作流用户**：使用自动化工作流、插件系统、Git 集成提升开发效率。

## 3. 已确认事实

本路线基于以下摸底结果：

- MiMo 基于 OpenCode 构建。
- `mimo serve` 暴露的是 OpenCode Web UI SPA，而不是稳定公开 REST API。
- 内部存在 `session.updated`、`message.part.updated`、`session.diff` 等事件，但未确认可被外部 GUI 直接订阅。
- 数据库位于用户目录下的 MiMo/OpenCode SQLite 存储。
- memory、checkpoint、task 等长期上下文落地到用户目录下的 memory 相关文件。
- Web UI 已包含成熟的 session 管理、tool call 展示、diff 查看、文件树、终端和主题能力。
- 当前仍需摸底 `mimo acp` 是否能作为结构化控制协议。

## 4. 设计原则

### 4.1 先复用成熟 Web UI

OpenCode Web UI 已经覆盖大量桌面工作台能力。GUI 不应在第一阶段重写这些功能，而应先通过 Electron webview/iframe 嵌入，并把开发资源集中在本地集成、安全边界和定制面板上。

### 4.2 不假设不存在的 API

所有 runtime 集成都必须基于实际可用接口：ACP、CLI 子命令、export JSON、SQLite、memory 文件。未验证前，不再规划 REST SDK/event stream 主路线。

### 4.3 GUI 本地 store 只保存 UI 偏好

业务数据应优先由 MiMo/OpenCode 管理。GUI 本地保存 recent projects、layout、theme、window state、面板偏好等，不再自建完整 session 数据源。

### 4.4 安全 IPC 优先

当前 preload 暴露了任意文件读取、任意命令执行和直接 Git checkout 风险。该问题必须在 Phase 0 收敛，不能等到 Web UI 嵌入后再处理。嵌入的 Web UI 不应能访问外层 `window.electronAPI` 的高危能力。

### 4.5 技术工作流差异化

GUI 的差异化价值在于 OpenCode Web UI 未覆盖的能力：Git 状态/diff/review inspector、项目上下文管理、本地桌面体验、工作流自动化和项目启动器。

## 5. 目标场景

### 5.1 开发场景

1. 用户从桌面 GUI 打开项目。
2. GUI 启动或连接 `mimo serve`，主区域显示 OpenCode Web UI。
3. 用户在 Web UI 中完成会话、工具调用、diff 查看和终端操作。
4. GUI 右侧面板显示定制审查信息、Git 状态、当前项目上下文。
5. 高风险本地操作通过 GUI 的安全 IPC 和确认流执行。

### 5.2 项目维护场景

1. 用户打开已有项目，GUI 自动加载项目上下文（memory、checkpoint、task）。
2. 右侧面板显示项目健康状态、待处理变更、最近活动摘要。
3. 用户通过 Inspector 查看和管理项目上下文。
4. 自动化工作流辅助代码审查、bug 修复、文档更新等重复任务。

## 6. 推荐架构

### 6.1 现实架构

```text
Electron Main
  ├─ MiMo Process Manager
  │   ├─ discover mimo binary
  │   ├─ spawn/stop mimo serve
  │   ├─ detect Web UI URL
  │   └─ health/status detection
  ├─ ACP Adapter (pending validation)
  │   ├─ start mimo acp
  │   ├─ parse protocol messages
  │   └─ expose structured events if available
  ├─ CLI Data Adapter
  │   ├─ mimo session list --format json
  │   ├─ mimo export <sessionID>
  │   └─ optional command probes
  ├─ Local Data Adapter
  │   ├─ SQLite read-only queries where safe
  │   ├─ memory/checkpoint/task file reads
  │   └─ project metadata scans
  ├─ Safe IPC Surface (Phase 0)
  │   ├─ workspace.open
  │   ├─ runtime.start/stop/status
  │   ├─ webview.url
  │   ├─ context.read
  │   ├─ changes.review
  │   └─ settings.get/set
  └─ GUI Settings Store
      ├─ recent projects
      ├─ layout state
      ├─ theme preference
      └─ window preferences

Renderer
  ├─ App Shell
  ├─ Project Sidebar
  ├─ Embedded OpenCode Web UI
  ├─ Right Inspector
  │   └─ Changes / Context / Review / Terminal
  └─ Settings / Diagnostics
```

### 6.2 数据职责

MiMo/OpenCode 负责：

- session、message、tool、diff、terminal、provider、model、MCP、memory、task、checkpoint。

GUI 负责：

- 启动和承载 Web UI。
- 本地项目入口和窗口体验。
- 安全 IPC。
- 定制 inspector 数据整合。
- 项目上下文管理。

## 7. 路线分支

### 路线 A: ACP 可用

如果 `mimo acp` 能提供结构化事件、session 控制或 prompt 接口，则采用：

```text
Embedded Web UI + ACP structured events + GUI inspector panels
```

适合实现：

- 当前会话状态。
- 工具调用事件。
- permission / diff / task 状态同步。
- 更实时的右侧面板。

### 路线 B: ACP 不可用

如果 ACP 不适合外部 GUI，则采用：

```text
Embedded Web UI + CLI export/session list + SQLite/memory read-only polling
```

适合实现：

- 会话列表和历史摘要。
- 最近 session export 后的消息/工具信息展示。
- memory、checkpoint、task 文件视图。

路线 B 实时性较弱，但实现风险更低。

## 8. 功能路线

### Phase 0: 稳定性修复 ✅ 已完成

目标：先消除当前 GUI 会导致核心工作流错误、数据丢失或本机安全风险的问题。

范围：

- 修复发送消息未传 `activeSession.cwd` 的问题。
- 修复插件保存覆盖 session 数据的问题。
- 收敛或暂时禁用任意 `read-file`、任意 `terminal-execute`、直接 `git checkout` 这类高风险 IPC。
- 如果短期必须保留相关能力，至少增加 cwd 校验、路径归一化、项目目录边界检查和 destructive 操作确认。
- 确保嵌入 Web UI 的页面无法直接访问外层高危 IPC。
- 增加最小可运行测试脚本，覆盖 cwd、持久化、session store 和 IPC 参数校验。

验收标准：

- `npm run build` 和 `npm run build:electron` 通过。
- 新增测试脚本可运行。
- 新建 session 后，MiMo 在用户选择的 cwd 下执行。
- 保存 plugin 或 UI 设置不会覆盖 session 数据。
- Renderer 不能直接触发任意文件读取、任意 shell 命令或未确认的 Git 回滚。

### Phase 1: Web UI 嵌入 MVP 与 ACP 摸底 ✅ 已完成

目标：把主交互区切换为成熟的 OpenCode Web UI，而不是继续复制完整聊天工作台。

范围：

- 实现 `mimo serve` 启动、停止、健康状态和日志展示。
- 从 serve 输出或配置中获取 Web UI URL。
- 在 Electron 中嵌入 Web UI。
- 增加连接失败、端口占用、MiMo 未安装、启动超时的诊断 UI。
- 保留当前 React shell 的左侧项目入口和右侧 inspector 容器。
- 并行运行并记录 `mimo acp --help`、启动方式、协议输出。
- 验证 ACP 是否能获取 session、message、tool、permission、diff 或 prompt 事件。

验收标准：

- 用户可以从 GUI 打开项目并进入嵌入的 MiMo/OpenCode Web UI。
- Web UI 可完成基本会话交互。
- GUI 能清晰显示 MiMo runtime 状态。
- 文档化 ACP 是否可用于后续 inspector 数据源。

### Phase 2: 数据适配决策 ✅ 已完成

目标：决定右侧定制面板的数据来源。

范围：

- 如果 ACP 可用，建立 `acpAdapter`。
- 如果 ACP 不可用，建立 `cliDataAdapter` 和 read-only `localDataAdapter`。
- 评估是否复用 `E:/code/codex-workflow/src/executor.ts` 中的进程管理、结构化输出解析或状态持久化经验，避免从零实现同类基础设施。

验收标准：

- 文档化选择路线 A 或路线 B。
- 右侧 inspector 至少能显示当前项目的 session 或 memory 基础信息。

### Phase 3: 精简右侧 Inspector ✅ 已完成

目标：围绕嵌入 Web UI 做一个最小可用的增量 inspector，而不是重写主交互或一次性实现全部面板。

实现范围（代码模式）：

- `Changes`：当前 Git 状态、diff 摘要、审查入口。
- `Context`：memory、checkpoint、tasks、attached/project files 摘要。
- `Review`：本地 review checklist、风险项、待处理变更。

验收标准：

- 用户能在主 Web UI 之外看到一个项目专属上下文闭环。
- 右侧面板不阻塞 Web UI 使用。
- 未实现的 inspector tab 不显示为可用功能。

### Phase 4: 安全审查与本地操作深化 ✅ 已完成

目标：在 Phase 0 已完成高危 IPC 收敛的基础上，将本地审查和写操作做成明确、可确认、可审计的产品能力。

范围：

- Changes 面板提供明确的 accept/reject 操作边界。
- reject 操作必须确认，并显示影响文件。
- 文件读取只允许用户选择或项目目录内受控路径。
- 操作日志记录本地写操作来源和结果。

验收标准：

- Renderer 无法直接传入任意路径执行 destructive 操作。
- 所有本地写操作都有明确来源和用户动作。

### Phase 5: 已暂停 ⏸️

> **状态：暂停，不进入当前产品路线。**

原计划为"写作工作台深化"，包括章节树、角色数据库、世界观设定、写作一致性检查等。经产品方向修订，这些功能与编程桌面工作台定位不符，已从路线图中移除。

**替代方向（待评估，不承诺实现）：**

- Project Workflow Workbench：项目级工作流编排和自动化。
- Code Review Automation：AI 辅助代码审查流程。
- Task/Memory Inspector：项目任务和 memory 的深度查看。
- GitHub/CI Integration：与 GitHub Issues、PR、CI 状态集成。
- Local Runtime Diagnostics：本地运行时状态监控和诊断。

这些方向需要独立评估 ROI，不在当前 Phase 5 范围内承诺。

## 9. UI 方向

### 9.1 App Shell

保留桌面应用壳：左侧项目入口，中间嵌入 Web UI，右侧定制 inspector。避免重新实现 Web UI 已有的完整聊天区、工具调用区和 diff 区。

### 9.2 左侧 Sidebar

- 最近项目。
- runtime 状态。
- 快速打开项目。
- 诊断入口。

### 9.3 中间主区域

主区域优先显示 OpenCode Web UI。后续只有在 ACP 提供足够数据且确有必要时，才考虑自研主交互 timeline。

### 9.4 右侧 Inspector

右侧是 GUI 的差异化区域。专注于代码审查、项目上下文和运行时状态。

### 9.5 视觉语言

视觉仍应靠近 Codex Desktop：紧凑、克制、低装饰、低饱和、清晰边框和稳定布局。不要做营销式首页，也不要把 Web UI 外再包一层厚重装饰。

## 10. 技术实施建议

### 10.1 推荐模块

```text
electron/
  mimo-process.ts       # discover/start/stop mimo serve
  acp-adapter.ts        # pending validation
  cli-data-adapter.ts   # session list/export and command probes
  local-data-adapter.ts # read-only SQLite/memory/checkpoint readers
  safe-ipc.ts           # narrow IPC handlers
  settings-store.ts     # GUI-only preferences

src/
  components/WebUiHost/
  components/Inspector/
  stores/workspaceStore.ts
  stores/runtimeStore.ts
  stores/uiPreferenceStore.ts
```

### 10.2 不再推荐的模块

以下初版设想暂不作为主路线：

- `mimo-client.ts` 作为 REST/SDK wrapper。
- 自研完整 transcript timeline。
- 自研 provider/model/MCP 管理主界面。
- 自建 session 数据库替代 MiMo/OpenCode。

除非 ACP 后续证明足够稳定，否则这些都应延后。

### 10.3 可复用资产评估

在实现 `mimo-process.ts`、`cli-data-adapter.ts` 或 `acp-adapter.ts` 前，应评估 `E:/code/codex-workflow/src/executor.ts` 是否能复用以下设计或代码：

- 子进程启动、停止、超时和日志收集。
- 结构化输出解析。
- 执行状态持久化。
- 错误分类和恢复策略。

复用原则：只复用能降低复杂度且接口清晰的部分。不要为了复用而引入 `codex-workflow` 的完整编排模型。

### 10.4 测试策略

优先补以下测试：

- cwd 传递。
- 持久化不会互相覆盖。
- safe IPC 参数校验。
- MiMo process 启动失败和超时处理。
- Web UI URL 解析。
- inspector 数据适配器的解析逻辑。

## 11. 工作量约束

完整复制 Codex Desktop / OpenCode Web UI 是团队级工作，不适合作为单人短期路线。当前路线应按薄片交付：

| 阶段      | 现实工作量 | 说明                                     |
| ------- | ----- | -------------------------------------- |
| Phase 0 | 1-2 天 | 修复当前高危问题                               |
| Phase 1 | 2-4 天 | 嵌入 Web UI、runtime 状态，并行摸底 ACP          |
| Phase 2 | 1-2 天 | ACP/CLI/SQLite 数据路线确认和复用评估             |
| Phase 3 | 3-7 天 | 代码模式 inspector（Changes/Context/Review） |
| Phase 4 | 2-3 天 | 安全加固和本地操作确认流                           |
| Phase 5 | —     | 已暂停                                    |

任何超过一周的阶段都应拆成更小的 spec 和 plan。

## 12. 风险与缓解

| 风险                             | 影响               | 缓解                                                       |
| ------------------------------ | ---------------- | -------------------------------------------------------- |
| iframe/webview 被认为只是薄皮 wrapper | 产品差异化不足          | 将差异化放在审查 inspector 和本地桌面能力，而不是重写 Web UI                  |
| ACP 不可用                        | 无法实时获取结构化事件      | 使用 CLI export、session list、SQLite 和 memory 文件作为 fallback |
| 直接读 SQLite 破坏数据                | 数据损坏             | 只读访问，不写库；写操作优先通过 MiMo CLI/Web UI                         |
| Web UI 与外层 GUI 状态不同步           | UX 混乱            | 外层只显示辅助面板，不抢主流程控制权                                       |
| IPC 权限过宽                       | 本机命令执行、文件泄露、误删修改 | Phase 0 完成安全 IPC 收敛、路径校验和确认流                             |
| 过早自研完整主交互                      | 返工大、进度失控         | 主交互先嵌入 Web UI，后续按 ACP 能力决定是否替换                           |

## 13. 里程碑建议

### M0: 当前版本稳定 ✅

输出：修复 cwd、持久化覆盖、IPC 过宽和测试脚本。

### M1: Embedded Web UI MVP ✅

输出：GUI 能启动/连接 `mimo serve` 并嵌入 OpenCode Web UI，同时完成 ACP 能力摸底记录。

### M2: Data Adapter Decision ✅

输出：确认 ACP 可用性；如果不可用，完成 CLI/SQLite/memory read-only 数据方案，并完成 `codex-workflow` executor 复用评估。

### M3: Inspector MVP ✅

输出：代码模式 inspector 可用（Changes/Context/Review）。

### M4: 待定

根据 Phase 5 候选方向的 ROI 评估结果决定。

## 14. 非目标

短期内不做：

- 重写 OpenCode Web UI 已经成熟的主聊天体验。
- 假设存在公开 REST API 并围绕它做大规模重构。
- 自建完整 session 数据库。
- 自建独立 plugin/provider/MCP 管理系统。
- 在未收敛 IPC 前开放任意 shell、任意文件读取、任意 Git 回滚。
- 第一轮实现 Codex Desktop 级别完整三栏工作台。
- 写作工作台功能（章节、角色、世界观等）。

## 15. 下一步建议

建议按以下顺序推进：

1. 执行 Phase 0，修复当前高危问题。
2. 在 Phase 0 内完成安全 IPC 收敛，确保嵌入 Web UI 前 renderer 没有裸高危能力。
3. 实现 `mimo serve` 启动和 Web UI 嵌入，同时跑 `mimo acp --help` 并记录 ACP 能力。
4. 根据 ACP 结果选择数据适配路线，并评估 `codex-workflow` executor 是否可复用。
5. 实现代码模式 inspector（Changes/Context/Review）。

这样可以避免在不成立的 REST/SDK 假设上继续投入，同时利用 MiMo/OpenCode 已有 Web UI，把开发资源留给真正有差异化价值的桌面和技术工作流能力。

---

*文档修订完成 — 产品定位聚焦编程与技术工作项目，写作工作台已暂停。*
