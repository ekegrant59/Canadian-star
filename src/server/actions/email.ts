'use server';

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  applications,
  artists,
  emailConsents,
  showArtists,
  shows,
  votes,
  subscribers,
} from '@/db/schema';
import { requireAdminWriteOrThrow } from '@/lib/auth/guards';
import { renderCustomBroadcastEmail } from '@/lib/email/templates';
import { sendEmail, sendTestEmailAction } from '@/lib/email/send';
import { actionError, actionOk } from './types';
import type { EmailAudienceFilter } from '@/lib/email/types';
import { normalizeEmail } from '@/lib/email-normalize';
import { escapeHtml } from '@/lib/email/layout';
import { hashVerificationCode } from '@/lib/crypto';
import { SITE_URL } from '@/config/site-url';

const EMAIL_BASE_URL = (process.env.BETTER_AUTH_URL || SITE_URL).replace(/\/+$/, '');
import { z } from 'zod';

const audienceValues = [
  'all_artists',
  'approved_artists',
  'pending_artists',
  'rejected_artists',
  'show_1_artists',
  'show_2_artists',
  'show_3_artists',
  'show_4_artists',
  'single_artist',
  'all_voters',
  'verified_voters',
  'newsletter_subscribers',
] as const;
const broadcastSchema = z.object({
  audience: z.enum(audienceValues),
  artistId: z.string().max(100).optional(),
  subject: z.string().trim().min(1).max(200),
  headline: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(50_000),
  ctaText: z.string().max(100).optional(),
  ctaUrl: z.string().max(2_000).optional(),
});
const testEmailSchema = z.object({
  toEmail: z.email(),
  templateId: z.string().max(100),
  customSubject: z.string().max(200).optional(),
  customHeadline: z.string().max(200).optional(),
  customBodyHtml: z.string().max(50_000).optional(),
  customCtaText: z.string().max(100).optional(),
  customCtaUrl: z.string().max(2_000).optional(),
});

export async function sendAdminTestEmailAction(input: Parameters<typeof sendTestEmailAction>[0]) {
  try {
    await requireAdminWriteOrThrow();
    const parsed = testEmailSchema.safeParse(input);
    if (!parsed.success) return actionError('Enter valid test email details.');
    const result = await sendTestEmailAction(parsed.data);
    return result.success
      ? actionOk({ messageId: result.messageId, devMode: result.devMode })
      : actionError(result.error || 'Email delivery failed.');
  } catch {
    return actionError('You do not have access to send email.');
  }
}

export async function sendAdminBroadcastAction(input: {
  audience: EmailAudienceFilter;
  artistId?: string;
  subject: string;
  headline: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  try {
    await requireAdminWriteOrThrow();
  } catch {
    return actionError('You do not have access to send email.');
  }
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) return actionError('Check the subject, content, audience, and links.');
  const { audience, artistId } = parsed.data;
  let recipientData: Array<{
    email: string;
    artistName?: string;
    actName?: string;
    status?: string;
    showName?: string;
    unsubscribeUrl?: string;
  }> = [];
  if (audience === 'newsletter_subscribers') {
    const rows = await db
      .select({
        id: subscribers.id,
        email: subscribers.emailRaw,
        emailCanonical: subscribers.emailCanonical,
      })
      .from(subscribers)
      .where(and(eq(subscribers.confirmed, true), isNull(subscribers.unsubscribedAt)));
    const consentRows = rows.length
      ? await db
          .select({
            emailCanonical: emailConsents.emailCanonical,
            granted: emailConsents.granted,
            createdAt: emailConsents.createdAt,
          })
          .from(emailConsents)
          .where(
            and(
              inArray(
                emailConsents.emailCanonical,
                rows.map((row) => row.emailCanonical),
              ),
              eq(emailConsents.consentType, 'marketing'),
            ),
          )
      : [];
    const latestConsent = new Map<string, { granted: boolean; createdAt: Date }>();
    for (const consent of consentRows)
      if (
        !latestConsent.has(consent.emailCanonical) ||
        latestConsent.get(consent.emailCanonical)!.createdAt < consent.createdAt
      )
        latestConsent.set(consent.emailCanonical, consent);
    recipientData = rows
      .filter((r) => latestConsent.get(r.emailCanonical)?.granted)
      .map((r) => ({
        email: r.email,
        unsubscribeUrl: `${EMAIL_BASE_URL}/newsletter/unsubscribe?id=${encodeURIComponent(r.id)}&token=${encodeURIComponent(hashVerificationCode('newsletter-unsubscribe', r.id))}`,
      }));
  } else if (audience === 'all_voters' || audience === 'verified_voters') {
    const rows = await db
      .select({ email: votes.emailRaw })
      .from(votes)
      .innerJoin(
        emailConsents,
        and(
          eq(emailConsents.emailCanonical, votes.emailCanonical),
          eq(emailConsents.consentType, 'marketing'),
          eq(emailConsents.granted, true),
          sql`${emailConsents.createdAt} = (select max(c.created_at) from email_consents c where c.email_canonical = ${votes.emailCanonical} and c.consent_type = 'marketing')`,
        ),
      )
      .where(audience === 'verified_voters' ? eq(votes.verified, true) : undefined);
    recipientData = rows.map((r) => ({ email: r.email }));
  } else {
    const showNumber = audience.match(/^show_([1-4])_artists$/)?.[1];
    const rows = await db
      .select({
        id: artists.id,
        email: artists.contactEmail,
        artistName: artists.actName,
        actName: artists.actName,
        status: applications.status,
        showName: shows.label,
      })
      .from(artists)
      .innerJoin(applications, eq(applications.artistId, artists.id))
      .leftJoin(showArtists, eq(showArtists.artistId, artists.id))
      .leftJoin(shows, eq(shows.id, showArtists.showId))
      .where(
        and(
          isNotNull(artists.contactEmail),
          audience === 'single_artist' && artistId
            ? eq(artists.id, artistId)
            : audience === 'approved_artists'
              ? inArray(applications.status, ['approved', 'shortlisted', 'finalist'])
              : audience === 'pending_artists'
                ? inArray(applications.status, ['submitted', 'under_review'])
                : audience === 'rejected_artists'
                  ? eq(applications.status, 'rejected')
                  : showNumber
                    ? sql`${shows.key} like ${`%${showNumber}%`}`
                    : undefined,
        ),
      );
    const canonicalEmails = rows
      .map((r) => {
        const normalized = r.email ? normalizeEmail(r.email) : null;
        return normalized?.ok ? normalized.canonical : null;
      })
      .filter((value): value is string => Boolean(value));
    const consentRows = canonicalEmails.length
      ? await db
          .select({
            emailCanonical: emailConsents.emailCanonical,
            granted: emailConsents.granted,
            createdAt: emailConsents.createdAt,
          })
          .from(emailConsents)
          .where(
            and(
              inArray(emailConsents.emailCanonical, canonicalEmails),
              eq(emailConsents.consentType, 'marketing'),
            ),
          )
      : [];
    const latestConsent = new Map<string, { granted: boolean; createdAt: Date }>();
    for (const consent of consentRows)
      if (
        !latestConsent.has(consent.emailCanonical) ||
        latestConsent.get(consent.emailCanonical)!.createdAt < consent.createdAt
      )
        latestConsent.set(consent.emailCanonical, consent);
    recipientData = rows
      .filter((r) => {
        const normalized = r.email ? normalizeEmail(r.email) : null;
        return normalized?.ok && latestConsent.get(normalized.canonical)?.granted;
      })
      .map((r) => ({
        email: r.email!,
        artistName: r.artistName,
        actName: r.actName,
        status: r.status,
        showName: r.showName || undefined,
      }));
  }
  recipientData = [...new Map(recipientData.map((r) => [r.email.toLowerCase(), r])).values()];
  if (!recipientData.length) return actionError('No recipients match this audience filter.');
  let sent = 0;
  const failed: string[] = [];
  for (const recipient of recipientData) {
    const replaceTags = (value: string) =>
      value
        .replace(/{{artist_name}}/g, recipient.artistName || 'Artist')
        .replace(/{{act_name}}/g, recipient.actName || recipient.artistName || 'Artist')
        .replace(/{{status}}/g, recipient.status || 'Competition supporter')
        .replace(/{{show_name}}/g, recipient.showName || 'Qualifying Showcase');
    const safeBodyHtml = escapeHtml(replaceTags(parsed.data.bodyHtml))
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
    const bodyHtml = recipient.unsubscribeUrl
      ? `${safeBodyHtml}<p style="margin-top:24px;font-size:12px"><a href="${escapeHtml(recipient.unsubscribeUrl)}">Unsubscribe from these emails</a></p>`
      : safeBodyHtml;
    const rendered = renderCustomBroadcastEmail({
      headline: replaceTags(parsed.data.headline),
      bodyHtml,
      ctaText: parsed.data.ctaText,
      ctaUrl: parsed.data.ctaUrl,
    });
    const result = await sendEmail({
      to: recipient.email,
      subject: replaceTags(parsed.data.subject),
      html: rendered.html,
      text: rendered.text,
    });
    if (result.success) sent++;
    else failed.push(recipient.email);
  }
  return actionOk({ count: sent, failedCount: failed.length });
}
