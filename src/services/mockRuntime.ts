export type Task = {
  id: string;
  type: 'task';
  version: string;
  status: 'planned' | 'waiting_approval' | 'running' | 'succeeded' | 'failed' | 'canceled';
  goal: string;
  description: string;
  owner: string;
  scope: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled';
  connector_id: string;
  plan_id: string;
  artifact_ids: string[];
  event_ids: string[];
  created_at: string;
  updated_at: string;
  trace_id: string;
  metadata: {
    capability_id: string;
    output_path: string;
    overwrite: boolean;
  };
};

export type Approval = {
  id: string;
  type: 'approval';
  version: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled';
  target_type: 'task';
  target_id: string;
  risk_level: 'high';
  reason: string;
  impact_scope: string;
  requested_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  decision_note?: string;
  created_at: string;
  updated_at: string;
  trace_id: string;
  event_ids: string[];
};

export type RuntimeEvent = {
  id: string;
  type: 'event';
  version: string;
  event_type: string;
  source: string;
  target_type: string;
  target_id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'audit';
  message: string;
  occurred_at: string;
  trace_id: string;
};

export type AssetStatus = 'created' | 'validated' | 'published' | 'archived';

export type AssetRecord = {
  id: string;
  type: 'asset';
  version: string;
  status: AssetStatus;
  name: string;
  asset_type: 'fbx';
  storage_uri: string;
  source_uri: string;
  generated_by: string;
  task_id: string;
  approval_status: Approval['status'];
  created_at: string;
  updated_at: string;
  trace_id: string;
};

export type AssetVersion = {
  version: string;
  status: AssetStatus;
  storage_uri: string;
  created_at: string;
  note: string;
};

export type EvaluationCaseStatus = 'passed' | 'failed' | 'needs_review' | 'blocked';

export type EvaluationCase = {
  id: string;
  name: string;
  scenario: string;
  status: EvaluationCaseStatus;
  expected: string;
  observed: string;
  linked_capability: string;
};

export type QualityGate = {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
};

export type RuntimeRole = 'operator' | 'approver' | 'admin' | 'observer';

export type Permission = 'task.create' | 'approval.decide' | 'session.reset' | 'asset.publish' | 'runtime.read';

export type PolicyRule = {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny' | 'require_approval' | 'audit';
  applies_to: string;
  evidence: string;
};

export type Connector = {
  id: string;
  type: 'connector';
  version: string;
  status: 'connected' | 'disconnected' | 'degraded';
  name: string;
  target: 'maya';
  health: {
    state: 'healthy' | 'unavailable' | 'degraded';
    latency_ms?: number;
    last_error?: string;
    checked_at: string;
  };
  capabilities: string[];
  created_at: string;
  updated_at: string;
  trace_id: string;
};

export type FailureKind = 'maya_timeout' | 'output_conflict' | 'empty_selection' | 'uncertain_result';

export type RuntimeError = {
  code: string;
  type:
    | 'validation_error'
    | 'timeout_error'
    | 'conflict_error'
    | 'incomplete_result';
  title: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  requires_human_review: boolean;
  suggested_action: string;
  trace_id: string;
};

export type Session = {
  id: string;
  type: 'session';
  version: string;
  status: 'active' | 'restored' | 'reset';
  created_at: string;
  updated_at: string;
  restored_count: number;
  task_id: string;
  trace_id: string;
};

export type CapabilityKind = 'skill' | 'tool';

export type CapabilityManifest = {
  id: string;
  type: CapabilityKind;
  name: string;
  version: string;
  status: 'validated' | 'available' | 'disabled' | 'deprecated';
  description: string;
  connector_target: Connector['target'];
  connector_capability: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  permissions: string[];
  risk_level: Task['risk_level'];
  requires_confirmation: boolean;
  lifecycle: 'registered' | 'validated' | 'available' | 'retired';
  tags: string[];
};

export type WorkflowNodeKind = 'start' | 'tool' | 'check' | 'approval' | 'asset' | 'end';

export type WorkflowNode = {
  id: string;
  label: string;
  kind: WorkflowNodeKind;
  capability_id?: string;
  risk_level: Task['risk_level'];
  requires_confirmation: boolean;
  failure_policy: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
};

export type WorkflowEdge = {
  from: string;
  to: string;
  label: string;
  kind: 'sequence' | 'approval' | 'failure' | 'recovery';
};

const now = '2026-05-19T10:40:00.000Z';
const taskIdSeed = 'task_fbx_export_001';
const traceIdSeed = 'trace_fbx_export_001';

export const session: Session = {
  id: 'session_demo_001',
  type: 'session',
  version: '0.1.0',
  status: 'active',
  created_at: now,
  updated_at: now,
  restored_count: 0,
  task_id: taskIdSeed,
  trace_id: traceIdSeed,
};

export const task: Task = {
  id: taskIdSeed,
  type: 'task',
  version: '0.1.0',
  status: 'planned',
  goal: '把当前 Maya 里选中的模型导出成 FBX',
  description: '读取 Maya 当前选择，写入项目 exports 目录，并记录来源链。',
  owner: 'pipeline.operator',
  scope: 'project.demo',
  risk_level: 'high',
  approval_status: 'pending',
  connector_id: 'connector_maya_local',
  plan_id: 'plan_fbx_export_001',
  artifact_ids: ['asset_selected_fbx_001'],
  event_ids: ['evt_001', 'evt_002', 'evt_003'],
  created_at: now,
  updated_at: now,
  trace_id: traceIdSeed,
  metadata: {
    capability_id: 'maya.export_fbx.v1',
    output_path: 'project://exports/selected_asset.fbx',
    overwrite: false,
  },
};

export const approval: Approval = {
  id: 'approval_fbx_export_001',
  type: 'approval',
  version: '0.1.0',
  status: 'pending',
  target_type: 'task',
  target_id: task.id,
  risk_level: 'high',
  reason: '该操作会向文件系统写入 FBX，并可能与现有文件产生冲突。',
  impact_scope: `${task.metadata.output_path}；不会修改 Maya 原始场景。`,
  requested_by: 'runtime',
  created_at: now,
  updated_at: now,
  trace_id: task.trace_id,
  event_ids: ['evt_003'],
};

export const asset: AssetRecord = {
  id: 'asset_selected_fbx_001',
  type: 'asset',
  version: '1.0.0',
  status: 'created',
  name: 'selected_asset.fbx',
  asset_type: 'fbx',
  storage_uri: 'project://exports/selected_asset.fbx',
  source_uri: 'maya://current_selection',
  generated_by: 'asset.export.fbx',
  task_id: task.id,
  approval_status: 'approved',
  created_at: now,
  updated_at: now,
  trace_id: task.trace_id,
};

export const assetVersions: AssetVersion[] = [
  {
    version: '1.0.0',
    status: 'created',
    storage_uri: 'project://exports/selected_asset.fbx',
    created_at: now,
    note: '首次导出结果',
  },
  {
    version: '1.0.1',
    status: 'validated',
    storage_uri: 'project://exports/selected_asset_validated.fbx',
    created_at: now,
    note: '基础校验通过',
  },
  {
    version: '1.0.2',
    status: 'published',
    storage_uri: 'project://published/selected_asset.fbx',
    created_at: now,
    note: '发布到项目资产目录',
  },
];

export const evaluationCases: EvaluationCase[] = [
  {
    id: 'case_normal_export',
    name: '正常导出',
    scenario: '选中 mesh，审批通过，Connector 正常',
    status: 'passed',
    expected: 'Task 成功并生成 Asset',
    observed: 'Trace 可回放，Asset 已记录',
    linked_capability: 'maya.export_fbx.v1',
  },
  {
    id: 'case_empty_selection',
    name: '无选择对象',
    scenario: 'Maya 当前选择为空',
    status: 'needs_review',
    expected: '返回 validation_error',
    observed: '任务进入 failed，并提供人工复核',
    linked_capability: 'maya.current_selection',
  },
  {
    id: 'case_output_conflict',
    name: '输出路径冲突',
    scenario: '目标 FBX 已存在且不允许覆盖',
    status: 'passed',
    expected: '返回 conflict_error 并允许修改路径',
    observed: '恢复路径可回到 planned',
    linked_capability: 'asset.export.fbx',
  },
  {
    id: 'case_connector_down',
    name: 'Connector 断线',
    scenario: 'Maya Connector unavailable',
    status: 'passed',
    expected: '阻止审批执行和 Tool 调度',
    observed: 'Approval 批准被禁用，节点 blocked',
    linked_capability: 'dcc.session.health',
  },
  {
    id: 'case_maya_timeout',
    name: 'Maya 超时',
    scenario: 'Connector 等待 Maya 返回超时',
    status: 'passed',
    expected: '返回 timeout_error 并允许重试',
    observed: '任务可重试并保留 Trace',
    linked_capability: 'asset.export.fbx',
  },
  {
    id: 'case_uncertain_result',
    name: '结果不确定',
    scenario: 'Connector 返回路径但 Asset 完整性不确定',
    status: 'needs_review',
    expected: '进入人工复核',
    observed: '可人工复核通过并恢复执行',
    linked_capability: 'asset.export.fbx',
  },
  {
    id: 'case_approval_rejected',
    name: '审批拒绝',
    scenario: '审批人拒绝文件写入',
    status: 'blocked',
    expected: 'Task 取消并保留审计',
    observed: 'Approval 事件进入 audit 流',
    linked_capability: 'maya.export_fbx.v1',
  },
];

export const qualityGates: QualityGate[] = [
  {
    id: 'gate_trace_required',
    label: '必须有 Trace',
    passed: true,
    evidence: 'Session、Task、Event、Asset 都挂接 trace_id',
  },
  {
    id: 'gate_approval_required',
    label: '高风险动作必须审批',
    passed: true,
    evidence: 'FBX 导出 requires_confirmation=true',
  },
  {
    id: 'gate_failure_explained',
    label: '失败必须可恢复或可解释',
    passed: true,
    evidence: 'RuntimeError 包含 recoverable、retryable、suggested_action',
  },
  {
    id: 'gate_asset_traceable',
    label: 'Asset 必须可追溯',
    passed: true,
    evidence: 'Asset 详情显示 Task、Workflow、Skill、Tool、Approval、Trace',
  },
  {
    id: 'gate_connector_blocks_execution',
    label: 'Connector 断开必须阻止执行',
    passed: true,
    evidence: '断开后审批批准禁用，Workflow 节点 blocked',
  },
];

export const rolePermissions: Record<RuntimeRole, Permission[]> = {
  operator: ['task.create', 'runtime.read'],
  approver: ['approval.decide', 'runtime.read'],
  admin: ['task.create', 'approval.decide', 'session.reset', 'asset.publish', 'runtime.read'],
  observer: ['runtime.read'],
};

export const policyRules: PolicyRule[] = [
  {
    id: 'policy.high_risk_requires_approval',
    name: '高风险 Tool 必须审批',
    description: 'risk_level=high 且 requires_confirmation=true 的能力必须进入审批队列。',
    effect: 'require_approval',
    applies_to: 'maya.export_fbx.v1 / asset.export.fbx',
    evidence: 'FBX 导出写入文件系统，属于高风险动作。',
  },
  {
    id: 'policy.connector_down_blocks_execution',
    name: 'Connector 断开禁止执行',
    description: 'Connector 不可用时，Runtime 必须阻止 Tool 调度。',
    effect: 'deny',
    applies_to: 'Connector / Dispatch',
    evidence: 'Maya Connector disconnected 时审批批准被禁用，Workflow 节点 blocked。',
  },
  {
    id: 'policy.filesystem_write_requires_confirmation',
    name: '文件写入需要确认',
    description: '任何 filesystem.write 权限都必须暴露影响范围并等待确认。',
    effect: 'require_approval',
    applies_to: 'filesystem.write',
    evidence: '输出路径和覆盖策略在审批页展示。',
  },
  {
    id: 'policy.asset_publish_requires_permission',
    name: '发布资产需要 asset.publish',
    description: '只有具备发布权限的角色才能发布或撤回资产。',
    effect: 'allow',
    applies_to: 'Asset Registry',
    evidence: 'Admin 角色可以发布/撤回，其他角色不可执行。',
  },
  {
    id: 'policy.rejected_approval_audited',
    name: '审批拒绝必须写入 Audit',
    description: '审批拒绝、取消和恢复动作必须进入审计事件流。',
    effect: 'audit',
    applies_to: 'Approval / Recovery',
    evidence: 'approval.decided 和 trace.checkpoint 进入 audit 摘要。',
  },
];

export const connector: Connector = {
  id: 'connector_maya_local',
  type: 'connector',
  version: '0.1.0',
  status: 'connected',
  name: 'Maya Local Connector',
  target: 'maya',
  health: {
    state: 'healthy',
    latency_ms: 18,
    checked_at: now,
  },
  capabilities: ['maya.current_selection', 'asset.export.fbx', 'dcc.session.health'],
  created_at: now,
  updated_at: now,
  trace_id: task.trace_id,
};

export const capabilities: CapabilityManifest[] = [
  {
    id: 'maya.export_fbx.v1',
    type: 'skill',
    name: '导出 FBX',
    version: '1.0.0',
    status: 'available',
    description: '将 Maya 当前选择导出为 FBX，并生成可追溯 Asset。',
    connector_target: 'maya',
    connector_capability: 'asset.export.fbx',
    inputs: {
      selection: 'maya.current_selection',
      output_path: 'string',
      overwrite: 'boolean',
    },
    outputs: {
      fbx_file: 'asset.fbx',
    },
    permissions: ['dcc.maya.read_selection', 'filesystem.write'],
    risk_level: 'high',
    requires_confirmation: true,
    lifecycle: 'available',
    tags: ['maya', 'fbx', 'asset-export'],
  },
  {
    id: 'asset.export.fbx',
    type: 'tool',
    name: 'FBX 导出 Tool',
    version: '1.0.0',
    status: 'available',
    description: '调用 Maya Connector 执行 FBX 文件写入。',
    connector_target: 'maya',
    connector_capability: 'asset.export.fbx',
    inputs: {
      selection: 'mesh',
      output_path: 'string',
      overwrite: 'boolean',
    },
    outputs: {
      storage_uri: 'string',
      asset_id: 'string',
    },
    permissions: ['filesystem.write'],
    risk_level: 'high',
    requires_confirmation: true,
    lifecycle: 'available',
    tags: ['tool', 'export'],
  },
  {
    id: 'maya.current_selection',
    type: 'tool',
    name: '读取当前选择',
    version: '1.0.0',
    status: 'available',
    description: '读取 Maya 当前选中的对象，用于计划和参数校验。',
    connector_target: 'maya',
    connector_capability: 'maya.current_selection',
    inputs: {},
    outputs: {
      selection: 'mesh[]',
    },
    permissions: ['dcc.maya.read_selection'],
    risk_level: 'low',
    requires_confirmation: false,
    lifecycle: 'available',
    tags: ['tool', 'selection'],
  },
  {
    id: 'dcc.session.health',
    type: 'tool',
    name: 'DCC 会话健康检查',
    version: '1.0.0',
    status: 'available',
    description: '检查 Connector 和 DCC Session 是否可用于执行。',
    connector_target: 'maya',
    connector_capability: 'dcc.session.health',
    inputs: {},
    outputs: {
      state: 'healthy | degraded | unavailable',
    },
    permissions: ['dcc.session.read'],
    risk_level: 'low',
    requires_confirmation: false,
    lifecycle: 'available',
    tags: ['tool', 'health'],
  },
];

export const workflowNodes: WorkflowNode[] = [
  {
    id: 'start',
    label: 'Start',
    kind: 'start',
    risk_level: 'low',
    requires_confirmation: false,
    failure_policy: '进入计划阶段',
    inputs: {},
    outputs: { task: 'Task' },
  },
  {
    id: 'selection',
    label: '读取当前选择',
    kind: 'tool',
    capability_id: 'maya.current_selection',
    risk_level: 'low',
    requires_confirmation: false,
    failure_policy: '无选择时返回 validation_error',
    inputs: {},
    outputs: { selection: 'mesh[]' },
  },
  {
    id: 'path_check',
    label: '路径/覆盖检查',
    kind: 'check',
    risk_level: 'medium',
    requires_confirmation: false,
    failure_policy: '路径冲突时进入人工修正',
    inputs: { output_path: 'string', overwrite: 'boolean' },
    outputs: { write_plan: 'filesystem.write_plan' },
  },
  {
    id: 'approval',
    label: 'Approval',
    kind: 'approval',
    risk_level: 'high',
    requires_confirmation: true,
    failure_policy: '拒绝后取消任务',
    inputs: { write_plan: 'filesystem.write_plan' },
    outputs: { approval: 'approved | rejected' },
  },
  {
    id: 'export',
    label: '导出 FBX Tool',
    kind: 'tool',
    capability_id: 'asset.export.fbx',
    risk_level: 'high',
    requires_confirmation: true,
    failure_policy: '失败后可重试或进入人工复核',
    inputs: { selection: 'mesh[]', output_path: 'string' },
    outputs: { fbx_file: 'asset.fbx' },
  },
  {
    id: 'asset',
    label: '创建 Asset',
    kind: 'asset',
    risk_level: 'low',
    requires_confirmation: false,
    failure_policy: 'Asset 不确定时进入人工复核',
    inputs: { fbx_file: 'asset.fbx' },
    outputs: { asset_id: 'string', trace_id: 'string' },
  },
  {
    id: 'end',
    label: 'End',
    kind: 'end',
    risk_level: 'low',
    requires_confirmation: false,
    failure_policy: '结束并保留审计',
    inputs: { asset_id: 'string' },
    outputs: {},
  },
];

export const workflowEdges: WorkflowEdge[] = [
  { from: 'start', to: 'selection', label: '创建任务', kind: 'sequence' },
  { from: 'selection', to: 'path_check', label: '选择对象', kind: 'sequence' },
  { from: 'path_check', to: 'approval', label: '需要确认', kind: 'approval' },
  { from: 'approval', to: 'export', label: '批准', kind: 'sequence' },
  { from: 'export', to: 'asset', label: '导出完成', kind: 'sequence' },
  { from: 'asset', to: 'end', label: '记录完成', kind: 'sequence' },
  { from: 'export', to: 'path_check', label: '修改路径', kind: 'recovery' },
  { from: 'export', to: 'approval', label: '人工复核', kind: 'recovery' },
];

export const trace = {
  id: 'trace_fbx_export_001',
  type: 'trace',
  version: '0.1.0',
  status: 'running',
  task_id: task.id,
  started_at: now,
  trace_id: task.trace_id,
  event_ids: ['evt_001', 'evt_002', 'evt_003', 'evt_004', 'evt_005', 'evt_006', 'evt_007', 'evt_008'],
};

export function events(
  approvalStatus: Approval['status'],
  taskStatus: Task['status'],
  connectorStatus: Connector['status'] = 'connected',
  runtimeError?: RuntimeError,
  recoveryEvent?: string,
): RuntimeEvent[] {
  const base: RuntimeEvent[] = [
    makeEvent('evt_001', 'task.created', 'runtime', 'info', '任务已创建'),
    makeEvent('evt_002', 'task.planned', 'runtime', 'info', '导出计划已生成'),
    makeEvent('evt_003', 'approval.requested', 'runtime.policy', 'audit', '检测到文件写入风险，等待审批'),
  ];

  if (connectorStatus === 'disconnected') {
    base.push(
      makeEvent('evt_conn_001', 'connector.health_changed', 'maya.connector', 'warning', 'Maya Connector 已断开，执行被暂停'),
    );
  }

  if (approvalStatus === 'approved' || taskStatus === 'running' || taskStatus === 'succeeded') {
    base.push(
      makeEvent('evt_004', 'approval.decided', 'user', 'audit', '审批已批准'),
      makeEvent('evt_005', 'dispatch.started', 'runtime.dispatch', 'info', '开始调度 asset.export.fbx'),
      makeEvent('evt_006', 'trace.checkpoint', 'maya.connector', 'debug', 'Maya Connector 已接收导出请求'),
    );
  }

  if (taskStatus === 'succeeded') {
    base.push(
      makeEvent('evt_007', 'dispatch.completed', 'maya.connector', 'info', 'FBX 导出完成'),
      makeEvent('evt_008', 'artifact.created', 'runtime.assets', 'info', 'selected_asset.fbx 已记录为 Asset'),
    );
  }

  if (runtimeError) {
    base.push(
      makeEvent('evt_error_001', 'dispatch.failed', 'runtime.error', 'error', runtimeError.message),
    );
  }

  if (recoveryEvent) {
    base.push(
      makeEvent('evt_recovery_001', 'trace.checkpoint', 'runtime.recovery', 'audit', recoveryEvent),
    );
  }

  if (approvalStatus === 'rejected') {
    base.push(makeEvent('evt_009', 'approval.decided', 'user', 'audit', '审批已拒绝，任务取消'));
  }

  return base;
}

export function approveRequest(current: Approval): Approval {
  return {
    ...current,
    status: 'approved',
    reviewed_by: 'pipeline.approver',
    reviewed_at: new Date().toISOString(),
    decision_note: '允许写入项目 exports 目录。',
    updated_at: new Date().toISOString(),
  };
}

export function rejectRequest(current: Approval): Approval {
  return {
    ...current,
    status: 'rejected',
    reviewed_by: 'pipeline.approver',
    reviewed_at: new Date().toISOString(),
    decision_note: '暂不允许写入目标路径。',
    updated_at: new Date().toISOString(),
  };
}

export function resetRuntime() {
  return { session, task, approval, asset, connector, trace };
}

export function createSession(taskId: string, traceId: string): Session {
  const createdAt = new Date().toISOString();
  return {
    id: `session_demo_${Date.now()}`,
    type: 'session',
    version: '0.1.0',
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
    restored_count: 0,
    task_id: taskId,
    trace_id: traceId,
  };
}

export function disconnectConnector(current: Connector): Connector {
  return {
    ...current,
    status: 'disconnected',
    health: {
      state: 'unavailable',
      last_error: 'Maya session heartbeat lost',
      checked_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

export function reconnectConnector(current: Connector): Connector {
  return {
    ...current,
    status: 'connected',
    health: {
      state: 'healthy',
      latency_ms: 21,
      checked_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

export function submitExportTask(input: { capability_id: string; output_path: string; overwrite: boolean }) {
  const submittedAt = new Date().toISOString();
  const taskId = `task_fbx_export_${Date.now()}`;
  const traceId = `trace_fbx_export_${Date.now()}`;
  const nextTask: Task = {
    ...task,
    id: taskId,
    status: 'planned',
    approval_status: 'pending',
    artifact_ids: [],
    event_ids: ['evt_001', 'evt_002', 'evt_003'],
    created_at: submittedAt,
    updated_at: submittedAt,
    trace_id: traceId,
    metadata: {
      output_path: input.output_path,
      overwrite: input.overwrite,
      capability_id: input.capability_id,
    },
  };
  const nextApproval: Approval = {
    ...approval,
    id: `approval_fbx_export_${Date.now()}`,
    status: 'pending',
    target_id: nextTask.id,
    impact_scope: `${input.output_path}；${input.overwrite ? '允许覆盖同名文件。' : '不会覆盖同名文件。'}`,
    reviewed_by: undefined,
    reviewed_at: undefined,
    decision_note: undefined,
    created_at: submittedAt,
    updated_at: submittedAt,
    trace_id: traceId,
  };

  return {
    task: nextTask,
    approval: nextApproval,
  };
}

export function createRuntimeError(kind: FailureKind, traceId: string): RuntimeError {
  const errors: Record<FailureKind, Omit<RuntimeError, 'trace_id'>> = {
    maya_timeout: {
      code: 'MAYA_TIMEOUT',
      type: 'timeout_error',
      title: 'Maya 无响应',
      message: 'Connector 在等待 Maya 返回导出结果时超时。',
      recoverable: true,
      retryable: true,
      requires_human_review: false,
      suggested_action: '确认 Maya 可用后重试执行。',
    },
    output_conflict: {
      code: 'OUTPUT_CONFLICT',
      type: 'conflict_error',
      title: '输出路径冲突',
      message: '目标 FBX 文件已经存在，当前任务不允许覆盖。',
      recoverable: true,
      retryable: false,
      requires_human_review: true,
      suggested_action: '修改输出路径，或重新提交允许覆盖的任务。',
    },
    empty_selection: {
      code: 'EMPTY_SELECTION',
      type: 'validation_error',
      title: '未选择可导出的模型',
      message: 'Maya 当前选择为空，或选择内容不是 mesh。',
      recoverable: true,
      retryable: false,
      requires_human_review: true,
      suggested_action: '回到 Maya 选择 mesh 后重试。',
    },
    uncertain_result: {
      code: 'RESULT_UNCERTAIN',
      type: 'incomplete_result',
      title: '导出结果不确定',
      message: 'Connector 返回了文件路径，但无法确认 Asset 是否完整。',
      recoverable: true,
      retryable: true,
      requires_human_review: true,
      suggested_action: '进入人工复核，确认文件后再标记完成。',
    },
  };

  return {
    ...errors[kind],
    trace_id: traceId,
  };
}

function makeEvent(
  id: string,
  event_type: string,
  source: string,
  level: RuntimeEvent['level'],
  message: string,
): RuntimeEvent {
  return {
    id,
    type: 'event',
    version: '0.1.0',
    event_type,
    source,
    target_type: 'task',
    target_id: task.id,
    level,
    message,
    occurred_at: now,
    trace_id: task.trace_id,
  };
}
