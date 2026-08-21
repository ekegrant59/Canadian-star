'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LandingStage } from '@/types/landing';

interface StageClosingCtaProps {
  stage: LandingStage;
}

const CTA_DATA: Record<
  LandingStage,
  {
    image: string;
    heading: string;
    subhead: string;
    buttonLabel: string;
    buttonHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  }
> = {
  applications: {
    image: '/images/reference/image4_4_4.jpg',
    heading: "THINK YOU'VE GOT\nWHAT IT TAKES?",
    subhead:
      'We are looking for original voices, authentic songwriting, and undeniable stage presence.\n\nSubmit your best work to be considered for the competition.',
    buttonLabel: 'APPLY TO COMPETE',
    buttonHref: '/signup',
  },
  voting: {
    image: '/images/reference/image4_4_4.jpg',
    heading: 'EVERY VOTE SHAPES\nTHE LIVE SHOWS',
    subhead:
      'Your verified votes help our industry review panel determine who advances to the Peterborough stage.\n\nHelp your favourite Ontario artist make the Final 16.',
    buttonLabel: 'CAST YOUR VOTE NOW',
    buttonHref: '#voting-roster',
    secondaryLabel: 'HOW VOTING WORKS',
    secondaryHref: '#how-it-works',
  },
  anticipation: {
    image: '/images/reference/image4_4_4.jpg',
    heading: 'THE CLOCK IS TICKING\nFINAL CHANCE TO VOTE',
    subhead:
      'The public fan voting period will close permanently at midnight.\n\nOnce locked, the top 16 will be announced ahead of the January live shows.',
    buttonLabel: 'VOTE BEFORE DEADLINE',
    buttonHref: '#anticipation-status',
    secondaryLabel: 'VIEW SHOW DATES',
    secondaryHref: '#schedule',
  },
  finalists: {
    image: '/images/reference/image4_4_4.jpg',
    heading: 'WITNESS THE FINAL 16\nLIVE IN PETERBOROUGH',
    subhead:
      'Four qualifying shows. 16 exceptional country artists. One crowned winner.\n\nExperience Ontario’s next breakout country star live on stage.',
    buttonLabel: 'GET SHOW TICKETS',
    buttonHref: '#schedule',
    secondaryLabel: 'EXPLORE ARTISTS',
    secondaryHref: '#finalists-roster',
  },
};

export function StageClosingCta({ stage }: StageClosingCtaProps) {
  const data = CTA_DATA[stage] ?? CTA_DATA.applications;
  const lines = data.heading.split('\n');

  return (
    <section className="image-cta apply-cta">
      <Image
        src={data.image}
        alt="A vocalist recording in a professional music studio"
        fill
        unoptimized
        style={{ objectFit: 'cover' }}
      />
      <div className="image-cta-scrim" />
      <div className="image-cta-content">
        <h2>
          {lines.map((line, idx) => (
            <span key={idx} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p>
          {data.subhead.split('\n\n').map((paragraph, idx) => (
            <span key={idx} className="mb-2 block last:mb-0">
              {paragraph}
            </span>
          ))}
        </p>
        <div className="hero-buttons">
          <Link className="button button-primary" href={data.buttonHref}>
            {data.buttonLabel}
          </Link>
          {data.secondaryLabel && data.secondaryHref && (
            <Link className="button button-secondary" href={data.secondaryHref}>
              {data.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
