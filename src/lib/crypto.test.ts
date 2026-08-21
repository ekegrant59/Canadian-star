import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashIpPrefix } from './crypto';

describe('hashIpPrefix', () => {
  beforeEach(() => {
    process.env.IP_HASH_PEPPER = 'test-pepper';
  });

  afterEach(() => {
    delete process.env.IP_HASH_PEPPER;
  });

  it('groups IPv4 addresses only at the /24 level', () => {
    expect(hashIpPrefix('192.0.2.10')).toBe(hashIpPrefix('192.0.2.240'));
    expect(hashIpPrefix('192.0.2.10')).not.toBe(hashIpPrefix('192.0.3.10'));
  });

  it('normalizes equivalent compressed IPv6 /64 prefixes', () => {
    expect(hashIpPrefix('2001:db8::1')).toBe(hashIpPrefix('2001:0db8:0:0:abcd::1'));
    expect(hashIpPrefix('2001:db8::1')).not.toBe(hashIpPrefix('2001:db8:0:1::1'));
  });

  it('uses the embedded IPv4 /24 for IPv4-mapped IPv6 addresses', () => {
    expect(hashIpPrefix('::ffff:192.0.2.10')).toBe(hashIpPrefix('::ffff:192.0.2.200'));
    expect(hashIpPrefix('::ffff:192.0.2.10')).not.toBe(hashIpPrefix('::ffff:192.0.3.10'));
    expect(hashIpPrefix('::ffff:c000:020a')).toBe(hashIpPrefix('::ffff:c000:02c8'));
  });
});
