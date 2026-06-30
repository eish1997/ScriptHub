import { useMemo, useState } from 'react';
import { BadgeCheck, GitBranch, PlayCircle, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import type { SkillCandidate } from '../../services/hermesConversation';
import {
  getAvailableSkillCandidateTransitions,
  skillCandidateTransitionLabels,
  type SkillCandidateTransition,
} from '../../services/skillCandidateTransitions';

type SkillCapturePanelProps = {
  onTransitionSkillCandidate?: (transition: SkillCandidateTransition) => void;
  onTransitionSkillCandidateViaToolBridge?: (transition: SkillCandidateTransition) => void;
  skillCandidate: SkillCandidate;
};

export function SkillCapturePanel({
  onTransitionSkillCandidate,
  onTransitionSkillCandidateViaToolBridge,
  skillCandidate,
}: SkillCapturePanelProps) {
  const displayCandidate = skillCandidate;
  const [useToolBridgeFlow, setUseToolBridgeFlow] = useState(false);
  const availableTransitions = useMemo(
    () => getAvailableSkillCandidateTransitions(displayCandidate.status),
    [displayCandidate.status],
  );

  const handleTransition = (transition: SkillCandidateTransition) => {
    if (useToolBridgeFlow && onTransitionSkillCandidateViaToolBridge) {
      onTransitionSkillCandidateViaToolBridge(transition);
      return;
    }
    onTransitionSkillCandidate?.(transition);
  };

  return (
    <section className="panel">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Skill Capture</p>
          <h2>Skill Candidate</h2>
        </div>
        <span className={`status-badge ${displayCandidate.status}`}>{displayCandidate.status}</span>
      </div>

      <div className="skill-candidate-summary">
        <BadgeCheck size={24} />
        <div>
          <strong>{displayCandidate.name}</strong>
          <p>{displayCandidate.summary}</p>
        </div>
      </div>

      <div className="permission-note">
        <GitBranch size={18} />
        <span>
          Trace: {displayCandidate.source_trace_id} / Conversation: {displayCandidate.source_conversation_id}
        </span>
      </div>

      <div className="permission-note">
        <ShieldAlert size={18} />
        <span>
          风险等级 <strong className={`risk-badge ${displayCandidate.risk_level}`}>{displayCandidate.risk_level}</strong>
        </span>
      </div>

      <div className="permission-note">
        <ShieldCheck size={18} />
        <span>{displayCandidate.required_permissions.join(' / ')}</span>
      </div>

      <div className="skill-step-list">
        {displayCandidate.trigger_examples.map((example) => (
          <div className="skill-step" key={example}>
            <span>
              <Sparkles size={16} />
            </span>
            <div>
              <strong>{example}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="skill-step-list">
        {displayCandidate.steps.map((step) => (
          <div className="skill-step" key={step.order}>
            <span>{step.order}</span>
            <div>
              <strong>{step.intent}</strong>
              {step.tool_name && <code>{step.tool_name}</code>}
              {step.failure_handling && <p>{step.failure_handling}</p>}
            </div>
          </div>
        ))}
      </div>

      {import.meta.env.DEV && (
        <div className="debug-control">
          <p className="eyebrow">Dev Status Flow</p>
          <label className="debug-toggle">
            <input
              checked={useToolBridgeFlow}
              disabled={!onTransitionSkillCandidateViaToolBridge}
              onChange={(event) => setUseToolBridgeFlow(event.target.checked)}
              type="checkbox"
            />
            <span>经 Tool Bridge</span>
          </label>
          <div className="action-row">
            {(Object.keys(skillCandidateTransitionLabels) as SkillCandidateTransition[]).map((transition) => (
              <button
                className="secondary-button"
                disabled={
                  !availableTransitions.includes(transition) ||
                  (!onTransitionSkillCandidate && !onTransitionSkillCandidateViaToolBridge)
                }
                key={transition}
                onClick={() => handleTransition(transition)}
                type="button"
              >
                <PlayCircle size={16} />
                {skillCandidateTransitionLabels[transition]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
