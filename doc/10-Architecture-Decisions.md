# 架构决策记录

## 0. 文档控制

- 版本：v0.2
- 状态：Draft
- 用途：定义本文件的职责、范围与使用方式
- 适用对象：产品、设计、研发、测试、运维
- 单一来源：本文件
- 规范等级：MUST / SHOULD / MAY



## 1. 用途

记录关键架构取舍，避免后期多人协作时忘记为什么这样设计。

## 2. 记录模板

- 决策标题
- 决策日期
- 背景
- 备选方案
- 选定方案
- 决策原因
- 影响范围
- 后续复审条件

## 3. 当前建议先记录的决策

### ADR-2026-05-20-01 Hermes 是外部对话式操作中枢

- 决策日期：2026-05-20
- 状态：Accepted
- 背景：原 MVP 文档和代码逐步形成了“前端提交结构化任务，Hermes / Runtime 执行任务”的接入模型。但产品目标已调整为：用户直接与外部 Hermes 对话，Hermes 操作 ScriptHub 平台能力，平台自动记录过程并沉淀技能。
- 备选方案：
  - 方案 A：继续以表单和任务面板为主入口，Hermes 只作为后端 runtime。
  - 方案 B：以外部 Hermes 对话为主入口，ScriptHub 作为平台工具、执行记录、审计和技能沉淀层。
- 选定方案：方案 B。
- 决策原因：
  - 用户意图更自然地来自对话，而不是固定表单。
  - 技能沉淀需要完整记录 Hermes 的规划、工具调用、失败处理和人工确认过程。
  - ScriptHub 的长期价值在于把一次次执行沉淀为可复用、可审计、可评估的技能资产。
- 影响范围：
  - 前端主入口应新增 `AgentActivityConsole` / `HermesActivityConsole`，用于只读镜像外部 Hermes 活动。
  - ScriptHub 不内置正式主聊天入口。
  - 任务创建表单降级为结构化调试入口。
  - `runtimeAdapter` / `hermesAdapter` 后续应重新定位为 ScriptHub Tool Bridge。
  - Capability Registry 应升级为 Hermes 可发现的工具 / 技能目录。
  - Audit、Workflow、Evaluation 页面应服务于对话回放和技能评估。
- 后续复审条件：
  - 外部 Hermes Tool Bridge 协议确定后复审工具调用协议。
  - 第一版技能沉淀闭环完成后复审 SkillCandidate 数据结构。
  - 如果真实执行端无法支持工具级 trace，再复审事件模型。

### 3.1 Brain 可替换

### 3.2 Runtime 是长期稳定资产

### 3.3 所有能力必须 Tool 化

### 3.4 Skill 是资产，不是脚本

### 3.5 所有行为必须 Event 化

### 3.6 Workflow 是显式图

### 3.7 Connector 是执行适配器

### ADR-2026-05-22-01 Tool Bridge 第一版采用 MCP 优先、HTTP fallback

- 决策日期：2026-05-22
- 状态：Accepted
- 背景：ScriptHub 需要作为外部 Hermes 可调用的平台工具层。真实接入时存在多种传输候选：MCP 更贴近 Agent 工具发现和调用语义；HTTP 更利于调试、网关接入和兼容；local bridge 适合本机 DCC / Connector 场景。第一版必须明确主路径，避免实现阶段出现多套不一致契约。
- 备选方案：
  - 方案 A：只支持 HTTP API。实现简单，但需要自行定义工具发现语义，长期容易与 Agent 工具体系脱节。
  - 方案 B：只支持 MCP。语义统一，但会阻塞暂不具备 MCP client 能力的 Hermes 运行环境和开发调试。
  - 方案 C：MCP 优先，HTTP fallback，共享同一份工具 descriptor、调用 request、调用 result、错误模型和审计字段。
  - 方案 D：优先 local bridge。适合本机调试，但不适合作为外部 Hermes 正式主入口。
- 选定方案：方案 C。
- 决策原因：
  - MCP 天然覆盖工具发现和工具调用，是外部 Hermes 接入 ScriptHub Tool Bridge 的长期主路径。
  - HTTP fallback 能降低第一版联调风险，支持契约测试、调试、网关和 MCP 不可用场景。
  - local bridge 保留为本机 DCC / Connector 开发态能力，但不得绕过 ScriptHub 审计和 trace。
  - 共享一套工具语义可以避免 MCP 与 HTTP 形成双份契约。
- 影响范围：
  - `doc/20-Hermes-Adapter-Contract.md` 必须定义 MCP、HTTP、local bridge 三种传输候选及共享字段。
  - `doc/05-API-Contracts.md` 必须把工具发现、调用、返回、错误和审计字段作为可测试契约。
  - 后续实现 Tool Bridge 时，应优先实现 MCP server 能力，同时提供 HTTP fallback 路由。
  - 所有传输进入 ScriptHub 后都必须写入 `ToolCallRecord`、`Event`、`Audit`，并关联 `trace_id`。
- 后续复审条件：
  - Hermes 端 MCP client 能力不可用或不稳定时，复审是否临时提升 HTTP 为主路径。
  - MCP 与 HTTP schema 一致性测试无法稳定通过时，复审工具 descriptor 的单一来源。
  - local bridge 需要进入生产路径时，复审权限、鉴权、进程生命周期和本地安全边界。

## 4. 建议用法

- 每次重大改动先写 ADR
- 每次架构争议先对齐 ADR
- 每次版本升级先检查 ADR

## 5. 当前应优先记录的决策清单

- Brain 是可替换认知层
- Runtime 是长期稳定资产
- 所有能力必须 Tool 化
- Skill 是可复用资产，不是脚本
- Workflow 必须显式建模
- Event 必须可追踪
- Connector 只做执行适配
- 高风险操作必须审批

## 6. 决策复审建议

- 每个 ADR 都要有复审时间
- 每个 ADR 都要标明影响范围
- 每个 ADR 都要能链接到对应文档章节


