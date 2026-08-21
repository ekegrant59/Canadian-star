import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtistProfileView } from './artist-profile-view';
import {
  getFeatureFlag,
  getPublicArtistBySlug,
  isCompetitionStageActive,
} from '@/server/queries/public';
import { EVENT } from '@/config/event';
import { SITE_URL } from '@/config/site-url';
import { resolveMusicLinkMetadata } from '@/lib/music-metadata';

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublicArtistBySlug(slug);
  if (!row) return { title: 'Artist not found' };
  const description =
    row.bio?.slice(0, 155) ||
    `${row.actName} is competing in ${EVENT.shortName}. Vote for this Ontario country artist.`;
  const image =
    row.primaryPhotoKey && process.env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_auto/${row.primaryPhotoKey}`
      : `${SITE_URL}/images/artist-profile-hero.jpg`;
  return {
    title: `Vote for ${row.actName}`,
    description,
    alternates: { canonical: `/artists/${row.slug}` },
    openGraph: {
      type: 'profile',
      title: `Vote for ${row.actName}`,
      description,
      url: `/artists/${row.slug}`,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: row.actName }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `Vote for ${row.actName}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArtistProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const [realArtist, flag, stageActive] = await Promise.all([
    getPublicArtistBySlug(slug),
    getFeatureFlag('VOTING_OPEN'),
    isCompetitionStageActive('voting'),
  ]);
  const musicMetadata = realArtist
    ? await resolveMusicLinkMetadata(Object.values(realArtist.musicLinks ?? {}).filter(Boolean))
    : [];
  const artist = realArtist
    ? {
        id: realArtist.id,
        name: realArtist.actName,
        slug: realArtist.slug,
        hometown:
          [realArtist.locationCity, realArtist.locationProvince].filter(Boolean).join(', ') ||
          'Ontario',
        genre: realArtist.actType === 'band' ? 'Country band' : 'Country artist',
        actType: realArtist.actType,
        photoUrl:
          realArtist.primaryPhotoKey && process.env.CLOUDINARY_CLOUD_NAME
            ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_limit,w_1200,q_auto,f_auto/${realArtist.primaryPhotoKey}`
            : '/images/artist-profile-hero.jpg',
        bioSnippet: realArtist.bio ?? undefined,
        websiteUrl: realArtist.websiteUrl,
        performanceVideoUrl: realArtist.performanceVideoUrl,
        socialLinks: realArtist.socialLinks,
        musicLinks: realArtist.musicLinks,
        formationYear: realArtist.formationYear,
        memberCount: realArtist.memberCount,
        applicationStatus: ['approved', 'shortlisted', 'finalist'].includes(
          realArtist.applicationStatus,
        )
          ? (realArtist.applicationStatus as 'approved' | 'shortlisted' | 'finalist')
          : 'approved',
        musicMetadata,
      }
    : undefined;

  if (!artist) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e0e]" />}>
      <ArtistProfileView artist={artist} votingOpen={flag && stageActive} />
    </Suspense>
  );
}
