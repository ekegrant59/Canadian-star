'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AGE_MINIMUM } from '@/config/event';
import { signUpSchema } from '@/lib/validation/auth';
import { signUpAction, verifySignupEmailAction } from '@/server/actions/auth';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const signupFormRef = useRef<HTMLFormElement | null>(null);
  const autoSubmittedCodeRef = useRef('');

  useEffect(() => {
    if (
      !pendingVerification ||
      verificationCode.length !== 6 ||
      isPending ||
      autoSubmittedCodeRef.current === verificationCode
    )
      return;
    autoSubmittedCodeRef.current = verificationCode;
    signupFormRef.current?.requestSubmit();
  }, [pendingVerification, verificationCode, isPending]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      confirmedAge: isAgeConfirmed,
      acceptedTerms: isTermsAgreed,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }

    startTransition(async () => {
      const result = await signUpAction(parsed.data, redirectParam ?? undefined);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.data.requiresEmailVerification) {
        setPendingVerification(true);
        setSuccess(`We sent a six-digit verification code to ${result.data.email}.`);
        return;
      }
    });
  };

  const handleVerify = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifySignupEmailAction({
        fullName,
        email,
        password,
        code: verificationCode,
        redirectTo: redirectParam ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess('Account created. Taking you to your application.');
      router.refresh();
      router.push(result.data.redirectTo);
    });
  };

  const handleResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(
        {
          fullName,
          email,
          password,
          confirmPassword: password,
          confirmedAge: true,
          acceptedTerms: true,
        },
        redirectParam ?? undefined,
        { resend: true },
      );
      if (!result.ok) setError(result.error);
      else setSuccess(`A new verification code was sent to ${result.data.email}.`);
    });
  };

  const loginHref = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : '/login';

  return (
    <form
      ref={signupFormRef}
      className="auth-form"
      onSubmit={pendingVerification ? handleVerify : handleSubmit}
      noValidate
    >
      {error && (
        <div className="auth-error-banner" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="auth-success-banner" role="status">
          {success}
        </div>
      )}

      {pendingVerification && (
        <div className="auth-field">
          <label className="auth-label" htmlFor="verificationCode">
            EMAIL VERIFICATION CODE
          </label>
          <input
            id="verificationCode"
            name="verificationCode"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            className="auth-input"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => {
              autoSubmittedCodeRef.current = '';
              setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            }}
            onPaste={(e) => {
              e.preventDefault();
              autoSubmittedCodeRef.current = '';
              setVerificationCode(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
            }}
            required
            disabled={isPending}
            autoComplete="one-time-code"
          />
          <p className="auth-helper-text">
            The code expires in 10 minutes and can only be used once.
          </p>
          <button
            type="button"
            className="auth-footer-link"
            onClick={handleResend}
            disabled={isPending}
          >
            RESEND CODE
          </button>
        </div>
      )}

      {!pendingVerification && (
        <>
          {/* Full Name */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="fullName">
              FULL NAME
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="auth-input"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              disabled={isPending}
            />
          </div>

          {/* Email Address */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              EMAIL ADDRESS
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="auth-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              PASSWORD
            </label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isPending}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">
              CONFIRM PASSWORD
            </label>
            <div className="auth-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isPending}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Age Checkbox */}
          <label className="auth-checkbox-group">
            <input
              type="checkbox"
              className="auth-checkbox"
              checked={isAgeConfirmed}
              onChange={(e) => setIsAgeConfirmed(e.target.checked)}
              disabled={isPending}
            />
            <span className="auth-checkbox-label">
              I confirm that I am {AGE_MINIMUM} years of age or older
            </span>
          </label>
        </>
      )}

      {/* Terms Checkbox */}
      <label className="auth-checkbox-group">
        <input
          type="checkbox"
          className="auth-checkbox"
          checked={isTermsAgreed}
          onChange={(e) => setIsTermsAgreed(e.target.checked)}
          disabled={isPending}
        />
        <span className="auth-checkbox-label">
          I have read and agree to the{' '}
          <Link href="/terms" className="auth-checkbox-link" onClick={(e) => e.stopPropagation()}>
            Terms and Conditions
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="auth-checkbox-link" onClick={(e) => e.stopPropagation()}>
            Privacy Policy
          </Link>
        </span>
      </label>

      {/* Submit Button */}
      <button type="submit" className="auth-submit-btn" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            {pendingVerification ? 'VERIFYING EMAIL...' : 'CREATING ACCOUNT...'}
          </>
        ) : pendingVerification ? (
          'VERIFY EMAIL & CREATE ACCOUNT'
        ) : (
          'CREATE ACCOUNT'
        )}
      </button>

      {/* Footer Link */}
      <p className="auth-footer">
        Already have an account?
        <Link href={loginHref} className="auth-footer-link">
          Login
        </Link>
      </p>
    </form>
  );
}
