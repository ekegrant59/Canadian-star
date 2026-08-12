'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  CalendarDays,
  FileText,
  Globe,
  MapPin,
  Menu,
  Music2,
  Plane,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

const image = (name: string) => `/images/reference/${name}`;

const journey = [
  {
    label: 'APPLY',
    title: 'APPLY',
    copy: 'Submit your best original songs and live performance videos.',
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

const eligibility = [
  {
    icon: Globe,
    title: 'Residency',
    copy: 'Must be a legal resident of Canada.',
  },
  {
    icon: UserCheck,
    title: 'Age Requirements',
    copy: '18 years of age or older at the time of application.',
  },
  {
    icon: Users,
    title: 'Artist Format',
    copy: 'Solo artists, duos, and full bands are all welcome to apply.',
  },
  {
    icon: FileText,
    title: 'Agreements',
    copy: 'Must not be bound by exclusive recording or management contracts that conflict with the competition terms.',
  },
  {
    icon: Music2,
    title: 'Original Music',
    copy: 'Must have original material prepared for performance.',
  },
  {
    icon: Plane,
    title: 'Travel & Accommodation',
    copy: 'Artists are responsible for their own travel and accommodation unless otherwise specified.',
    badge: 'DETAILS TO BE CONFIRMED',
  },
] as const;

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

const judges = [
  {
    name: 'FLINT KANE',
    role: 'A&R DIRECTOR, NASHVILLE',
    image: image('image5_4_4.png'),
    copy: 'Over 20 years discovering top country talent across North America',
  },
  {
    name: 'ELENA VANCE',
    role: 'HIT SONGWRITER',
    image: image('image6_4_4.png'),
    copy: 'Penned over 15 number 2 singles for top country artists.',
  },
  {
    name: 'MARCUS THORNE',
    role: 'A&R DIRECTOR, NASHVILLE',
    image: image('image7_4_4.png'),
    copy: 'Over 20 years discovering top country talent across North America',
  },
  {
    name: 'DAVIDA STERLING',
    role: 'FESTIVAL PRODUCER',
    image: image('image8_4_4.png'),
    copy: 'Creator of Canada’s largest summer country music festivals.',
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

function Brand() {
  return (
    <Link href="#top" className="brand" aria-label="Canadian Star home">
      <span>CANADIAN STAR</span>
    </Link>
  );
}

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

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [journeyPaused, setJourneyPaused] = useState(false);
  const [schedulePaused, setSchedulePaused] = useState(false);
  const [journeyInView, setJourneyInView] = useState(false);
  const [scheduleInView, setScheduleInView] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState('');

  const journeySectionRef = useRef<HTMLElement | null>(null);
  const scheduleSectionRef = useRef<HTMLElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scheduleRowRef = useRef<HTMLDivElement | null>(null);

  const currentJourney = journey[journeyIndex] ?? journey[0];

  // IntersectionObserver to observe viewport visibility of moving sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === journeySectionRef.current) {
            setJourneyInView(entry.isIntersecting);
          }
          if (entry.target === scheduleSectionRef.current) {
            setScheduleInView(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.2 },
    );

    const jEl = journeySectionRef.current;
    const sEl = scheduleSectionRef.current;
    if (jEl) observer.observe(jEl);
    if (sEl) observer.observe(sEl);

    return () => {
      if (jEl) observer.unobserve(jEl);
      if (sEl) observer.unobserve(sEl);
      observer.disconnect();
    };
  }, []);

  // Auto-looping Journey stages (resumes from current journeyIndex after manual selection)
  useEffect(() => {
    if (!journeyInView || journeyPaused) return;
    const timer = setInterval(() => {
      setJourneyIndex((prevIndex) => (prevIndex + 1) % journey.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [journeyInView, journeyPaused, journeyIndex]);

  // Container-only horizontal tab scrolling
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
        behavior: 'smooth',
      });
    }
  }, [journeyIndex]);

  // Auto-moving Schedule Carousel (resumes from current scheduleIndex after manual scroll)
  useEffect(() => {
    if (!scheduleInView || schedulePaused) return;
    const timer = setInterval(() => {
      setScheduleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % shows.length;
        if (scheduleRowRef.current) {
          const cardWidth = scheduleRowRef.current.children[0]?.clientWidth || 260;
          scheduleRowRef.current.scrollTo({
            left: nextIndex * (cardWidth + 16),
            behavior: 'smooth',
          });
        }
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [scheduleInView, schedulePaused, scheduleIndex]);

  // Sync manual user scrolling on Schedule row to active scheduleIndex
  const handleScheduleScroll = () => {
    if (scheduleRowRef.current) {
      const container = scheduleRowRef.current;
      const cardWidth = container.children[0]?.clientWidth || 260;
      const gap = 16;
      const newIndex = Math.round(container.scrollLeft / (cardWidth + gap));
      if (newIndex >= 0 && newIndex < shows.length && newIndex !== scheduleIndex) {
        setScheduleIndex(newIndex);
      }
    }
  };

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setNewsletterStatus('Enter a valid email address.');
      return;
    }
    setNewsletterStatus('You’re on the list. Watch your inbox for competition news.');
    event.currentTarget.reset();
  }

  return (
    <main id="main">
      <header className="site-header-wrapper">
        <div className="site-header container-content">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="#journey" className="active-nav">
              COMPETITION
            </Link>
            <Link href="#eligibility">ARTISTS</Link>
            <Link href="#schedule">EVENTS</Link>
            <Link href="#judges">JUDGES</Link>
          </nav>
          <div className="header-actions">
            <Link href="#schedule" className="button button-secondary button-header">
              GET TICKETS
            </Link>
            <ButtonLink href="/apply">APPLY NOW</ButtonLink>
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
              <Link onClick={() => setMenuOpen(false)} href="#journey">
                COMPETITION
              </Link>
              <Link onClick={() => setMenuOpen(false)} href="#eligibility">
                ARTISTS
              </Link>
              <Link onClick={() => setMenuOpen(false)} href="#schedule">
                EVENTS
              </Link>
              <Link onClick={() => setMenuOpen(false)} href="#judges">
                JUDGES
              </Link>
              <div className="mobile-nav-buttons">
                <ButtonLink href="/apply">APPLY NOW</ButtonLink>
                <Link
                  onClick={() => setMenuOpen(false)}
                  href="#schedule"
                  className="button button-secondary"
                >
                  GET TICKETS
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <section className="hero" id="top">
        <Image
          src={image('image0_4_4.png')}
          alt="A crowd watching a large outdoor concert stage"
          fill
          priority
          unoptimized
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        <div className="hero-scrim" />
        <div className="hero-content container-content">
          <span className="hero-kicker">ONTARIO&apos;S EMERGING COUNTRY ARTISTS</span>
          <h1>
            THE NEXT GREAT
            <br />
            CANADIAN COUNTRY STAR
          </h1>
          <p>Four qualifying shows. Four finalists. One artist takes the crown.</p>
          <div className="hero-date">
            <span className="date-item">
              <CalendarDays aria-hidden="true" /> JANUARY 9 – FEBRUARY 6, 2027
            </span>
            <span className="date-sep" aria-hidden="true">
              |
            </span>
            <span className="date-item">
              <MapPin aria-hidden="true" /> PETERBOROUGH, ONTARIO
            </span>
          </div>
          <div className="hero-buttons">
            <ButtonLink href="/apply">APPLY NOW</ButtonLink>
            <ButtonLink href="#schedule" secondary>
              GET TICKETS
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="intro-section section-pad">
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

      <section
        className="section-pad surface"
        id="journey"
        ref={journeySectionRef}
        onMouseEnter={() => setJourneyPaused(true)}
        onMouseLeave={() => setJourneyPaused(false)}
        onFocus={() => setJourneyPaused(true)}
        onBlur={() => setJourneyPaused(false)}
      >
        <div className="container-content">
          <div className="section-intro">
            <h2>THE JOURNEY TO STARDOM</h2>
            <p>
              From application to the grand final, the path to becoming the next country star is
              intense and rewarding.
            </p>
          </div>
          <div className="journey-media">
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
            {journey.map((stage, index) => (
              <button
                key={stage.label}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                aria-selected={journeyIndex === index}
                className={journeyIndex === index ? 'active' : ''}
                onClick={() => setJourneyIndex(index)}
              >
                <span>0{index + 1}</span>
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad" id="eligibility">
        <div className="container-content">
          <div className="section-intro">
            <h2>ELIGIBILITY CRITERIA</h2>
            <p>
              Ensure you meet all essential requirements before beginning your application process.
            </p>
          </div>
          <div className="card-grid eligibility-grid">
            {eligibility.map((item) => {
              const Icon = item.icon;
              return (
                <article className="info-card" key={item.title}>
                  <Icon aria-hidden="true" className="card-icon" />
                  <div className="card-title-line">
                    <h3>{item.title}</h3>
                    {'badge' in item && <span className="pill-badge">{item.badge}</span>}
                  </div>
                  <p>{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

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

      <section className="image-cta apply-cta">
        <Image
          src={image('image4_4_4.jpg')}
          alt="A vocalist recording in a professional studio"
          fill
          unoptimized
          style={{ objectFit: 'cover' }}
        />
        <div className="image-cta-scrim" />
        <div className="image-cta-content">
          <h2>
            THINK YOU&apos;VE GOT
            <br />
            WHAT IT TAKES?
          </h2>
          <p>
            We are looking for original voices, authentic songwriting, and undeniable stage
            presence.
            <br />
            <br />
            Submit your best work to be considered for the competition.
          </p>
          <ButtonLink href="/apply">APPLY TO COMPETE</ButtonLink>
        </div>
      </section>

      <section className="section-pad" id="judges">
        <div className="container-content">
          <div className="section-intro">
            <h2>JUDGED BY PEOPLE WHO KNOW THE BUSINESS</h2>
            <p>
              Our panel of industry veterans, hit songwriters, and label executives will guide the
              artists and select the ultimate winner.
            </p>
          </div>
          <div className="judges-grid">
            {judges.map((judge) => (
              <article className="judge-card" key={judge.name}>
                <div className="judge-image">
                  <Image
                    src={judge.image}
                    alt={judge.name}
                    fill
                    unoptimized
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <h3>{judge.name}</h3>
                <span className="judge-role">{judge.role}</span>
                <p>{judge.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section-pad surface"
        id="schedule"
        ref={scheduleSectionRef}
        onMouseEnter={() => setSchedulePaused(true)}
        onMouseLeave={() => setSchedulePaused(false)}
        onFocus={() => setSchedulePaused(true)}
        onBlur={() => setSchedulePaused(false)}
      >
        <div className="container-content">
          <div className="section-intro">
            <h2>THE ROAD TO THE CROWN</h2>
          </div>
          <div
            className="schedule-row no-scrollbar"
            ref={scheduleRowRef}
            onScroll={handleScheduleScroll}
          >
            {shows.map((show) => (
              <article className={show.final ? 'show-card final-show' : 'show-card'} key={show.n}>
                <span className="show-type">{show.subtitle}</span>
                <h3>{show.date}</h3>
                <p>{show.copy}</p>
                <Link href="#newsletter" className="show-btn">
                  {show.btn}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

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
              <button className="button button-primary" type="submit">
                SUBSCRIBE
              </button>
            </div>
            <p className="form-status" role="status">
              {newsletterStatus}
            </p>
          </form>
        </div>
      </section>

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
            <ButtonLink href="/apply">APPLY NOW</ButtonLink>
            <ButtonLink href="#schedule" secondary>
              GET TICKETS
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="partners">
        <span>OFFICIAL PARTNERS</span>
        <div className="marquee-container no-scrollbar">
          <div className="marquee-track">
            {[...Array(3)].map((_, setIdx) => (
              <div className="marquee-group" key={setIdx}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Image
                    key={`${setIdx}-${i}`}
                    src={image('image10_4_4.png')}
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
    </main>
  );
}
