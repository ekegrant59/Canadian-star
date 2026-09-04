'use client';

import { useState } from 'react';
import { MapPin, Star, ExternalLink, Play, Check, Vote, CircleX } from 'lucide-react';
import type { ApplicationFormData } from './types';
import { ProfileImage } from '@/components/shared/profile-image';
import { MusicCover } from '@/components/shared/music-cover';

function getVideoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).at(-1);
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function musicService(value: string): string {
  try {
    const host = new URL(value).hostname;
    if (host.includes('spotify')) return 'Spotify';
    if (host.includes('apple')) return 'Apple Music';
    if (host.includes('soundcloud')) return 'SoundCloud';
    if (host.includes('bandcamp')) return 'Bandcamp';
    if (host.includes('youtube')) return 'YouTube Music';
    return host.replace(/^www\./, '');
  } catch {
    return 'Recorded music';
  }
}

interface ArtistProfileViewProps {
  formData: ApplicationFormData;
  applicationId?: string | null;
  submittedAt?: string | null;
  status?: string | null;
  competitionStage?: 'applications' | 'voting' | 'anticipation' | 'finalists';
  rejectionReason?: string | null;
  pendingEditKeys?: string[];
}

export function ArtistProfileView({
  formData,
  status = 'submitted',
  competitionStage = 'applications',
  rejectionReason,
  pendingEditKeys = [],
}: ArtistProfileViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const bioText = formData.biography || 'No biography was provided with this application.';

  const artistName = formData.artistName || 'Artist application';
  const location = formData.primaryLocation || 'Ontario';
  const artistTagline = 'Your submitted artist profile and competition progress.';

  const statusCopy: Record<string, { label: string; detail: string }> = {
    draft: {
      label: 'Draft',
      detail: 'Finish the remaining steps and submit before applications close.',
    },
    submitted: {
      label: 'Application submitted',
      detail: 'Your application is in the admin review queue.',
    },
    under_review: {
      label: 'Under review',
      detail: 'The review team is assessing your eligibility and submitted media.',
    },
    approved: {
      label: 'Application approved',
      detail: 'Congratulations. Your application has been approved for the competition.',
    },
    shortlisted: {
      label: 'Semi-finalist',
      detail: 'You have advanced to the public voting and industry review stage.',
    },
    finalist: { label: 'Finalist', detail: 'You have advanced to the live competition.' },
    rejected: {
      label: 'Not selected',
      detail: 'Your application will not advance in this competition cycle.',
    },
    withdrawn: { label: 'Withdrawn', detail: 'This application is no longer active.' },
  };
  const currentStatus = statusCopy[status ?? 'submitted'] ?? statusCopy.submitted!;
  const hasPending = (...keys: string[]) => keys.some((key) => pendingEditKeys.includes(key));

  const handleShareLink = () => {
    const url =
      typeof window !== 'undefined' && formData.publicSlug
        ? `${window.location.origin}/artists/${formData.publicSlug}`
        : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const connectLinks: Array<{ name: string; url: string }> = [];
  const addLink = (name: string, url: string) => {
    if (url.trim()) connectLinks.push({ name, url });
  };
  addLink('Instagram', formData.instagramHandle);
  addLink('TikTok', formData.tiktokHandle);
  addLink('X', formData.xHandle);
  addLink('Facebook', formData.facebookHandle);
  addLink('YouTube', formData.youtubeHandle);
  addLink('Official website', formData.websiteUrl);

  return (
    <div className="artist-profile-wrapper">
      {/* Toast Notification for Share Link */}
      {copiedLink && (
        <div className="share-toast-notification">
          <Check size={16} className="text-primary" />
          <span>Vote link copied to clipboard!</span>
        </div>
      )}

      {status === 'rejected' && (
        <section className="mb-6 border border-[#2a2a2a] bg-[#1b1a1a] p-5 sm:p-6">
          {status === 'rejected' && (
            <div className="mt-4 flex gap-3 border border-red-900/60 bg-red-950/30 p-4">
              <CircleX size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <strong className="block text-xs text-red-300">Application decision</strong>
                <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                  {rejectionReason || 'The review team did not provide an applicant-facing reason.'}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Main Profile 2-Column Grid */}
      <div className="artist-profile-grid">
        {/* Left Column (Wide) */}
        <div className="artist-profile-main-col">
          {/* 1. Hero Card */}
          <div className="profile-hero-card">
            <div className="profile-hero-image-bg">
              <ProfileImage
                src={formData.photoUrl}
                alt={artistName}
                className="h-full w-full"
                iconClassName="h-20 w-20"
              />
              <div className="profile-hero-gradient" />
            </div>

            <div className="profile-hero-content">
              <div className="profile-hero-location">
                <MapPin size={14} className="text-[#FFB59A]" />
                <span>{location.toUpperCase()}</span>
              </div>
              <h1 className="profile-hero-name">{artistName}</h1>
              <p className="profile-hero-tagline">{artistTagline}</p>
              {hasPending('actName', 'locationCity', 'photoKey') && <PendingBadge />}
            </div>
          </div>

          {/* 2. About the Artist Card */}
          <div className="profile-card profile-about-card">
            <div className="profile-card-header">
              <div className="flex items-center gap-3">
                <h2 className="profile-card-title">About the Artist</h2>
                {hasPending('bio') && <PendingBadge />}
              </div>
            </div>

            <div className="profile-bio-text">
              {bioText.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 text-sm leading-relaxed text-[#C9C6C2] last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* 3. Live Performance & Recorded Music (2 Columns) */}
          <div className="profile-media-grid">
            {/* Live Performance */}
            <div className="profile-card profile-performance-card">
              <div className="profile-card-header mb-3">
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <Play size={18} className="text-primary fill-primary" />
                  <span>Live Performance</span>
                  {hasPending('performanceVideoUrls') && <PendingBadge />}
                </div>
              </div>

              {getVideoEmbedUrl(formData.performanceVideoUrls[0] ?? '') ? (
                <div className="w-full overflow-hidden rounded-xs shadow-lg">
                  <iframe
                    src={getVideoEmbedUrl(formData.performanceVideoUrls[0] ?? '') ?? undefined}
                    title={`${artistName} submitted performance`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : formData.performanceVideoUrls[0] ? (
                <a
                  href={formData.performanceVideoUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-video-thumb-wrapper group text-primary flex min-h-40 w-full items-center justify-center bg-black"
                >
                  <Play size={24} className="fill-current" />
                  <span className="ml-2 text-xs font-bold">OPEN SUBMITTED VIDEO</span>
                </a>
              ) : (
                <div className="text-text-subtle border border-dashed border-[#333] p-6 text-center text-xs">
                  No performance video submitted.
                </div>
              )}
            </div>

            {/* Recorded Music */}
            <div className="profile-card profile-tracks-card">
              <div className="profile-card-header mb-3">
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <div className="border-primary flex h-4 w-4 items-center justify-center rounded-full border-2">
                    <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                  </div>
                  <span>Recorded Music</span>
                  {hasPending('recordedMusicUrls') && <PendingBadge />}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {formData.recordedMusicUrls.filter(Boolean).length ? (
                  formData.recordedMusicUrls.filter(Boolean).map((url, index) => {
                    const meta = formData.musicMetadata?.find((item) => item.url === url);
                    return (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-track-item"
                      >
                        <MusicCover
                          src={meta?.image}
                          className="profile-track-icon-box rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="profile-track-title block">
                            {meta?.title || `${musicService(url)} submission ${index + 1}`}
                          </span>
                          <span className="profile-track-meta text-text-subtle text-[11px]">
                            {meta?.subtitle || musicService(url)}
                          </span>
                        </div>
                        <ExternalLink size={15} className="text-primary" />
                      </a>
                    );
                  })
                ) : (
                  <div className="text-text-subtle border border-dashed border-[#333] p-6 text-center text-xs">
                    No recorded music links submitted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar Widgets) */}
        <div className="artist-profile-side-col">
          {/* Widget 1: CURRENT STAGE */}
          <div className="profile-card profile-stage-widget">
            <div className="profile-stage-icon-box">
              <Star size={18} className="text-[#C9C6C2]" />
            </div>
            <div>
              <span className="profile-stage-label block">CURRENT STAGE</span>
              <span className="profile-stage-status block">{currentStatus.label}</span>
            </div>
          </div>

          {/* Widget 2: Share Vote Link */}
          {(status === 'approved' || status === 'shortlisted' || status === 'finalist') &&
            competitionStage === 'voting' &&
            formData.publicSlug && (
              <div className="profile-card profile-share-widget">
                <div className="profile-share-icon-circle">
                  <Vote size={26} className="text-primary" />
                </div>
                <h3 className="profile-share-title">Share Vote Link</h3>
                <p className="profile-share-desc">
                  Share your public competition page with supporters.
                </p>
                <button type="button" className="profile-share-btn" onClick={handleShareLink}>
                  SHARE VOTE LINK
                </button>
              </div>
            )}

          {/* Widget 3: Connect */}
          <div className="profile-card profile-connect-widget">
            <div className="flex items-center gap-3">
              <h3 className="profile-connect-title">Connect</h3>
              {hasPending('instagram', 'tiktok', 'x', 'youtube', 'facebook', 'websiteUrl') && (
                <PendingBadge />
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {connectLinks.map((link) => (
                <a
                  key={`${link.name}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-connect-link-row group"
                >
                  <span className="group-hover:text-primary text-xs font-semibold text-[#E5E2E1] transition-colors">
                    {link.name}
                  </span>
                  <ExternalLink
                    size={14}
                    className="text-text-subtle group-hover:text-primary transition-colors"
                  />
                </a>
              ))}
              {connectLinks.length === 0 && (
                <p className="text-text-subtle text-xs">No social or website links submitted.</p>
              )}
            </div>
          </div>

          <div className="profile-card profile-connect-widget">
            <div className="flex items-center gap-3">
              <h3 className="profile-connect-title">Submitted Contact Details</h3>
              {hasPending('contactEmail', 'contactPhone', 'availableAllDates', 'isEligible') && (
                <PendingBadge />
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#e5e2e1]">
              <span>
                <strong className="text-text-subtle">Email:</strong>{' '}
                {formData.contactEmail || 'Not provided'}
              </span>
              <span>
                <strong className="text-text-subtle">Phone:</strong>{' '}
                {formData.phoneNumber || 'Not provided'}
              </span>
              <span>
                <strong className="text-text-subtle">Availability:</strong>{' '}
                {formData.availableAllDates ? 'Confirmed for all dates' : 'Not confirmed'}
              </span>
              <span>
                <strong className="text-text-subtle">Eligibility:</strong>{' '}
                {formData.isAgeAndResidencyEligible ? 'Confirmed' : 'Not confirmed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#FF8A5B]/50 bg-[#2b1710] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-[#FFB59A] uppercase">
      Awaiting approval
    </span>
  );
}
