import { describe, expect, it } from 'vitest';
import { initialHermesConversation } from './hermesConversation';
import {
  getAvailableSkillCandidateTransitions,
  publishSkillCandidate,
  rejectSkillCandidate,
  saveSkillCandidateDraft,
  submitSkillCandidateForReview,
  transitionSkillCandidate,
} from './skillCandidateTransitions';

describe('skillCandidateTransitions', () => {
  it('moves a draft candidate through review and publication without mutating the source', () => {
    const draft = initialHermesConversation.skillCandidate;
    const reviewing = submitSkillCandidateForReview(draft);
    const published = publishSkillCandidate(reviewing);

    expect(draft.status).toBe('draft');
    expect(reviewing.status).toBe('reviewing');
    expect(published.status).toBe('published');
    expect(published).toMatchObject({
      id: draft.id,
      source_trace_id: draft.source_trace_id,
    });
  });

  it('can reject a candidate under review and restore it to draft', () => {
    const reviewing = submitSkillCandidateForReview(initialHermesConversation.skillCandidate);
    const rejected = rejectSkillCandidate(reviewing);
    const draft = saveSkillCandidateDraft(rejected);

    expect(rejected.status).toBe('rejected');
    expect(draft.status).toBe('draft');
  });

  it('reports only valid transitions for each status', () => {
    expect(getAvailableSkillCandidateTransitions('draft')).toEqual(['save_draft', 'submit_review']);
    expect(getAvailableSkillCandidateTransitions('reviewing')).toEqual(['save_draft', 'reject', 'publish']);
    expect(getAvailableSkillCandidateTransitions('published')).toEqual([]);
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionSkillCandidate(initialHermesConversation.skillCandidate, 'publish')).toThrow(
      'Cannot publish a draft skill candidate',
    );
  });
});
