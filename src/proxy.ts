import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next 16 renamed middleware.ts to proxy.ts, and the exported function to
 * `proxy`. It runs on the Node runtime only; the edge runtime is not
 * configurable here.
 *
 * THIS IS NOT A SECURITY BOUNDARY. It sets response headers and performs UX
 * redirects. Every protected data path re-checks the session server-side via
 * requireRole() at the data access point. CVE-2025-29927 was exactly the
 * mistake of trusting middleware for authorization: a spoofed
 * x-middleware-subrequest header made Next skip middleware entirely.
 *
 * The reverse proxy (Traefik/Caddy) must ALSO strip x-middleware-subrequest
 * from inbound requests. Defence in depth, independent of the Next version.
 */

/**
 * Whether this request actually arrived over TLS.
 *
 * NOT the same question as "is this production". A production deploy that has
 * not had TLS configured yet is served over plain http, and treating it as
 * https there breaks the site completely: `upgrade-insecure-requests` rewrites
 * every stylesheet and script request to https://, the connection is refused,
 * and the browser renders unstyled HTML with no JavaScript. curl does not
 * implement the directive, so the assets look fine when fetched directly,
 * which makes this genuinely confusing to diagnose.
 *
 * Behind Coolify's proxy the app itself listens on plain http, so the scheme
 * has to come from the forwarded header the proxy sets. Trusting that header
 * is only safe because the proxy sets it; it is never trusted for
 * authorization, only to decide whether to emit TLS-only headers.
 */
function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    // May be a comma-separated chain: take the first hop.
    const firstHop = forwardedProto.split(',')[0]?.trim();
    return firstHop === 'https';
  }
  return request.nextUrl.protocol === 'https:';
}

function buildCsp(isDev: boolean, isSecure: boolean): string {
  const directives = [
    `default-src 'self'`,

    // Next's static App Router output includes small inline bootstrap scripts.
    // Allow those plus same-origin chunks. Dev also needs eval for refresh.
    isDev ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'` : `script-src 'self' 'unsafe-inline'`,

    // Tailwind injects styles at runtime; style-src-elem covers the tags it
    // creates. Revisit if a stricter policy proves workable.
    `style-src 'self' 'unsafe-inline'`,

    // blob:/data: cover the local preview shown before an upload completes.
    // The delivery host is named explicitly rather than allowing all https:,
    // so a stored image URL pointing anywhere else simply does not render.
    `img-src 'self' blob: data: https://res.cloudinary.com`,
    `font-src 'self'`,

    // Artist photos upload directly from the browser to Cloudinary, so the
    // upload endpoint must be reachable. The exact host, never a wildcard.
    `connect-src 'self' https://api.cloudinary.com`,

    // Submitted media is embedded only from the providers accepted by URL validation.
    `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com`,

    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];

  // Only meaningful when the site is genuinely reachable over TLS. Emitting it
  // on a plain-http deployment upgrades every asset request to a scheme the
  // server does not answer on, which serves unstyled HTML with no JavaScript.
  if (!isDev && isSecure) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const isSecure = isSecureRequest(request);
  const csp = buildCsp(isDev, isSecure);

  const requestHeaders = new Headers(request.headers);

  /**
   * Strip the CVE-2025-29927 header at the application edge as well as the
   * reverse proxy. Belt and braces: this app may be redeployed behind a proxy
   * someone else configures.
   */
  requestHeaders.delete('x-middleware-subrequest');

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ---- Security headers -------------------------------------------------
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  /**
   * HSTS only on a request that actually arrived over TLS.
   *
   * Sending it over plain http is worse than useless: a browser that receives
   * it will refuse http for this host for two years, so a deployment without
   * TLS becomes unreachable in that browser until the user clears the HSTS
   * entry manually. Per RFC 6797 a conforming browser ignores the header on a
   * non-secure transport, but not every client does, and the cost of being
   * wrong is a site nobody can load.
   */
  if (!isDev && isSecure) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  return response;
}

export const config = {
  /**
   * Skip static assets and image optimization: they do not need the header
   * work and it costs latency on every request.
   */
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|fonts/).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
