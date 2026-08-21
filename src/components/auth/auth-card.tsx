'use client';

import Image from 'next/image';
import { SiteHeader } from '@/components/shared/site-header';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-page-wrapper">
      {/* Background layer matching hero */}
      <div className="auth-bg-layer" aria-hidden="true">
        <Image
          src="/images/reference/image0_4_4.png"
          alt=""
          fill
          priority
          unoptimized
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        <div className="hero-scrim" />
      </div>

      {/* Sticky shared header */}
      <SiteHeader />

      {/* Main card container */}
      <main className="auth-main-content">
        <div className="auth-card">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
