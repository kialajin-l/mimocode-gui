# Phase 2: ACP 探索报告

> 日期: 2026-06-13

## ACP 能力摸底结果

### 1. mimo acp 命令

ACP 服务器可启动，支持以下选项：
- `--port` - 指定端口
- `--hostname` - 监听地址
- `--mdns` - mDNS 服务发现
- `--cors` - CORS 配置
- `--cwd` - 工作目录

### 2. CLI 数据接口

`mimo session list --format json` 可用，返回结构化 JSON：
```json
[
  {
    "id": "ses_xxx",
    "title": "Session title",
    "updated": timestamp,
    "created": timestamp,
    "projectId": "project-id",
    "directory": "E:\\code\\project"
  }
]
```

### 3. 数据路线决策

**选择路线 B：CLI + JSON 数据**

理由：
1. `mimo session list --format json` 已验证可用
2. `mimo export <sessionID>` 可导出会话详情
3. ACP 服务器需要额外启动和连接管理
4. CLI 方式更简单可靠，适合 MVP

### 4. 复用评估

`E:/code/codex-workflow/src/executor.ts` 可复用：
- 子进程启动/停止/超时管理 ✅
- 结构化输出解析 ✅
- 错误分类策略 ✅

不复用：
- 完整编排模型（过于复杂）
- 任务调度系统（不需要）

### 5. 下一步

1. 实现 `cliDataAdapter` 获取会话列表
2. 实现 `localDataAdapter` 读取 memory 文件
3. 右侧 inspector 显示会话和 memory 信息
