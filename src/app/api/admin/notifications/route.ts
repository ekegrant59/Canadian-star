import { NextResponse } from 'next/server';
import { requireRoleOrThrow } from '@/lib/auth/guards';
import { getAdminPendingCounts } from '@/server/queries/admin';

export async function GET() {
  try {
    await requireRoleOrThrow('admin');
    return NextResponse.json(await getAdminPendingCounts());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
