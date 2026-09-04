import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimits } from '@/db/schema';

/**
 * Postgres-backed fixed-window rate limiter.
 *
 * The write is a single atomic INSERT ... ON CONFLICT DO UPDATE ... RETURNING.
 * Read-then-write is NOT a rate limiter: under concurrency every request reads
 * the same count and every one of them is allowed through.
 *
 * No Redis dependency by design. Add one only if measured load demands it.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the window resets. Send as Retry-After on a 429. */
  retryAfter: number;
};

export type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

/**
 * Limits for each protected surface.
 *
 * Every unauthenticated endpoint gets one: vote, apply, contact, subscribe,
 * sign-in, signup, signup resend, and signup code verification.
 */
export const RATE_LIMITS = {
  // Network limits are intentionally broad because homes, offices, venues,
  // campuses, and mobile carrier NAT commonly share one public IP.
  'vote:ip': { limit: 20, windowSeconds: 3600 },
  'vote:ip:daily': { limit: 80, windowSeconds: 86_400 },
  'vote:email': { limit: 3, windowSeconds: 3600 },
  'vote:device': { limit: 8, windowSeconds: 3600 },
  'vote:artist': { limit: 300, windowSeconds: 3600 },
  'vote:verify:ip': { limit: 30, windowSeconds: 3600 },
  'vote:verify:email': { limit: 10, windowSeconds: 3600 },
  'signin:ip': { limit: 10, windowSeconds: 3600 },
  'signin:email': { limit: 5, windowSeconds: 3600 },
  // Signup has its own buckets so login failures from a shared network or
  // an existing account cannot block a new artist from registering.
  // Mobile carriers, campuses, and offices can put many legitimate artists
  // behind one address. The per-email bucket remains the tighter control.
  'signup:ip': { limit: 20, windowSeconds: 3600 },
  'signup:email': { limit: 3, windowSeconds: 3600 },
  'signup:resend:ip': { limit: 3, windowSeconds: 3600 },
  'signup:resend:email': { limit: 3, windowSeconds: 3600 },
  'signup:verify:ip': { limit: 10, windowSeconds: 3600 },
  'signup:verify:email': { limit: 10, windowSeconds: 3600 },
  'verify:resend': { limit: 3, windowSeconds: 3600 },
  'subscribe:ip': { limit: 5, windowSeconds: 3600 },
  'contact:ip': { limit: 3, windowSeconds: 3600 },
  'apply:ip': { limit: 20, windowSeconds: 3600 },
  'upload:user': { limit: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitScope = keyof typeof RATE_LIMITS;

/**
 * Consumes one unit against `scope:identifier`.
 *
 * `identifier` should already be hashed when it is an IP or an email, so the
 * limiter table never holds personal data in plaintext.
 */
export async function checkRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[scope];
  const key = `${scope}:${identifier}`;

  /**
   * Atomic upsert. On conflict:
   *   - window still open  -> increment count, keep window
   *   - window expired     -> reset count to 1 and start a new window
   *
   * Both branches happen inside the single statement, so concurrent callers
   * serialize on the row lock rather than racing.
   */
  const rows = await db.execute<{ count: number; expires_at: Date }>(sql`
      INSERT INTO ${rateLimits} (key, count, window_start, expires_at)
      VALUES (
        ${key},
        1,
        NOW(),
        NOW() + (${rule.windowSeconds} * INTERVAL '1 second')
      )
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN ${rateLimits.expiresAt} <= NOW() THEN 1
          ELSE ${rateLimits.count} + 1
        END,
        window_start = CASE
          WHEN ${rateLimits.expiresAt} <= NOW() THEN NOW()
          ELSE ${rateLimits.windowStart}
        END,
        expires_at = CASE
          WHEN ${rateLimits.expiresAt} <= NOW()
            THEN NOW() + (${rule.windowSeconds} * INTERVAL '1 second')
          ELSE ${rateLimits.expiresAt}
        END
      RETURNING count, expires_at
    `);

  const row = rows.rows[0];
  if (!row) {
    // Should be unreachable: the statement always returns a row. Fail closed.
    return { allowed: false, remaining: 0, limit: rule.limit, retryAfter: rule.windowSeconds };
  }

  const count = Number(row.count);
  const expiresAt = new Date(row.expires_at);
  const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    limit: rule.limit,
    retryAfter,
  };
}

/**
 * Checks several keys at once and fails on the first exceeded limit.
 *
 * Limiting on one dimension is not enough: an IP is rotated with a proxy pool
 * and an email with a new alias, so vote submission checks IP, canonical email,
 * and target artist together.
 */
export async function checkRateLimits(
  checks: Array<{ scope: RateLimitScope; identifier: string }>,
): Promise<RateLimitResult> {
  let worst: RateLimitResult | null = null;

  for (const check of checks) {
    const result = await checkRateLimit(check.scope, check.identifier);
    if (!result.allowed) return result;
    if (!worst || result.remaining < worst.remaining) worst = result;
  }

  return worst ?? { allowed: true, remaining: 0, limit: 0, retryAfter: 0 };
}

/** Deletes expired rows. Called by the cron route. */
export async function pruneRateLimits(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM ${rateLimits} WHERE ${rateLimits.expiresAt} <= NOW()
  `);
  return result.rowCount ?? 0;
}
