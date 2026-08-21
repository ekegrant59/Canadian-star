import { NextResponse } from 'next/server';
import { getConfirmedSponsors } from '@/server/queries/public';

function publicMediaUrl(key: string | null) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return key && cloud
    ? `https://res.cloudinary.com/${cloud}/image/upload/c_limit,w_400,h_160,q_auto,f_auto/${key}`
    : null;
}

export async function GET() {
  const rows = await getConfirmedSponsors();
  return NextResponse.json(
    {
      sponsors: rows.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        websiteUrl: sponsor.websiteUrl,
        logoUrl: publicMediaUrl(sponsor.logoKey),
      })),
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
