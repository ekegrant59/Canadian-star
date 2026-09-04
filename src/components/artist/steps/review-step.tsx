'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  User,
  Mail,
  Music,
  Calendar,
  Pencil,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  Headphones,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { ACT_TYPE_LABELS, reviewSchema } from '@/lib/validation/application';
import { FieldError, mergeIssues } from './field-error';
import type { ApplicationFormData } from '../types';
import type { ApplicationStepIndex } from '../artist-sidebar';

interface ReviewStepProps {
  formData: ApplicationFormData;
  updateFormData: (fields: Partial<ApplicationFormData>) => void;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  applicationsOpen: boolean;
  isReapproval?: boolean;
  onSelectStep: (step: ApplicationStepIndex) => void;
  onBack: () => void;
  onSubmitApplication: () => void;
}

/**
 * Renders a value, or a clear "not provided" marker.
 *
 * The earlier version fell back to invented sample data ("The Midnight Echo",
 * "mgmt@midnightecho.com"). On a review screen that's dangerous. The artist
 * confirms their information is accurate while reading somebody else's, and a
 * blank required field looks filled in.
 */
function Value({ children }: { children: string | null | undefined }) {
  if (!children) {
    return <span className="text-text-subtle text-sm italic">Not provided</span>;
  }
  return <span className="text-text text-sm font-semibold">{children}</span>;
}

function ConfirmationRow({ confirmed, label }: { confirmed: boolean; label: string }) {
  return (
    <div className="text-text flex items-center gap-2.5 text-xs font-semibold">
      {confirmed ? (
        <CheckCircle2 size={18} className="text-primary flex-shrink-0" aria-hidden="true" />
      ) : (
        <XCircle size={18} className="flex-shrink-0 text-red-400" aria-hidden="true" />
      )}
      <div>
        <span className="text-text block">{label}</span>
        <span className="text-text-subtle text-[11px]">
          {confirmed ? 'Confirmed' : 'Not confirmed'}
        </span>
      </div>
    </div>
  );
}

export function ReviewStep({
  formData,
  updateFormData,
  fieldErrors,
  isSubmitting,
  applicationsOpen,
  isReapproval = false,
  onSelectStep,
  onBack,
  onSubmitApplication,
}: ReviewStepProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = mergeIssues(localErrors, fieldErrors);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = reviewSchema.safeParse({ confirmAccuracy: formData.confirmAccuracy });
    if (!parsed.success) {
      setLocalErrors({
        confirmAccuracy: parsed.error.issues[0]?.message ?? 'Please confirm your information.',
      });
      return;
    }

    setLocalErrors({});
    onSubmitApplication();
  };

  const videoUrls = formData.performanceVideoUrls.filter(Boolean);
  const musicUrls = formData.recordedMusicUrls.filter(Boolean);

  const socialLinks: { label: string; value: string }[] = [];
  if (formData.instagramHandle)
    socialLinks.push({ label: 'Instagram', value: formData.instagramHandle });
  if (formData.tiktokHandle) socialLinks.push({ label: 'TikTok', value: formData.tiktokHandle });
  if (formData.xHandle) socialLinks.push({ label: 'X', value: formData.xHandle });
  if (formData.youtubeHandle) socialLinks.push({ label: 'YouTube', value: formData.youtubeHandle });
  if (formData.facebookHandle)
    socialLinks.push({ label: 'Facebook', value: formData.facebookHandle });
  if (formData.websiteUrl) socialLinks.push({ label: 'Website', value: formData.websiteUrl });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="app-page-title">Review Your Application</h1>
      <p className="app-page-subtitle">
        Check everything below before submitting.{' '}
        {isReapproval
          ? 'These edits will be reviewed before they update your public profile.'
          : 'Once submitted, your application is locked and changes need to go through us.'}
      </p>

      {/* Card 1: Artist Profile */}
      <div className="review-card">
        <div className="review-card-header">
          <div className="review-card-title">
            <User size={18} className="text-primary" aria-hidden="true" />
            <span>Artist Profile</span>
          </div>
          <button type="button" className="review-edit-btn" onClick={() => onSelectStep(1)}>
            <Pencil size={12} aria-hidden="true" />
            <span>EDIT</span>
          </button>
        </div>

        <div className="app-grid-2 mb-4">
          <div>
            <span className="text-text-subtle mb-1 block text-[11px] font-bold tracking-wider uppercase">
              STAGE / BAND NAME
            </span>
            <Value>{formData.artistName}</Value>
          </div>
          <div>
            <span className="text-text-subtle mb-1 block text-[11px] font-bold tracking-wider uppercase">
              ARTIST TYPE &amp; LOCATION
            </span>
            <Value>
              {formData.artistType
                ? `${ACT_TYPE_LABELS[formData.artistType]}${
                    formData.primaryLocation ? ` • ${formData.primaryLocation}` : ''
                  }`
                : null}
            </Value>
          </div>
        </div>

        <div>
          <span className="text-text-subtle mb-2 block text-[11px] font-bold tracking-wider uppercase">
            BIOGRAPHY
          </span>
          <div className="text-text-warm rounded-xs border border-[#242424] bg-[#171717] p-3.5 text-xs leading-relaxed">
            {formData.biography || <span className="text-text-subtle italic">Not provided</span>}
          </div>
        </div>
      </div>

      {/* Card 2: Contact Details */}
      <div className="review-card">
        <div className="review-card-header">
          <div className="review-card-title">
            <Mail size={18} className="text-primary" aria-hidden="true" />
            <span>Contact Details</span>
          </div>
          <button type="button" className="review-edit-btn" onClick={() => onSelectStep(1)}>
            <Pencil size={12} aria-hidden="true" />
            <span>EDIT</span>
          </button>
        </div>

        <div className="app-grid-2">
          <div>
            <span className="text-text-subtle mb-1 block text-[11px] font-bold tracking-wider uppercase">
              CONTACT EMAIL
            </span>
            <Value>{formData.contactEmail}</Value>
          </div>
          <div>
            <span className="text-text-subtle mb-1 block text-[11px] font-bold tracking-wider uppercase">
              PHONE NUMBER
            </span>
            <Value>{formData.phoneNumber}</Value>
          </div>
        </div>
      </div>

      {/* Card 3: Music & Media */}
      <div className="review-card">
        <div className="review-card-header">
          <div className="review-card-title">
            <Music size={18} className="text-primary" aria-hidden="true" />
            <span>Music &amp; Media</span>
          </div>
          <button type="button" className="review-edit-btn" onClick={() => onSelectStep(2)}>
            <Pencil size={12} aria-hidden="true" />
            <span>EDIT</span>
          </button>
        </div>

        {/* Promotional Photo */}
        <div className="mb-5 border-b border-[#242424] pb-4">
          <span className="text-text-subtle mb-2 block text-[11px] font-bold tracking-wider uppercase">
            PROMOTIONAL PHOTO
          </span>
          {formData.promotionalPhoto || formData.photoKey ? (
            <div className="flex items-center gap-3 rounded-xs border border-[#242424] bg-[#171717] p-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xs bg-black/40">
                {formData.promotionalPhotoPreview ? (
                  <Image
                    src={formData.promotionalPhotoPreview}
                    alt="Promotional photo"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileCheck size={16} className="text-primary" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="text-text truncate text-xs font-semibold">
                    {formData.promotionalPhotoName ?? 'Uploaded photo'}
                  </span>
                </div>
                <span className="text-text-subtle mt-0.5 block text-[11px]">
                  {formData.promotionalPhoto
                    ? `${formData.promotionalPhotoSize ? `${formData.promotionalPhotoSize} • ` : ''}Ready to upload when submitted`
                    : 'Uploaded'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-text-subtle text-sm italic">No photo selected</span>
          )}
        </div>

        {/* Video Links */}
        <div className="mb-5">
          <span className="text-text-subtle mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <Video size={13} className="text-primary" aria-hidden="true" />
            <span>PERFORMANCE VIDEO LINKS ({videoUrls.length})</span>
          </span>
          {videoUrls.length > 0 ? (
            <div className="flex flex-col gap-2">
              {videoUrls.map((url, i) => (
                <div
                  key={url}
                  className="text-text flex items-center gap-2 truncate rounded-xs border border-[#242424] bg-[#171717] px-3.5 py-2.5 font-mono text-xs"
                >
                  <span className="text-primary font-bold">#{i + 1}</span>
                  <span className="truncate">{url}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-text-subtle text-sm italic">No video links added</span>
          )}
        </div>

        {/* Music Links */}
        <div className="mb-5">
          <span className="text-text-subtle mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <Headphones size={13} className="text-primary" aria-hidden="true" />
            <span>RECORDED MUSIC LINKS ({musicUrls.length})</span>
          </span>
          {musicUrls.length > 0 ? (
            <div className="flex flex-col gap-2">
              {musicUrls.map((url, i) => (
                <div
                  key={url}
                  className="text-text flex items-center gap-2 truncate rounded-xs border border-[#242424] bg-[#171717] px-3.5 py-2.5 font-mono text-xs"
                >
                  <span className="text-primary font-bold">#{i + 1}</span>
                  <span className="truncate">{url}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-text-subtle text-sm italic">
              At least two recorded music links are required
            </span>
          )}
          {musicUrls.length === 1 && (
            <p className="text-text-subtle mt-2 text-xs">Add one more recorded music link.</p>
          )}
          <FieldError id="review-music-urls-error" message={errors.recordedMusicUrls} />
        </div>

        {/* Social Links */}
        <div>
          <span className="text-text-subtle mb-1 block text-[11px] font-bold tracking-wider uppercase">
            SOCIAL &amp; WEB LINKS
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {socialLinks.length > 0 ? (
              socialLinks.map((item) => (
                <span key={item.label} className="review-social-pill">
                  {item.label}: {item.value}
                </span>
              ))
            ) : (
              <span className="text-text-subtle text-sm italic">No social links added</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Availability & Eligibility */}
      <div className="review-card">
        <div className="review-card-header">
          <div className="review-card-title">
            <Calendar size={18} className="text-primary" aria-hidden="true" />
            <span>Availability &amp; Eligibility</span>
          </div>
          <button type="button" className="review-edit-btn" onClick={() => onSelectStep(3)}>
            <Pencil size={12} aria-hidden="true" />
            <span>EDIT</span>
          </button>
        </div>

        {/*
          These mirror the actual answers. The earlier version showed a green
          tick no matter what, which tells an artist a hard gate is satisfied
          when it isn't. Their submission then fails for a reason they can't see.
        */}
        <div className="app-grid-2 gap-y-4">
          <ConfirmationRow
            confirmed={formData.availableAllDates}
            label="Available for all competition dates"
          />
          <ConfirmationRow
            confirmed={formData.isAgeAndResidencyEligible}
            label="Age and residency requirements met"
          />
          <ConfirmationRow
            confirmed={formData.agreeCompetitionRules}
            label="Competition rules accepted"
          />
          <ConfirmationRow confirmed={formData.agreeMediaRelease} label="Media release accepted" />
        </div>
      </div>

      {/* Final Accuracy Checkbox */}
      <div className="my-8">
        <label className="flex cursor-pointer items-start gap-3.5">
          <input
            type="checkbox"
            className="auth-checkbox mt-0.5"
            checked={formData.confirmAccuracy}
            onChange={(e) => updateFormData({ confirmAccuracy: e.target.checked })}
            aria-invalid={Boolean(errors.confirmAccuracy)}
            aria-describedby={errors.confirmAccuracy ? 'accuracy-error' : undefined}
            disabled={isSubmitting}
          />
          <span className="text-text text-xs leading-relaxed font-semibold">
            I confirm that all information provided is accurate and that I agree to the competition
            terms and conditions.
          </span>
        </label>
        <FieldError id="accuracy-error" message={errors.confirmAccuracy} />
      </div>

      {!applicationsOpen && !isReapproval && (
        <div className="auth-error-banner mb-6" role="status">
          Applications are not open yet, so this cannot be submitted. Your answers are saved as a
          draft and will be here when applications open.
        </div>
      )}

      {/* Action Buttons */}
      <div className="app-actions-row">
        <button type="button" className="app-btn-back" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>BACK</span>
        </button>

        <button
          type="submit"
          className="app-btn-primary"
          disabled={isSubmitting || (!applicationsOpen && !isReapproval)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>SUBMITTING...</span>
            </>
          ) : (
            <>
              <span>{isReapproval ? 'SUBMIT EDITS FOR APPROVAL' : 'SUBMIT APPLICATION'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
