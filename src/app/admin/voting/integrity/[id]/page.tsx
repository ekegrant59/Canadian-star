import { VoteIntegrityDetailView } from '@/components/admin/voting/vote-integrity-detail-view';
import { requireRole } from '@/lib/auth/guards';
import { getAdminVoteDetail } from '@/server/queries/admin';

export const instant = false;

interface VoteIntegrityPageProps {
  params: Promise<{ id: string }>;
}

export default async function VoteIntegrityPage({ params }: VoteIntegrityPageProps) {
  await requireRole('admin');
  const { id } = await params;
  const detail = await getAdminVoteDetail(id);
  return <VoteIntegrityDetailView id={id} detail={detail} />;
}
