'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInSchema } from '@/lib/validation/auth';
import { signInAction } from '@/server/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Same schema the server action runs. Catching it here buys fast feedback
    // and nothing else; the server validates again either way.
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }

    startTransition(async () => {
      const result = await signInAction(parsed.data, redirectParam ?? undefined);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess('Signed in. Taking you to your dashboard.');
      /**
       * refresh() before push(), so the server components re-render holding the
       * new session cookie. Without it the destination renders its signed-out
       * state from the router cache and bounces straight back here.
       */
      router.refresh();
      router.push(result.data.redirectTo);
    });
  };

  const signupHref = redirectParam
    ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/signup';

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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

      {/* Submit Button */}
      <button type="submit" className="auth-submit-btn" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            SIGNING IN...
          </>
        ) : (
          'SIGN IN'
        )}
      </button>

      {/* Footer Link */}
      <p className="auth-footer">
        Don&rsquo;t have an account?
        <Link href={signupHref} className="auth-footer-link">
          Sign Up
        </Link>
      </p>
    </form>
  );
}
