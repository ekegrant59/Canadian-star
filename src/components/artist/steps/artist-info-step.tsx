'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import {
  artistInfoSchema,
  ACT_TYPES,
  ACT_TYPE_LABELS,
  type ActType,
} from '@/lib/validation/application';
import { FieldError, mergeIssues } from './field-error';
import type { ApplicationFormData } from '../types';

interface ArtistInfoStepProps {
  formData: ApplicationFormData;
  updateFormData: (fields: Partial<ApplicationFormData>) => void;
  fieldErrors: Record<string, string>;
  isBusy: boolean;
  onNext: () => void;
  onSaveDraft: () => void;
}

export function ArtistInfoStep({
  formData,
  updateFormData,
  fieldErrors,
  isBusy,
  onNext,
  onSaveDraft,
}: ArtistInfoStepProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = mergeIssues(localErrors, fieldErrors);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    /**
     * Same schema the server runs, shown inline instead of through alert().
     * An alert never gets announced as a form error, can't be tied to the field
     * it refers to, and blocks the page while it sits there.
     */
    const parsed = artistInfoSchema.safeParse({
      actName: formData.artistName,
      actType: formData.artistType,
      locationCity: formData.primaryLocation,
      contactEmail: formData.contactEmail,
      contactPhone: formData.phoneNumber,
      bio: formData.biography,
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
      <h1 className="app-page-title">APPLY TO THE COMPETITION</h1>
      <p className="app-page-subtitle">
        Fill in your artist profile and contact information to begin your official submission for
        the 2027 season.
      </p>

      <div className="app-card">
        {/* Row 1: Name and Artist Type */}
        <div className="app-grid-2">
          <div className="app-field">
            <label className="app-label" htmlFor="artistName">
              ARTIST / BAND NAME
            </label>
            <input
              id="artistName"
              type="text"
              className="app-input"
              placeholder="Enter full name"
              value={formData.artistName}
              onChange={(e) => updateFormData({ artistName: e.target.value })}
              aria-invalid={Boolean(errors.actName)}
              aria-describedby={errors.actName ? 'artistName-error' : undefined}
              disabled={isBusy}
              required
            />
            <FieldError id="artistName-error" message={errors.actName} />
          </div>

          <div className="app-field">
            <label className="app-label" htmlFor="artistType">
              ARTIST TYPE
            </label>
            <div className="relative">
              <select
                id="artistType"
                className="app-select cursor-pointer appearance-none pr-10"
                value={formData.artistType}
                onChange={(e) => updateFormData({ artistType: e.target.value as ActType })}
                aria-invalid={Boolean(errors.actType)}
                aria-describedby={errors.actType ? 'artistType-error' : undefined}
                disabled={isBusy}
                required
              >
                <option value="" disabled>
                  Select type
                </option>
                {ACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#8E8B87]"
                size={18}
                aria-hidden="true"
              />
            </div>
            <FieldError id="artistType-error" message={errors.actType} />
          </div>
        </div>

        {/* Row 2: Location */}
        <div className="app-field">
          <label className="app-label" htmlFor="primaryLocation">
            PRIMARY LOCATION
          </label>
          <input
            id="primaryLocation"
            type="text"
            className="app-input"
            placeholder="City, Province"
            value={formData.primaryLocation}
            onChange={(e) => updateFormData({ primaryLocation: e.target.value })}
            aria-invalid={Boolean(errors.locationCity)}
            aria-describedby={errors.locationCity ? 'primaryLocation-error' : undefined}
            disabled={isBusy}
            required
          />
          <FieldError id="primaryLocation-error" message={errors.locationCity} />
        </div>

        {/* Row 3: Contact Email & Phone */}
        <div className="app-grid-2">
          <div className="app-field">
            <label className="app-label" htmlFor="contactEmail">
              CONTACT EMAIL
            </label>
            <input
              id="contactEmail"
              type="email"
              className="app-input"
              placeholder="artist@example.com"
              value={formData.contactEmail}
              onChange={(e) => updateFormData({ contactEmail: e.target.value })}
              aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
              autoComplete="email"
              disabled={isBusy}
              required
            />
            <FieldError id="contactEmail-error" message={errors.contactEmail} />
          </div>

          <div className="app-field">
            <label className="app-label" htmlFor="phoneNumber">
              PHONE NUMBER
            </label>
            <input
              id="phoneNumber"
              type="tel"
              className="app-input"
              placeholder="+1 (555) 000-0000"
              value={formData.phoneNumber}
              onChange={(e) => updateFormData({ phoneNumber: e.target.value })}
              aria-invalid={Boolean(errors.contactPhone)}
              aria-describedby={errors.contactPhone ? 'phoneNumber-error' : undefined}
              autoComplete="tel"
              disabled={isBusy}
            />
            <FieldError id="phoneNumber-error" message={errors.contactPhone} />
          </div>
        </div>

        {/* Row 4: Biography */}
        <div className="app-field mb-0">
          <label className="app-label" htmlFor="biography">
            ARTIST BIOGRAPHY
          </label>
          <textarea
            id="biography"
            className="app-textarea"
            placeholder="Tell us about your journey, your sound, and where you have played."
            value={formData.biography}
            onChange={(e) => updateFormData({ biography: e.target.value })}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? 'biography-error' : 'biography-hint'}
            maxLength={5000}
            disabled={isBusy}
            required
          />
          <p className="app-field-helper" id="biography-hint">
            {formData.biography.length} of 5000 characters
          </p>
          <FieldError id="biography-error" message={errors.bio} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="app-actions-row justify-end">
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
