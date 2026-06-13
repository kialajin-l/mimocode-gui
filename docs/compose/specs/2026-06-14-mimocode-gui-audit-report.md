# MiMoCode GUI 整体联通审查报告

> 审查日期：2026-06-14  
> 审查阶段：界面联通性检查  
> 综合评分：62/100  
> 问题总数：15 个（高危 2 个，中危 6 个，建议 7 个）

---

## 1. 总体结论

**是否可作为主力 GUI 使用：** 否。核心对话联通，但大量入口为空壳或半成品，无法满足日常编程工作流需求。

**最大阻塞点：** 顶部菜单多数无功能、设置页面不存在、自动化无效果、`/` 命令无菜单。

**是否存在 WebUI/写作工作台偏移：** 否。写作工作台已完全移除，产品定位聚焦编程/技术工作流。

---

## 2. 构建与测试验证

| 项目 | 结果 |
|------|------|
| `npm run build` | ✅ 通过（534 modules, 2.23s） |
| `npm run build:electron` | ✅ 通过 |
| `npm test -- --run` | ✅ 21/21 通过（4 个测试文件） |

---

## 3. 入口联通矩阵

| 区域 | 功能入口 | 状态 | 证据位置 | 问题说明 |
|------|---------|------|---------|---------|
| 顶部栏 | 快速对话 | ❌ | App.tsx:191 | 纯 span，无 onClick |
| 顶部栏 | 文件 | ❌ | App.tsx:192 | 纯 span，无 onClick |
| 顶部栏 | 编辑 | ❌ | App.tsx:193 | 纯 span，无 onClick |
| 顶部栏 | 视图 | ❌ | App.tsx:194 | 纯 span，无 onClick |
| 顶部栏 | 帮助 | ✅ | App.tsx:197 | 打开快捷键帮助面板 |
| 侧边栏 | 搜索 | ✅ | App.tsx:238 | 打开全局搜索 |
| 侧边栏 | 插件 | ⚠️ | pluginStore.ts:43-58 | 读 localStorage，无真实插件目录扫描 |
| 侧边栏 | 自动化 | ❌ | App.tsx:253 | 无 onClick，死按钮 |
| 侧边栏 | 设置 | ❌ | App.tsx:264 | 无 onClick，无设置页面 |
| 输入框 | 模型选择 | ✅ | MessageInput.tsx:56 | 从 CLI 获取真实模型列表 |
| 输入框 | 权限控制 | ✅ | MessageInput.tsx:66 | 传递给 CLI |
| 输入框 | Compose/Plan/Build | ⚠️ | MessageInput.tsx:68 | 作为 prompt 前缀，非独立模式 |
| 输入框 | `/` 命令 | ❌ | MessageInput.tsx | 无 slash 命令菜单 |
| 右侧面板 | Inspector | ✅ | InspectorPanel.tsx | Changes/Context/Review 可用 |
| 右侧面板 | 终端 | ✅ | RightPanel.tsx | 真实命令执行 |
| 右侧面板 | 版本历史 | ✅ | VersionHistory.tsx | 保存/恢复可用 |
| 右侧面板 | 书签 | ✅ | BookmarksPanel.tsx | 书签管理可用 |
| 状态卡 | SideStatusCard | ⚠️ | SideStatusCard.tsx | 部分硬编码数据 |

---

## 4. 高优先级问题

### 4.1 顶部菜单 4/5 项无功能

- **位置：** `src/App.tsx:191-194`
- **状态：** ❌ 完全未实现
- **证据：** 快速对话、文件、编辑、视图均为 `<span>` 元素，无 `onClick` 处理器
- **影响：** 用户点击无反应，误以为功能缺失
- **修复建议：** 实现基础功能（新建会话、导出、撤销、全屏）或隐藏/禁用

### 4.2 设置页面不存在

- **位置：** `src/App.tsx:264`
- **状态：** ❌ 完全未实现
- **证据：** 设置按钮无 `onClick`，代码库中无 SettingsPage 组件
- **影响：** 用户无法配置主题、模型、快捷键等
- **修复建议：** 创建基础设置页面（主题切换、默认模型、快捷键配置）

---

## 5. 中优先级问题

### 5.1 自动化按钮无功能

- **位置：** `src/App.tsx:253`
- **状态：** ❌ 完全未实现
- **证据：** `workflowStore.ts` 有 4 个预定义工作流，但 `WorkflowPanel.tsx` 从未被任何父组件导入，为死代码
- **影响：** 用户点击自动化按钮无反应
- **修复建议：** 要么接入 WorkflowPanel，要么暂时隐藏自动化按钮

### 5.2 `/` 命令菜单不存在

- **位置：** `src/components/Chat/MessageInput.tsx`
- **状态：** ❌ 完全未实现
- **证据：** 输入 `/` 无任何响应，无 slash 命令检测或菜单组件
- **影响：** 无法快速访问常用命令
- **修复建议：** 实现 `/` 触发的命令菜单，接入 CLI 命令列表

### 5.3 插件读 localStorage 而非真实目录

- **位置：** `src/stores/pluginStore.ts:43-58`
- **状态：** ⚠️ 半成品
- **证据：** 插件数据通过 `api.loadData()`/`api.saveData()` 读写 localStorage，无磁盘目录扫描逻辑
- **影响：** 插件无法自动发现真实安装的 mimo 插件
- **修复建议：** 添加 IPC handler 扫描 mimo plugin 目录

### 5.4 Compose/Plan/Build 是 prompt 前缀

- **位置：** `src/components/Chat/MessageInput.tsx:68`
- **状态：** ⚠️ 半成品
- **证据：** 三种模式作为 prompt 前缀拼接（`"Mode: Compose.\n\n<text>"`），非独立 CLI 模式
- **影响：** 用户可能误解为独立的执行模式
- **修复建议：** 明确文档化行为，或接入真实 CLI 模式参数

### 5.5 SideStatusCard 部分硬编码

- **位置：** `src/components/Status/SideStatusCard.tsx`
- **状态：** ⚠️ 半成品
- **证据：** "codegraph 已连接"、"$0.00 spent"、AGENTS.md 路径为静态文案
- **影响：** 状态信息不准确
- **修复建议：** 从 CLI/会话动态获取状态数据

### 5.6 readFile IPC 无调用方

- **位置：** `electron/main.ts:362`
- **状态：** ⚠️ 已暴露但未使用
- **证据：** `read-file` handler 已定义，preload 已暴露，但 renderer 中无任何调用
- **影响：** API surface 开放但未使用，增加攻击面
- **修复建议：** 移除未使用的 IPC 或在 Inspector 中接入

---

## 6. 建议项

| 问题 | 位置 | 说明 |
|------|------|------|
| 顶部菜单需实现或隐藏 | App.tsx:191-194 | 至少禁用或移除无效项 |
| 自动化需接入或移除 | workflowStore.ts | WorkflowPanel 为死代码，需决定去向 |
| 插件需扫描真实目录 | pluginStore.ts | 应读 mimo plugin 目录 |
| `/` 命令需接入真实命令源 | MessageInput.tsx | 至少接入 CLI 命令列表 |
| gitDiffStat IPC 无调用方 | main.ts:290 | 已暴露但无 renderer 使用 |
| 需添加真实设置页面 | 无 | 至少包含主题/模型/快捷键配置 |
| SideStatusCard 数据应动态化 | SideStatusCard.tsx | 从 CLI/会话获取真实状态 |

---

## 7. 必须优先修复的能力清单

1. **设置页面真实实现** — 主题/模型/快捷键配置
2. **自动化入口真实实现或暂时隐藏** — 接入 WorkflowPanel 或移除按钮
3. **插件页读取真实插件目录** — 扫描 mimo plugin 目录
4. **`/` 命令菜单接入真实命令源** — 至少接入 CLI 命令列表
5. **Compose/Plan/Build 与 CLI 行为对应关系确认** — 文档化或接入真实模式
6. **顶部菜单无效项处理** — 实现、禁用或隐藏
7. **移除未使用的 IPC** — readFile、gitDiffStat 等

---

## 8. 不在本轮处理

- 不做大规模重构
- 不重新引入 WebUI 主流程
- 不实现 Phase 5 写作工作台
- 不修改产品路线图，除非发现明确冲突

---

*报告生成时间：2026-06-14*
