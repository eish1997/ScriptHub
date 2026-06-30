# Companion Integration Contract

> AssetCutter 本地伴侣壳 ↔ ScriptHub（Creative Production Runtime）集成契约 **v1**。

## 1. 范围

| 通道 | 用途 | 地址配置项（主仓） |
|------|------|-------------------|
| **UI** | 壳第五导航「脚本」BrowserView | `scriptHubUrl` |
| **API** | Copilot `ac.script_hub.*` → Tool Bridge | `scriptHubApiUrl` |

两地址 **MUST** 可独立配置（开发时 UI `:5173`、API `:8787` 分离）。

## 2. 版本

| 字段 | 值 |
|------|-----|
| `integrationVersion` | `1` |
| 主仓 `bodyToolsVersion` | `3`（对齐本契约） |

破坏性变更时双方同步升版本。

## 3. 开发默认

| 服务 | 命令 | 默认地址 |
|------|------|----------|
| ScriptHub 前端 | `npm run dev` | `http://localhost:5173/` |
| Tool Bridge | `npm run tool-bridge:server` | `http://localhost:8787/` |
| Maya Connector（可选） | `npm run maya-connector:server` | `http://localhost:8795/` |

## 4. Tool Bridge HTTP（MUST）

基址：`{scriptHubApiUrl}`，无 `/api` 前缀。

### 4.1 健康检查

```
GET /health
→ 200 { ok: true, service: "scriptHub.toolBridge.http", ... }
```

### 4.2 工具发现

```
GET /tool-bridge/tools
→ 200 {
  ok: true,
  data: ToolDescriptor[],
  trace_id, timestamp
}
```

### 4.3 工具调用

```
POST /tool-bridge/calls
Content-Type: application/json

{
  "tool_name": "scriptHub.task.create",
  "tool_version": "1.0.0",
  "conversation_id": "conv_companion_…",
  "trace_id": "trace_…",           // 可选
  "caller_agent": {
    "id": "companion-copilot",
    "name": "AssetCutter Companion Copilot",
    "version": "1.0.0",
    "transport": "http"
  },
  "input": { … },
  "idempotency_key": "…",          // 可选
  "requested_at": "ISO-8601"
}
```

成功 `200`：

```json
{
  "ok": true,
  "data": {
    "tool_call_id": "tc_…",
    "tool_name": "scriptHub.task.create",
    "status": "succeeded|needs_approval|failed",
    "trace_id": "…",
    "output": { … },
    "error": { … }
  },
  "trace_id": "…",
  "timestamp": "…"
}
```

### 4.4 查询调用

```
GET /tool-bridge/calls           → 列表
GET /tool-bridge/calls/:id     → 单条（id = tool_call_id）
```

## 5. Copilot 身体工具映射

| `ac.*` | Tool Bridge | 说明 |
|--------|-------------|------|
| `ac.script_hub.list_scripts` | `GET /tool-bridge/tools` | 列出平台工具（历史名保留） |
| `ac.script_hub.run_script` | `POST /tool-bridge/calls` | 执行平台工具 |
| `ac.script_hub.get_run` | `GET /tool-bridge/calls/:id` | 查询 `tool_call_id` |

### 5.1 `run_script` 参数（v1）

**推荐（新）：**

```json
{
  "toolName": "scriptHub.task.create",
  "input": {
    "capability_id": "maya.export_selection_fbx",
    "output_path": "/tmp/out.fbx",
    "overwrite": false
  }
}
```

**兼容（旧主仓语义，适配层映射）：**

```json
{
  "scriptId": "maya.export_selection_fbx",
  "revisionId": "rev_1",
  "targetType": "maya",
  "params": { "output_path": "/tmp/out.fbx", "overwrite": false }
}
```

→ 映射为 `tool_name: scriptHub.task.create`，`input.capability_id = scriptId`。

### 5.2 `get_run` 参数

```json
{ "toolCallId": "tc_…" }
```

`runId` 为别名，等同 `toolCallId`。

## 6. 鉴权（v1 本地）

- 开发：`127.0.0.1` Tool Bridge **MAY** 无鉴权。
- `401` / `403`：Copilot 返回 `AGENT_AUTH_REQUIRED` / `AGENT_FORBIDDEN`，并 `navigateShell('scripts')`。
- 生产：后续契约 v2 增加 Bearer；本版本预留 `caller_agent.id`。

## 7. 错误

Tool Bridge 失败响应：

```json
{
  "ok": false,
  "error": { "code": "…", "message": "…", "recoverable": true },
  "trace_id": "…"
}
```

Copilot 映射为 `AGENT_SCRIPT_HUB_HTTP` 或 `AGENT_TOOL_INVALID_ARGS`。

## 8. 主仓实现索引

| 模块 | 路径 |
|------|------|
| 客户端 | `companion-desktop/agent-script-hub-client.cjs` |
| 工具 schema | `companion-desktop/agent-tool-schemas.cjs` |
| 设置 | `companion-desktop/main.cjs`（`scriptHubUrl` + `scriptHubApiUrl`） |
| 冒烟 | `scripts/agent-p1-smoke.mjs` |

## 9. 修订记录

- **2026-06-30**：v1 初版；废弃主仓 `/api/scripts`、`/api/runs`（:9101）。
