'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  Video,
  Headphones,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft,
  X as CloseIcon,
  Plus,
  FileCheck,
  Globe,
  Loader2,
} from 'lucide-react';
import { musicMediaSchema, LIMITS } from '@/lib/validation/application';
import { FieldError, mergeIssues } from './field-error';
import type { ApplicationFormData } from '../types';

interface MusicMediaStepProps {
  formData: ApplicationFormData;
  updateFormData: (fields: Partial<ApplicationFormData>) => void;
  fieldErrors: Record<string, string>;
  isBusy: boolean;
  onNext: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
}

const MAX_LINKS = LIMITS.maxVideoLinks;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function MusicMediaStep({
  formData,
  updateFormData,
  fieldErrors,
  isBusy,
  onNext,
  onBack,
  onSaveDraft,
}: MusicMediaStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const errors = mergeIssues(localErrors, fieldErrors);

  const videoUrls = formData.performanceVideoUrls.length > 0 ? formData.performanceVideoUrls : [''];
  const musicUrls = formData.recordedMusicUrls.length > 0 ? formData.recordedMusicUrls : [''];

  /**
   * Keeps the chosen photo in browser state for preview and validation. The
   * signed Cloudinary upload happens only when the artist submits the complete
   * application from the review step.
   */
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    setPhotoError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Please choose a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('That image is larger than 10MB. Please choose a smaller file.');
      return;
    }

    if (formData.promotionalPhotoPreview) {
      URL.revokeObjectURL(formData.promotionalPhotoPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    updateFormData({
      photoUrl: null,
      promotionalPhoto: file,
      promotionalPhotoPreview: previewUrl,
      promotionalPhotoName: file.name,
      promotionalPhotoSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
    setLocalErrors((prev) => {
      const next = { ...prev };
      delete next.photoKey;
      return next;
    });
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removePhoto = () => {
    if (formData.promotionalPhotoPreview) {
      URL.revokeObjectURL(formData.promotionalPhotoPreview);
    }
    updateFormData({
      photoKey: null,
      photoUrl: null,
      promotionalPhoto: null,
      promotionalPhotoPreview: null,
      promotionalPhotoName: null,
      promotionalPhotoSize: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoUrlChange = (index: number, val: string) => {
    const updated = [...videoUrls];
    updated[index] = val;
    updateFormData({ performanceVideoUrls: updated });
  };

  const addVideoUrl = () => {
    if (videoUrls.length < MAX_LINKS) {
      updateFormData({ performanceVideoUrls: [...videoUrls, ''] });
    }
  };

  const removeVideoUrl = (index: number) => {
    const updated = videoUrls.filter((_, i) => i !== index);
    updateFormData({ performanceVideoUrls: updated.length > 0 ? updated : [''] });
  };

  const handleMusicUrlChange = (index: number, val: string) => {
    const updated = [...musicUrls];
    updated[index] = val;
    updateFormData({ recordedMusicUrls: updated });
  };

  const addMusicUrl = () => {
    if (musicUrls.length < MAX_LINKS) {
      updateFormData({ recordedMusicUrls: [...musicUrls, ''] });
    }
  };

  const removeMusicUrl = (index: number) => {
    const updated = musicUrls.filter((_, i) => i !== index);
    updateFormData({ recordedMusicUrls: updated.length > 0 ? updated : [''] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = musicMediaSchema.safeParse({
      // The strict schema requires a photo. A selected File satisfies the
      // client step; the final submission replaces this marker with the real
      // Cloudinary public_id before the server action runs.
      photoKey: formData.photoKey ?? (formData.promotionalPhoto ? 'pending-upload' : ''),
      performanceVideoUrls: videoUrls.filter(Boolean),
      recordedMusicUrls: musicUrls.filter(Boolean),
      instagram: formData.instagramHandle,
      tiktok: formData.tiktokHandle,
      x: formData.xHandle,
      youtube: formData.youtubeHandle,
      facebook: formData.facebookHandle,
      websiteUrl: formData.websiteUrl,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        // Array issues arrive as performanceVideoUrls.0. Show the message
        // against the list, since that row may already be gone.
        const key = String(issue.path[0] ?? '');
        if (key && !(key in next)) next[key] = issue.message;
      }
      setLocalErrors(next);
      return;
    }

    setLocalErrors({});
    onNext();
  };

  const disabled = isBusy;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="app-page-title">Music &amp; Media</h1>
      <p className="app-page-subtitle">
        Upload your best promotional photo and link to your strongest performances. This is what the
        panel assesses, so lead with your best work.
      </p>

      {/* Section 1: Promotional Photo */}
      <div className="app-card">
        <h2 className="app-card-title">Promotional Photo</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
          id="photo-upload-input"
          disabled={disabled}
        />

        {formData.promotionalPhotoPreview || formData.photoKey ? (
          <div className="dropzone-preview-container">
            <div className="relative h-18 w-18 flex-shrink-0 overflow-hidden rounded-xs bg-black/40">
              {formData.promotionalPhotoPreview ? (
                <Image
                  src={formData.promotionalPhotoPreview}
                  alt="Promotional photo preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FileCheck size={20} className="text-primary" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="dropzone-file-info">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-primary" aria-hidden="true" />
                <span className="dropzone-filename">
                  {formData.promotionalPhotoName ?? 'Uploaded photo'}
                </span>
              </div>
              <span className="dropzone-filesize" role="status">
                {formData.promotionalPhoto
                  ? `${formData.promotionalPhotoSize ? `${formData.promotionalPhotoSize} • ` : ''}Ready to upload when submitted`
                  : 'Uploaded'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="dropzone-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                REPLACE
              </button>
              <button
                type="button"
                className="artist-icon-btn text-red-400 hover:text-red-300"
                onClick={removePhoto}
                aria-label="Remove photo"
                disabled={disabled}
              >
                <CloseIcon size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`dropzone-area ${isDragOver ? 'dragover' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="dropzone-icon" size={36} aria-hidden="true" />
            <p className="dropzone-title">Drag and drop your high-res photo here</p>
            <p className="dropzone-desc">JPG, PNG, or WebP, max 10MB.</p>
            <button
              type="button"
              className="dropzone-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
            >
              BROWSE FILES
            </button>
          </div>
        )}

        {photoError && (
          <p role="alert" className="app-field-error mt-3">
            {photoError}
          </p>
        )}
        <FieldError id="photoKey-error" message={errors.photoKey} />
      </div>

      {/* Section 2: Performance & Music Links */}
      <h2 className="text-text mt-8 mb-4 text-sm font-bold tracking-wider uppercase">
        Performance &amp; Music Links
      </h2>
      <div className="app-grid-2">
        {/* Video Links Card */}
        <div className="app-card mb-0 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-text-warm flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <Video size={16} className="text-primary" aria-hidden="true" />
                <span>
                  PERFORMANCE VIDEO LINKS ({videoUrls.filter(Boolean).length}/{MAX_LINKS})
                </span>
              </div>
            </div>

            {videoUrls.map((url, idx) => (
              <div key={idx} className="link-input-row">
                <label className="sr-only" htmlFor={`video-url-${idx}`}>
                  Performance video link {idx + 1}
                </label>
                <input
                  id={`video-url-${idx}`}
                  type="url"
                  className="app-input"
                  placeholder={
                    idx === 0 ? 'https://youtube.com/watch?v=...' : `Video link #${idx + 1}`
                  }
                  value={url}
                  onChange={(e) => handleVideoUrlChange(idx, e.target.value)}
                  aria-invalid={idx === 0 ? Boolean(errors.performanceVideoUrls) : undefined}
                  disabled={disabled}
                />
                {videoUrls.length > 1 && (
                  <button
                    type="button"
                    className="link-remove-btn"
                    onClick={() => removeVideoUrl(idx)}
                    aria-label={`Remove video link ${idx + 1}`}
                    disabled={disabled}
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
            ))}
            <p className="app-field-helper">
              Link to a live performance on YouTube or Vimeo. At least one is required.
            </p>
            <FieldError id="video-urls-error" message={errors.performanceVideoUrls} />
          </div>

          {videoUrls.length < MAX_LINKS && (
            <button
              type="button"
              className="add-link-btn"
              onClick={addVideoUrl}
              disabled={disabled}
            >
              <Plus size={14} aria-hidden="true" />
              <span>ADD ANOTHER VIDEO LINK</span>
            </button>
          )}
        </div>

        {/* Music Links Card */}
        <div className="app-card mb-0 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-text-warm flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <Headphones size={16} className="text-primary" aria-hidden="true" />
                <span>
                  RECORDED MUSIC LINKS ({musicUrls.filter(Boolean).length}/{MAX_LINKS})
                </span>
              </div>
            </div>

            {musicUrls.map((url, idx) => (
              <div key={idx} className="link-input-row">
                <label className="sr-only" htmlFor={`music-url-${idx}`}>
                  Recorded music link {idx + 1}
                </label>
                <input
                  id={`music-url-${idx}`}
                  type="url"
                  className="app-input"
                  placeholder={
                    idx === 0 ? 'https://open.spotify.com/artist/...' : `Music link #${idx + 1}`
                  }
                  value={url}
                  onChange={(e) => handleMusicUrlChange(idx, e.target.value)}
                  aria-invalid={idx === 0 ? Boolean(errors.recordedMusicUrls) : undefined}
                  disabled={disabled}
                />
                {musicUrls.length > 1 && (
                  <button
                    type="button"
                    className="link-remove-btn"
                    onClick={() => removeMusicUrl(idx)}
                    aria-label={`Remove music link ${idx + 1}`}
                    disabled={disabled}
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
            ))}
            <p className="app-field-helper">
              Link to Spotify, Apple Music, SoundCloud, or Bandcamp.
            </p>
            <FieldError id="music-urls-error" message={errors.recordedMusicUrls} />
          </div>

          {musicUrls.length < MAX_LINKS && (
            <button
              type="button"
              className="add-link-btn"
              onClick={addMusicUrl}
              disabled={disabled}
            >
              <Plus size={14} aria-hidden="true" />
              <span>ADD ANOTHER MUSIC LINK</span>
            </button>
          )}
        </div>
      </div>

      {/* Section 3: Social Media & Online Presence */}
      <h2 className="text-text mt-8 mb-4 text-sm font-bold tracking-wider uppercase">
        Social Media &amp; Online Presence
      </h2>
      <div className="app-card">
        <div className="app-grid-2">
          {(
            [
              {
                id: 'instagramHandle',
                label: 'INSTAGRAM',
                key: 'instagram',
                placeholder: '@username or URL',
              },
              {
                id: 'tiktokHandle',
                label: 'TIKTOK',
                key: 'tiktok',
                placeholder: '@username or URL',
              },
              { id: 'xHandle', label: 'X (TWITTER)', key: 'x', placeholder: '@username or URL' },
              {
                id: 'youtubeHandle',
                label: 'YOUTUBE CHANNEL',
                key: 'youtube',
                placeholder: '@channel or URL',
              },
              {
                id: 'facebookHandle',
                label: 'FACEBOOK PAGE',
                key: 'facebook',
                placeholder: 'facebook.com/yourpage',
              },
            ] as const
          ).map((field) => (
            <div className="app-field" key={field.id}>
              <label className="app-label flex items-center gap-2" htmlFor={field.id}>
                <LinkIcon size={14} className="text-text-subtle" aria-hidden="true" />
                <span>{field.label}</span>
              </label>
              <input
                id={field.id}
                type="text"
                className="app-input"
                placeholder={field.placeholder}
                value={formData[field.id]}
                onChange={(e) => updateFormData({ [field.id]: e.target.value })}
                aria-invalid={Boolean(errors[field.key])}
                aria-describedby={errors[field.key] ? `${field.id}-error` : undefined}
                disabled={disabled}
              />
              <FieldError id={`${field.id}-error`} message={errors[field.key]} />
            </div>
          ))}

          <div className="app-field mb-0">
            <label className="app-label flex items-center gap-2" htmlFor="websiteUrl">
              <Globe size={14} className="text-text-subtle" aria-hidden="true" />
              <span>OFFICIAL WEBSITE / EPK</span>
            </label>
            <input
              id="websiteUrl"
              type="url"
              className="app-input"
              placeholder="https://yourband.com"
              value={formData.websiteUrl}
              onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
              aria-invalid={Boolean(errors.websiteUrl)}
              aria-describedby={errors.websiteUrl ? 'websiteUrl-error' : undefined}
              disabled={disabled}
            />
            <FieldError id="websiteUrl-error" message={errors.websiteUrl} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="app-actions-row">
        <button type="button" className="app-btn-back" onClick={onBack} disabled={disabled}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="app-btn-secondary"
            onClick={onSaveDraft}
            disabled={disabled}
          >
            SAVE PROGRESS
          </button>
          <button type="submit" className="app-btn-primary" disabled={disabled}>
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
