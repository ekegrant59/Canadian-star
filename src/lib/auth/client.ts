'use client';

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

/**
 * Browser-side auth client.
 *
 * Pointedly does NOT import from './index'. That module is `server-only` and
 * holds the secret, the database handle, and the allowlists. This one talks to
 * /api/auth over HTTP like any other client.
 *
 * baseURL stays unset so requests hit the current origin. Hardcode
 * NEXT_PUBLIC_APP_URL and you break preview deployments and force a rebuild on
 * every domain change, gaining nothing: the API is same-origin already.
 */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/**
 * Maps a Better Auth error code to copy we are willing to show.
 *
 * Sign-in responses must never reveal whether an account exists (§1.5), so a
 * wrong password and an unknown email produce the SAME message. Better Auth
 * already returns INVALID_EMAIL_OR_PASSWORD for both. This keeps that true if
 * the underlying codes ever drift apart.
 */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'USER_NOT_FOUND':
      return 'That email or password is not correct.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with that email already exists. Try signing in instead.';
    case 'PASSWORD_TOO_SHORT':
      return 'Please choose a longer password.';
    case 'PASSWORD_TOO_LONG':
      return 'Please choose a shorter password.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email address before signing in.';
    default:
      return fallback;
  }
}
