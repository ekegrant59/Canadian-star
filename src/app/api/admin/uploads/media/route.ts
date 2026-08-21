import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireRoleOrThrow, AuthorizationError } from '@/lib/auth/guards';
import { getCloudinaryConfig, signUploadParams } from '@/lib/storage/cloudinary';

const mediaKinds = ['judge', 'sponsor'] as const;

export async function POST(request: Request) {
  try {
    await requireRoleOrThrow('admin');
  } catch (error) {
    const status =
      error instanceof AuthorizationError && error.code === 'unauthenticated' ? 401 : 403;
    return NextResponse.json({ error: 'Not authorized to upload media.' }, { status });
  }

  let body: { kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }
  if (!mediaKinds.includes(body.kind as (typeof mediaKinds)[number])) {
    return NextResponse.json({ error: 'Choose a valid media type.' }, { status: 400 });
  }

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `content/${body.kind}s/${randomUUID()}`;
    const params = {
      timestamp,
      public_id: publicId,
      allowed_formats: body.kind === 'sponsor' ? 'jpg,jpeg,png,webp,svg' : 'jpg,jpeg,png,webp',
      transformation:
        body.kind === 'judge'
          ? 'c_limit,w_1600,h_1600,q_auto:good'
          : 'c_limit,w_1600,h_800,q_auto:good',
      overwrite: 'false',
      invalidate: 'false',
    };
    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
        api_key: apiKey,
        signature: signUploadParams(params, apiSecret),
      },
    });
  } catch (error) {
    console.error('[admin upload] signing failed', error);
    return NextResponse.json({ error: 'Media uploads are not configured.' }, { status: 503 });
  }
}
