# 数据模型

## 0. 文档控制

- 版本：v0.2
- 状态：Draft
- 用途：定义本文件的职责、范围与使用方式
- 适用对象：产品、设计、研发、测试、运维
- 单一来源：本文件
- 规范等级：MUST / SHOULD / MAY



## 1. 目标

统一系统对象，方便持久化、审计、回放、权限和版本治理。

## 2. 核心对象

### 2.1 Session

- 一次连续交互的运行环境
- 包含上下文、权限、临时状态

### 2.2 Task

- 一次明确的生产任务
- 有状态机、有目标、有结果

### 2.3 Skill

- 可复用的能力抽象
- 有 manifest、版本、输入输出、标签

### 2.4 Tool

- 可调用的结构化能力
- 与 Connector 执行映射

### 2.5 Workflow

- Skill / Tool / Approval / Condition 组成的显式图

### 2.6 Event

- 系统行为流中的不可变记录

### 2.7 Artifact / Asset

- 生产结果或中间产物
- 具有来源链、版本、发布状态

### 2.8 Connector

- 适配具体 DCC 的执行器

### 2.9 Approval

- 审批记录、审批人、审批策略、审批结果

### 2.10 Trace

- 一次执行链的可回放轨迹

### 2.11 HermesConversation

- 用户与 Hermes 的一次自然语言协作
- 负责串联 Message、ToolCall、Trace 和 SkillCandidate
- 是后续 UI 的主入口对象

### 2.12 HermesMessage

- 对话中的单条消息
- role 可为 user、hermes、system、tool
- tool 消息必须关联 tool_call_id

### 2.13 ToolCallRecord

- Hermes 调用 ScriptHub 平台工具的结构化记录
- 后续审计、审批、回放、技能沉淀都应以 ToolCall 为核心对象
- 每条记录必须关联 conversation_id 和 trace_id

### 2.14 SkillCandidate

- 从一次或多次对话执行中沉淀出的技能候选
- 第一阶段必须保持 draft / reviewing 状态，不自动发布
- 发布前需要人工确认名称、触发样例、步骤、权限和失败处理

## 3. 必须统一的字段

- id
- type
- version
- status
- owner
- scope
- created_at
- updated_at
- trace_id

## 4. 关系建议

- Session 包含多个 Task
- Task 关联多个 Event
- Task 可产出多个 Artifact
- Workflow 引用多个 Skill / Tool
- Trace 串联 Event / Approval / Artifact

## 5. 推荐补充

- 状态转换表
- 持久化边界表
- 归档策略表

## 6. 对象生命周期建议

### 6.1 Session

- created
- active
- idle
- closed
- archived

### 6.2 Task

- draft
- planned
- waiting_approval
- running
- paused
- succeeded
- failed
- canceled
- archived

### 6.3 Skill / Tool / Connector

- draft
- registered
- validated
- available
- deprecated
- disabled
- retired

## 7. 持久化建议

- Session / Task / Event / Approval / Artifact 必须持久化
- Skill / Tool / Connector 元数据必须持久化
- 临时上下文可短期保留
- 回放所需数据必须可恢复

## 8. 数据关联建议

- Task 关联多个 Event
- Event 可指向一个 Task、Skill、Tool 或 Connector
- Artifact 必须能追溯来源 Task 和 Trace
- Approval 必须能关联风险说明和事件
- HermesConversation 关联多个 HermesMessage、ToolCallRecord 和 SkillCandidate
- ToolCallRecord 关联 Task、Approval、Asset 或 Event
- SkillCandidate 通过 source_conversation_id 和 source_trace_id 追溯来源

## 9. 推荐补充字段

- visibility
- recoverable
- audit_level
- risk_level
- parent_id
- source_id
## 10. 字段级模板

| 字段 | 含义 | 说明 |
| --- | --- | --- |
| id | 唯一标识 | MUST |
| type | 对象类型 | MUST |
| version | 对象版本 | MUST |
| status | 当前状态 | MUST |
| owner | 所有者 | SHOULD |
| scope | 作用域 | SHOULD |
| trace_id | 追踪标识 | SHOULD |
| created_at | 创建时间 | MUST |
| updated_at | 更新时间 | MUST |

## 11. 持久化边界

- 必须持久化：Task / Event / Approval / Artifact / Trace
- 应当持久化：Skill / Tool / Connector 元数据
- 可短期保留：临时上下文、界面草稿、预览缓存
- 不应长期持久化：一次性推理中间态




