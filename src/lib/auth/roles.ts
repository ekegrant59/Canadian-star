/**
 * Role definitions and hierarchy.
 *
 * Deliberately free of server imports so it can be used from client components
 * for display decisions. Display decisions only: authorization always happens
 * server-side at the data access point.
 */

export const ROLES = ['artist', 'judge', 'industry_reviewer', 'admin'] as const;

export type Role = (typeof ROLES)[number];

/**
 * Roles that satisfy a given requirement. Admin satisfies everything; the other
 * roles are peers, not a ladder, because a judge is not a superset of an artist.
 */
const ROLE_SATISFIES: Record<Role, readonly Role[]> = {
  artist: ['artist', 'admin'],
  judge: ['judge', 'admin'],
  industry_reviewer: ['industry_reviewer', 'admin'],
  admin: ['admin'],
};

export function roleSatisfies(userRole: Role, required: Role): boolean {
  return ROLE_SATISFIES[required].includes(userRole);
}

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  artist: '/artist',
  judge: '/judge',
  industry_reviewer: '/review',
  admin: '/admin',
};

/**
 * Roles that may never self-register. §11 makes vote and score integrity a
 * named accountability, so privileged accounts are created by an admin or
 * seeded from the environment allowlist, never by signing up.
 */
export const ALLOWLIST_ONLY_ROLES: readonly Role[] = ['judge', 'industry_reviewer', 'admin'];

export function requiresAllowlist(role: Role): boolean {
  return ALLOWLIST_ONLY_ROLES.includes(role);
}

/** Roles that must have TOTP 2FA enabled. Admins can alter tallies and scores. */
export const REQUIRES_TWO_FACTOR: readonly Role[] = ['admin'];

export function requiresTwoFactor(role: Role): boolean {
  return REQUIRES_TWO_FACTOR.includes(role);
}
