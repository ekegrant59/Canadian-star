import { requireRole } from '@/lib/auth/guards';
import { getAdminApplications, getAdminArtistSignups } from '@/server/queries/admin';
import { getCompetitionStage } from '@/server/queries/public';
import { AdminApplicationsList } from '@/components/admin/admin-applications-list';

export const instant = false;

export default async function AdminApplicationsPage() {
  await requireRole('admin');
  const [applications, signups, currentStage] = await Promise.all([
    getAdminApplications(),
    getAdminArtistSignups(),
    getCompetitionStage(),
  ]);
  return (
    <AdminApplicationsList
      applications={[...applications, ...signups]}
      showVoting={currentStage === 'voting'}
    />
  );
}
