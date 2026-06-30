# 前端 MVP 骨架开工说明

## 0. 文档控制

- 版本：v0.1
- 状态：Draft
- 用途：把前端从页面概念推进到第一轮可实现骨架
- 适用对象：前端研发、设计、测试、AI agent
- 单一来源：本文件
- 规范级别：MUST / SHOULD / MAY

## 1. 目标

第一轮前端不追求完整平台，而是先支撑 [MVP 闭环：Maya 导出 FBX](./16-MVP-FBX-Export-Flow.md)。

骨架必须让外部 Hermes 和用户共同完成：

```text
用户在 Hermes 对话 -> Hermes 反复执行和修复直到跑通 -> ScriptHub 生成 Hermes 工具
稳定脚本 / 插件 -> 注册进 ScriptHub 工具中心
用户点击某个工具 -> 打开桌面级工具小窗 -> 调参 -> 安全确认 -> 执行 -> Hermes 修复或工具升级
```

## 2. 页面范围

| 页面 | 路由建议 | 第一轮职责 |
| --- | --- | --- |
| 工具中心 | `/` | 显示可复用生产能力、能力分类、DCC、成熟度、最近运行、待确认、Hermes 修复 |
| 工具详情 | `/tools/:toolId` | 显示工具参数、运行历史、Hermes 修复记录、产物和版本 |
| 桌面级工具小窗 | desktop floating window | 用户点击某个工具后打开独立置顶工具窗口，修改参数、安全确认、执行和查看修复 |
| Web 内工具小窗预览 | web fallback | 浏览器环境下的降级实现，用于 MVP 调试和无桌面壳场景 |
| Agent Activity Console | `/agent-activity` | 高级视图：显示外部 Hermes 会话镜像、ToolCall、当前任务、Connector 健康、技能候选 |
| 工作台 | `/dashboard` | 显示当前任务、待审批、Connector 健康、最近资产 |
| 任务中心 | `/tasks` | 显示任务列表、状态、风险、审批状态 |
| 任务详情 | `/tasks/:taskId` | 显示计划、时间线、审批、执行结果 |
| Trace / Review / Approval | `/review` | 处理审批队列，查看 Trace |
| 资产详情 | `/assets/:assetId` | 查看 FBX 资产、来源链和版本 |
| 连接器 | `/connectors` | 查看 Maya Connector 状态和错误 |

## 3. 推荐目录

```text
src/
  app/
    routes/
    shell/
  components/
    badges/
    layout/
    timeline/
    empty-state/
  modules/
    tool-center/
    personal-home/              # compatibility export, forwards to tool-center
    tool-floating-window/
    tool-inline-panel/
    tool-library/
    plugin-script-library/
    hermes-tool-library/
    user-tool-detail/
    tool-parameters/
    safety-confirm/
    hermes-repair-log/
    tasks/
    approvals/
    traces/
    assets/
    connectors/
    agent-activity/
    tool-bridge/
    skill-capture/
  services/
    runtime-api/
    mock-runtime/
  models/
    schemas/
    fixtures/
  styles/
    tokens/
    global/
  tests/
```

## 4. 第一轮数据模型

前端第一轮 SHOULD 直接使用以下 schema 派生类型：

- [Task](./schemas/task.schema.json)
- [Approval](./schemas/approval.schema.json)
- [Event](./schemas/event.schema.json)
- [Asset](./schemas/asset.schema.json)
- [Connector](./schemas/connector.schema.json)
- [Trace](./schemas/trace.schema.json)

第一轮允许使用 mock 数据，但 mock 字段 MUST 与 schema 对齐。

## 5. 核心组件

| 组件 | 所属模块 | 输入 |
| --- | --- | --- |
| `AppShell` | layout | 当前路由、全局连接状态 |
| `ToolCenter` | tool-center | 工具能力、能力分类、DCC、成熟度、来源标签、最近运行 |
| `ToolFloatingWindow` | tool-floating-window | 桌面级置顶工具小窗、参数、安全确认、执行状态、产物、Hermes 修复 |
| `ToolInlinePanel` | tool-inline-panel | 浏览器内降级预览，复用工具小窗内容但不承诺桌面置顶 |
| `PluginScriptLibrary` | plugin-script-library | ScriptTool、runtime、manifest、版本 |
| `HermesToolLibrary` | hermes-tool-library | HermesTool、来源会话、修复记录 |
| `ToolLibrary` | tool-library | UserTool 列表、最近运行、工具状态 |
| `UserToolDetail` | user-tool-detail | UserTool、ToolParameter、ToolRun、HermesRepair、ToolVersion |
| `ToolParameters` | tool-parameters | 可编辑参数、默认值、校验、风险提示 |
| `SafetyConfirmPanel` | safety-confirm | 读取范围、写入范围、覆盖策略、风险、确认结果 |
| `HermesRepairLog` | hermes-repair-log | 错误类型、Hermes 修复动作、工具增强记录 |
| `AgentActivityConsole` | agent-activity | ConversationMirror、ToolCallRecord |
| `ToolCallTimeline` | tool-bridge | ToolCallRecord 列表 |
| `SkillCapturePanel` | skill-capture | SkillCandidate |
| `TaskStatusBadge` | tasks | `Task.status` |
| `RiskBadge` | tasks / approvals | `risk_level` |
| `TaskCard` | tasks | Task 摘要 |
| `TaskTimeline` | tasks / traces | Event 列表 |
| `ApprovalDrawer` | approvals | Approval、风险说明、审批动作 |
| `TraceTimeline` | traces | Trace、Event 列表 |
| `ConnectorHealthTile` | connectors | Connector health |
| `AssetProvenancePanel` | assets | Asset、Task、Trace |
| `EmptyStateBlock` | common | 页面空态动作 |

## 6. 页面骨架验收

### 6.1 工具中心

- MUST 显示外部 Hermes 完成过的操作历史。
- MUST 以能力分类、DCC 和成熟度作为主要筛选方式。
- MUST 将 Hermes 沉淀、脚本、DCC 插件、外部服务等作为来源 / 运行形态标签展示，而不是一级分类。
- MUST 显示工具参数，并允许用户修改参数后再次运行。
- MUST 显示最近产物和来源摘要。
- MUST 显示待确认动作，且确认内容包含读取、写入、覆盖和风险。
- MUST 显示失败任务的 Hermes 修复记录和下一步动作。
- MUST 支持进入工具详情查看运行历史、修复记录和版本。
- MUST 不要求用户理解 ToolCall、Trace 或 Audit 才能完成回放。

### 6.2 桌面级工具小窗

- MUST 由用户点击某个工具打开。
- MUST 绑定当前工具上下文，不作为常驻全局控制台。
- SHOULD 在桌面壳中作为独立窗口打开，支持置顶、拖动、缩放和位置记忆。
- SHOULD 能悬浮在 Maya / Blender / Unreal 等 DCC 上方，方便用户边看 DCC 边调整参数。
- MAY 在纯浏览器环境中降级为 Web 内工具小窗预览，但该预览不等同于最终桌面体验。
- 窗口 API、状态同步和 Web fallback 边界见 [22-Desktop-Floating-Window-Plan.md](./22-Desktop-Floating-Window-Plan.md)。
- MUST 显示当前工具的能力分类、成熟度、运行环境和来源标签。
- MUST 显示可编辑参数、默认值、必填项和风险提示。
- MUST 在执行前显示读取范围、写入范围、覆盖策略、风险等级和确认动作。
- MUST 显示运行中、成功、失败、等待 Hermes 修复状态。
- SHOULD 支持从失败状态直接让 Hermes 介入修复。

### 6.3 Agent Activity Console

- MUST 显示外部 Hermes 当前会话镜像。
- MUST 显示 ToolCall 时间线。
- MUST 显示当前运行任务、待审批数量和 Maya Connector 健康状态。
- MUST 显示当前 Skill Candidate。
- MUST 保持只读观察为主。
- MUST 将结构化任务创建标记为调试入口，而不是正式主流程。

### 6.4 工作台

- MUST 显示当前运行任务数量。
- MUST 显示待审批数量。
- MUST 显示 Maya Connector 健康状态。
- SHOULD 显示最近生成的 FBX Asset。
- MAY 提供调试任务入口。

### 6.5 任务中心

- MUST 显示任务列表。
- MUST 支持按状态和风险筛选。
- MUST 点击进入任务详情。
- SHOULD 标记等待审批的任务。

### 6.6 任务详情

- MUST 显示任务目标、状态、风险、审批状态。
- MUST 显示计划步骤。
- MUST 显示 Event 时间线。
- MUST 显示关联 Asset。
- MUST 在失败时显示错误类型和下一步动作。

### 6.7 Trace / Review / Approval

- MUST 显示待审批队列。
- MUST 显示风险说明和影响范围。
- SHOULD 显示批准与拒绝动作来源；正式审批优先由 Hermes 调用工具完成。
- MUST 显示 Trace 时间线。

### 6.8 资产详情

- MUST 显示 Asset 名称、类型、版本、存储位置。
- MUST 显示来源 Task 和 Trace。
- SHOULD 显示发布状态。

### 6.9 连接器

- MUST 显示 Maya Connector 状态。
- MUST 显示最近检查时间。
- SHOULD 显示最近错误。
- SHOULD 提供重连动作入口。

## 7. Mock Runtime 最小数据

第一轮 mock 数据 SHOULD 至少包含：

- 1 个 `planned` 状态的导出任务。
- 1 个 `pending` 状态的审批。
- 1 个 `connected` 状态的 Maya Connector。
- 1 条完整 Trace。
- 8 条以上 Event，覆盖计划、审批、执行、资产生成。
- 1 个 `fbx` Asset。
- 1 条成功操作历史。
- 1 个从成功操作生成的 UserTool。
- 至少 1 个 `script` 或 `dcc_plugin` 来源工具 mock。
- 至少 1 个 `hermes_captured` 来源工具 mock。
- 1 个 ToolFloatingWindow 运行态，Web MVP 中可用 ToolInlinePanel 降级。
- 1 组可编辑 ToolParameter。
- 1 条 HermesRepair 记录。
- 1 条 ToolVersion 记录。
- 1 组安全确认数据，覆盖读取、写入、覆盖和风险。
- 1 组错误修复动作。

## 8. API 适配层

前端 SHOULD 先定义 Runtime API 适配层，而不是让页面直接读取 mock。

建议接口：

```text
listTasks()
getTask(taskId)
listApprovals()
decideApproval(approvalId, decision)
getTrace(traceId)
getAsset(assetId)
listConnectors()
invokeTool(toolName, input)
listToolCalls(conversationId)
getConversationMirror(conversationId)
createSkillCandidate(input)
listOperationHistory()
listUserTools()
getUserTool(toolId)
listPluginScriptTools()
listHermesTools()
openToolFloatingWindow(toolId)
updateToolParameters(toolId, parameters)
getSafetyPreview(toolId, parameters)
runTool(toolId, confirmation)
listToolRuns(toolId)
listHermesRepairs(toolId)
requestHermesImproveTool(toolId, instruction)
listRepairActions(runId)
submitTask(input) // 仅作为底层工具能力或调试 fallback
```

## 9. 第一轮任务拆分

| 编号 | 任务 | 修改范围 | 验收 |
| --- | --- | --- | --- |
| FE-001 | 建立 AppShell 和路由 | `src/app`, `src/components/layout` | 页面可切换 |
| FE-002 | 建立 mock-runtime 服务 | `src/services`, `src/models` | 数据符合 schema |
| FE-003 | Agent Activity Console 骨架 | `src/modules/agent-activity` | 能看到 Hermes 会话、ToolCall、技能候选 |
| FE-004 | 任务中心和任务详情 | `src/modules/tasks` | 能查看导出任务 |
| FE-005 | Approval Drawer 和 Review 页 | `src/modules/approvals`, `src/modules/traces` | 能批准/拒绝 mock 审批 |
| FE-006 | 资产详情和来源链 | `src/modules/assets` | 能看到 FBX 来源 |
| FE-007 | Connector 面板 | `src/modules/connectors` | 能看到 Maya 健康状态 |
| FE-008 | 工具中心 | `src/modules/tool-center`, `src/modules/tool-library` | 能按能力分类、DCC、成熟度查看工具，并看到来源标签、最近运行、产物和 Hermes 修复 |
| FE-009 | 安全确认层 | `src/modules/safety-confirm` | 工具运行前能看到读写范围、覆盖风险和确认结果 |
| FE-010 | 工具详情 | `src/modules/user-tool-detail`, `src/modules/tool-parameters`, `src/modules/hermes-repair-log` | 能查看参数、运行历史、修复记录和版本 |
| FE-011 | 桌面级工具小窗 | `src/modules/tool-floating-window` | 点击某个工具后能在独立置顶窗口里调参、确认、执行和查看 Hermes 修复；Web MVP 可先用内嵌预览 |

## 10. 视觉与交互约束

- UI MUST 是个人可理解的跨 DCC 工具中心，不做 ScriptHub 内置主聊天入口。
- UI MUST 默认展示我的工具、参数、运行历史、产物、Hermes 修复和安全确认。
- `hermes_captured`、`script`、`dcc_plugin`、`external_service`、`composed_workflow` 来源工具 MUST 共享参数、确认、运行历史和产物记录体验。
- 高风险动作 MUST 显示风险和影响范围。
- 执行中、等待审批、失败、断连 MUST 有显式状态。
- 页面空态 MUST 说明等待 Hermes 完成一次操作后会生成你的工具。
- 不允许关键数据只存在于悬浮提示。

## 11. 退出标准

第一轮前端骨架完成时，应满足：

- 所有 MVP 页面可以打开。
- 默认首页展示工具中心、工具类型、工具参数、运行历史、产物和 Hermes 修复。
- FBX 导出 mock 任务能从工作台追踪到任务详情。
- 审批队列能显示 mock 审批，并能追溯到 Hermes ToolCall 来源。
- Asset 能追溯到 Task 和 Trace。
- Connector 状态能影响页面提示。
- 基础页面状态：loading、empty、error、normal 至少有占位处理。
