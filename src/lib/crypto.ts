import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

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

/**
 * Hashes a coarse network prefix. This is deliberately weaker context than a
 * full IP: shared homes, offices, and carrier NAT must not be treated as one
 * person. IPv4 uses /24 and IPv6 uses /64.
 */
export function hashIpPrefix(ip: string): string {
  const normalized = ip
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  const address = normalized.split('%', 1)[0]!;
  let prefix = address;
  if (isIP(address) === 4) {
    prefix = address.split('.').slice(0, 3).join('.');
  } else if (isIP(address) === 6) {
    const mappedIpv4 = address.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedIpv4 && isIP(mappedIpv4) === 4) {
      prefix = `mapped-v4:${mappedIpv4.split('.').slice(0, 3).join('.')}`;
      return createHash('sha256').update(`${getPepper()}:prefix:${prefix}`).digest('hex');
    }
    // Expand compressed IPv6 (and IPv4-mapped IPv6) before taking /64 so
    // equivalent spellings cannot evade the same network correlation bucket.
    const groups = address.includes('::')
      ? (() => {
          const [left, right] = address.split('::');
          const leftGroups = left ? left.split(':') : [];
          const rightGroups = right ? right.split(':') : [];
          return [
            ...leftGroups,
            ...Array(8 - leftGroups.length - rightGroups.length).fill('0'),
            ...rightGroups,
          ];
        })()
      : address.split(':');
    const expanded = groups.map((group) => group.padStart(4, '0'));
    if (expanded.slice(0, 5).every((group) => group === '0000') && expanded[5] === 'ffff') {
      const octets = [
        Number.parseInt(expanded[6]!.slice(0, 2), 16),
        Number.parseInt(expanded[6]!.slice(2), 16),
        Number.parseInt(expanded[7]!.slice(0, 2), 16),
        Number.parseInt(expanded[7]!.slice(2), 16),
      ];
      prefix = `mapped-v4:${octets.slice(0, 3).join('.')}`;
      return createHash('sha256').update(`${getPepper()}:prefix:${prefix}`).digest('hex');
    }
    prefix = expanded.slice(0, 4).join(':');
  }
  return createHash('sha256').update(`${getPepper()}:prefix:${prefix}`).digest('hex');
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

/**
 * Hashes a low-entropy one-time code with a server secret.
 * Plain SHA-256 is insufficient for a six-digit OTP: a database reader could
 * try all one million values offline. HMAC makes the environment secret part
 * of verification, so database access alone is not enough to recover a code.
 */
export function hashVerificationCode(voteId: string, code: string): string {
  const secret = process.env.VOTE_OTP_PEPPER || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('VOTE_OTP_PEPPER or BETTER_AUTH_SECRET is not set');
  return createHmac('sha256', secret).update(`${voteId}:${code}`).digest('hex');
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
