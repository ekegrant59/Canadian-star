import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicMediaUrl } from './index';

/**
 * Sponsor/judge rows are not uniformly bare public_ids: admin uploads persist
 * Cloudinary's `secure_url`, and the URL fields accept pasted links. Wrapping
 * those in a delivery URL produced a broken path like
 * `.../upload/c_limit,.../https://example.com/logo.png` and the artists-page
 * logos stopped loading.
 */
describe('publicMediaUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null for empty values', () => {
    expect(publicMediaUrl(null)).toBeNull();
    expect(publicMediaUrl('')).toBeNull();
  });

  it('passes through absolute URLs untouched', () => {
    const absolute = 'https://res.cloudinary.com/demo/image/upload/v1/content/sponsors/logo.png';
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo');
    expect(publicMediaUrl(absolute, 'sponsorLogo')).toBe(absolute);
  });

  it('passes through protocol-relative and root-relative paths untouched', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo');
    expect(publicMediaUrl('//cdn.example.com/logo.png')).toBe('//cdn.example.com/logo.png');
    expect(publicMediaUrl('/images/logo.png')).toBe('/images/logo.png');
  });

  it('builds a delivery URL for a bare public_id', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo');
    expect(publicMediaUrl('content/sponsors/logo', 'sponsorLogo')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_limit,w_400,h_160,q_auto,f_auto/content/sponsors/logo',
    );
  });

  it('returns null for a bare public_id when Cloudinary is not configured', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    expect(publicMediaUrl('content/sponsors/logo')).toBeNull();
  });
});
