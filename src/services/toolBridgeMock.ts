import {
  type HermesConversationState,
  type HermesMessage,
  type ToolCallRecord,
} from './hermesConversation';
import type { Approval, AssetRecord, Connector, Task } from './mockRuntime';
import type {
  ApprovalToolBridgeResult,
  RuntimeToolBridgeResult,
  ToolBridgeFailureScenario,
  ToolBridgeProvider,
} from './toolBridgeProvider';

export type {
  ApprovalToolBridgeResult,
  RuntimeToolBridgeResult,
  ToolBridgeFailureScenario,
} from './toolBridgeProvider';

export type ToolBridgeInvocation = {
  toolName: string;
  title: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  riskLevel: ToolCallRecord['risk_level'];
  approvalRequired: boolean;
};

export const externalHermesTaskCreateInput = {
  capability_id: 'maya.export_fbx.v1',
  output_path: 'project://exports/selected_asset.fbx',
  overwrite: false,
};

const defaultTaskId = 'task_fbx_export_001';
const defaultApprovalId = 'approval_fbx_export_001';
const defaultAssetId = 'asset_selected_fbx_001';
const defaultTraceId = 'trace_fbx_export_001';

const defaultInvocations: ToolBridgeInvocation[] = [
  {
    toolName: 'scriptHub.connector.health.get',
    title: 'External Hermes checks Maya Connector',
    input: { connector_id: 'connector_maya_local' },
    output: {
      state: 'healthy',
      latency_ms: 18,
      trace: { trace_id: defaultTraceId },
      trace_id: defaultTraceId,
    },
    riskLevel: 'low',
    approvalRequired: false,
  },
  {
    toolName: 'scriptHub.task.create',
    title: 'External Hermes creates FBX export task',
    input: externalHermesTaskCreateInput,
    output: {
      approval: { approval_id: defaultApprovalId, status: 'pending' },
      approval_id: defaultApprovalId,
      task: {
        approval_status: 'pending',
        status: 'planned',
        task_id: defaultTaskId,
      },
      task_id: defaultTaskId,
      trace: { task_id: defaultTaskId, trace_id: defaultTraceId },
      trace_id: defaultTraceId,
    },
    riskLevel: 'high',
    approvalRequired: true,
  },
  {
    toolName: 'scriptHub.asset.register',
    title: 'External Hermes registers exported FBX asset',
    input: {
      approval_id: defaultApprovalId,
      source_uri: 'maya://current_selection',
      storage_uri: externalHermesTaskCreateInput.output_path,
      task_id: defaultTaskId,
      trace_id: defaultTraceId,
    },
    output: {
      approval: { approval_id: defaultApprovalId, status: 'approved' },
      asset: {
        asset_id: defaultAssetId,
        asset_type: 'fbx',
        status: 'created',
        storage_uri: externalHermesTaskCreateInput.output_path,
      },
      provenance: {
        generated_by: 'asset.export.fbx',
        source_uri: 'maya://current_selection',
        task_id: defaultTaskId,
        trace_id: defaultTraceId,
      },
      trace: { event: 'asset.registered', trace_id: defaultTraceId },
      trace_id: defaultTraceId,
    },
    riskLevel: 'low',
    approvalRequired: false,
  },
  {
    toolName: 'scriptHub.skill.candidate.create',
    title: 'External Hermes writes skill candidate draft',
    input: {
      asset_id: defaultAssetId,
      source_trace_id: defaultTraceId,
      source: 'tool_call_sequence',
    },
    output: {
      asset: { asset_id: defaultAssetId, task_id: defaultTaskId },
      skill_candidate_id: 'skill_candidate_fbx_export_001',
      status: 'draft',
      trace: { trace_id: defaultTraceId },
    },
    riskLevel: 'low',
    approvalRequired: false,
  },
];

export function simulateExternalHermesToolBridge(state: HermesConversationState): HermesConversationState {
  const invokedAt = new Date().toISOString();
  const seed = Date.now();
  const toolCalls = defaultInvocations.map((invocation, index): ToolCallRecord => {
    const status: ToolCallRecord['status'] = invocation.approvalRequired ? 'needs_approval' : 'succeeded';
    return {
      id: `tool_bridge_${seed}_${index + 1}`,
      conversation_id: state.conversation.id,
      trace_id: state.conversation.trace_id,
      tool_name: invocation.toolName,
      title: invocation.title,
      status,
      input: invocation.input,
      output: invocation.output,
      risk_level: invocation.riskLevel,
      approval_required: invocation.approvalRequired,
      started_at: invokedAt,
      finished_at: invokedAt,
    };
  });
  const messages: HermesMessage[] = [
    {
      id: `msg_external_hermes_${seed}`,
      conversation_id: state.conversation.id,
      role: 'hermes',
      content: 'External Hermes started an FBX export chain through ScriptHub Tool Bridge.',
      created_at: invokedAt,
      tool_call_id: toolCalls[0]?.id,
    },
    {
      id: `msg_tool_result_${seed}`,
      conversation_id: state.conversation.id,
      role: 'tool',
      content: 'ScriptHub recorded connector health, task creation, asset registration, and skill draft provenance.',
      created_at: invokedAt,
      tool_call_id: toolCalls[1]?.id,
    },
  ];

  return {
    conversation: {
      ...state.conversation,
      status: 'running',
      updated_at: invokedAt,
    },
    messages: [...state.messages, ...messages],
    toolCalls: [...state.toolCalls, ...toolCalls],
    skillCandidate: {
      ...state.skillCandidate,
      steps: state.skillCandidate.steps.map((step) => ({
        ...step,
        tool_name:
          step.tool_name === 'task.create'
            ? 'scriptHub.task.create'
            : step.tool_name === 'connector.health.get'
              ? 'scriptHub.connector.health.get'
              : step.tool_name,
      })),
      trigger_examples: [
        ...state.skillCandidate.trigger_examples,
        'External Hermes triggered FBX export through Tool Bridge',
      ],
    },
  };
}

export const toolBridgeFailureScenarioErrors: Record<ToolBridgeFailureScenario, string> = {
  connector_unavailable: 'Connector connector_maya_local unavailable: Maya session heartbeat lost',
  task_create_failed: 'scriptHub.task.create failed: output path project://exports/selected_asset.fbx is not writable',
  approval_decide_failed: 'scriptHub.approval.decide failed: approval token is expired',
};

export function createConnectorUnavailableBridgeResult(input: {
  connector?: Connector;
  reason?: string;
}): RuntimeToolBridgeResult {
  return {
    connector: input.connector,
    connectorError: input.reason ?? 'Connector unavailable',
  };
}

export function createTaskCreateFailedBridgeResult(input: {
  connector?: Connector;
  error: string;
}): RuntimeToolBridgeResult {
  return {
    connector: input.connector,
    taskError: input.error,
  };
}

export function createApprovalDecideFailedBridgeResult(input: {
  approval?: Approval;
  decision: 'approved' | 'rejected';
  error: string;
  task?: Task;
}): ApprovalToolBridgeResult {
  return {
    approval: input.approval,
    decision: input.decision,
    error: input.error,
    task: input.task,
  };
}

export function appendToolBridgeFailureScenario(
  state: HermesConversationState,
  scenario: ToolBridgeFailureScenario,
): HermesConversationState {
  if (scenario === 'connector_unavailable') {
    return appendConnectorUnavailableScenario(state);
  }
  if (scenario === 'task_create_failed') {
    return appendTaskCreateFailedScenario(state);
  }
  return appendApprovalDecideFailedScenario(state);
}

export function appendConnectorUnavailableScenario(
  state: HermesConversationState,
  input: { connector?: Connector; reason?: string } = {},
): HermesConversationState {
  return appendRuntimeToolBridgeResult(
    state,
    createConnectorUnavailableBridgeResult({
      connector: input.connector,
      reason: input.reason ?? toolBridgeFailureScenarioErrors.connector_unavailable,
    }),
  );
}

export function appendTaskCreateFailedScenario(
  state: HermesConversationState,
  input: { connector?: Connector; error?: string } = {},
): HermesConversationState {
  return appendRuntimeToolBridgeResult(
    state,
    createTaskCreateFailedBridgeResult({
      connector: input.connector,
      error: input.error ?? toolBridgeFailureScenarioErrors.task_create_failed,
    }),
  );
}

export function appendApprovalDecideFailedScenario(
  state: HermesConversationState,
  input: {
    approval?: Approval;
    decision?: 'approved' | 'rejected';
    error?: string;
    task?: Task;
  } = {},
): HermesConversationState {
  return appendApprovalToolBridgeResult(
    state,
    createApprovalDecideFailedBridgeResult({
      approval: input.approval,
      decision: input.decision ?? 'approved',
      error: input.error ?? toolBridgeFailureScenarioErrors.approval_decide_failed,
      task: input.task,
    }),
  );
}

export function appendToolBridgeValidationFailureScenario(
  state: HermesConversationState,
): HermesConversationState {
  const invokedAt = new Date().toISOString();
  const seed = Date.now();
  const traceId = state.conversation.trace_id;
  const validationCall = makeToolCall({
    approvalRequired: true,
    conversationId: state.conversation.id,
    error: 'input.output_path is required; input.overwrite expected boolean; input.extra_field is not allowed',
    id: `tool_bridge_validation_${seed}`,
    input: {
      capability_id: 'maya.export_fbx.v1',
      extra_field: 'unexpected',
      overwrite: 'false',
    },
    riskLevel: 'high',
    startedAt: invokedAt,
    title: 'External Hermes sends invalid task.create input',
    toolName: 'scriptHub.task.create',
    traceId,
  });
  const messages: HermesMessage[] = [
    {
      id: `msg_external_validation_${seed}`,
      conversation_id: state.conversation.id,
      role: 'hermes',
      content: 'External Hermes attempted to call scriptHub.task.create with invalid input.',
      created_at: invokedAt,
      tool_call_id: validationCall.id,
    },
    {
      id: `msg_tool_validation_${seed}`,
      conversation_id: state.conversation.id,
      role: 'tool',
      content: 'ScriptHub rejected the Tool Bridge call during descriptor input validation.',
      created_at: invokedAt,
      tool_call_id: validationCall.id,
    },
  ];

  return {
    conversation: {
      ...state.conversation,
      status: 'failed',
      updated_at: invokedAt,
    },
    messages: [...state.messages, ...messages],
    toolCalls: [...state.toolCalls, validationCall],
    skillCandidate: state.skillCandidate,
  };
}

export function appendRuntimeToolBridgeResult(
  state: HermesConversationState,
  result: RuntimeToolBridgeResult,
): HermesConversationState {
  const invokedAt = new Date().toISOString();
  const seed = Date.now();
  const traceId = result.task?.trace_id ?? result.asset?.trace_id ?? result.connector?.trace_id ?? state.conversation.trace_id;
  const connectorCall = makeToolCall({
    approvalRequired: false,
    conversationId: state.conversation.id,
    error: result.connectorError,
    id: `tool_bridge_runtime_${seed}_1`,
    input: { connector_id: 'connector_maya_local' },
    output: result.connector
      ? {
          connector_id: result.connector.id,
          latency_ms: result.connector.health.latency_ms,
          state: result.connector.health.state,
          status: result.connector.status,
          trace: { trace_id: result.connector.trace_id },
          trace_id: result.connector.trace_id,
        }
      : undefined,
    riskLevel: 'low',
    startedAt: invokedAt,
    title: 'External Hermes checks Maya Connector',
    toolName: 'scriptHub.connector.health.get',
    traceId,
  });
  const taskCall = makeToolCall({
    approvalRequired: true,
    conversationId: state.conversation.id,
    error: result.taskError,
    id: `tool_bridge_runtime_${seed}_2`,
    input: result.taskCreateInput ?? externalHermesTaskCreateInput,
    output: result.task && result.approval
      ? {
          approval: { approval_id: result.approval.id, status: result.approval.status },
          approval_id: result.approval.id,
          task: {
            approval_status: result.task.approval_status,
            status: result.task.status,
            task_id: result.task.id,
          },
          task_id: result.task.id,
          task_status: result.task.status,
          trace: { task_id: result.task.id, trace_id: result.task.trace_id },
          trace_id: result.task.trace_id,
        }
      : undefined,
    riskLevel: 'high',
    startedAt: invokedAt,
    title: 'External Hermes creates FBX export task',
    toolName: 'scriptHub.task.create',
    traceId,
  });
  const assetCall = makeToolCall({
    approvalRequired: false,
    conversationId: state.conversation.id,
    error: result.assetError,
    id: `tool_bridge_runtime_${seed}_3`,
    input: {
      approval_id: result.approval?.id,
      storage_uri:
        result.asset?.storage_uri ??
        result.task?.metadata.output_path ??
        result.taskCreateInput?.output_path ??
        externalHermesTaskCreateInput.output_path,
      task_id: result.task?.id,
      trace_id: traceId,
    },
    output: result.asset
      ? {
          approval: { approval_id: result.approval?.id, status: result.asset.approval_status },
          asset: {
            asset_id: result.asset.id,
            asset_type: result.asset.asset_type,
            status: result.asset.status,
            storage_uri: result.asset.storage_uri,
          },
          provenance: {
            generated_by: result.asset.generated_by,
            source_uri: result.asset.source_uri,
            task_id: result.asset.task_id,
            trace_id: result.asset.trace_id,
          },
          trace: { event: 'asset.registered', trace_id: result.asset.trace_id },
          trace_id: result.asset.trace_id,
        }
      : undefined,
    riskLevel: 'low',
    startedAt: invokedAt,
    title: 'External Hermes registers exported FBX asset',
    toolName: 'scriptHub.asset.register',
    traceId,
  });
  const skillCall = makeToolCall({
    approvalRequired: false,
    conversationId: state.conversation.id,
    id: `tool_bridge_runtime_${seed}_4`,
    input: {
      asset_id: result.asset?.id,
      source_trace_id: traceId,
      source: 'runtime_tool_call_sequence',
    },
    output: {
      asset: result.asset ? { asset_id: result.asset.id, task_id: result.asset.task_id } : undefined,
      skill_candidate_id: state.skillCandidate.id,
      status: 'draft',
      trace: { trace_id: traceId },
    },
    riskLevel: 'low',
    startedAt: invokedAt,
    title: 'External Hermes writes skill candidate draft',
    toolName: 'scriptHub.skill.candidate.create',
    traceId,
  });
  const hasError = Boolean(result.taskError || result.connectorError || result.assetError);
  const messages: HermesMessage[] = [
    {
      id: `msg_external_runtime_${seed}`,
      conversation_id: state.conversation.id,
      role: 'hermes',
      content: hasError
        ? 'External Hermes called ScriptHub Tool Bridge and ScriptHub recorded a failed ToolCall with trace context.'
        : 'External Hermes called ScriptHub Tool Bridge and ScriptHub updated connector, task, asset, and trace state.',
      created_at: invokedAt,
      tool_call_id: taskCall.id,
    },
    {
      id: `msg_tool_runtime_${seed}`,
      conversation_id: state.conversation.id,
      role: 'tool',
      content: result.task
        ? `ScriptHub created task ${result.task.id}; approval ${result.approval?.id ?? 'pending'} is linked.`
        : 'ScriptHub could not create the task; inspect the failed ToolCall for details.',
      created_at: invokedAt,
      tool_call_id: taskCall.id,
    },
  ];

  return {
    conversation: {
      ...state.conversation,
      status: hasError ? 'failed' : 'running',
      trace_id: traceId,
      updated_at: invokedAt,
    },
    messages: [...state.messages, ...messages],
    toolCalls: [...state.toolCalls, connectorCall, taskCall, assetCall, skillCall],
    skillCandidate: {
      ...state.skillCandidate,
      source_trace_id: traceId,
      trigger_examples: [
        ...state.skillCandidate.trigger_examples,
        'External Hermes triggered runtime-backed Tool Bridge state update',
      ],
    },
  };
}

export function appendApprovalToolBridgeResult(
  state: HermesConversationState,
  result: ApprovalToolBridgeResult,
): HermesConversationState {
  const invokedAt = new Date().toISOString();
  const seed = Date.now();
  const traceId = result.task?.trace_id ?? result.approval?.trace_id ?? state.conversation.trace_id;
  const approvalCall = makeToolCall({
    approvalRequired: false,
    conversationId: state.conversation.id,
    error: result.error,
    id: `tool_bridge_approval_${seed}`,
    input: {
      approval_id: result.approval?.id ?? 'unknown',
      conversation_id: state.conversation.id,
      decision: result.decision,
    },
    output: result.approval && result.task
      ? {
          approval: { approval_id: result.approval.id, status: result.approval.status },
          approval_id: result.approval.id,
          approval_status: result.approval.status,
          decision: result.decision,
          task: {
            approval_status: result.task.approval_status,
            status: result.task.status,
            task_id: result.task.id,
          },
          task_id: result.task.id,
          task_status: result.task.status,
          trace: { task_id: result.task.id, trace_id: result.task.trace_id },
          trace_id: result.task.trace_id,
        }
      : undefined,
    riskLevel: 'high',
    startedAt: invokedAt,
    title: `External Hermes ${result.decision} approval`,
    toolName: 'scriptHub.approval.decide',
    traceId,
  });
  const messages: HermesMessage[] = [
    {
      id: `msg_external_approval_${seed}`,
      conversation_id: state.conversation.id,
      role: 'hermes',
      content: result.error
        ? 'External Hermes attempted an approval decision, but ScriptHub returned a failure.'
        : `External Hermes submitted approval decision: ${result.decision}.`,
      created_at: invokedAt,
      tool_call_id: approvalCall.id,
    },
    {
      id: `msg_tool_approval_${seed}`,
      conversation_id: state.conversation.id,
      role: 'tool',
      content: result.approval && result.task
        ? `ScriptHub updated approval ${result.approval.id}; task status is ${result.task.status}.`
        : 'ScriptHub could not update approval; inspect the failed ToolCall.',
      created_at: invokedAt,
      tool_call_id: approvalCall.id,
    },
  ];

  return {
    conversation: {
      ...state.conversation,
      status: result.error ? 'failed' : result.decision === 'approved' ? 'running' : 'completed',
      trace_id: traceId,
      updated_at: invokedAt,
    },
    messages: [...state.messages, ...messages],
    toolCalls: [...state.toolCalls, approvalCall],
    skillCandidate: {
      ...state.skillCandidate,
      source_trace_id: traceId,
      trigger_examples: [
        ...state.skillCandidate.trigger_examples,
        `External Hermes ${result.decision} approval through Tool Bridge`,
      ],
    },
  };
}

export const mockToolBridgeProvider: ToolBridgeProvider = {
  taskCreateInput: externalHermesTaskCreateInput,
  appendRuntimeResult: appendRuntimeToolBridgeResult,
  appendApprovalResult: appendApprovalToolBridgeResult,
  appendFailureScenario: appendToolBridgeFailureScenario,
  appendValidationFailureScenario: appendToolBridgeValidationFailureScenario,
  simulateExternalHermes: simulateExternalHermesToolBridge,
};

function makeToolCall(input: {
  approvalRequired: boolean;
  conversationId: string;
  error?: string;
  id: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  riskLevel: ToolCallRecord['risk_level'];
  startedAt: string;
  title: string;
  toolName: string;
  traceId: string;
}): ToolCallRecord {
  return {
    id: input.id,
    conversation_id: input.conversationId,
    trace_id: input.traceId,
    tool_name: input.toolName,
    title: input.title,
    status: input.error ? 'failed' : input.approvalRequired ? 'needs_approval' : 'succeeded',
    input: input.input,
    output: input.output,
    error: input.error,
    risk_level: input.riskLevel,
    approval_required: input.approvalRequired,
    started_at: input.startedAt,
    finished_at: input.startedAt,
  };
}
