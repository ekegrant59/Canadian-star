import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Hashing and token helpers.
 *
 * Two rules this module exists to enforce:
 *
 *  1. Raw IP addresses are never stored. They are personal information under
 *     PIPEDA and there is no reason to keep them in plaintext when the only use
 *     is correlation.
 *  2. Verification tokens are never stored in plaintext. Database read access
 *     must not be enough to verify a vote or take over an account.
 */

function getPepper(): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) {
    throw new Error('IP_HASH_PEPPER is not set');
  }
  return pepper;
}

/**
 * Hashes an IP address with a server-side pepper.
 *
 * The pepper is what makes this more than a lookup table: the IPv4 space is
 * small enough to brute-force a bare SHA-256 in seconds. Changing the pepper
 * invalidates existing correlation, so set it once and keep it.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${getPepper()}:${ip}`).digest('hex');
}

/** Hashes a user agent for fraud correlation. Same reasoning as hashIp. */
export function hashUserAgent(userAgent: string): string {
  return createHash('sha256').update(`${getPepper()}:${userAgent}`).digest('hex');
}

/**
 * Hashes a token for storage. No pepper: the token is high-entropy already, and
 * lookup requires hashing the presented value the same way.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generates a URL-safe token. 32 bytes is 256 bits of entropy. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Constant-time string comparison for secrets (cron token, webhook signatures).
 *
 * A plain `===` leaks length and content through timing. Always use this for
 * anything an attacker can submit repeatedly.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // timingSafeEqual throws on length mismatch, which itself leaks length.
  // Hash both first so the compared buffers are always 32 bytes.
  const hashA = createHash('sha256').update(bufA).digest();
  const hashB = createHash('sha256').update(bufB).digest();

  return timingSafeEqual(hashA, hashB);
}

/**
 * Extracts the client IP from proxy headers.
 *
 * Behind Coolify's reverse proxy, `x-forwarded-for` is trustworthy ONLY because
 * the proxy sets it. On a direct connection a client can send anything, which
 * would let an attacker rotate the rate-limit key at will. The proxy must be
 * configured to overwrite this header rather than append to it.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Leftmost entry is the original client when the proxy overwrites.
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  return headers.get('x-real-ip')?.trim() ?? 'unknown';
}
