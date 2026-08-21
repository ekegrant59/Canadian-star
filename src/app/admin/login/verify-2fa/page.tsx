'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { useOtpFields } from '@/hooks/use-otp-fields';

export default function Admin2FAVerifyPage() {
  const router = useRouter();
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyCode = useCallback(
    async (codeToVerify?: string) => {
      if (isVerifying) return;
      setIsVerifying(true);
      setError(null);
      const result = isBackupMode
        ? await authClient.twoFactor.verifyBackupCode({
            code: backupCode,
            trustDevice: rememberDevice,
          })
        : await authClient.twoFactor.verifyTotp({
            code: codeToVerify ?? '',
            trustDevice: rememberDevice,
          });
      if (result.error) {
        setIsVerifying(false);
        setError(result.error.message || 'That security code is not valid.');
        return;
      }
      router.refresh();
      router.push('/admin');
    },
    [isBackupMode, backupCode, rememberDevice, isVerifying, router],
  );

  const {
    digits: otpDigits,
    inputRefs,
    handleChange: handleDigitChange,
    handlePaste,
    handleKeyDown,
  } = useOtpFields(6, (code) => {
    if (!isBackupMode) void verifyCode(code);
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyCode(otpDigits.join(''));
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0e0e0e] px-4 py-12 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="text-center sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF5C00]/30 bg-[#FF5C00]/10 shadow-lg">
          <ShieldCheck className="h-7 w-7 text-[#FF5C00]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase sm:text-3xl">
          Two-Factor Authentication
        </h1>
        <p className="mt-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {isBackupMode ? 'Enter Backup Recovery Code' : 'Enter 6-Digit Authenticator Code'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="space-y-6 rounded-2xl border border-[#2a2a2a] bg-[#181818] px-6 py-8 shadow-2xl sm:px-10">
          <form onSubmit={handleVerify} className="space-y-6">
            {error && (
              <div
                className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs font-semibold text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}
            {!isBackupMode ? (
              <div>
                <label className="mb-3 block text-center text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Authentication Code
                </label>
                <div className="flex items-center justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`verify-otp-${idx}`}
                      ref={(element) => {
                        inputRefs.current[idx] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onPaste={(e) => handlePaste(idx, e)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="h-12 w-11 rounded-xl border border-[#333] bg-[#121212] text-center text-lg font-black text-white focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00] focus:outline-hidden sm:w-12"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Emergency Recovery Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8831-9024"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="w-full rounded-xl border border-[#333] bg-[#121212] p-3 text-center font-mono text-sm tracking-wider text-white uppercase focus:ring-2 focus:ring-[#FF5C00] focus:outline-hidden"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={
                isVerifying ||
                (!isBackupMode && otpDigits.some((d) => !d)) ||
                (isBackupMode && !backupCode)
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-xs font-bold tracking-wider text-white uppercase shadow-md transition-colors hover:bg-[#e05200] disabled:opacity-50"
            >
              <span>
                {isVerifying ? 'VERIFYING SECURITY CODE...' : 'VERIFY & ENTER ADMIN PORTAL'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Toggle between standard OTP and backup recovery codes */}
          <div className="border-t border-[#262626] pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsBackupMode(!isBackupMode)}
              className="text-xs font-bold tracking-wider text-gray-400 uppercase hover:text-white"
            >
              {isBackupMode ? '← Use Authenticator App Code' : 'Use a Backup Recovery Code Instead'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-xs font-bold tracking-wider text-gray-400 uppercase hover:text-white"
          >
            ← Return to Credentials Login
          </Link>
        </div>
      </div>
    </div>
  );
}
