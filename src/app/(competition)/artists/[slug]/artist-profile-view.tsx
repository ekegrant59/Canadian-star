'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader, Brand } from '@/components/shared/site-header';
import {
  ChevronLeft,
  MapPin,
  Vote,
  Play,
  ExternalLink,
  Globe,
  Star,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import type { VotingArtist } from '@/types/landing';
import { VotingModal } from '@/components/voting/voting-modal';
import { MusicCover } from '@/components/shared/music-cover';

type PublicSponsor = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
};

interface ArtistProfileViewProps {
  artist: VotingArtist;
  votingOpen: boolean;
  sponsors: PublicSponsor[];
}

export function ArtistProfileView({ artist, votingOpen, sponsors }: ArtistProfileViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const musicLinks =
    artist.musicMetadata ??
    Object.entries(artist.musicLinks ?? {})
      .filter(([, url]) => Boolean(url))
      .map(([key, url]) => ({ url, title: musicLinkLabel(key, url), subtitle: null, image: null }));
  const embeddedVideo = videoEmbedUrl(artist.performanceVideoUrl);

  return (
    <main id="main" className="min-h-screen bg-[#0e0e0e] text-[#e5e2e1]">
      <SiteHeader />

      <div className="container-content py-8">
        {/* Breadcrumb Navigation */}
        <div className="artist-breadcrumb mb-8">
          <Link href="/artists" className="breadcrumb-back-link">
            <ChevronLeft className="mr-1 inline h-4 w-4" />
            <span>MEET THE ARTISTS</span>
          </Link>
        </div>

        {/* Hero Spotlight Grid */}
        <div className="artist-spotlight-grid">
          {/* Left: Large Portrait Poster */}
          <div className="artist-spotlight-poster">
            <Image
              src={artist.photoUrl}
              alt={artist.name}
              fill
              priority
              unoptimized
              style={{ objectFit: 'cover' }}
              className="spotlight-img"
            />
            <div className="spotlight-scrim" />

            <div className="spotlight-bottom-info">
              <div className="spotlight-tags">
                <span className="genre-tag">{artist.genre}</span>
                <span className="location-tag">
                  <MapPin className="text-primary mr-1 inline h-3.5 w-3.5" />
                  {artist.hometown}
                </span>
              </div>
              <h1 className="spotlight-name">{artist.name}</h1>
            </div>
          </div>

          {/* Right: Support & Vote Card */}
          <div className="artist-support-sidebar">
            <div className="support-vote-card">
              <div className="support-icon-wrap">
                <Vote className="text-primary h-7 w-7" aria-hidden="true" />
              </div>

              <h2>Support {artist.name}</h2>
              <p className="support-copy">
                Help {artist.name} secure a spot on stage in the live qualifying rounds in
                Peterborough.
              </p>

              <button
                type="button"
                className="button button-primary vote-spotlight-btn"
                onClick={() => setIsModalOpen(true)}
                disabled={!votingOpen}
              >
                <Vote className="mr-2 inline h-4 w-4" />
                <span>{votingOpen ? `VOTE FOR ${artist.name}` : 'VOTING CLOSED'}</span>
              </button>

              <div className="support-disclaimer">
                <ShieldCheck className="text-text-subtle h-4 w-4 flex-shrink-0" />
                <span>One vote per verified email address. Email confirmation required.</span>
              </div>
            </div>

            {/* Current Stage Card */}
            <div className="current-stage-card">
              <div className="text-primary mb-1 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <Star className="fill-primary h-4 w-4" />
                <span>CURRENT STAGE</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {stageLabel(artist.applicationStatus)}
              </h3>
              <p className="text-text-warm mt-1 text-xs">
                {artist.applicationStatus === 'approved'
                  ? 'Approved and available for public voting.'
                  : 'Active in the competition.'}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Sections Grid */}
        <div className="artist-details-grid mt-12">
          {/* Main Left Column */}
          <div className="details-main-column">
            {/* Biography */}
            <section className="artist-bio-section">
              <h2 className="details-heading">About the Artist</h2>
              <div className="bio-paragraphs">
                <p>
                  {artist.bioSnippet ||
                    `${artist.name} is an Ontario ${artist.genre.toLowerCase()} competing in ${'The Next Great Canadian Country Star Competition'}.`}
                </p>
                {(artist.formationYear || artist.memberCount) && (
                  <p>
                    {artist.formationYear ? `Performing since ${artist.formationYear}. ` : ''}
                    {artist.memberCount
                      ? `${artist.memberCount} member${artist.memberCount === 1 ? '' : 's'}.`
                      : ''}
                  </p>
                )}
              </div>
            </section>

            {/* Recorded Music & Audio Samples */}
            <section className="artist-music-section mt-12">
              <h2 className="details-heading">Recorded Music</h2>
              <div className="tracks-list">
                {musicLinks.length ? (
                  musicLinks.map((track, idx) => (
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noreferrer"
                      className="track-row"
                      key={track.url}
                    >
                      <div className="track-left">
                        <MusicCover
                          src={track.image}
                          className="track-play-btn h-11 w-11 rounded-md"
                        />
                        <div className="track-details">
                          <span className="track-number">0{idx + 1}</span>
                          <span className="track-title">{track.title}</span>
                          {track.subtitle && (
                            <span className="text-text-subtle block text-[11px]">
                              {track.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="text-text-subtle h-4 w-4" />
                    </a>
                  ))
                ) : (
                  <p className="text-text-subtle text-sm">
                    No recorded music links have been submitted.
                  </p>
                )}
              </div>
            </section>

            {/* Live Performance Video Thumbnail */}
            <section className="artist-video-section mt-12">
              <h2 className="details-heading">Live Performance</h2>
              <div className="video-player-card">
                {embeddedVideo ? (
                  <iframe
                    src={embeddedVideo}
                    title={`Live performance by ${artist.name}`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <Image
                      src="/images/artist-profile-video.jpg"
                      alt={`Live performance by ${artist.name}`}
                      fill
                      unoptimized
                      style={{ objectFit: 'cover' }}
                      className="video-thumb-img"
                    />
                    <div className="video-scrim" />
                    {artist.performanceVideoUrl ? (
                      <a
                        href={artist.performanceVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="video-play-button"
                        aria-label={`Open ${artist.name}'s performance video`}
                      >
                        <Play className="ml-1 h-6 w-6 fill-white text-white" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="video-play-button"
                        aria-label="Play live performance video"
                      >
                        <Play className="ml-1 h-6 w-6 fill-white text-white" />
                      </button>
                    )}
                  </>
                )}
                {artist.performanceVideoUrl && (
                  <div className="video-caption">
                    <span>Submitted performance video</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Right Column */}
          <aside className="details-sidebar-column">
            {/* Connect / Social Links */}
            <div className="connect-card">
              <h3 className="connect-heading">Connect</h3>
              <div className="connect-links-list">
                {Object.entries(artist.socialLinks ?? {}).map(([network, url]) => (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="connect-link-item"
                  >
                    <Share2 className="text-primary h-4 w-4" />
                    <span>{network}</span>
                    <ExternalLink className="text-text-subtle ml-auto h-3.5 w-3.5" />
                  </a>
                ))}

                {artist.websiteUrl && (
                  <a
                    href={artist.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="connect-link-item"
                  >
                    <Globe className="text-primary h-4 w-4" />
                    <span>Official Website</span>
                    <ExternalLink className="text-text-subtle ml-auto h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Partners Marquee */}
      <section className="partners mt-16">
        <span>OFFICIAL PARTNERS</span>
        <div className="marquee-container no-scrollbar">
          <div className="marquee-track">
            {[...Array(3)].map((_, setIdx) => (
              <div className="marquee-group" key={setIdx}>
                {sponsors.map((sponsor) => (
                  <a
                    key={`${setIdx}-${sponsor.id}`}
                    href={sponsor.websiteUrl ?? '#'}
                    target={sponsor.websiteUrl ? '_blank' : undefined}
                    rel="noreferrer"
                    aria-label={sponsor.name}
                  >
                    <Image
                      src={sponsor.logoUrl ?? '/images/artist-profile-hero.jpg'}
                      width={160}
                      height={36}
                      unoptimized
                      alt={sponsor.name}
                    />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
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
            <Link href="/sponsorship">Sponsorship</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="container-content footer-bottom">
          <span>© 2026 The Next Great Canadian Country Star. All rights reserved.</span>
        </div>
      </footer>

      {/* Voting Modal */}
      <VotingModal isOpen={isModalOpen} artist={artist} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}

function videoEmbedUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).at(-1);
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

function stageLabel(status?: VotingArtist['applicationStatus']) {
  if (status === 'finalist') return 'Finalist';
  if (status === 'shortlisted') return 'Semi-finalist';
  return 'Approved artist';
}

function musicLinkLabel(key: string, value: string) {
  try {
    const url = new URL(value);
    const service = url.hostname.replace(/^www\./, '').split('.')[0];
    const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '')
      .replace(/[-_+]+/g, ' ')
      .trim();
    return name ? `${name} · ${service}` : `${service} track`;
  } catch {
    return key.replace(/_/g, ' ');
  }
}
