'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { acceptAdminInvitationAction } from '@/server/actions/admin-users';

export function AdminInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptAdminInvitationAction({ token, password, confirmPassword });
      if (!result.ok) return setError(result.error);
      router.refresh();
      router.push(result.data.redirectTo);
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0e0e] p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#181818] p-7 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF5C00]/30 bg-[#FF5C00]/10">
            <KeyRound className="h-7 w-7 text-[#FF5C00]" />
          </div>
          <h1 className="mt-4 text-2xl font-black uppercase">Create your admin password</h1>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            Choose a private password for your administrator account. After this, you will configure
            authenticator-app 2FA.
          </p>
        </div>
        {!token && (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs text-red-300">
            This invitation link is incomplete. Ask a super admin to resend it.
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
            Password
            <input
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#333] bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-[#FF5C00]"
            />
          </label>
          <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
            Confirm password
            <input
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#333] bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-[#FF5C00]"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs font-semibold text-red-300"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isPending || !token}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-xs font-bold tracking-wider uppercase disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Create password and continue
          </button>
        </form>
      </div>
    </main>
  );
}
