'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MailCheck,
  MapPin,
  Phone,
  ShieldCheck,
  Trophy,
  User,
  Video,
  X,
  XCircle,
  Trash2,
} from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import type { CompetitionStage } from '@/config/event';
import { ProfileImage } from '@/components/shared/profile-image';
import { MusicCover } from '@/components/shared/music-cover';
import { getAllowedReviewTransitions, type ReviewStatus } from '@/lib/application-status';
import {
  addApplicationReviewNoteAction,
  deleteArtistApplicationAction,
  updateArtistProfileStatusAction,
  updateApplicationReviewAction,
  reviewArtistEditsAction,
} from '@/server/actions/admin';

const statusLabels: Record<AdminApplicationRecord['lifecycleStatus'], string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  shortlisted: 'Semi-finalist',
  finalist: 'Finalist',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

function videoEmbedUrl(value: string): string | null {
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

function serviceName(value: string): string {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    if (host.includes('spotify')) return 'Spotify';
    if (host.includes('apple')) return 'Apple Music';
    if (host.includes('soundcloud')) return 'SoundCloud';
    if (host.includes('bandcamp')) return 'Bandcamp';
    if (host.includes('youtube')) return 'YouTube Music';
    return host;
  } catch {
    return 'Music link';
  }
}

type VotingContext = {
  totalVerifiedVotes: number;
  rank: number | null;
  candidateCount: number;
  isVotingOpen: boolean;
};

export function ApplicantReviewView({
  application: initialApp,
  currentStage,
  votingContext,
  isSuperAdmin,
}: {
  application: AdminApplicationRecord;
  currentStage: CompetitionStage;
  votingContext: VotingContext;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [app, setApp] = useState(initialApp);
  const [decision, setDecision] = useState<ReviewStatus | null>(null);
  const [reason, setReason] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editDecision, setEditDecision] = useState<'approve' | 'reject' | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [notes, setNotes] = useState<string[]>(
    app.reviewNotes ? app.reviewNotes.split('\n\n').filter(Boolean) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const allowedTransitions = getAllowedReviewTransitions(app.lifecycleStatus);

  const saveDecision = () => {
    if (!decision) return;
    startSaving(async () => {
      setError(null);
      const result = await updateApplicationReviewAction({
        applicationId: app.id,
        expectedStatus: app.lifecycleStatus,
        status: decision,
        confirmed: true,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        if (result.error.startsWith('Another administrator changed')) {
          window.location.reload();
        }
        return;
      }
      setApp((current) => ({
        ...current,
        lifecycleStatus: result.data.status,
        status:
          result.data.status === 'rejected'
            ? 'rejected'
            : result.data.status === 'approved' ||
                result.data.status === 'shortlisted' ||
                result.data.status === 'finalist'
              ? 'approved'
              : 'pending',
        profileStatus: result.data.status === 'approved' ? 'published' : current.profileStatus,
        rejectionReason: result.data.status === 'rejected' ? reason : undefined,
      }));
      setDecision(null);
      setReason('');
      router.refresh();
    });
  };

  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!internalNote.trim()) return;
    startSaving(async () => {
      setError(null);
      const result = await addApplicationReviewNoteAction({
        applicationId: app.id,
        note: internalNote,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotes((current) => [result.data.note, ...current]);
      setInternalNote('');
    });
  };

  const toggleProfile = () => {
    startSaving(async () => {
      setError(null);
      const nextStatus = app.profileStatus === 'published' ? 'hidden' : 'published';
      const result = await updateArtistProfileStatusAction({
        artistId: app.artistId,
        status: nextStatus,
        confirmed: true,
        reason:
          nextStatus === 'hidden'
            ? 'Hidden from the public artist directory.'
            : 'Published from application review.',
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApp((current) => ({ ...current, profileStatus: result.data.status }));
      router.refresh();
    });
  };

  const deleteArtist = () => {
    startSaving(async () => {
      setError(null);
      const result = await deleteArtistApplicationAction({
        artistId: app.artistId,
        applicationId: app.id,
        confirmed: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/admin/applications');
      router.refresh();
    });
  };

  const reviewEdits = () => {
    if (editDecision === 'reject' && editReason.trim().length < 3) {
      setError('Add a short reason for this edit decision.');
      return;
    }
    startSaving(async () => {
      setError(null);
      const result = await reviewArtistEditsAction({
        applicationId: app.id,
        decision: editDecision!,
        reason: editReason,
        confirmed: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApp((current) =>
        editDecision === 'approve'
          ? applyApprovedEdits(current)
          : { ...current, pendingEdits: null, pendingEditsSubmittedAt: null },
      );
      setEditReason('');
      setEditDecision(null);
      router.refresh();
    });
  };

  const embeddedVideo = app.videoUrl ? videoEmbedUrl(app.videoUrl) : null;
  const musicLinks =
    app.musicMetadata ??
    Object.values(app.musicLinks)
      .filter(Boolean)
      .map((url) => ({ url, title: 'Recorded music', subtitle: null, image: null }));

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              href="/admin/applications"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Back to applications"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <StatusBadge status={app.lifecycleStatus} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{app.stageName}</h1>
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            Application ID: <strong className="text-gray-900">{app.applicationNumber}</strong> ·
            Submitted {app.submissionDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {app.lifecycleStatus === 'approved' && (
            <div className="flex max-w-sm items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-xs">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-900">Public profile</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={app.profileStatus === 'published'}
                aria-label="Toggle public artist profile"
                onClick={toggleProfile}
                disabled={isSaving}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors ${app.profileStatus === 'published' ? 'bg-[#FF5C00]' : 'bg-gray-300'}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${app.profileStatus === 'published' ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          )}
          {currentStage === 'anticipation' && app.lifecycleStatus === 'approved' && (
            <button
              type="button"
              onClick={() => setDecision('shortlisted')}
              className="flex items-center gap-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e05200]"
            >
              <CheckCircle2 className="h-4 w-4" />
              SELECT FOR FINAL 16
            </button>
          )}
          {currentStage === 'anticipation' &&
            (app.lifecycleStatus === 'shortlisted' || app.lifecycleStatus === 'finalist') && (
              <Link
                href={`/admin/events?artistId=${encodeURIComponent(app.artistId)}#five-live-shows`}
                className="rounded-lg border border-[#FF5C00] bg-white px-3 py-2 text-xs font-bold text-[#FF5C00] hover:bg-orange-50"
              >
                {app.qualifyingShow
                  ? `ASSIGNED: ${app.qualifyingShow.label}`
                  : 'ASSIGN TO LIVE SHOWS'}
              </Link>
            )}
          {currentStage === 'finalists' && app.lifecycleStatus === 'shortlisted' && (
            <button
              type="button"
              onClick={() => setDecision('finalist')}
              className="flex items-center gap-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e05200]"
            >
              <Trophy className="h-4 w-4" />
              ADVANCE TO FINAL 4
            </button>
          )}
          {allowedTransitions.includes('under_review') && (
            <button
              type="button"
              onClick={() => setDecision('under_review')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              MARK UNDER REVIEW
            </button>
          )}
          {allowedTransitions.includes('rejected') && app.lifecycleStatus !== 'approved' && (
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" /> REJECT
            </button>
          )}
          {allowedTransitions.includes('approved') && (
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className="flex items-center gap-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e05200]"
            >
              <CheckCircle2 className="h-4 w-4" /> APPROVE APPLICATION
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {app.pendingEdits && app.pendingEditsSubmittedAt && (
        <section className="rounded-xl border-2 border-[#FF5C00]/40 bg-orange-50 p-5 shadow-xs">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-[10px] font-black tracking-[0.18em] text-[#FF5C00] uppercase">
                New edits awaiting approval
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-900">
                Compare the proposed profile changes
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                The public profile remains unchanged until an administrator approves these edits.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditReason('');
                  setEditDecision('reject');
                }}
                disabled={isSaving}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                REJECT EDITS
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditReason('');
                  setEditDecision('approve');
                }}
                disabled={isSaving}
                className="rounded-lg bg-[#FF5C00] px-3 py-2 text-xs font-bold text-white hover:bg-[#e05200]"
              >
                APPROVE EDITS
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {pendingDiffs(app).map((item) => (
              <PendingDiffRow key={item.key} item={item} app={app} />
            ))}
          </div>
        </section>
      )}

      {app.qualifyingShow && (
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-[#FF5C00] uppercase">
              Assigned qualifying show
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-900">{app.qualifyingShow.label}</h2>
            <p className="mt-1 text-xs text-gray-600">
              {formatAssignedShowDate(app.qualifyingShow.showDate)} ·{' '}
              {app.qualifyingShow.startTime ?? 'Time TBD'} ·{' '}
              {app.qualifyingShow.venueName ?? 'Venue TBD'}
            </p>
            {app.qualifyingShow.venueAddress && (
              <p className="mt-1 text-xs text-gray-500">{app.qualifyingShow.venueAddress}</p>
            )}
          </div>
          <Link
            href={`/admin/events?artistId=${encodeURIComponent(app.artistId)}#five-live-shows`}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-xs font-bold text-white hover:bg-gray-800"
          >
            VIEW SHOW ASSIGNMENT
          </Link>
        </section>
      )}

      {['voting', 'anticipation', 'finalists'].includes(currentStage) &&
        ['approved', 'shortlisted', 'finalist'].includes(app.lifecycleStatus) && (
          <VotingAnalytics app={app} currentStage={currentStage} context={votingContext} />
        )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs lg:col-span-2">
          <SectionTitle icon={User} title="Artist Information" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Info label="Account / legal name" value={app.fullName} />
            <Info label="Artist / band name" value={app.stageName} />
            <Info label="Artist type" value={app.actType} />
            <Info label="Location" value={app.location} icon={MapPin} />
            <Info
              label="Formation year"
              value={app.formationYear ? String(app.formationYear) : 'Not provided'}
            />
            <Info
              label="Members"
              value={app.memberCount ? String(app.memberCount) : 'Not provided'}
            />
          </div>
          <div className="mt-6">
            <span className="mb-2 block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Professional biography
            </span>
            <p className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 text-xs leading-relaxed text-gray-700">
              {app.bio}
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
            <SectionTitle icon={Mail} title="Contact Details" small />
            <div className="space-y-4 text-xs">
              <a
                href={`mailto:${app.email}`}
                className="flex items-center gap-2 font-semibold text-gray-900 hover:text-[#FF5C00]"
              >
                <Mail className="h-3.5 w-3.5" />
                {app.email || 'Not provided'}
              </a>
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <Phone className="h-3.5 w-3.5" />
                {app.phone || 'Not provided'}
              </span>
            </div>
          </section>
          <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
            <SectionTitle icon={Calendar} title="Availability" small />
            <p className="text-xs font-semibold text-gray-700">
              {app.availability.allRequiredDates
                ? 'Available for all required competition dates.'
                : 'Availability requirement was not confirmed.'}
            </p>
          </section>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
        <SectionTitle icon={ExternalLink} title="Social & Web Links" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(app.socialLinks).map(([network, url]) => (
            <a
              key={network}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-bold text-gray-800 hover:border-[#FF5C00]/50"
            >
              <span className="block text-[10px] tracking-wider text-gray-400 uppercase">
                {network}
              </span>
              {url}
            </a>
          ))}
          {Object.entries(app.musicLinks).map(([network, url]) => (
            <a
              key={network}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-bold text-gray-800 hover:border-[#FF5C00]/50"
            >
              <span className="block text-[10px] tracking-wider text-gray-400 uppercase">
                Recorded music
              </span>
              {url}
            </a>
          ))}
          {!Object.keys(app.socialLinks).length && !Object.keys(app.musicLinks).length && (
            <EmptyMedia label="No social or music links submitted" />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
        <SectionTitle icon={Video} title="Media & Performance Submissions" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="mb-2 block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Performance video
            </span>
            {embeddedVideo ? (
              <iframe
                src={embeddedVideo}
                title={`${app.stageName} performance video`}
                className="aspect-video w-full rounded-lg border-0 bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : app.videoUrl ? (
              <ExternalMediaLink href={app.videoUrl} label="Open submitted performance video" />
            ) : (
              <EmptyMedia label="No performance video submitted" />
            )}
            {app.videoUrls.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {app.videoUrls.map((url, index) => (
                  <ExternalMediaLink key={url} href={url} label={`Video ${index + 1}`} compact />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div>
              <span className="mb-2 block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Recorded music
              </span>
              <div className="space-y-2">
                {musicLinks.length ? (
                  musicLinks.map((track) => (
                    <a
                      key={track.url}
                      href={track.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs hover:border-[#FF5C00]/50 hover:bg-orange-50/30"
                    >
                      <span className="flex items-center gap-2 font-bold text-gray-900">
                        <MusicCover src={track.image} className="h-10 w-10 rounded-md" />
                        <span>
                          <span className="block">{track.title}</span>
                          <span className="text-[10px] font-medium text-gray-500">
                            {track.subtitle || serviceName(track.url)}
                          </span>
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </a>
                  ))
                ) : (
                  <EmptyMedia label="No recorded music links submitted" />
                )}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Promotional photo
              </span>
              {app.avatarUrl ? (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <Image
                    src={app.avatarUrl}
                    alt={`${app.stageName} promotional`}
                    width={1200}
                    height={900}
                    unoptimized
                    className="block h-auto max-h-[520px] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                  <ProfileImage
                    alt={app.stageName}
                    className="h-14 w-14 rounded-md border border-gray-200"
                    iconClassName="h-6 w-6"
                  />
                  <span className="text-xs font-semibold text-gray-500">
                    No promotional photo submitted
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
        <SectionTitle icon={ShieldCheck} title="Internal Review Notes" />
        <form onSubmit={addNote} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            placeholder="Add an internal reviewer note..."
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isSaving || !internalNote.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Add Note
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {notes.length ? (
            notes.map((note) => (
              <p
                key={note}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700"
              >
                {note}
              </p>
            ))
          ) : (
            <p className="text-xs text-gray-400">No internal notes yet.</p>
          )}
        </div>
      </section>

      {isSuperAdmin && (
        <section className="rounded-xl border border-red-200 bg-red-50/60 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-red-900">Delete artist application</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-red-800/80">
                Permanently removes this artist profile, application, votes, and event assignments.
                The artist account login is kept.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isSaving}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> DELETE ARTIST
            </button>
          </div>
        </section>
      )}

      {decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Confirm status change</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Change {app.stageName} from {statusLabels[app.lifecycleStatus]} to{' '}
                  {statusLabels[decision]}? The artist dashboard updates immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDecision(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 block text-xs font-bold text-gray-700" htmlFor="decision-reason">
              {decision === 'rejected'
                ? 'Rejection reason shown to artist'
                : 'Decision note (optional)'}
            </label>
            <textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-gray-200 p-3 text-xs focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecision(null)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDecision}
                disabled={isSaving || (decision === 'rejected' && reason.trim().length < 3)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${decision === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF5C00] hover:bg-[#e05200]'}`}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {editDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.18em] text-[#FF5C00] uppercase">
                  Profile edit review
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {editDecision === 'approve' ? 'Approve these edits?' : 'Reject these edits?'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {editDecision === 'approve'
                    ? 'The proposed values will replace the current public profile immediately.'
                    : 'The proposed values will be discarded and the current public profile will remain unchanged.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditDecision(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {editDecision === 'reject' && (
              <label
                className="mt-5 block text-xs font-bold text-gray-700"
                htmlFor="edit-review-reason"
              >
                Review reason sent to the artist
                <textarea
                  id="edit-review-reason"
                  value={editReason}
                  onChange={(event) => setEditReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Explain what needs to be changed..."
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-normal text-gray-900 outline-none focus:border-[#FF5C00] focus:bg-white"
                />
                <span className="mt-1 block text-[11px] font-normal text-gray-500">
                  A short note is required for a rejection.
                </span>
              </label>
            )}
            {error && (
              <p className="mt-3 text-xs font-semibold text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditDecision(null)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reviewEdits}
                disabled={isSaving || (editDecision === 'reject' && editReason.trim().length < 3)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${editDecision === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF5C00] hover:bg-[#e05200]'}`}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editDecision === 'approve' ? 'Approve edits' : 'Reject edits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete {app.stageName}?</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  This permanently removes the artist application and related competition records.
                  This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p className="mt-3 text-xs font-semibold text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteArtist}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PendingDiff = {
  key: string;
  label: string;
  before: unknown;
  after: unknown;
  kind: 'text' | 'link' | 'list' | 'photo' | 'boolean';
};

function applyApprovedEdits(app: AdminApplicationRecord): AdminApplicationRecord {
  const pending = app.pendingEdits ?? {};
  const stringValue = (key: string, fallback: string) =>
    typeof pending[key] === 'string' ? String(pending[key]).trim() : fallback;
  const videos = Array.isArray(pending.performanceVideoUrls)
    ? pending.performanceVideoUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : app.videoUrls;
  const music = Array.isArray(pending.recordedMusicUrls)
    ? pending.recordedMusicUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : Object.values(app.musicLinks);
  const socialLinks = { ...app.socialLinks };
  for (const key of ['instagram', 'tiktok', 'x', 'youtube', 'facebook']) {
    if (typeof pending[key] === 'string') {
      if (pending[key].trim()) socialLinks[key] = pending[key].trim();
      else delete socialLinks[key];
    }
  }
  const pendingPhotoKey = typeof pending.photoKey === 'string' ? pending.photoKey.trim() : null;
  const locationCity = stringValue(
    'locationCity',
    app.location.split(',')[0]?.trim() ?? app.location,
  );
  const locationSuffix = app.location.includes(',')
    ? app.location.slice(app.location.indexOf(','))
    : '';
  const actType =
    pending.actType === 'solo' || pending.actType === 'duo' || pending.actType === 'band'
      ? pending.actType
      : app.actType;
  return {
    ...app,
    stageName: stringValue('actName', app.stageName),
    actType,
    discipline: actType === 'band' ? 'Country band' : 'Country artist',
    location: `${locationCity}${locationSuffix}`,
    email: stringValue('contactEmail', app.email),
    phone: stringValue('contactPhone', app.phone),
    bio: stringValue('bio', app.bio),
    websiteUrl: stringValue('websiteUrl', app.websiteUrl),
    socialLinks,
    musicLinks: Object.fromEntries(music.map((url, index) => [`link_${index + 1}`, url])),
    audioTracks: music.map((url) => ({ title: 'Recorded music', duration: 'External link', url })),
    musicMetadata: undefined,
    videoUrls: videos,
    videoUrl: videos[0],
    primaryPhotoKey: pendingPhotoKey ?? app.primaryPhotoKey,
    avatarUrl: pendingPhotoKey === null ? app.avatarUrl : app.pendingPhotoUrl,
    coverPhotoUrl: pendingPhotoKey === null ? app.coverPhotoUrl : app.pendingPhotoUrl,
    pendingPhotoUrl: null,
    availability: {
      ...app.availability,
      allRequiredDates:
        typeof pending.availableAllDates === 'boolean'
          ? pending.availableAllDates
          : app.availability.allRequiredDates,
    },
    eligibility: typeof pending.isEligible === 'boolean' ? pending.isEligible : app.eligibility,
    acceptedRules:
      typeof pending.acceptedRules === 'boolean' ? pending.acceptedRules : app.acceptedRules,
    acceptedMediaRelease:
      typeof pending.acceptedMediaRelease === 'boolean'
        ? pending.acceptedMediaRelease
        : app.acceptedMediaRelease,
    pendingEdits: null,
    pendingEditsSubmittedAt: null,
  };
}

function pendingDiffs(app: AdminApplicationRecord): PendingDiff[] {
  const pending = app.pendingEdits ?? {};
  const current: Record<string, unknown> = {
    actName: app.stageName,
    actType: app.actType,
    locationCity: app.location.split(',')[0]?.trim() ?? app.location,
    contactEmail: app.email,
    contactPhone: app.phone,
    bio: app.bio,
    performanceVideoUrls: app.videoUrls,
    recordedMusicUrls: Object.values(app.musicLinks),
    availableAllDates: app.availability.allRequiredDates,
    isEligible: app.eligibility,
    instagram: app.socialLinks.instagram,
    tiktok: app.socialLinks.tiktok,
    x: app.socialLinks.x,
    youtube: app.socialLinks.youtube,
    facebook: app.socialLinks.facebook,
    websiteUrl: app.websiteUrl,
    photoKey: app.primaryPhotoKey,
    acceptedRules: app.pendingEdits?.acceptedRules === undefined ? undefined : app.acceptedRules,
    acceptedMediaRelease:
      app.pendingEdits?.acceptedMediaRelease === undefined ? undefined : app.acceptedMediaRelease,
  };
  const labels: Record<string, string> = {
    actName: 'Artist / band name',
    actType: 'Artist type',
    locationCity: 'Location',
    contactEmail: 'Contact email',
    contactPhone: 'Phone',
    bio: 'Biography',
    performanceVideoUrls: 'Performance videos',
    recordedMusicUrls: 'Recorded music',
    availableAllDates: 'Availability',
    isEligible: 'Eligibility',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    x: 'X',
    youtube: 'YouTube',
    facebook: 'Facebook',
    websiteUrl: 'Website',
    photoKey: 'Promotional photo',
    acceptedRules: 'Competition rules',
    acceptedMediaRelease: 'Media release',
  };
  const linkFields = new Set(['instagram', 'tiktok', 'x', 'youtube', 'facebook', 'websiteUrl']);
  const listFields = new Set(['performanceVideoUrls', 'recordedMusicUrls']);
  const booleanFields = new Set([
    'availableAllDates',
    'isEligible',
    'acceptedRules',
    'acceptedMediaRelease',
  ]);
  return Object.entries(pending)
    .filter(([key, value]) => key in labels && key !== 'currentStep' && value !== undefined)
    .map(([key, value]) => {
      const beforeValue = current[key];
      const before = normalizeDiffValue(beforeValue);
      const after = normalizeDiffValue(value);
      const changed =
        key === 'photoKey' ? before !== after : JSON.stringify(before) !== JSON.stringify(after);
      const kind: PendingDiff['kind'] =
        key === 'photoKey'
          ? 'photo'
          : linkFields.has(key)
            ? 'link'
            : listFields.has(key)
              ? 'list'
              : booleanFields.has(key)
                ? 'boolean'
                : 'text';
      return {
        key,
        label: labels[key]!,
        before,
        after,
        kind,
        changed,
      };
    })
    .filter((item) => item.changed)
    .map((item) => ({
      key: item.key,
      label: item.label,
      before: item.before,
      after: item.after,
      kind: item.kind,
    }));
}

function normalizeDiffValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => String(item).trim());
  if (typeof value === 'string') return value.trim();
  return value ?? '';
}

function PendingDiffRow({ item, app }: { item: PendingDiff; app: AdminApplicationRecord }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-xs font-bold text-gray-900">{item.label}</span>
        <span className="text-[10px] font-bold tracking-wider text-[#FF5C00] uppercase">
          Changed
        </span>
      </div>
      <div className="grid gap-0 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-4">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Current public value
          </p>
          <DiffValue
            value={item.before}
            kind={item.kind}
            imageUrl={item.kind === 'photo' ? app.avatarUrl : null}
          />
        </div>
        <div className="bg-orange-50/30 p-4">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-[#FF5C00] uppercase">
            Proposed edit
          </p>
          <DiffValue
            value={item.after}
            kind={item.kind}
            imageUrl={item.kind === 'photo' ? app.pendingPhotoUrl : null}
          />
        </div>
      </div>
    </div>
  );
}

function DiffValue({
  value,
  kind,
  imageUrl,
}: {
  value: unknown;
  kind: PendingDiff['kind'];
  imageUrl: string | null;
}) {
  if (kind === 'photo') {
    return imageUrl ? (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <Image
          src={imageUrl}
          alt="Promotional photo preview"
          width={1200}
          height={900}
          unoptimized
          className="block max-h-72 w-full object-contain"
        />
      </div>
    ) : (
      <span className="text-xs text-gray-400">No photo</span>
    );
  }
  if (kind === 'list') {
    const values = Array.isArray(value) ? value : [];
    return values.length ? (
      <div className="space-y-2">
        {values.map((item) => (
          <a
            key={String(item)}
            href={String(item)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-[#FF5C00]/50 hover:text-[#FF5C00]"
          >
            <span className="min-w-0 truncate">{String(item)}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#FF5C00]" />
          </a>
        ))}
      </div>
    ) : (
      <span className="text-xs text-gray-400">None</span>
    );
  }
  if (kind === 'link' && typeof value === 'string' && value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="flex items-start justify-between gap-2 text-xs font-semibold break-all text-gray-800 hover:text-[#FF5C00]"
      >
        <span>{value}</span>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5C00]" />
      </a>
    );
  }
  if (kind === 'boolean')
    return (
      <span className="text-xs font-semibold text-gray-700">
        {value ? 'Confirmed' : 'Not confirmed'}
      </span>
    );
  return (
    <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
      {typeof value === 'string' && value ? value : 'Not provided'}
    </p>
  );
}

function StatusBadge({ status }: { status: AdminApplicationRecord['lifecycleStatus'] }) {
  const tone =
    status === 'rejected' || status === 'withdrawn'
      ? 'border-red-200 bg-red-50 text-red-700'
      : status === 'shortlisted' || status === 'finalist'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-orange-200 bg-orange-50 text-orange-700';
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function formatAssignedShowDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function VotingAnalytics({
  app,
  context,
}: {
  app: AdminApplicationRecord;
  currentStage: CompetitionStage;
  context: VotingContext;
}) {
  const attempts = app.verifiedVotes + app.pendingVotes + app.invalidatedVotes;
  const verificationRate = attempts ? Math.round((app.verifiedVotes / attempts) * 100) : 0;
  const voteShare = context.totalVerifiedVotes
    ? (app.verifiedVotes / context.totalVerifiedVotes) * 100
    : 0;
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <div className="grid gap-px bg-gray-200 sm:grid-cols-2 xl:grid-cols-4">
        <VoteStat
          icon={ShieldCheck}
          label="Verified votes"
          value={app.verifiedVotes}
          note="Counted in the artist total"
          tone="orange"
        />
        <VoteStat
          icon={MailCheck}
          label="Awaiting verification"
          value={app.pendingVotes}
          note="OTP requested but not completed"
        />
        <VoteStat
          icon={AlertTriangle}
          label="Flagged activity"
          value={app.flaggedVotes}
          note="Requires integrity review"
          tone="amber"
        />
        <VoteStat
          icon={Ban}
          label="Invalidated"
          value={app.invalidatedVotes}
          note="Removed from all vote totals"
          tone="red"
        />
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Verification performance
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {app.verifiedVotes.toLocaleString()} of {attempts.toLocaleString()} attempts
                verified
              </p>
            </div>
            <p className="text-2xl font-black text-gray-900">{verificationRate}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#FF5C00]"
              style={{ width: `${verificationRate}%` }}
            />
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Share of verified campaign votes
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {voteShare.toFixed(1)}% of all counted fan votes
              </p>
            </div>
            <p className="text-lg font-black text-[#FF5C00]">
              {app.verifiedVotes.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900"
              style={{ width: `${Math.min(100, voteShare)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <Trophy className="h-4 w-4" />
            <p className="text-[10px] font-black tracking-wider uppercase">Leaderboard position</p>
          </div>
          <p className="mt-3 text-4xl font-black text-gray-950">
            {context.rank ? `#${context.rank}` : '—'}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            Among {context.candidateCount.toLocaleString()} eligible voting candidates.
          </p>
        </div>
      </div>
    </section>
  );
}

function VoteStat({
  icon: Icon,
  label,
  value,
  note,
  tone = 'gray',
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  note: string;
  tone?: 'gray' | 'orange' | 'amber' | 'red';
}) {
  const colors =
    tone === 'orange'
      ? 'bg-orange-50 text-[#FF5C00]'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : tone === 'red'
          ? 'bg-red-50 text-red-600'
          : 'bg-gray-50 text-gray-500';
  return (
    <div className="bg-white p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-950">{value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">{note}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  small = false,
}: {
  icon: typeof User;
  title: string;
  small?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
      <Icon className="h-5 w-5 text-gray-400" />
      <h2 className={`font-bold text-gray-900 ${small ? 'text-sm' : 'text-base'}`}>{title}</h2>
    </div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof MapPin;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
        {label}
      </span>
      <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#FF5C00]" />}
        {value}
      </p>
    </div>
  );
}

function ExternalMediaLink({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 font-bold text-gray-800 hover:border-[#FF5C00]/50 ${compact ? 'px-3 py-1.5 text-[11px]' : 'w-full justify-center px-4 py-8 text-xs'}`}
    >
      <ExternalLink className="h-4 w-4 text-[#FF5C00]" />
      {label}
    </a>
  );
}

function EmptyMedia({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-xs text-gray-400">
      {label}
    </div>
  );
}
