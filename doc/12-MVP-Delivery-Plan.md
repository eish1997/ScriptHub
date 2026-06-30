# MVP 开发计划

## 0. 文档控制

- 版本：v0.1
- 状态：Draft
- 用途：定义第一阶段最小可交付范围、开发顺序和验收门槛
- 适用对象：产品、设计、研发、测试、AI agent
- 单一来源：本文件
- 规范级别：MUST / SHOULD / MAY

## 1. 目标

第一阶段的目标不是做完整平台，而是先打通一个可验证的最小闭环：

用户在外部 Hermes 表达意图 -> Hermes 调用 ScriptHub Tool Bridge -> ScriptHub 记录 ToolCall / Trace -> Connector 执行 -> 控制台同步状态 -> 资产与技能候选沉淀

## 2. MVP 范围

### 2.1 必做

- Agent Activity Console / Hermes 活动控制台
- 任务中心
- 任务详情页
- Trace / Review / Approval
- 连接器面板
- 资产详情页
- 事件与审计
- 基础配置与权限
- Tool Bridge mock
- Hermes 外部调用模拟
- 技能候选记录

### 2.2 暂缓

- 多 Agent 协同
- 复制 Hermes 长期记忆
- 自动工作流生成优化
- 复杂推荐系统
- 资产市场化管理

## 3. 开发顺序

### 阶段 A：只读控制台骨架

- 建立页面路由
- 建立基础布局
- 建立全局状态模型
- 建立 Agent Activity Console、ToolCallTimeline、SkillCapturePanel
- 将正式用户操作从 UI 主流程降级为观察和调试

### 阶段 B：Tool Bridge mock

- 定义外部 Hermes 可调用工具
- 模拟 Hermes 调用 `task.create`、`connector.health.get`、`approval.request`
- 每次 ToolCall 写入 Event / Trace
- 前端只订阅和展示结果

### 阶段 C：Hermes 外部调用模拟

- 模拟外部 Hermes 发起一条完整导出链路
- 审批确认优先通过 Hermes 对话来源进入系统
- 控制台展示当前 conversation、trace、tool_call 和 task 状态
- 支持失败与恢复状态展示

### 阶段 D：能力沉淀

- Skill Candidate 列表
- Tool 列表
- Connector 状态
- 技能候选审核、拒绝、发布记录

## 4. 每阶段验收

### 4.1 阶段 A 验收

- 页面可以打开
- 导航清晰
- 主结构完整
- 空态正常
- 默认首页是只读 Hermes 活动控制台

### 4.2 阶段 B 验收

- 能通过 mock Tool Bridge 创建一个任务
- 能看到 Hermes 工具调用记录
- 能看到计划和审批请求
- UI 不要求手动推进正式任务流程

### 4.3 阶段 C 验收

- 能查看事件流
- 能查看 Trace
- 能查看审计记录
- 能追溯资产来源
- 能按 conversation_id 串联 Hermes 来源

### 4.4 阶段 D 验收

- 能看到能力与连接器状态
- 能区分版本
- 能看到发布历史
- 能看到从 trace 沉淀出的 Skill Candidate

## 5. 风险控制

- 不允许先做漂亮 UI 再补契约
- 不允许先做自动化再补审批
- 不允许先做功能堆叠再补状态机
- 不允许先做脚本执行再补资产模型
- 不允许把 ScriptHub 做成绕过 Hermes 的主操作入口

## 6. 交付物

- 可运行的前端骨架
- 可验证的外部 Hermes ToolCall 闭环
- 可查看的事件与审计
- 可追溯的资产页面
- 可维护的基础契约
- 可审核的技能候选记录
