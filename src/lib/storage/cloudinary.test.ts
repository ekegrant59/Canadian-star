import { describe, it, expect } from 'vitest';
import { buildStringToSign, signUploadParams } from './cloudinary';

/**
 * The SHA-1 cases below are Cloudinary's own published examples. They pin the
 * serialization: sorted, '&'-joined, secret appended with no separator. If a
 * refactor changes what gets signed, these fail rather than every upload
 * failing in production with "Invalid Signature".
 */
describe('buildStringToSign', () => {
  it('matches the published example ordering', () => {
    expect(
      buildStringToSign({
        timestamp: 1315060510,
        public_id: 'sample_image',
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
      }),
    ).toBe(
      'eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510',
    );
  });

  it('sorts alphabetically rather than preserving insertion order', () => {
    expect(buildStringToSign({ timestamp: 1, folder: 'a', context: 'b' })).toBe(
      'context=b&folder=a&timestamp=1',
    );
  });

  it('excludes file, cloud_name, resource_type, api_key and signature', () => {
    expect(
      buildStringToSign({
        timestamp: 1315060510,
        file: 'data:image/png;base64,xxx',
        cloud_name: 'demo',
        resource_type: 'image',
        api_key: '1234',
        signature: 'deadbeef',
      }),
    ).toBe('timestamp=1315060510');
  });

  it('drops undefined and empty values so they are not signed as blanks', () => {
    expect(buildStringToSign({ timestamp: 1, folder: undefined, public_id: '' })).toBe(
      'timestamp=1',
    );
  });
});

describe('signUploadParams', () => {
  it("reproduces Cloudinary's published SHA-1 signature", () => {
    // "public_id=sample_image&timestamp=1315060510" + "abcd"
    expect(
      signUploadParams({ public_id: 'sample_image', timestamp: 1315060510 }, 'abcd', 'sha1'),
    ).toBe('b4ad47fb4e25c7bf5f92a20089f9db59bc302313');
  });

  it('produces a 64-char hex digest under the SHA-256 default', () => {
    const sig = signUploadParams({ timestamp: 1315060510 }, 'abcd');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any signed parameter changes', () => {
    const a = signUploadParams({ timestamp: 1, folder: 'artists/x' }, 'secret');
    const b = signUploadParams({ timestamp: 1, folder: 'artists/y' }, 'secret');
    expect(a).not.toBe(b);
  });
});
