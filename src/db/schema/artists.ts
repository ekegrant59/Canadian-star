import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { actTypeEnum, applicationStatusEnum } from './enums';

/**
 * Artist profiles (§4.2).
 *
 * Columns are grouped PUBLIC and PRIVATE. Public queries must select the
 * explicit public column set (see src/server/queries/columns.ts) and never
 * `select()` the whole row: contact details and internal review notes live
 * here, and a whole-row select serialized into a prop is how private data ends
 * up in the HTML payload.
 */
export const artists = pgTable(
  'artists',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // ---------------------------------------------------------------------
    // PUBLIC — safe to render on a public profile
    // ---------------------------------------------------------------------
    actName: text('act_name').notNull(),
    slug: text('slug').notNull(),
    actType: actTypeEnum('act_type').notNull(),
    bio: text('bio'),
    /** City/town only. Never a street address, and see the minors question. */
    locationCity: text('location_city'),
    locationProvince: text('location_province').default('ON'),
    formationYear: integer('formation_year'),
    memberCount: integer('member_count'),

    /** Cloudinary public_ids, not URLs. Resolved by mediaUrl() at render time. */
    photoKeys: jsonb('photo_keys').$type<string[]>().default([]).notNull(),
    primaryPhotoKey: text('primary_photo_key'),

    /** Validated against an https: host allowlist before storage. */
    websiteUrl: text('website_url'),
    performanceVideoUrl: text('performance_video_url'),
    socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),
    musicLinks: jsonb('music_links').$type<Record<string, string>>().default({}).notNull(),

    /** Only true once an admin approves. Gates public visibility. */
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // ---------------------------------------------------------------------
    // PRIVATE — never selected by a public query
    // ---------------------------------------------------------------------
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    /** Full mailing address, collected only if the client confirms it is needed. */
    contactAddress: text('contact_address'),
    managementContact: text('management_contact'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('artists_slug_idx').on(table.slug),
    index('artists_user_id_idx').on(table.userId),
    index('artists_published_idx').on(table.isPublished),
    index('artists_location_idx').on(table.locationCity),
  ],
);

/**
 * Applications (§4.2). Separate from `artists` because an artist record is the
 * public identity while an application is the reviewable submission with its
 * own lifecycle and consent record.
 */
export const applications = pgTable(
  'applications',
  {
    id: text('id').primaryKey(),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),

    status: applicationStatusEnum('status').notNull().default('draft'),

    /** Which step the artist reached, so a resumed draft returns them there. */
    currentStep: integer('current_step').notNull().default(1),

    // ---------------------------------------------------------------------
    // Eligibility (§4.1)
    // ---------------------------------------------------------------------
    isOntarioResident: boolean('is_ontario_resident'),
    /**
     * §4.1 leaves the age requirement undecided and it is a BLOCKING client
     * question: if minors can apply, parental consent handling is required
     * before any of their data is collected or published.
     */
    isOfAge: boolean('is_of_age'),
    hasRecordingContract: boolean('has_recording_contract'),
    hasManagementContract: boolean('has_management_contract'),
    contractDetails: text('contract_details'),
    wonPreviousCompetition: boolean('won_previous_competition'),
    previousCompetitionDetails: text('previous_competition_details'),

    // ---------------------------------------------------------------------
    // Availability (§4.1) — a hard gate. Artists do not know which date they
    // will be assigned, so they must confirm all five.
    // ---------------------------------------------------------------------
    availableAllDates: boolean('available_all_dates'),
    availabilityNotes: text('availability_notes'),

    // ---------------------------------------------------------------------
    // Agreements. The consent records themselves live in email_consents with
    // the exact wording shown; these booleans are the fast path for the UI.
    // ---------------------------------------------------------------------
    acceptedRules: boolean('accepted_rules').notNull().default(false),
    acceptedMediaRelease: boolean('accepted_media_release').notNull().default(false),
    acceptedPrivacyPolicy: boolean('accepted_privacy_policy').notNull().default(false),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    // ---------------------------------------------------------------------
    // Admin review — PRIVATE. Never exposed to the artist or the public.
    // ---------------------------------------------------------------------
    reviewNotes: text('review_notes'),
    rejectionReason: text('rejection_reason'),
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('applications_artist_id_idx').on(table.artistId),
    index('applications_status_idx').on(table.status),
    index('applications_submitted_at_idx').on(table.submittedAt),
  ],
);
