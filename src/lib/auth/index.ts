import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { canonicalizeEmail } from '@/lib/email-normalize';
import { hashIp } from '@/lib/crypto';
import type { Role } from './roles';

/**
 * Better Auth configuration.
 *
 * Chosen over Auth.js because Auth.js v5 remains 5.0.0-beta.x in maintenance
 * mode, its maintainers point new projects elsewhere, and its July 2026
 * advisory batch included an email validation bypass via Unicode homoglyphs of
 * `@` — the exact attack class that breaks an email-identity voting system.
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

export const ADMIN_ALLOWLIST = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST);
export const JUDGE_ALLOWLIST = parseAllowlist(process.env.JUDGE_EMAIL_ALLOWLIST);
export const REVIEWER_ALLOWLIST = parseAllowlist(process.env.REVIEWER_EMAIL_ALLOWLIST);

/**
 * Resolves the role for an email at sign-in.
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
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

  // No password auth anywhere. Magic link only, which also satisfies WCAG 2.2
  // 3.3.8 Accessible Authentication without a cognitive-test CAPTCHA.
  emailAndPassword: { enabled: false },

  session: {
    // Database sessions: revocation is immediate.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
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
      emailRaw: { type: 'string', required: false, input: false },
      emailCanonical: { type: 'string', required: false, input: false },
      twoFactorEnabled: { type: 'boolean', defaultValue: false, input: false },
      bannedAt: { type: 'date', required: false, input: false },
    },
  },

  plugins: [
    magicLink({
      // 15 minute expiry, single use, invalidated on use. Better Auth stores
      // the token hashed.
      expiresIn: 60 * 15,
      disableSignUp: false,
      async sendMagicLink({ email, url }) {
        // Phase 3 wires Resend. Until then, log in development only so a
        // developer can sign in without an email provider configured.
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[magic-link] ${email} -> ${url}`);
          return;
        }
        throw new Error('Email provider not configured. Wire Resend in Phase 3.');
      },
    }),

    // TOTP. Mandatory for admin accounts, enforced in requireRole.
    twoFactor({
      issuer: 'Canadian Country Star',
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        /**
         * Sets the canonical email and the allowlist-derived role. Runs
         * server-side on every user creation, so a crafted sign-up body cannot
         * grant itself a privileged role.
         */
        before: async (user) => {
          const canonical = canonicalizeEmail(user.email);
          return {
            data: {
              ...user,
              emailRaw: user.email,
              emailCanonical: canonical ?? user.email.toLowerCase(),
              role: resolveRoleForEmail(user.email),
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
              ipHash: rawIp ? hashIp(rawIp) : null,
              ipAddress: undefined,
            },
          };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
