import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow phones and tablets on the local network to load dev-only HMR and
  // JavaScript resources. Without this, the HTML renders but the page never
  // hydrates, so interactive controls fall back to native browser behavior.
  allowedDevOrigins: ['192.168.1.4', 'http://192.168.1.4:3000'],

  // Required for the Docker image on Coolify. Produces .next/standalone.
  output: 'standalone',

  // Pin the workspace root. Without this, Turbopack walks up looking for a
  // lockfile and can pick one outside the repo, which changes what gets traced
  // into the standalone output.
  turbopack: {
    root: __dirname,
  },

  // Next 16 caching is opt-in. Enabled deliberately in Phase 1, per the
  // implementation plan: the read-heavy public pages in Phase 4 (artist
  // directory, profiles) are exactly what this is for, and switching it on
  // later surfaces build errors for every uncached read outside <Suspense>.
  cacheComponents: true,

  // Do not leak the framework version to every response.
  poweredByHeader: false,

  // Trailing slashes off keeps canonical URLs unambiguous for SEO.
  trailingSlash: false,

  images: {
    // Artist photos are delivered by Cloudinary. Scoped to this account's
    // path, never a bare wildcard: a permissive remotePattern turns the image
    // optimizer into an open proxy for arbitrary remote images.
    // res.cloudinary.com is shared by every Cloudinary account, so the path is
    // pinned to this cloud name. With /** any account's assets would proxy
    // through our optimizer at our expense.
    remotePatterns: [
      ...(process.env.CLOUDINARY_CLOUD_NAME
        ? [
            {
              protocol: 'https' as const,
              hostname: 'res.cloudinary.com',
              pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/**`,
            },
          ]
        : []),
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  typescript: {
    // Never ship a build that does not typecheck.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
