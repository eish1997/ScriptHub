import type { ToolCallRecord, ToolCallStatus } from './hermesConversation';

export type ExternalToolBridgeCallResult = {
  approval_required?: boolean;
  conversation_id: string;
  error?: {
    message: string;
  };
  finished_at?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  started_at: string;
  status: ToolCallStatus;
  tool_call_id: string;
  tool_name: string;
  trace_id: string;
  audit?: {
    risk_level?: ToolCallRecord['risk_level'];
  };
};

type ToolBridgeRouteResponse<T> = {
  data?: T;
  ok: boolean;
};

const defaultBaseUrl = 'http://localhost:8787';

export async function listExternalHttpToolCalls(baseUrl = defaultBaseUrl): Promise<ToolCallRecord[]> {
  const response = await fetch(`${baseUrl}/tool-bridge/calls`);
  if (!response.ok) {
    throw new Error(`HTTP Tool Bridge returned ${response.status}`);
  }
  const payload = await response.json() as ToolBridgeRouteResponse<ExternalToolBridgeCallResult[]>;
  if (!payload.ok || !payload.data) return [];
  return payload.data.map(mapExternalHttpToolCall);
}

export function mapExternalHttpToolCall(result: ExternalToolBridgeCallResult): ToolCallRecord {
  return {
    approval_required: Boolean(result.approval_required ?? result.status === 'needs_approval'),
    conversation_id: result.conversation_id,
    error: result.error?.message,
    finished_at: result.finished_at,
    id: result.tool_call_id,
    input: result.input ?? {},
    output: result.output ?? {},
    risk_level: result.audit?.risk_level ?? (result.status === 'needs_approval' ? 'high' : 'low'),
    started_at: result.started_at,
    status: result.status,
    title: getToolCallTitle(result.tool_name),
    tool_name: result.tool_name,
    trace_id: result.trace_id,
  };
}

function getToolCallTitle(toolName: string) {
  if (toolName === 'scriptHub.task.create') return '外部 HTTP 创建任务';
  if (toolName === 'scriptHub.asset.register') return '外部 HTTP 登记产物';
  return `外部 HTTP 调用 ${toolName}`;
}
