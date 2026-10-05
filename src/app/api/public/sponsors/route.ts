import { NextResponse } from 'next/server';
import { getConfirmedSponsors } from '@/server/queries/public';
import { publicMediaUrl } from '@/lib/storage';

export async function GET() {
  const rows = await getConfirmedSponsors();
  return NextResponse.json(
    {
      sponsors: rows.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        websiteUrl: sponsor.websiteUrl,
        logoUrl: publicMediaUrl(sponsor.logoKey, 'sponsorLogo'),
        placement: sponsor.placement,
      })),
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
