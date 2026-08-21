import { redirect } from 'next/navigation';
import { Admin2FASetupForm } from '@/components/auth/admin-2fa-setup-form';
import { getCurrentUser } from '@/lib/auth/guards';

export const instant = false;

export const metadata = {
  title: 'Set Up Admin 2FA | Canadian Country Star',
};

export default async function Admin2FASetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'admin') redirect('/login');
  if (user.twoFactorEnabled) redirect('/admin');

  return <Admin2FASetupForm />;
}
