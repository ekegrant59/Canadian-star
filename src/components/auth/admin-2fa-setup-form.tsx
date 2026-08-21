'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowRight, Check, Copy, KeyRound, Loader2, Smartphone } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export function Admin2FASetupForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const verificationFormRef = useRef<HTMLFormElement | null>(null);
  const autoSubmittedCodeRef = useRef('');

  useEffect(() => {
    if (!totpUri || code.length !== 6 || isPending || autoSubmittedCodeRef.current === code) return;
    autoSubmittedCodeRef.current = code;
    verificationFormRef.current?.requestSubmit();
  }, [totpUri, code, isPending]);

  const beginSetup = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data) {
        setError(result.error?.message || 'Could not start two-factor setup. Check your password.');
        return;
      }
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setQrCode(await QRCode.toDataURL(result.data.totpURI, { width: 240, margin: 1 }));
    });
  };

  const verifySetup = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.message || 'That authentication code is not valid.');
        return;
      }
      router.refresh();
      router.push('/admin');
    });
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0e0e0e] px-4 py-12 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="text-center sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg">
          <KeyRound className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase sm:text-3xl">
          Set Up Authenticator 2FA
        </h1>
        <p className="mt-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Required for administrator access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="space-y-6 rounded-2xl border border-[#2a2a2a] bg-[#181818] px-6 py-8 shadow-2xl sm:px-10">
          {error && (
            <div
              className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs font-semibold text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          {!totpUri ? (
            <form onSubmit={beginSetup} className="space-y-5">
              <div className="flex gap-3 rounded-lg border border-[#2c2c2c] bg-[#121212] p-4">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5C00]" />
                <p className="text-xs leading-relaxed text-gray-400">
                  Confirm your admin password to generate a private authenticator secret and
                  one-time recovery codes.
                </p>
              </div>
              <label
                className="block text-xs font-bold tracking-wider text-gray-300 uppercase"
                htmlFor="setup-password"
              >
                Admin password
              </label>
              <input
                id="setup-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#333] bg-[#121212] px-4 py-3 text-xs text-white focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/40 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={isPending || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e05200] disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Generate Secure Setup
              </button>
            </form>
          ) : (
            <form ref={verificationFormRef} onSubmit={verifySetup} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                <div className="flex justify-center rounded-xl bg-white p-3">
                  {qrCode && (
                    <Image
                      src={qrCode}
                      alt="Authenticator QR code"
                      width={220}
                      height={220}
                      unoptimized
                    />
                  )}
                </div>
                <div className="space-y-3 text-xs text-gray-400">
                  <p>
                    Scan this code with Google Authenticator, 1Password, Authy, or another TOTP app.
                  </p>
                  <p className="rounded-lg border border-[#2c2c2c] bg-[#101010] p-2 font-mono text-[10px] break-all text-emerald-400">
                    {totpUri}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-gray-300 uppercase">
                    Recovery codes
                  </span>
                  <button
                    type="button"
                    onClick={copyBackupCodes}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#FF5C00]"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy codes'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-gray-400">
                  {backupCodes.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="mb-2 block text-xs font-bold tracking-wider text-gray-300 uppercase"
                  htmlFor="setup-code"
                >
                  6-digit code
                </label>
                <input
                  id="setup-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => {
                    autoSubmittedCodeRef.current = '';
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    autoSubmittedCodeRef.current = '';
                    setCode(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
                  }}
                  className="w-full rounded-xl border border-[#333] bg-[#121212] p-3 text-center font-mono text-xl tracking-[0.35em] text-white focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00] focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e05200] disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}{' '}
                Activate 2FA & Enter Dashboard
              </button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-xs font-bold tracking-wider text-gray-400 uppercase hover:text-white"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
