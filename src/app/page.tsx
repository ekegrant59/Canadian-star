import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/landing-page';

export const metadata: Metadata = {
  title: 'The Next Great Canadian Country Star',
  description:
    'Ontario emerging country artists compete for the crown across four qualifying shows and one grand final.',
};

export default function HomePage() {
  return <LandingPage />;
}
