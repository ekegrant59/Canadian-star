export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'shortlisted',
  'finalist',
  'rejected',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const REVIEW_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'shortlisted',
  'finalist',
  'rejected',
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const REVIEW_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  submitted: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['shortlisted', 'rejected'],
  shortlisted: ['finalist', 'rejected'],
  finalist: [],
  rejected: [],
};

export function getAllowedReviewTransitions(status: ApplicationStatus): readonly ReviewStatus[] {
  if (status === 'draft' || status === 'withdrawn') return [];
  return REVIEW_TRANSITIONS[status] ?? [];
}

export function isAllowedReviewTransition(from: ApplicationStatus, to: ReviewStatus): boolean {
  return getAllowedReviewTransitions(from).includes(to);
}
