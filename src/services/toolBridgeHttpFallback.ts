import { listHttpToolDescriptors } from './toolBridgeDescriptors';
import {
  validateToolBridgeCallRequest,
  type ToolBridgeCallError,
  type ToolBridgeCallRequest,
  type ToolBridgeCallResult,
} from './toolBridgeInvocation';

export type ToolBridgeRouteResponse<T> = {
  data?: T;
  error?: ToolBridgeCallError;
  ok: boolean;
  timestamp: string;
  trace_id: string;
};

export type ToolBridgeHttpFallbackHandler = {
  callTool: (request: ToolBridgeCallRequest) => ToolBridgeCallResult;
  callToolResponse: (request: ToolBridgeCallRequest) => ToolBridgeRouteResponse<ToolBridgeCallResult>;
  getToolCall: (toolCallId: string) => ToolBridgeCallResult | undefined;
  getToolCallResponse: (toolCallId: string) => ToolBridgeRouteResponse<ToolBridgeCallResult>;
  listTools: () => ReturnType<typeof listHttpToolDescriptors>;
  listToolsResponse: () => ToolBridgeRouteResponse<ReturnType<typeof listHttpToolDescriptors>>;
};

export function createToolBridgeHttpFallbackHandler(): ToolBridgeHttpFallbackHandler {
  const calls = new Map<string, ToolBridgeCallResult>();
  const idempotentCalls = new Map<string, ToolBridgeCallResult>();

  return {
    callTool(request) {
      if (request.idempotency_key) {
        const previousResult = idempotentCalls.get(request.idempotency_key);
        if (previousResult) return previousResult;
      }

      const validation = validateToolBridgeCallRequest(request);
      const now = new Date().toISOString();
      const traceId = request.trace_id ?? `trace_tool_bridge_${Date.now()}`;
      const toolCallId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const firstIssue = validation.issues[0];
      const result: ToolBridgeCallResult = {
        audit: {
          actor_id: request.caller_agent.id,
          actor_type: 'external_hermes',
          audit_id: `audit_${toolCallId}`,
          auth_token_hint: request.caller_agent.auth_token_hint,
          caller_agent_id: request.caller_agent.id,
          created_at: now,
          permissions_checked: validation.descriptor?.permissions ?? [],
          policy_decision: validation.ok ? 'allow' : 'deny',
          risk_level: validation.descriptor?.risk_level ?? 'high',
          scopes: request.caller_agent.scopes ?? [],
          transport: request.caller_agent.transport,
        },
        conversation_id: request.conversation_id,
        error: validation.ok
          ? undefined
          : {
              code: firstIssue?.code ?? 'invalid_input',
              detail: validation.issues,
              message: validation.issues.map((issue) => issue.message).join('; '),
              recoverable: true,
            },
        finished_at: now,
        output: validation.ok
          ? {
              accepted: true,
              contract_validation: {
                errors: [],
                status: 'passed',
              },
              descriptor: validation.descriptor
                ? {
                    approval_required: validation.descriptor.approval_required,
                    name: validation.descriptor.name,
                    permissions: validation.descriptor.permissions,
                    risk_level: validation.descriptor.risk_level,
                    version: validation.descriptor.version,
                  }
                : undefined,
              dry_run: Boolean(request.dry_run),
              tool_version: validation.descriptor?.version,
              transport: request.caller_agent.transport,
            }
          : undefined,
        started_at: now,
        status: validation.ok ? (validation.descriptor?.approval_required ? 'needs_approval' : 'succeeded') : 'failed',
        tool_call_id: toolCallId,
        tool_name: request.tool_name,
        trace_id: traceId,
      };

      calls.set(result.tool_call_id, result);
      if (request.idempotency_key) idempotentCalls.set(request.idempotency_key, result);
      return result;
    },
    callToolResponse(request) {
      const result = this.callTool(request);
      return makeRouteResponse(result.status !== 'failed', result.trace_id, result, result.error);
    },
    getToolCall(toolCallId) {
      return calls.get(toolCallId);
    },
    getToolCallResponse(toolCallId) {
      const result = this.getToolCall(toolCallId);
      if (!result) {
        return makeRouteResponse<ToolBridgeCallResult>(false, 'trace_unknown', undefined, {
          code: 'not_found',
          message: `Tool call ${toolCallId} not found`,
          recoverable: false,
        });
      }
      return makeRouteResponse(true, result.trace_id, result);
    },
    listTools() {
      return listHttpToolDescriptors();
    },
    listToolsResponse() {
      return makeRouteResponse(true, 'trace_tool_bridge_discovery', this.listTools());
    },
  };
}

export const toolBridgeHttpFallbackHandler = createToolBridgeHttpFallbackHandler();

function makeRouteResponse<T>(
  ok: boolean,
  traceId: string,
  data?: T,
  error?: ToolBridgeCallError,
): ToolBridgeRouteResponse<T> {
  return {
    data: ok ? data : undefined,
    error: ok ? undefined : error,
    ok,
    timestamp: new Date().toISOString(),
    trace_id: traceId,
  };
}
