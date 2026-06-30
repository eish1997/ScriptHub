import type { SkillCandidate } from './hermesConversation';

export type SkillCandidateStatus = 'draft' | 'reviewing' | 'validated' | 'published' | 'rejected';

export type SkillCandidateTransition = 'save_draft' | 'submit_review' | 'reject' | 'publish';

type TransitionConfig = {
  label: string;
  nextStatus: SkillCandidateStatus;
  from: SkillCandidateStatus[];
};

const transitionConfigs: Record<SkillCandidateTransition, TransitionConfig> = {
  save_draft: {
    label: '保存草稿',
    nextStatus: 'draft',
    from: ['draft', 'reviewing', 'validated', 'rejected'],
  },
  submit_review: {
    label: '送审',
    nextStatus: 'reviewing',
    from: ['draft', 'rejected'],
  },
  reject: {
    label: '拒绝',
    nextStatus: 'rejected',
    from: ['reviewing', 'validated'],
  },
  publish: {
    label: '发布',
    nextStatus: 'published',
    from: ['reviewing', 'validated'],
  },
};

export const skillCandidateTransitionLabels: Record<SkillCandidateTransition, string> = {
  save_draft: transitionConfigs.save_draft.label,
  submit_review: transitionConfigs.submit_review.label,
  reject: transitionConfigs.reject.label,
  publish: transitionConfigs.publish.label,
};

export function canTransitionSkillCandidate(
  status: SkillCandidateStatus,
  transition: SkillCandidateTransition,
): boolean {
  return transitionConfigs[transition].from.includes(status);
}

export function getAvailableSkillCandidateTransitions(
  status: SkillCandidateStatus,
): SkillCandidateTransition[] {
  return (Object.keys(transitionConfigs) as SkillCandidateTransition[]).filter((transition) =>
    canTransitionSkillCandidate(status, transition),
  );
}

export function transitionSkillCandidate(
  skillCandidate: SkillCandidate,
  transition: SkillCandidateTransition,
): SkillCandidate {
  if (!canTransitionSkillCandidate(skillCandidate.status, transition)) {
    throw new Error(`Cannot ${transition} a ${skillCandidate.status} skill candidate`);
  }

  return {
    ...skillCandidate,
    status: transitionConfigs[transition].nextStatus,
  };
}

export function saveSkillCandidateDraft(skillCandidate: SkillCandidate): SkillCandidate {
  return transitionSkillCandidate(skillCandidate, 'save_draft');
}

export function submitSkillCandidateForReview(skillCandidate: SkillCandidate): SkillCandidate {
  return transitionSkillCandidate(skillCandidate, 'submit_review');
}

export function rejectSkillCandidate(skillCandidate: SkillCandidate): SkillCandidate {
  return transitionSkillCandidate(skillCandidate, 'reject');
}

export function publishSkillCandidate(skillCandidate: SkillCandidate): SkillCandidate {
  return transitionSkillCandidate(skillCandidate, 'publish');
}
