import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

/**
 * Better Auth's catch-all HTTP surface.
 *
 * This exposes the plugin endpoints under /api/auth, including magic-link
 * request/verification, session reads, and TOTP setup/verification. Security
 * rules remain in the Better Auth configuration and server-side role guards.
 */
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
