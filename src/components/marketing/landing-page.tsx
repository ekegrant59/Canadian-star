'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Mail, Megaphone, X } from 'lucide-react';
import { useState, useEffect, useRef, type FormEvent, type PointerEvent } from 'react';
import { SiteHeader, Brand } from '@/components/shared/site-header';
import { StageHero } from './stages/stage-hero';
import { StageClosingCta } from './stages/stage-closing-cta';
import { LandingStageRenderer } from './landing-stage-renderer';
import { STAGE_VIEW_MODELS } from '@/data/landing-fixtures';
import type { LandingStage, LandingStageViewModel, VotingArtist } from '@/types/landing';
import { subscribeToNewsletterAction } from '@/server/actions/newsletter';

const image = (name: string) => `/images/reference/${name}`;

const journey = [
  {
    label: 'APPLY',
    title: 'APPLY',
    copy: 'Submit your best original songs and live performance videos for review.',
    image: image('image1_4_4.png'),
  },
  {
    label: 'FAN ENGAGEMENT',
    title: 'FAN ENGAGEMENT',
    copy: 'Approved artists rally their communities during a secure, email-verified public voting period.',
    image: image('image0_4_4.png'),
  },
  {
    label: 'INDUSTRY REVIEW',
    title: 'INDUSTRY REVIEW',
    copy: 'A professional review panel evaluates the shortlist on artistry, musicianship and commercial readiness.',
    image: image('image2_4_4.png'),
  },
  {
    label: 'QUALIFYING SHOWS',
    title: 'QUALIFYING SHOWS',
    copy: 'Sixteen artists perform across four electric Saturday-night qualifying shows in Peterborough.',
    image: image('image3_4_4.png'),
  },
  {
    label: 'GRAND FINAL',
    title: 'GRAND FINAL',
    copy: 'Four finalists return for one last performance and the chance to become Canada’s next great country star.',
    image: image('image9_4_4.png'),
  },
] as const;

export type LandingScheduleItem = {
  n: string;
  subtitle: string;
  date: string;
  copy: string;
  final: boolean;
  btn: string;
  ticketUrl?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
};

const prizes = [
  {
    title: 'RECORDING',
    copy: 'Professional recording studio opportunity to help the winning artist develop and record new material.',
  },
  {
    title: 'PHOTOGRAPHY',
    copy: 'A professional photoshoot to build a compelling visual brand for press and social media.',
  },
  {
    title: 'VIDEO',
    copy: 'High-quality music video production for the artist’s first post-competition single.',
  },
  {
    title: 'MENTORSHIP',
    copy: 'One-on-one sessions with industry experts covering A&R, booking, and artist management.',
  },
  {
    title: 'PROMOTION',
    copy: 'A targeted digital marketing and PR campaign to announce the winner to the world.',
  },
  {
    title: 'LIVE PERFORMANCE',
    copy: 'Guaranteed slots at major Canadian country music festivals in the upcoming season.',
  },
] as const;

const shows = [
  {
    n: '01',
    subtitle: 'QUALIFYING SHOW 1',
    date: 'JAN 9, 2027',
    copy: '4 Artists compete for the first spot in the final.',
    final: false,
    btn: 'TICKETS',
  },
  {
    n: '02',
    subtitle: 'QUALIFYING SHOW 2',
    date: 'JAN 16, 2027',
    copy: '4 Artists compete for the second spot in the final.',
    final: false,
    btn: 'TICKETS',
  },
  {
    n: '03',
    subtitle: 'QUALIFYING SHOW 3',
    date: 'JAN 23, 2027',
    copy: '4 Artists compete for the third spot in the final.',
    final: false,
    btn: 'TICKETS',
  },
  {
    n: '04',
    subtitle: 'QUALIFYING SHOW 4',
    date: 'JAN 30, 2027',
    copy: '4 Artists compete for the final spot.',
    final: false,
    btn: 'TICKETS',
  },
  {
    n: '05',
    subtitle: 'THE GRAND FINAL',
    date: 'FEB 6, 2027',
    copy: 'The 4 winners battle for the ultimate title.',
    final: true,
    btn: 'VIP TICKETS',
  },
] as const;

function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={secondary ? 'button button-secondary' : 'button button-primary'} href={href}>
      {children}
    </Link>
  );
}

export interface LandingPageProps {
  stage?: LandingStage;
  viewModelOverride?: Partial<LandingStageViewModel>;
  schedule?: LandingScheduleItem[];
  announcement?: {
    title: string;
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    severity: string;
  } | null;
  judges?: Array<{ id: string; name: string; role: string; bio: string; imageUrl: string | null }>;
  sponsors?: Array<{
    id: string;
    name: string;
    websiteUrl: string | null;
    logoUrl: string | null;
    placement?: 'top' | 'bottom';
  }>;
  onSelectArtist?: (artist: VotingArtist) => void;
  onVoteSubmit?: (artistId: string) => void;
  onCastVoteClick?: () => void;
}

type NewsletterModalState = {
  kind: 'success' | 'already_registered' | 'error';
  message: string;
} | null;

export function LandingPage({
  stage = 'applications',
  viewModelOverride,
  schedule,
  announcement,
  judges: databaseJudges,
  sponsors,
  onSelectArtist,
  onVoteSubmit,
  onCastVoteClick,
}: LandingPageProps) {
  const baseViewModel = STAGE_VIEW_MODELS[stage] ?? STAGE_VIEW_MODELS.applications;
  const viewModel: LandingStageViewModel = {
    stage: viewModelOverride?.stage ?? stage,
    kicker: viewModelOverride?.kicker ?? baseViewModel.kicker,
    headline: viewModelOverride?.headline ?? baseViewModel.headline,
    subhead: viewModelOverride?.subhead ?? baseViewModel.subhead,
    datePillText: viewModelOverride?.datePillText ?? baseViewModel.datePillText,
    locationPillText: viewModelOverride?.locationPillText ?? baseViewModel.locationPillText,
    primaryCta: viewModelOverride?.primaryCta ?? baseViewModel.primaryCta,
    countdown: viewModelOverride?.countdown ?? baseViewModel.countdown,
    votingOpen: viewModelOverride?.votingOpen ?? baseViewModel.votingOpen,
    votingArtists: viewModelOverride?.votingArtists ?? baseViewModel.votingArtists,
    finalists: viewModelOverride?.finalists ?? baseViewModel.finalists,
    finalistShows: viewModelOverride?.finalistShows ?? baseViewModel.finalistShows,
    grandFinal: viewModelOverride?.grandFinal ?? baseViewModel.grandFinal,
  };
  const scheduleShows: LandingScheduleItem[] = schedule?.length ? schedule : [...shows];
  const displayedJudges =
    databaseJudges?.map((judge) => ({
      id: judge.id,
      name: judge.name,
      role: judge.role,
      copy: judge.bio,
      image: judge.imageUrl,
    })) ?? [];
  const topSponsors = sponsors?.filter((sponsor) => sponsor.placement === 'top') ?? [];
  const bottomSponsors = sponsors?.filter((sponsor) => sponsor.placement !== 'top') ?? [];

  const [journeyIndex, setJourneyIndex] = useState(0);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [journeyPaused, setJourneyPaused] = useState(false);
  const [schedulePaused, setSchedulePaused] = useState(false);
  const [newsletterModal, setNewsletterModal] = useState<NewsletterModalState>(null);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const journeySectionRef = useRef<HTMLElement | null>(null);
  const scheduleSectionRef = useRef<HTMLElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scheduleRowRef = useRef<HTMLDivElement | null>(null);
  const journeyPointerStartRef = useRef<number | null>(null);

  const currentJourney = journey[journeyIndex] ?? journey[0];
  useEffect(() => {
    if (!newsletterModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNewsletterModal(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [newsletterModal]);

  // Auto-looping Journey stages
  useEffect(() => {
    if (journeyPaused) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setJourneyIndex((prevIndex) => (prevIndex + 1) % journey.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [journeyPaused]);

  // Container horizontal tab scrolling
  useEffect(() => {
    const container = tabsContainerRef.current;
    const activeTab = tabRefs.current[journeyIndex];
    if (container && activeTab) {
      const tabLeft = activeTab.offsetLeft;
      const tabWidth = activeTab.clientWidth;
      const containerWidth = container.clientWidth;
      const scrollTarget = tabLeft - containerWidth / 2 + tabWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: window.matchMedia('(hover: hover) and (pointer: fine)').matches
          ? 'smooth'
          : 'auto',
      });
    }
  }, [journeyIndex]);

  // Auto-moving Schedule Carousel
  useEffect(() => {
    if (schedulePaused || scheduleShows.length < 2) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setScheduleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % scheduleShows.length;
        scrollScheduleTo(nextIndex);
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [schedulePaused, scheduleShows.length]);

  function scrollScheduleTo(index: number) {
    const container = scheduleRowRef.current;
    const card = container?.children[index] as HTMLElement | undefined;
    if (!container || !card) return;

    const left = card.offsetLeft - container.offsetLeft;
    const behavior = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      ? 'smooth'
      : 'auto';
    container.scrollTo({ left, behavior });
  }

  function selectJourney(index: number) {
    setJourneyIndex(index);
    setJourneyPaused(false);
  }

  function handleJourneyPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return;
    journeyPointerStartRef.current = event.clientX;
    setJourneyPaused(true);
  }

  function handleJourneyPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const start = journeyPointerStartRef.current;
    journeyPointerStartRef.current = null;
    setJourneyPaused(false);
    if (start === null) return;

    const distance = event.clientX - start;
    if (Math.abs(distance) >= 40) {
      setJourneyIndex(
        (current) => (current + (distance < 0 ? 1 : -1) + journey.length) % journey.length,
      );
    }
  }

  function pauseForMouse(event: PointerEvent<HTMLElement>, paused: boolean) {
    if (event.pointerType === 'mouse') {
      if (event.currentTarget === journeySectionRef.current) setJourneyPaused(paused);
      if (event.currentTarget === scheduleSectionRef.current) setSchedulePaused(paused);
    }
  }

  const handleScheduleScroll = () => {
    const container = scheduleRowRef.current;
    if (!container) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = Array.from(container.children) as HTMLElement[];
    if (!cards.length) return;
    const newIndex = cards.reduce((closestIndex, card, index) => {
      const closest = cards[closestIndex] ?? card;
      const cardDistance = Math.abs(card.offsetLeft + card.clientWidth / 2 - containerCenter);
      const closestDistance = Math.abs(
        closest.offsetLeft + closest.clientWidth / 2 - containerCenter,
      );
      return cardDistance < closestDistance ? index : closestIndex;
    }, 0);

    if (newIndex !== scheduleIndex) setScheduleIndex(newIndex);
  };

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newsletterSubmitting) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    setNewsletterSubmitting(true);
    const result = await subscribeToNewsletterAction({ email });
    setNewsletterSubmitting(false);
    if (!result.ok) {
      setNewsletterModal({ kind: 'error', message: result.error });
      return;
    }

    setNewsletterModal({
      kind: result.data.status === 'already_registered' ? 'already_registered' : 'success',
      message: result.data.message,
    });
    if (result.data.status === 'confirmation_sent') event.currentTarget.reset();
  }

  return (
    <main id="main">
      <SiteHeader isHome={true} />

      {announcement && (
        <aside
          className={`homepage-announcement homepage-announcement-${announcement.severity}`}
          aria-label="Competition announcement"
        >
          <div className="container-content homepage-announcement-inner">
            <span className="homepage-announcement-icon" aria-hidden="true">
              <Megaphone />
            </span>
            <div className="homepage-announcement-copy">
              <strong>{announcement.title}</strong>
              <span>{announcement.body}</span>
            </div>
            {announcement.ctaLabel && announcement.ctaUrl && (
              <Link href={announcement.ctaUrl} className="homepage-announcement-link">
                {announcement.ctaLabel}
              </Link>
            )}
          </div>
        </aside>
      )}

      {/* 1. Stage-Specific Hero Section */}
      <StageHero viewModel={viewModel} />

      <SponsorMarquee sponsors={topSponsors} label="OFFICIAL PARTNERS" />

      {/* 2. Competition Summary / Stats */}
      <section className="intro-section section-pad" id="about">
        <div className="container-content intro-grid">
          <h2>
            THE SEARCH
            <br />
            STARTS HERE
          </h2>
          <div>
            <p>
              Ontario is home to incredible undiscovered country music talent. We’re bringing the
              best emerging artists to one stage to find the next breakout star.
            </p>
          </div>
        </div>
        <div className="container-content stats-grid">
          {[
            ['16', 'ARTISTS'],
            ['4', 'QUALIFYING SHOWS'],
            ['4', 'FINALISTS'],
            ['1', 'CROWN'],
          ].map(([value, label]) => (
            <div className="stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Competition Journey Funnel */}
      <section
        className="section-pad surface"
        id="journey"
        ref={journeySectionRef}
        onPointerEnter={(event) => pauseForMouse(event, true)}
        onPointerLeave={(event) => pauseForMouse(event, false)}
      >
        <div className="container-content">
          <div className="section-intro">
            <h2>THE JOURNEY TO STARDOM</h2>
            <p>
              From application to the grand final, the path to becoming the next country star is
              intense and rewarding.
            </p>
          </div>
          <div
            className="journey-media"
            onPointerDown={handleJourneyPointerDown}
            onPointerUp={handleJourneyPointerEnd}
            onPointerCancel={() => {
              journeyPointerStartRef.current = null;
              setJourneyPaused(false);
            }}
          >
            <Image
              key={currentJourney.image}
              src={currentJourney.image}
              alt={currentJourney.title}
              fill
              priority
              unoptimized
              style={{ objectFit: 'cover' }}
            />
            <div className="journey-overlay">
              <h3>{currentJourney.title}</h3>
              <p>{currentJourney.copy}</p>
            </div>
          </div>
          <div
            className="journey-tabs no-scrollbar"
            ref={tabsContainerRef}
            role="tablist"
            aria-label="Competition stages"
          >
            {journey.map((item, index) => (
              <button
                key={item.label}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                aria-selected={journeyIndex === index}
                className={journeyIndex === index ? 'active' : ''}
                onClick={() => selectJourney(index)}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  selectJourney(index);
                }}
              >
                <span>0{index + 1}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Stage-Specific Content Block (Eligibility / Voting / Anticipation / Finalists) */}
      <div id="artists">
        <LandingStageRenderer
          viewModel={viewModel}
          onSelectArtist={onSelectArtist}
          onVoteSubmit={onVoteSubmit}
          onCastVoteClick={onCastVoteClick}
        />
      </div>

      {/* 5. Prize Package */}
      <section className="section-pad prize-section surface" id="prize">
        <div className="container-content">
          <div className="section-intro">
            <span className="pill-eyebrow">THE GRAND PRIZE</span>
            <h2>WIN MORE THAN THE TITLE. BUILD YOUR CAREER.</h2>
            <p>
              The winner of The Next Great Canadian Country Star Competition will receive a
              career-focused prize package designed to help take their music to the next level.
            </p>
          </div>
          <div className="prize-feature">
            <Image
              src={image('image3_4_4.png')}
              alt="An excited audience at a live concert"
              fill
              unoptimized
              style={{ objectFit: 'cover' }}
            />
            <div className="prize-feature-scrim" />
            <div className="prize-feature-content">
              <h3>THE NEXT CHAPTER STARTS HERE</h3>
              <p>
                A prize package built around exposure, professional development and opportunities
                for the winner’s next stage of their career.
              </p>
            </div>
          </div>
          <div className="card-grid prize-grid">
            {prizes.map(({ title, copy }) => (
              <article className="info-card prize-card" key={title}>
                <h3 className="orange-heading">{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Stage-Specific Middle/Closing Call to Action */}
      <StageClosingCta stage={viewModel.stage} />

      {/* 7. Judges */}
      <section className="section-pad" id="judges">
        <div className="container-content">
          <div className="section-intro">
            <h2>JUDGED BY PEOPLE WHO KNOW THE BUSINESS</h2>
            <p>
              Our panel of industry veterans, hit songwriters, and label executives will guide the
              artists and select the ultimate winner.
            </p>
          </div>
          {displayedJudges.length ? (
            <div className="judges-grid">
              {displayedJudges.map((judge) => (
                <article className="judge-card" key={judge.id}>
                  <div className="judge-image">
                    {judge.image ? (
                      <Image
                        src={judge.image}
                        alt={judge.name}
                        fill
                        unoptimized
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span>{judge.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <h3>{judge.name}</h3>
                  <span className="judge-role">{judge.role}</span>
                  <p>{judge.copy}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-center font-semibold text-neutral-600">
              Judges will be announced soon.
            </p>
          )}
        </div>
      </section>

      {/* 8. The Road to the Crown (Schedule) */}
      <section
        className="section-pad surface"
        id="schedule"
        ref={scheduleSectionRef}
        onPointerEnter={(event) => pauseForMouse(event, true)}
        onPointerLeave={(event) => pauseForMouse(event, false)}
      >
        <div className="container-content">
          <div className="section-intro">
            <h2>THE ROAD TO THE CROWN</h2>
            <p>Five live shows in Peterborough. All dates subject to standard event scheduling.</p>
          </div>
          <div
            className="schedule-row no-scrollbar"
            ref={scheduleRowRef}
            onScroll={handleScheduleScroll}
          >
            {scheduleShows.map((show) => (
              <article className={show.final ? 'show-card final-show' : 'show-card'} key={show.n}>
                <span className="show-type">{show.subtitle}</span>
                <h3>{show.date}</h3>
                {(show.venueName || show.venueAddress) && (
                  <p className="show-venue">
                    <strong>{show.venueName ?? 'Venue TBD'}</strong>
                    {show.venueAddress && <span>{show.venueAddress}</span>}
                  </p>
                )}
                <p>{show.copy}</p>
                <Link href={show.ticketUrl || '#newsletter'} className="show-btn">
                  {show.btn}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Newsletter Email Signup */}
      <section className="newsletter section-pad" id="newsletter">
        <div className="newsletter-inner">
          <h2>DON&apos;T MISS THE NEXT BIG COUNTRY STAR</h2>
          <p>
            Sign up for exclusive artist announcements, presale ticket access, and behind-the-scenes
            content.
          </p>
          <form onSubmit={subscribe} noValidate>
            <div className="subscribe-row">
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
              />
              <button
                className="button button-primary"
                type="submit"
                disabled={newsletterSubmitting}
              >
                {newsletterSubmitting ? 'SUBMITTING...' : 'SUBSCRIBE'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {newsletterModal && (
        <div
          className="newsletter-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-modal-title"
          onClick={() => setNewsletterModal(null)}
        >
          <div className="newsletter-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="newsletter-modal-close"
              aria-label="Close newsletter message"
              onClick={() => setNewsletterModal(null)}
            >
              <X aria-hidden="true" />
            </button>
            <div className={`newsletter-modal-icon newsletter-modal-icon-${newsletterModal.kind}`}>
              {newsletterModal.kind === 'success' && <CheckCircle2 aria-hidden="true" />}
              {newsletterModal.kind === 'already_registered' && <Mail aria-hidden="true" />}
              {newsletterModal.kind === 'error' && <AlertCircle aria-hidden="true" />}
            </div>
            <h2 id="newsletter-modal-title">
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

      {/* 10. Closing Image Banner */}
      <section className="image-cta closing-cta">
        <Image
          src={image('image9_4_4.png')}
          alt="A lively crowd at a country concert"
          fill
          unoptimized
          style={{ objectFit: 'cover' }}
        />
        <div className="image-cta-scrim" />
        <div className="image-cta-content">
          <h2>
            YOUR NEXT GREAT COUNTRY
            <br />
            STAR IS WAITING
          </h2>
          <div className="hero-buttons">
            <ButtonLink href={viewModel.primaryCta.href}>{viewModel.primaryCta.label}</ButtonLink>
            {viewModel.primaryCta.secondaryLabel && viewModel.primaryCta.secondaryHref && (
              <ButtonLink href={viewModel.primaryCta.secondaryHref} secondary>
                {viewModel.primaryCta.secondaryLabel}
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {/* 11. Partners / Sponsors Marquee */}
      <SponsorMarquee sponsors={bottomSponsors} label="OFFICIAL PARTNERS" />

      {/* 12. Footer */}
      <footer>
        <div className="container-content footer-top">
          <div className="footer-brand">
            <Brand />
            <p>
              Celebrating the authentic voices of Ontario’s country music scene. The ultimate
              launchpad for emerging artists.
            </p>
          </div>
          <div className="footer-nav">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="container-content footer-bottom">
          <span>© 2026 The Next Great Canadian Country Star. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

function SponsorMarquee({
  sponsors,
  label,
}: {
  sponsors: Array<{ id: string; name: string; websiteUrl: string | null; logoUrl: string | null }>;
  label: string;
}) {
  return (
    <section className="partners">
      <span>{label}</span>
      <div className="marquee-container no-scrollbar">
        <div className="marquee-track">
          {[...Array(3)].map((_, setIdx) => (
            <div className="marquee-group" key={setIdx}>
              {sponsors.length ? (
                sponsors.map((sponsor) => {
                  const sponsorLogo = sponsor.logoUrl ? (
                    <Image
                      src={sponsor.logoUrl}
                      width={160}
                      height={36}
                      unoptimized
                      alt={sponsor.name}
                    />
                  ) : (
                    <strong>{sponsor.name}</strong>
                  );
                  return sponsor.websiteUrl ? (
                    <a
                      key={`${setIdx}-${sponsor.id}`}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sponsorLogo}
                    </a>
                  ) : (
                    <span key={`${setIdx}-${sponsor.id}`}>{sponsorLogo}</span>
                  );
                })
              ) : (
                <span>PARTNERS TO BE ANNOUNCED</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
