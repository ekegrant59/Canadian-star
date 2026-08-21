'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Vote,
  RefreshCw,
} from 'lucide-react';
import type { LandingCountdownInfo, VotingArtist } from '@/types/landing';
import { VotingModal } from '@/components/voting/voting-modal';

interface AnticipationStageProps {
  votingOpen?: boolean;
  countdown?: LandingCountdownInfo;
  artists?: VotingArtist[];
  onCastVoteClick?: () => void;
  onVoteSubmit?: (artistId: string) => void;
}

export function AnticipationStage({
  votingOpen = false,
  artists = [],
  countdown,
  onCastVoteClick,
  onVoteSubmit,
}: AnticipationStageProps) {
  const [modalArtist, setModalArtist] = useState<VotingArtist | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(countdown?.targetDate));

  useEffect(() => {
    if (!votingOpen || !countdown?.targetDate) return;

    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft(countdown.targetDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdown?.targetDate, votingOpen]);

  const handleVoteClick = (artist: VotingArtist) => {
    setModalArtist(artist);
    setIsModalOpen(true);
  };

  const scrollPrev = () => {
    if (carouselRef.current) {
      const cardWidth = 360;
      carouselRef.current.scrollBy({ left: -cardWidth * 1.5, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (carouselRef.current) {
      const cardWidth = 360;
      carouselRef.current.scrollBy({ left: cardWidth * 1.5, behavior: 'smooth' });
    }
  };

  return (
    <div className="anticipation-stage-container">
      {/* ---------------- 1. URGENT COUNTDOWN HERO PANEL (Shown only during active voting countdown) ---------------- */}
      {votingOpen && (
        <section className="section-pad bg-[#0e0e0e]" id="anticipation-status">
          <div className="container-content">
            <div className="anticipation-hero-panel panel-urgent">
              <div className="panel-badge-row">
                <span className="urgency-badge">
                  <span className="pulse-dot-red" aria-hidden="true" />
                  VOTING WINDOW CLOSING
                </span>
                <span className="server-guard-badge">
                  <ShieldCheck className="text-primary mr-1 inline h-3.5 w-3.5" />
                  SERVER-ENFORCED WINDOW
                </span>
              </div>

              <div className="anticipation-text-block">
                <h2>THE FINAL HOURS OF FAN VOTING</h2>
                <p>
                  The public voting window is strictly time-gated. Once the clock strikes zero, all
                  unsubmitted votes are locked out and will not count toward the shortlist score.
                </p>
              </div>

              {/* Countdown */}
              <div className="countdown-grid" role="timer" aria-label="Time remaining to vote">
                <div className="countdown-card">
                  <span className="count-number">{String(timeLeft.days).padStart(2, '0')}</span>
                  <span className="count-label">DAYS</span>
                </div>
                <div className="countdown-sep">:</div>
                <div className="countdown-card">
                  <span className="count-number">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="count-label">HOURS</span>
                </div>
                <div className="countdown-sep">:</div>
                <div className="countdown-card">
                  <span className="count-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="count-label">MINUTES</span>
                </div>
                <div className="countdown-sep">:</div>
                <div className="countdown-card urgent-seconds">
                  <span className="count-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="count-label">SECONDS</span>
                </div>
              </div>

              {/* Actions */}
              <div className="anticipation-actions">
                <a
                  href="#anticipation-carousel"
                  className="button button-primary anticipation-cta-btn"
                  onClick={onCastVoteClick}
                >
                  <span>CAST YOUR VOTE NOW</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#what-happens-next" className="button button-secondary">
                  WHAT HAPPENS NEXT
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- 2. WHAT HAPPENS NEXT? (Exact Match anticipation web landing page.svg) ---------------- */}
      <section
        className="what-happens-next-section section-pad bg-[#0d0d0d]"
        id="what-happens-next"
      >
        <div className="container-content">
          <div className="section-header-centered mb-16 text-center">
            <h2 className="what-happens-heading">WHAT HAPPENS NEXT?</h2>
          </div>

          <div className="what-happens-cards-grid">
            {/* Card 01: Voting Closes */}
            <div className="what-happens-card">
              <div className="card-top-title text-[#ff5c00]">VOTING CLOSES</div>
              <p className="card-body-text">
                The public fan voting period has officially concluded. All votes have been tallied
                and locked for the next phase.
              </p>
              <div className="watermark-number" aria-hidden="true">
                01
              </div>
            </div>

            {/* Card 02: Industry Review (Active with Top Orange Border) */}
            <div className="what-happens-card card-review-active">
              <div className="card-top-title flex items-center gap-1.5 text-[#ff5c00]">
                <span>INDUSTRY REVIEW</span>
                <RefreshCw className="animate-spin-slow inline h-3.5 w-3.5 text-[#ff5c00]" />
              </div>
              <p className="card-body-text">
                Our panel of expert judges and industry professionals are currently reviewing the
                top vote-getters to finalize the selection.
              </p>
              <div className="watermark-number" aria-hidden="true">
                02
              </div>
            </div>

            {/* Card 03: Final 16 */}
            <div className="what-happens-card">
              <div className="card-top-title text-[#b0a8a4]">FINAL 16</div>
              <p className="card-body-text">
                The highly anticipated announcement of the Final 16 artists who will advance to the
                live competition stages.
              </p>
              <div className="watermark-number" aria-hidden="true">
                03
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. MEET THE ARTISTS (Exact Match anticipation web landing page.svg) ---------------- */}
      <section className="section-pad bg-[#0a0a0a]" id="anticipation-carousel">
        <div className="container-content">
          <div className="meet-artists-header-row">
            <div className="meet-artists-title-block">
              <h2 className="meet-artists-title">MEET THE ARTISTS</h2>
              <p className="meet-artists-sub">Explore the artists competing for your vote.</p>
            </div>

            <div className="meet-artists-right-actions">
              <Link href="/artists" className="view-all-artists-link">
                <span>VIEW ALL ARTISTS</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
              <div className="carousel-arrow-buttons ml-4">
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={scrollPrev}
                  aria-label="Previous artists"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={scrollNext}
                  aria-label="Next artists"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sliding Artist Carousel */}
          <div
            className="artist-carousel-track no-scrollbar mt-8"
            ref={carouselRef}
            role="region"
            aria-label="Anticipation voting artist carousel"
          >
            {artists.map((artist) => (
              <article className="carousel-artist-card" key={artist.id}>
                <div className="card-image-wrap">
                  <Image
                    src={artist.photoUrl}
                    alt={artist.name}
                    fill
                    unoptimized
                    style={{ objectFit: 'cover' }}
                    className="artist-img-zoom"
                  />
                  <div className="card-media-gradient" />
                  <span className="card-act-pill">{artist.actType}</span>
                </div>

                <div className="card-content-wrap">
                  <h3 className="card-artist-title">{artist.name}</h3>

                  <div className="card-meta-line">
                    <span className="card-genre-text">{artist.genre}</span>
                    <span className="card-location-text">
                      <MapPin className="text-primary mr-1 inline h-3 w-3" />
                      {artist.hometown}
                    </span>
                  </div>

                  {artist.bioSnippet && <p className="card-bio-snippet">{artist.bioSnippet}</p>}

                  <div className="card-two-buttons">
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="button button-secondary card-btn-profile"
                    >
                      VIEW PROFILE
                    </Link>

                    <button
                      type="button"
                      className="button button-primary card-btn-vote"
                      onClick={() => handleVoteClick(artist)}
                      disabled={!votingOpen}
                    >
                      <Vote className="mr-1 h-3.5 w-3.5" />
                      <span>VOTE</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Voting Modal */}
      <VotingModal
        isOpen={isModalOpen}
        artist={modalArtist}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          if (modalArtist) {
            onVoteSubmit?.(modalArtist.id);
          }
        }}
      />
    </div>
  );
}

function getTimeLeft(targetDate?: string) {
  const remaining = targetDate ? Math.max(0, new Date(targetDate).getTime() - Date.now()) : 0;
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}
