import { describe, expect, it } from 'vitest';
import { adminCanManageAdmins, adminCanWrite, requiresTwoFactor } from './roles';

describe('administrator permissions', () => {
  it('requires 2FA for every administrator environment', () => {
    expect(requiresTwoFactor('admin')).toBe(true);
    expect(requiresTwoFactor('artist')).toBe(false);
  });

  it('allows writes only for super and read-write administrators', () => {
    expect(adminCanWrite('super')).toBe(true);
    expect(adminCanWrite('read_write')).toBe(true);
    expect(adminCanWrite('read_only')).toBe(false);
  });

  it('allows only super administrators to manage administrator accounts', () => {
    expect(adminCanManageAdmins('super')).toBe(true);
    expect(adminCanManageAdmins('read_write')).toBe(false);
    expect(adminCanManageAdmins('read_only')).toBe(false);
  });
});
