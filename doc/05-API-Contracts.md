# API / Contract 文档

## 0. 文档控制

- 版本：v0.2
- 状态：Draft
- 用途：定义本文件的职责、范围与使用方式
- 适用对象：产品、设计、研发、测试、运维
- 单一来源：本文件
- 规范等级：MUST / SHOULD / MAY



## 1. 目标

把外部 Hermes、ScriptHub Tool Bridge、Runtime、Skill、Tool、Connector、Event 的交互从概念变成可实现契约。

## 2. 通用响应约定

### 2.1 成功

```json
{
  "ok": true,
  "data": {},
  "trace_id": "string",
  "timestamp": "string"
}
```

### 2.2 失败

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "string",
    "recoverable": true
  },
  "trace_id": "string",
  "timestamp": "string"
}
```

## 3. API 分组

- Tool Bridge API：供外部 Hermes 调用 ScriptHub 平台工具
- Agent Activity API：供前端订阅 Hermes 调用状态和会话镜像
- Session API
- Task API
- Planning API
- Dispatch API
- Connector API
- Event API
- Audit API
- Health API
- Skill Candidate API

## 4. 必须统一的字段

- id
- version
- status
- owner
- scope
- trace_id
- timestamps
- permissions
- caller_agent
- conversation_id
- tool_call_id

## 5. 错误模型

- invalid_input
- permission_denied
- connector_unavailable
- timeout
- execution_failed
- result_uncertain
- conflict
- not_found

## 6. 版本规则

- 所有契约必须有版本号
- 非兼容修改必须提升主版本
- 向后兼容修改优先

## 7. 接口设计原则

- 每个接口只做一件事
- 每个接口都要明确输入、输出和错误
- 每个接口都要返回 trace_id
- 每个接口都要能关联审计记录

## 8. 典型接口建议

### 8.0 Tool Bridge 传输边界

第一版 Tool Bridge 同时定义三种传输候选，但共享同一份工具语义：

| 传输 | 第一版定位 | 发现 | 调用 | 说明 |
| --- | --- | --- | --- | --- |
| MCP | SHOULD，正式主路径 | MCP `tools/list` | MCP `tools/call` | Hermes 具备 MCP client 能力时优先使用 |
| HTTP | MUST，fallback / 调试 | `GET /tool-bridge/tools` | `POST /tool-bridge/calls` | 用于契约测试、网关接入和 MCP 不可用场景 |
| local bridge | MAY，本机开发态 | 本地 manifest 或等价 `tools/list` | 本地 JSON-RPC / socket / loopback HTTP | 用于 DCC 工作站、离线调试和 Connector 桥接 |

传输层不得改变工具语义。MCP、HTTP、local bridge 返回的工具名称、schema、状态、错误码、审计字段必须一致。

### 8.1 Tool Bridge 调用

- 调用方：外部 Hermes
- 输入：tool_name、conversation_id、trace_id、input、caller_agent
- 输出：tool_call_id、status、output、error、trace_id
- 约束：每次调用必须写入 ToolCallRecord 和 Event

#### 8.1.1 工具发现

```json
{
  "name": "scriptHub.task.create",
  "title": "Create Task",
  "version": "1.0.0",
  "description": "Create a ScriptHub task from Hermes intent.",
  "input_schema": {},
  "output_schema": {},
  "permissions": ["task:create"],
  "risk_level": "medium",
  "approval_required": false,
  "idempotent": true,
  "retryable": true,
  "timeout_ms": 30000,
  "owner": "ScriptHub",
  "tags": ["task", "tool-bridge"]
}
```

工具发现字段要求：

- `name`、`version`、`input_schema`、`output_schema`、`permissions`、`risk_level`、`approval_required` 为 MUST。
- `name` MUST 使用 `scriptHub.<domain>.<action>` 命名。
- `input_schema` 和 `output_schema` MUST 在 MCP 与 HTTP 中保持一致。
- 高风险或有外部副作用的工具 MUST 声明所需权限和审批要求。

#### 8.1.2 工具调用请求

```json
{
  "tool_name": "scriptHub.task.create",
  "tool_version": "1.0.0",
  "conversation_id": "conv_001",
  "trace_id": "trace_001",
  "parent_tool_call_id": null,
  "caller_agent": {
    "id": "hermes_prod",
    "name": "Hermes",
    "version": "1.0.0",
    "transport": "mcp"
  },
  "input": {},
  "idempotency_key": "conv_001:create_task:001",
  "dry_run": false,
  "requested_at": "2026-05-22T00:00:00.000Z"
}
```

调用请求字段要求：

- `tool_name`、`conversation_id`、`caller_agent`、`input`、`requested_at` 为 MUST。
- `trace_id` 缺省时由 ScriptHub 生成；传入时 ScriptHub MUST 沿用并校验格式。
- `idempotency_key` 对创建、审批、资产登记等副作用工具为 SHOULD。
- `dry_run` 为 true 时 MUST 不产生外部副作用，但 MAY 写入审计事件。

#### 8.1.3 工具调用返回

```json
{
  "tool_call_id": "tc_001",
  "conversation_id": "conv_001",
  "trace_id": "trace_001",
  "tool_name": "scriptHub.task.create",
  "status": "succeeded",
  "output": {},
  "error": null,
  "audit": {
    "audit_id": "audit_001",
    "actor_type": "external_hermes",
    "actor_id": "hermes_prod",
    "caller_agent_id": "hermes_prod",
    "transport": "mcp",
    "source_ip": null,
    "user_confirmation_id": null,
    "approval_id": null,
    "permissions_checked": ["task:create"],
    "risk_level": "medium",
    "policy_decision": "allow",
    "event_ids": ["evt_001"],
    "created_at": "2026-05-22T00:00:01.000Z"
  },
  "started_at": "2026-05-22T00:00:00.100Z",
  "finished_at": "2026-05-22T00:00:01.000Z"
}
```

调用返回字段要求：

- `tool_call_id`、`conversation_id`、`trace_id`、`tool_name`、`status`、`audit`、`started_at` 为 MUST。
- `status` 允许值：`queued`、`running`、`succeeded`、`failed`、`needs_approval`、`cancelled`。
- `status` 为 `failed` 时 `error` 为 MUST；`status` 为 `succeeded` 时 `output` 为 SHOULD。
- 长任务 MAY 先返回 `queued` 或 `running`，再通过 trace 查询、HTTP 轮询或 MCP 后续事件获取最终结果。

### 8.2 Task 创建工具

- 工具名：`scriptHub.task.create`
- 输入：任务目标、场景、约束、来源 conversation_id
- 输出：task_id、计划摘要、风险摘要、approval_id

### 8.3 审批决策工具

- 工具名：`scriptHub.approval.decide`
- 输入：approval_id、decision、decision_note、conversation_id
- 输出：审批状态、审计事件
- 约束：正式审批优先由 Hermes 根据用户对话确认后调用

### 8.4 Dispatch 调度工具

- 工具名：`scriptHub.dispatch.run`
- 输入：task_id、skill_id、tool_id、connector_id
- 输出：执行状态、回放锚点

### 8.5 Event / Trace 查询

- 输入：时间范围、task_id、trace_id、conversation_id、event_type
- 输出：事件列表

### 8.6 Skill Candidate 创建

- 工具名：`scriptHub.skill.candidate.create`
- 输入：conversation_id、trace_id、tool_calls、summary、steps
- 输出：skill_candidate_id、status、review_url

## 9. 错误返回建议

- code：MUST，允许值包括 `invalid_input`、`permission_denied`、`approval_required`、`connector_unavailable`、`timeout`、`execution_failed`、`result_uncertain`、`conflict`、`not_found`、`unsupported_transport`
- message：MUST，给 Hermes 和审计台消费的简短说明
- recoverable：MUST，指示 Hermes 是否可以重试、追问或切换工具
- retry_after_ms：SHOULD，可恢复且需要等待时返回
- affected_scope：SHOULD，说明受影响对象，例如 task、asset、connector、approval
- detail：MAY，结构化错误详情，不得包含密钥或敏感原文
- trace_id：MUST

## 10. 契约测试要求

- 每个接口都要有成功样例
- 每个接口都要有失败样例
- MCP 与 HTTP 对同一工具的发现结果必须通过一致性测试
- 同一 `idempotency_key` 重放时必须验证不会重复创建副作用对象
- 每个有副作用工具都必须验证审计字段完整性
## 11. 接口规格表模板

| 字段 | 说明 | 是否必须 |
| --- | --- | --- |
| name | 接口名称 | MUST |
| version | 接口版本 | MUST |
| caller | 调用方 | MUST |
| input | 输入说明 | MUST |
| output | 输出说明 | MUST |
| errors | 错误码 | MUST |
| idempotent | 是否幂等 | SHOULD |
| retryable | 是否可重试 | SHOULD |
| audit | 审计要求 | MUST |

## 12. 接口审查清单

- 输入是否完整
- 输出是否可消费
- 错误是否可恢复
- 是否返回 trace_id
- 是否支持契约测试
- 是否有版本规则




