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

/** Generates a per-request nonce for the CSP. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,

    // Nonce-based script-src. No 'unsafe-inline'.
    // 'strict-dynamic' lets Next's bootstrap load its own chunks without
    // enumerating every hash. Dev needs eval for React Refresh.
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,

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

    // Video embeds are allowlisted per host in Phase 4, never wildcarded.
    `frame-src 'self'`,

    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];

  if (!isDev) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = generateNonce();

  // Make the nonce available to the render so Next can attach it to its own
  // script tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

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
  response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  // HSTS only over TLS. Setting it in local dev would pin http://localhost.
  if (!isDev) {
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
