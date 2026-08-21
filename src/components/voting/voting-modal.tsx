'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Info, ArrowRight, X, Check, AlertCircle } from 'lucide-react';
import type { BasePublicArtist } from '@/types/landing';
import {
  requestVoteOtpAction,
  resendVoteOtpAction,
  verifyVoteOtpAction,
} from '@/server/actions/voting';
import { TurnstileField } from './turnstile-field';
import { useOtpFields } from '@/hooks/use-otp-fields';

export type VotingModalStep = 'email' | 'verify' | 'success' | 'error';

export interface VotingModalProps {
  isOpen: boolean;
  artist: BasePublicArtist | null;
  initialStep?: VotingModalStep;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VotingModal({
  isOpen,
  artist,
  initialStep = 'email',
  onClose,
  onSuccess,
}: VotingModalProps) {
  const [step, setStep] = useState<VotingModalStep>(initialStep);
  const [email, setEmail] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voteId, setVoteId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileIdempotencyKey, setTurnstileIdempotencyKey] = useState<string | undefined>();
  const [securityCheckReady, setSecurityCheckReady] = useState(
    process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist || !email || !/^\S+@\S+\.\S+$/.test(email)) return;

    setIsLoading(true);
    setErrorMessage('');
    const result = await requestVoteOtpAction({
      artistId: artist.id,
      email,
      marketingOptIn: optIn,
      deviceId: getVotingDeviceId(),
      turnstileToken,
      turnstileIdempotencyKey,
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error);
      if (result.error.toLowerCase().includes('already')) setStep('error');
      return;
    }
    setVoteId(result.data.voteId);
    setResendCount(0);
    setResendAvailableAt(Date.now() + 60_000);
    setDevCode(result.data.devCode ?? null);
    setStep('verify');
  };

  const verifyCode = async (fullCode: string) => {
    if (isLoading) return;
    if (fullCode.length < 6) {
      setCodeError(true);
      return;
    }

    if (!voteId) return;
    setIsLoading(true);
    const result = await verifyVoteOtpAction({ voteId, email, code: fullCode });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error);
      setCodeError(true);
      return;
    }
    setStep('success');
    onSuccess?.();
  };

  const {
    digits: code,
    inputRefs,
    handleChange: handleCodeChange,
    handlePaste,
    handleKeyDown,
    reset: resetCode,
  } = useOtpFields(6, (fullCode) => {
    if (step === 'verify') void verifyCode(fullCode);
  });

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyCode(code.join(''));
  };

  useEffect(() => {
    if (!resendAvailableAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setResendSeconds(remaining);
      if (!remaining) setResendAvailableAt(null);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  if (!isOpen || !artist) return null;

  return (
    <div
      className="voting-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div className="voting-modal-wrapper animate-modal-in" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="voting-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ---------------- STEP 1: EMAIL ENTRY (Voting Modal Container.svg) ---------------- */}
        {step === 'email' && (
          <div className="modal-card modal-card-email">
            <div className="modal-step-badge">STEP 1 OF 2</div>
            <h2 id="modal-title" className="modal-heading">
              CAST YOUR VOTE
            </h2>

            <div className="modal-artist-target">
              <span className="target-prefix">You are voting for: </span>
              <Link
                href={`/artists/${artist.slug}`}
                className="target-artist-name target-artist-link"
                onClick={onClose}
                title={`View ${artist.name}'s profile`}
              >
                {artist.name}
              </Link>
            </div>

            <form onSubmit={handleSendCode} className="modal-form">
              <div className="form-group">
                <label className="form-label sr-only" htmlFor="vote-email">
                  Email address
                </label>
                <div className="modal-input-wrap">
                  <Mail className="modal-input-icon" aria-hidden="true" />
                  <input
                    id="vote-email"
                    type="email"
                    required
                    autoFocus
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="modal-text-input"
                  />
                </div>
              </div>

              <div className="modal-helper-text">
                <Info className="text-text-subtle h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>We&apos;ll send a verification code to confirm your vote.</span>
              </div>

              <TurnstileField
                onAvailabilityChange={setSecurityCheckReady}
                onToken={(token) => {
                  setTurnstileToken(token);
                  if (token && typeof window !== 'undefined')
                    setTurnstileIdempotencyKey(window.crypto.randomUUID());
                }}
              />

              {errorMessage && (
                <div className="modal-error-banner" role="alert">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <label className="modal-checkbox-row">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="modal-checkbox"
                />
                <span className="checkbox-label">
                  I&apos;d like to receive competition updates and ticket information by email.
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading || !email || !securityCheckReady}
                className="button button-primary modal-action-btn"
              >
                <span>{isLoading ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'}</span>
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </button>

              <button type="button" onClick={onClose} className="modal-cancel-link">
                CANCEL & RETURN
              </button>
            </form>
          </div>
        )}

        {/* ---------------- STEP 2: VERIFICATION CODE (Verfication Card.svg) ---------------- */}
        {step === 'verify' && (
          <div className="modal-card modal-card-verify">
            <div className="modal-step-badge">STEP 2 OF 2</div>

            <div className="verify-envelope-icon-wrap">
              <Mail className="text-primary h-6 w-6" aria-hidden="true" />
            </div>

            <h2 id="modal-title" className="modal-heading">
              VERIFY YOUR EMAIL
            </h2>

            <p className="modal-verify-subhead">
              We&apos;ve sent a verification code to{' '}
              <strong className="text-white">{email || 'your email'}</strong>. Enter it below to
              confirm your vote for{' '}
              <Link
                href={`/artists/${artist.slug}`}
                className="text-primary font-bold hover:underline"
                onClick={onClose}
              >
                {artist.name}
              </Link>
              .
            </p>

            <form onSubmit={handleVerifyCode} className="modal-form">
              {devCode && (
                <p className="text-text-subtle text-center text-xs">
                  Development code: <strong className="text-white">{devCode}</strong>
                </p>
              )}
              <div className="otp-inputs-grid">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onPaste={(e) => handlePaste(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`otp-digit-field ${codeError ? 'otp-field-error' : ''}`}
                    aria-label={`Digit ${idx + 1} of verification code`}
                  />
                ))}
              </div>

              {codeError && (
                <div className="modal-error-banner" role="alert">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span>That verification code isn&apos;t valid. Please try again.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || code.some((d) => !d)}
                className="button button-primary modal-action-btn"
              >
                <span>{isLoading ? 'VERIFYING...' : 'VERIFY & CAST VOTE'}</span>
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </button>

              <div className="verify-footer-links">
                <button
                  type="button"
                  className="resend-code-btn"
                  disabled={isLoading || resendSeconds > 0}
                  onClick={async () => {
                    if (!voteId || resendSeconds > 0) return;
                    setIsLoading(true);
                    const result = await resendVoteOtpAction({ voteId, email });
                    setIsLoading(false);
                    if (!result.ok) {
                      setErrorMessage(result.error);
                      const match = result.error.match(/(\d+)m(?: (\d+)s)?/);
                      if (match)
                        setResendAvailableAt(
                          Date.now() + (Number(match[1]) * 60 + Number(match[2] ?? 0)) * 1000,
                        );
                      return;
                    }
                    const nextResendCount = resendCount + 1;
                    setResendCount(nextResendCount);
                    setResendAvailableAt(
                      Date.now() + Math.min(60 * 2 ** nextResendCount, 15 * 60) * 1000,
                    );
                    setDevCode(result.data.devCode ?? null);
                    resetCode();
                    setCodeError(false);
                  }}
                >
                  {resendSeconds
                    ? `RESEND IN ${Math.floor(resendSeconds / 60)}:${String(resendSeconds % 60).padStart(2, '0')}`
                    : 'RESEND CODE'}
                </button>
                <span className="text-text-subtle">•</span>
                <button type="button" className="change-email-btn" onClick={() => setStep('email')}>
                  Change email
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------- STEP 3: SUCCESS CONFIRMATION (Main Confirmation Card.svg) ---------------- */}
        {step === 'success' && (
          <div className="modal-card modal-card-confirmation">
            <div className="confirmation-badge-wrap">
              <div className="confirmation-icon-box">
                <Check className="text-primary h-8 w-8 stroke-[3]" aria-hidden="true" />
              </div>
            </div>

            <h2 id="modal-title" className="modal-heading text-center">
              YOUR VOTE HAS BEEN COUNTED
            </h2>

            <p className="modal-confirmation-subhead">
              Thank you for supporting <strong className="text-primary">{artist.name}</strong>. Your
              verified vote has been counted for this voting round.
            </p>

            <Link
              href={`/artists/${artist.slug}`}
              className="confirmation-artist-chip hover:border-primary transition-colors"
              onClick={onClose}
              title={`View ${artist.name}'s profile`}
            >
              <div className="chip-avatar">
                <Image
                  src={artist.photoUrl}
                  alt={artist.name}
                  width={48}
                  height={48}
                  unoptimized
                  style={{ objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
              <div className="chip-info">
                <h4>{artist.name}</h4>
                <span>
                  {artist.hometown} • {artist.genre}
                </span>
              </div>
            </Link>

            <div className="confirmation-buttons-row">
              <Link
                href="/artists"
                className="button button-primary confirmation-btn-main"
                onClick={onClose}
              >
                EXPLORE MORE ARTISTS
              </Link>
              <button
                type="button"
                className="button button-secondary confirmation-btn-sec"
                onClick={onClose}
              >
                BACK TO COMPETITION
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP 4: ERROR / ALREADY CAST (Error Card.svg) ---------------- */}
        {step === 'error' && (
          <div className="modal-card modal-card-error">
            <div className="error-icon-box">
              <span className="error-exclamation-mark" aria-hidden="true">
                !
              </span>
            </div>

            <h2 id="modal-title" className="modal-heading text-center text-red-400">
              VOTE ALREADY CAST
            </h2>

            <p className="modal-error-subhead">
              This email address has already been used to vote during this voting round. Only one
              vote per verified email address is permitted to ensure fair competition.
            </p>

            <div className="error-actions">
              <button
                type="button"
                className="button button-primary modal-action-btn"
                onClick={onClose}
              >
                EXPLORE THE COMPETITION
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getVotingDeviceId() {
  const key = 'canadian-star-vote-device';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = window.crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}
