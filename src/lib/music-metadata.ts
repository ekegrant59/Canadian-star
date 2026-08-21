import 'server-only';

export type MusicLinkMetadata = {
  url: string;
  title: string;
  subtitle: string | null;
  image: string | null;
};

/**
 * Resolves public track metadata from providers that expose a no-auth oEmbed
 * endpoint. A link remains usable even when a provider declines the lookup.
 */
export async function resolveMusicLinkMetadata(urls: string[]): Promise<MusicLinkMetadata[]> {
  return Promise.all(
    urls.map(async (url) => {
      const fallback = fallbackMetadata(url);
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        const endpoint = host.includes('spotify.com')
          ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
          : host.includes('soundcloud.com')
            ? `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
            : null;
        const response = await fetch(endpoint ?? url, {
          next: { revalidate: 3600 },
          headers: { Accept: 'text/html,application/xhtml+xml,application/json' },
        });
        if (!response.ok) return fallback;
        const contentType = response.headers.get('content-type') ?? '';
        if (endpoint || contentType.includes('json')) {
          const data = (await response.json()) as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
          };
          return {
            ...fallback,
            title: data.title?.trim() || fallback.title,
            subtitle: data.author_name?.trim() || fallback.subtitle,
            image: proxyImageUrl(absoluteUrl(data.thumbnail_url, url)) || fallback.image,
          };
        }
        const html = await response.text();
        const title =
          readMeta(html, 'og:title') || readMeta(html, 'twitter:title') || readTitle(html);
        const subtitle = readMeta(html, 'og:description') || readMeta(html, 'description');
        const image = readMeta(html, 'og:image') || readMeta(html, 'twitter:image');
        return {
          url,
          title: title || fallback.title,
          subtitle: subtitle || fallback.subtitle,
          image: proxyImageUrl(absoluteUrl(image, url)) || fallback.image,
        };
      } catch {
        return fallback;
      }
    }),
  );
}

function readMeta(html: string, name: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const reverse = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
    'i',
  );
  return decodeHtml(pattern.exec(html)?.[1] || reverse.exec(html)?.[1] || '').trim();
}

function readTitle(html: string) {
  return decodeHtml(/<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] || '').trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function absoluteUrl(value: string | undefined, source: string) {
  if (!value) return null;
  try {
    return new URL(value, source).toString();
  } catch {
    return null;
  }
}

function proxyImageUrl(value: string | null) {
  return value ? `/api/public/music-cover?url=${encodeURIComponent(value)}` : null;
}

function fallbackMetadata(url: string): MusicLinkMetadata {
  try {
    const parsed = new URL(url);
    const service = parsed.hostname.replace(/^www\./, '').split('.')[0] || 'Music';
    const path = decodeURIComponent(parsed.pathname).split('/').filter(Boolean);
    const readable = path
      .find((segment) => /[a-z]/i.test(segment) && !/^\d+$/.test(segment))
      ?.replace(/[-_+]+/g, ' ')
      .trim();
    return { url, title: readable || `${service} release`, subtitle: service, image: null };
  } catch {
    return { url, title: 'Recorded music', subtitle: null, image: null };
  }
}
