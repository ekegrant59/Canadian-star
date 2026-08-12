import { describe, it, expect } from 'vitest';
import { normalizeEmail, canonicalizeEmail } from './email-normalize';

/**
 * These tests are the specification for vote deduplication. If one fails, the
 * one-email-one-vote guarantee in §4.3 is broken.
 */

describe('normalizeEmail', () => {
  describe('Unicode normalization (the Auth.js July 2026 bypass class)', () => {
    it('collapses a fullwidth homoglyph @ to the same identity', () => {
      // U+FF20 FULLWIDTH COMMERCIAL AT and fullwidth letters. Without NFKC
      // this passes naive validation and creates a second identity for the
      // same mailbox.
      const attack = normalizeEmail('ｕｓｅｒ＠ｇｍａｉｌ．ｃｏｍ');
      const genuine = normalizeEmail('user@gmail.com');

      expect(attack.ok).toBe(true);
      expect(genuine.ok).toBe(true);
      if (attack.ok && genuine.ok) {
        expect(attack.canonical).toBe(genuine.canonical);
      }
    });

    it('rejects an address containing more than one @ after normalization', () => {
      const result = normalizeEmail('user@@gmail.com');
      expect(result).toEqual({ ok: false, reason: 'multiple_at' });
    });

    it('rejects control characters, which would allow header injection', () => {
      const result = normalizeEmail('user@gmail.com\r\nBcc: attacker@evil.test');
      expect(result.ok).toBe(false);
    });
  });

  describe('Gmail canonicalization', () => {
    const variants = [
      'user@gmail.com',
      'User@Gmail.com',
      'u.ser@gmail.com',
      'u.s.e.r@gmail.com',
      'user+alt@gmail.com',
      'u.ser+campaign@gmail.com',
      '  user@gmail.com  ',
      'user@googlemail.com',
    ];

    it('collapses every Gmail alias to one canonical address', () => {
      const canonicals = new Set(variants.map((variant) => canonicalizeEmail(variant)));
      expect(canonicals.size).toBe(1);
      expect([...canonicals][0]).toBe('user@gmail.com');
    });
  });

  describe('non-Gmail domains keep dots significant', () => {
    it('treats j.smith and jsmith at a corporate domain as different people', () => {
      // Over-normalizing silently disenfranchises real voters, which is worse
      // than one duplicate vote in a competition whose credibility is the
      // product.
      expect(canonicalizeEmail('j.smith@company.com')).not.toBe(
        canonicalizeEmail('jsmith@company.com'),
      );
    });

    it('strips +tags but keeps dots for Outlook', () => {
      expect(canonicalizeEmail('u.ser+tag@outlook.com')).toBe('u.ser@outlook.com');
    });
  });

  describe('rejects malformed input', () => {
    it.each([
      ['', 'empty'],
      ['nodomain', 'no_at'],
      ['@gmail.com', 'empty_local'],
      ['user@', 'empty_domain'],
      ['user@gmail', 'invalid_domain'],
      ['user@bad..com', 'invalid_domain'],
      ['+tag@gmail.com', 'empty_local'],
    ])('rejects %j as %s', (input, reason) => {
      const result = normalizeEmail(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(reason);
    });

    it('rejects an address longer than the RFC 5321 limit', () => {
      const result = normalizeEmail(`${'a'.repeat(250)}@gmail.com`);
      expect(result.ok).toBe(false);
    });
  });

  it('preserves the raw address alongside the canonical one', () => {
    const result = normalizeEmail('U.ser+Tag@Gmail.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.raw).toBe('u.ser+tag@gmail.com');
      expect(result.canonical).toBe('user@gmail.com');
    }
  });
});
