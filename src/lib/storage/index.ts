import 'server-only';

import { randomUUID } from 'node:crypto';
import { getCloudinaryConfig, signUploadParams } from './cloudinary';

/**
 * Artist photo storage (§4.2).
 *
 * The browser uploads directly to Cloudinary with a short-lived signature, so
 * the app server never handles file bytes: it stays responsive during a 5MB
 * upload on hotel wifi, and the upload endpoint cannot be used to push bytes
 * through the Node process.
 *
 * WHAT IS STORED IN THE DATABASE: the public_id, never a URL. Delivery URLs
 * are built at render time by mediaUrl(). Storing URLs would bake the cloud
 * name and transformation into thousands of rows and make any change a
 * migration.
 */

/** Upload constraints. Enforced in the signature, not merely in the UI. */
export const PHOTO_CONSTRAINTS = {
  maxBytes: 10 * 1024 * 1024,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'] as const,
  /** Signature validity. Short: a leaked signature is only briefly useful. */
  signatureTtlSeconds: 300,
} as const;

export type SignedUpload = {
  uploadUrl: string;
  publicId: string;
  fields: Record<string, string>;
  expiresAt: number;
};

/**
 * Builds a signed, single-use-ish upload authorization for one artist photo.
 *
 * Call ONLY after requireRole/requireAuth: this hands out write access to the
 * media account and must never be reachable by an anonymous caller.
 *
 * Security properties, all enforced by being inside the signature so the
 * browser cannot alter them:
 *   - public_id is generated server-side (UUID). A client-supplied filename in
 *     a path is a traversal and overwrite vector.
 *   - The folder is pinned per artist.
 *   - allowed_formats rejects anything that is not a real image, checked by
 *     Cloudinary against actual file content, not the extension.
 *   - An incoming transformation re-encodes and caps dimensions BEFORE storage,
 *     which strips EXIF (GPS in a home-studio photo is a real privacy problem,
 *     CLAUDE.md security baseline) and defuses decompression bombs: a
 *     40000x40000 PNG is resized on ingest, never stored.
 *   - overwrite=false and invalidate=false: an upload cannot replace an
 *     existing asset.
 */
export function createSignedPhotoUpload(artistId: string): SignedUpload {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `artists/${artistId}/${randomUUID()}`;

  /**
   * c_limit only shrinks: a photo already under 2400px keeps its dimensions
   * instead of being upscaled. q_auto and f_auto let Cloudinary pick codec
   * and quality per requesting browser.
   */
  const params: Record<string, string | number> = {
    timestamp,
    public_id: publicId,
    allowed_formats: PHOTO_CONSTRAINTS.allowedFormats.join(','),
    transformation: 'c_limit,w_2400,h_2400,q_auto:good',
    overwrite: 'false',
    invalidate: 'false',
  };

  const signature = signUploadParams(params, apiSecret);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    publicId,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: apiKey,
      signature,
    },
    expiresAt: (timestamp + PHOTO_CONSTRAINTS.signatureTtlSeconds) * 1000,
  };
}

/** Named delivery variants, so sizes get defined once, not per call site. */
export const MEDIA_VARIANTS = {
  thumb: 'c_fill,g_auto,w_400,h_400,q_auto,f_auto',
  card: 'c_fill,g_auto,w_800,h_600,q_auto,f_auto',
  profile: 'c_limit,w_1200,q_auto,f_auto',
  /** Open Graph requires exact dimensions. */
  social: 'c_fill,g_auto,w_1200,h_630,q_auto,f_jpg',
} as const;

export type MediaVariant = keyof typeof MEDIA_VARIANTS;

/**
 * Builds a delivery URL for a stored public_id.
 *
 * g_auto crops toward the detected subject, so a portrait does not lose its
 * head to a centre crop in the artist grid.
 */
export function mediaUrl(publicId: string, variant: MediaVariant = 'card'): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error('CLOUDINARY_CLOUD_NAME is not set');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${MEDIA_VARIANTS[variant]}/${publicId}`;
}

/** Permanently removes uploaded artist photos from Cloudinary. */
export async function deletePhotoAssets(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  await Promise.all(
    [...new Set(publicIds)].map(async (publicId) => {
      const params = {
        public_id: publicId,
        timestamp,
        type: 'upload',
        invalidate: true,
      } as const;
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
          api_key: apiKey,
          signature: signUploadParams(params, apiSecret),
        }),
      });
      if (!response.ok) {
        throw new Error(`Cloudinary asset deletion failed with status ${response.status}`);
      }
      const result = (await response.json()) as { result?: string };
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Cloudinary asset deletion returned ${result.result ?? 'no result'}`);
      }
    }),
  );
}

/** Host used in CSP and next/image config. One definition, imported by both. */
export const CLOUDINARY_DELIVERY_HOST = 'res.cloudinary.com';
