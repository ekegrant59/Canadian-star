'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader, Brand } from '@/components/shared/site-header';
import { Search, MapPin, Vote, Sparkles } from 'lucide-react';
import type { VotingArtist } from '@/types/landing';
import { VotingModal } from '@/components/voting/voting-modal';
import { subscribeToNewsletterAction } from '@/server/actions/newsletter';

export default function ArtistsRosterPage() {
  const [artists, setArtists] = useState<VotingArtist[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [modalArtist, setModalArtist] = useState<VotingArtist | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/public/artists')
      .then((response) => (response.ok ? response.json() : { artists: [], votingOpen: false }))
      .then((payload) => {
        if (active && Array.isArray(payload.artists)) {
          setArtists(payload.artists);
          setVotingOpen(Boolean(payload.votingOpen));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => set.add(a.genre));
    return ['All', ...Array.from(set)];
  }, [artists]);

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const matchesSearch =
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.hometown.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'All' || artist.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [artists, searchQuery, selectedGenre]);

  const handleVoteClick = (artist: VotingArtist) => {
    setModalArtist(artist);
    setIsModalOpen(true);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await subscribeToNewsletterAction({ email: newsletterEmail });
    setNewsletterStatus(result.ok ? result.data.message : result.error);
    if (!result.ok) return;
    setNewsletterEmail('');
  };

  return (
    <main id="main" className="min-h-screen bg-[#0e0e0e] text-[#e5e2e1]">
      <SiteHeader />

      {/* Header Banner */}
      <section className="roster-page-header">
        <div className="container-content text-center">
          <h1 className="roster-page-title">MEET THE ARTISTS</h1>
          <p className="roster-page-sub">Explore the artists competing for your vote.</p>

          {/* Search Bar */}
          <div className="roster-page-search-wrap">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="roster-page-search-input"
              aria-label="Search artists by name, town, or genre"
            />
          </div>

          {/* Genre Filters */}
          <div className="genre-filter-pills no-scrollbar mt-6 justify-center" role="tablist">
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                className={`genre-pill ${selectedGenre === g ? 'active' : ''}`}
                onClick={() => setSelectedGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Artists 3-Column Grid */}
      <section className="section-pad pt-0">
        <div className="container-content">
          {filteredArtists.length === 0 ? (
            <div className="roster-empty-state">
              <Sparkles className="empty-icon" aria-hidden="true" />
              <h3>No Artists Found</h3>
              <p>Try adjusting your search term or select a different genre filter.</p>
              <button
                type="button"
                className="button button-secondary mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('All');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="artists-roster-grid">
              {filteredArtists.map((artist) => (
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
                    <div className="card-meta-line">
                      <span className="card-genre-text">{artist.genre}</span>
                      <span className="card-location-text">
                        <MapPin className="text-primary mr-1 inline h-3 w-3" />
                        {artist.hometown}
                      </span>
                    </div>

                    <h3 className="card-artist-title">{artist.name}</h3>

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
                        <span>{votingOpen ? 'VOTE' : 'VOTING CLOSED'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="newsletter section-pad" id="newsletter">
        <div className="newsletter-inner">
          <h2>DON&apos;T MISS THE NEXT BIG COUNTRY STAR</h2>
          <p>
            Sign up for exclusive artist announcements, presale ticket access, and behind-the-scenes
            content.
          </p>
          <form onSubmit={handleSubscribe} noValidate>
            <div className="subscribe-row">
              <label className="sr-only" htmlFor="email-roster">
                Email address
              </label>
              <input
                id="email-roster"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button className="button button-primary" type="submit">
                SUBSCRIBE
              </button>
            </div>
            {newsletterStatus && (
              <p className="form-status" role="status">
                {newsletterStatus}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* Partners Marquee */}
      <section className="partners">
        <span>OFFICIAL PARTNERS</span>
        <div className="marquee-container no-scrollbar">
          <div className="marquee-track">
            {[...Array(3)].map((_, setIdx) => (
              <div className="marquee-group" key={setIdx}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Image
                    key={`${setIdx}-${i}`}
                    src="/images/reference/image10_4_4.png"
                    width={160}
                    height={36}
                    unoptimized
                    alt="Official Partner"
                  />
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
      <VotingModal
        isOpen={isModalOpen}
        artist={modalArtist}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
