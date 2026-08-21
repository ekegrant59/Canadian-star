import { Suspense } from 'react';
import { AdminInvitationForm } from '@/components/auth/admin-invitation-form';

export const instant = false;

export const metadata = { title: 'Accept Admin Invitation | Canadian Country Star' };

export default function AdminInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e0e]" />}>
      <AdminInvitationForm />
    </Suspense>
  );
}
