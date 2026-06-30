import type { HermesConversationState } from './hermesConversation';
import {
  appendApprovalToolBridgeResult,
  appendRuntimeToolBridgeResult,
  appendToolBridgeValidationFailureScenario,
  appendToolBridgeFailureScenario,
  externalHermesTaskCreateInput,
  mockToolBridgeProvider,
} from './toolBridgeMock';
import type {
  ApprovalToolBridgeResult,
  RuntimeToolBridgeResult,
  ToolBridgeFailureScenario,
  ToolBridgeProvider,
} from './toolBridgeProvider';
import { getToolBridgeDescriptor } from './toolBridgeDescriptors';
import {
  createToolBridgeCallRequestFromToolCall,
} from './toolBridgeInvocation';
import { createToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';

export type ToolBridgeProviderMode = 'mock' | 'mcp' | 'http';

export const currentToolBridgeProviderMode: ToolBridgeProviderMode =
  import.meta.env.VITE_TOOL_BRIDGE_PROVIDER === 'mcp' || import.meta.env.VITE_TOOL_BRIDGE_PROVIDER === 'http'
    ? import.meta.env.VITE_TOOL_BRIDGE_PROVIDER
    : 'mock';

export function createToolBridgeProvider(mode: string | undefined): ToolBridgeProvider {
  if (mode === 'mcp') return createTransportProvider('mcp');
  if (mode === 'http') return createTransportProvider('http');
  return mockToolBridgeProvider;
}

export const toolBridgeProvider = createToolBridgeProvider(currentToolBridgeProviderMode);

const transportHandlers = {
  http: createToolBridgeHttpFallbackHandler(),
  mcp: createToolBridgeHttpFallbackHandler(),
};

function createTransportProvider(mode: Exclude<ToolBridgeProviderMode, 'mock'>): ToolBridgeProvider {
  return {
    taskCreateInput: externalHermesTaskCreateInput,
    appendRuntimeResult(state: HermesConversationState, result: RuntimeToolBridgeResult) {
      return markTransport(state, appendRuntimeToolBridgeResult(state, result), mode);
    },
    appendApprovalResult(state: HermesConversationState, result: ApprovalToolBridgeResult) {
      return markTransport(state, appendApprovalToolBridgeResult(state, result), mode);
    },
    appendFailureScenario(state: HermesConversationState, scenario: ToolBridgeFailureScenario) {
      return markTransport(state, appendToolBridgeFailureScenario(state, scenario), mode);
    },
    appendValidationFailureScenario(state: HermesConversationState) {
      return markTransport(state, appendToolBridgeValidationFailureScenario(state), mode);
    },
    simulateExternalHermes(state: HermesConversationState) {
      return markTransport(state, mockToolBridgeProvider.simulateExternalHermes(state), mode);
    },
  };
}

function markTransport(
  previousState: HermesConversationState,
  nextState: HermesConversationState,
  transport: Exclude<ToolBridgeProviderMode, 'mock'>,
): HermesConversationState {
  return {
    ...nextState,
    toolCalls: nextState.toolCalls.map((toolCall, index) => {
      if (index < previousState.toolCalls.length) return toolCall;
      const descriptor = getToolBridgeDescriptor(toolCall.tool_name);
      const callResult = descriptor
        ? transportHandlers[transport].callTool(
            createToolBridgeCallRequestFromToolCall({
              requestedAt: toolCall.started_at,
              toolCall,
              transport,
            }),
          )
        : undefined;
      const contractValidation = callResult
        ? {
            errors: callResult.error?.detail?.map((issue) => issue.message) ?? [],
            status: callResult.status === 'failed' ? 'failed' : 'passed',
          }
        : {
            errors: [`Tool descriptor not registered for ${toolCall.tool_name}`],
            status: 'skipped',
          };
      return {
        ...toolCall,
        error: callResult?.error?.message ?? toolCall.error,
        status: callResult?.status === 'failed' ? 'failed' : toolCall.status,
        input: {
          ...toolCall.input,
          contract_validation: contractValidation,
          fallback_tool_call_id: callResult?.tool_call_id,
          transport,
          tool_version: descriptor?.version,
        },
        output: toolCall.output
          ? {
              ...toolCall.output,
              fallback_tool_call_id: callResult?.tool_call_id,
              contract_validation: contractValidation,
              transport,
              tool_version: descriptor?.version,
            }
          : toolCall.output,
      };
    }),
  };
}
