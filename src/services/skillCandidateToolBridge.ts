import type { HermesConversationState, HermesMessage, ToolCallRecord } from './hermesConversation';
import { transitionSkillCandidate, type SkillCandidateTransition } from './skillCandidateTransitions';
import { createToolBridgeHttpFallbackHandler, type ToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';
import type { ToolBridgeCallRequest } from './toolBridgeInvocation';

const transitionToolNames: Record<SkillCandidateTransition, string> = {
  save_draft: 'scriptHub.skill.candidate.save_draft',
  submit_review: 'scriptHub.skill.candidate.submit_review',
  reject: 'scriptHub.skill.candidate.reject',
  publish: 'scriptHub.skill.candidate.publish',
};

export function applySkillCandidateToolBridgeTransition(
  state: HermesConversationState,
  transition: SkillCandidateTransition,
  handler: ToolBridgeHttpFallbackHandler = createToolBridgeHttpFallbackHandler(),
): HermesConversationState {
  const requestedAt = new Date().toISOString();
  const request: ToolBridgeCallRequest = {
    caller_agent: {
      id: 'scriptHub_devtools',
      name: 'ScriptHub DevTools',
      scopes: ['tool_bridge:call', 'skill_candidate:review_flow'],
      transport: 'http',
      version: 'dev',
    },
    conversation_id: state.conversation.id,
    idempotency_key: `${state.conversation.id}:${state.skillCandidate.id}:${transition}`,
    input: {
      actor_id: 'scriptHub_devtools',
      conversation_id: state.conversation.id,
      note: `Dev Status Flow ${transition}`,
      skill_candidate_id: state.skillCandidate.id,
      trace_id: state.skillCandidate.source_trace_id,
    },
    requested_at: requestedAt,
    tool_name: transitionToolNames[transition],
    tool_version: '1.0.0',
    trace_id: state.skillCandidate.source_trace_id,
  };
  const result = handler.callTool(request);
  const toolCall: ToolCallRecord = {
    id: result.tool_call_id,
    conversation_id: state.conversation.id,
    trace_id: result.trace_id,
    tool_name: request.tool_name,
    title: `External Hermes ${transition} skill candidate`,
    status: result.status === 'queued' || result.status === 'cancelled' ? 'running' : result.status,
    input: request.input,
    output: result.output
      ? {
          ...result.output,
          fallback_tool_call_id: result.tool_call_id,
        }
      : undefined,
    error: result.error?.message,
    risk_level: result.audit.risk_level,
    approval_required: result.status === 'needs_approval',
    started_at: result.started_at,
    finished_at: result.finished_at,
  };
  const messages: HermesMessage[] = [
    {
      id: `msg_skill_flow_${result.tool_call_id}`,
      conversation_id: state.conversation.id,
      role: 'tool',
      content: result.error
        ? `ScriptHub rejected skill candidate transition ${transition}.`
        : `ScriptHub recorded skill candidate transition ${transition} through Tool Bridge.`,
      created_at: result.finished_at ?? requestedAt,
      tool_call_id: toolCall.id,
    },
  ];

  return {
    conversation: {
      ...state.conversation,
      status: result.status === 'failed' ? 'failed' : state.conversation.status,
      updated_at: result.finished_at ?? requestedAt,
    },
    messages: [...state.messages, ...messages],
    toolCalls: [...state.toolCalls, toolCall],
    skillCandidate: result.status === 'failed' ? state.skillCandidate : transitionSkillCandidate(state.skillCandidate, transition),
  };
}
