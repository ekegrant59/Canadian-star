import 'server-only';

import { createHash } from 'node:crypto';

/**
 * Cloudinary signing primitives.
 *
 * No SDK: signing is one SHA-256 over a sorted query string, and the upload
 * itself is a browser POST. Adding a dependency to do that would be a
 * supply-chain surface for no benefit.
 *
 * Signature algorithm (Cloudinary "Generating authentication signatures"):
 *   1. Take every parameter that will be POSTed EXCEPT file, cloud_name,
 *      resource_type and api_key.
 *   2. Sort alphabetically by parameter name.
 *   3. Join as name=value pairs with '&'.
 *   4. Append the API secret directly, with no separator.
 *   5. Hash. Cloudinary accepts SHA-1 or SHA-256; we use SHA-256.
 *
 * Verified against Cloudinary's own published SHA-1 test vector in
 * cloudinary.test.ts, so a future refactor of the serialization cannot
 * silently change what gets signed.
 */

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Read config at call time, not module load.
 *
 * Same reason src/db/index.ts creates its pool lazily: `next build` evaluates
 * route modules, and these variables are absent during the Docker build.
 * Throwing at import time would fail the build.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are all required.',
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/** Values Cloudinary accepts in a signed parameter. */
export type SignableValue = string | number | boolean;

/**
 * Serializes parameters into Cloudinary's canonical string-to-sign.
 *
 * Exported for the test vector. The four excluded parameters are dropped here
 * rather than at the call site so a caller cannot accidentally sign them.
 */
export function buildStringToSign(params: Record<string, SignableValue | undefined>): string {
  const EXCLUDED = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);

  return Object.keys(params)
    .filter((key) => !EXCLUDED.has(key))
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
}

/** Signs upload parameters. `algorithm` exists so the test can use the published SHA-1 vector. */
export function signUploadParams(
  params: Record<string, SignableValue | undefined>,
  apiSecret: string,
  algorithm: 'sha1' | 'sha256' = 'sha256',
): string {
  const stringToSign = buildStringToSign(params);
  return createHash(algorithm)
    .update(stringToSign + apiSecret)
    .digest('hex');
}
