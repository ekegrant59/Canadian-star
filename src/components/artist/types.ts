import type { ActType } from '@/lib/validation/application';

/**
 * Form state for the multi-step application.
 *
 * `actType` holds the ENUM VALUE ('solo' | 'duo' | 'band'), not a display
 * label. Labels come from ACT_TYPE_LABELS at render time. The earlier shape
 * stored the label here, which meant hand-syncing a UI string against a
 * database enum forever.
 */
export interface ApplicationFormData {
  // Step 1: Artist Information
  artistName: string;
  artistType: ActType | '';
  primaryLocation: string;
  contactEmail: string;
  phoneNumber: string;
  biography: string;

  // Step 2: Music & Media
  /**
   * Cloudinary public_id of the uploaded photo, or null. This is what gets
   * persisted. The File and preview below are throwaway browser state, alive
   * only between picking a file and the upload finishing.
   */
  photoKey: string | null;
  /** Delivery URL for an uploaded photo. Browser-only display state. */
  photoUrl: string | null;
  promotionalPhoto: File | null;
  promotionalPhotoPreview: string | null;
  promotionalPhotoName: string | null;
  promotionalPhotoSize: string | null;

  performanceVideoUrls: string[];
  recordedMusicUrls: string[];
  musicMetadata?: Array<{
    url: string;
    title: string;
    subtitle: string | null;
    image: string | null;
  }>;
  instagramHandle: string;
  tiktokHandle: string;
  xHandle: string;
  youtubeHandle: string;
  facebookHandle: string;
  websiteUrl: string;

  // Step 3: Availability & Eligibility
  availableAllDates: boolean;
  isAgeAndResidencyEligible: boolean;
  agreeCompetitionRules: boolean;
  agreeMediaRelease: boolean;

  // Step 4: Final Review & Confirmation
  confirmAccuracy: boolean;

  // Step 5: Submission metadata
  applicationId?: string;
  submittedAt?: string;
  publicSlug?: string;
}

export const INITIAL_APPLICATION_DATA: ApplicationFormData = {
  artistName: '',
  artistType: '',
  primaryLocation: '',
  contactEmail: '',
  phoneNumber: '',
  biography: '',

  photoKey: null,
  photoUrl: null,
  promotionalPhoto: null,
  promotionalPhotoPreview: null,
  promotionalPhotoName: null,
  promotionalPhotoSize: null,

  performanceVideoUrls: [''],
  recordedMusicUrls: [''],
  instagramHandle: '',
  tiktokHandle: '',
  xHandle: '',
  youtubeHandle: '',
  facebookHandle: '',
  websiteUrl: '',

  availableAllDates: false,
  isAgeAndResidencyEligible: false,
  agreeCompetitionRules: false,
  agreeMediaRelease: false,

  confirmAccuracy: false,
};

/**
 * Converts form state into the payload the server actions validate.
 *
 * Blank link rows get dropped here instead of going up as empty strings. The
 * form always renders one empty input, and an untouched input is not an answer.
 */
export function toActionPayload(data: ApplicationFormData, currentStep?: number) {
  return {
    actName: data.artistName,
    actType: data.artistType,
    locationCity: data.primaryLocation,
    contactEmail: data.contactEmail,
    contactPhone: data.phoneNumber,
    bio: data.biography,

    photoKey: data.photoKey ?? '',
    performanceVideoUrls: data.performanceVideoUrls.filter(Boolean),
    recordedMusicUrls: data.recordedMusicUrls.filter(Boolean),
    instagram: data.instagramHandle,
    tiktok: data.tiktokHandle,
    x: data.xHandle,
    youtube: data.youtubeHandle,
    facebook: data.facebookHandle,
    websiteUrl: data.websiteUrl,

    availableAllDates: data.availableAllDates,
    isEligible: data.isAgeAndResidencyEligible,
    acceptedRules: data.agreeCompetitionRules,
    acceptedMediaRelease: data.agreeMediaRelease,
    confirmAccuracy: data.confirmAccuracy,

    ...(currentStep === undefined ? {} : { currentStep }),
  };
}
