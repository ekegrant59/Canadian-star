import type { Metadata, Viewport } from 'next';
import { EVENT } from '@/config/event';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: EVENT.name,
    template: `%s | ${EVENT.shortName}`,
  },
  description:
    'A five-week live country music competition for emerging and unsigned Ontario artists. Five shows, January 9 to February 6, 2027.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: EVENT.name,
  },
  robots: {
    // Flipped on for real once the domain and event name are confirmed (§17).
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0e0e0e',
  width: 'device-width',
  initialScale: 1,
  // Never disable zoom: pinch-zoom is an accessibility requirement.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={fontVariables}>
      <body className="bg-canvas text-text min-h-dvh antialiased">{children}</body>
    </html>
  );
}
