import { z } from 'zod';
import {
  normalizeSocialInput,
  validateMusicUrl,
  validateVideoUrl,
  validateWebsiteUrl,
} from './url';

/**
 * Artist application schemas (§4.2). One schema per step, imported by both the
 * client form and the server action.
 *
 * TWO VALIDATION LEVELS, on purpose:
 *
 *   *DraftSchema  - what a half-finished application may contain. Nearly
 *                   everything optional, because a draft saved from a phone on
 *                   a dying connection has to survive with three fields still
 *                   blank (§3.1).
 *   *Schema       - what a SUBMITTED application must contain. Hard gates live
 *                   here.
 *
 * Collapse these into one schema and save-as-draft becomes either impossible or
 * pointless.
 */

// ---------------------------------------------------------------------------
// Field limits, matching the caps named in CLAUDE.md. Leave a bio field
// uncapped and you have a memory exhaustion vector.
// ---------------------------------------------------------------------------
export const LIMITS = {
  actName: 200,
  location: 200,
  phone: 40,
  bio: 5000,
  url: 500,
  freeText: 2000,
  maxVideoLinks: 5,
  maxMusicLinks: 5,
} as const;

/** §18: both solo artists and bands may apply. Matches the act_type enum. */
export const ACT_TYPES = ['solo', 'duo', 'band'] as const;
export type ActType = (typeof ACT_TYPES)[number];

/** Labels used in the UI. The enum value is what reaches the database. */
export const ACT_TYPE_LABELS: Record<ActType, string> = {
  solo: 'Solo Artist',
  duo: 'Duo',
  band: 'Full Band',
};

// ---------------------------------------------------------------------------
// Reusable field builders
// ---------------------------------------------------------------------------

/** An optional text field where '' and undefined both mean "not answered". */
function optionalText(max: number) {
  return z
    .string()
    .max(max, `Please keep this under ${max} characters.`)
    .trim()
    .optional()
    .or(z.literal(''));
}

/**
 * A URL field validated by one of the allowlist helpers.
 *
 * Transforms to the normalized URL, so what gets stored is what was checked.
 * Store the raw input, validate a derived value separately, and sooner or later
 * a `javascript:` URL reaches an href.
 */
function allowlistedUrlField(validator: (input: string) => string | null, message: string) {
  return z
    .string()
    .max(LIMITS.url, 'That link is too long.')
    .trim()
    .transform((value, ctx) => {
      if (!value) return '';
      const normalized = validator(value);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return normalized;
    });
}

function socialField(platform: Parameters<typeof normalizeSocialInput>[1], label: string) {
  return z
    .string()
    .max(LIMITS.url, 'That link is too long.')
    .trim()
    .transform((value, ctx) => {
      if (!value) return '';
      const normalized = normalizeSocialInput(value, platform);
      if (!normalized) {
        ctx.addIssue({
          code: 'custom',
          message: `Enter a valid ${label} handle or link.`,
        });
        return z.NEVER;
      }
      return normalized;
    });
}

// ---------------------------------------------------------------------------
// Step 1: artist information
// ---------------------------------------------------------------------------

export const artistInfoDraftSchema = z.object({
  actName: optionalText(LIMITS.actName),
  actType: z.enum(ACT_TYPES).optional().or(z.literal('')),
  locationCity: optionalText(LIMITS.location),
  contactEmail: optionalText(254),
  contactPhone: optionalText(LIMITS.phone),
  bio: optionalText(LIMITS.bio),
});

export const artistInfoSchema = z.object({
  actName: z
    .string()
    .trim()
    .min(1, 'Enter your artist or band name.')
    .max(LIMITS.actName, 'That name is too long.'),
  actType: z.enum(ACT_TYPES, { message: 'Choose whether you are a solo act, duo, or band.' }),
  locationCity: z
    .string()
    .trim()
    .min(1, 'Enter your primary location.')
    .max(LIMITS.location, 'That location is too long.'),
  contactEmail: z
    .string()
    .trim()
    .min(1, 'Enter a contact email.')
    .max(254, 'That email address is too long.')
    .email('Enter a valid contact email.'),
  contactPhone: optionalText(LIMITS.phone),
  bio: z
    .string()
    .trim()
    .min(1, 'Tell us about your act.')
    .max(LIMITS.bio, `Please keep your biography under ${LIMITS.bio} characters.`),
});

// ---------------------------------------------------------------------------
// Step 2: music and media
// ---------------------------------------------------------------------------

const linkArray = (validator: (input: string) => string | null, message: string, max: number) =>
  z
    .array(allowlistedUrlField(validator, message))
    .max(max, `You can add up to ${max} links.`)
    // Drop blanks. The form always renders one empty row, and an untouched row
    // is not an error.
    .transform((values) => values.filter((value) => value !== ''));

export const musicMediaDraftSchema = z.object({
  /** Cloudinary public_id, never a delivery URL (CLAUDE.md storage rules). */
  photoKey: optionalText(LIMITS.url),
  performanceVideoUrls: linkArray(
    validateVideoUrl,
    'Video links must be a YouTube or Vimeo https link.',
    LIMITS.maxVideoLinks,
  ).optional(),
  recordedMusicUrls: linkArray(
    validateMusicUrl,
    'Music links must be an https link to Spotify, Apple Music, SoundCloud, or Bandcamp.',
    LIMITS.maxMusicLinks,
  ).optional(),
  instagram: socialField('instagram', 'Instagram').optional(),
  tiktok: socialField('tiktok', 'TikTok').optional(),
  x: socialField('x', 'X').optional(),
  youtube: socialField('youtube', 'YouTube').optional(),
  facebook: socialField('facebook', 'Facebook').optional(),
  websiteUrl: allowlistedUrlField(
    validateWebsiteUrl,
    'Enter a valid https website address.',
  ).optional(),
});

export const musicMediaSchema = musicMediaDraftSchema.extend({
  /**
   * §4.2 lists professional photos as required, and the review queue is
   * unusable without one. Enforced at submission only, so a draft can save
   * while the upload is still running.
   */
  photoKey: z
    .string()
    .trim()
    .min(1, 'Upload a promotional photo.')
    .max(LIMITS.url, 'That photo reference is invalid.'),
  /** At least one performance video: it is what the panel actually assesses. */
  performanceVideoUrls: linkArray(
    validateVideoUrl,
    'Video links must be a YouTube or Vimeo https link.',
    LIMITS.maxVideoLinks,
  ).refine((values) => values.length >= 1, 'Add at least one performance video link.'),
  /** At least two recorded songs are required for eligibility review. */
  recordedMusicUrls: linkArray(
    validateMusicUrl,
    'Music links must be an https link to Spotify, Apple Music, SoundCloud, or Bandcamp.',
    LIMITS.maxMusicLinks,
  ).refine((values) => values.length >= 2, 'Add at least two recorded music links.'),
});

// ---------------------------------------------------------------------------
// Step 3: availability, eligibility, agreements
// ---------------------------------------------------------------------------

export const availabilityDraftSchema = z.object({
  availableAllDates: z.boolean().optional(),
  isEligible: z.boolean().optional(),
  acceptedRules: z.boolean().optional(),
  acceptedMediaRelease: z.boolean().optional(),
});

export const availabilitySchema = z.object({
  /**
   * A HARD GATE. §4.1 is blunt about this: artists won't know which of the five
   * dates they get, so availability for all five is a condition of entry, not a
   * preference.
   */
  availableAllDates: z.literal(true, {
    message: 'You must be available for all five competition dates to enter.',
  }),
  /** Age and residency attestation. See AGE_MINIMUM in src/config/event.ts. */
  isEligible: z.literal(true, {
    message: 'You must confirm you meet the age and residency requirements.',
  }),
  acceptedRules: z.literal(true, {
    message: 'You must accept the competition rules.',
  }),
  /** §16: releases must be secured before any content is recorded or distributed. */
  acceptedMediaRelease: z.literal(true, {
    message: 'You must accept the media release to take part in a filmed show.',
  }),
});

// ---------------------------------------------------------------------------
// Step 4: review and submit
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  confirmAccuracy: z.literal(true, {
    message: 'Please confirm your information is accurate.',
  }),
});

// ---------------------------------------------------------------------------
// Composites
// ---------------------------------------------------------------------------

/**
 * What a draft may hold. Every step, all lenient. The server takes this at any
 * point in the flow.
 */
export const applicationDraftSchema = artistInfoDraftSchema
  .merge(musicMediaDraftSchema)
  .merge(availabilityDraftSchema)
  .extend({
    currentStep: z.number().int().min(1).max(5).optional(),
  });

/** What a SUBMITTED application must satisfy. Every gate, in one place. */
export const applicationSubmitSchema = artistInfoSchema
  .merge(musicMediaSchema)
  .merge(availabilitySchema)
  .merge(reviewSchema);

export type ApplicationDraftInput = z.input<typeof applicationDraftSchema>;
export type ApplicationDraftOutput = z.output<typeof applicationDraftSchema>;
export type ApplicationSubmitInput = z.input<typeof applicationSubmitSchema>;
export type ApplicationSubmitOutput = z.output<typeof applicationSubmitSchema>;

/**
 * Exact consent wording shown in the application, stored verbatim in
 * email_consents. Bump CONSENT_VERSION in ./auth.ts when any of it changes. A
 * consent record nobody can tie back to the text on screen is not evidence.
 */
export const APPLICATION_CONSENT_WORDING = {
  availability:
    'I confirm that I am available for all required competition dates. I acknowledge that failure to attend any of the mandatory dates listed above may result in immediate disqualification from the competition.',
  eligibility: 'I confirm I am at least 18 years of age and a legal resident.',
  rules: 'I have read and agree to the Official Competition Rules.',
  mediaRelease: 'I consent to the Media Release Agreement allowing use of my likeness.',
  accuracy:
    'I confirm that all information provided is accurate and that I agree to the competition terms and conditions.',
} as const;
