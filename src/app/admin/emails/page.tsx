import { EmailStudioView } from '@/components/admin/emails/email-studio-view';
import { getAdminEmailRecipients } from '@/server/queries/admin';
import { requireRole } from '@/lib/auth/guards';

export const metadata = {
  title: 'Email Management & Studio | Admin Portal',
  description:
    'Manage transactional email templates, create custom broadcasts with WYSIWYG editor, and preview rendering.',
};
export const instant = false;

export default async function AdminEmailsPage() {
  await requireRole('admin');
  const recipients = await getAdminEmailRecipients();
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <EmailStudioView recipients={recipients} />
    </div>
  );
}
