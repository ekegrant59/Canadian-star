'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Compass,
  UserCheck,
  ShieldCheck,
  Vote,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowRight,
  Lock,
  Shield,
  Layers,
} from 'lucide-react';
import type { VotingArtist } from '@/types/landing';
import { VotingModal } from '@/components/voting/voting-modal';

interface VotingStageProps {
  artists: VotingArtist[];
  votingOpen?: boolean;
  onSelectArtist?: (artist: VotingArtist) => void;
  onVoteSubmit?: (artistId: string) => void;
}

const VOTING_PROCESS_STEPS = [
  {
    stepNumber: '1',
    label: '1. EXPLORE',
    icon: Compass,
    description: 'Watch performances and discover the top finalists.',
    isHighlighted: false,
  },
  {
    stepNumber: '2',
    label: '2. CHOOSE',
    icon: UserCheck,
    description: 'Select your favourite artist to advance.',
    isHighlighted: false,
  },
  {
    stepNumber: '3',
    label: '3. VERIFY',
    icon: ShieldCheck,
    description: 'Confirm your identity via email or SMS.',
    isHighlighted: false,
  },
  {
    stepNumber: '4',
    label: '4. CAST',
    icon: Layers,
    description: 'Submit your vote and track the leaderboard.',
    isHighlighted: true,
  },
];

export function VotingStage({
  artists,
  votingOpen = true,
  onSelectArtist,
  onVoteSubmit,
}: VotingStageProps) {
  const [modalArtist, setModalArtist] = useState<VotingArtist | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const handleVoteClick = (artist: VotingArtist) => {
    setModalArtist(artist);
    setIsModalOpen(true);
    onSelectArtist?.(artist);
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
    <div className="voting-stage-container">
      {/* ---------------- 1. HOW VOTING WORKS (Exact Match vote web landing page (1).svg) ---------------- */}
      <section className="section-pad bg-[#0d0d0d]" id="how-voting-works">
        <div className="container-content">
          <div className="how-voting-header mb-16 text-center">
            <h2 className="how-voting-heading">HOW VOTING WORKS</h2>
            <p className="how-voting-subheading">
              A simple, transparent process to support the next star.
            </p>
          </div>

          <div className="process-rail-wrapper">
            {/* Connecting Track Line */}
            <div className="process-track-line" aria-hidden="true" />

            <div className="process-steps-row">
              {VOTING_PROCESS_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    className={`process-step-node ${step.isHighlighted ? 'node-active' : ''}`}
                    key={step.label}
                  >
                    <div className="process-node-box">
                      <Icon className="process-node-icon" aria-hidden="true" />
                    </div>
                    <h3 className="process-node-title">{step.label}</h3>
                    <p className="process-node-text">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 2. FAIR VOTING MATTERS (Exact Match vote web landing page (1).svg) ---------------- */}
      <section className="fair-voting-section" id="fair-voting">
        <div className="container-content">
          <div className="fair-voting-grid-layout">
            {/* Left Column: Stylized Shield with Lock */}
            <div className="fair-voting-shield-box">
              <div className="shield-icon-container">
                <Shield className="shield-svg" aria-hidden="true" />
                <div className="lock-sub-icon">
                  <Lock className="lock-svg" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Right Column: Copy & Link */}
            <div className="fair-voting-text-column">
              <h2 className="fair-voting-title">FAIR VOTING MATTERS</h2>
              <p className="fair-voting-desc">
                To maintain the integrity of the competition, all votes are strictly monitored. We
                use email verification to ensure one vote per verified email in this round. Your
                voice shapes the future of Canadian country music—make it genuine.
              </p>
              <Link href="/terms" className="fair-voting-cta-link">
                <span>READ FULL VOTING RULES</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. MEET THE ARTISTS (Exact Match vote web landing page.svg) ---------------- */}
      <section className="section-pad bg-[#0a0a0a]" id="voting-roster">
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
            aria-label="Voting artist carousel"
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

      {/* Reusable Multi-Step Voting Modal */}
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
