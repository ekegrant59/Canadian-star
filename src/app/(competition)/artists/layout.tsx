import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet the Artists | Vote',
  description:
    'Explore published Ontario country artists and cast one verified vote for your favourite.',
  alternates: { canonical: '/artists' },
};

export default function ArtistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
