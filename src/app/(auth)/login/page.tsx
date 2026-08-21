import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Enter your credentials to access your Canadian Star competition account.',
};

export default function LoginPage() {
  return (
    <AuthLayout title="Sign In" subtitle="Continue your Canadian Country Star application.">
      <Suspense fallback={<div className="text-text-subtle py-8 text-center">Loading form...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
