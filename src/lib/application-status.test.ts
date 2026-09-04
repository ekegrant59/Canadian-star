import { describe, expect, it } from 'vitest';
import { getAllowedReviewTransitions, isAllowedReviewTransition } from './application-status';

describe('application review transitions', () => {
  it('allows the normal review progression', () => {
    expect(isAllowedReviewTransition('submitted', 'under_review')).toBe(true);
    expect(isAllowedReviewTransition('under_review', 'approved')).toBe(true);
    expect(isAllowedReviewTransition('approved', 'shortlisted')).toBe(true);
    expect(isAllowedReviewTransition('shortlisted', 'finalist')).toBe(true);
  });

  it('allows rejection from an active review state', () => {
    expect(isAllowedReviewTransition('submitted', 'rejected')).toBe(true);
    expect(isAllowedReviewTransition('under_review', 'rejected')).toBe(true);
    expect(isAllowedReviewTransition('shortlisted', 'rejected')).toBe(true);
    expect(isAllowedReviewTransition('finalist', 'rejected')).toBe(false);
  });

  it('does not allow terminal, reverse, or no-op transitions', () => {
    expect(getAllowedReviewTransitions('draft')).toEqual([]);
    expect(getAllowedReviewTransitions('withdrawn')).toEqual([]);
    expect(getAllowedReviewTransitions('rejected')).toEqual([]);
    expect(isAllowedReviewTransition('rejected', 'finalist')).toBe(false);
    expect(isAllowedReviewTransition('finalist', 'submitted')).toBe(false);
    expect(isAllowedReviewTransition('under_review', 'under_review')).toBe(false);
  });
});
