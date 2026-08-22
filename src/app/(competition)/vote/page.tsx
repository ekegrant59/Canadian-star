import ArtistsRosterPage from '../artists/page';

export const metadata = {
  title: 'Vote for the Next Great Canadian Country Star',
  description:
    'Choose an eligible artist and verify your email to cast one vote in the public shortlist round.',
  alternates: { canonical: '/vote' },
  openGraph: {
    type: 'website',
    title: 'Vote for the Next Great Canadian Country Star',
    description:
      'Choose an eligible artist and cast one verified vote in the public shortlist round.',
    url: '/vote',
    images: [
      {
        url: '/images/artist-profile-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Vote for Canadian country artists',
      },
    ],
  },
  twitter: { card: 'summary_large_image', images: ['/images/artist-profile-hero.jpg'] },
};

export default function VotePage() {
  return <ArtistsRosterPage />;
}
