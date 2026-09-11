import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Enter your credentials to access your Canadian Star competition account.',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign In"
      subtitle="Continue your Canadian Country Star application."
      headerAction={
        <>
          New to Canadian Country Star?{' '}
          <Link href="/signup?redirect=%2Fartist">Create an account to start your application</Link>
        </>
      }
    >
      <Suspense fallback={<div className="text-text-subtle py-8 text-center">Loading form...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
