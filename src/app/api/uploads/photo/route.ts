import { NextResponse } from 'next/server';
import { requireRoleOrThrow, AuthorizationError } from '@/lib/auth/guards';
import { getArtistIdForUser } from '@/server/queries/application';
import { createSignedPhotoUpload, PHOTO_CONSTRAINTS } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Issues a signed Cloudinary upload authorization for one artist photo.
 *
 * This route hands out write access to the media account. It authorizes first
 * and rate limits before signing anything, because an anonymous caller who got
 * here could fill that account at will.
 *
 * The server signs. It never proxies file bytes. The browser POSTs straight to
 * Cloudinary, which keeps the Node process responsive through a 10MB upload on
 * a phone connection.
 *
 * Every constraint that matters sits INSIDE the signature: server-generated
 * public_id, allowed_formats, the incoming transformation that strips EXIF and
 * caps dimensions, overwrite=false. Anything outside it is a value the browser
 * can rewrite.
 */
export async function POST() {
  let user;
  try {
    user = await requireRoleOrThrow('artist');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Not authorized.' },
        { status: error.code === 'unauthenticated' ? 401 : 403 },
      );
    }
    throw error;
  }

  let limit;
  try {
    limit = await checkRateLimit('upload:user', user.id);
  } catch (error) {
    console.error('[upload] rate limit failed', error);
    return NextResponse.json(
      { error: 'Photo uploads are temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  /**
   * The upload folder is pinned to the artist's own id, read from the session.
   * Take an artistId off the request body instead and one artist can write into
   * another's folder.
   */
  const artistId = await getArtistIdForUser(user.id);
  if (!artistId) {
    return NextResponse.json(
      { error: 'Start your application before uploading a photo.' },
      { status: 409 },
    );
  }

  try {
    const signed = createSignedPhotoUpload(artistId);
    return NextResponse.json({
      ...signed,
      constraints: {
        maxBytes: PHOTO_CONSTRAINTS.maxBytes,
        allowedFormats: PHOTO_CONSTRAINTS.allowedFormats,
      },
    });
  } catch (error) {
    // getCloudinaryConfig throws when credentials are missing. That's a
    // deployment problem, not a client one, so log it and say so plainly.
    // A generic failure here just makes the artist retry forever.
    console.error('[upload] signing failed', error);
    return NextResponse.json(
      { error: 'Photo uploads are not available right now. Please try again later.' },
      { status: 503 },
    );
  }
}
