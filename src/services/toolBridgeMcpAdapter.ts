import {
  listMcpToolDescriptors,
  type McpToolListItem,
} from './toolBridgeDescriptors';
import { createToolBridgeHttpFallbackHandler, type ToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';
import type { ToolBridgeCallRequest, ToolBridgeCallResult } from './toolBridgeInvocation';

export type McpToolsListResult = {
  tools: McpToolListItem[];
};

export type McpToolsCallRequest = {
  arguments?: Record<string, unknown>;
  name: string;
  _meta?: {
    auth_token_hint?: string;
    caller_agent_id?: string;
    caller_agent_name?: string;
    caller_agent_scopes?: string[];
    caller_agent_version?: string;
    conversation_id?: string;
    idempotency_key?: string;
    parent_tool_call_id?: string;
    requested_at?: string;
    trace_id?: string;
    tool_version?: string;
  };
};

export type McpToolsCallResult = {
  content: Array<{
    text: string;
    type: 'text';
  }>;
  isError?: boolean;
  structuredContent: ToolBridgeCallResult;
};

export type ToolBridgeMcpAdapter = {
  toolsCall: (request: McpToolsCallRequest) => McpToolsCallResult;
  toolsList: () => McpToolsListResult;
};

export function createToolBridgeMcpAdapter(
  handler: ToolBridgeHttpFallbackHandler = createToolBridgeHttpFallbackHandler(),
): ToolBridgeMcpAdapter {
  return {
    toolsCall(request) {
      const result = handler.callTool(toToolBridgeCallRequest(request));
      return {
        content: [
          {
            text: result.error?.message ?? `${request.name} ${result.status}`,
            type: 'text',
          },
        ],
        isError: result.status === 'failed',
        structuredContent: result,
      };
    },
    toolsList() {
      return { tools: listMcpToolDescriptors() };
    },
  };
}

export const toolBridgeMcpAdapter = createToolBridgeMcpAdapter();

function toToolBridgeCallRequest(request: McpToolsCallRequest): ToolBridgeCallRequest {
  const requestedAt = request._meta?.requested_at ?? new Date().toISOString();
  return {
    caller_agent: {
      auth_token_hint: request._meta?.auth_token_hint,
      id: request._meta?.caller_agent_id ?? 'hermes_mcp_client',
      name: request._meta?.caller_agent_name ?? 'Hermes MCP Client',
      scopes: request._meta?.caller_agent_scopes ?? ['tool_bridge:call'],
      transport: 'mcp',
      version: request._meta?.caller_agent_version,
    },
    conversation_id: request._meta?.conversation_id ?? `conv_mcp_${Date.now()}`,
    idempotency_key: request._meta?.idempotency_key,
    input: request.arguments ?? {},
    parent_tool_call_id: request._meta?.parent_tool_call_id,
    requested_at: requestedAt,
    tool_name: request.name,
    tool_version: request._meta?.tool_version,
    trace_id: request._meta?.trace_id,
  };
}
