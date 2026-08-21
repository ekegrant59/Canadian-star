'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Sparkles, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { FinalistArtist, FinalistShow } from '@/types/landing';

interface FinalistsStageProps {
  finalists?: FinalistArtist[];
}

const FALLBACK_SHOW_DEFINITIONS: FinalistShow[] = [
  {
    showNumber: 1,
    badgeNumber: '01',
    title: 'QUALIFYING SHOW ONE',
    date: 'January 9, 2027',
  },
  {
    showNumber: 2,
    badgeNumber: '02',
    title: 'QUALIFYING SHOW TWO',
    date: 'January 16, 2027',
  },
  {
    showNumber: 3,
    badgeNumber: '03',
    title: 'QUALIFYING SHOW THREE',
    date: 'January 23, 2027',
  },
  {
    showNumber: 4,
    badgeNumber: '04',
    title: 'QUALIFYING SHOW FOUR',
    date: 'January 30, 2027',
  },
];

interface ShowRowProps {
  showDef: FinalistShow;
  artists: FinalistArtist[];
}

function QualifyingShowRow({ showDef, artists }: ShowRowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scrolling on smaller screens when unpaused
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (isPaused) return;

      // Only auto-scroll if the content overflows (smaller screens)
      if (el.scrollWidth > el.clientWidth) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const current = el.scrollLeft;
        const step = 320;

        if (current + step >= maxScroll) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: step, behavior: 'smooth' });
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="qualifying-show-block mb-16">
      {/* Show Row Header (Matches final 16 web landing page.svg) */}
      <div className="show-header-row">
        <div className="show-header-left">
          <div className="show-number-badge">
            {showDef.badgeNumber ?? String(showDef.showNumber).padStart(2, '0')}
          </div>
          <div className="show-title-group">
            <h3 className="show-main-title">{showDef.title}</h3>
            <span className="show-date-text">{formatShortDate(showDef.date)}</span>
            {(showDef.venueName || showDef.venueAddress) && (
              <span className="show-venue-text">
                {showDef.venueName ?? 'Venue TBD'}
                {showDef.venueAddress ? ` • ${showDef.venueAddress}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Divider Rail Line stretching right */}
        <div className="show-divider-line" aria-hidden="true" />

        {/* Mobile carousel arrows */}
        <div className="show-mobile-arrows">
          <button
            type="button"
            className="carousel-mini-btn"
            onClick={handlePrev}
            aria-label={`Previous artists in ${showDef.title}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="carousel-mini-btn"
            onClick={handleNext}
            aria-label={`Next artists in ${showDef.title}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4 Cards Grid / Mobile Auto-scrolling Carousel */}
      <div
        className="show-cards-track no-scrollbar"
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {artists.map((artist) => (
          <Link
            href={`/artists/${artist.slug}`}
            key={artist.id}
            className="finalist-svg-card group"
            title={`View ${artist.name}'s profile`}
          >
            <div className="finalist-svg-card-image-wrap">
              <Image
                src={artist.photoUrl}
                alt={artist.name}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
                className="finalist-photo transition-transform duration-500 group-hover:scale-105"
              />
              <div className="finalist-svg-scrim" />

              {/* Show Pill Badge */}
              <div className="finalist-show-badge">SHOW {showDef.showNumber}</div>
            </div>

            <div className="finalist-svg-card-info">
              <h4 className="finalist-artist-name">{artist.name}</h4>
              <p className="finalist-artist-location">{artist.hometown}</p>
            </div>
          </Link>
        ))}

        {/* Fillers if less than 4 artists */}
        {Array.from({ length: Math.max(0, 4 - artists.length) }).map((_, idx) => (
          <div className="finalist-svg-card finalist-placeholder-card" key={`ph-${idx}`}>
            <span className="placeholder-text">Artist Announced</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinalistsStage({
  finalists = [],
  shows,
  grandFinal = false,
}: FinalistsStageProps & { shows?: FinalistShow[]; grandFinal?: boolean }) {
  const [selectedShow, setSelectedShow] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const showDefinitions = useMemo(
    () => (shows?.length ? shows : FALLBACK_SHOW_DEFINITIONS),
    [shows],
  );

  const filteredFinalists = useMemo(() => {
    return finalists.filter((artist) => {
      const matchesShow = selectedShow === 'all' || artist.showNumber === selectedShow;
      const matchesSearch =
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.hometown.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesShow && matchesSearch;
    });
  }, [finalists, selectedShow, searchQuery]);

  const showsToRender = useMemo(() => {
    if (selectedShow !== 'all') {
      return showDefinitions.filter((s) => s.showNumber === selectedShow);
    }
    return showDefinitions;
  }, [selectedShow, showDefinitions]);

  return (
    <section className="section-pad bg-[#0d0d0d]" id="finalists-roster">
      <div className="container-content">
        {/* Header (Exact Match final 16 web landing page.svg) */}
        <div className="finalists-header-centered mb-10 text-center">
          <h2 className="finalists-top-title">{grandFinal ? 'THE FINAL 4' : 'THE FINAL 16'}</h2>

          <div className="finalists-sub-banner-pill mt-4">
            <span>
              {grandFinal
                ? 'FOUR QUALIFYING WINNERS. ONE GRAND FINAL.'
                : 'FOUR SHOWS. FOUR WINNERS. ONE GRAND FINAL.'}
            </span>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        {!grandFinal && (
          <div className="finalists-toolbar mb-12">
            <div
              className="show-filter-tabs no-scrollbar"
              role="tablist"
              aria-label="Filter finalists by qualifying show"
            >
              <button
                type="button"
                className={`show-tab ${selectedShow === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedShow('all')}
              >
                All Shows ({finalists.length})
              </button>
              <button
                type="button"
                className={`show-tab ${selectedShow === 1 ? 'active' : ''}`}
                onClick={() => setSelectedShow(1)}
              >
                {showDefinitions[0]?.title ?? 'Show 1'} •{' '}
                {formatShortDate(showDefinitions[0]?.date)}
              </button>
              <button
                type="button"
                className={`show-tab ${selectedShow === 2 ? 'active' : ''}`}
                onClick={() => setSelectedShow(2)}
              >
                {showDefinitions[1]?.title ?? 'Show 2'} •{' '}
                {formatShortDate(showDefinitions[1]?.date)}
              </button>
              <button
                type="button"
                className={`show-tab ${selectedShow === 3 ? 'active' : ''}`}
                onClick={() => setSelectedShow(3)}
              >
                {showDefinitions[2]?.title ?? 'Show 3'} •{' '}
                {formatShortDate(showDefinitions[2]?.date)}
              </button>
              <button
                type="button"
                className={`show-tab ${selectedShow === 4 ? 'active' : ''}`}
                onClick={() => setSelectedShow(4)}
              >
                {showDefinitions[3]?.title ?? 'Show 4'} •{' '}
                {formatShortDate(showDefinitions[3]?.date)}
              </button>
            </div>

            <div className="search-input-wrap">
              <Search className="search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search finalists by name or town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="roster-search"
                aria-label="Search finalists"
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredFinalists.length === 0 ? (
          <div className="roster-empty-state">
            <Sparkles className="empty-icon" aria-hidden="true" />
            <h3>No Finalists Found</h3>
            <p>
              {finalists.length === 0
                ? `The official ${grandFinal ? 'Final 4' : 'Final 16'} roster is being finalized. Check back soon!`
                : 'No artists matched your current filter criteria.'}
            </p>
            {finalists.length > 0 && (
              <button
                type="button"
                className="button button-secondary mt-4"
                onClick={() => {
                  setSelectedShow('all');
                  setSearchQuery('');
                }}
              >
                Show All {finalists.length} Finalists
              </button>
            )}
          </div>
        ) : (
          /* Qualifying Show Rows */
          <div className="shows-list-container">
            {(grandFinal
              ? [
                  {
                    showNumber: 1 as const,
                    badgeNumber: 'GF',
                    title: 'GRAND FINAL',
                    date: finalists[0]?.showDate ?? 'Date TBD',
                  },
                ]
              : showsToRender
            ).map((showDef) => {
              const showArtists = filteredFinalists.filter(
                (a) => grandFinal || a.showNumber === showDef.showNumber,
              );
              return (
                <QualifyingShowRow
                  key={showDef.showNumber}
                  showDef={showDef}
                  artists={showArtists}
                />
              );
            })}
          </div>
        )}

        {/* Live Show CTA Schedule Banner */}
        <div className="finalists-show-banner mt-16">
          <div className="banner-left">
            <Trophy className="text-primary h-8 w-8" />
            <div>
              <h4>
                Support Your Artists Live at{' '}
                {showDefinitions[0]?.venueName ?? 'the Competition Venue'}
              </h4>
              <p>
                Four artists take the stage each Saturday night
                {showDefinitions[0]?.venueAddress ? ` at ${showDefinitions[0].venueAddress}` : ''}.
                Fan votes and judge scores determine who moves on to the Grand Final.
              </p>
            </div>
          </div>
          <Link href="#schedule" className="button button-primary banner-cta">
            VIEW FULL 5-SHOW SCHEDULE
          </Link>
        </div>
      </div>
    </section>
  );
}

function formatShortDate(value?: string) {
  if (!value) return 'Date TBD';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date);
}
