import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet the Artists | Vote',
  description:
    'Explore published Ontario country artists and cast one verified vote for your favourite.',
  alternates: { canonical: '/artists' },
  openGraph: {
    type: 'website',
    title: 'Meet the Artists | Canadian Country Star',
    description:
      'Explore published Ontario country artists competing for the title and find your favourite.',
    url: '/artists',
    images: [
      {
        url: '/images/artist-profile-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Canadian Country Star artists',
      },
    ],
  },
  twitter: { card: 'summary_large_image', images: ['/images/artist-profile-hero.jpg'] },
};

export default function ArtistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
