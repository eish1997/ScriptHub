# Frontend Module Boundaries

> 本文记录当前前端 MVP 的模块边界。最新方向是：用户主要在外部 Hermes 中对话，ScriptHub 前端不作为主聊天入口。个人默认层是跨 DCC 工具中心，负责统一展示可复用生产能力、能力分类、DCC、成熟度、来源标签、工具参数、运行历史、安全确认、产物和 Hermes 修复；高级层负责展示外部 Hermes 活动、工具调用、执行状态、审批、审计和技能沉淀过程。

## 1. 当前模块

前端入口仍由 `src/app/App.tsx` 负责。它只保留路由选择、任务抽屉开关、角色选择和跨模块页面编排。

主入口应从结构化任务创建转向工具中心：能力分类、DCC、成熟度、来源标签、工具参数、运行历史、产物、Hermes 修复和安全确认。插件、脚本、Hermes 沉淀不作为一级分类，只作为统一 Tool 的来源或运行形态。`AgentActivityConsole` / `HermesActivityConsole` 保留为高级视图。现有 `HermesConsole` 若保留，只能作为外部 Hermes 会话镜像，不应提供正式聊天输入。现有任务创建抽屉保留为调试入口和结构化 fallback。

已拆出的业务模块：

- `src/modules/assets/`：资产列表、资产详情、版本和 provenance。
- `src/modules/evaluation/`：测试与验证、质量门槛和当前运行态摘要。
- `src/modules/policy/`：角色、权限矩阵和策略规则展示。
- `src/modules/stateMachine/`：Task 状态、状态迁移和迁移权限说明。
- `src/modules/connectors/`：Connector 健康状态、重连/断开和能力列表。
- `src/modules/capabilities/`：能力注册表、能力详情和可用性判断。
- `src/modules/approvals/`：审批详情、策略解释和审批来源展示；正式审批优先由外部 Hermes 调用工具完成。
- `src/modules/tasks/`：任务列表、任务详情、任务创建抽屉和失败恢复 UI。
- `src/modules/workflow/`：工作流节点图、节点状态判断和失败恢复路径。
- `src/modules/audit/`：事件过滤、审计摘要和事件详情抽屉。
- `src/modules/dashboard/`：工作台指标、当前任务摘要和最近资产小卡片。
- `src/modules/personal-home/`：个人默认首页兼容层，后续应收敛到 ToolCenter。
- `src/modules/tool-center/`：跨 DCC 工具中心，聚合可复用生产能力、能力分类、DCC、成熟度、来源标签、最近运行、产物、确认和 Hermes 修复。
- `src/modules/tool-floating-window/`：桌面级置顶工具小窗，由用户点击某个工具后打开，承载参数编辑、安全确认、执行状态、产物和 Hermes 修复。
- `src/modules/tool-inline-panel/`：浏览器内降级预览，复用工具小窗内容但不承诺脱离浏览器或置顶。
- `src/modules/tool-library/`：工具列表、工具卡片、最近运行摘要和工具状态。
- `src/modules/tool-library/`：统一工具列表、来源标签、manifest / source metadata、runtime、版本和执行入口。
- `src/modules/user-tool-detail/`：工具详情，展示参数、运行历史、Hermes 修复记录、产物和版本。
- `src/modules/tool-parameters/`：工具参数编辑、参数校验和安全提示。
- `src/modules/safety-confirm/`：回放前安全确认，解释读取范围、写入范围、覆盖策略、风险和确认结果。
- `src/modules/hermes-repair-log/`：失败原因、Hermes 修复动作、工具增强记录和再次运行入口。

## 2. 状态归属

`src/services/runtimeController.ts` 暂时持有这些运行态：

- `session`
- `task`
- `approval`
- `connector`
- `currentAsset`
- `role`
- `runtimeError`
- `recoveryEvent`

`App.tsx` 从 controller 读取状态和动作，再传给模块组件。模块组件接收状态和动作，不直接写入全局状态。这样后续可以将状态迁移到真实 runtime store，而不用重写页面。

## 3. Runtime Adapter 边界

`src/services/runtimeApi.ts` 是 UI 调用入口，当前转发到 `src/services/runtimeAdapter.ts`。

当前 adapter：

- `mockRuntimeAdapter.submitTask`
- `mockRuntimeAdapter.decideApproval`
- `mockRuntimeAdapter.setConnectorConnected`

后续接 Hermes 或真实 Runtime 时，优先替换 adapter 的实现，不直接改页面模块。真实实现需要返回同样的 `Task`、`Approval`、`Connector` 形状，或在 adapter 内完成转换。

`src/services/runtimeController.ts` 是当前 UI 状态控制层，负责：

- 会话恢复与本地快照保存。
- 创建任务、审批决策、Connector 切换的调试 fallback。
- 任务完成、失败模拟和恢复动作。
- 当前事件列表生成。
- toast 与忙碌态。

后续真实 Runtime 接入时，controller 应继续保留 UI 状态协调职责，外部系统差异仍收敛到 adapter。

事件读取已拆到 `src/services/runtimeEvents.ts`。当前仍使用 mock 事件快照，后续可替换为 Runtime 轮询或订阅式 event stream。

## 4. Hermes 接入点

新的接入原则：

- Hermes 是外部对话式操作中枢。
- ScriptHub 是平台工具、跨 DCC 工具中心、运行记录器、安全确认层和工具沉淀层。
- 页面模块不直接调用 Hermes。
- Hermes 通过 ScriptHub Tool API 调用平台能力。
- 每次工具调用都要进入 trace，方便审计、回放和技能提炼。

建议的接入顺序：

1. `ToolCenter`：统一展示可复用生产能力，并支持按能力分类、DCC、成熟度、最近运行、状态筛选。
2. `ToolFloatingWindow`：桌面级置顶工具小窗，统一承载所有工具能力的参数、确认、执行、产物和 Hermes 修复；它由具体工具触发，不常驻。纯浏览器环境可使用 `ToolInlinePanel` 作为 fallback。
3. `ToolLibrary` / `UserToolDetail`：把成功操作表达成可再次运行、可持续完善的工具。
4. `ToolLibrary`：插件、脚本、Hermes 沉淀、外部服务等只作为来源标签展示，共享同一套 ToolCard、ToolRun 和 SafetyConfirm。
5. `ToolParameters` / `SafetyConfirmPanel`：展示工具运行前的参数、读取、写入、覆盖、风险和确认状态。
6. `AgentActivityConsole` / `HermesActivityConsole`：高级视图，镜像外部 Hermes 会话和当前控制会话状态。
7. `ToolCallTimeline`：高级视图，展示 Hermes 调用了哪些平台工具、状态如何、是否失败或等待审批。
8. `SkillCapturePanel`：展示当前 trace 沉淀出的技能候选，并在个人层映射为工具候选或工具改进建议。
9. Tool Bridge mock：模拟外部 Hermes 调用 ScriptHub 工具。
10. Connector health / capability discovery：作为 Hermes 可调用平台工具。
11. Task dispatch / approval decision / event stream：作为工具调用后的执行和回放数据源。

真实 HTTP / MCP 接入时，前端模块只消费 activity mirror、ToolCall、Audit 和 runtime 状态；HTTP route、MCP server、Hermes client adapter 的职责边界见 `21-Real-Integration-Boundaries.md`。前端 service 中的 Tool Bridge handler / MCP adapter 仅作为 MVP 契约验证和后续迁移来源，不是生产对外服务本体。

桌面级工具小窗的窗口 API、always-on-top、拖动缩放、位置记忆和 Web fallback 边界见 `22-Desktop-Floating-Window-Plan.md`。

## 5. 维护原则

- 页面模块只关心展示和局部交互。
- 正式生产流程由外部 Hermes 调用工具推进，页面不应成为新的对话入口；个人层可以提供经过安全确认的工具运行按钮、参数编辑入口和桌面级工具小窗。
- `script`、`dcc_plugin`、`external_service` 等来源工具不能绕过 ScriptHub 直接执行，必须进入参数、确认、运行历史、产物和 Hermes 修复链路。
- 跨模块状态继续由 `App.tsx` 或后续 runtime store 统一管理。
- 外部系统差异收敛到 adapter，不扩散到组件。
- 能力可用性判断保持在 capabilities 模块，供任务创建和能力库复用。
