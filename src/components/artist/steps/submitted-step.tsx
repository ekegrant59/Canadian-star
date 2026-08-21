'use client';

import { ArtistProfileView } from '../artist-profile-view';
import type { ApplicationFormData } from '../types';

interface SubmittedStepProps {
  formData: ApplicationFormData;
  applicationId: string | null;
  submittedAt: string | null;
  status: string | null;
  competitionStage: 'applications' | 'voting' | 'anticipation' | 'finalists';
  rejectionReason: string | null;
  canEdit: boolean;
  onEdit: () => void;
}

export function SubmittedStep({
  formData,
  applicationId,
  submittedAt,
  status,
  competitionStage,
  rejectionReason,
  canEdit,
  onEdit,
}: SubmittedStepProps) {
  return (
    <ArtistProfileView
      formData={formData}
      applicationId={applicationId}
      submittedAt={submittedAt}
      status={status}
      competitionStage={competitionStage}
      rejectionReason={rejectionReason}
      canEdit={canEdit}
      onEdit={onEdit}
    />
  );
}
