/**
 * User-supplied URL validation.
 *
 * The application collects six social fields, a website, video links and music
 * links. Every one of those is attacker-controlled text that later lands in an
 * anchor on a public profile, and a stored `javascript:` URL in an href is
 * stored XSS.
 *
 * Two rules, kept here so no call site can skip them:
 *   1. https only. Not http, not protocol-relative, and certainly not
 *      javascript:, data: or vbscript:.
 *   2. Host allowlist for fields where we know what a valid answer looks like
 *      (video, music, socials). The website field takes any https host, since
 *      an unsigned act's own site can live anywhere.
 *
 * No server imports. The client form runs these same functions, so a bad link
 * gets caught before it's ever submitted.
 */

/** Hosts we accept a performance video from (§4.2). */
export const VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
] as const;

/** Hosts we accept a recorded music link from (§4.2). */
export const MUSIC_HOSTS = [
  'open.spotify.com',
  'spotify.com',
  'music.apple.com',
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
  'bandcamp.com',
  'music.amazon.ca',
  'music.amazon.com',
  'music.youtube.com',
  'audiomack.com',
  'tidal.com',
  'listen.tidal.com',
  'deezer.com',
  'www.deezer.com',
] as const;

/**
 * Social platform hosts, keyed by the field they belong to.
 *
 * Keyed, not one flat list, so an Instagram field can't hold a Facebook URL.
 * The review queue reads these as "the artist's Instagram", and a mismatch
 * becomes a data quality problem some admin has to chase down later.
 */
export const SOCIAL_HOSTS = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com', 'm.facebook.com'],
} as const;

export type SocialPlatform = keyof typeof SOCIAL_HOSTS;

/**
 * Parses a URL and enforces the https-only rule.
 *
 * Returns null instead of throwing. Every caller is validating user input,
 * where "not a URL" is an ordinary answer, not an exceptional one.
 */
export function parseHttpsUrl(input: string): URL | null {
  let trimmed = input.trim();
  if (!trimmed) return null;

  // Artists commonly paste a domain without a scheme. Treat it as HTTPS at
  // the trust boundary so the stored value is always directly clickable.
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // http gets rejected too. These render as links on a public page, where
  // mixed content means a browser warning and a downgrade opportunity.
  if (url.protocol !== 'https:') return null;

  // A URL with credentials in it (https://user:pass@host) is either a mistake
  // or an attempt to make the host look like something it is not.
  if (url.username || url.password) return null;

  return url;
}

/** Whether a host matches an allowlist entry, ignoring a leading `www.`. */
function hostMatches(host: string, allowed: readonly string[]): boolean {
  const normalized = host.toLowerCase();
  return allowed.some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}

/** Validates against a host allowlist. Returns the normalized URL string, or null. */
export function validateAllowlistedUrl(input: string, allowed: readonly string[]): string | null {
  const url = parseHttpsUrl(input);
  if (!url) return null;
  if (!hostMatches(url.hostname, allowed)) return null;
  return url.toString();
}

export function validateVideoUrl(input: string): string | null {
  return validateAllowlistedUrl(input, VIDEO_HOSTS);
}

export function validateMusicUrl(input: string): string | null {
  return validateAllowlistedUrl(input, MUSIC_HOSTS);
}

/**
 * Normalizes a social field that may be typed as a handle or a full URL.
 *
 * Artists type `@name` far more often than a full URL. Rejecting that would be
 * needless friction on a phone, so a bare handle expands to the platform's
 * canonical URL; a full URL gets checked against that platform's hosts.
 */
export function normalizeSocialInput(input: string, platform: SocialPlatform): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Looks like a URL: validate it against this platform's hosts.
  if (/^https?:\/\//i.test(trimmed)) {
    return validateAllowlistedUrl(trimmed, SOCIAL_HOSTS[platform]);
  }

  // Bare host without a scheme, e.g. "facebook.com/yourpage".
  if (trimmed.includes('/') || trimmed.includes('.')) {
    return validateAllowlistedUrl(`https://${trimmed}`, SOCIAL_HOSTS[platform]);
  }

  // A handle. Strip any leading @, then confirm it looks like a username.
  // Arbitrary text here would build a nonsense URL.
  const handle = trimmed.replace(/^@/, '');
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(handle)) return null;

  const base: Record<SocialPlatform, string> = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/@',
    x: 'https://x.com/',
    youtube: 'https://youtube.com/@',
    facebook: 'https://facebook.com/',
  };

  return `${base[platform]}${handle}`;
}

/**
 * The artist's own website. Any https host is fine, since an unsigned act's
 * site or EPK could be anywhere. Still no javascript:, still no credentials.
 */
export function validateWebsiteUrl(input: string): string | null {
  const url = parseHttpsUrl(input);
  return url ? url.toString() : null;
}
