import { describe, expect, it } from 'vitest';
import {
  createToolBridgeCallRequestFromToolCall,
  validateToolBridgeCallRequest,
  type ToolBridgeCallRequest,
} from './toolBridgeInvocation';
import type { ToolCallRecord } from './hermesConversation';

const validTaskCreateRequest: ToolBridgeCallRequest = {
  caller_agent: {
    id: 'hermes_dev',
    name: 'External Hermes',
    transport: 'mcp',
  },
  conversation_id: 'conv_001',
  input: {
    capability_id: 'maya.export_fbx.v1',
    output_path: 'project://exports/selected_asset.fbx',
    overwrite: false,
  },
  requested_at: '2026-05-23T10:00:00.000Z',
  tool_name: 'scriptHub.task.create',
  tool_version: '1.0.0',
  trace_id: 'trace_001',
};

describe('toolBridgeInvocation', () => {
  it('validates a descriptor-backed Tool Bridge call request', () => {
    const result = validateToolBridgeCallRequest(validTaskCreateRequest);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.descriptor?.name).toBe('scriptHub.task.create');
  });

  it('rejects unknown tools, version mismatches, and unsupported transports', () => {
    expect(
      validateToolBridgeCallRequest({
        ...validTaskCreateRequest,
        tool_name: 'scriptHub.unknown.call',
      }),
    ).toMatchObject({
      issues: [{ code: 'not_found', path: 'tool_name' }],
      ok: false,
    });

    expect(
      validateToolBridgeCallRequest({
        ...validTaskCreateRequest,
        tool_version: '2.0.0',
      }).issues,
    ).toContainEqual(expect.objectContaining({ code: 'version_mismatch', path: 'tool_version' }));

    expect(
      validateToolBridgeCallRequest({
        ...validTaskCreateRequest,
        caller_agent: { ...validTaskCreateRequest.caller_agent, transport: 'webhook' as never },
      }).issues,
    ).toContainEqual(expect.objectContaining({ code: 'unsupported_transport', path: 'caller_agent.transport' }));
  });

  it('rejects invalid input schema values', () => {
    const result = validateToolBridgeCallRequest({
      ...validTaskCreateRequest,
      input: {
        capability_id: 'maya.export_fbx.v1',
        extra_field: 'not allowed',
        overwrite: 'false',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_input', path: 'input.output_path' }),
        expect.objectContaining({ code: 'invalid_input', path: 'input.extra_field' }),
        expect.objectContaining({ code: 'invalid_input', path: 'input.overwrite' }),
      ]),
    );
  });

  it('creates a call request from a ToolCallRecord', () => {
    const toolCall: ToolCallRecord = {
      approval_required: true,
      conversation_id: 'conv_001',
      finished_at: '2026-05-23T10:00:01.000Z',
      id: 'tc_001',
      input: validTaskCreateRequest.input,
      risk_level: 'high',
      started_at: '2026-05-23T10:00:00.000Z',
      status: 'needs_approval',
      title: 'Create task',
      tool_name: 'scriptHub.task.create',
      trace_id: 'trace_001',
    };

    expect(
      createToolBridgeCallRequestFromToolCall({
        requestedAt: toolCall.started_at,
        toolCall,
        transport: 'http',
      }),
    ).toMatchObject({
      caller_agent: { transport: 'http' },
      conversation_id: 'conv_001',
      tool_name: 'scriptHub.task.create',
      tool_version: '1.0.0',
      trace_id: 'trace_001',
    });
  });
});
