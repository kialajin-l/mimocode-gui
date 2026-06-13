# MiMoCode GUI 测试报告

> 测试日期：2026-06-14  
> 测试范围：构建、单元测试、Electron 主进程编译  
> 关联审查：[2026-06-14-mimocode-gui-audit-report.md](./compose/specs/2026-06-14-mimocode-gui-audit-report.md)  
> 测试框架：Vitest 4.1.8 + Vite 5.4.21 + TypeScript 5.5.3  
> 运行平台：Windows + PowerShell

---

## 1. 汇总

| 项目 | 结果 | 备注 |
|------|------|------|
| `npm run build` | ✅ 通过 | 534 modules, 3.23s；1 条 chunk size 警告 |
| `npm run build:electron` | ✅ 通过 | `tsc -p tsconfig.electron.json` 无错误 |
| `npm test -- --run` | ✅ 21/21 通过 | 4 个测试文件，0 失败，0 跳过 |
| TypeScript 严格模式 | ✅ 通过 | `tsc && tsc -p tsconfig.electron.json` 双端均无类型错误 |

**总体结论**：构建与单元测试**全部通过**，但**测试覆盖严重不足**。从入口联通审查来看，14 个问题中 6 个高危问题缺乏自动化测试保护，存在“测试绿灯但产品不可用”的风险。

---

## 2. 构建结果

### 2.1 `npm run build`（Vite 渲染层）

**命令**：`tsc && vite build`

**结果**：

```text
> mimocode-gui@1.0.0 build
> tsc && vite build

The CJS build of Vite's Node API is deprecated.
vite v5.4.21 building for production...
transforming...
✓ 534 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                         0.72 kB │ gzip:   0.38 kB
dist/assets/index-BMtZTi1s.css         79.36 kB │ gzip:  13.38 kB
dist/assets/zustand-C6yxtQOP.js        10.57 kB │ gzip:   4.04 kB
dist/assets/index-C4h-ttxG.js          77.58 kB │ gzip:  22.99 kB
dist/assets/react-vendor-tX6-f2Ba.js  133.93 kB │ gzip:  43.13 kB
dist/assets/markdown-DvL0P5yE.js      157.68 kB │ gzip:  47.86 kB
dist/assets/index-msCZ3BuJ.js         939.87 kB │ gzip: 311.68 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
✓ built in 3.23s
```

**警告**：
- 主 chunk 939.87 kB > 500 kB 警告，建议 `manualChunks` 拆分（建议项，不阻塞）

### 2.2 `npm run build:electron`（Electron 主进程 + Preload）

**命令**：`tsc -p tsconfig.electron.json`

**结果**：

```text
> mimocode-gui@1.0.0 build:electron
> tsc -p tsconfig.electron.json
```

**结果**：无输出无错误，`dist-electron/` 产物成功生成。

### 2.3 `npm test -- --run`（Vitest）

**结果**：

```text
> mimocode-gui@1.0.0 test
> vitest run --run

The CJS build of Vite's Node API is deprecated.
01:41:43 [vite] warning: `esbuild` option was specified by "vite:react-babel" plugin. This option is deprecated.
Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored.

 RUN  v4.1.8 E:/code/mimocode-gui

 ✓ src/stores/__tests__/sessionStore.test.ts (8 tests) 8ms
 ✓ src/components/Chat/MessageInput.test.ts (3 tests) 5ms
 ✓ src/utils/__tests__/diffParser.test.ts (5 tests) 7ms
 ✓ src/stores/sessionStore.test.ts (5 tests) 5ms

 Test Files  4 passed (4)
      Tests  21 passed (21)
   Start at  01:41:43
   Duration  2.03s
```

**统计**：
- 测试文件：4
- 通过：21
- 失败：0
- 跳过：0
- 总耗时：2.03s

**警告**：Vite 内部 `esbuild` 选项弃用提示（不阻塞）。

---

## 3. 测试文件清单

| # | 文件 | 测试数 | 类型 | 覆盖范围 |
|---|------|------|------|---------|
| 1 | `src/stores/__tests__/sessionStore.test.ts` | 8 | 单元 | sessionStore 全量方法 |
| 2 | `src/stores/sessionStore.test.ts` | 5 | 单元 | sessionStore 核心方法（重复） |
| 3 | `src/components/Chat/MessageInput.test.ts` | 3 | 单元 | MessageInput localStorage 偏好 |
| 4 | `src/utils/__tests__/diffParser.test.ts` | 5 | 单元 | unified diff 解析 |

**注**：`src/stores/sessionStore.test.ts` 与 `src/stores/__tests__/sessionStore.test.ts` 存在**重复**，建议二选一保留。

---

## 4. 测试用例详情

### 4.1 `sessionStore.test.ts`（5 用例）

| # | 用例 | 验证点 |
|---|------|------|
| 1 | creates a session | `id` 生成、`name`、`status='idle'` |
| 2 | sets active session | `setActiveSession` 后 `activeSessionId` 更新 |
| 3 | adds message to session | `addMessage` 后 `messages.length === 1` |
| 4 | deletes session | `deleteSession` 后 sessions 清空 |
| 5 | updates session | `updateSession` 修改 `status`、`pid` |

### 4.2 `__tests__/sessionStore.test.ts`（8 用例）

| # | 用例 | 验证点 |
|---|------|------|
| 1 | creates a session with correct defaults | `id/name/cwd/status/messages` + 自动 active |
| 2 | creates session with projectId | `projectId` 传递 |
| 3 | appends message to session | `addMessage` 正确 |
| 4 | toggles bookmark on a message | `toggleMessageBookmark` 双向 |
| 5 | does not affect other messages | 切换不影响其他 message |
| 6 | loads legacy sessions without versions safely | 旧数据兼容性 + `reviveDates` |
| 7 | importSession merges session data | 导入生成新 id/timestamp |
| 8 | deleteProject unlinks sessions from that project | 项目删除后 session projectId 置 null |

### 4.3 `MessageInput.test.ts`（3 用例）

| # | 用例 | 验证点 |
|---|------|------|
| 1 | defaults to Compose mode when no preference exists | 默认 `{mode: 'compose', permission: 'edit', model: '', reasoning: 'default'}` |
| 2 | restores persisted prompt controls | localStorage 写入后正确恢复 |
| 3 | falls back safely for invalid persisted values | 非法值（`mode:'writer'` / `permission:'root'` / `model:123` / `reasoning:'max'`）回退到默认值 |

### 4.4 `diffParser.test.ts`（5 用例）

| # | 用例 | 验证点 |
|---|------|------|
| 1 | parses a valid unified diff with two files | 多文件、`created` / `modified` 状态、`additions/deletions` 计数 |
| 2 | returns empty array for empty diff | 空输入返回 `[]` |
| 3 | returns empty array for malformed input | 非 diff 文本返回 `[]` |
| 4 | parses a deleted file | `deleted` 状态 |
| 5 | parses context lines with line numbers | context / added / removed 行类型 |

---

## 5. 测试覆盖盲点（基于审计报告）

下表将审计报告中的高危/中危问题与现有测试做对照，识别**测试覆盖盲点**。

| 入口/能力 | 当前测试覆盖 | 风险 |
|----------|------------|------|
| **设置页（缺失）** | ❌ 无 | 修复前无任何测试保护 |
| **自动化入口（缺失）** | ❌ 无 | 修复前无任何测试保护 |
| **插件页（无真实源）** | ❌ 无 | `pluginStore` 没有测试 |
| **`/` 命令菜单** | ❌ 无 | `MessageInput` 只测了 localStorage |
| **顶部 4 个菜单** | ❌ 无 | 没有点击行为测试 |
| **Compose/Plan/Build mode 行为** | ⚠️ 间接 | 只测了 `readInputPrefs` 默认值，未测 mode 是否进入 prompt |
| **权限 → CLI 参数映射** | ❌ 无 | `cli-bridge.ts` 没有测试 |
| **mimo 路径发现** | ❌ 无 | `cli-bridge.findMimoBin` 没有测试 |
| **Git diff IPC** | ❌ 无 | `main.ts` 的 `git-diff` 等 handle 没有测试 |
| **Terminal IPC** | ❌ 无 | `terminal-execute` 没有测试 |
| **Plugin store** | ❌ 无 | `pluginStore` 没有测试 |
| **WebUIHost** | ❌ 无 | webview 启动流程没有测试 |
| **SideStatusCard** | ❌ 无 | 静态 mock 没有测试 |
| **RightPanel tabs** | ❌ 无 | 5 个 tab 切换没有测试 |
| **Workflow store** | ❌ 无 | 4 个 predefined workflow 没有测试 |
| **Inspector store** | ❌ 无 | memory/checkpoint 读取没有测试 |
| **Theme store** | ❌ 无 | 主题切换没有测试 |

**测试覆盖率估算（粗略）**：核心数据层（sessionStore）覆盖较好，UI 组件层、IPC 层、命令层**几乎为零**。

---

## 6. 待补充测试清单（按优先级）

### P0 - 必须补充

1. **`MessageInput` 行为测试**：
   - 切换 Compose/Plan/Build 后点击发送，验证 prompt 包含 `Mode: xxx.`
   - 切换 model/reasoning 后，验证 `api.sendMessage` 调用参数
2. **`useSession.sendMessage` 集成测试**：
   - mock `window.electronAPI.sendMessage`，验证 IPC 调用参数
   - 验证 model 包含 `/` 时才传 `--model`
3. **`cli-bridge` 单元测试**：
   - `findMimoBin` 在不同环境下的回退路径
   - `sendMessage` 拼装 `mimo run --model --variant --dangerously-skip-permissions`
4. **IPC handler 测试**：
   - `git-diff` / `git-accept` / `git-reject` 在合法 / 越权 cwd 下的行为

### P1 - 建议补充

5. **`pluginStore`**：toggle/remove/add 行为
6. **`workflowStore`**：startWorkflow / advanceStep / stopWorkflow
7. **`runtimeStore`**：startServe / stopServe / syncServeStatus
8. **`MessageList` markdown 渲染**：`parseMessageDisplay` 提取 `Mode:` / `Workflow:` 标签

### P2 - 长期

9. **E2E 测试**（Playwright + Electron）：完整流程“建项目 → 发消息 → 接受/拒绝 diff”
10. **视觉回归**：截图对比 Codex-like 主题
11. **CLI 集成测试**：`mimo models` / `mimo session list --format json` mock 验证

---

## 7. 环境与复现步骤

### 7.1 复现命令

```powershell
# 进入项目目录
cd E:\code\mimocode-gui

# 1. 安装依赖（如未安装）
npm install

# 2. 渲染层构建
npm run build

# 3. Electron 主进程编译
npm run build:electron

# 4. 单元测试
npm test -- --run
```

### 7.2 依赖版本（来自 `package.json`）

```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.13.3",
    "jsdom": "^29.1.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^4.1.8"
  },
  "dependencies": {
    "node-pty": "^1.1.0",
    "react": "^18.3.1",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "zustand": "^4.5.4"
  }
}
```

### 7.3 已知警告（不阻塞）

- Vite CJS Node API 弃用提示
- Vitest esbuild 选项弃用
- 主 chunk 939.87 kB 超 500 kB 警告

---

## 8. 结论

**测试维度（CI 视角）**：✅ 绿灯  
**产品质量维度（实际可用性）**：❌ 红灯（详见审计报告）

构建和单元测试**机械性通过**，但**测试覆盖严重不足**：

- 14 个审计问题中 **11 个**没有自动化测试覆盖
- 0 个 IPC handler 测试
- 0 个 CLI 拼装测试
- 0 个 E2E 测试
- 测试文件与生产代码比例约 1:30

**建议**：

1. **短期**：在修复 6 个高危问题时同步补充 P0 测试，避免修完无法回归
2. **中期**：建立 IPC handler 集成测试框架（如 `vitest` + mock `electron`）
3. **长期**：引入 Playwright 做 Electron E2E
4. **清理**：合并 `src/stores/sessionStore.test.ts` 与 `src/stores/__tests__/sessionStore.test.ts`

---

## 9. 关联文档

- [2026-06-14-mimocode-gui-audit-report.md](./compose/specs/2026-06-14-mimocode-gui-audit-report.md) — 整体联通审查
- [2026-06-13-mimocode-gui-product-roadmap.md](./compose/specs/2026-06-13-mimocode-gui-product-roadmap.md) — 产品路线图
- [2026-06-13-codex-like-mimo-workbench-design.md](./superpowers/specs/2026-06-13-codex-like-mimo-workbench-design.md) — Codex-like 设计规范
- [2026-06-13-codex-like-mimo-workbench.md](./superpowers/plans/2026-06-13-codex-like-mimo-workbench.md) — 实施计划
