import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site-url';
import { getPublicArtistCards } from '@/server/queries/public';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const artists = await getPublicArtistCards();
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/artists`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/vote`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...artists.map((artist) => ({
      url: `${SITE_URL}/artists/${artist.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
