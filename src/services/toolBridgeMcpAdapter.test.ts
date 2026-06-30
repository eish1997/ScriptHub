import { describe, expect, it } from 'vitest';
import { listMcpToolDescriptors } from './toolBridgeDescriptors';
import { createToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';
import { createToolBridgeMcpAdapter } from './toolBridgeMcpAdapter';

describe('toolBridgeMcpAdapter', () => {
  it('maps MCP tools/list to the descriptor registry', () => {
    const adapter = createToolBridgeMcpAdapter();

    expect(adapter.toolsList()).toEqual({ tools: listMcpToolDescriptors() });
  });

  it('maps MCP tools/call to the shared fallback handler', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const adapter = createToolBridgeMcpAdapter(handler);
    const result = adapter.toolsCall({
      name: 'scriptHub.task.create',
      arguments: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/selected_asset.fbx',
        overwrite: false,
      },
      _meta: {
        conversation_id: 'conv_001',
        caller_agent_id: 'hermes_prod',
        caller_agent_name: 'Hermes Production',
        caller_agent_scopes: ['tool_bridge:call', 'skill_candidate:publish'],
        caller_agent_version: '1.2.0',
        auth_token_hint: 'token_sha256:abc123',
        idempotency_key: 'conv_001:task_create:001',
        requested_at: '2026-05-23T15:00:00.000Z',
        tool_version: '1.0.0',
        trace_id: 'trace_001',
      },
    });

    expect(result).toMatchObject({
      content: [{ type: 'text' }],
      isError: false,
      structuredContent: {
        audit: {
          auth_token_hint: 'token_sha256:abc123',
          caller_agent_id: 'hermes_prod',
          permissions_checked: ['task:create'],
          scopes: ['tool_bridge:call', 'skill_candidate:publish'],
          transport: 'mcp',
        },
        conversation_id: 'conv_001',
        status: 'needs_approval',
        tool_name: 'scriptHub.task.create',
        trace_id: 'trace_001',
      },
    });
    expect(handler.getToolCall(result.structuredContent.tool_call_id)).toBe(result.structuredContent);
  });

  it('uses a default caller scope when MCP metadata omits caller identity', () => {
    const adapter = createToolBridgeMcpAdapter();
    const result = adapter.toolsCall({
      name: 'scriptHub.connector.health.get',
      arguments: {
        connector_id: 'connector_maya_local',
      },
      _meta: {
        conversation_id: 'conv_001',
        requested_at: '2026-05-23T15:00:30.000Z',
        trace_id: 'trace_001',
      },
    });

    expect(result.structuredContent.audit).toMatchObject({
      caller_agent_id: 'hermes_mcp_client',
      scopes: ['tool_bridge:call'],
      transport: 'mcp',
    });
  });

  it('returns MCP error results for descriptor validation failures', () => {
    const adapter = createToolBridgeMcpAdapter();
    const result = adapter.toolsCall({
      name: 'scriptHub.task.create',
      arguments: {
        capability_id: 'maya.export_fbx.v1',
        overwrite: 'false',
      },
      _meta: {
        conversation_id: 'conv_001',
        requested_at: '2026-05-23T15:01:00.000Z',
        trace_id: 'trace_001',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'invalid_input',
      },
      status: 'failed',
      tool_name: 'scriptHub.task.create',
    });
    expect(result.content[0]?.text).toContain('output_path is required');
  });
});
