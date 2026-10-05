import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { asc, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { judges, sponsors, homepageAnnouncements } from '@/db/schema';
import { requireAdminWriteOrThrow, requireRoleOrThrow } from '@/lib/auth/guards';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getCloudinaryConfig, signUploadParams } from '@/lib/storage/cloudinary';
import { publicMediaUrl } from '@/lib/storage';

const contentPayloadSchema = z.object({
  homepageAnnouncement: z
    .object({
      enabled: z.boolean(),
      headline: z.string().trim().min(1).max(200),
      subtext: z.string().trim().min(1).max(1000),
    })
    .optional(),
  judges: z
    .array(
      z.object({
        id: z.string().trim().max(100),
        name: z.string().trim().min(1).max(150),
        role: z.string().trim().max(150),
        bio: z.string().trim().max(2000),
        avatarUrl: z.string().trim().max(2000),
        status: z.enum(['confirmed', 'prospect']),
      }),
    )
    .max(20)
    .optional(),
  sponsors: z
    .array(
      z.object({
        id: z.string().trim().max(100),
        name: z.string().trim().min(1).max(150),
        websiteUrl: z.union([z.literal(''), z.string().url()]),
        logoUrl: z.string().trim().max(2000),
        tier: z.enum(['title', 'presenting', 'community']),
        placement: z.enum(['top', 'bottom']).default('bottom'),
      }),
    )
    .max(50)
    .optional(),
});

function imageUrl(key: string | null) {
  return publicMediaUrl(key, 'thumb') ?? '';
}

function contentMediaPublicId(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (
      url.hostname !== 'res.cloudinary.com' ||
      !cloudName ||
      !url.pathname.startsWith(`/${cloudName}/image/upload/`)
    )
      return null;
    const match = decodeURIComponent(url.pathname).match(
      /\/(content\/(?:judges|sponsors)\/[^/]+)$/,
    );
    return match?.[1]?.replace(/\.[a-z0-9]+$/i, '') ?? null;
  } catch {
    return null;
  }
}

async function deleteContentMedia(value: string | null) {
  const publicId = contentMediaPublicId(value);
  if (!publicId) return;
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const params = {
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
    invalidate: true,
  };
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      public_id: params.public_id,
      timestamp: String(params.timestamp),
      invalidate: String(params.invalidate),
      api_key: apiKey,
      signature: signUploadParams(params, apiSecret),
    }),
  });
  const result = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!response.ok || !['ok', 'not found'].includes(result.result ?? '')) {
    throw new Error(result.error?.message ?? `Cloudinary cleanup failed (${response.status}).`);
  }
}

export async function GET() {
  try {
    await requireRoleOrThrow('admin');
    const [judgeRows, sponsorRows, announcementRows] = await Promise.all([
      db.select().from(judges).orderBy(asc(judges.displayOrder), asc(judges.name)),
      db.select().from(sponsors).orderBy(asc(sponsors.displayOrder), asc(sponsors.name)),
      db.select().from(homepageAnnouncements).orderBy(asc(homepageAnnouncements.createdAt)),
    ]);
    const announcement = announcementRows[0];
    return NextResponse.json({
      homepageAnnouncement: announcement
        ? {
            enabled: announcement.published,
            status: announcement.published ? 'active' : 'inactive',
            headline: announcement.title,
            subtext: announcement.body,
          }
        : null,
      judges: judgeRows.map((judge) => ({
        id: judge.id,
        name: judge.name,
        role: judge.title ?? 'Judge',
        bio: judge.bio ?? '',
        avatarUrl: imageUrl(judge.photoKey),
        status: judge.status === 'confirmed' ? 'confirmed' : 'prospect',
      })),
      sponsors: sponsorRows.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        websiteUrl: sponsor.websiteUrl ?? '',
        logoUrl: imageUrl(sponsor.logoKey),
        tier: sponsor.tier === 'presenting' ? 'presenting' : 'community',
        placement: sponsor.placement === 'top' ? 'top' : 'bottom',
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch {
    return NextResponse.json(
      { error: 'Read-only administrators cannot edit content.' },
      { status: 403 },
    );
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = contentPayloadSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: 'Check the content fields and URLs.' }, { status: 400 });
  const payload = parsed.data;
  const now = new Date();
  try {
    const [existingJudges, existingSponsors] = await Promise.all([
      db.select({ id: judges.id, media: judges.photoKey }).from(judges),
      db.select({ id: sponsors.id, media: sponsors.logoKey }).from(sponsors),
    ]);
    await db.transaction(async (tx) => {
      if (payload.homepageAnnouncement) {
        const item = payload.homepageAnnouncement;
        await tx
          .insert(homepageAnnouncements)
          .values({
            id: 'homepage-primary',
            title: item.headline.trim(),
            body: item.subtext.trim(),
            published: item.enabled,
            startsAt: null,
            endsAt: null,
            updatedBy: admin.id,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: homepageAnnouncements.id,
            set: {
              title: item.headline.trim(),
              body: item.subtext.trim(),
              published: item.enabled,
              startsAt: null,
              endsAt: null,
              updatedBy: admin.id,
              updatedAt: now,
            },
          });
      }
      if (payload.judges) {
        const judgeRows = payload.judges.map((judge) => ({
          ...judge,
          id: judge.id || randomUUID(),
        }));
        for (const [index, judge] of judgeRows.entries())
          await tx
            .insert(judges)
            .values({
              id: judge.id,
              name: judge.name,
              title: judge.role || null,
              bio: judge.bio || null,
              photoKey: judge.avatarUrl || null,
              status: judge.status,
              displayOrder: index,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: judges.id,
              set: {
                name: judge.name,
                title: judge.role || null,
                bio: judge.bio || null,
                photoKey: judge.avatarUrl || null,
                status: judge.status,
                displayOrder: index,
                updatedAt: now,
              },
            });
        if (judgeRows.length)
          await tx.delete(judges).where(
            notInArray(
              judges.id,
              judgeRows.map((judge) => judge.id),
            ),
          );
        else await tx.delete(judges);
      }
      if (payload.sponsors) {
        const sponsorRows = payload.sponsors.map((sponsor) => ({
          ...sponsor,
          id: sponsor.id || randomUUID(),
        }));
        for (const [index, sponsor] of sponsorRows.entries()) {
          const tier = sponsor.tier === 'community' ? 'radio_media' : 'presenting';
          await tx
            .insert(sponsors)
            .values({
              id: sponsor.id,
              name: sponsor.name,
              websiteUrl: sponsor.websiteUrl || null,
              logoKey: sponsor.logoUrl || null,
              tier,
              status: 'confirmed',
              displayOrder: index,
              placement: sponsor.placement,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: sponsors.id,
              set: {
                name: sponsor.name,
                websiteUrl: sponsor.websiteUrl || null,
                logoKey: sponsor.logoUrl || null,
                tier,
                status: 'confirmed',
                displayOrder: index,
                placement: sponsor.placement,
                updatedAt: now,
              },
            });
        }
        if (sponsorRows.length)
          await tx.delete(sponsors).where(
            notInArray(
              sponsors.id,
              sponsorRows.map((sponsor) => sponsor.id),
            ),
          );
        else await tx.delete(sponsors);
      }
    });
    const removedMedia: string[] = [];
    if (payload.judges) {
      const retainedJudgeMedia = new Set(payload.judges.map((judge) => judge.avatarUrl));
      removedMedia.push(
        ...existingJudges
          .map((record) => record.media)
          .filter((media): media is string => media !== null && !retainedJudgeMedia.has(media)),
      );
    }
    if (payload.sponsors) {
      const retainedSponsorMedia = new Set(payload.sponsors.map((sponsor) => sponsor.logoUrl));
      removedMedia.push(
        ...existingSponsors
          .map((record) => record.media)
          .filter((media): media is string => media !== null && !retainedSponsorMedia.has(media)),
      );
    }
    const cleanup = await Promise.allSettled([...new Set(removedMedia)].map(deleteContentMedia));
    cleanup.forEach((result) => {
      if (result.status === 'rejected')
        console.error('[admin] content media cleanup failed', result.reason);
    });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] content update failed', error);
    return NextResponse.json({ error: 'Content could not be saved.' }, { status: 500 });
  }
}
