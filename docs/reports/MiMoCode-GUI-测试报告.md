# MiMoCode GUI 联通性审查测试报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 被审项目 | MiMoCode GUI (`E:\code\mimocode-gui`) |
| 审查类别 | 全覆盖只读联通性审查 |
| 审查日期 | 2026-06-14 |
| 综合评分 | **52 / 100** |
| 问题总数 | 17 个（高优 7 / 中优 6 / 低优 4） |

---

## 一、审查范围与方法

本次审查对 MiMoCode GUI 项目进行全覆盖只读联通性审查，覆盖以下维度：

- Electron IPC 层（main.ts / preload.ts）
- CLI 桥接（cli-bridge.ts）
- UI 入口（顶部菜单栏、侧边栏、模式控制）
- 插件系统与自动化模块
- 设置页面
- 斜杠命令菜单
- Git diff 审查面板
- 侧边状态卡数据真实性
- WorkbenchOverview 视角正确性
- 构建与测试通过性

审查方法：代码静态分析 + 构建验证（`npm run build` / `build:electron` / `npm test`）。

---

## 二、通过项

| # | 检查项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | Electron IPC 基础架构 | PASS | main.ts / preload.ts 实现完整，20+ IPC handler 全部通过 contextBridge 暴露 |
| 2 | CLI 桥接联通性 | PASS | cli-bridge.ts 通过 `spawn mimo run` 联通，支持 --model、--variant、--dangerously-skip-permissions |
| 3 | 模型列表动态获取 | PASS | 通过 `mimo models` 命令动态获取模型列表 |
| 4 | Git Diff 审查面板 | PASS | git-diff / git-file-diff / git-diff-stat / git-accept / git-reject 五个 IPC handler 完整联通，含 parseDiff 解析 + ConfirmDialog 确认 |
| 5 | WorkbenchOverview 视角 | PASS | 正确使用编程工作台视角，无 WebUI/写作工作台偏移 |
| 6 | 构建（vite build） | PASS | 534 modules 全部构建成功 |
| 7 | TypeScript 编译（electron） | PASS | tsc 编译通过 |
| 8 | 测试套件 | PASS | vitest 4 文件 21 测试全部通过 |

---

## 三、问题清单

### 高优先级（7 项）

| # | 问题 | 位置 | 现状描述 |
|---|------|------|----------|
| H1 | 顶部菜单栏 4/5 项无响应 | App.tsx:192-195 | 快速对话 / 文件 / 编辑 / 视图均为无 onClick 的纯 `<span>` 元素，仅帮助按钮有效 |
| H2 | 侧边栏设置按钮无实现 | App.tsx:256 | `<button>` 无 onClick handler，点击无任何响应 |
| H3 | 侧边栏自动化按钮无实现 | App.tsx:264 | `<button>` 无 onClick handler，点击无任何响应 |
| H4 | 插件目录扫描缺失 | PluginManager.tsx + pluginStore.ts | 仅从 sessions.json 读取缓存数据，不扫描真实 MiMo/OpenCode 插件目录 |
| H5 | 斜杠命令菜单零实现 | 全局 | `rg "slash"` 搜索整个代码库返回空 |
| H6 | 模式仅文本级区分 | MessageInput.tsx:56-57 | Compose/Plan/Build 模式仅以 `Mode: Compose.\n\n` 文本前缀拼入 prompt，未传递给 CLI 做真实行为区分 |
| H7 | 侧边状态卡数据为静态 mock | SideStatusCard.tsx | context limit 硬编码 495990、MCP 硬编码"codegraph 已连接"、LSP 静态文本、Goal 虚构、Tasks 根据消息数虚构 |

### 中优先级（6 项）

| # | 问题 | 说明 |
|---|------|------|
| M1 | 插件页面无安装/卸载/启用/禁用能力 | 仅展示，缺乏生命周期管理 |
| M2 | 自动化模块无触发器配置 | 无计划任务、文件变更监听等触发机制 |
| M3 | 设置页面缺乏持久化 | 无 electron-store 或 config 文件读写逻辑 |
| M4 | 终端执行回显单向 | terminal-execute IPC 只发送命令，不回流实时输出 |
| M5 | 消息取消机制不完整 | cancel-message IPC 存在但前端无直观取消按钮 |
| M6 | 模型切换无视觉反馈 | list-models 返回后 UI 无选中态高亮 |

### 低优先级（4 项）

| # | 问题 | 说明 |
|---|------|------|
| L1 | 主题切换入口隐藏 | 仅通过设置页可达，无快捷入口 |
| L2 | 窗口控制快捷键文档缺失 | min/max/close 的 IPC 存在但无键盘快捷键说明 |
| L3 | Git 操作错误处理笼统 | 所有 git IPC 共用统一错误提示，缺乏分类 |
| L4 | 国际化字符串硬编码 | 所有 UI 文本无 i18n 抽象层 |

---

## 四、评分明细

| 维度 | 满分 | 得分 | 说明 |
|------|------|------|------|
| Electron IPC | 15 | 12 | IPC 架构完整但缺乏部分能力（终端回显、模式区分） |
| CLI 桥接 | 10 | 8 | 基础联通良好，模式参数未传递 |
| UI 入口完备性 | 15 | 3 | 5 项菜单仅 1 项可用，设置/自动化无入口 |
| 插件系统 | 10 | 2 | 仅静态展示，无目录扫描和管理 |
| 自动化模块 | 10 | 2 | 无触发器和执行引擎 |
| 斜杠命令 | 10 | 0 | 零实现 |
| 状态卡数据 | 10 | 2 | 大量 mock 数据 |
| Git 面板 | 10 | 9 | 完整联通，错误处理可优化 |
| 构建与测试 | 10 | 10 | 构建和测试全部通过 |
| 代码质量 | 0 | 4 | 额外加分：清晰的 IPC 分层和 TypeScript 类型定义 |
| **总计** | **100** | **52** | |

---

## 五、高优修复建议

1. **顶部菜单栏**：为快速对话 / 文件 / 编辑 / 视图四项添加 onClick handler，至少实现基础的页面导航或下拉菜单
2. **侧边栏设置/自动化**：为设置按钮挂载设置页面路由，为自动化按钮挂载自动化面板路由
3. **插件目录扫描**：在 PluginManager 中增加真实文件系统扫描逻辑，替换 sessions.json 静态读取
4. **斜杠命令菜单**：实现 `/` 输入触发弹窗，列出可用命令并支持 keydown 选择
5. **模式区分**：将 Compose/Plan/Build 模式通过 --mode 参数传递给 CLI，而非仅文本前缀
6. **状态卡数据接入**：将 context limit、MCP 状态、LSP 状态、Goal、Tasks 接入真实数据源

---

## 六、结论

MiMoCode GUI 项目在 Electron IPC 基础架构、CLI 桥接、Git Diff 审查面板三个核心通道上实现扎实，构建与测试质量良好。但 UI 入口完备性、插件/自动化/设置三大模块存在大量空壳或 mock 实现，斜杠命令完全缺失，导致综合可用度偏低。建议优先修复 7 项高优问题，预期可将综合评分提升至 75+ 分。
