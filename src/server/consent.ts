import 'server-only';

import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { emailConsents } from '@/db/schema';
import { normalizeEmail } from '@/lib/email-normalize';
import { hashIp, hashUserAgent, getClientIp } from '@/lib/crypto';
import { CONSENT_VERSION } from '@/lib/validation/auth';

/**
 * CASL consent records.
 *
 * CASL puts the burden of proving consent on the SENDER. Penalties reach $10M
 * per violation for corporations, and directors and officers are personally
 * liable. A boolean column reading `true` proves nothing, because it can't show
 * what the person saw when they ticked the box.
 *
 * Every record therefore stores the EXACT WORDING displayed, the document
 * version, the timestamp, and a hashed IP.
 *
 * APPEND-ONLY. A withdrawal is a new row with granted=false, never an edit to
 * the original. History is the evidence. Edited history isn't.
 */

export type ConsentType =
  'voting' | 'marketing' | 'application' | 'privacy_policy' | 'media_release' | 'competition_rules';

export type ConsentRecord = {
  email: string;
  consentType: ConsentType;
  granted: boolean;
  /** The literal text on screen when the box was ticked. Never a paraphrase. */
  wordingShown: string;
  /** 'signup', 'application', 'vote', 'subscribe'. */
  source: string;
};

/**
 * Writes consent records in one insert.
 *
 * Takes `headers` instead of calling next/headers itself. An action that
 * already read them can pass them straight through, and the function stays
 * testable.
 */
export async function recordConsents(records: ConsentRecord[], headers: Headers): Promise<void> {
  if (records.length === 0) return;

  const ipHash = hashIp(getClientIp(headers));
  const userAgent = headers.get('user-agent');
  const userAgentHash = userAgent ? hashUserAgent(userAgent) : null;

  const rows = records.flatMap((record) => {
    const normalized = normalizeEmail(record.email);
    // An unparseable email can't produce a meaningful consent record, and
    // storing one keyed on garbage is worse than storing none. Callers
    // validate first, so this is a guard we don't expect to trip.
    if (!normalized.ok) return [];

    return [
      {
        id: randomUUID(),
        emailRaw: normalized.raw,
        emailCanonical: normalized.canonical,
        consentType: record.consentType,
        granted: record.granted,
        wordingShown: record.wordingShown,
        documentVersion: CONSENT_VERSION,
        source: record.source,
        ipHash,
        userAgentHash,
      },
    ];
  });

  if (rows.length === 0) return;

  await db.insert(emailConsents).values(rows);
}
