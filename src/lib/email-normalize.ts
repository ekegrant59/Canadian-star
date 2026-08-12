/**
 * Email normalization for identity and vote deduplication.
 *
 * ORDER IS SECURITY-RELEVANT. Unicode normalization must happen FIRST.
 *
 * Skipping NFKC is the class of bug patched in Auth.js in July 2026: a
 * homoglyph of `@` (for example U+FF20 FULLWIDTH COMMERCIAL AT) passes naive
 * validation and creates a second identity for the same mailbox. In a
 * competition decided by one-email-one-vote, that defeats deduplication
 * entirely.
 *
 * This module has no dependencies and no side effects so it can be unit tested
 * directly. It is the single source of truth for what "the same email" means.
 */

/**
 * Providers where dots in the local part are NOT significant.
 * Gmail ignores dots entirely and treats +tags as aliases.
 */
const DOT_INSENSITIVE_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Providers where +tags are aliases but dots ARE significant.
 */
const PLUS_TAG_DOMAINS = new Set([
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.ca',
  'ymail.com',
  'proton.me',
  'protonmail.com',
  'icloud.com',
  'me.com',
]);

/** Domains that are equivalent to a canonical one. */
const DOMAIN_ALIASES: Record<string, string> = {
  'googlemail.com': 'gmail.com',
};

export type NormalizeResult =
  | { ok: true; raw: string; canonical: string; domain: string }
  | { ok: false; reason: NormalizeFailure };

export type NormalizeFailure =
  | 'empty'
  | 'too_long'
  | 'no_at'
  | 'multiple_at'
  | 'empty_local'
  | 'empty_domain'
  | 'invalid_domain'
  | 'control_characters';

/** RFC 5321 caps the whole address at 254 octets. */
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

/**
 * Normalizes an email into a canonical form for uniqueness checks.
 *
 * Returns both the trimmed raw value (what to send mail to, and what to show
 * support) and the canonical value (what to enforce uniqueness on). Store BOTH:
 * the canonical form alone loses the address the person actually typed.
 */
export function normalizeEmail(input: string): NormalizeResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  // 1. Unicode normalize FIRST. NFKC collapses compatibility variants and
  //    homoglyphs (fullwidth, mathematical alphanumerics) to their ASCII forms.
  let value = input.normalize('NFKC');

  // 2. Trim surrounding whitespace, then lowercase.
  value = value.trim().toLowerCase();

  if (value.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  if (value.length > MAX_EMAIL_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  // Reject control characters and any remaining whitespace outright. These
  // should not survive NFKC, but a header-injection attempt must never pass.

  if (/[\u0000-\u0020\u007f]/.test(value)) {
    return { ok: false, reason: 'control_characters' };
  }

  // 3. Exactly one @ after normalization.
  const atCount = (value.match(/@/g) ?? []).length;
  if (atCount === 0) {
    return { ok: false, reason: 'no_at' };
  }
  if (atCount > 1) {
    return { ok: false, reason: 'multiple_at' };
  }

  const atIndex = value.indexOf('@');
  let local = value.slice(0, atIndex);
  let domain = value.slice(atIndex + 1);

  if (local.length === 0) return { ok: false, reason: 'empty_local' };
  if (domain.length === 0) return { ok: false, reason: 'empty_domain' };
  if (local.length > MAX_LOCAL_LENGTH) return { ok: false, reason: 'too_long' };

  // Domain must look like a hostname with at least one dot, no leading or
  // trailing dot or hyphen, and no consecutive dots.
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) ||
    domain.includes('..')
  ) {
    return { ok: false, reason: 'invalid_domain' };
  }

  // Resolve domain aliases (googlemail.com -> gmail.com).
  domain = DOMAIN_ALIASES[domain] ?? domain;

  // 4. Provider-specific canonicalization, for KNOWN providers only.
  //
  //    Dots are NOT stripped for arbitrary domains. In most mail systems dots
  //    are significant, so j.smith@company.com and jsmith@company.com are
  //    usually two different people. Over-normalizing silently disenfranchises
  //    real voters, which is a worse failure than one duplicate vote in a
  //    competition whose credibility is the product.
  const isDotInsensitive = DOT_INSENSITIVE_DOMAINS.has(domain);
  const stripsPlusTags = isDotInsensitive || PLUS_TAG_DOMAINS.has(domain);

  if (stripsPlusTags) {
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
  }

  if (isDotInsensitive) {
    local = local.replaceAll('.', '');
  }

  // A +tag or dots-only local part is not a real mailbox.
  if (local.length === 0) {
    return { ok: false, reason: 'empty_local' };
  }

  return {
    ok: true,
    raw: value,
    canonical: `${local}@${domain}`,
    domain,
  };
}

/** Convenience wrapper returning only the canonical form, or null. */
export function canonicalizeEmail(input: string): string | null {
  const result = normalizeEmail(input);
  return result.ok ? result.canonical : null;
}
