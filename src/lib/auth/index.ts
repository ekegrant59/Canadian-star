import 'server-only';

import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { SITE_URL } from '@/config/site-url';
import { canonicalizeEmail } from '@/lib/email-normalize';
import { hashIp } from '@/lib/crypto';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/validation/auth';
import { sendEmail } from '@/lib/email/send';
import { renderCustomBroadcastEmail } from '@/lib/email/templates';
import type { Role } from './roles';

/**
 * Better Auth configuration.
 *
 * Chosen over Auth.js because Auth.js v5 remains 5.0.0-beta.x in maintenance
 * mode, its maintainers point new projects elsewhere, and its July 2026
 * advisory batch included an email validation bypass via Unicode homoglyphs of
 * `@`, which is the exact attack class that breaks an email-identity voting
 * system.
 *
 * Sessions live in our Postgres so an admin can revoke immediately, which
 * matters for accounts that can alter vote tallies and scores.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Parses a comma-separated allowlist into canonical emails. */
function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  const entries = raw
    .split(',')
    .map((entry) => canonicalizeEmail(entry))
    .filter((entry): entry is string => entry !== null);
  return new Set(entries);
}

export const ADMIN_ALLOWLIST = parseAllowlist(
  [process.env.ADMIN_EMAIL_ALLOWLIST, process.env.ADMIN_SEED_EMAIL].filter(Boolean).join(','),
);
export const JUDGE_ALLOWLIST = parseAllowlist(process.env.JUDGE_EMAIL_ALLOWLIST);
export const REVIEWER_ALLOWLIST = parseAllowlist(process.env.REVIEWER_EMAIL_ALLOWLIST);

/**
 * Resolves whether an email belongs to a privileged provisioning allowlist.
 *
 * Privileged roles come ONLY from the environment allowlist. There is no path
 * by which a request body can influence this, which is the point: judge and
 * admin sign-in is allowlist-only, never open registration.
 */
export function resolveRoleForEmail(email: string): Role {
  const canonical = canonicalizeEmail(email);
  if (!canonical) return 'artist';

  if (ADMIN_ALLOWLIST.has(canonical)) return 'admin';
  if (JUDGE_ALLOWLIST.has(canonical)) return 'judge';
  if (REVIEWER_ALLOWLIST.has(canonical)) return 'industry_reviewer';
  return 'artist';
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
    },
  }),

  secret: requireEnv('BETTER_AUTH_SECRET'),

  /** Canonical origin for Better Auth callback and password-reset URLs. */
  baseURL: process.env.BETTER_AUTH_URL?.replace(/\/+$/, '') ?? SITE_URL,

  /**
   * Email and password for artist accounts.
   *
   * Password authentication is the active account sign-in method for now.
   */
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    requireEmailVerification: false,
    autoSignIn: true,
    async sendResetPassword({ user, url }) {
      const rendered = renderCustomBroadcastEmail({
        headline: 'Reset your password',
        bodyHtml: '<p>Use the secure link below to reset your password.</p>',
        ctaText: 'RESET PASSWORD',
        ctaUrl: url,
      });
      const result = await sendEmail({
        to: user.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (!result.success) throw new Error(result.error || 'Password reset email failed.');
    },
  },

  session: {
    // Database sessions: revocation is immediate.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
    // Better Auth calls this field `ipAddress`; our database stores only its
    // peppered hash in `sessions.ip_hash`. The mapping keeps the adapter schema
    // correct without retaining a raw IP address.
    fields: { ipAddress: 'ipHash' },
  },

  advanced: {
    cookiePrefix: 'canadian-star',
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  },

  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'artist', input: false },
      adminAccessLevel: { type: 'string', defaultValue: 'super', input: false },
      emailRaw: { type: 'string', required: false, input: false },
      emailCanonical: { type: 'string', required: false, input: false },
      twoFactorEnabled: { type: 'boolean', defaultValue: false, input: false },
      bannedAt: { type: 'date', required: false, input: false },
    },
  },

  plugins: [
    // Enrollment and verification are available in every environment. Admin
    // guards also enforce TOTP everywhere, including local and staging.
    twoFactor({
      issuer: 'Canadian Country Star',
    }),

    // Must be last. Server Actions call auth.api directly, and this bridge
    // copies Better Auth's Set-Cookie headers into Next's response cookie jar.
    // Without it a successful login redirects with no usable session.
    nextCookies(),
  ],

  databaseHooks: {
    user: {
      create: {
        /**
         * Sets the canonical email and rejects privileged addresses. Runs on
         * every Better Auth user-creation path, so direct API calls cannot
         * bypass the public signup action and claim an allowlisted identity.
         */
        before: async (user) => {
          const canonical = canonicalizeEmail(user.email);
          const role = resolveRoleForEmail(user.email);
          if (role !== 'artist') {
            throw new APIError('FORBIDDEN', {
              message: 'Privileged accounts must be provisioned by an administrator.',
            });
          }
          return {
            data: {
              ...user,
              emailRaw: user.email,
              emailCanonical: canonical ?? user.email.toLowerCase(),
              role,
            },
          };
        },
      },
    },
    session: {
      create: {
        /** Store a hashed IP, never the raw address (PIPEDA). */
        before: async (session) => {
          const rawIp = (session as { ipAddress?: string }).ipAddress;
          return {
            data: {
              ...session,
              // `session.fields.ipAddress = 'ipHash'` maps this logical field
              // to the schema's `ipHash` property before the Drizzle insert.
              ipAddress: rawIp ? hashIp(rawIp) : null,
            },
          };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
