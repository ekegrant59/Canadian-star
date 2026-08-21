'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { SHOW_DATES, AGE_MINIMUM } from '@/config/event';
import { availabilitySchema } from '@/lib/validation/application';
import { FieldError, mergeIssues } from './field-error';
import type { ApplicationFormData } from '../types';

interface AvailabilityStepProps {
  formData: ApplicationFormData;
  updateFormData: (fields: Partial<ApplicationFormData>) => void;
  fieldErrors: Record<string, string>;
  isBusy: boolean;
  onNext: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatShowDate(iso: string) {
  // Parsed as parts, not through `new Date(iso)`. That constructor reads a bare
  // date as UTC midnight, which renders a day early west of Greenwich.
  const [year, month, day] = iso.split('-').map(Number);
  return {
    day: String(day).padStart(2, '0'),
    month: `${MONTHS[(month ?? 1) - 1]} ${year}`,
  };
}

export function AvailabilityStep({
  formData,
  updateFormData,
  fieldErrors,
  isBusy,
  onNext,
  onBack,
  onSaveDraft,
}: AvailabilityStepProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = mergeIssues(localErrors, fieldErrors);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = availabilitySchema.safeParse({
      availableAllDates: formData.availableAllDates,
      isEligible: formData.isAgeAndResidencyEligible,
      acceptedRules: formData.agreeCompetitionRules,
      acceptedMediaRelease: formData.agreeMediaRelease,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join('.');
        if (!(key in next)) next[key] = issue.message;
      }
      setLocalErrors(next);
      return;
    }

    setLocalErrors({});
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="app-page-title">Availability Commitment</h1>
      <p className="app-page-subtitle">
        You will not know which date you are assigned until the final 16 are announced, so you must
        be available for all five.
      </p>

      {/*
        The five show dates (§3), read from src/config/event.ts and never a
        local array. §17 flags the event details as movable, and a date
        hardcoded here drifts away from the rules page and from whatever got
        seeded into `shows`.
      */}
      <div className="show-date-grid">
        {SHOW_DATES.map((show) => {
          const { day, month } = formatShowDate(show.date);
          return (
            <div
              key={show.key}
              className={`show-date-card ${show.type === 'final' ? 'finale' : ''}`}
            >
              <span className="show-date-type">{show.label.toUpperCase()}</span>
              <span className="show-date-day">{day}</span>
              <span className="show-date-month">{month}</span>
            </div>
          );
        })}
      </div>

      {/* Availability Confirmation */}
      <div className="availability-callout-card">
        <label className="flex cursor-pointer items-start gap-3.5">
          <input
            type="checkbox"
            className="auth-checkbox mt-0.5"
            checked={formData.availableAllDates}
            onChange={(e) => updateFormData({ availableAllDates: e.target.checked })}
            aria-invalid={Boolean(errors.availableAllDates)}
            aria-describedby={errors.availableAllDates ? 'availability-error' : undefined}
            disabled={isBusy}
          />
          <div>
            <span className="text-text block text-sm font-bold">
              I confirm that I am available for all required competition dates.
            </span>
            <span className="text-text-subtle mt-1.5 block text-xs leading-relaxed">
              By checking this box, I acknowledge that failure to attend any of the mandatory dates
              listed above may result in immediate disqualification from the competition.
            </span>
          </div>
        </label>
        <FieldError id="availability-error" message={errors.availableAllDates} />
      </div>

      {/* Eligibility & Permissions */}
      <div className="app-grid-2">
        <div className="app-card mb-0">
          <h2 className="app-card-title text-text text-base font-bold">Eligibility</h2>
          <p className="text-text-subtle mb-4 text-xs leading-relaxed">
            By submitting this application, you attest that you meet the age and residency
            requirements in the official rules.
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="auth-checkbox mt-0.5"
              checked={formData.isAgeAndResidencyEligible}
              onChange={(e) => updateFormData({ isAgeAndResidencyEligible: e.target.checked })}
              aria-invalid={Boolean(errors.isEligible)}
              aria-describedby={errors.isEligible ? 'eligibility-error' : undefined}
              disabled={isBusy}
            />
            <span className="text-text text-xs font-semibold">
              I confirm I am at least {AGE_MINIMUM} years of age and an Ontario resident.
            </span>
          </label>
          <FieldError id="eligibility-error" message={errors.isEligible} />
        </div>

        <div className="app-card mb-0">
          <h2 className="app-card-title text-text text-base font-bold">Permissions</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="auth-checkbox mt-0.5"
                  checked={formData.agreeCompetitionRules}
                  onChange={(e) => updateFormData({ agreeCompetitionRules: e.target.checked })}
                  aria-invalid={Boolean(errors.acceptedRules)}
                  aria-describedby={errors.acceptedRules ? 'rules-error' : undefined}
                  disabled={isBusy}
                />
                <span className="text-text text-xs font-semibold">
                  I have read and agree to the{' '}
                  <Link
                    href="/rules"
                    target="_blank"
                    className="app-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Official Competition Rules
                  </Link>
                  .
                </span>
              </label>
              <FieldError id="rules-error" message={errors.acceptedRules} />
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="auth-checkbox mt-0.5"
                  checked={formData.agreeMediaRelease}
                  onChange={(e) => updateFormData({ agreeMediaRelease: e.target.checked })}
                  aria-invalid={Boolean(errors.acceptedMediaRelease)}
                  aria-describedby={errors.acceptedMediaRelease ? 'media-error' : undefined}
                  disabled={isBusy}
                />
                <span className="text-text text-xs font-semibold">
                  I consent to the{' '}
                  <Link
                    href="/media-release"
                    target="_blank"
                    className="app-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Media Release Agreement
                  </Link>{' '}
                  allowing use of my likeness.
                </span>
              </label>
              <FieldError id="media-error" message={errors.acceptedMediaRelease} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="app-actions-row">
        <button type="button" className="app-btn-back" onClick={onBack} disabled={isBusy}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="app-btn-secondary"
            onClick={onSaveDraft}
            disabled={isBusy}
          >
            SAVE PROGRESS
          </button>
          <button type="submit" className="app-btn-primary" disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <span>NEXT STEP</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
