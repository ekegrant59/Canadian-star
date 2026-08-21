import { requireRole } from '@/lib/auth/guards';
import { getAdminDashboardData } from '@/server/queries/admin';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

export const instant = false;

export default async function AdminDashboardPage() {
  await requireRole('admin');
  const data = await getAdminDashboardData();
  return <AdminDashboardClient {...data} />;
}
