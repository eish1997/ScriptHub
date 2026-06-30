import { describe, expect, it } from 'vitest';
import { createToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';
import type { ToolBridgeCallRequest } from './toolBridgeInvocation';

const validTaskCreateRequest: ToolBridgeCallRequest = {
  caller_agent: {
    id: 'hermes_dev',
    name: 'External Hermes',
    scopes: ['tool_bridge:call'],
    transport: 'http',
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

describe('toolBridgeHttpFallback', () => {
  it('lists Tool Bridge descriptors for HTTP fallback discovery', () => {
    const handler = createToolBridgeHttpFallbackHandler();

    expect(handler.listTools().map((tool) => tool.name)).toEqual([
      'scriptHub.connector.health.get',
      'scriptHub.task.create',
      'scriptHub.approval.decide',
      'scriptHub.asset.register',
      'scriptHub.skill.candidate.create',
      'scriptHub.skill.candidate.save_draft',
      'scriptHub.skill.candidate.submit_review',
      'scriptHub.skill.candidate.reject',
      'scriptHub.skill.candidate.publish',
    ]);
    expect(handler.listToolsResponse()).toMatchObject({
      ok: true,
      trace_id: 'trace_tool_bridge_discovery',
    });
    expect(handler.listToolsResponse().data?.length).toBe(handler.listTools().length);
  });

  it('calls a descriptor-backed tool and stores the result by tool_call_id', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const result = handler.callTool(validTaskCreateRequest);

    expect(result).toMatchObject({
      audit: {
        caller_agent_id: 'hermes_dev',
        permissions_checked: ['task:create'],
        policy_decision: 'allow',
        risk_level: 'high',
        scopes: ['tool_bridge:call'],
        transport: 'http',
      },
      conversation_id: 'conv_001',
      output: {
        accepted: true,
        contract_validation: { status: 'passed' },
        descriptor: {
          approval_required: true,
          name: 'scriptHub.task.create',
          version: '1.0.0',
        },
        transport: 'http',
      },
      status: 'needs_approval',
      tool_name: 'scriptHub.task.create',
      trace_id: 'trace_001',
    });
    expect(handler.getToolCall(result.tool_call_id)).toBe(result);

    expect(handler.callToolResponse(validTaskCreateRequest)).toMatchObject({
      data: {
        status: 'needs_approval',
        tool_name: 'scriptHub.task.create',
        trace_id: 'trace_001',
      },
      ok: true,
      trace_id: 'trace_001',
    });
  });

  it('returns the same result for repeated idempotency keys', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const firstResult = handler.callTool({
      ...validTaskCreateRequest,
      idempotency_key: 'conv_001:task_create:001',
    });
    const replayedResult = handler.callTool({
      ...validTaskCreateRequest,
      input: {
        ...validTaskCreateRequest.input,
        output_path: 'project://exports/another_asset.fbx',
      },
      idempotency_key: 'conv_001:task_create:001',
    });

    expect(replayedResult).toBe(firstResult);
    expect(replayedResult.tool_call_id).toBe(firstResult.tool_call_id);
  });

  it('returns failed results when descriptor validation fails', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const result = handler.callTool({
      ...validTaskCreateRequest,
      input: {
        capability_id: 'maya.export_fbx.v1',
        overwrite: 'false',
      },
    });

    expect(result.status).toBe('failed');
    expect(result.audit.policy_decision).toBe('deny');
    expect(result.error).toMatchObject({
      code: 'invalid_input',
      recoverable: true,
    });
    expect(result.error?.detail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'input.output_path' }),
        expect.objectContaining({ path: 'input.overwrite' }),
      ]),
    );
    expect(
      handler.callToolResponse({
        ...validTaskCreateRequest,
        input: {
          capability_id: 'maya.export_fbx.v1',
          overwrite: 'false',
        },
      }),
    ).toMatchObject({
      error: {
        code: 'invalid_input',
        recoverable: true,
      },
      ok: false,
      trace_id: 'trace_001',
    });
  });

  it('wraps getToolCall results in route-style envelopes', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const result = handler.callTool(validTaskCreateRequest);

    expect(handler.getToolCallResponse(result.tool_call_id)).toMatchObject({
      data: {
        tool_call_id: result.tool_call_id,
      },
      ok: true,
      trace_id: 'trace_001',
    });
    expect(handler.getToolCallResponse('tc_missing')).toMatchObject({
      error: {
        code: 'not_found',
        recoverable: false,
      },
      ok: false,
      trace_id: 'trace_unknown',
    });
  });

  it('accepts skill candidate creation through the fallback handler', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const result = handler.callTool({
      caller_agent: {
        id: 'hermes_dev',
        name: 'External Hermes',
        transport: 'http',
      },
      conversation_id: 'conv_001',
      input: {
        asset_id: 'asset_selected_fbx_001',
        source: 'tool_call_sequence',
        source_trace_id: 'trace_fbx_export_001',
      },
      requested_at: '2026-05-23T10:01:00.000Z',
      tool_name: 'scriptHub.skill.candidate.create',
      tool_version: '1.0.0',
      trace_id: 'trace_fbx_export_001',
    });

    expect(result).toMatchObject({
      audit: {
        permissions_checked: ['skill_candidate:create'],
        policy_decision: 'allow',
        risk_level: 'low',
      },
      output: {
        descriptor: {
          approval_required: false,
          name: 'scriptHub.skill.candidate.create',
        },
      },
      status: 'succeeded',
    });
  });

  it('accepts skill candidate review flow tools through the fallback handler', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const submitReview = handler.callTool({
      caller_agent: {
        id: 'hermes_dev',
        name: 'External Hermes',
        transport: 'http',
      },
      conversation_id: 'conv_001',
      input: {
        actor_id: 'hermes_dev',
        skill_candidate_id: 'skill_candidate_fbx_export_001',
        trace_id: 'trace_fbx_export_001',
      },
      requested_at: '2026-05-23T10:02:00.000Z',
      tool_name: 'scriptHub.skill.candidate.submit_review',
      tool_version: '1.0.0',
      trace_id: 'trace_fbx_export_001',
    });
    const publish = handler.callTool({
      caller_agent: {
        id: 'hermes_dev',
        name: 'External Hermes',
        transport: 'http',
      },
      conversation_id: 'conv_001',
      input: {
        actor_id: 'hermes_dev',
        note: 'Reviewed by operator in Hermes',
        skill_candidate_id: 'skill_candidate_fbx_export_001',
        trace_id: 'trace_fbx_export_001',
      },
      requested_at: '2026-05-23T10:03:00.000Z',
      tool_name: 'scriptHub.skill.candidate.publish',
      tool_version: '1.0.0',
      trace_id: 'trace_fbx_export_001',
    });

    expect(submitReview).toMatchObject({
      audit: {
        permissions_checked: ['skill_candidate:submit_review'],
        risk_level: 'medium',
      },
      status: 'succeeded',
    });
    expect(publish).toMatchObject({
      audit: {
        permissions_checked: ['skill_candidate:publish'],
        risk_level: 'high',
      },
      status: 'needs_approval',
    });
  });
});
