import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './index';
import {
  ROLE_HOME,
  roleSatisfies,
  requiresTwoFactor,
  adminCanManageAdmins,
  adminCanWrite,
  type AdminAccessLevel,
  type Role,
} from './roles';

/**
 * Authorization. THIS is the security boundary, not proxy.ts.
 *
 * CVE-2025-29927 was exactly the mistake of trusting middleware: a spoofed
 * x-middleware-subrequest header made Next skip middleware entirely, bypassing
 * every auth check that lived only there. Patched upstream, but the design
 * lesson stands, and a Server Action is a public HTTP endpoint regardless.
 *
 * Call requireRole() at the top of every protected page, Server Action, and
 * route handler. Authorize BEFORE validating input: validating first does work
 * on behalf of an anonymous caller and leaks schema shape.
 */

export type AuthedUser = {
  id: string;
  email: string;
  emailCanonical: string;
  name: string | null;
  role: Role;
  twoFactorEnabled: boolean;
  adminAccessLevel: AdminAccessLevel;
};

/**
 * Reads the current session.
 *
 * Wrapped in React `cache` so multiple guards in one render share a single
 * database round-trip. The cache is per-request, never across requests.
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
});

/** Returns the signed-in user, or null. Does not redirect. */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const user = session.user as unknown as {
    id: string;
    email: string;
    emailCanonical?: string;
    name?: string | null;
    role?: Role;
    adminAccessLevel?: AdminAccessLevel;
    twoFactorEnabled?: boolean;
    bannedAt?: Date | null;
  };

  // A suspended account has no access, even with a live session cookie.
  if (user.bannedAt) return null;

  return {
    id: user.id,
    email: user.email,
    emailCanonical: user.emailCanonical ?? user.email.toLowerCase(),
    name: user.name ?? null,
    role: user.role ?? 'artist',
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    adminAccessLevel: user.adminAccessLevel ?? 'super',
  };
}

/**
 * Requires a signed-in user. Redirects to sign-in when absent.
 *
 * Use in pages. In Server Actions prefer requireUserOrThrow so the caller gets
 * a result instead of a redirect.
 */
export async function requireAuth(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Requires a specific role.
 *
 * Admin accounts without TOTP enrolled are sent to set it up before they can
 * reach anything: admins can alter vote tallies and scores, so 2FA is not
 * optional.
 */
export async function requireRole(required: Role): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) redirect(required === 'admin' ? '/admin/login' : '/login');

  if (!roleSatisfies(user.role, required)) {
    // Keep protected dashboards on their role home. Next's experimental
    // forbidden() helper is intentionally avoided so this works without
    // enabling experimental.authInterrupts in every deployment.
    // An authenticated artist/judge/reviewer may still need to switch into a
    // separately provisioned admin account. Send them to the admin portal
    // login instead of trapping them on their current role dashboard.
    redirect(required === 'admin' ? '/admin/login' : ROLE_HOME[user.role]);
  }

  if (requiresTwoFactor(user.role) && !user.twoFactorEnabled) {
    redirect('/admin/login/setup-2fa');
  }

  return user;
}

/** Throwing variants for Server Actions, which should return a result. */
export class AuthorizationError extends Error {
  constructor(public readonly code: 'unauthenticated' | 'forbidden') {
    super(code);
    this.name = 'AuthorizationError';
  }
}

export async function requireAuthOrThrow(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('unauthenticated');
  return user;
}

export async function requireRoleOrThrow(required: Role): Promise<AuthedUser> {
  const user = await requireAuthOrThrow();
  if (!roleSatisfies(user.role, required)) {
    throw new AuthorizationError('forbidden');
  }
  if (requiresTwoFactor(user.role) && !user.twoFactorEnabled) {
    throw new AuthorizationError('forbidden');
  }
  return user;
}

export async function requireAdminWriteOrThrow(): Promise<AuthedUser> {
  const user = await requireRoleOrThrow('admin');
  if (!adminCanWrite(user.adminAccessLevel)) throw new AuthorizationError('forbidden');
  return user;
}

export async function requireSuperAdminOrThrow(): Promise<AuthedUser> {
  const user = await requireRoleOrThrow('admin');
  if (!adminCanManageAdmins(user.adminAccessLevel)) throw new AuthorizationError('forbidden');
  return user;
}
