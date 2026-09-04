'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtistTopBar } from './artist-top-bar';
import { ArtistSidebar, type ApplicationStepIndex } from './artist-sidebar';
import { StepperNav } from './stepper-nav';
import { ArtistInfoStep } from './steps/artist-info-step';
import { MusicMediaStep } from './steps/music-media-step';
import { AvailabilityStep } from './steps/availability-step';
import { ReviewStep } from './steps/review-step';
import { SubmittedStep } from './steps/submitted-step';
import { toActionPayload, type ApplicationFormData } from './types';
import { saveApplicationDraftAction, submitApplicationAction } from '@/server/actions/application';
import { uploadPhoto, UploadError } from '@/lib/upload-client';
import { Brand } from '@/components/shared/site-header';

const STEP_LABELS: Record<ApplicationStepIndex, string> = {
  1: 'Artist Info',
  2: 'Music & Media',
  3: 'Availability',
  4: 'Review & Submit',
  5: 'Submitted',
};

/** Withdrawn applications are the only records that cannot be edited. */
const LOCKED_STATUSES = new Set(['withdrawn']);

interface ApplicationFlowProps {
  initialData: ApplicationFormData;
  status: string | null;
  competitionStage: 'applications' | 'voting' | 'anticipation' | 'finalists';
  submittedAt: string | null;
  applicationId: string | null;
  rejectionReason: string | null;
  hasPendingEdits?: boolean;
  pendingEditKeys?: string[];
  initialStep: number;
  startInEditMode?: boolean;
  applicationsOpen: boolean;
  accountEmail: string;
  accountName: string | null;
}

export function ApplicationFlow({
  initialData,
  status,
  competitionStage,
  submittedAt,
  applicationId,
  rejectionReason,
  hasPendingEdits = false,
  pendingEditKeys = [],
  initialStep,
  startInEditMode = false,
  applicationsOpen,
  accountEmail,
  accountName,
}: ApplicationFlowProps) {
  const router = useRouter();
  const isLocked = status !== null && LOCKED_STATUSES.has(status);
  const isReapproval = status === 'approved' || status === 'shortlisted' || status === 'finalist';

  const [currentStep, setCurrentStep] = useState<ApplicationStepIndex>(() => {
    if (isLocked) return 5;
    if (startInEditMode) return 1;
    if (initialStep >= 5) return 5;
    const step = Math.min(Math.max(initialStep, 1), 4);
    return step as ApplicationStepIndex;
  });

  // A returning artist already walked the steps their draft covers, so those
  // stay navigable instead of re-locking behind a linear walk.
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(
    isLocked || initialStep >= 5 ? 5 : Math.max(initialStep - 1, 0),
  );

  const [formData, setFormData] = useState<ApplicationFormData>(initialData);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(applicationId);
  const [submissionDate, setSubmissionDate] = useState<string | null>(submittedAt);

  const updateFormData = useCallback((fields: Partial<ApplicationFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    setIsDraftSaved(false);
  }, []);

  /**
   * Persists the draft server-side.
   *
   * Returns whether it worked, so a step knows whether to advance. The earlier
   * version wrote to localStorage, which loses the lot the moment an artist
   * switches to their phone, clears their browser, or finishes on a different
   * device.
   */
  const saveDraft = useCallback(
    (step?: number): Promise<boolean> => {
      if (isLocked) return Promise.resolve(false);

      return new Promise((resolve) => {
        startSaving(async () => {
          setError(null);
          const result = await saveApplicationDraftAction(toActionPayload(formData, step));

          if (!result.ok) {
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
            resolve(false);
            return;
          }

          setFieldErrors({});
          setIsDraftSaved(true);
          setTimeout(() => setIsDraftSaved(false), 3000);
          resolve(true);
        });
      });
    },
    [formData, isLocked],
  );

  const handleNextStep = async (stepNumber: ApplicationStepIndex) => {
    /**
     * Save first, advance only if it worked. Move on after a failed save and
     * the artist reaches the review screen believing everything is stored,
     * when nothing since step one actually is.
     */
    const saved = await saveDraft(stepNumber);
    if (!saved) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setMaxCompletedStep((prev) => Math.max(prev, currentStep));
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStep = (stepNumber: ApplicationStepIndex) => {
    if (isLocked) return;
    if (stepNumber <= maxCompletedStep + 1 || stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitApplication = () => {
    startSubmitting(async () => {
      setError(null);
      let submissionData = formData;

      if (formData.promotionalPhoto) {
        try {
          const uploadedPhoto = await uploadPhoto(formData.promotionalPhoto);
          submissionData = {
            ...formData,
            photoKey: uploadedPhoto.publicId,
            photoUrl: uploadedPhoto.url,
            promotionalPhoto: null,
            promotionalPhotoPreview: null,
          };
          if (formData.promotionalPhotoPreview) {
            URL.revokeObjectURL(formData.promotionalPhotoPreview);
          }
          // Retain the uploaded key if server-side validation or the database
          // rejects this attempt, so retrying does not upload the same file.
          setFormData(submissionData);
        } catch (uploadError) {
          setError(
            uploadError instanceof UploadError
              ? uploadError.message
              : 'The promotional photo could not be uploaded. Please try again.',
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      const result = await submitApplicationAction(toActionPayload(submissionData));

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setFieldErrors({});
      setSubmissionId(result.data.applicationId);
      setSubmissionDate(result.data.submittedAt);
      setMaxCompletedStep(5);
      setCurrentStep(5);
      // Re-fetch so the server component picks up the locked status.
      router.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const isBusy = isSaving || isSubmitting;

  return (
    <div className="artist-layout">
      <ArtistTopBar
        isDraftSaved={isDraftSaved}
        isSaving={isSaving}
        isEditing={currentStep !== 5}
        onShowDashboard={() => {
          setCurrentStep(5);
          router.replace('/artist');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSaveDraft={isLocked ? undefined : () => void saveDraft(currentStep)}
        accountEmail={accountEmail}
        accountName={accountName}
      />

      {/* Mobile & Tablet Sticky Stepper Header (< 1024px) */}
      {currentStep !== 5 && (
        <div className="mobile-tablet-sticky-header" aria-label="Current Step Progress">
          <div className="mobile-stepper-header">
            <div className="flex items-center gap-2">
              <span className="mobile-step-badge">STEP 0{currentStep} OF 04</span>
              <span className="mobile-step-name">{STEP_LABELS[currentStep]}</span>
            </div>

            <div className="mobile-step-pills">
              {([1, 2, 3, 4] as ApplicationStepIndex[]).map((stepNum) => {
                const isActive = currentStep === stepNum;
                const isCompleted = maxCompletedStep >= stepNum || currentStep > stepNum;
                const canClick = isCompleted || stepNum <= maxCompletedStep + 1;

                return (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => canClick && handleSelectStep(stepNum)}
                    disabled={!canClick}
                    className={`mobile-pill-btn ${
                      isActive ? 'active' : isCompleted ? 'completed' : 'disabled'
                    }`}
                    aria-label={`Go to Step 0${stepNum}`}
                  >
                    {stepNum}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mobile-segment-track">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`mobile-segment-bar ${currentStep >= stepNum ? 'filled' : ''} ${
                  currentStep === stepNum ? 'current' : ''
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="artist-body-container">
        <ArtistSidebar
          currentStep={currentStep}
          maxCompletedStep={maxCompletedStep}
          onSelectStep={handleSelectStep}
          canEditProfile={!isLocked}
          onEditProfile={() => {
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <main
          className={`artist-main-content ${currentStep === 5 ? 'profile-view-main' : ''}`}
          id="main-content"
        >
          {currentStep !== 5 && (
            <StepperNav currentStep={currentStep} onSelectStep={handleSelectStep} />
          )}

          {/*
            Errors get announced, not just coloured (WCAG 2.2 3.3.1). role=alert
            lets a screen reader hear a failed save without stealing focus.
          */}
          {error && currentStep !== 5 && (
            <div className="auth-error-banner mb-6" role="alert">
              {error}
            </div>
          )}

          {!applicationsOpen && !isLocked && !isReapproval && currentStep !== 5 && (
            <div className="auth-error-banner mb-6" role="status">
              Applications are not open yet. You can fill this in and save it as a draft, and submit
              once applications open.
            </div>
          )}

          {isLocked && currentStep !== 5 && (
            <div className="auth-success-banner mb-6" role="status">
              Your application has been submitted and can no longer be edited.
            </div>
          )}

          {currentStep === 1 && (
            <ArtistInfoStep
              formData={formData}
              updateFormData={updateFormData}
              fieldErrors={fieldErrors}
              isBusy={isBusy}
              onNext={() => void handleNextStep(2)}
              onSaveDraft={() => void saveDraft(1)}
            />
          )}

          {currentStep === 2 && (
            <MusicMediaStep
              formData={formData}
              updateFormData={updateFormData}
              fieldErrors={fieldErrors}
              isBusy={isBusy}
              onNext={() => void handleNextStep(3)}
              onBack={() => handleSelectStep(1)}
              onSaveDraft={() => void saveDraft(2)}
            />
          )}

          {currentStep === 3 && (
            <AvailabilityStep
              formData={formData}
              updateFormData={updateFormData}
              fieldErrors={fieldErrors}
              isBusy={isBusy}
              onNext={() => void handleNextStep(4)}
              onBack={() => handleSelectStep(2)}
              onSaveDraft={() => void saveDraft(3)}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              formData={formData}
              updateFormData={updateFormData}
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              applicationsOpen={applicationsOpen}
              isReapproval={isReapproval}
              onSelectStep={handleSelectStep}
              onBack={() => handleSelectStep(3)}
              onSubmitApplication={handleSubmitApplication}
            />
          )}

          {currentStep === 5 && (
            <>
              {hasPendingEdits && (
                <div className="auth-success-banner mb-6" role="status">
                  Your edits are with the review team. Your public profile will update after
                  approval.
                </div>
              )}
              <SubmittedStep
                formData={formData}
                applicationId={submissionId}
                submittedAt={submissionDate}
                status={status}
                competitionStage={competitionStage}
                rejectionReason={rejectionReason}
                pendingEditKeys={pendingEditKeys}
              />
            </>
          )}
        </main>
      </div>

      <footer className="app-portal-footer">
        <Brand />
        <span>© 2026 THE NEXT GREAT CANADIAN COUNTRY STAR. ALL RIGHTS RESERVED.</span>
        <div className="app-portal-footer-nav">
          <a href="/privacy">PRIVACY POLICY</a>
          <a href="/terms">TERMS OF SERVICE</a>
          <a href="/rules">COMPETITION RULES</a>
        </div>
      </footer>
    </div>
  );
}
