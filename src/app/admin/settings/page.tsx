import { redirect } from 'next/navigation';
import { AdminSettingsView } from '@/components/admin/admin-settings-view';
import { requireRole } from '@/lib/auth/guards';
import { getAdminUsers } from '@/server/queries/admin-users';

export const instant = false;

export const metadata = {
  title: 'Admin Access Settings | Canadian Country Star',
  description: 'Manage administrator accounts, permissions, and access status.',
};

export default async function AdminSettingsPage() {
  const currentUser = await requireRole('admin');
  if (currentUser.adminAccessLevel !== 'super') redirect('/admin');
  const administrators = await getAdminUsers();
  return <AdminSettingsView currentUserId={currentUser.id} administrators={administrators} />;
}
