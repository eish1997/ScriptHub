import { describe, expect, it } from 'vitest';
import { initialHermesConversation } from './hermesConversation';
import { approval, connector, task } from './mockRuntime';
import { mockToolBridgeProvider, toolBridgeFailureScenarioErrors } from './toolBridgeMock';
import { createToolBridgeProvider } from './toolBridgeProviderFactory';

describe('mockToolBridgeProvider', () => {
  it('exposes the external Hermes task creation input used by runtime submission', () => {
    expect(mockToolBridgeProvider.taskCreateInput).toEqual({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/selected_asset.fbx',
      overwrite: false,
    });
  });

  it('appends runtime-backed Tool Bridge results through the provider contract', () => {
    const nextState = mockToolBridgeProvider.appendRuntimeResult(initialHermesConversation, {
      approval,
      connector,
      task,
    });

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.conversation.trace_id).toBe(task.trace_id);
    expect(nextState.toolCalls.at(-4)?.tool_name).toBe('scriptHub.connector.health.get');
    expect(nextState.toolCalls.at(-3)).toMatchObject({
      tool_name: 'scriptHub.task.create',
      status: 'needs_approval',
      output: {
        approval_id: approval.id,
        task_id: task.id,
      },
    });
    expect(nextState.skillCandidate.trigger_examples).toContain(
      'External Hermes triggered runtime-backed Tool Bridge state update',
    );
  });

  it('records edited replay parameters in task.create ToolCall input', () => {
    const taskCreateInput = {
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/hero_asset_custom.fbx',
      overwrite: true,
    };
    const nextState = mockToolBridgeProvider.appendRuntimeResult(initialHermesConversation, {
      approval,
      connector,
      task: {
        ...task,
        metadata: taskCreateInput,
      },
      taskCreateInput,
    });

    expect(nextState.toolCalls.at(-3)).toMatchObject({
      tool_name: 'scriptHub.task.create',
      input: taskCreateInput,
    });
  });

  it('appends approval decisions through the provider contract', () => {
    const nextState = mockToolBridgeProvider.appendApprovalResult(initialHermesConversation, {
      approval: { ...approval, status: 'approved' },
      decision: 'approved',
      task: { ...task, status: 'running' },
    });

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.toolCalls.at(-1)).toMatchObject({
      tool_name: 'scriptHub.approval.decide',
      status: 'succeeded',
      output: {
        approval_id: approval.id,
        decision: 'approved',
        task_id: task.id,
      },
    });
  });

  it('appends reusable failure scenarios through the provider contract', () => {
    const nextState = mockToolBridgeProvider.appendFailureScenario(initialHermesConversation, 'task_create_failed');

    expect(nextState.conversation.status).toBe('failed');
    expect(nextState.toolCalls.at(-3)).toMatchObject({
      tool_name: 'scriptHub.task.create',
      status: 'failed',
      error: toolBridgeFailureScenarioErrors.task_create_failed,
    });
  });

  it('preserves the existing external Hermes mock chain through the provider contract', () => {
    const nextState = mockToolBridgeProvider.simulateExternalHermes(initialHermesConversation);

    expect(nextState.conversation.status).toBe('running');
    expect(nextState.messages).toHaveLength(initialHermesConversation.messages.length + 2);
    expect(nextState.toolCalls).toHaveLength(initialHermesConversation.toolCalls.length + 4);
    expect(nextState.toolCalls.at(-3)).toMatchObject({
      tool_name: 'scriptHub.task.create',
      status: 'needs_approval',
    });
  });

  it('selects the mock provider for default and unknown provider modes', () => {
    expect(createToolBridgeProvider(undefined)).toBe(mockToolBridgeProvider);
    expect(createToolBridgeProvider('unknown')).toBe(mockToolBridgeProvider);
  });

  it('creates transport-marked MCP and HTTP provider skeletons', () => {
    const mcpState = createToolBridgeProvider('mcp').appendRuntimeResult(initialHermesConversation, {
      approval,
      connector,
      task,
    });
    const httpState = createToolBridgeProvider('http').appendApprovalResult(initialHermesConversation, {
      approval,
      decision: 'rejected',
      task,
    });

    expect(mcpState.toolCalls.at(-3)?.input).toMatchObject({
      contract_validation: { status: 'passed' },
      transport: 'mcp',
    });
    expect(mcpState.toolCalls.at(-3)?.output).toMatchObject({
      contract_validation: { status: 'passed' },
      fallback_tool_call_id: expect.stringMatching(/^tc_/),
      tool_version: '1.0.0',
      transport: 'mcp',
    });
    expect(mcpState.toolCalls.at(-1)?.input).toMatchObject({
      contract_validation: { status: 'passed' },
      tool_version: '1.0.0',
      transport: 'mcp',
    });
    expect(httpState.toolCalls.at(-1)?.input).toMatchObject({ transport: 'http' });
    expect(httpState.toolCalls.at(-1)?.output).toMatchObject({
      contract_validation: { status: 'passed' },
      fallback_tool_call_id: expect.stringMatching(/^tc_/),
      tool_version: '1.0.0',
      transport: 'http',
    });
  });

  it('appends descriptor validation failure scenarios through transport providers', () => {
    const nextState = createToolBridgeProvider('http').appendValidationFailureScenario(initialHermesConversation);
    const toolCall = nextState.toolCalls.at(-1);

    expect(nextState.conversation.status).toBe('failed');
    expect(toolCall).toMatchObject({
      tool_name: 'scriptHub.task.create',
      status: 'failed',
      input: {
        contract_validation: {
          status: 'failed',
        },
        fallback_tool_call_id: expect.stringMatching(/^tc_/),
        transport: 'http',
      },
    });
    expect(toolCall?.error).toContain('output_path is required');
  });
});
