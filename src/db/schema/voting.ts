import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { shows } from './shows';
import { users } from './auth';
import { consentTypeEnum, voteRoundEnum } from './enums';

/**
 * Votes (§4.3). One verified email equals one vote.
 *
 * The uniqueness guarantee is the partial unique index below, NOT application
 * logic. Under load, a check-then-insert race is how double votes get
 * through, and this competition's credibility is the product.
 *
 * Only `verified` votes are ever counted in a published tally.
 */
export const votes = pgTable(
  'votes',
  {
    id: text('id').primaryKey(),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),

    round: voteRoundEnum('round').notNull().default('public_shortlist'),
    /** Set for live-show votes so each show has its own one-vote-per-email window. */
    showId: text('show_id').references(() => shows.id, { onDelete: 'cascade' }),

    /**
     * emailRaw    - as typed, for sending the verification mail and for support
     * emailCanonical - NFKC-normalized, lowercased, provider-canonicalized for
     *                  known providers only. Dots are NOT stripped for arbitrary
     *                  domains: j.smith@company.com and jsmith@company.com are
     *                  usually different people, and over-normalizing
     *                  disenfranchises real voters.
     */
    emailRaw: text('email_raw').notNull(),
    emailCanonical: text('email_canonical').notNull(),

    verified: boolean('verified').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    /**
     * SHA-256 of the verification token. Never store the plaintext: database
     * read access would otherwise let an attacker verify votes at will.
     * Single-use, short expiry.
     */
    verificationTokenHash: text('verification_token_hash'),
    verificationExpiresAt: timestamp('verification_expires_at', { withTimezone: true }),

    /** SHA-256 with a server-side pepper. Raw IP retention is a PIPEDA problem. */
    ipHash: text('ip_hash'),
    /** Hashed network prefix (/24 IPv4 or /64 IPv6), used only as weak context. */
    ipPrefixHash: text('ip_prefix_hash'),
    userAgentHash: text('user_agent_hash'),
    /** First-party browser identifier, hashed with the server pepper. Signal only, never identity. */
    deviceHash: text('device_hash'),

    /** OTP brute-force guard. Reset whenever a new code is issued. */
    verificationAttempts: integer('verification_attempts').notNull().default(0),
    /** Last OTP issue time, used for an atomic resend cooldown. */
    verificationSentAt: timestamp('verification_sent_at', { withTimezone: true }),
    /** Number of resend requests for this pending vote; drives backoff. */
    verificationResendCount: integer('verification_resend_count').notNull().default(0),

    /** 0-100. Computed by src/lib/voting/fraud.ts on write. */
    fraudScore: integer('fraud_score').notNull().default(0),
    fraudSignals: text('fraud_signals'),

    /** Manual review preserves the original score/signals for auditability. */
    reviewDecision: text('review_decision').notNull().default('pending'),
    reviewNotes: text('review_notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),

    /** Set by an admin when a vote is invalidated. Excluded from tallies. */
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    invalidatedBy: text('invalidated_by').references(() => users.id, { onDelete: 'set null' }),
    invalidationReason: text('invalidation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * The hard floor for the public round: one canonical email, one vote.
     * Partial so the live-show round can use its own per-show constraint.
     */
    uniqueIndex('votes_public_round_email_idx')
      .on(table.emailCanonical, table.round)
      .where(sql`${table.round} = 'public_shortlist'`),

    /** One vote per email per live show. */
    uniqueIndex('votes_live_show_email_idx')
      .on(table.emailCanonical, table.showId)
      .where(sql`${table.round} = 'live_show' AND ${table.showId} IS NOT NULL`),

    index('votes_artist_id_idx').on(table.artistId),
    index('votes_verified_idx').on(table.verified),
    index('votes_created_at_idx').on(table.createdAt),
    index('votes_ip_hash_idx').on(table.ipHash),
    index('votes_ip_prefix_hash_idx').on(table.ipPrefixHash),
    index('votes_device_hash_idx').on(table.deviceHash),
    index('votes_fraud_score_idx').on(table.fraudScore),
  ],
);

/**
 * CASL consent records (§4.3).
 *
 * CASL puts the burden of proving consent on the sender, with penalties up to
 * $10M per violation for corporations and personal liability for directors.
 * That is why this table stores the EXACT WORDING shown at the time, not just a
 * boolean.
 *
 * Append-only: never update a row to record a withdrawal, insert a new one.
 * The history is the evidence.
 */
export const emailConsents = pgTable(
  'email_consents',
  {
    id: text('id').primaryKey(),

    emailRaw: text('email_raw').notNull(),
    emailCanonical: text('email_canonical').notNull(),

    consentType: consentTypeEnum('consent_type').notNull(),
    granted: boolean('granted').notNull(),

    /** The literal checkbox or notice text displayed. Required for CASL defence. */
    wordingShown: text('wording_shown').notNull(),
    /** Version of the policy/rules text in force when consent was given. */
    documentVersion: text('document_version'),

    /** Where the consent was collected: 'vote', 'application', 'subscribe'. */
    source: text('source').notNull(),

    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('email_consents_canonical_idx').on(table.emailCanonical),
    index('email_consents_type_idx').on(table.consentType),
    index('email_consents_created_at_idx').on(table.createdAt),
  ],
);

/** Coming-soon email capture (§12.1). Consent recorded in email_consents. */
export const subscribers = pgTable(
  'subscribers',
  {
    id: text('id').primaryKey(),
    emailRaw: text('email_raw').notNull(),
    emailCanonical: text('email_canonical').notNull(),

    confirmed: boolean('confirmed').notNull().default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmationTokenHash: text('confirmation_token_hash'),
    confirmationExpiresAt: timestamp('confirmation_expires_at', { withTimezone: true }),

    /** Unsubscribe must work end to end and be honoured within 10 business days. */
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    unsubscribeTokenHash: text('unsubscribe_token_hash'),

    source: text('source').notNull().default('coming_soon'),
    ipHash: text('ip_hash'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subscribers_email_canonical_idx').on(table.emailCanonical),
    index('subscribers_confirmed_idx').on(table.confirmed),
  ],
);

/**
 * Postgres-backed rate limiter state.
 *
 * Updated by an atomic INSERT ... ON CONFLICT DO UPDATE ... RETURNING.
 * Read-then-write under concurrency is not a rate limiter.
 *
 * Keyed on multiple dimensions (IP, canonical email, target artist) because any
 * single key is trivially rotated.
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    /** Composite: "{scope}:{dimension}:{value}", e.g. "vote:ip:<hash>". */
    key: text('key').primaryKey(),
    count: integer('count').notNull().default(0),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // Keep an explicitly named unique index in addition to the primary key.
    // Some early environments were created before `key` became the primary
    // key; ON CONFLICT needs a unique arbiter in those databases as well.
    uniqueIndex('rate_limits_key_unique_idx').on(table.key),
    index('rate_limits_expires_at_idx').on(table.expiresAt),
  ],
);
