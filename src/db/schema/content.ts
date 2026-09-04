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
import { confirmationStatusEnum, judgeSeatEnum, sponsorTierEnum } from './enums';

/**
 * Judges (§6, §8).
 *
 * `status` is a LEGAL requirement, not a nicety. §8 states plainly that any
 * artist or public figure is unconfirmed until direct written agreement has
 * been received, and names Kaleb, Sasha, and the James Barker Band only as
 * potential participants. Only `confirmed` renders publicly, enforced in the
 * query layer rather than the component.
 */
export const judges = pgTable(
  'judges',
  {
    id: text('id').primaryKey(),
    /** Optional link to a user account for the scoring portal. */
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),

    name: text('name').notNull(),
    title: text('title'),
    organization: text('organization'),
    seat: judgeSeatEnum('seat'),
    bio: text('bio'),
    photoKey: text('photo_key'),
    socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),

    status: confirmationStatusEnum('status').notNull().default('prospect'),
    /** Internal note on where the agreement stands. Never public. */
    agreementNotes: text('agreement_notes'),

    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('judges_status_idx').on(table.status)],
);

/** Sponsors (§13). Same confirmation rule as judges. */
export const sponsors = pgTable(
  'sponsors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    tier: sponsorTierEnum('tier'),
    logoKey: text('logo_key'),
    websiteUrl: text('website_url'),
    description: text('description'),

    status: confirmationStatusEnum('status').notNull().default('prospect'),
    agreementNotes: text('agreement_notes'),

    /**
     * §13: alcohol sponsorship needs age gating and provincial compliance
     * review before it ships. Flags a sponsor whose content is age-restricted.
     */
    requiresAgeGate: boolean('requires_age_gate').notNull().default(false),

    displayOrder: integer('display_order').notNull().default(0),
    placement: text('placement').notNull().default('bottom'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sponsors_status_idx').on(table.status)],
);

/**
 * Prizes (§9).
 *
 * §9 requires that all prize commitments are documented before they are
 * publicly advertised. Only `confirmed` renders publicly.
 *
 * Note: no raffle or prize-draw mechanic exists in this schema by design. AGCO
 * raffle licences go to charitable and religious organizations only, and the
 * cruise raffle in §13 is unresolved. See docs/hellion-questions.md.
 */
export const prizes = pgTable(
  'prizes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    provider: text('provider'),
    estimatedValue: text('estimated_value'),

    status: confirmationStatusEnum('status').notNull().default('prospect'),
    agreementNotes: text('agreement_notes'),

    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('prizes_status_idx').on(table.status)],
);

/**
 * Admin-editable marketing copy. Sponsor announcements, judge confirmations,
 * and rule clarifications happen constantly between September and February;
 * none of them should require a deploy.
 */
export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    title: text('title'),
    body: text('body'),
    published: boolean('published').notNull().default(false),

    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('content_blocks_key_idx').on(table.key)],
);

/** Scheduled public banner for urgent or time-sensitive homepage messages. */
export const homepageAnnouncements = pgTable(
  'homepage_announcements',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    ctaLabel: text('cta_label'),
    ctaUrl: text('cta_url'),
    severity: text('severity').notNull().default('info'),
    published: boolean('published').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('homepage_announcements_published_idx').on(table.published),
    index('homepage_announcements_window_idx').on(table.startsAt, table.endsAt),
  ],
);

/**
 * Runtime settings and feature flags. Overrides the defaults in
 * src/config/event.ts so the client can flip a flag from admin without a deploy.
 *
 * One setting, one scope: a value lives EITHER here or in config, never both.
 * Config holds structural constants; this table holds operational switches.
 */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),

  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Audit log for vote and score integrity disputes.
 *
 * APPEND-ONLY. The migration revokes UPDATE and DELETE from the application
 * role: an audit log an admin can edit is not evidence. §11 names vote
 * integrity as an accountability, and this table is how a challenge is answered.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email'),

    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),

    before: jsonb('before'),
    after: jsonb('after'),

    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_entity_idx').on(table.entityType, table.entityId),
    index('audit_log_actor_idx').on(table.actorId),
    index('audit_log_created_at_idx').on(table.createdAt),
  ],
);
