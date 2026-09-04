import { requireRole } from '@/lib/auth/guards';
import { getAdminReapprovalApplications } from '@/server/queries/admin';
import { ArtistReapprovalList } from '@/components/admin/artist-reapproval-list';

export const instant = false;

export default async function AdminReapprovalPage() {
  await requireRole('admin');
  const applications = await getAdminReapprovalApplications();
  return <ArtistReapprovalList applications={applications} />;
}
