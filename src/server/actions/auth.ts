'use server';

import { headers } from 'next/headers';
import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { auth, resolveRoleForEmail } from '@/lib/auth';
import { db } from '@/db';
import { users, verifications } from '@/db/schema';
import { ROLE_HOME, type Role } from '@/lib/auth/roles';
import { normalizeEmail } from '@/lib/email-normalize';
import { hashIp, hashToken, getClientIp, hashVerificationCode, safeCompare } from '@/lib/crypto';
import { checkRateLimit, type RateLimitResult, type RateLimitScope } from '@/lib/rate-limit';
import { signUpSchema, signInSchema, SIGNUP_CONSENT_WORDING } from '@/lib/validation/auth';
import { recordConsents } from '@/server/consent';
import { actionOk, actionError, type ActionResult } from './types';
import { renderCustomBroadcastEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

/**
 * Authentication actions.
 *
 * A Server Action is a public HTTP endpoint. Next 16 encrypts action ids and
 * strips unused ones from the bundle, but neither is an authorization control.
 * Anyone who can reach the app can invoke any action that ships.
 *
 * These three have to stay unauthenticated, since they're how you authenticate.
 * That means everything else has to be tight:
 *   - rate limited on IP and canonical email, before any work happens
 *   - identical responses whether or not an account exists
 *   - no raw Zod issues, no database errors handed back to the caller
 */

type SignUpSuccess = { redirectTo: string };
type PendingSignup = { email: string; fullName: string; password: string; redirectTo?: string };
type SignupRequestOptions = { resend?: boolean };

const AUTH_UNAVAILABLE =
  'Account access is temporarily unavailable. Please try again in a few minutes.';
const VERIFICATION_EMAIL_FAILED =
  'We could not send your verification email right now. Please try again in a few minutes.';
const ACCOUNT_CREATION_FAILED =
  'We could not finish creating your account. Please try again, or request a new verification code if this one has expired.';
const ACCOUNT_CREATED_SIGN_IN_FAILED =
  'Your account may have been created, but we could not sign you in. Try logging in with your email and password.';
const SIGN_IN_UNAVAILABLE =
  'We could not sign you in right now. Please try again in a few minutes.';

function betterAuthErrorCode(error: unknown): string | null {
  if (!(error instanceof APIError)) return null;
  const body = error.body as { code?: unknown } | undefined;
  return typeof body?.code === 'string' ? body.code : null;
}

/** Admin login throttling is enabled unless explicitly disabled at runtime. */
const ADMIN_RATE_LIMITS_ENABLED = process.env.ADMIN_RATE_LIMITS_ENABLED !== 'false';

async function consumeAuthRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<RateLimitResult | null> {
  try {
    return await checkRateLimit(scope, identifier);
  } catch (error) {
    // A missing migration or a brief database outage should produce a form
    // error, not an uncaught Server Action exception and a Next.js error page.
    console.error(`[auth] ${scope} rate limit failed`, error);
    return null;
  }
}

/**
 * Where to send someone after they sign in.
 *
 * Only a same-origin absolute PATH gets through. Pass a query-string
 * `redirect` straight along and you have an open redirect: on a site people
 * trust, `/login?redirect=https://evil.example` makes a convincing phishing
 * hop. Anything that isn't a plain path falls back to the role's home.
 */
function safeRedirect(requested: string | undefined, role: Role): string {
  const fallback = ROLE_HOME[role];
  if (!requested) return fallback;

  // Must start with a single slash. `//host` is protocol-relative and leaves
  // the origin; `/\host` is treated as protocol-relative by some browsers.
  if (!requested.startsWith('/')) return fallback;
  if (requested.startsWith('//') || requested.startsWith('/\\')) return fallback;

  return requested;
}

/**
 * Creates an artist account.
 *
 * The role never comes from input. Privileged allowlist addresses are rejected
 * here and by Better Auth's shared user-creation hook, so those accounts can
 * only be provisioned through the controlled seed/admin path.
 */
export async function signUpAction(
  input: unknown,
  redirectTo?: string,
  options?: SignupRequestOptions,
): Promise<ActionResult<{ requiresEmailVerification: true; email: string }>> {
  const requestHeaders = await headers();
  const ipHash = hashIp(getClientIp(requestHeaders));
  const isResend = options?.resend === true;
  const ipScope = isResend ? 'signup:resend:ip' : 'signup:ip';

  // Rate limit BEFORE validating. Validation is work done for an anonymous
  // caller, and running it first turns this into a cheap way to probe the
  // schema.
  const ipLimit = await consumeAuthRateLimit(ipScope, ipHash);
  if (!ipLimit) return actionError(AUTH_UNAVAILABLE);
  if (!ipLimit.allowed) {
    return actionError('Too many attempts. Please wait a few minutes and try again.');
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Please check the highlighted fields.');
  }

  const { email } = parsed.data;

  const normalized = normalizeEmail(email);
  if (!normalized.ok) {
    return actionError('Enter a valid email address.');
  }

  if (resolveRoleForEmail(normalized.canonical) !== 'artist') {
    return actionError('This account must be created by an administrator.');
  }

  const emailScope = isResend ? 'signup:resend:email' : 'signup:email';
  const emailLimit = await consumeAuthRateLimit(emailScope, hashToken(normalized.canonical));
  if (!emailLimit) return actionError(AUTH_UNAVAILABLE);
  if (!emailLimit.allowed) {
    return actionError('Too many attempts. Please wait a few minutes and try again.');
  }

  try {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const identifier = `signup:${normalized.canonical}`;
    await db.delete(verifications).where(eq(verifications.identifier, identifier));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const payloadHash = hashVerificationCode(
      `${identifier}:payload`,
      JSON.stringify({
        fullName: parsed.data.fullName,
        password: parsed.data.password,
        redirectTo,
      }),
    );
    await db.insert(verifications).values({
      id: randomUUID(),
      identifier,
      value: JSON.stringify({
        hash: hashVerificationCode(identifier, code),
        payloadHash,
        attempts: 0,
      }),
      expiresAt,
    });
    const rendered = renderCustomBroadcastEmail({
      headline: 'Verify your email address',
      bodyHtml: `<p>Enter this code to finish creating your Canadian Country Star artist account:</p><p style="font-size: 30px; font-weight: 700; letter-spacing: 8px; text-align: center;">${code}</p><p>This code expires in 10 minutes and can only be used once.</p>`,
      ctaText: 'RETURN TO SIGN UP',
      ctaUrl: '/signup',
    });
    const emailResult = await sendEmail({
      to: normalized.raw,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (!emailResult.success)
      return actionError('We could not send the verification code. Please try again.');
    return actionOk({ requiresEmailVerification: true, email: normalized.raw });
  } catch (error) {
    console.error('[signup] verification email failed', error);
    return actionError(VERIFICATION_EMAIL_FAILED);
  }
}

export async function verifySignupEmailAction(
  input: PendingSignup & { code: string },
): Promise<ActionResult<SignUpSuccess>> {
  const requestHeaders = await headers();
  const normalized = normalizeEmail(input.email);
  if (!normalized.ok || !/^\d{6}$/.test(input.code))
    return actionError('Enter the six-digit verification code.');
  const ipHash = hashIp(getClientIp(requestHeaders));
  const ipLimit = await consumeAuthRateLimit('signup:verify:ip', ipHash);
  const emailLimit = await consumeAuthRateLimit(
    'signup:verify:email',
    hashToken(normalized.canonical),
  );
  if (!ipLimit || !emailLimit) return actionError(AUTH_UNAVAILABLE);
  if (!ipLimit.allowed || !emailLimit.allowed)
    return actionError('Too many verification attempts. Please try again later.');
  const parsed = signUpSchema.safeParse({
    fullName: input.fullName,
    email: normalized.raw,
    password: input.password,
    confirmPassword: input.password,
    confirmedAge: true,
    acceptedTerms: true,
  });
  if (!parsed.success)
    return actionError('Your sign-up details are no longer valid. Please start again.');
  const identifier = `signup:${normalized.canonical}`;
  const [pending] = await db
    .select()
    .from(verifications)
    .where(eq(verifications.identifier, identifier))
    .limit(1);
  if (!pending || pending.expiresAt <= new Date())
    return actionError('That verification code has expired. Request a new one.');
  let stored: { hash: string; payloadHash: string; attempts: number };
  try {
    stored = JSON.parse(pending.value) as { hash: string; payloadHash: string; attempts: number };
  } catch {
    return actionError('That verification code is no longer valid.');
  }
  if (stored.attempts >= 5) return actionError('Too many incorrect attempts. Request a new code.');
  const payloadHash = hashVerificationCode(
    `${identifier}:payload`,
    JSON.stringify({
      fullName: parsed.data.fullName,
      password: parsed.data.password,
      redirectTo: input.redirectTo,
    }),
  );
  if (!safeCompare(stored.payloadHash, payloadHash))
    return actionError('Your sign-up details changed. Request a new verification code.');
  if (!safeCompare(stored.hash, hashVerificationCode(identifier, input.code))) {
    await db
      .update(verifications)
      .set({
        value: JSON.stringify({ ...stored, attempts: stored.attempts + 1 }),
        updatedAt: new Date(),
      })
      .where(eq(verifications.id, pending.id));
    return actionError('That verification code is not valid.');
  }
  try {
    const result = await auth.api.signUpEmail({
      body: { email: normalized.raw, password: parsed.data.password, name: parsed.data.fullName },
      headers: requestHeaders,
      asResponse: false,
      returnHeaders: false,
    });
    if (result?.user?.id)
      await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, result.user.id));
    await db.delete(verifications).where(eq(verifications.id, pending.id));
    try {
      await recordConsents(
        [
          {
            email: normalized.raw,
            consentType: 'privacy_policy',
            granted: true,
            wordingShown: SIGNUP_CONSENT_WORDING.terms,
            source: 'signup',
          },
          {
            email: normalized.raw,
            consentType: 'application',
            granted: true,
            wordingShown: SIGNUP_CONSENT_WORDING.age,
            source: 'signup',
          },
        ],
        requestHeaders,
      );
    } catch (consentError) {
      console.error('[signup] consent record failed', consentError);
    }
    const role = (result?.user as { role?: Role } | undefined)?.role ?? 'artist';
    return actionOk({ redirectTo: safeRedirect(input.redirectTo, role) });
  } catch (error) {
    const code = betterAuthErrorCode(error);
    if (code === 'USER_ALREADY_EXISTS' || code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')
      return actionError('An account with that email already exists. Try signing in instead.');
    if (code === 'FAILED_TO_CREATE_SESSION') return actionError(ACCOUNT_CREATED_SIGN_IN_FAILED);
    if (code === 'FAILED_TO_CREATE_USER') return actionError(ACCOUNT_CREATION_FAILED);
    console.error('[signup] account creation failed after email verification', error);
    return actionError(ACCOUNT_CREATION_FAILED);
  }
}

/**
 * Signs in with email and password.
 *
 * The response reads IDENTICAL whether the email is unknown or the password
 * is wrong. Split them apart and this becomes an account enumeration oracle.
 * For a competition with named judges and artists, that's a live privacy
 * problem, not a theoretical one.
 */
async function signInForPortal(
  input: unknown,
  redirectTo?: string,
  portal: 'public' | 'admin' = 'public',
): Promise<ActionResult<SignUpSuccess>> {
  const requestHeaders = await headers();
  const ipHash = hashIp(getClientIp(requestHeaders));

  if (portal === 'public' || ADMIN_RATE_LIMITS_ENABLED) {
    const ipLimit = await consumeAuthRateLimit('signin:ip', ipHash);
    if (!ipLimit) return actionError(AUTH_UNAVAILABLE);
    if (!ipLimit.allowed) {
      return actionError('Too many sign-in attempts. Please wait a few minutes and try again.');
    }
  }

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('That email or password is not correct.');
  }

  const normalized = normalizeEmail(parsed.data.email);
  if (!normalized.ok) {
    return actionError('That email or password is not correct.');
  }

  const [accountIdentity] = await db
    .select({
      role: users.role,
      bannedAt: users.bannedAt,
      adminPasswordSetAt: users.adminPasswordSetAt,
    })
    .from(users)
    .where(eq(users.emailCanonical, normalized.canonical))
    .limit(1);
  const accountRole = accountIdentity?.role ?? resolveRoleForEmail(normalized.canonical);
  if (portal === 'public' && accountRole !== 'artist') {
    return actionError('That email or password is not correct.');
  }
  if (portal === 'admin' && accountRole !== 'admin') {
    return actionError('That email or password is not correct.');
  }
  if (portal === 'admin' && (accountIdentity?.bannedAt || !accountIdentity?.adminPasswordSetAt)) {
    return actionError('That email or password is not correct.');
  }

  if (portal === 'public' || ADMIN_RATE_LIMITS_ENABLED) {
    const emailLimit = await consumeAuthRateLimit('signin:email', hashToken(normalized.canonical));
    if (!emailLimit) return actionError(AUTH_UNAVAILABLE);
    if (!emailLimit.allowed) {
      // Same message as the IP limit. Say THIS email is throttled and you've
      // confirmed the address is worth attacking.
      return actionError('Too many sign-in attempts. Please wait a few minutes and try again.');
    }
  }

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: normalized.raw,
        password: parsed.data.password,
      },
      headers: requestHeaders,
    });

    const twoFactorRedirect = (result as { twoFactorRedirect?: boolean } | undefined)
      ?.twoFactorRedirect;
    const role = twoFactorRedirect
      ? ('admin' as const)
      : ((result?.user as { role?: Role } | undefined)?.role ?? 'artist');
    if (twoFactorRedirect) {
      return actionOk({ redirectTo: '/admin/login/verify-2fa' });
    }
    return actionOk({ redirectTo: safeRedirect(redirectTo, role) });
  } catch (error) {
    if (error instanceof APIError) {
      return actionError('That email or password is not correct.');
    }
    console.error('[signin] failed', error);
    return actionError(SIGN_IN_UNAVAILABLE);
  }
}

/** Public artist login. Privileged accounts must use the admin portal. */
export async function signInAction(input: unknown, redirectTo?: string) {
  return signInForPortal(input, redirectTo, 'public');
}

/** Restricted admin login entry point. */
export async function adminSignInAction(input: unknown) {
  return signInForPortal(input, undefined, 'admin');
}

/** Ends the session. Database-backed, so revocation is immediate. */
export async function signOutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    console.error('[signout] failed', error);
  }
  return actionOk();
}
