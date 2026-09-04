import type { ArtistApplication } from '@/server/queries/application';
import { INITIAL_APPLICATION_DATA, type ApplicationFormData } from './types';

/**
 * Maps a stored application onto form state.
 *
 * Kept apart from the query module so a Server Component can import it without
 * dragging `server-only` into the client bundle.
 *
 * Maps only fields the artist owns. `reviewNotes` never reaches this layer,
 * because the query doesn't select it.
 */
export function toFormData(
  application: ArtistApplication | null,
  photoUrl: string | null = null,
): ApplicationFormData {
  if (!application) return INITIAL_APPLICATION_DATA;

  const social = application.socialLinks ?? {};
  const music = Object.values(application.musicLinks ?? {}).filter(Boolean);
  const pending = application.pendingEdits ?? {};
  const value = <T>(key: string, fallback: T): T =>
    pending[key] === undefined ? fallback : (pending[key] as T);

  const videos =
    application.performanceVideoUrls.length > 0
      ? application.performanceVideoUrls
      : application.performanceVideoUrl
        ? [application.performanceVideoUrl]
        : [];

  return {
    artistName: value(
      'actName',
      application.actName === 'Untitled application' ? '' : application.actName,
    ),
    publicSlug: application.slug,
    artistType: value('actType', application.actType),
    primaryLocation: value('locationCity', application.locationCity ?? ''),
    contactEmail: value('contactEmail', application.contactEmail ?? ''),
    phoneNumber: value('contactPhone', application.contactPhone ?? ''),
    biography: value('bio', application.bio ?? ''),

    photoKey: value('photoKey', application.primaryPhotoKey),
    photoUrl,
    // Transient browser state: a stored photo has no File object behind it.
    promotionalPhoto: null,
    promotionalPhotoPreview: null,
    promotionalPhotoName: application.primaryPhotoKey ? 'Uploaded photo' : null,
    promotionalPhotoSize: null,

    // The form renders one empty row when a list is empty.
    performanceVideoUrls:
      ((pending.performanceVideoUrls as string[] | undefined) ?? videos).filter(Boolean).length > 0
        ? ((pending.performanceVideoUrls as string[] | undefined) ?? videos)
        : [''],
    recordedMusicUrls:
      ((pending.recordedMusicUrls as string[] | undefined) ?? music).filter(Boolean).length > 0
        ? ((pending.recordedMusicUrls as string[] | undefined) ?? music)
        : [''],

    instagramHandle: value('instagram', social.instagram ?? ''),
    tiktokHandle: value('tiktok', social.tiktok ?? ''),
    xHandle: value('x', social.x ?? ''),
    youtubeHandle: value('youtube', social.youtube ?? ''),
    facebookHandle: value('facebook', social.facebook ?? ''),
    websiteUrl: value('websiteUrl', application.websiteUrl ?? ''),

    availableAllDates: value('availableAllDates', application.availableAllDates ?? false),
    isAgeAndResidencyEligible: value('isEligible', application.isOfAge ?? false),
    agreeCompetitionRules: value('acceptedRules', application.acceptedRules),
    agreeMediaRelease: value('acceptedMediaRelease', application.acceptedMediaRelease),

    /**
     * Never restored from storage. The §4.2 accuracy attestation has to be a
     * fresh act at the moment of submission, not a box ticked last week and
     * quietly carried forward.
     */
    confirmAccuracy: false,

    applicationId: application.applicationId,
    submittedAt: application.submittedAt?.toISOString(),
  };
}
