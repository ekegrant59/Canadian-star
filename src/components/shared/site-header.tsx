'use client';

import Link from 'next/link';
import { useState, type MouseEvent } from 'react';
import { Menu, X } from 'lucide-react';

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="brand" aria-label="Canadian Star home" onClick={onClick}>
      <span>CANADIAN STAR</span>
    </Link>
  );
}

interface SiteHeaderProps {
  activeNav?: 'competition' | 'artists' | 'events' | 'judges';
  isHome?: boolean;
}

export function SiteHeader({ activeNav, isHome = false }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const getHref = (hash: string) => {
    return isHome ? hash : `/${hash}`;
  };

  const navigateToSection = (hash: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    if (!isHome) return;

    const section = document.querySelector(hash);
    if (!section) return;

    event.preventDefault();
    window.history.pushState(null, '', hash);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="site-header-wrapper">
      <div className="site-header container-content">
        <Brand />

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link
            href={getHref('#journey')}
            onClick={navigateToSection('#journey')}
            className={activeNav === 'competition' ? 'active-nav' : undefined}
          >
            COMPETITION
          </Link>
          <Link
            href={getHref('#artists')}
            onClick={navigateToSection('#artists')}
            className={activeNav === 'artists' ? 'active-nav' : undefined}
          >
            ARTISTS
          </Link>
          <Link
            href={getHref('#schedule')}
            onClick={navigateToSection('#schedule')}
            className={activeNav === 'events' ? 'active-nav' : undefined}
          >
            EVENTS
          </Link>
          <Link
            href={getHref('#judges')}
            onClick={navigateToSection('#judges')}
            className={activeNav === 'judges' ? 'active-nav' : undefined}
          >
            JUDGES
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            href={getHref('#schedule')}
            onClick={navigateToSection('#schedule')}
            className="button button-secondary button-header"
          >
            GET TICKETS
          </Link>
          <Link href="/signup" className="button button-primary">
            APPLY NOW
          </Link>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <Link onClick={navigateToSection('#journey')} href={getHref('#journey')}>
              COMPETITION
            </Link>
            <Link onClick={navigateToSection('#artists')} href={getHref('#artists')}>
              ARTISTS
            </Link>
            <Link onClick={navigateToSection('#schedule')} href={getHref('#schedule')}>
              EVENTS
            </Link>
            <Link onClick={navigateToSection('#judges')} href={getHref('#judges')}>
              JUDGES
            </Link>
            <div className="mobile-nav-buttons">
              <Link
                onClick={() => setMenuOpen(false)}
                href="/signup"
                className="button button-primary"
              >
                APPLY NOW
              </Link>
              <Link
                onClick={navigateToSection('#schedule')}
                href={getHref('#schedule')}
                className="button button-secondary"
              >
                GET TICKETS
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
