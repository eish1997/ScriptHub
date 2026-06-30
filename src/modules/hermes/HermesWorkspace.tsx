import type { HermesConversationState } from '../../services/hermesConversation';
import type { ExternalHttpToolBridgeSyncStatus } from '../../services/runtimeController';
import type { SkillCandidateTransition } from '../../services/skillCandidateTransitions';
import type { ToolBridgeFailureScenario } from '../../services/toolBridgeMock';
import { AgentActivityConsole } from './AgentActivityConsole';
import { SkillCapturePanel } from './SkillCapturePanel';
import { ToolCallTimeline } from './ToolCallTimeline';

type HermesWorkspaceProps = HermesConversationState & {
  externalHttpToolBridgeSync: ExternalHttpToolBridgeSyncStatus;
  onSimulateExternalApprovalDecision: (decision: 'approved' | 'rejected') => void;
  onSimulateExternalToolBridge: () => void;
  onSimulateExternalToolBridgeFailure: (scenario: ToolBridgeFailureScenario) => void;
  onTransitionSkillCandidate: (transition: SkillCandidateTransition) => void;
  onTransitionSkillCandidateViaToolBridge: (transition: SkillCandidateTransition) => void;
};

export function HermesWorkspace({
  conversation,
  externalHttpToolBridgeSync,
  messages,
  onSimulateExternalApprovalDecision,
  onSimulateExternalToolBridge,
  onSimulateExternalToolBridgeFailure,
  onTransitionSkillCandidate,
  onTransitionSkillCandidateViaToolBridge,
  skillCandidate,
  toolCalls,
}: HermesWorkspaceProps) {
  return (
    <div className="hermes-layout">
      <AgentActivityConsole
        conversation={conversation}
        externalHttpToolBridgeSync={externalHttpToolBridgeSync}
        messages={messages}
        onSimulateExternalApprovalDecision={onSimulateExternalApprovalDecision}
        onSimulateExternalToolBridge={onSimulateExternalToolBridge}
        onSimulateExternalToolBridgeFailure={onSimulateExternalToolBridgeFailure}
      />
      <div className="hermes-side">
        <ToolCallTimeline toolCalls={toolCalls} />
        <SkillCapturePanel
          onTransitionSkillCandidate={onTransitionSkillCandidate}
          onTransitionSkillCandidateViaToolBridge={onTransitionSkillCandidateViaToolBridge}
          skillCandidate={skillCandidate}
        />
      </div>
    </div>
  );
}
