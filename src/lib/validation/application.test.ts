import { describe, it, expect } from 'vitest';
import { applicationDraftSchema, applicationSubmitSchema } from './application';
import {
  validateVideoUrl,
  validateMusicUrl,
  validateWebsiteUrl,
  normalizeSocialInput,
} from './url';

/**
 * Covers the rules where a bug costs the most: the draft/submit split, where
 * the failure is a lost application, and URL validation, where it's stored XSS
 * on a public profile.
 */

const validSubmission = {
  actName: 'The Kawartha Ramblers',
  actType: 'band' as const,
  locationCity: 'Peterborough',
  contactEmail: 'band@example.com',
  contactPhone: '',
  bio: 'A five-piece from the Kawarthas.',
  photoKey: 'artists/abc/def',
  performanceVideoUrls: ['https://youtube.com/watch?v=abc'],
  recordedMusicUrls: ['https://open.spotify.com/artist/xyz'],
  instagram: '',
  tiktok: '',
  x: '',
  youtube: '',
  facebook: '',
  websiteUrl: '',
  availableAllDates: true as const,
  isEligible: true as const,
  acceptedRules: true as const,
  acceptedMediaRelease: true as const,
  confirmAccuracy: true as const,
};

describe('application draft schema', () => {
  it('accepts a half-finished application', () => {
    // The whole point of save-as-draft. Phone, mid-form, connection dies.
    const result = applicationDraftSchema.safeParse({
      actName: 'Maple Ridge',
      bio: '',
      contactEmail: '',
      currentStep: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a completely empty draft', () => {
    expect(applicationDraftSchema.safeParse({}).success).toBe(true);
  });

  it('still rejects a malicious URL in a draft', () => {
    // Leniency covers MISSING fields, never unsafe ones. Drafts get rendered
    // back into the form, so no javascript: URL survives this far.
    const result = applicationDraftSchema.safeParse({
      websiteUrl: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });
});

describe('application submit schema', () => {
  it('accepts a complete application', () => {
    expect(applicationSubmitSchema.safeParse(validSubmission).success).toBe(true);
  });

  it.each([
    ['availableAllDates', 'availability for all five dates'],
    ['isEligible', 'eligibility'],
    ['acceptedRules', 'competition rules'],
    ['acceptedMediaRelease', 'media release'],
    ['confirmAccuracy', 'accuracy confirmation'],
  ])('rejects a submission missing %s', (field) => {
    const result = applicationSubmitSchema.safeParse({
      ...validSubmission,
      [field]: false,
    });
    expect(result.success).toBe(false);
  });

  it('requires a photo', () => {
    const result = applicationSubmitSchema.safeParse({ ...validSubmission, photoKey: '' });
    expect(result.success).toBe(false);
  });

  it('requires at least one performance video', () => {
    const result = applicationSubmitSchema.safeParse({
      ...validSubmission,
      performanceVideoUrls: [],
    });
    expect(result.success).toBe(false);
  });

  it('caps the biography', () => {
    const result = applicationSubmitSchema.safeParse({
      ...validSubmission,
      bio: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('url validation', () => {
  it('rejects javascript: URLs', () => {
    expect(validateVideoUrl('javascript:alert(1)')).toBeNull();
    expect(validateWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(validateMusicUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(validateWebsiteUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects plain http', () => {
    expect(validateVideoUrl('http://youtube.com/watch?v=a')).toBeNull();
  });

  it('rejects embedded credentials', () => {
    // https://user:pass@evil.example disguises the real host.
    expect(validateVideoUrl('https://user:pass@youtube.com/watch?v=a')).toBeNull();
  });

  it('rejects hosts outside the allowlist', () => {
    expect(validateVideoUrl('https://evil.example/video')).toBeNull();
    expect(validateMusicUrl('https://evil.example/track')).toBeNull();
  });

  it('accepts allowlisted video and music hosts', () => {
    expect(validateVideoUrl('https://youtube.com/watch?v=abc')).toBeTruthy();
    expect(validateVideoUrl('https://vimeo.com/12345')).toBeTruthy();
    expect(validateMusicUrl('https://open.spotify.com/artist/x')).toBeTruthy();
    expect(validateMusicUrl('https://soundcloud.com/artist')).toBeTruthy();
  });

  it('expands a bare social handle to a canonical URL', () => {
    expect(normalizeSocialInput('@johnny', 'instagram')).toBe('https://instagram.com/johnny');
    expect(normalizeSocialInput('countrykid', 'tiktok')).toBe('https://tiktok.com/@countrykid');
  });

  it('rejects a URL from the wrong platform', () => {
    // A Facebook URL in the Instagram field becomes a data quality problem
    // some admin has to chase during review.
    expect(normalizeSocialInput('https://facebook.com/x', 'instagram')).toBeNull();
  });

  it('rejects a handle containing path traversal', () => {
    expect(normalizeSocialInput('../../etc/passwd', 'instagram')).toBeNull();
  });
});
