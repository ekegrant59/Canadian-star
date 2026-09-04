import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { Brand, SiteHeader } from '@/components/shared/site-header';

export function LegalPage({
  title,
  intro,
  updated = 'September 2026',
  children,
}: {
  title: string;
  intro: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <SiteHeader />
      <article className="legal-shell container-content">
        <header className="legal-hero">
          <div className="legal-hero-mark" aria-hidden="true">
            <FileText />
          </div>
          <div className="legal-hero-copy">
            <p className="legal-kicker">CANADIAN STAR / OFFICIAL INFORMATION</p>
            <h1>{title}</h1>
            <p className="legal-intro">{intro}</p>
            <div className="legal-meta">
              <span>LAST UPDATED {updated.toUpperCase()}</span>
              <span className="legal-meta-divider" aria-hidden="true" />
              <span>CANADIAN STAR TEAM</span>
            </div>
          </div>
        </header>

        <div className="legal-layout">
          <div className="legal-content">{children}</div>
          <aside className="legal-aside">
            <p className="legal-aside-label">NEED A HAND?</p>
            <p>
              We keep the important details clear. Our competition team can help with anything that
              is not covered here.
            </p>
            <Link href="/contact" className="legal-aside-link">
              Contact the team <ArrowUpRight aria-hidden="true" />
            </Link>
          </aside>
        </div>

        <nav className="legal-links" aria-label="Footer links">
          <span>Explore the official pages</span>
          <div>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/rules">Competition Rules</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </nav>
      </article>
      <footer className="legal-footer">
        <div className="container-content footer-top">
          <div className="footer-brand">
            <Brand />
            <p>Celebrating the authentic voices of Ontario&apos;s country music scene.</p>
          </div>
          <div className="footer-nav">
            <Link href="/artists">Artists</Link>
            <Link href="/#schedule">Events</Link>
            <Link href="/signup">Apply now</Link>
          </div>
        </div>
        <div className="container-content footer-bottom">
          <span>© 2026 The Next Great Canadian Country Star. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
