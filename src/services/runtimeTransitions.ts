import {
  asset,
  createRuntimeError,
  type Approval,
  type AssetRecord,
  type CapabilityManifest,
  type Connector,
  type FailureKind,
  type RuntimeError,
  type Session,
  type Task,
} from './mockRuntime';
import { type ApprovalDecision } from './runtimeAdapter';
import { type RecoveryAction } from './runtimeController';

export function applyApprovalDecisionState({
  decision,
  nextApproval,
  session,
  task,
}: {
  decision: ApprovalDecision;
  nextApproval: Approval;
  session: Session;
  task: Task;
}) {
  return {
    approval: nextApproval,
    recoveryEvent: '',
    runtimeError: undefined,
    session: touchSession(session),
    task: {
      ...task,
      approval_status: decision,
      status: decision === 'approved' ? 'running' : 'canceled',
      updated_at: new Date().toISOString(),
    } satisfies Task,
    toast: decision === 'approved' ? '审批已批准，任务进入运行态' : '审批已拒绝，任务已取消',
  };
}

export function applyConnectorState({
  connected,
  nextConnector,
  session,
}: {
  connected: boolean;
  nextConnector: Connector;
  session: Session;
}) {
  return {
    connector: nextConnector,
    session: touchSession(session),
    toast: connected ? 'Maya Connector 已恢复连接' : 'Maya Connector 已断开，相关执行会暂停',
  };
}

export function applyConnectorHealthRefreshState({
  nextConnector,
  session,
}: {
  nextConnector: Connector;
  session: Session;
}) {
  return {
    connector: nextConnector,
    session: touchSession(session),
    toast: 'Connector 健康状态已刷新',
  };
}

export function applyCapabilitiesRefreshState(nextCapabilities: CapabilityManifest[]) {
  return {
    capabilities: nextCapabilities,
    capabilityError: '',
    toast: nextCapabilities.length === 0 ? 'Runtime 未返回任何能力' : '能力列表已从 Runtime 刷新',
  };
}

export function applyCapabilitiesRefreshErrorState(error: unknown) {
  const message = error instanceof Error ? error.message : '能力列表刷新失败';

  return {
    capabilityError: message,
    toast: `能力列表刷新失败：${message}`,
  };
}

export function completeRunState({
  currentAsset,
  session,
  task,
}: {
  currentAsset: AssetRecord;
  session: Session;
  task: Task;
}) {
  return {
    currentAsset: {
      ...currentAsset,
      status: 'created',
      updated_at: new Date().toISOString(),
    } satisfies AssetRecord,
    recoveryEvent: '任务恢复后执行成功，Asset 已记录',
    runtimeError: undefined,
    session: touchSession(session),
    task: {
      ...task,
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    } satisfies Task,
    toast: 'FBX 导出完成，Asset 已生成',
  };
}

export function resetRuntimeState(initial: { approval: Approval; connector: Connector; session: Session; task: Task }) {
  return {
    approval: initial.approval,
    connector: initial.connector,
    currentAsset: asset,
    recoveryEvent: '',
    runtimeError: undefined,
    session: initial.session,
    task: initial.task,
    toast: 'Demo Session 已重置',
  };
}

export function simulateFailureState({
  kind,
  session,
  task,
}: {
  kind: FailureKind;
  session: Session;
  task: Task;
}) {
  const runtimeError = createRuntimeError(kind, task.trace_id);

  return {
    recoveryEvent: '',
    runtimeError,
    session: touchSession(session),
    task: {
      ...task,
      status: 'failed',
      updated_at: new Date().toISOString(),
    } satisfies Task,
    toast: `${runtimeError.title}：Runtime 已保留上下文并等待恢复动作`,
  };
}

export function recoverTaskState({
  action,
  session,
  task,
}: {
  action: RecoveryAction;
  session: Session;
  task: Task;
}) {
  if (action === 'cancel') {
    return {
      recoveryEvent: '用户取消任务，Trace 保留用于审计',
      runtimeError: undefined,
      session: touchSession(session),
      task: {
        ...task,
        status: 'canceled',
        updated_at: new Date().toISOString(),
      } satisfies Task,
      toast: '任务已取消，审计记录保留',
    };
  }

  if (action === 'revise_path') {
    return {
      recoveryEvent: '输出路径已修改，任务回到计划态',
      runtimeError: undefined,
      session: touchSession(session),
      task: {
        ...task,
        metadata: {
          ...task.metadata,
          output_path: task.metadata.output_path.replace('.fbx', '_v002.fbx'),
        },
        status: 'planned',
        updated_at: new Date().toISOString(),
      } satisfies Task,
      toast: '输出路径已修改，任务回到计划态',
    };
  }

  if (action === 'review') {
    return {
      recoveryEvent: '人工复核通过，任务恢复执行',
      runtimeError: undefined,
      session: touchSession(session),
      task: {
        ...task,
        status: 'running',
        updated_at: new Date().toISOString(),
      } satisfies Task,
      toast: '人工复核通过，任务回到运行态',
    };
  }

  return {
    recoveryEvent: 'Runtime 已按原上下文重试执行',
    runtimeError: undefined,
    session: touchSession(session),
    task: {
      ...task,
      status: 'running',
      updated_at: new Date().toISOString(),
    } satisfies Task,
    toast: '任务已重试，回到运行态',
  };
}

function touchSession(session: Session): Session {
  return {
    ...session,
    status: 'active',
    updated_at: new Date().toISOString(),
  };
}
