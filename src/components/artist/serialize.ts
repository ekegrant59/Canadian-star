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

  const videos =
    application.performanceVideoUrls.length > 0
      ? application.performanceVideoUrls
      : application.performanceVideoUrl
        ? [application.performanceVideoUrl]
        : [];

  return {
    artistName: application.actName === 'Untitled application' ? '' : application.actName,
    publicSlug: application.slug,
    artistType: application.actType,
    primaryLocation: application.locationCity ?? '',
    contactEmail: application.contactEmail ?? '',
    phoneNumber: application.contactPhone ?? '',
    biography: application.bio ?? '',

    photoKey: application.primaryPhotoKey,
    photoUrl,
    // Transient browser state: a stored photo has no File object behind it.
    promotionalPhoto: null,
    promotionalPhotoPreview: null,
    promotionalPhotoName: application.primaryPhotoKey ? 'Uploaded photo' : null,
    promotionalPhotoSize: null,

    // The form renders one empty row when a list is empty.
    performanceVideoUrls: videos.length > 0 ? videos : [''],
    recordedMusicUrls: music.length > 0 ? music : [''],

    instagramHandle: social.instagram ?? '',
    tiktokHandle: social.tiktok ?? '',
    xHandle: social.x ?? '',
    youtubeHandle: social.youtube ?? '',
    facebookHandle: social.facebook ?? '',
    websiteUrl: application.websiteUrl ?? '',

    availableAllDates: application.availableAllDates ?? false,
    isAgeAndResidencyEligible: application.isOfAge ?? false,
    agreeCompetitionRules: application.acceptedRules,
    agreeMediaRelease: application.acceptedMediaRelease,

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
