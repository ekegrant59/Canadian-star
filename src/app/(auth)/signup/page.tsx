import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-card';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join the competition to showcase your talent. Register your artist account.',
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start your Canadian Country Star application."
      headerAction={
        <>
          Already have an account?{' '}
          <Link href="/login?redirect=%2Fartist">Log in to check your application</Link>
        </>
      }
    >
      <Suspense fallback={<div className="text-text-subtle py-8 text-center">Loading form...</div>}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
