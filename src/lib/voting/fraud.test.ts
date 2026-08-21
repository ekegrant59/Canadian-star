import { describe, expect, it } from 'vitest';
import { assessVoteFraud, countSequentialEmailPatterns } from './fraud';

describe('assessVoteFraud', () => {
  it('does not flag a shared network by itself', () => {
    const result = assessVoteFraud({
      deviceVotesLastHour: 1,
      deviceDistinctEmailsLastDay: 1,
      ipVotesLastHour: 40,
      ipDistinctDevicesLastHour: 25,
      artistVotesLastTenMinutes: 0,
    });
    expect(result.flagged).toBe(false);
  });

  it('does not auto-flag a family sharing one browser', () => {
    const result = assessVoteFraud({
      deviceVotesLastHour: 1,
      deviceDistinctEmailsLastDay: 5,
      ipVotesLastHour: 5,
      ipDistinctDevicesLastHour: 5,
      artistVotesLastTenMinutes: 0,
    });
    expect(result.flagged).toBe(false);
  });

  it('flags corroborated browser abuse signals', () => {
    const result = assessVoteFraud({
      deviceVotesLastHour: 5,
      deviceDistinctEmailsLastDay: 5,
      ipVotesLastHour: 5,
      ipDistinctDevicesLastHour: 1,
      artistVotesLastTenMinutes: 0,
    });
    expect(result.flagged).toBe(true);
    expect(result.signals.some((signal) => signal.code === 'device_many_emails')).toBe(true);
  });

  it('treats disposable domains and sequential addresses as review signals', () => {
    const result = assessVoteFraud({
      deviceVotesLastHour: 4,
      deviceDistinctEmailsLastDay: 1,
      ipVotesLastHour: 1,
      ipDistinctDevicesLastHour: 1,
      artistVotesLastTenMinutes: 0,
      emailDomain: 'mailinator.com',
      sequentialEmailPatternCount: 3,
      hasEstablishedSession: false,
    });
    expect(result.signals.map((signal) => signal.code)).toEqual(
      expect.arrayContaining(['disposable_email_domain', 'sequential_email_pattern']),
    );
    expect(result.flagged).toBe(true);
  });

  it('detects a numbered address family without treating one numbered address as fraud', () => {
    expect(countSequentialEmailPatterns('fan12@example.test', [])).toBe(1);
    expect(
      countSequentialEmailPatterns('fan12@example.test', [
        'fan10@example.test',
        'fan11@example.test',
      ]),
    ).toBe(3);
  });
});
