# 代码审查报告

> 审查日期：2026-06-14
> 审查范围：MiMoCode GUI 整体联通性 + 代码质量
> 代码行数：11,932 行（含 CSS），6,777 行（纯 TS/TSX），69 个源文件
> 测试结果：54/54 通过（8 个测试文件）

综合评分：62/100
审查阶段：功能完成阶段（界面壳 + 部分联通）
问题总数：14 个（高危 4 个，中危 6 个，建议 4 个）

---

## 问题详情（按优先级排序）

| 等级 | 位置 | 问题描述 | 修复建议 |
|------|------|---------|---------|
| 高危 | `SideStatusCard.tsx:33` | `catch {}` 空 catch 吞掉 MCP 配置解析异常，且 `readFile` 路径拼接 `${mimoPath}/mcp.json` 可读任意文件 | 添加最小日志 `console.warn`；`readFile` 路径需经 `validateFilePath` 校验 |
| 高危 | `SearchBar.tsx:101` | `dangerouslySetInnerHTML={{ __html: highlightMatch(...) }}` 对 session.name 做 HTML 注入，`highlightMatch` 虽转义了正则特殊字符，但未转义 HTML 实体（如 `<script>`） | `highlightMatch` 返回前对原始文本做 HTML entity 转义（`&lt;` `&amp;`），再插入 `<mark>` 标签 |
| 高危 | `cli-bridge.ts:79-88` | `Compose/Plan/Build` mode 仅作为 prompt 文本前缀 `Mode: Compose.`，未映射到任何 CLI 行为差异；用户切换 mode 后实际执行完全相同 | 短期保留 prompt 前缀 + UI 状态展示；中期跑 `mimo run --help` 确认是否有 `--agent` 或子命令映射，否则在 main 端按 mode 差异化 spawn 参数 |
| 高危 | `plugin-scanner.ts:15` | 插件扫描目录包含 `~/.codex/plugins`（Codex 残留路径），且 `enabled: true` 硬编码，所有发现插件默认启用 | 改为 `~/.mimo/plugins`；`enabled` 默认 `false`，由用户手动启用 |
| 中危 | `App.tsx:52,61,71` | 3 处 `as any` 绕过类型检查，`workspaceView` 状态用 `string` 而非联合类型 | 定义 `type WorkspaceView = 'workbench' \| 'plugins' \| 'settings' \| 'automation'`，消除 `as any` |
| 中危 | `runtimeStore.ts:34,59,73` | 3 处 `(window as any).electronAPI` 绕过类型安全，应使用 `window.electronAPI` | 改为 `window.electronAPI!` 或添加 null guard，利用已有的 `electron.d.ts` 类型声明 |
| 中危 | `settingsStore.ts:1-50` | 设置仅存 `localStorage`，不经过 Electron IPC 持久化，窗口清除缓存后丢失 | main 端新增 `settings-get/settings-set` IPC 写入 `userData/settings.json`，preload 暴露对应 API |
| 中危 | `SideStatusCard.tsx:16` | `contextLimit = 495_990` 魔法数字，token 估算用 `content.length / 3.6` 启发式，与真实 context 无关 | 改为从 CLI 或 session 元数据获取；或标注 `(估算)` 并提取为命名常量 |
| 中危 | `MessageInput.tsx:120-128` | `handleSend` 将 mode 拼为 `Mode: Compose.\n\n` 前缀，附件拼为 `附件: filename\n\n`，均作为纯文本混入 prompt，CLI 无法结构化解析 | 改为 JSON 前缀或 CLI `--mode` 参数（需确认 CLI 支持），或至少统一为 `---\nmode: compose\n---\n` 格式 |
| 中危 | `PluginManager.tsx:148` | 插件"配置"按钮无 `onClick`，点击无效果 | 联通插件 schema 读取弹窗，或标注"暂未实现"并 `disabled` |
| 建议 | `sessionStore.test.ts` + `__tests__/sessionStore.test.ts` | 两个文件测试 `sessionStore` 同一模块，存在 5+8=13 个用例的重复覆盖 | 合并为一个文件，删除 `src/stores/sessionStore.test.ts` |
| 建议 | 全项目 69 个文件 | 内联 SVG 图标在 15+ 个组件中重复出现（关闭图标、加号图标等），无复用 | 提取 `src/components/Icon/` 组件库或使用 SVG sprite |
| 建议 | `App.css` 939 kB 单 chunk | Vite 构建警告主 chunk 939.87 kB > 500 kB | 配置 `build.rollupOptions.output.manualChunks` 拆分 `highlight.js` / `react-markdown` |
| 建议 | `pluginStore.ts:75` | `scanPlugins` 返回的 `result.plugins` 用 `p: any` 映射，丢失类型安全 | 定义 `ScannedPluginRaw` 接口或复用 `electron.d.ts` 已有声明 |

---

## 清单检查结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 代码风格 | ✅ 符合规范 | 统一 2 空格缩进，React 函数式组件 |
| 命名规范 | ⚠️ 基本符合 | Zustand store 用 `useXxxStore`，组件 PascalCase；但 `as any` 3 处绕过类型 |
| 边界处理 | ❌ 不完整 | `SideStatusCard.tsx:33` 空 catch；`SearchBar.tsx:101` XSS 风险；`plugin-scanner.ts:54` enabled 硬编码 |
| 错误处理 | ⚠️ 部分缺失 | 主进程 IPC 有 try/catch + 错误返回；渲染层 `catch {}` 空 2 处；electron 层空 catch 6 处 |
| 算法复杂度 | ✅ 合理 | 无 O(n²) 热路径；搜索用 `Array.filter` 限 20 条 |
| 资源泄漏 | ✅ 无严重泄漏 | `SearchBar` / `App` 的 `useEffect` 正确清理 listener；`SlashCommandMenu` 在 unmount 时移除 keydown |
| 输入验证 | ⚠️ 部分缺失 | `security-ipc.ts` 有路径/命令校验；但 `SearchBar.highlightMatch` 未转义 HTML；`readFile` 路径未校验 |
| 敏感信息 | ✅ 无泄露 | 无硬编码密钥/密码；JWT 不适用 |
| 单元测试覆盖 | ⚠️ 约 30% | 8 个测试文件 54 用例，仅覆盖 store 层 + diffParser + MessageInput 偏好；IPC/CLI/组件行为 0 覆盖 |
| 测试通过率 | ✅ 100% | 54/54 全通过 |
| 文档同步 | ❌ 未同步 | `electron.d.ts` 缺 `scanPlugins/installPlugin` 类型声明；i18n 缺新增菜单项翻译 |
| 产品偏移 | ✅ 无偏移 | 无写作工作台入口；WebUI 仅作兼容入口；Compose/Plan/Build 定位编程模式 |

---

## 入口联通矩阵

| 区域 | 功能入口 | 状态 | 证据 | 说明 |
|------|---------|------|------|------|
| 顶部栏 | 快速对话 | ✅ | `App.tsx:258-262` | `handleQuickChat` 聚焦输入框 |
| 顶部栏 | 文件 | ✅ | `App.tsx:264-293` | 下拉菜单：导出/导入/退出 |
| 顶部栏 | 编辑 | ⚠️ | `App.tsx:294-312` | 下拉菜单：undo/redo 标注"后续接入"禁用；find 可用 |
| 顶部栏 | 视图 | ✅ | `App.tsx:313-341` | 下拉菜单：切换面板/主题/插件管理 |
| 顶部栏 | 帮助 | ✅ | `App.tsx:342-347` | 打开快捷键帮助 |
| 侧边栏 | 搜索 | ✅ | `App.tsx:385` | `Ctrl+K` + 点击 |
| 侧边栏 | 插件 | ✅ | `App.tsx:391-399` | 切换到 PluginManager |
| 侧边栏 | 自动化 | ✅ | `App.tsx:400-408` | 切换到 WorkflowPanel |
| 侧边栏 | 设置 | ✅ | `App.tsx:413-421` | 切换到 SettingsPage |
| 侧边栏 | 返回/前进 | ✅ | `App.tsx:375-381` | `goBack/goForward` 导航历史 |
| 输入框 | 模型选择 | ✅ | `MessageInput.tsx:63-72` | `api.listModels()` → `mimo models` |
| 输入框 | 推理强度 | ⚠️ | `cli-bridge.ts:83-85` | 传 `--variant`，未验证 CLI 是否支持 |
| 输入框 | 权限 | ⚠️ | `cli-bridge.ts:86-88` | 仅 `execute` 传 `--dangerously-skip-permissions` |
| 输入框 | Compose/Plan/Build | ⚠️ | `MessageInput.tsx:120-121` | 仅 prompt 前缀，无 CLI 行为差异 |
| 输入框 | `/` 命令 | ✅ | `SlashCommandMenu.tsx:1-89` | 7 个内置命令，键盘导航 |
| 输入框 | 附件 | ✅ | `MessageInput.tsx:108-116` | `api.openFile()` 选择文件 |
| 插件页 | 扫描/安装 | ✅ | `pluginStore.ts:68-108` + `plugin-scanner.ts` | IPC `plugin-list-scan` + `plugin-install` |
| 插件页 | 配置按钮 | ❌ | `PluginManager.tsx:148` | 无 `onClick` |
| 设置页 | 主题/语言/默认值 | ✅ | `SettingsPage.tsx:1-157` | 联通 `settingsStore` |
| 设置页 | mimo 路径配置 | ❌ | `SettingsPage.tsx` | 无 mimo 路径设置项 |
| 状态卡 | MCP | ⚠️ | `SideStatusCard.tsx:19-38` | 尝试读 `mcp.json`，但路径拼接不安全 |
| 状态卡 | LSP/Goal/Tasks | ❌ | `SideStatusCard.tsx:75-88` | 写死"待接入"/"当前未设置目标" |
| 工作台 | Dream/Distill | ✅ | `WorkbenchOverview.tsx:18-32` | `inspectorStore` 读真实 memory/checkpoint |
| 右栏 | 审查/终端 | ✅ | `RightPanel.tsx` | git diff + terminal IPC |
| 右栏 | 检查器 | ⚠️ | `InspectorPanel.tsx` | ContextTab 读真实数据；ChangesTab/ReviewTab 无数据源 |

---

## 阶段结论

⚠️ **有条件通过** — 存在 4 个高危问题未修复：

1. **XSS 风险**（`SearchBar.tsx:101`）— 可被 session 名称注入
2. **路径拼接不安全**（`SideStatusCard.tsx:26`）— `readFile` 可读任意文件
3. **Compose/Plan/Build 无真实行为差异** — 用户切换 mode 无实际效果
4. **插件扫描 Codex 残留路径 + 默认启用** — 产品定位偏移 + 安全风险

修复 4 个高危问题后可重新提交审查。6 个中危问题建议在下一迭代修复。

---

## 构建与测试验证

| 项目 | 结果 |
|------|------|
| `npm run build` | ✅ 通过（534 modules, 3.23s） |
| `npm run build:electron` | ✅ 通过 |
| `npm test -- --run` | ✅ 54/54 通过（8 个测试文件） |

---

## 关联文档

- [2026-06-14-mimocode-gui-test-report.md](../reports/2026-06-14-mimocode-gui-test-report.md) — 测试报告
- [2026-06-14-mimocode-gui-audit-report.md](./compose/specs/2026-06-14-mimocode-gui-audit-report.md) — 首次联通审查
- [2026-06-13-codex-like-mimo-workbench-design.md](../superpowers/specs/2026-06-13-codex-like-mimo-workbench-design.md) — 设计规范
