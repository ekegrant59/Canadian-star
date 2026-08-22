'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { adminSignInAction } from '@/server/actions/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLogin] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startLogin(async () => {
      const result = await adminSignInAction({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.data.redirectTo.startsWith('/admin')) {
        setError('This account does not have administrator access.');
        return;
      }
      router.refresh();
      router.push(result.data.redirectTo);
    });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0e0e0e] px-4 py-12 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="text-center sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase sm:text-3xl">
          Admin Portal Access
        </h1>
        <p className="mt-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Restricted Personnel Only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#181818] px-6 py-8 shadow-2xl sm:px-10">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div
                className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs font-semibold text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}
            <div>
              <label
                className="mb-1.5 block text-xs font-bold tracking-wider text-gray-300 uppercase"
                htmlFor="admin-email"
              >
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#333] bg-[#121212] py-2.5 pr-4 pl-10 text-xs text-white placeholder:text-gray-500 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/40 focus:outline-hidden"
                  placeholder="name@example.ca"
                />
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-bold tracking-wider text-gray-300 uppercase"
                htmlFor="admin-password"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#333] bg-[#121212] py-2.5 pr-4 pl-10 text-xs text-white placeholder:text-gray-500 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/40 focus:outline-hidden"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-xs font-bold tracking-wider text-white uppercase shadow-md transition-colors hover:bg-[#e05200]"
            >
              <span>{isLoading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN TO ADMIN PORTAL'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-bold tracking-wider text-gray-400 uppercase hover:text-white"
          >
            ← Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
