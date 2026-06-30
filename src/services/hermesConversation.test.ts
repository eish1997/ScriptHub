import { describe, expect, it } from 'vitest';
import { initialHermesConversation } from './hermesConversation';
import { approval, asset, connector, disconnectConnector, task } from './mockRuntime';
import {
  appendApprovalToolBridgeResult,
  appendToolBridgeFailureScenario,
  appendRuntimeToolBridgeResult,
  createApprovalDecideFailedBridgeResult,
  createConnectorUnavailableBridgeResult,
  createTaskCreateFailedBridgeResult,
  simulateExternalHermesToolBridge,
  toolBridgeFailureScenarioErrors,
} from './toolBridgeMock';

describe('hermesConversation', () => {
  it('mirrors external Hermes tool bridge calls and updates the skill candidate', () => {
    const nextState = simulateExternalHermesToolBridge(initialHermesConversation);

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.messages).toHaveLength(initialHermesConversation.messages.length + 2);
    expect(nextState.messages.at(-1)?.role).toBe('tool');
    expect(nextState.toolCalls).toHaveLength(initialHermesConversation.toolCalls.length + 4);
    expect(nextState.toolCalls.at(-3)?.tool_name).toBe('scriptHub.task.create');
    expect(nextState.toolCalls.at(-3)?.status).toBe('needs_approval');
    expect(nextState.toolCalls.at(-2)?.tool_name).toBe('scriptHub.asset.register');
    expect(nextState.toolCalls.at(-2)?.output).toMatchObject({
      asset: {
        asset_id: 'asset_selected_fbx_001',
        storage_uri: 'project://exports/selected_asset.fbx',
      },
      provenance: {
        task_id: 'task_fbx_export_001',
        trace_id: 'trace_fbx_export_001',
      },
    });
    expect(nextState.skillCandidate.trigger_examples).toContain('External Hermes triggered FBX export through Tool Bridge');
  });

  it('records runtime-backed tool bridge results with real task, approval, and asset output', () => {
    const nextState = appendRuntimeToolBridgeResult(initialHermesConversation, {
      approval,
      asset,
      connector,
      task,
    });

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.conversation.trace_id).toBe(task.trace_id);
    expect(nextState.toolCalls).toHaveLength(initialHermesConversation.toolCalls.length + 4);
    expect(nextState.toolCalls.at(-3)?.tool_name).toBe('scriptHub.task.create');
    expect(nextState.toolCalls.at(-3)?.output).toMatchObject({
      approval_id: approval.id,
      task_id: task.id,
      trace: {
        trace_id: task.trace_id,
      },
    });
    expect(nextState.toolCalls.at(-2)?.tool_name).toBe('scriptHub.asset.register');
    expect(nextState.toolCalls.at(-2)?.output).toMatchObject({
      approval: {
        approval_id: approval.id,
      },
      asset: {
        asset_id: asset.id,
        storage_uri: asset.storage_uri,
      },
      provenance: {
        generated_by: asset.generated_by,
        task_id: task.id,
        trace_id: task.trace_id,
      },
    });
    expect(nextState.skillCandidate.source_trace_id).toBe(task.trace_id);
  });

  it('records approval decisions from the external Hermes tool bridge', () => {
    const nextState = appendApprovalToolBridgeResult(initialHermesConversation, {
      approval: { ...approval, status: 'approved' },
      decision: 'approved',
      task: { ...task, status: 'running' },
    });

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.toolCalls).toHaveLength(initialHermesConversation.toolCalls.length + 1);
    expect(nextState.toolCalls.at(-1)?.tool_name).toBe('scriptHub.approval.decide');
    expect(nextState.toolCalls.at(-1)?.output).toMatchObject({
      approval: {
        approval_id: approval.id,
      },
      approval_status: 'approved',
      decision: 'approved',
      task_status: 'running',
      trace: {
        trace_id: task.trace_id,
      },
    });
    expect(nextState.skillCandidate.trigger_examples).toContain('External Hermes approved approval through Tool Bridge');
  });

  it('records connector unavailable failures through a pure bridge result', () => {
    const unavailableConnector = disconnectConnector(connector);
    const nextState = appendRuntimeToolBridgeResult(
      initialHermesConversation,
      createConnectorUnavailableBridgeResult({
        connector: unavailableConnector,
        reason: unavailableConnector.health.last_error,
      }),
    );

    expect(nextState.conversation.status).toBe('failed');
    expect(nextState.toolCalls.at(-4)?.tool_name).toBe('scriptHub.connector.health.get');
    expect(nextState.toolCalls.at(-4)?.status).toBe('failed');
    expect(nextState.toolCalls.at(-4)?.error).toBe('Maya session heartbeat lost');
    expect(nextState.toolCalls.at(-4)?.output).toMatchObject({
      state: 'unavailable',
      status: 'disconnected',
    });
  });

  it('records task.create failures through a pure bridge result', () => {
    const nextState = appendRuntimeToolBridgeResult(
      initialHermesConversation,
      createTaskCreateFailedBridgeResult({
        connector,
        error: 'task.create rejected invalid output path',
      }),
    );

    expect(nextState.conversation.status).toBe('failed');
    expect(nextState.toolCalls.at(-3)?.tool_name).toBe('scriptHub.task.create');
    expect(nextState.toolCalls.at(-3)?.status).toBe('failed');
    expect(nextState.toolCalls.at(-3)?.error).toBe('task.create rejected invalid output path');
  });

  it('records approval.decide failures through a pure bridge result', () => {
    const nextState = appendApprovalToolBridgeResult(
      initialHermesConversation,
      createApprovalDecideFailedBridgeResult({
        approval,
        decision: 'approved',
        error: 'approval.decide permission denied',
        task,
      }),
    );

    expect(nextState.conversation.status).toBe('failed');
    expect(nextState.toolCalls.at(-1)?.tool_name).toBe('scriptHub.approval.decide');
    expect(nextState.toolCalls.at(-1)?.status).toBe('failed');
    expect(nextState.toolCalls.at(-1)?.error).toBe('approval.decide permission denied');
    expect(nextState.toolCalls.at(-1)?.output).toMatchObject({
      approval_id: approval.id,
      task_id: task.id,
      trace_id: task.trace_id,
    });
  });

  it('appends reusable Tool Bridge failure scenarios', () => {
    const connectorUnavailable = appendToolBridgeFailureScenario(initialHermesConversation, 'connector_unavailable');
    const taskCreateFailed = appendToolBridgeFailureScenario(initialHermesConversation, 'task_create_failed');
    const approvalDecideFailed = appendToolBridgeFailureScenario(initialHermesConversation, 'approval_decide_failed');

    expect(connectorUnavailable.conversation.status).toBe('failed');
    expect(connectorUnavailable.toolCalls.at(-4)).toMatchObject({
      tool_name: 'scriptHub.connector.health.get',
      status: 'failed',
      error: toolBridgeFailureScenarioErrors.connector_unavailable,
    });

    expect(taskCreateFailed.conversation.status).toBe('failed');
    expect(taskCreateFailed.toolCalls.at(-3)).toMatchObject({
      tool_name: 'scriptHub.task.create',
      status: 'failed',
      error: toolBridgeFailureScenarioErrors.task_create_failed,
    });

    expect(approvalDecideFailed.conversation.status).toBe('failed');
    expect(approvalDecideFailed.toolCalls.at(-1)).toMatchObject({
      tool_name: 'scriptHub.approval.decide',
      status: 'failed',
      error: toolBridgeFailureScenarioErrors.approval_decide_failed,
    });
  });
});
