import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { adminAccessLevelEnum, userRoleEnum } from './enums';

/**
 * Users. Better Auth owns the core columns; `role`, `emailCanonical`, and the
 * 2FA columns are ours.
 *
 * Two email columns by design:
 *   emailRaw       - as typed, used for sending mail and for support
 *   emailCanonical - NFKC-normalized and provider-canonicalized, used for the
 *                    uniqueness check
 *
 * The unique index lives on emailCanonical, not application logic: a
 * check-then-insert race is how duplicate identities get created under load.
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),

    /** Better Auth writes this. Kept in sync with emailRaw. */
    email: text('email').notNull(),
    emailRaw: text('email_raw').notNull(),
    emailCanonical: text('email_canonical').notNull(),

    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name'),
    image: text('image'),

    role: userRoleEnum('role').notNull().default('artist'),

    /** Applies when role=admin. Legacy admins default to full control. */
    adminAccessLevel: adminAccessLevelEnum('admin_access_level').notNull().default('super'),
    adminInvitationTokenHash: text('admin_invitation_token_hash'),
    adminInvitationExpiresAt: timestamp('admin_invitation_expires_at', { withTimezone: true }),
    adminInvitedAt: timestamp('admin_invited_at', { withTimezone: true }),
    adminPasswordSetAt: timestamp('admin_password_set_at', { withTimezone: true }),

    /** TOTP 2FA is mandatory for admin accounts (enforced in the auth layer). */
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),

    /** Set when an admin suspends an account. Checked on every session read. */
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    banReason: text('ban_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_canonical_idx').on(table.emailCanonical),
    uniqueIndex('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ],
);

/**
 * Database-backed sessions so an admin can revoke access immediately. This is
 * the reason we do not use a stateless JWT strategy: revocation matters more
 * than saving a query on accounts that can alter vote tallies.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    /** Hashed before storage. Never keep a raw IP (PIPEDA). */
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_idx').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

/** OAuth/credential accounts. Present for Better Auth compatibility. */
export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    uniqueIndex('accounts_provider_account_idx').on(table.providerId, table.accountId),
  ],
);

/** Better Auth verification and password-reset tokens. */
export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('verifications_identifier_idx').on(table.identifier),
    index('verifications_expires_at_idx').on(table.expiresAt),
  ],
);

/** TOTP secrets and backup codes for the Better Auth 2FA plugin. */
export const twoFactors = pgTable(
  'two_factors',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    verified: boolean('verified').notNull().default(false),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
  },
  (table) => [index('two_factors_user_id_idx').on(table.userId)],
);
