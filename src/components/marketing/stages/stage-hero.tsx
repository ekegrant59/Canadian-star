'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays,
  MapPin,
  Sparkles,
  Trophy,
  ArrowRight,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import type { LandingStageViewModel } from '@/types/landing';
import { subscribeToNewsletterAction } from '@/server/actions/newsletter';

const STAGE_HERO_IMAGES: Record<string, string> = {
  applications: '/images/reference/image0_4_4.png',
  voting: '/images/reference/image0_4_4.png',
  anticipation: '/images/reference/image0_4_4.png',
  finalists: '/images/reference/image0_4_4.png',
};

interface StageHeroProps {
  viewModel: LandingStageViewModel;
}

export function StageHero({ viewModel }: StageHeroProps) {
  const { stage, kicker, headline, subhead, datePillText, locationPillText, primaryCta } =
    viewModel;

  const heroImage = STAGE_HERO_IMAGES[stage] ?? '/images/reference/image0_4_4.png';
  const lines = headline.split('\n');

  // Newsletter state for anticipation stage hero card
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newsletterModal, setNewsletterModal] = useState<{
    kind: 'success' | 'already_registered' | 'error';
    message: string;
  } | null>(null);

  const handleAnticipationAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || isSubmitting) return;

    setIsSubmitting(true);
    setNewsletterModal(null);

    try {
      const result = await subscribeToNewsletterAction({ email: emailInput });
      if (result.ok) {
        if (result.data.status === 'already_registered') {
          setNewsletterModal({ kind: 'already_registered', message: result.data.message });
        } else {
          setNewsletterModal({ kind: 'success', message: result.data.message });
          setEmailInput('');
        }
      } else {
        setNewsletterModal({
          kind: 'error',
          message: result.error || 'Subscription failed. Please try again.',
        });
      }
    } catch {
      setNewsletterModal({
        kind: 'error',
        message: 'Unable to subscribe right now. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`hero hero-${stage}`} id="top">
      <Image
        src={heroImage}
        alt="The Next Great Canadian Country Star Competition stage and crowd"
        fill
        priority
        unoptimized
        style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
      />
      <div className="hero-scrim" />

      <div className="hero-content container-content">
        {/* Stage Eyebrow Pill */}
        <div className={`hero-stage-badge hero-stage-badge-${stage}`}>
          {stage === 'anticipation' ? (
            <span className="inline-flex items-center">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]" />
              <span>{kicker}</span>
            </span>
          ) : stage === 'finalists' ? (
            <>
              <Trophy className="badge-icon" aria-hidden="true" />
              <span>{kicker}</span>
            </>
          ) : (
            <>
              {stage === 'applications' && <Sparkles className="badge-icon" aria-hidden="true" />}
              <span>{kicker}</span>
            </>
          )}
        </div>

        {/* Dynamic Main Heading with Two-Tone Line Styling */}
        <h1 className="hero-heading">
          {lines.map((line, idx) => {
            const isAccentLine = idx === 1;
            let lineClass = 'block';

            if (isAccentLine) {
              if (stage === 'voting') {
                lineClass += ' text-[#FFB59A]'; // Warm peach / salmon matching vote web landing page.svg
              } else if (stage === 'anticipation' || stage === 'finalists') {
                lineClass += ' text-[#FF5C00]'; // Vibrant orange matching anticipation web landing page.svg
              } else {
                lineClass += ' text-[#FF5C00]';
              }
            } else {
              lineClass += ' text-white';
            }

            return (
              <span key={idx} className={lineClass}>
                {line}
              </span>
            );
          })}
        </h1>

        {/* Subhead */}
        <p className="hero-subhead mx-auto max-w-2xl">{subhead}</p>

        {/* Date & Location Pill - Preserved Across All Stages */}
        {(datePillText || locationPillText) && (
          <div className="hero-date" aria-label="Event information">
            {datePillText && (
              <span className="date-item">
                <CalendarDays aria-hidden="true" />
                <span>{datePillText}</span>
              </span>
            )}
            {datePillText && locationPillText && (
              <span className="date-sep" aria-hidden="true">
                |
              </span>
            )}
            {locationPillText && (
              <span className="date-item">
                <MapPin aria-hidden="true" />
                <span>{locationPillText}</span>
              </span>
            )}
          </div>
        )}

        {/* Stage-Specific Hero CTA Section */}
        {stage === 'anticipation' ? (
          /* Exact Match: Center Glassmorphism Card in anticipation web landing page.svg */
          <div className="mx-auto mt-8 w-full max-w-xl space-y-5 rounded-2xl border border-white/15 bg-[#141414]/80 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
            <div>
              <p className="mb-1 text-[11px] font-bold tracking-[0.2em] text-[#A8A29E] uppercase">
                MARK YOUR CALENDARS
              </p>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase sm:text-2xl">
                THE FINAL 16 WILL BE REVEALED
              </h2>
            </div>

            {/* Email Alerts Form */}
            <form onSubmit={handleAnticipationAlertSubmit} className="mx-auto max-w-md space-y-4">
              <div className="relative flex items-center border-b border-[#555] px-1 py-2 transition-colors focus-within:border-[#FF5C00]">
                <Mail className="mr-3 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email for updates"
                  className="w-full bg-transparent text-sm text-white placeholder-[#888] focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#FF5C00] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase shadow-md transition-all hover:bg-[#E05200] disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>GET NOTIFIED</span>
                </button>

                <Link
                  href="#schedule"
                  className="w-full cursor-pointer rounded-md border border-white/25 bg-transparent px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white/10 sm:w-auto"
                >
                  GET TICKETS
                </Link>
              </div>
            </form>
          </div>
        ) : (
          /* Standard Action Buttons (Voting, Applications, Finalists) */
          <div className="hero-buttons">
            <Link
              className="button button-primary hero-btn-main"
              href={primaryCta.href}
              id="hero-primary-cta"
            >
              <span>{primaryCta.label}</span>
              <ArrowRight className="btn-arrow" aria-hidden="true" />
            </Link>

            {primaryCta.secondaryLabel && primaryCta.secondaryHref && (
              <Link
                className="button button-secondary hero-btn-sec"
                href={primaryCta.secondaryHref}
                id="hero-secondary-cta"
              >
                {primaryCta.secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </div>
      {newsletterModal && (
        <div
          className="newsletter-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anticipation-newsletter-modal-title"
          onClick={() => setNewsletterModal(null)}
        >
          <div className="newsletter-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="newsletter-modal-close"
              aria-label="Close subscription message"
              onClick={() => setNewsletterModal(null)}
            >
              <X aria-hidden="true" />
            </button>
            <div className={`newsletter-modal-icon newsletter-modal-icon-${newsletterModal.kind}`}>
              {newsletterModal.kind === 'success' ? (
                <CheckCircle2 aria-hidden="true" />
              ) : newsletterModal.kind === 'already_registered' ? (
                <Mail aria-hidden="true" />
              ) : (
                <AlertCircle aria-hidden="true" />
              )}
            </div>
            <h2 id="anticipation-newsletter-modal-title">
              {newsletterModal.kind === 'success'
                ? 'YOU’RE REGISTERED'
                : newsletterModal.kind === 'already_registered'
                  ? 'ALREADY REGISTERED'
                  : 'SIGNUP FAILED'}
            </h2>
            <p>{newsletterModal.message}</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setNewsletterModal(null)}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
