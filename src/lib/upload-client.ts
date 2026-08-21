'use client';

/**
 * Browser-side photo upload.
 *
 * Two hops, on purpose:
 *   1. Ask our server to sign an upload. It authorizes the request, pins the
 *      public_id and folder to the session's artist, and folds every constraint
 *      into the signature.
 *   2. POST the file straight to Cloudinary. The app server never touches the
 *      bytes, so a 10MB upload over a phone connection doesn't tie up a Node
 *      request for its whole duration.
 *
 * Nothing here is a security control. The signature and Cloudinary enforce what
 * matters; this file just reports what happened.
 */

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

type SignedUploadResponse = {
  uploadUrl: string;
  publicId: string;
  fields: Record<string, string>;
  expiresAt: number;
};

/**
 * Uploads one photo and returns its Cloudinary public_id.
 *
 * The caller persists the public_id. Never the delivery URL, which bakes the
 * cloud name and transformation into the row and turns any change to either
 * into a migration.
 */
export async function uploadPhoto(file: File): Promise<{ publicId: string; url: string | null }> {
  const signResponse = await fetch('/api/uploads/photo', { method: 'POST' });

  if (!signResponse.ok) {
    if (signResponse.status === 401 || signResponse.status === 403) {
      throw new UploadError('Your session has expired. Please sign in again.');
    }
    if (signResponse.status === 429) {
      throw new UploadError('Too many uploads. Please wait a moment and try again.');
    }

    const body = await signResponse.json().catch(() => null);
    throw new UploadError(
      (body as { error?: string } | null)?.error ??
        'Photo uploads are unavailable right now. Please try again later.',
    );
  }

  const signed = (await signResponse.json()) as SignedUploadResponse;

  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) {
    form.append(key, value);
  }
  // `file` goes last. Cloudinary reads the signed parameters first, and this
  // ordering keeps the multipart body streaming-friendly.
  form.append('file', file);

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: 'POST',
    body: form,
  });

  if (!uploadResponse.ok) {
    const body = await uploadResponse.json().catch(() => null);
    const detail = (body as { error?: { message?: string } } | null)?.error?.message;

    // Cloudinary rejects a file whose real content isn't an allowed format,
    // whatever its extension or the MIME type the browser claimed.
    if (detail && /format|allowed/i.test(detail)) {
      throw new UploadError('That file is not a supported image. Use a JPG, PNG, or WebP.');
    }
    throw new UploadError('The upload did not finish. Please try again.');
  }

  const result = (await uploadResponse.json()) as { public_id?: string; secure_url?: string };
  if (!result.public_id) {
    throw new UploadError('The upload did not finish. Please try again.');
  }

  return { publicId: result.public_id, url: result.secure_url ?? null };
}
