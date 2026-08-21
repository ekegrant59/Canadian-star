import { NextResponse } from 'next/server';
import {
  getFeatureFlag,
  getPublicVotingArtists,
  isCompetitionStageActive,
} from '@/server/queries/public';

export async function GET() {
  const [rows, flag, stageActive] = await Promise.all([
    getPublicVotingArtists(),
    getFeatureFlag('VOTING_OPEN'),
    isCompetitionStageActive('voting'),
  ]);
  const artists = rows.map((artist) => ({
    id: artist.id,
    name: artist.actName,
    slug: artist.slug,
    hometown:
      [artist.locationCity, artist.locationProvince].filter(Boolean).join(', ') || 'Ontario',
    genre: artist.actType === 'band' ? 'Country band' : 'Country artist',
    actType: artist.actType,
    photoUrl:
      artist.primaryPhotoKey && process.env.CLOUDINARY_CLOUD_NAME
        ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_800,h_600,q_auto,f_auto/${artist.primaryPhotoKey}`
        : '/images/artist-profile-hero.jpg',
    bioSnippet: artist.bio,
  }));
  return NextResponse.json(
    { artists, votingOpen: flag && stageActive },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } },
  );
}
