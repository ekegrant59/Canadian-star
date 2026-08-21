import { NextResponse } from 'next/server';
import { requestVoteOtpAction } from '@/server/actions/voting';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16_384)
    return NextResponse.json({ ok: false, error: 'Request too large.' }, { status: 413 });
  try {
    const result = await requestVoteOtpAction(await request.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid voting request.' }, { status: 400 });
  }
}
