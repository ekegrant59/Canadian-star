import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { artists } from './artists';
import { shows } from './shows';
import { scoringComponentEnum } from './enums';

/**
 * Component weights (§7). THE source of truth for score computation.
 *
 * Never read weights from a constant when computing a result. §7 explicitly
 * leaves the tip jar unresolved, so the math must stay correct when a component
 * is disabled and its share redistributes across the rest.
 */
export const scoringWeights = pgTable(
  'scoring_weights',
  {
    id: text('id').primaryKey(),
    component: scoringComponentEnum('component').notNull(),
    label: text('label').notNull(),
    /** Percentage points. Enabled components should total 100. */
    weight: numeric('weight', { precision: 5, scale: 2 }).notNull(),
    /** Tip jar ships disabled (§7). */
    enabled: boolean('enabled').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),

    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('scoring_weights_component_idx').on(table.component)],
);

/** The nine assessment criteria (§4.4). Admin-editable. */
export const scoringCriteria = pgTable(
  'scoring_criteria',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    /** Relative weight within a judge's own scorecard. */
    weight: numeric('weight', { precision: 5, scale: 2 }).notNull().default('1'),
    maxScore: integer('max_score').notNull().default(10),
    enabled: boolean('enabled').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [uniqueIndex('scoring_criteria_key_idx').on(table.key)],
);

/**
 * Judge scores for live shows (§6, §7).
 *
 * Judges never see each other's scores. Submit-and-lock per artist; an admin
 * can unlock, which writes an audit_log entry.
 */
export const scores = pgTable(
  'scores',
  {
    id: text('id').primaryKey(),
    judgeId: text('judge_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    showId: text('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),

    /** { criterionKey: score }. Validated against scoring_criteria on write. */
    criteriaScores: jsonb('criteria_scores').$type<Record<string, number>>().notNull().default({}),
    notes: text('notes'),

    /** Draft until submitted. Continuous autosave means a lost phone loses nothing. */
    submitted: boolean('submitted').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    unlockedBy: text('unlocked_by').references(() => users.id, { onDelete: 'set null' }),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('scores_judge_artist_show_idx').on(table.judgeId, table.artistId, table.showId),
    index('scores_show_id_idx').on(table.showId),
    index('scores_artist_id_idx').on(table.artistId),
  ],
);

/**
 * Industry review of the 25-30 fan-vote shortlist (§4.4).
 * Reviewers cannot see each other's scores before submitting: anchoring is real.
 */
export const industryReviews = pgTable(
  'industry_reviews',
  {
    id: text('id').primaryKey(),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),

    criteriaScores: jsonb('criteria_scores').$type<Record<string, number>>().notNull().default({}),
    notes: text('notes'),

    submitted: boolean('submitted').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('industry_reviews_reviewer_artist_idx').on(table.reviewerId, table.artistId),
    index('industry_reviews_artist_id_idx').on(table.artistId),
  ],
);

/**
 * Tip jar totals (§7, §18).
 *
 * §18 lists "tip jar count verification process" as unresolved, so this records
 * BOTH who counted and who verified. Admin-entered, never public-facing input.
 * Only used when the TIP_JAR_ENABLED flag is on.
 */
export const tipJarTotals = pgTable(
  'tip_jar_totals',
  {
    id: text('id').primaryKey(),
    showId: text('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),

    amountCents: integer('amount_cents').notNull().default(0),

    countedBy: text('counted_by').notNull(),
    verifiedBy: text('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    enteredBy: text('entered_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tip_jar_show_artist_idx').on(table.showId, table.artistId)],
);
