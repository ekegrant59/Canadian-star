import { requireRole } from '@/lib/auth/guards';
import { getAdminApplications } from '@/server/queries/admin';
import { getCompetitionStage } from '@/server/queries/public';
import { AdminApplicationsList } from '@/components/admin/admin-applications-list';

export const instant = false;

export default async function AdminApplicationsPage() {
  await requireRole('admin');
  const [applications, currentStage] = await Promise.all([
    getAdminApplications(),
    getCompetitionStage(),
  ]);
  return (
    <AdminApplicationsList applications={applications} showVoting={currentStage === 'voting'} />
  );
}
