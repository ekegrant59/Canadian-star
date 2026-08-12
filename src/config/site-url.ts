/**
 * The site's public origin, resolved once.
 *
 * Why this is not just `process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`:
 * that fallback produces a BUILD THAT SUCCEEDS with the wrong value baked in.
 * NEXT_PUBLIC_* is inlined by Next at build time, so if the variable is missing
 * in Coolify's build environment the literal string "http://localhost:3000" is
 * compiled into the bundle. Nothing fails; the site just serves canonical URLs,
 * Open Graph tags and sitemap entries pointing at localhost, and the mistake is
 * invisible until someone shares a link.
 *
 * (Verified: building with the variable unset compiled that literal into the
 * server output.)
 *
 * So: fall back in development, fail the build in production.
 */

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    // Trailing slashes produce '//path' when joined. Normalize once, here.
    return configured.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not set. It must be a Coolify BUILD variable: ' +
        'Next inlines NEXT_PUBLIC_* at build time, so setting it only at ' +
        'runtime leaves the wrong value compiled into the bundle.',
    );
  }

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
