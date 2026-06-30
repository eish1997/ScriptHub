import { describe, expect, it } from 'vitest';
import { initialHermesConversation } from './hermesConversation';
import { createToolBridgeHttpFallbackHandler } from './toolBridgeHttpFallback';
import { applySkillCandidateToolBridgeTransition } from './skillCandidateToolBridge';

describe('skillCandidateToolBridge', () => {
  it('records skill candidate transitions as Tool Bridge calls', () => {
    const handler = createToolBridgeHttpFallbackHandler();
    const nextState = applySkillCandidateToolBridgeTransition(
      initialHermesConversation,
      'submit_review',
      handler,
    );
    const toolCall = nextState.toolCalls.at(-1);

    expect(nextState.skillCandidate.status).toBe('reviewing');
    expect(toolCall).toMatchObject({
      approval_required: false,
      risk_level: 'medium',
      status: 'succeeded',
      tool_name: 'scriptHub.skill.candidate.submit_review',
      output: {
        contract_validation: { status: 'passed' },
        fallback_tool_call_id: expect.stringMatching(/^tc_/),
      },
    });
    expect(nextState.messages.at(-1)).toMatchObject({
      role: 'tool',
      tool_call_id: toolCall?.id,
    });
    expect(handler.getToolCall(toolCall?.id ?? '')).toBeTruthy();
  });

  it('records publish as an approval-required Tool Bridge call', () => {
    const reviewingState = {
      ...initialHermesConversation,
      skillCandidate: {
        ...initialHermesConversation.skillCandidate,
        status: 'reviewing' as const,
      },
    };
    const nextState = applySkillCandidateToolBridgeTransition(reviewingState, 'publish');
    const toolCall = nextState.toolCalls.at(-1);

    expect(nextState.skillCandidate.status).toBe('published');
    expect(toolCall).toMatchObject({
      approval_required: true,
      risk_level: 'high',
      status: 'needs_approval',
      tool_name: 'scriptHub.skill.candidate.publish',
    });
  });
});
