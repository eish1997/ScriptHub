import { useEffect, useMemo, useRef, useState } from 'react';
import {
  asset,
  approval as initialApproval,
  capabilities as initialCapabilities,
  connector as initialConnector,
  createSession,
  resetRuntime,
  session as initialSession,
  task as initialTask,
  type Approval,
  type AssetRecord,
  type CapabilityManifest,
  type Connector,
  type FailureKind,
  type RuntimeError,
  type RuntimeRole,
  type Session,
  type Task,
} from './mockRuntime';
import { hasPermission } from './permissions';
import { clearSnapshot, loadSnapshot, saveSnapshot } from './sessionStorage';
import {
  initialHermesConversation,
  type HermesConversationState,
} from './hermesConversation';
import {
  toolBridgeProvider as defaultToolBridgeProvider,
} from './toolBridgeProviderFactory';
import type { ToolBridgeFailureScenario, ToolBridgeProvider } from './toolBridgeProvider';
import {
  createDevToolsScenarioHistoryEntry,
  prependDevToolsScenarioHistory,
  type DevToolsScenarioHistoryEntry,
  type DevToolsScenarioStatus,
} from './devToolsScenarioHistory';
import {
  transitionSkillCandidate,
  type SkillCandidateTransition,
} from './skillCandidateTransitions';
import { applySkillCandidateToolBridgeTransition } from './skillCandidateToolBridge';
import { listExternalHttpToolCalls } from './toolBridgeHttpActivity';
import {
  checkExternalMayaConnector,
  exportExternalMayaFbx,
  type ExternalMayaConnectorExportResult,
  type ExternalMayaConnectorSyncStatus,
} from './mayaConnectorHttpActivity';
import type { ToolCallRecord } from './hermesConversation';
import {
  decideApproval as decideRuntimeApproval,
  getConnectorHealth,
  listCapabilities,
  setConnectorConnected,
  submitTask,
  type SubmitTaskInput,
} from './runtimeApi';
import { runtimeEventStream } from './runtimeEvents';
import {
  applyApprovalDecisionState,
  applyCapabilitiesRefreshErrorState,
  applyCapabilitiesRefreshState,
  applyConnectorHealthRefreshState,
  applyConnectorState,
  completeRunState,
  recoverTaskState,
  resetRuntimeState,
  simulateFailureState,
} from './runtimeTransitions';

export type RecoveryAction = 'retry' | 'revise_path' | 'review' | 'cancel';
export type ExternalHttpToolBridgeSyncState = 'checking' | 'connected' | 'offline';

export type ExternalHttpToolBridgeSyncStatus = {
  lastCheckedAt?: string;
  lastError?: string;
  lastSyncedAt?: string;
  state: ExternalHttpToolBridgeSyncState;
  syncedToolCallCount: number;
};

export function useRuntimeController(role: RuntimeRole, toolBridgeProvider: ToolBridgeProvider = defaultToolBridgeProvider) {
  const restoredSnapshot = useMemo(() => loadSnapshot(), []);
  const [session, setSession] = useState<Session>(restoredSnapshot?.session ?? initialSession);
  const [task, setTask] = useState<Task>(restoredSnapshot?.task ?? initialTask);
  const [approval, setApproval] = useState<Approval>(restoredSnapshot?.approval ?? initialApproval);
  const [approvalError, setApprovalError] = useState('');
  const [capabilities, setCapabilities] = useState<CapabilityManifest[]>(initialCapabilities);
  const [capabilityError, setCapabilityError] = useState('');
  const [connector, setConnector] = useState<Connector>(restoredSnapshot?.connector ?? initialConnector);
  const [connectorError, setConnectorError] = useState('');
  const [currentAsset, setCurrentAsset] = useState<AssetRecord>(asset);
  const [hermesConversation, setHermesConversation] =
    useState<HermesConversationState>(initialHermesConversation);
  const [runtimeError, setRuntimeError] = useState<RuntimeError | undefined>(restoredSnapshot?.runtimeError);
  const [recoveryEvent, setRecoveryEvent] = useState(restoredSnapshot?.recoveryEvent ?? '');
  const [isBusy, setBusy] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [devToolsScenarioHistory, setDevToolsScenarioHistory] = useState<DevToolsScenarioHistoryEntry[]>([]);
  const [externalHttpToolBridgeSync, setExternalHttpToolBridgeSync] = useState<ExternalHttpToolBridgeSyncStatus>({
    state: 'checking',
    syncedToolCallCount: 0,
  });
  const [externalMayaConnectorSync, setExternalMayaConnectorSync] = useState<ExternalMayaConnectorSyncStatus>({
    state: 'checking',
  });
  const [toast, setToast] = useState(restoredSnapshot?.toast ?? 'Runtime 已生成默认 FBX 导出计划');
  const processedExternalHttpToolCallIds = useRef(new Set<string>());

  const currentEvents = useMemo(
    () => runtimeEventStream.getSnapshot({
      approvalStatus: approval.status,
      connectorStatus: connector.status,
      recoveryEvent,
      runtimeError,
      taskId: task.id,
      taskStatus: task.status,
      traceId: task.trace_id,
    }),
    [approval.status, connector.status, recoveryEvent, runtimeError, task.id, task.status, task.trace_id],
  );

  useEffect(() => {
    saveSnapshot({
      session,
      task,
      approval,
      connector,
      runtimeError,
      recoveryEvent,
      toast,
    });
  }, [approval, connector, recoveryEvent, runtimeError, session, task, toast]);

  useEffect(() => {
    let stopped = false;

    async function syncExternalHttpToolCalls() {
      const checkedAt = new Date().toISOString();
      try {
        const externalToolCalls = await listExternalHttpToolCalls();
        if (stopped) return;
        const newToolCalls = externalToolCalls.filter((toolCall) => !processedExternalHttpToolCallIds.current.has(toolCall.id));
        const syncedAt = newToolCalls.length > 0 ? checkedAt : undefined;
        if (newToolCalls.length > 0) {
          newToolCalls.forEach((toolCall) => processedExternalHttpToolCallIds.current.add(toolCall.id));
          setHermesConversation((current) => mergeExternalHttpToolCalls(current, newToolCalls));
          applyExternalHttpToolCallsToRuntime(newToolCalls);
        }
        setExternalHttpToolBridgeSync((current) => ({
          lastCheckedAt: checkedAt,
          lastError: undefined,
          lastSyncedAt: syncedAt ?? current.lastSyncedAt,
          state: 'connected',
          syncedToolCallCount: current.syncedToolCallCount + newToolCalls.length,
        }));
      } catch (error) {
        if (stopped) return;
        setExternalHttpToolBridgeSync((current) => ({
          ...current,
          lastCheckedAt: checkedAt,
          lastError: getErrorMessage(error, '本地 HTTP Tool Bridge 未连接'),
          state: 'offline',
        }));
      }
    }

    void syncExternalHttpToolCalls();
    const intervalId = window.setInterval(syncExternalHttpToolCalls, 3000);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let stopped = false;

    async function syncExternalMayaConnector() {
      const checkedAt = new Date().toISOString();
      try {
        const nextStatus = await checkExternalMayaConnector();
        if (stopped) return;
        setExternalMayaConnectorSync(nextStatus);
        if (nextStatus.state === 'failed' && nextStatus.lastRepairSuggestion) {
          setRecoveryEvent('Maya Connector 返回了可修复错误，Hermes 修复建议已同步到工具小窗');
        }
      } catch (error) {
        if (stopped) return;
        setExternalMayaConnectorSync({
          lastCheckedAt: checkedAt,
          lastError: getErrorMessage(error, '本地 Maya Connector 未连接'),
          state: 'offline',
        });
      }
    }

    void syncExternalMayaConnector();
    const intervalId = window.setInterval(syncExternalMayaConnector, 5000);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, []);

  function applyExternalHttpToolCallsToRuntime(toolCalls: ToolCallRecord[]) {
    for (const toolCall of toolCalls) {
      if (toolCall.tool_name === 'scriptHub.task.create') {
        const nextTask = buildTaskFromExternalHttpToolCall(task, toolCall);
        const nextApproval = buildApprovalFromExternalHttpToolCall(approval, nextTask, toolCall);
        setTask(nextTask);
        setApproval(nextApproval);
        setSession(createSession(nextTask.id, nextTask.trace_id));
        setRuntimeError(undefined);
        setRecoveryEvent('外部 HTTP Tool Bridge 已创建任务');
        setTaskError('');
        setToast('外部 HTTP Tool Bridge 已同步任务和安全确认');
      }

      if (toolCall.tool_name === 'scriptHub.asset.register') {
        setCurrentAsset((current) => buildAssetFromExternalHttpToolCall(current, toolCall));
        setRecoveryEvent('外部 HTTP Tool Bridge 已登记产物');
        setToast('外部 HTTP Tool Bridge 已同步产物');
      }
    }
  }

  async function decideApproval(decision: 'approved' | 'rejected') {
    if (!hasPermission(role, 'approval.decide')) {
      setToast('当前角色没有审批权限');
      return;
    }
    if (decision === 'approved' && connector.status !== 'connected') {
      setToast('Maya Connector 已断开，Runtime 暂停执行审批');
      return;
    }
    setBusy(true);
    try {
      const nextApproval = await decideRuntimeApproval(approval, decision);
      const nextState = applyApprovalDecisionState({ decision, nextApproval, session, task });
      setApproval(nextState.approval);
      setTask(nextState.task);
      setSession(nextState.session);
      setRuntimeError(nextState.runtimeError);
      setRecoveryEvent(nextState.recoveryEvent);
      setApprovalError('');
      setToast(nextState.toast);
    } catch (error) {
      const message = getErrorMessage(error, '审批请求失败');
      setApprovalError(message);
      setToast(`审批请求失败：${message}`);
    } finally {
      setBusy(false);
    }
  }

  function completeRun() {
    if (connector.status !== 'connected') {
      setToast('Maya Connector 已断开，无法完成执行');
      return;
    }
    const nextState = completeRunState({ currentAsset, session, task });
    setTask(nextState.task);
    setSession(nextState.session);
    setRuntimeError(nextState.runtimeError);
    setCurrentAsset(nextState.currentAsset);
    setRecoveryEvent(nextState.recoveryEvent);
    setToast(nextState.toast);
  }

  function simulateFailure(kind: FailureKind) {
    const nextState = simulateFailureState({ kind, session, task });
    setRuntimeError(nextState.runtimeError);
    setTask(nextState.task);
    setSession(nextState.session);
    setRecoveryEvent(nextState.recoveryEvent);
    setToast(nextState.toast);
  }

  function recoverTask(action: RecoveryAction) {
    const nextState = recoverTaskState({ action, session, task });
    setRuntimeError(nextState.runtimeError);
    setTask(nextState.task);
    setSession(nextState.session);
    setRecoveryEvent(nextState.recoveryEvent);
    setToast(nextState.toast);
  }

  async function createTask(input: SubmitTaskInput) {
    setBusy(true);
    try {
      const result = await submitTask(input);
      setTask(result.task);
      setApproval(result.approval);
      setSession(createSession(result.task.id, result.task.trace_id));
      setRuntimeError(undefined);
      setRecoveryEvent('');
      setTaskError('');
      setToast('Runtime 已创建任务、计划和审批请求');
      return true;
    } catch (error) {
      const message = getErrorMessage(error, '任务提交失败');
      setTaskError(message);
      setToast(`任务提交失败：${message}`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function refreshCapabilities() {
    setBusy(true);
    try {
      const nextCapabilities = await listCapabilities();
      const nextState = applyCapabilitiesRefreshState(nextCapabilities);
      setCapabilities(nextState.capabilities);
      setCapabilityError(nextState.capabilityError);
      setToast(nextState.toast);
    } catch (error) {
      const nextState = applyCapabilitiesRefreshErrorState(error);
      setCapabilityError(nextState.capabilityError);
      setToast(nextState.toast);
    } finally {
      setBusy(false);
    }
  }

  async function refreshConnectorHealth() {
    setBusy(true);
    try {
      const nextConnector = await getConnectorHealth();
      const nextState = applyConnectorHealthRefreshState({ nextConnector, session });
      setConnector(nextState.connector);
      setSession(nextState.session);
      setConnectorError('');
      setToast(nextState.toast);
    } catch (error) {
      const message = getErrorMessage(error, 'Connector 健康状态刷新失败');
      setConnectorError(message);
      setToast(`Connector 健康状态刷新失败：${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleConnector(connected: boolean) {
    setBusy(true);
    try {
      const nextConnector = await setConnectorConnected(connector, connected);
      const nextState = applyConnectorState({ connected, nextConnector, session });
      setConnector(nextState.connector);
      setSession(nextState.session);
      setConnectorError('');
      setToast(nextState.toast);
    } catch (error) {
      const message = getErrorMessage(error, 'Connector 状态切换失败');
      setConnectorError(message);
      setToast(`Connector 状态切换失败：${message}`);
    } finally {
      setBusy(false);
    }
  }

  function resetDemoSession() {
    if (!hasPermission(role, 'session.reset')) {
      setToast('当前角色没有重置 Session 的权限');
      return false;
    }
    const initial = resetRuntime();
    clearSnapshot();
    const nextState = resetRuntimeState(initial);
    setSession(nextState.session);
    setTask(nextState.task);
    setApproval(nextState.approval);
    setApprovalError('');
    setConnector(nextState.connector);
    setConnectorError('');
    setRuntimeError(nextState.runtimeError);
    setCurrentAsset(nextState.currentAsset);
    setRecoveryEvent(nextState.recoveryEvent);
    setCapabilityError('');
    setHermesConversation(initialHermesConversation);
    setDevToolsScenarioHistory([]);
    setTaskError('');
    setToast(nextState.toast);
    return true;
  }

  async function simulateExternalToolBridge() {
    return simulateExternalToolBridgeWithInput(toolBridgeProvider.taskCreateInput);
  }

  async function simulateExternalToolBridgeWithInput(input: SubmitTaskInput) {
    setBusy(true);
    let nextConnector: Connector | undefined;
    let connectorFailure = '';
    let nextTask: Task | undefined;
    let nextApproval: Approval | undefined;
    let taskFailure = '';
    let exportFailure = '';
    let connectorExportToolCall: ToolCallRecord | undefined;

    try {
      const health = await getConnectorHealth();
      const nextState = applyConnectorHealthRefreshState({ nextConnector: health, session });
      nextConnector = nextState.connector;
      setConnector(nextState.connector);
      setSession(nextState.session);
      setConnectorError('');
    } catch (error) {
      connectorFailure = getErrorMessage(error, 'Connector 健康状态刷新失败');
      setConnectorError(connectorFailure);
    }

    try {
      const result = await submitTask(input);
      nextTask = result.task;
      nextApproval = result.approval;
      setTask(result.task);
      setApproval(result.approval);
      setSession(createSession(result.task.id, result.task.trace_id));
      setRuntimeError(undefined);
      setRecoveryEvent('');
      setTaskError('');
    } catch (error) {
      taskFailure = getErrorMessage(error, '任务提交失败');
      setTaskError(taskFailure);
    }

    if (!taskFailure && nextTask && externalMayaConnectorSync.state === 'connected') {
      const exportResult = await exportExternalMayaFbx({
        output_path: input.output_path,
        overwrite: input.overwrite,
        trace_id: nextTask.trace_id,
      });
      if (exportResult.ok) {
        setCurrentAsset((current) => buildAssetFromExternalMayaExport(current, nextTask as Task, exportResult));
        connectorExportToolCall = buildMayaConnectorExportToolCall({
          input,
          result: exportResult,
          status: 'succeeded',
          task: nextTask,
        });
        setTask({
          ...nextTask,
          artifact_ids: [currentAsset.id],
          status: 'succeeded',
          updated_at: exportResult.data.exportedAt,
        });
        setRecoveryEvent(`真实 Maya Connector 已导出 ${exportResult.data.storageUri}`);
      } else {
        exportFailure = exportResult.error.message;
        connectorExportToolCall = buildMayaConnectorExportToolCall({
          error: exportResult.error.message,
          input,
          repairSuggestion: exportResult.error.repairSuggestion,
          status: 'failed',
          task: nextTask,
        });
        setExternalMayaConnectorSync((current) => ({
          ...current,
          lastError: exportResult.error.message,
          lastRepairSuggestion: exportResult.error.repairSuggestion,
          state: 'failed',
        }));
        setTask({
          ...nextTask,
          status: 'failed',
          updated_at: new Date().toISOString(),
        });
        setRecoveryEvent('真实 Maya Connector 导出失败，修复建议已同步');
      }
    }

    setHermesConversation((current) =>
      appendConnectorExportActivity(toolBridgeProvider.appendRuntimeResult(current, {
        approval: nextApproval,
        connector: nextConnector,
        connectorError: connectorFailure,
        task: nextTask,
        taskCreateInput: input,
        taskError: taskFailure,
      }), connectorExportToolCall),
    );
    setToast(
      taskFailure || connectorFailure || exportFailure
        ? '外部 Hermes Tool Bridge 调用已完成，但存在失败项'
        : externalMayaConnectorSync.state === 'connected'
          ? '真实 Maya Connector 已完成导出并同步产物'
          : '外部 Hermes 已通过 Tool Bridge 推动 runtime 状态更新',
    );
    recordDevToolsScenario({
      detail: taskFailure || connectorFailure || exportFailure || `任务 ${nextTask?.id ?? 'unknown'} 已写入 Tool Bridge 时间线`,
      kind: 'tool_bridge_success',
      status: taskFailure || connectorFailure || exportFailure ? 'failed' : 'succeeded',
      title: '模拟 Tool Bridge 调用',
    });
    setBusy(false);
  }

  async function simulateExternalApprovalDecision(decision: 'approved' | 'rejected') {
    if (!hasPermission(role, 'approval.decide')) {
      setToast('当前角色没有审批权限');
      recordApprovalDecisionScenario(decision, 'blocked', '当前角色没有审批权限');
      setHermesConversation((current) =>
        toolBridgeProvider.appendApprovalResult(current, {
          decision,
          error: '当前角色没有审批权限',
        }),
      );
      return;
    }
    if (decision === 'approved' && connector.status !== 'connected') {
      setToast('Maya Connector 已断开，Runtime 暂停执行审批');
      recordApprovalDecisionScenario(decision, 'blocked', 'Maya Connector 已断开');
      setHermesConversation((current) =>
        toolBridgeProvider.appendApprovalResult(current, {
          approval,
          decision,
          error: 'Maya Connector 已断开',
          task,
        }),
      );
      return;
    }
    setBusy(true);
    try {
      const nextApproval = await decideRuntimeApproval(approval, decision);
      const nextState = applyApprovalDecisionState({ decision, nextApproval, session, task });
      setApproval(nextState.approval);
      setTask(nextState.task);
      setSession(nextState.session);
      setRuntimeError(nextState.runtimeError);
      setRecoveryEvent(nextState.recoveryEvent);
      setApprovalError('');
      setToast(`外部 Hermes 已${decision === 'approved' ? '确认' : '拒绝'}审批`);
      recordApprovalDecisionScenario(decision, 'succeeded', `审批 ${nextState.approval.id} 已更新`);
      setHermesConversation((current) =>
        toolBridgeProvider.appendApprovalResult(current, {
          approval: nextState.approval,
          decision,
          task: nextState.task,
        }),
      );
    } catch (error) {
      const message = getErrorMessage(error, '审批请求失败');
      setApprovalError(message);
      setToast(`审批请求失败：${message}`);
      recordApprovalDecisionScenario(decision, 'failed', message);
      setHermesConversation((current) =>
        toolBridgeProvider.appendApprovalResult(current, {
          approval,
          decision,
          error: message,
          task,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function simulateExternalToolBridgeFailure(scenario: ToolBridgeFailureScenario) {
    setHermesConversation((current) => toolBridgeProvider.appendFailureScenario(current, scenario));
    recordDevToolsScenario({
      detail: getFailureScenarioDetail(scenario),
      kind: 'failure_scenario',
      payload: { scenario },
      status: 'failed',
      title: getFailureScenarioTitle(scenario),
    });
    setToast('已模拟外部 Hermes Tool Bridge 失败路径');
  }

  function simulateExternalToolBridgeValidationFailure() {
    setHermesConversation((current) => toolBridgeProvider.appendValidationFailureScenario(current));
    recordDevToolsScenario({
      detail: '缺少 output_path、overwrite 类型错误、包含额外字段，Tool Bridge 应在 descriptor 校验阶段拒绝',
      kind: 'validation_failure',
      status: 'failed',
      title: '入参校验失败',
    });
    setToast('已模拟外部 Hermes Tool Bridge 入参校验失败');
  }

  function replayDevToolsScenario(entryId: string) {
    const entry = devToolsScenarioHistory.find((item) => item.id === entryId);
    if (!entry) {
      setToast('未找到可回放的 DevTools 场景');
      return;
    }
    if (entry.kind === 'tool_bridge_success') {
      void simulateExternalToolBridge();
      return;
    }
    if (entry.kind === 'approval_decision' && entry.payload?.decision) {
      void simulateExternalApprovalDecision(entry.payload.decision);
      return;
    }
    if (entry.kind === 'failure_scenario' && entry.payload?.scenario) {
      simulateExternalToolBridgeFailure(entry.payload.scenario);
      return;
    }
    if (entry.kind === 'validation_failure') {
      simulateExternalToolBridgeValidationFailure();
      return;
    }
    setToast('当前 DevTools 场景缺少回放参数');
  }

  function transitionCurrentSkillCandidate(transition: SkillCandidateTransition) {
    try {
      setHermesConversation((current) => ({
        ...current,
        skillCandidate: transitionSkillCandidate(current.skillCandidate, transition),
      }));
      setToast('技能候选状态已更新');
    } catch (error) {
      setToast(getErrorMessage(error, '技能候选状态更新失败'));
    }
  }

  function transitionCurrentSkillCandidateViaToolBridge(transition: SkillCandidateTransition) {
    try {
      setHermesConversation((current) => applySkillCandidateToolBridgeTransition(current, transition));
      setToast('技能候选状态已通过 Tool Bridge 更新');
    } catch (error) {
      setToast(getErrorMessage(error, '技能候选 Tool Bridge 状态更新失败'));
    }
  }

  return {
    approval,
    approvalError,
    capabilities,
    capabilityError,
    connector,
    connectorError,
    currentAsset,
    currentEvents,
    devToolsScenarioHistory,
    externalMayaConnectorSync,
    externalHttpToolBridgeSync,
    hermesConversation,
    isBusy,
    runtimeError,
    session,
    task,
    taskError,
    toast,
    actions: {
      completeRun,
      createTask,
      decideApproval,
      recoverTask,
      refreshCapabilities,
      refreshConnectorHealth,
      resetDemoSession,
      replayDevToolsScenario,
      simulateExternalApprovalDecision,
      simulateExternalToolBridgeFailure,
      simulateExternalToolBridgeValidationFailure,
      simulateExternalToolBridge,
      simulateExternalToolBridgeWithInput,
      transitionCurrentSkillCandidate,
      transitionCurrentSkillCandidateViaToolBridge,
      setCurrentAsset,
      setToast,
      simulateFailure,
      toggleConnector,
    },
  };

  function recordApprovalDecisionScenario(
    decision: 'approved' | 'rejected',
    status: DevToolsScenarioStatus,
    detail: string,
  ) {
    recordDevToolsScenario({
      detail,
      kind: 'approval_decision',
      payload: { decision },
      status,
      title: decision === 'approved' ? '模拟批准' : '模拟拒绝',
    });
  }

  function recordDevToolsScenario(input: Parameters<typeof createDevToolsScenarioHistoryEntry>[0]) {
    setDevToolsScenarioHistory((current) =>
      prependDevToolsScenarioHistory(current, createDevToolsScenarioHistoryEntry(input)),
    );
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function mergeExternalHttpToolCalls(
  current: HermesConversationState,
  externalToolCalls: HermesConversationState['toolCalls'],
): HermesConversationState {
  const existingIds = new Set(current.toolCalls.map((toolCall) => toolCall.id));
  const newToolCalls = externalToolCalls.filter((toolCall) => !existingIds.has(toolCall.id));
  if (newToolCalls.length === 0) return current;
  const messages = newToolCalls.map((toolCall) => ({
    content: `外部 HTTP Tool Bridge 调用了 ${toolCall.tool_name}，状态：${toolCall.status}。`,
    conversation_id: toolCall.conversation_id,
    created_at: toolCall.finished_at ?? toolCall.started_at,
    id: `msg_http_${toolCall.id}`,
    role: 'tool' as const,
    tool_call_id: toolCall.id,
  }));
  return {
    ...current,
    conversation: {
      ...current.conversation,
      status: newToolCalls.some((toolCall) => toolCall.status === 'failed') ? 'failed' : current.conversation.status,
      updated_at: messages.at(-1)?.created_at ?? current.conversation.updated_at,
    },
    messages: [...current.messages, ...messages],
    toolCalls: [...current.toolCalls, ...newToolCalls],
  };
}

function buildTaskFromExternalHttpToolCall(current: Task, toolCall: ToolCallRecord): Task {
  const output = toolCall.output ?? {};
  const input = toolCall.input ?? {};
  const taskId = getStringField(output, 'task_id') ?? current.id;
  const outputPath = getStringField(input, 'output_path') ?? current.metadata.output_path;
  const capabilityId = getStringField(input, 'capability_id') ?? current.metadata.capability_id;
  const overwrite = getBooleanField(input, 'overwrite') ?? current.metadata.overwrite;
  const updatedAt = toolCall.finished_at ?? toolCall.started_at;

  return {
    ...current,
    approval_status: toolCall.status === 'needs_approval' ? 'pending' : current.approval_status,
    created_at: toolCall.started_at,
    description: `外部 HTTP Tool Bridge 请求执行 ${capabilityId}`,
    goal: `执行 ${capabilityId}`,
    id: taskId,
    metadata: {
      capability_id: capabilityId,
      output_path: outputPath,
      overwrite,
    },
    risk_level: toolCall.risk_level,
    status: toolCall.status === 'needs_approval' ? 'waiting_approval' : 'planned',
    trace_id: toolCall.trace_id,
    updated_at: updatedAt,
  };
}

function buildApprovalFromExternalHttpToolCall(current: Approval, task: Task, toolCall: ToolCallRecord): Approval {
  const output = toolCall.output ?? {};
  const approvalId = getStringField(output, 'approval_id') ?? current.id;
  const updatedAt = toolCall.finished_at ?? toolCall.started_at;

  return {
    ...current,
    created_at: toolCall.started_at,
    id: approvalId,
    impact_scope: `写入 ${task.metadata.output_path}`,
    reason: `外部 HTTP Tool Bridge 请求执行 ${task.metadata.capability_id}`,
    requested_by: 'external_http_tool_bridge',
    risk_level: 'high',
    status: toolCall.status === 'needs_approval' ? 'pending' : current.status,
    target_id: task.id,
    trace_id: toolCall.trace_id,
    updated_at: updatedAt,
  };
}

function buildAssetFromExternalHttpToolCall(current: AssetRecord, toolCall: ToolCallRecord): AssetRecord {
  const output = toolCall.output ?? {};
  const input = toolCall.input ?? {};
  const storageUri = getStringField(output, 'storage_uri') ?? getStringField(input, 'storage_uri') ?? current.storage_uri;
  const assetId = getStringField(output, 'asset_id') ?? current.id;
  const updatedAt = toolCall.finished_at ?? toolCall.started_at;

  return {
    ...current,
    approval_status: 'approved',
    created_at: toolCall.started_at,
    generated_by: toolCall.id ? 'external_http_tool_bridge' : current.generated_by,
    id: assetId,
    name: storageUri.split('/').at(-1) ?? current.name,
    source_uri: getStringField(input, 'source_uri') ?? current.source_uri,
    status: 'created',
    storage_uri: storageUri,
    task_id: getStringField(input, 'task_id') ?? current.task_id,
    trace_id: toolCall.trace_id,
    updated_at: updatedAt,
  };
}

function buildAssetFromExternalMayaExport(
  current: AssetRecord,
  task: Task,
  exportResult: Extract<ExternalMayaConnectorExportResult, { ok: true }>,
): AssetRecord {
  const storageUri = exportResult.data.storageUri;

  return {
    ...current,
    approval_status: 'approved',
    created_at: exportResult.data.exportedAt,
    generated_by: 'external_maya_connector',
    name: storageUri.split('/').at(-1) ?? current.name,
    source_uri: exportResult.data.sourceUri,
    status: 'created',
    storage_uri: storageUri,
    task_id: task.id,
    trace_id: exportResult.data.traceId ?? task.trace_id,
    updated_at: exportResult.data.exportedAt,
  };
}

function buildMayaConnectorExportToolCall(input: {
  error?: string;
  input: SubmitTaskInput;
  repairSuggestion?: ExternalMayaConnectorExportResult extends infer Result
    ? Result extends { ok: false; error: { repairSuggestion?: infer Suggestion } }
      ? Suggestion
      : never
    : never;
  result?: Extract<ExternalMayaConnectorExportResult, { ok: true }>;
  status: 'failed' | 'succeeded';
  task: Task;
}): ToolCallRecord {
  const now = new Date().toISOString();
  const id = `tool_maya_export_${Date.now()}`;

  return {
    approval_required: false,
    conversation_id: 'conv_hermes_fbx_001',
    error: input.error,
    finished_at: now,
    id,
    input: {
      output_path: input.input.output_path,
      overwrite: input.input.overwrite,
      task_id: input.task.id,
    },
    output: input.result?.ok
      ? {
          bytes: input.result.data.bytes,
          local_path: input.result.data.localPath,
          selected_objects: input.result.data.selectedObjects,
          selection_count: input.result.data.selectionCount,
          source_uri: input.result.data.sourceUri,
          storage_uri: input.result.data.storageUri,
        }
      : {
          repair_suggestion: input.repairSuggestion,
        },
    risk_level: 'high',
    started_at: now,
    status: input.status,
    title: input.status === 'succeeded' ? '真实 Maya Connector 导出 FBX' : '真实 Maya Connector 导出失败',
    tool_name: 'scriptHub.mayaConnector.exportFbx',
    trace_id: input.task.trace_id,
  };
}

function appendConnectorExportActivity(
  current: HermesConversationState,
  connectorExportToolCall?: ToolCallRecord,
): HermesConversationState {
  if (!connectorExportToolCall) return current;
  const message = {
    content: connectorExportToolCall.status === 'succeeded'
      ? `真实 Maya Connector 已导出 ${getStringField(connectorExportToolCall.output ?? {}, 'storage_uri') ?? 'FBX'}。`
      : `真实 Maya Connector 导出失败：${connectorExportToolCall.error ?? 'unknown error'}。`,
    conversation_id: connectorExportToolCall.conversation_id,
    created_at: connectorExportToolCall.finished_at ?? connectorExportToolCall.started_at,
    id: `msg_${connectorExportToolCall.id}`,
    role: 'tool' as const,
    tool_call_id: connectorExportToolCall.id,
  };

  return {
    ...current,
    conversation: {
      ...current.conversation,
      status: connectorExportToolCall.status === 'failed' ? 'failed' : current.conversation.status,
      updated_at: message.created_at,
    },
    messages: [...current.messages, message],
    toolCalls: [...current.toolCalls, connectorExportToolCall],
  };
}

function getStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getBooleanField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function getFailureScenarioTitle(scenario: ToolBridgeFailureScenario) {
  if (scenario === 'connector_unavailable') return 'Connector 不可用';
  if (scenario === 'task_create_failed') return 'task.create 失败';
  return 'approval.decide 失败';
}

function getFailureScenarioDetail(scenario: ToolBridgeFailureScenario) {
  if (scenario === 'connector_unavailable') return 'Maya 会话心跳丢失，Tool Bridge 记录失败调用';
  if (scenario === 'task_create_failed') return '输出路径不可写，任务创建失败并保留 trace';
  return '审批令牌过期，审批决策失败并写入审计';
}
