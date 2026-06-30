# Development Progress

> 本文作为开发进度记录。每次完成代码变更后同步更新，用来快速查看已经做了什么、当前做到哪一步、下一步应该推进什么。

## 1. 当前阶段

当前处于前端 MVP 的方向校准阶段：产品入口从“前端结构化创建任务 / 工程师控制台”调整为“跨 DCC 工具中心”。用户仍主要在外部 Hermes 对话；ScriptHub 统一管理插件 / 脚本工具和 Hermes 沉淀工具，并在用户点击某个工具后打开该工具专属浮层窗口，提供参数、安全确认、执行、运行历史、产物和 Hermes 修复。

阶段目标：

- 将 `App.tsx` 从“大页面文件”收敛为状态和路由编排层。
- 将业务页面拆到 `src/modules/`。
- 保留 mock runtime 的可演示能力。
- 建立 Runtime / Tool Bridge 边界，为后续 Hermes 对话式操作、插件 / 脚本工具运行、Hermes 工具运行、安全确认、Hermes 修复和工具沉淀做准备。

## 2. 已完成

### 文档与契约

- 建立核心对象 Schema：Task、Approval、Event、Asset、Connector、Trace。
- 补充 MVP FBX 导出流程文档。
- 补充前端 MVP 骨架文档。
- 补充前端模块边界文档。

### 前端基础

- 创建 Vite + React + TypeScript 前端。
- 实现工作台、任务中心、任务详情、审批、连接器、能力库、工作流、资产库、审计、评测、策略设置、状态机等 MVP 页面。
- 实现会话恢复、重置、toast、角色权限、Connector 断开/重连模拟。
- 实现失败模拟：Maya 超时、输出路径冲突、无选择对象、结果不确定。
- 实现 Runtime Error 恢复动作：重试、修改路径、人工复核、取消任务。

### 模块化

已拆出的模块：

- `src/components/common.tsx`
- `src/components/SessionStrip.tsx`
- `src/modules/assets/`
- `src/modules/evaluation/`
- `src/modules/policy/`
- `src/modules/stateMachine/`
- `src/modules/connectors/`
- `src/modules/capabilities/`
- `src/modules/approvals/`
- `src/modules/tasks/`
- `src/modules/workflow/`
- `src/modules/audit/`
- `src/modules/dashboard/`

### Runtime 边界

- 新增 `src/services/runtimeAdapter.ts`。
- `src/services/runtimeApi.ts` 已改为转发到 adapter。
- 新增 `src/services/runtimeController.ts`，集中管理 UI 运行态、会话快照、任务动作和恢复动作。
- 新增 `src/services/runtimeEvents.ts`，集中管理 Runtime event snapshot / 后续 event stream 入口。
- 新增 `src/services/runtimeTransitions.ts`，将关键状态迁移抽成可测试纯函数。
- 当前 adapter 仍使用 mock runtime，后续可替换为 Hermes / 真实 Runtime 实现。

### 测试

- 引入 Vitest。
- 新增 `npm test`。
- 新增 `src/services/runtimeTransitions.test.ts`。
- 当前覆盖：审批通过、审批拒绝、Connector 断开、失败模拟、重试恢复、修改路径恢复。

## 3. 最近变更记录

### 2026-05-24

- 新增 `23-Project-Migration-Handoff.md`，用于把项目迁移到另一台电脑后快速恢复开发现场。
- 迁移文档明确了必须带走的源码 / 文档 / 脚本文件、可重新生成的 `node_modules` / `dist` / TypeScript 缓存、以及按需迁移的 `.scripthub/tool-bridge-calls.json`。
- 迁移文档补充新电脑启动顺序：安装依赖、跑测试、构建、启动前端、启动 Tool Bridge、跑 Hermes demo、启动 Maya Connector、跑 fixture demo、再按需跑真实 mayapy smoke test。
- 迁移文档补充关键环境变量、常见错误处理和新电脑验收清单，方便后续切换机器后继续打通真实 Maya / Hermes 链路。
- 真实 Maya Connector `/export/fbx` 成功/失败现在会追加为 `scriptHub.mayaConnector.exportFbx` ToolCall，进入 Agent Activity / ToolCall Timeline。
- Audit 会自动消费该 ToolCall；导出失败时 `repair_suggestion` 会保留在审计详情 `output.repair_suggestion` 中。
- 新增审计测试覆盖 Maya Connector 导出失败事件，确认失败消息和修复建议能进入 Audit detail。
- `mayaConnectorHttpActivity` 新增 `exportExternalMayaFbx()`，可调用真实 Maya Connector `/export/fbx` 并规范化导出产物。
- `runtimeController` 在 Maya HTTP Connector 在线时，会把工具运行请求继续发送到真实 `/export/fbx`：成功后更新当前 Asset 和 Task，失败后把真实 `repair_suggestion` 写入 `externalMayaConnectorSync` 并展示到工具中心。
- 新增 `/export/fbx` 前端服务测试：覆盖真实导出成功和导出失败保留 `repair_suggestion` 两条路径。
- 新增 `src/services/mayaConnectorHttpActivity.ts`，前端会检查本地 Maya Connector `/health` 和 `/selection`，记录 mode、selection count、失败信息和真实 `repair_suggestion`。
- `runtimeController` 新增 `externalMayaConnectorSync`，定时同步真实 Maya Connector 状态；当 Connector 返回可修复错误时，会把修复建议同步到工具中心视图。
- DevTools 新增 Maya HTTP 状态、Maya mode 和 selection count，便于观察当前真实 Connector 是否在线。
- `buildPersonalRuntimeView()` 支持直接接收真实 Connector `repairSuggestion`，优先展示真实 Connector 返回的建议；没有真实错误时再使用 mock RuntimeError 推断。
- 工具小窗和运行历史详情新增 Connector 修复建议展示：失败时显示失败摘要、用户提示、是否需要确认、是否可重试和 Hermes 推荐动作。
- `PersonalRuntimeView` 新增 `repairSuggestion`，运行历史详情也会保留当前失败对应的 `repairSuggestion`。
- 当前 UI 已能将 `EMPTY_SELECTION` 映射为 `select_objects`，将 `OUTPUT_CONFLICT` 映射为 `confirm_overwrite_or_rename`。
- Maya Connector HTTP 错误返回新增 `repair_suggestion`，把结构化错误码映射成 Hermes 可执行修复建议。
- 新增 `scripts/maya-connector-repair-suggestions.mjs`，服务端用于给 `empty_selection`、`invalid_output_path`、`output_exists`、`maya_python_unavailable`、`fbx_plugin_unavailable`、`maya_command_timeout` 等错误补充修复建议。
- 新增 `src/services/mayaConnectorRepair.ts` 和 `mayaConnectorRepair.test.ts`，前端可复用同一套错误码到 Hermes 修复动作的映射。
- 已验证 `invalid_output_path` 会返回 `revise_output_path` 建议，`maya_python_unavailable` 会返回 `switch_to_mayapy` 建议。
- 新增 `scripts/maya-connector-real-smoke.mjs` 和 `npm run maya-connector:real-smoke`，用于真实 mayapy 环境 smoke test。
- 本机已发现 `C:\Program Files\Autodesk\Maya2018\bin\mayapy.exe`，并成功通过 mayapy standalone 创建测试立方体、加载 FBX 导出链路、写出真实 FBX。
- 真实 smoke test 输出：`C:\Users\ZYF\AppData\Local\Temp\scripthub-maya-real-smoke\self_test_export.fbx`，大小 21616 bytes。
- `scripts/maya_connector_command.py` 补充 `self_test_export` 操作，并兼容 Maya 2018 mayapy 这类旧 Python 环境。
- Maya Connector HTTP 服务新增 `maya_python_command` 模式：配置 `SCRIPTHUB_MAYA_PYTHON_COMMAND` 后，`/selection` 和 `/export/fbx` 会委托给 Maya Python 命令桥。
- 新增 `scripts/maya_connector_command.py`：支持 `selection` 和 `export_fbx` 两个操作；在 Maya Python 环境中读取当前选择、加载 `fbxmaya` 插件并调用 FBX export。
- 命令桥统一返回 `{ ok, data, error }`，普通 Python / 非 Maya 环境会返回 `maya_python_unavailable`，后续可直接接入 Hermes 修复链路。
- `/health` 新增 Connector `mode` 和 Python 命令配置状态，方便区分当前跑的是 fixture 还是真实 Maya Python 命令桥。
- 新增本地 Maya Connector HTTP 验证服务 `scripts/maya-connector-http-server.mjs`，提供 `/health`、`/selection` 和 `/export/fbx`。
- Maya Connector 验证服务当前返回可配置的模拟 Maya 选择对象，并把 `project://...fbx` 写入本地 Connector root 下的 FBX 占位文件；它用于验证边界，不代表已经接入真实 Maya Python。
- 新增 `scripts/maya-connector-http-demo.mjs`，按“读取选择 -> Tool Bridge 创建任务 -> Connector 导出 FBX -> Tool Bridge 登记产物”的顺序跑通第一条 DCC Connector 最小链路。
- `package.json` 新增 `npm run maya-connector:server` 和 `npm run maya-connector:demo`。
- 已用独立端口和临时目录验证：读取 2 个选择对象，生成 `project://exports/maya_connector_demo.fbx`，Tool Bridge 写入 2 条调用记录，导出文件存在。
- 本轮 Node 语法检查、全量测试、构建和本地页面访问验证通过。

### 2026-05-23

- 本地 HTTP Tool Bridge 新增文件持久化：默认写入 `.scripthub/tool-bridge-calls.json`，也可通过 `SCRIPTHUB_TOOL_BRIDGE_STORE` 指定存储路径。
- HTTP Tool Bridge 启动时会恢复历史 ToolCall，并重建 `idempotency_key` 映射，避免服务重启后重复生成副作用调用。
- `/health` 新增 `persisted_call_count` 和 `storage_path`，便于确认当前服务加载了多少历史调用。
- 已用独立端口和临时存储文件验证：写入 2 条 ToolCall 后重启服务，`GET /tool-bridge/calls` 仍能读回 2 条。
- 本轮 Node 语法检查、全量测试、构建和本地页面访问验证通过。
- 回放入口新增执行前差异确认：运行历史详情会展示输出路径、覆盖策略、读取范围和当前 DCC 选择检查项。
- `OperationHistoryDetail` 新增 `replayChecks`，用于结构化表达 info / warning 级别的回放前检查。
- 回放按钮文案调整为“确认并再次运行”，用户先看到检查项再用历史参数重新发起执行。
- 新增 / 更新测试覆盖回放检查项，确保路径差异和 DCC 选择检查能被展示。
- 本轮全量测试、构建和本地页面访问验证通过。
- 运行历史详情新增“再次运行本次参数”入口，使用该历史记录的能力、输出路径和覆盖策略重新发起 Tool Bridge 执行。
- `OperationHistoryDetail` 新增 `replayInput`，避免 UI 从展示文案反推回放参数。
- 运行历史详情测试补充 `replayInput` 断言，确保回放入口使用结构化运行输入。
- 本轮全量测试和构建验证通过。
- 运行历史新增详情入口：每条历史可打开详情抽屉查看读写范围、确认状态、参数、产物、Hermes 修复和时间线。
- `PersonalRuntimeView` 新增 `historyDetails`，按历史 id 提供可回放检查所需的结构化详情。
- `ToolCenter` 的运行历史卡片新增“查看详情”动作，并复用现有抽屉交互展示运行详情。
- 新增测试覆盖运行历史详情模型，确保读写范围、参数、产物和修复信息可被查询。
- 本轮全量测试、构建和本地页面访问验证通过。
- 新增本地 HTTP Tool Bridge 同步状态：记录 `checking / connected / offline`、最后检查时间、最后同步时间、同步调用数和最近错误。
- Agent Activity 页面现在显示本地 HTTP Tool Bridge 是否连接、已同步几次外部调用，以及最近同步 / 检查时间。
- DevTools 状态区新增 HTTP Bridge 状态、已同步调用数、最后同步和最后检查，未连接时显示最近错误。
- 本轮全量测试和构建验证通过。
- HTTP ToolCall 现在不只进入 Agent Activity，也会反向驱动前端运行态。
- `scriptHub.task.create` 外部 HTTP 调用会同步更新当前 Task、Approval、Session 和安全确认入口。
- `scriptHub.asset.register` 外部 HTTP 调用会同步更新当前 Asset，让外部调用产物能直接出现在资产视图中。
- `runtimeController` 已记录已处理过的外部 HTTP ToolCall id，避免轮询时重复应用同一条调用。
- 本轮全量测试、构建、HTTP demo 链路和前端页面访问验证通过。
- HTTP Tool Bridge server 新增 `GET /tool-bridge/calls`，可列出内存中的外部 ToolCall。
- 新增 `src/services/toolBridgeHttpActivity.ts`，将 HTTP ToolCall route response 映射为前端 `ToolCallRecord`。
- 新增 `toolBridgeHttpActivity.test.ts`，覆盖外部 HTTP ToolCall 到 UI ToolCall 的映射。
- `runtimeController` 新增本地 HTTP Tool Bridge 轮询：服务启动时自动把外部调用合并进 Agent Activity / ToolCall Timeline；服务未启动时静默跳过。
- 外部 HTTP demo 链路验证后，`GET /tool-bridge/calls` 可返回 `scriptHub.task.create` 和 `scriptHub.asset.register` 两条真实外部调用。
- 本轮全量测试、构建、本地页面访问和 HTTP call list 验证通过。
- 新增本地 HTTP Tool Bridge 验证服务 `scripts/tool-bridge-http-server.mjs`，提供 `/health`、`GET /tool-bridge/tools`、`POST /tool-bridge/calls`、`GET /tool-bridge/calls/:id`。
- 新增外部 Hermes demo client `scripts/hermes-http-client-demo.mjs`，通过真实 HTTP 调用 `scriptHub.task.create` 和 `scriptHub.asset.register`。
- `package.json` 新增 `npm run tool-bridge:server` 和 `npm run tool-bridge:demo`。
- 本地 HTTP Tool Bridge 当前使用内存 ToolCall 存储，用于真实链路最小闭环验证，不承担生产鉴权和持久化。
- 已验证 demo client 可以通过 HTTP 创建 task call、登记 asset call，并返回 trace / audit / tool_call_id。
- 真实接入边界文档补充本地 HTTP Tool Bridge 验证入口和下一步 UI 同步目标。
- 本轮全量测试、构建、本地页面访问和 HTTP demo 链路验证通过。
- 工具小窗“让 Hermes 修复”按钮接入现有恢复 mock：优先使用推荐修复动作，否则使用第一条可用修复动作。
- `ToolFloatingWindowContent` 新增 `repairAction` 和 `onRepair` 入参；无可执行修复动作时禁用修复按钮。
- `ToolCenter` 新增 `requestHermesRepairFromWindow()`，将工具小窗修复动作转发到现有 `onRepair` / `recoverTask` 链路。
- 当当前没有失败状态或修复动作时，工具小窗展示“当前没有需要 Hermes 修复的失败状态。”错误提示。
- 本轮全量测试、构建和本地页面访问验证通过。
- `ToolSource` 从 `plugin_script | hermes_captured` 扩展为 `hermes_captured | script | dcc_plugin | external_service | composed_workflow`。
- Maya 批量 FBX 工具来源改为 `dcc_plugin`，Blender 集合导出工具来源改为 `script`，Hermes 沉淀工具继续使用 `hermes_captured`。
- 工具运行输入生成逻辑改为 `script` / `dcc_plugin` 来源使用 `output_dir + name_rule`，其他来源使用 `output_path`。
- 工具来源标签文案改为 `Hermes 沉淀`、`脚本`、`DCC 插件`、`外部服务`、`组合流程`。
- 样式补充 `script`、`dcc_plugin`、`external_service`、`composed_workflow` 来源标签和卡片标识。
- PRD、前端骨架、模块边界和 Hermes Adapter Contract 同步新 `ToolSource` 口径。
- 本轮全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/toolWindowBridge.ts`，定义 `ToolWindowBridge`、`ToolFloatingWindowRequest`、`ToolWindowState`、`ToolWindowBounds`。
- 新增 Web fallback adapter：支持 `openToolWindow()`、`closeToolWindow()`、`focusToolWindow()`、`setAlwaysOnTop()`、`setBounds()`、`getToolWindowState()`。
- `ToolCenter` 打开 / 关闭工具小窗时已接入 `toolWindowBridge`，当前仍使用 Web fallback 显示内嵌预览。
- 新增 `toolWindowBridge.test.ts`，覆盖打开窗口、记录 bounds / always-on-top 意图、关闭后保留位置尺寸。
- 本轮全量测试、构建和本地页面访问验证通过。
- 新增 `src/modules/tool-floating-window/ToolFloatingWindowContent.tsx`，将工具小窗内容层从 `ToolCenter.tsx` 中拆出。
- `ToolFloatingWindowContent` 现在承载工具标题、来源标签、成熟度、参数编辑、安全确认、最近产物、Hermes 修复记录和执行动作。
- `ToolCenter` 只保留工具筛选、选中工具、小窗开关、参数状态和执行编排，未来桌面独立窗口和 Web fallback 可复用同一套内容层。
- 工具分类、成熟度和来源标签 helper 迁移到 `ToolFloatingWindowContent` 模块导出，避免后续重复实现。
- 本轮全量测试、构建和本地页面访问验证通过。
- 新增 `22-Desktop-Floating-Window-Plan.md`，定义桌面级工具小窗的目标体验、命名、桌面壳边界、前端内容层、状态层、窗口 API 草案、Web fallback 边界、MVP 阶段和验收标准。
- 文档总目录挂载 `22-Desktop-Floating-Window-Plan.md`。
- 前端骨架、模块边界和真实接入边界均引用桌面工具小窗规划，明确窗口能力属于 Desktop Shell 边界，不属于 HTTP / MCP / Hermes 协议层。
- 工具执行窗口定位从浏览器内 `ToolOverlay` 调整为“桌面级置顶工具小窗 / ToolFloatingWindow”。
- 明确 Web 内窗口只是 MVP fallback / preview；真实目标是脱离浏览器、可置顶、可拖动、可缩放、可悬浮在 Maya / Blender / Unreal 上方的独立工具遥控器小窗。
- `ToolCenter` 中用户可见入口从“打开工具浮层窗口”调整为“打开工具小窗”，内部 class 从 `tool-overlay-*` 收敛为 `tool-floating-window` / `tool-window-*`。
- PRD、交互规范、场景库、前端骨架、模块边界和 Hermes Adapter Contract 同步更新桌面级工具小窗口径。
- 本轮全量测试、构建和本地页面访问验证通过。
- 产品分类口径调整：插件、脚本、Hermes 沉淀工具不再作为一级分类，而是统一 Tool 的来源或运行形态标签。
- 新增 `ToolCategory`：`dcc_operation`、`asset_processing`、`project_automation`、`inspection_repair`、`workflow_assistant`。
- 新增 `ToolMaturity`：`draft`、`usable`、`stable`、`verified`、`team_recommended`。
- ToolCenter 主筛选改为“能力分类 + 运行环境 + 成熟度”，来源标签降级为卡片信息。
- 工具卡片新增能力分类和成熟度展示；来源文案改为“脚本 / 插件形态”或“Hermes 沉淀”。
- PRD、前端骨架、模块边界和 Hermes Adapter Contract 同步更新为“可复用生产能力库”口径。
- 本轮全量测试、构建和本地页面访问验证通过。
- 工具中心筛选从“仅按来源”升级为“运行环境 + 来源”组合筛选，支持全部 DCC、Maya、Blender、Unreal 与全部来源、插件 / 脚本、Hermes 工具。
- `buildPersonalRuntimeView()` 的 mock 工具库扩展为 4 个工具：Maya 插件 / 脚本工具、Blender 插件 / 脚本工具、Maya Hermes 工具、Unreal Hermes 工具。
- `buildSubmitTaskInputFromToolParameters()` 会按工具 runtime 生成 `maya.export_fbx.v1`、`blender.export_fbx.v1` 或 `unreal.export_fbx.v1`。
- ToolCenter 增加空筛选状态提示，避免组合筛选无结果时界面空白。
- 新增测试覆盖 Blender / Unreal 工具运行输入生成。
- 本轮全量测试、构建和本地页面访问验证通过。
- `PersonalRuntimeView` 内部字段从 `automation` / `flowPackage` 收敛为 `hermesTool` / `toolDetail`。
- 视图模型类型从 `AutomationCandidate` / `FlowPackageDetail` 调整为 `HermesToolSummary` / `UserToolDetail`。
- 工具中心样式类名从 `automation-card` / `flow-package` 收敛为 `hermes-tool-card` / `tool-detail-card`，避免后续组件拆分继续继承旧产品概念。
- 顶栏 eyebrow 从 `MVP Flow` 调整为 `MVP Tooling`。
- 本轮全量测试、构建和本地页面访问验证通过。
- 新增 `src/modules/tool-center/ToolCenter.tsx`，作为“跨 DCC 工具中心”的正式前端模块入口。
- `src/modules/personal-home/PersonalHome.tsx` 已收敛为兼容导出层，继续兼容旧引用但不再作为主要实现位置。
- `App.tsx` 默认工具中心页面改为直接引用 `ToolCenter`。
- 用户可见文案继续从“自动化 / 流程包”收敛到“工具运行 / 工具详情 / Hermes 工具”。
- 本轮全量测试、构建和本地页面访问验证通过。
- ToolOverlay 参数从只读展示升级为可编辑，支持按当前工具维护参数值。
- 新增 `getDefaultToolParameterValues()` 和 `buildSubmitTaskInputFromToolParameters()`，按工具类型生成运行输入。
- 插件 / 脚本工具会用 `output_dir` + `name_rule` + `overwrite` 生成输出路径；Hermes 工具会用 `output_path` + `overwrite` 生成运行输入。
- 工具浮层“执行工具”现在会使用当前参数调用现有 Tool Bridge mock 执行链路，并在参数错误时展示表单错误。
- 新增测试覆盖插件 / 脚本工具与 Hermes 工具的运行输入生成。
- 全量测试、构建和本地页面访问验证通过。
- `PersonalHome` 新增 ToolOverlay 骨架：点击某个工具卡片后打开该工具专属浮层窗口。
- 工具浮层窗口展示当前工具名称、来源类型、runtime、参数、安全确认、最近产物、Hermes 修复记录和执行入口。
- ToolOverlay 当前复用现有执行 mock，作为插件 / 脚本工具与 Hermes 工具共享交互的第一版 UI 骨架。
- 新增 `.tool-overlay-window`、`.tool-overlay-summary`、`.tool-overlay-section`、`.tool-parameter-list` 等样式。
- 全量测试、构建和本地页面访问验证通过。
- 新增统一工具中心数据雏形：`ToolSource`、`ToolRuntime`、`ToolParameter`、`ToolRun`、`HermesRepair`、`ToolVersion`、`ScriptToolManifest`、`UserTool`。
- `buildPersonalRuntimeView()` 现在会同时产出两类 mock 工具：插件 / 脚本工具 `Maya 批量 FBX 导出脚本`，以及 Hermes 沉淀工具 `Maya 当前选择导出 FBX`。
- 首页文案从“个人自动化记录器”调整为“跨 DCC 工具中心”，侧边栏入口从“个人首页”调整为“工具中心”。
- `PersonalHome` 增加工具来源筛选：全部工具、插件 / 脚本、Hermes 工具。
- `PersonalHome` 新增工具卡片列表，展示工具类型、runtime、参数数、运行数，并预留“打开工具浮层窗口”入口。
- 新增测试断言工具视图同时包含插件 / 脚本工具和 Hermes 工具，并校验脚本 manifest entrypoint。
- 全量测试、构建和本地页面访问验证通过。
- 产品文档完成“双工具形态 + 工具专属浮层窗口执行”升级：ScriptHub 工具中心同时承载插件 / 脚本工具和 Hermes 沉淀工具。
- 明确插件 / 脚本工具不必在 DCC 内置复杂 UI，默认由用户在工具中心点击某个工具后打开该工具专属浮层窗口，在窗口中调参数、确认风险和执行。
- PRD、交互规范、场景库补充插件 / 脚本工具进入工具中心、Hermes 工具升级为插件 / 脚本、统一运行历史和 Hermes 修复等场景。
- Hermes Adapter Contract 补充 `ToolSource`、`ToolRuntime`、`ScriptToolManifest`，明确插件 / 脚本工具也必须进入 ToolRun、SafetyConfirm、Artifact 和 HermesRepair 体系。
- 前端 MVP 骨架和模块边界新增 `ToolCenter`、`ToolOverlay`、`PluginScriptLibrary`、`HermesToolLibrary` 方向。
- 产品文档完成“个人工具库”定位升级：用户在 Hermes 中跑通复杂操作后，ScriptHub 生成“我的工具”，并支持参数调整、再次运行、Hermes 修复、工具版本和持续完善。
- PRD、交互规范、场景库、Hermes Adapter Contract、前端 MVP 骨架、前端模块边界均已从“自动化 / 流程包”用户表达调整为“我的工具 / 工具参数 / 运行历史 / Hermes 修复 / 工具版本”。
- Hermes Adapter Contract 新增用户层对象建议：`UserTool`、`ToolParameter`、`ToolRun`、`HermesRepair`、`ToolVersion`。
- 前端文档新增 `ToolLibrary`、`UserToolDetail`、`ToolParameters`、`HermesRepairLog` 模块方向。
- 个人首页新增“流程包详情”，将 SkillCandidate 翻译为个人用户可读的流程包。
- `PersonalRuntimeView` 新增 `flowPackage`，覆盖触发方式、参数模板、工具链、失败处理和最近验证结果。
- `PersonalHome` 在自动化卡片下展示流程包详情，用户无需进入高级 ToolCall 也能理解自动化如何复用。
- 新增测试覆盖流程包参数模板、待确认验证状态和失败验证状态。
- 全量测试、构建和本地页面访问验证通过。
- 个人首页操作历史从单条当前状态升级为运行列表，`buildPersonalRuntimeView()` 会从 Hermes `task.create` ToolCall 中派生多条历史。
- 操作历史按最新运行在前展示，每条记录保留对应的输出路径、覆盖策略摘要、状态、来源和 trace。
- 新增测试覆盖多次 `scriptHub.task.create` 后生成多条个人操作历史。
- 全量测试、构建和本地页面访问验证通过。
- 个人首页安全确认从静态摘要升级为可编辑确认：用户可修改输出路径、切换是否允许覆盖，再让 Hermes 重新运行自动化。
- `runtimeController` 新增 `simulateExternalToolBridgeWithInput()`，支持用用户确认后的参数提交 Tool Bridge / Runtime 链路。
- `RuntimeToolBridgeResult` 新增 `taskCreateInput`，`appendRuntimeToolBridgeResult()` 会把本次确认参数写入 `scriptHub.task.create` ToolCall input。
- `PersonalHome` 的“让 Hermes 再跑一次”和“模拟 Hermes 完成一次操作”会校验 `.fbx` 输出路径，并提交用户编辑后的 `output_path` / `overwrite`。
- 新增测试覆盖编辑后的回放参数进入 ToolCall input。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/personalRuntime.ts`，把现有 Task、Approval、Asset、Connector、Hermes Conversation、ToolCall 和 RuntimeError 派生为个人层视图数据。
- 个人层数据模型覆盖 OperationHistory、AutomationCandidate、SafetyPreview、ArtifactSummary 和 RepairAction。
- 新增 `src/modules/personal-home/PersonalHome.tsx`，默认首页展示操作历史、可再次运行的自动化、安全确认、最近产物和错误修复。
- `App.tsx` 默认路由从 Agent 活动调整为个人首页，侧边栏新增“个人首页”，Agent 活动保留为高级视图。
- 个人首页的“让 Hermes 再跑一次”接入现有 Tool Bridge mock，“确认执行 / 拒绝”接入现有外部 Hermes 审批决策，“错误修复”接入现有恢复动作。
- 新增 `personalRuntime.test.ts`，覆盖待确认状态映射和错误修复动作映射。
- 全量测试、构建和本地页面访问验证通过；本地仓库未安装 Playwright，未执行浏览器自动截图验证。
- 产品定位从“只读控制台 / 工具调用观察面板”进一步收束为“AI 操作记录器 + 自动化回放器 + 安全确认层”。
- PRD 明确个人默认层：操作历史、自动化按钮、产物、错误修复和安全确认；团队和高级用户再进入 ToolCall、Trace、Audit、权限和版本治理。
- 交互规范明确个人默认首页不暴露 ToolCall / descriptor / trace_id / audit_id，自动化运行前必须展示读取范围、写入范围、覆盖风险和确认状态。
- 场景库新增个人核心场景：成功操作生成自动化按钮、自动化回放前安全确认、错误修复、产物来源追踪。
- Hermes Adapter Contract 将“技能沉淀”产品化为“可验证生产流程包”，补充流程包应包含触发方式、参数模板、工具链、安全边界、失败处理、产物来源和验证记录。
- 前端 MVP 骨架新增个人首页、自动化、安全确认、错误修复模块，`AgentActivityConsole` 调整为高级视图。
- 前端模块边界同步改为“个人默认层 + 高级治理层”，明确个人层可提供经过安全确认的自动化回放按钮。
- 新增 `src/services/skillCandidateToolBridge.ts`，将技能候选状态流转映射为 Tool Bridge descriptor 调用。
- `applySkillCandidateToolBridgeTransition()` 会调用 HTTP fallback handler、生成 ToolCallRecord、追加 tool 消息，并在成功后更新 SkillCandidate 状态。
- `SkillCapturePanel` 的 Dev Status Flow 新增“经 Tool Bridge”开关；关闭时保持本地 transition，开启时走 descriptor / fallback handler / ToolCall / Audit 链路。
- `HermesWorkspace` 和 `runtimeController` 新增 `transitionCurrentSkillCandidateViaToolBridge` 接线。
- 技能候选 publish 经 Tool Bridge 时记录为 high risk、`needs_approval` 的 ToolCall。
- 新增 `skillCandidateToolBridge.test.ts`，覆盖 submit_review 和 publish 的 Tool Bridge 流转记录。
- 全量测试、构建和本地页面访问验证通过。
- MCP adapter `_meta` 新增 caller scope / auth 占位字段：`caller_agent_id`、`caller_agent_name`、`caller_agent_version`、`caller_agent_scopes`、`auth_token_hint`。
- `ToolBridgeCallerAgent` 增加 `scopes` 和 `auth_token_hint`，`ToolBridgeCallAudit` 增加 `scopes` 和 `auth_token_hint`，用于真实 Hermes client 接入前的审计占位。
- HTTP fallback handler 会将 caller scopes 和 token hint 写入 audit；token hint 只用于指纹或别名，不保存 token 原文。
- MCP adapter 默认 scope 为 `tool_bridge:call`，未传 caller identity 时继续使用 `hermes_mcp_client`。
- 扩展 `toolBridgeMcpAdapter.test.ts` 和 `toolBridgeHttpFallback.test.ts`，覆盖自定义 caller identity、scope、auth token hint 和默认 scope。
- 更新 Hermes Adapter Contract 与 Real Integration Boundaries，补充 caller scope / auth 占位约束。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `21-Real-Integration-Boundaries.md`，定义真实 HTTP route、MCP server、Hermes client adapter、Tool Bridge Core、Runtime / Connector、Frontend service 的职责边界。
- 明确第一版真实链路按两阶段推进：先 HTTP fallback，再 MCP server。
- 真实服务边界文档补充最小闭环验收标准：外部脚本发现工具、调用 `scriptHub.task.create`、返回 route response、UI 可见 ToolCall / Audit / trace、idempotency 生效。
- 真实服务边界文档列出实施顺序：抽 shared core、包 HTTP route、加外部脚本样例、同步 UI activity store、加 caller scope、包 MCP server、接 Hermes client、接真实 Connector。
- 更新文档总目录、前端模块边界和 Hermes Adapter Contract，统一指向 `21-Real-Integration-Boundaries.md`。
- 全量测试、构建验证通过。
- HTTP fallback handler 新增 route-style 响应包类型 `ToolBridgeRouteResponse<T>`，统一返回 `ok`、`data`、`error`、`trace_id`、`timestamp`。
- `ToolBridgeHttpFallbackHandler` 新增 `listToolsResponse()`、`callToolResponse()`、`getToolCallResponse()`，分别对应真实 HTTP route 的响应形态。
- `callToolResponse()` 成功时返回 `ok: true + data`，校验失败时返回 `ok: false + error`，并保留 trace。
- `getToolCallResponse()` 支持成功查询和 `not_found` 错误响应。
- 扩展 `toolBridgeHttpFallback.test.ts` 覆盖 tools list、tool call、validation failed、get tool call、missing tool call 的 route-style 响应。
- 全量测试、构建和本地页面访问验证通过。
- Audit 详情中的 Tool Contract 从单行文本改为结构化摘要卡片。
- `EventDrawer` 新增 `ToolContractSummary`，按字段展示 Version、Permissions、Risk、Approval、Validation、Validation errors、Fallback call。
- Tool Contract 摘要支持两列网格、长错误独占整行、风险 / 校验 / 审批状态色彩提示，提升真实调用排障可读性。
- 新增 `.tool-contract-summary`、`.tool-contract-grid`、`.contract-pass`、`.contract-fail`、`.contract-warn` 等样式。
- 全量测试、构建和本地页面访问验证通过。
- Descriptor registry 新增技能候选流程工具：`scriptHub.skill.candidate.save_draft`、`scriptHub.skill.candidate.submit_review`、`scriptHub.skill.candidate.reject`、`scriptHub.skill.candidate.publish`。
- 技能候选流程工具统一使用 `skill_candidate_id`、`trace_id`、`actor_id`、`conversation_id`、`note` 输入形态，输出 `skill_candidate_id`、`status`、`trace_id`。
- `save_draft` 为 low risk / `skill_candidate:update`；`submit_review` 为 medium risk / `skill_candidate:submit_review`；`reject` 为 medium risk / `skill_candidate:review`；`publish` 为 high risk / `skill_candidate:publish` 且需要审批。
- HTTP fallback handler 已可调用技能候选 review-flow 工具，`publish` 会返回 `needs_approval`。
- 扩展 `toolBridgeDescriptors.test.ts` 和 `toolBridgeHttpFallback.test.ts` 覆盖技能候选流程工具发现、权限、风险和 fallback 调用。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/toolBridgeMcpAdapter.ts`，建立第一版 MCP server 适配层接口。
- MCP adapter 的 `toolsList()` 直接映射 descriptor registry 的 MCP 发现视图，避免 MCP 与 HTTP 维护两份工具 schema。
- MCP adapter 的 `toolsCall()` 会将 MCP `name`、`arguments`、`_meta` 转为统一 `ToolBridgeCallRequest`，并复用 HTTP fallback handler 的 `callTool()`。
- MCP 调用结果返回 `content`、`isError`、`structuredContent`，其中 `structuredContent` 是统一 `ToolBridgeCallResult`。
- MCP adapter 默认 caller agent 为 `Hermes MCP Client`，transport 固定为 `mcp`，支持 `conversation_id`、`trace_id`、`tool_version`、`idempotency_key` 等 `_meta` 字段。
- 新增 `toolBridgeMcpAdapter.test.ts`，覆盖 MCP tools/list、tools/call 成功路径、handler 调用记录复用、descriptor validation failed 的 MCP error 结果。
- 全量测试、构建和本地页面访问验证通过。
- DevTools 失败路径新增“入参校验失败”场景，用于模拟外部 Hermes 调用 `scriptHub.task.create` 时缺少 `output_path`、`overwrite` 类型错误、包含额外字段。
- `ToolBridgeProvider` 新增 `appendValidationFailureScenario()`，mock / MCP / HTTP provider 均可生成 descriptor validation failed 的 ToolCall。
- MCP / HTTP provider 的校验失败场景会通过 HTTP fallback handler 生成 `fallback_tool_call_id`，并将 `contract_validation: failed` 写入 ToolCall input，Audit 可直接查看。
- DevTools 场景历史支持记录和回放 `validation_failure`。
- HTTP fallback handler 新增 `idempotency_key` 复用逻辑，同一 key 重放时返回同一 `ToolBridgeCallResult`，避免重复生成副作用调用结果。
- 扩展 `toolBridgeHttpFallback.test.ts` 和 `toolBridgeProvider.test.ts` 覆盖幂等键和入参校验失败场景。
- 全量测试、构建和本地页面访问验证通过。
- Audit Tool Bridge 详情新增 descriptor 元数据：工具版本、权限、风险等级、审批要求和 tags。
- Audit Tool Bridge 详情新增 `contract_validation` 和 `fallback_tool_call_id` 摘要，不必只看原始 JSON 判断契约是否通过。
- `mapToolCallEvent()` 会从 descriptor registry 和 ToolCall input / output 中提取契约信息，写入统一审计 detail。
- `EventDrawer` 新增 Tool Contract 摘要区块，展示 Version、Permissions、Risk、Approval、Validation、Validation errors、Fallback call。
- Audit 关键词搜索支持 `fallback_tool_call_id`。
- 扩展 `auditEvents.test.ts` 覆盖 Tool Bridge 契约元数据、contract validation、fallback ID 和搜索。
- 全量测试、构建和本地页面访问验证通过。
- Descriptor registry 新增 `scriptHub.skill.candidate.create`，技能候选创建进入统一工具发现、校验和 fallback 调用契约。
- `scriptHub.skill.candidate.create` 定义为 low risk、无需审批、权限为 `skill_candidate:create`，支持 MCP / HTTP / local bridge。
- HTTP fallback handler 现在可接受技能候选创建请求，并返回统一 `ToolBridgeCallResult`。
- MCP / HTTP provider skeleton 中的技能候选 ToolCall 不再被标记为 descriptor skipped，已进入 `contract_validation: passed` 路径。
- 扩展 `toolBridgeDescriptors.test.ts`、`toolBridgeHttpFallback.test.ts` 和 `toolBridgeProvider.test.ts` 覆盖技能候选工具。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/toolBridgeHttpFallback.ts`，实现第一版本地 HTTP fallback handler。
- Handler 暴露 `listTools()`、`callTool()`、`getToolCall()`，分别对应未来 `GET /tool-bridge/tools`、`POST /tool-bridge/calls`、`GET /tool-bridge/calls/{tool_call_id}`。
- `callTool()` 复用 descriptor 校验层，返回统一 `ToolBridgeCallResult`，包含 `tool_call_id`、status、output、error、audit、trace_id 和时间戳。
- 成功调用会写入内存调用记录，可通过 `getToolCall()` 按 `tool_call_id` 查询；失败调用会返回 `invalid_input` 等结构化错误和 deny 审计。
- MCP / HTTP provider skeleton 现在通过本地 handler 执行 descriptor 校验，并把生成的 `fallback_tool_call_id` 写入 ToolCall output。
- 新增 `toolBridgeHttpFallback.test.ts`，覆盖工具发现、成功调用、按 ID 查询和校验失败结果。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/toolBridgeInvocation.ts`，定义 Tool Bridge 调用 request、caller agent、错误码和校验结果类型。
- `validateToolBridgeCallRequest()` 基于 descriptor 校验工具是否存在、版本是否匹配、transport 是否支持、input schema 是否满足要求。
- 第一版 schema 校验覆盖 object、array、string、number、integer、boolean、null、required、enum 和 `additionalProperties: false`。
- 新增 `createToolBridgeCallRequestFromToolCall()`，可从当前 ToolCallRecord 生成统一调用 request，为后续 MCP server / HTTP handler 复用。
- MCP / HTTP provider skeleton 现在会执行 descriptor 校验，并把 `contract_validation` 写入新 ToolCall 的 input / output。
- 已登记工具校验失败时，provider skeleton 会将 ToolCall 标记为 `failed` 并写入校验错误；尚未登记工具先标记为 `skipped`，等待后续纳入 descriptor。
- 新增 `toolBridgeInvocation.test.ts`，覆盖成功校验、未知工具、版本不匹配、transport 不支持、input schema 错误和 ToolCallRecord 转 request。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `src/services/toolBridgeDescriptors.ts`，建立 Tool Descriptor 单一来源。
- 第一批 descriptor 覆盖 `scriptHub.connector.health.get`、`scriptHub.task.create`、`scriptHub.approval.decide`、`scriptHub.asset.register`。
- Descriptor 统一记录工具名、版本、输入输出 schema、权限、风险等级、审批要求、幂等性、重试性、超时、owner、tags 和支持的 transport。
- 新增 `listMcpToolDescriptors()` 与 `listHttpToolDescriptors()`，分别生成 MCP `tools/list` 和 HTTP `GET /tool-bridge/tools` fallback 发现数据。
- MCP / HTTP provider skeleton 现在会从 descriptor registry 读取工具版本，并把 `tool_version` 写入新 ToolCall 的 input / output。
- DevTools 状态区新增 Provider mode 显示，便于调试当前 `mock|mcp|http` 路径。
- 新增 `toolBridgeDescriptors.test.ts`，验证第一批工具注册、MCP/HTTP 发现一致性、高风险工具审批和权限元数据。
- 全量测试、构建和本地页面访问验证通过。
- DevTools 新增场景历史，记录最近 8 次 mock Tool Bridge 成功调用、审批决策和失败路径。
- DevTools 历史项支持一键回放，便于重复验证成功链路、`approval.decide`、Connector 不可用、`task.create` 失败等场景。
- 新增 `src/services/devToolsScenarioHistory.ts`，将历史 entry 生成、状态类型和保留数量抽成可测试逻辑。
- `runtimeController` 增加 `devToolsScenarioHistory` 和 `replayDevToolsScenario`，重置会话时会清空历史。
- 新增 `src/services/toolBridgeProviderFactory.ts`，支持通过 `VITE_TOOL_BRIDGE_PROVIDER=mock|mcp|http` 选择 Tool Bridge provider。
- MCP / HTTP provider 目前是接入骨架：复用现有 ToolCall 记录语义，并在新 ToolCall 的 input / output 中标记 `transport`，后续替换真实传输实现。
- `DevToolsPanel` 展示场景历史、状态颜色和回放按钮。
- 新增 `devToolsScenarioHistory.test.ts`，并扩展 `toolBridgeProvider.test.ts` 覆盖 provider 选择和 transport 标记。
- 全量测试、构建和本地页面访问验证通过。

### 2026-05-22

- 并行完成 Tool Bridge Provider 抽象、Hermes/MCP 接入契约细化、Asset Registry provenance 列表摘要三条开发线。
- 新增 `src/services/toolBridgeProvider.ts`，定义 `ToolBridgeProvider`、运行结果、审批结果和失败场景类型。
- `runtimeController` 改为依赖可替换 `ToolBridgeProvider`，默认使用 mock provider，为后续真实 MCP / HTTP provider 接入留出边界。
- `toolBridgeMock.ts` 导出 `mockToolBridgeProvider`，同时保留旧 mock append 函数，兼容现有 UI 和测试。
- 新增 `toolBridgeProvider.test.ts`，覆盖 provider 输入、成功链路、审批决策、失败场景和旧 mock 函数兼容。
- `AssetRegistry` 列表态新增 provenance 摘要，展示 External Hermes、工具名和 `trace_id`，便于从资产列表直接追溯来源。
- `provenance.ts` 增加 Asset Registry 摘要推断与 fallback 文案，`provenance.test.ts` 补充对应测试。
- `20-Hermes-Adapter-Contract.md` 明确第一版采用 MCP 优先、HTTP fallback、Local Bridge 仅作本机开发态能力。
- `05-API-Contracts.md` 补充工具发现、调用、返回、错误模型和审计字段契约。
- `10-Architecture-Decisions.md` 新增 `ADR-2026-05-22-01 Tool Bridge 第一版采用 MCP 优先、HTTP fallback`。
- 全量测试、构建和本地页面访问验证通过。
- 新增 `DevToolsPanel`，将“调试任务 / 模拟调用 / 模拟批准 / 模拟拒绝 / 失败路径”收进开发工具抽屉。
- 顶栏保留只读观察语义，仅保留刷新、重置和开发工具入口。
- `AgentActivityConsole` 增加失败场景入口：Connector 不可用、`task.create` 失败、`approval.decide` 失败。
- `runtimeController` 新增 `simulateExternalToolBridgeFailure`，将失败路径写入外部 Hermes 活动镜像。
- `SkillCapturePanel` 的状态流转接入 `runtimeController`，不再只是本地预览。
- 新增 `provenance.ts`，资产来源链展示 External Hermes -> ToolCall -> Task -> Approval -> Asset -> Trace。
- `AssetDetail` / `ProvenanceChain` 展示 Tool Bridge provenance 来源。
- 新增 `provenance.test.ts`，全量测试与构建验证通过。
- 并行推进 Tool Bridge、SkillCandidate、Audit 三条开发线。
- Tool Bridge mock 新增 `scriptHub.asset.register`，ToolCall output 补齐 asset / provenance / trace / approval 关联。
- Tool Bridge mock 新增失败路径纯函数：Connector 不可用、`task.create` 失败、`approval.decide` 失败。
- `SkillCapturePanel` 增强为技能候选流程面板，展示 source trace、conversation、风险、权限、触发样例和步骤。
- 新增 `skillCandidateTransitions.ts`，支持保存草稿、送审、拒绝、发布的状态流转。
- 新增 `auditEvents.ts`，将 runtime event、External Hermes message、Tool Bridge ToolCall 统一映射为审计事件。
- `AuditPage` 新增来源筛选：Runtime / External Hermes / Tool Bridge。
- `AuditPage` 新增 conversation_id / trace_id / tool_call_id 关键词过滤。
- 审计详情新增关联 Task / Approval / SkillCandidate 可读摘要。
- 新增 `auditEvents.test.ts` 和 `skillCandidateTransitions.test.ts`。
- 全量测试与构建验证通过。
- `AuditPage` 接入外部 Hermes 活动和 ToolCall 审计来源。
- 审计事件表现在合并展示 runtime event、Hermes message 和 Tool Bridge ToolCall。
- 审计详情抽屉新增统一 detail JSON，用于查看 ToolCall input / output / risk / status。
- `App.tsx` 将 `hermesConversation` 的 conversation、messages 和 toolCalls 传入 Audit 页面。
- 审计摘要新增 ToolCall 数量统计。
- 测试与构建验证通过。

### 2026-05-20

- Tool Bridge mock 新增 `scriptHub.approval.decide`，可模拟外部 Hermes 根据用户对话提交批准或拒绝。
- `simulateExternalApprovalDecision` 复用现有审批 runtime 逻辑，更新 Approval、Task、Session、Trace 相关状态。
- `AgentActivityConsole` 的开发态 mock 增加“模拟批准 / 模拟拒绝”入口。
- ToolCall 详情现在可查看审批决策 input / output / error。
- `hermesConversation.test.ts` 增加 approval Tool Bridge 决策记录测试。
- Tool Bridge mock 开始调用真实 runtime adapter：`scriptHub.connector.health.get` 对接 Connector health，`scriptHub.task.create` 对接任务创建。
- `simulateExternalToolBridge` 现在会更新 Connector、Task、Approval 和 Session 状态，并将真实输出写入 ToolCall。
- `ToolCallTimeline` 支持点击查看详情，新增 ToolCall input / output / error / trace / conversation 抽屉。
- `toolBridgeMock.ts` 新增 runtime-backed ToolCall 归档能力和默认外部 Hermes 任务输入。
- `hermesConversation.test.ts` 增加 runtime-backed Tool Bridge 结果测试。
- 将前端主入口从可输入的 `HermesConsole` 改为只读 `AgentActivityConsole`。
- 删除正式聊天输入框，改为外部 Hermes 活动镜像说明。
- 新增 `src/services/toolBridgeMock.ts`，模拟外部 Hermes 调用 ScriptHub Tool Bridge。
- `HermesWorkspace` 改为组合 `AgentActivityConsole`、`ToolCallTimeline` 和 `SkillCapturePanel`。
- 侧边栏文案从“Hermer 对话”调整为“Agent 活动”，顶栏标题调整为“Agent 活动控制台”。
- 顶栏“处理审批”调整为“查看审批”，避免误导为正式执行入口。
- 更新 `hermesConversation.test.ts`，覆盖外部 Hermes Tool Bridge 调用镜像和技能候选更新。
- 同步修改产品骨架文档：PRD、交互规范、场景库、API 契约、MVP 交付计划、前端骨架、模块边界和 FBX 闭环文档。
- 明确 ScriptHub 不内置正式主聊天入口；当前 Hermes 输入框后续应改为外部 Hermes 活动镜像或调试 mock。
- 明确默认首页后续应从 `HermesConsole` 调整为 `AgentActivityConsole` / `HermesActivityConsole`。
- 明确正式流程由外部 Hermes 通过 Tool Bridge 推进，ScriptHub UI 以只读观察、治理、审计和技能沉淀为主。
- 新增 Hermes 对话 MVP 骨架：`HermesConsole`、`ToolCallTimeline`、`SkillCapturePanel`、`HermesWorkspace`。
- 新增 `src/services/hermesConversation.ts`，定义 `HermesConversation`、`HermesMessage`、`ToolCallRecord`、`SkillCandidate` 和 mock 对话状态。
- `useRuntimeController` 新增 Hermes 对话状态和 `sendHermesMessage` 动作。
- `App.tsx` 新增 `Hermes 对话` 导航，并将默认入口切换为 Hermes 工作台。
- 顶栏“新建任务”调整为“调试任务”，保留结构化任务创建作为 fallback。
- 新增 `hermesConversation.test.ts`，覆盖用户消息写入、Hermes 回复、工具调用记录和技能候选更新。
- `06-Data-Model.md` 补充 Hermes 对话、工具调用和技能候选对象关系。
- 明确新的 Hermes 接入方向：Hermes 是外部对话式操作中枢，ScriptHub 是平台能力层、执行记录层和技能沉淀层。
- 重写 `20-Hermes-Adapter-Contract.md`，将原“前端发任务给 Hermes”的口径调整为“Hermes 通过 ScriptHub Tool API 操作平台”。
- 明确现有 `submitTask`、`decideApproval`、`getConnectorHealth`、`listCapabilities`、`runtimeEvents` 将作为平台工具底层能力继续复用。
- 将 `CreateTaskPanel` 定位为结构化调试入口，后续主入口应切换到 `AgentActivityConsole` / `HermesActivityConsole`。
- 下一阶段开发优先级调整为：Hermes 对话控制台、工具调用时间线、技能捕获面板、conversation / trace 串联。
- `useRuntimeController` 新增 `connectorError`、`taskError`、`approvalError`。
- Connector health / control、task dispatch、approval decision 请求失败时会记录错误并通过 toast + 对应页面展示。
- `CreateTaskPanel` 在任务提交失败时保持打开，避免丢失用户输入上下文。
- `ConnectorPanel`、`CreateTaskPanel`、`ReviewApproval` 增加对应失败横幅。
- 测试与构建验证通过。
- Hermes adapter 已实现 `POST /approvals/{id}/decision`，将直接响应或 `{ approval }` 包裹响应归一化为 `Approval`。
- Approval decision 支持缺省字段补齐：`status`、`reviewed_by`、`reviewed_at`、`updated_at`、`decision_note`。
- `hermesAdapter.test.ts` 增加 approval decision 直接响应、包裹响应补齐和请求失败测试。
- 测试与构建验证通过。
- Hermes adapter 已实现 `POST /tasks`，将 task dispatch 响应归一化为 `Task + Approval`。
- Task dispatch 支持完整响应和部分响应补齐，缺省时生成 pending approval。
- `hermesAdapter.test.ts` 增加 task dispatch 完整响应、缺省字段补齐和请求失败测试。
- 测试与构建验证通过。
- 扩展 `runtimeTransitions.test.ts`，新增任务完成、会话重置、能力刷新成功/空列表/失败、Connector health 刷新测试。
- 新增 `applyCapabilitiesRefreshState`、`applyCapabilitiesRefreshErrorState`、`applyConnectorHealthRefreshState`，controller 已复用这些状态迁移函数。
- 测试与构建验证通过。
- `runtimeEvents.ts` 扩展为可替换事件流接口，支持 `getSnapshot`、`pollSnapshot` 和 `subscribe`。
- 新增 `createPollingRuntimeEventStream`，支持 `GET /events?task_id=&trace_id=`，兼容数组响应和 `{ events: [] }` 包裹响应。
- `runtimeController` 向事件流传入 `taskId` 和 `traceId`。
- 新增 `runtimeEvents.test.ts`，覆盖 mock snapshot、mock subscribe、轮询成功、wrapped response 和请求失败。
- 测试与构建验证通过。
- `useRuntimeController` 新增 `capabilityError`，`refreshCapabilities` 现在会捕获接口失败并保留旧能力列表。
- `CapabilityRegistry` 增加 capability discovery 的空列表、刷新失败和不可用能力状态展示。
- `CreateTaskPanel` 增加能力刷新失败和无可用 skill 能力提示。
- 测试与构建验证通过。
- Hermes adapter 已实现 `GET /capabilities`，支持数组响应和 `{ capabilities: [] }` 包裹响应。
- Capability discovery 响应会归一化为 `CapabilityManifest[]`，并为缺省字段提供 MVP 默认值。
- `hermesAdapter.test.ts` 增加 capability discovery 成功、缺省字段补齐和请求失败测试。
- 测试与构建验证通过。
- 新增 `src/services/hermesAdapter.ts`，建立首个 Hermes adapter 骨架。
- `runtimeAdapter` 支持通过 `VITE_HERMES_BASE_URL` 在 mock adapter 和 Hermes adapter 间切换。
- Hermes adapter 已实现 `GET /connectors/maya/health` 的 Connector health 归一化。
- 新增 `hermesAdapter.test.ts`，覆盖 Connector health 响应归一化和请求失败。
- 测试与构建验证通过。
- 引入 Vitest 并新增 `npm test`。
- 新增 `runtimeTransitions.ts`，将审批、Connector 状态、任务完成、失败模拟、恢复动作、重置等状态迁移抽成纯函数。
- `runtimeController.ts` 改为复用 runtime transition 函数。
- 新增 `runtimeTransitions.test.ts`，覆盖审批、Connector 断开、失败恢复等关键路径。
- 测试与构建验证通过。
- `CreateTaskPanel` 的能力下拉改为使用 controller 提供的 `capabilities`，不再直接读取静态 mock capability 列表。
- capability discovery 在能力库和任务创建入口已共享同一份 adapter 数据源。
- 构建验证通过。
- `ConnectorPanel` 增加“刷新健康状态”动作，并接入 `useRuntimeController.refreshConnectorHealth` / `getConnectorHealth`。
- `CapabilityRegistry` 改为接收 controller 提供的 capability 数据，并增加“刷新能力”动作，对接 `listCapabilities`。
- `useRuntimeController` 新增 `capabilities` 状态、`refreshCapabilities` 和 `refreshConnectorHealth`。
- 更新 Hermes adapter contract 文档中的 UI 对接状态。
- 构建验证通过。
- 扩展 `RuntimeAdapter` contract，增加 `getConnectorHealth`、`listCapabilities`、明确 `SubmitTaskResult` 和 `ApprovalDecision`。
- 新增 `runtimeEvents.ts`，将 mock `events(...)` 从 `runtimeController` 中抽离。
- 新增 `20-Hermes-Adapter-Contract.md` 并挂到文档总目录。
- 更新模块边界文档，说明 controller、adapter 和 event stream 的职责。
- 构建验证通过。
- 拆出 `Dashboard` 和内部 `AssetMini` 到 `src/modules/dashboard/Dashboard.tsx`。
- 新增 `useRuntimeController` 到 `src/services/runtimeController.ts`。
- 将 `App.tsx` 中的创建任务、审批、Connector 切换、任务完成、失败模拟、恢复动作、会话重置和快照保存收敛到 runtime controller。
- `App.tsx` 当前只保留路由、角色、任务抽屉开关和页面编排。
- 构建验证通过。
- 拆出 `CreateTaskPanel` 到 `src/modules/tasks/CreateTaskPanel.tsx`。
- 拆出 `TaskList` 到 `src/modules/tasks/TaskList.tsx`。
- 拆出 `AuditPage` 和内部 `EventDrawer` 到 `src/modules/audit/AuditPage.tsx`。
- 清理 `App.tsx` 中对应的任务入口和审计入口实现。
- 构建验证通过。
- 拆出 `ReviewApproval` 到 `src/modules/approvals/ReviewApproval.tsx`。
- 拆出 `TaskDetail` 和内部 `ErrorCard` 到 `src/modules/tasks/TaskDetail.tsx`。
- 拆出 `WorkflowPage` 和 workflow node state 判断到 `src/modules/workflow/WorkflowPage.tsx`。
- 清理 `App.tsx` 中对应的内联实现。
- 构建验证通过。

### 2026-05-19

- 拆出 `ConnectorPanel` 到 `src/modules/connectors/ConnectorPanel.tsx`。
- 拆出 `CapabilityRegistry` 到 `src/modules/capabilities/CapabilityRegistry.tsx`。
- 新增 Runtime Adapter 边界。
- 新增 `18-Frontend-Module-Boundaries.md`。
- 拆出 `PolicySettings`、`StateMachinePage`、`EvaluationDashboard` 和资产模块。
- 构建验证通过。

## 4. 当前代码状态

`App.tsx` 当前仍保留：

- 路由编排。
- 角色选择。
- 任务抽屉开关。
- 页面之间的导航动作。

运行态已经收敛到 `src/services/runtimeController.ts`。

## 5. 下一步建议

优先推进：

1. 换到新电脑后，先按 `23-Project-Migration-Handoff.md` 跑通安装、测试、构建、前端、Tool Bridge demo 和 Maya Connector fixture demo。
2. 如果新电脑有 Maya，继续跑 `npm run maya-connector:real-smoke`，确认 mayapy、`fbxmaya` 插件和真实 FBX 写入权限可用。
3. 用真实 Maya Connector 服务跑一次前端触发的端到端导出：工具中心点击执行 -> `/export/fbx` -> Agent Activity -> Audit -> Asset。
4. 增加 HTTP Connector 的真实命令模式诊断事件：记录当前 mode、mayapy 路径、selection count、export bytes、失败码和 `repair_suggestion`。
5. 给本地 ToolCall store 增加简单清理 / 归档策略，避免开发期记录无限增长。
6. 将 Connector 的 selection / export 事件写入审计或诊断事件，便于后续追踪外部 Hermes 调用、DCC 执行和产物登记是否完整。
7. 让回放前检查项接入 Connector 的真实文件存在性和真实 DCC 当前选择，执行前提示覆盖、空选择和路径变化。

## 6. 验证记录

最近一次验证：

- `npm run build`：通过。
- `npm test -- --run`：通过，19 个测试文件，101 个测试。
- `node --check scripts/tool-bridge-http-server.mjs`：通过。
- `node --check scripts/maya-connector-http-server.mjs`：通过。
- `node --check scripts/maya-connector-http-demo.mjs`：通过。
- `node --check scripts/maya-connector-repair-suggestions.mjs`：通过。
- `node --check scripts/maya-connector-real-smoke.mjs`：通过。
- `python -m py_compile scripts/maya_connector_command.py`：通过。
- Maya Connector 修复建议验证：通过，`invalid_output_path` 返回 `revise_output_path`，`maya_python_unavailable` 返回 `switch_to_mayapy`。
- 工具小窗 / 运行历史修复建议模型验证：通过，失败历史详情可读取 `repairSuggestion`。
- Maya Connector HTTP 前端同步验证：通过，健康 / 选择成功时记录 mode 和 selection count；选择失败时保留真实 `repair_suggestion`。
- Maya Connector `/export/fbx` 前端服务验证：通过，成功时规范化产物；失败时保留真实 `repair_suggestion`。
- Maya Connector 导出审计验证：通过，失败 ToolCall 会在 Audit detail 中保留 `repair_suggestion`。
- 项目迁移交接文档：已补充，包含换电脑文件清单、依赖、启动顺序、环境变量、验收清单和常见问题。
- Maya Connector HTTP 最小链路验证：通过，读取 2 个选择对象，创建 1 条 `scriptHub.task.create`，写出 1 个 FBX 占位文件，登记 1 条 `scriptHub.asset.register`。
- Maya Python 命令桥错误验证：通过，普通 Python 环境返回 `maya_python_unavailable`，服务不崩溃。
- Maya Python 真实 smoke test：通过，`mayapy.exe` 导出真实 FBX，文件大小 21616 bytes。
- HTTP ToolCall 文件持久化重启恢复验证：通过，重启前后均可读回 2 条调用。
- `npm run tool-bridge:server` + `npm run tool-bridge:demo`：通过，生成 `scriptHub.task.create` 和 `scriptHub.asset.register` 两条外部 HTTP ToolCall。
- `http://127.0.0.1:5173/`：返回 `200`。

## 7. 维护规则

- 每次完成代码变更后更新本文。
- 记录只写有用事实，不写聊天过程。
- 最近变更按日期倒序追加。
- 若下一步建议变化，及时更新第 5 节。
