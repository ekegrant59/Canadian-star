import { describe, expect, it } from 'vitest';
import { RATE_LIMITS } from './rate-limit';

describe('authentication rate-limit policy', () => {
  it('keeps signup separate from sign-in and verification buckets', () => {
    expect(RATE_LIMITS['signup:ip']).toEqual({ limit: 20, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:email']).toEqual({ limit: 3, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:resend:ip']).toEqual({ limit: 3, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:resend:email']).toEqual({ limit: 3, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:verify:ip']).toEqual({ limit: 10, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:verify:email']).toEqual({ limit: 10, windowSeconds: 3600 });
    expect(RATE_LIMITS['signup:ip']).not.toEqual(RATE_LIMITS['signin:ip']);
    expect(RATE_LIMITS['signup:email']).not.toEqual(RATE_LIMITS['signin:email']);
  });
});
