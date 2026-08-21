import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new Response('Missing image URL', { status: 400 });
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response('Invalid image URL', { status: 400 });
  }
  if (url.protocol !== 'https:') return new Response('Invalid image URL', { status: 400 });
  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) return new Response('Image unavailable', { status: 404 });
    const type = upstream.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return new Response('Not an image', { status: 415 });
    return new Response(upstream.body, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  } catch {
    return new Response('Image unavailable', { status: 404 });
  }
}
