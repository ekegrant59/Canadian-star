import { ContentManagementView } from '@/components/admin/content-management-view';
import { requireRole } from '@/lib/auth/guards';

export const instant = false;

export const metadata = {
  title: 'Content Management | Admin Portal | Canadian Star',
  description: 'Manage public-facing announcements and status texts.',
};

export default async function AdminContentPage() {
  await requireRole('admin');
  return <ContentManagementView />;
}
