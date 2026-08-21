'use server';

import { headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { getClientIp, generateToken, hashIp, hashToken, hashVerificationCode } from '@/lib/crypto';
import { normalizeEmail } from '@/lib/email-normalize';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordConsents } from '@/server/consent';
import { renderCustomBroadcastEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { actionError, actionOk } from './types';
import { SITE_URL } from '@/config/site-url';

const EMAIL_BASE_URL = (process.env.BETTER_AUTH_URL || SITE_URL).replace(/\/+$/, '');
import { z } from 'zod';

const newsletterSchema = z.object({ email: z.string().trim().min(3).max(254) });
const CONSENT_WORDING =
  'I agree to receive Canadian Country Star competition news and updates by email. I can unsubscribe at any time.';

export async function subscribeToNewsletterAction(input: unknown) {
  try {
    const requestHeaders = await headers();
    const ipHash = hashIp(getClientIp(requestHeaders));
    const limit = await checkRateLimit('subscribe:ip', ipHash);
    if (!limit.allowed)
      return actionError('Too many subscription attempts. Please try again later.');

    const parsed = newsletterSchema.safeParse(input);
    if (!parsed.success) return actionError('Enter a valid email address.');
    const normalized = normalizeEmail(parsed.data.email);
    if (!normalized.ok) return actionError('Enter a valid email address.');

    const token = generateToken();
    const now = new Date();
    const existing = await db
      .select({
        id: subscribers.id,
        confirmed: subscribers.confirmed,
        unsubscribedAt: subscribers.unsubscribedAt,
      })
      .from(subscribers)
      .where(eq(subscribers.emailCanonical, normalized.canonical))
      .limit(1);
    if (existing[0] && !existing[0].unsubscribedAt) {
      return actionOk({
        status: 'already_registered' as const,
        message: existing[0].confirmed
          ? 'This email is already registered. Stay tuned for competition updates.'
          : 'This email is already registered. Check your inbox to confirm your subscription, then stay tuned for updates.',
      });
    }

    const subscriberId = existing[0]?.id ?? randomUUID();
    const unsubscribeToken = hashVerificationCode('newsletter-unsubscribe', subscriberId);
    await db
      .insert(subscribers)
      .values({
        id: subscriberId,
        emailRaw: normalized.raw,
        emailCanonical: normalized.canonical,
        confirmed: false,
        confirmedAt: null,
        confirmationTokenHash: hashToken(token),
        confirmationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        unsubscribedAt: null,
        unsubscribeTokenHash: hashToken(unsubscribeToken),
        source: 'newsletter',
        ipHash,
        createdAt: existing[0] ? undefined : now,
      })
      .onConflictDoUpdate({
        target: subscribers.emailCanonical,
        set: {
          emailRaw: normalized.raw,
          confirmed: false,
          confirmedAt: null,
          confirmationTokenHash: hashToken(token),
          confirmationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          unsubscribedAt: null,
          unsubscribeTokenHash: hashToken(unsubscribeToken),
          ipHash,
        },
      });

    await recordConsents(
      [
        {
          email: normalized.raw,
          consentType: 'marketing',
          granted: true,
          wordingShown: CONSENT_WORDING,
          source: 'subscribe',
        },
      ],
      requestHeaders,
    );
    const rendered = renderCustomBroadcastEmail({
      headline: 'Confirm your subscription',
      bodyHtml:
        '<p>Click below to confirm that you want Canadian Country Star competition news and updates.</p>',
      ctaText: 'CONFIRM SUBSCRIPTION',
      ctaUrl: `${EMAIL_BASE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalized.canonical)}`,
    });
    const result = await sendEmail({
      to: normalized.raw,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (!result.success)
      return actionError('We could not send the confirmation email. Please try again.');
    return actionOk({
      status: 'confirmation_sent' as const,
      message:
        'You have successfully registered. Check your inbox to confirm your subscription, then stay tuned for updates.',
    });
  } catch (error) {
    console.error('[newsletter] subscription failed', error);
    return actionError('Newsletter signup is temporarily unavailable. Please try again later.');
  }
}

export async function confirmNewsletterAction(email: string, token: string) {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized.ok || !token) return actionError('This confirmation link is not valid.');
    const [subscriber] = await db
      .select({
        id: subscribers.id,
        expiresAt: subscribers.confirmationExpiresAt,
        tokenHash: subscribers.confirmationTokenHash,
      })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.emailCanonical, normalized.canonical),
          eq(subscribers.confirmationTokenHash, hashToken(token)),
        ),
      )
      .limit(1);
    if (!subscriber || !subscriber.expiresAt || subscriber.expiresAt <= new Date())
      return actionError('This confirmation link has expired.');
    await db
      .update(subscribers)
      .set({
        confirmed: true,
        confirmedAt: new Date(),
        confirmationTokenHash: null,
        confirmationExpiresAt: null,
      })
      .where(eq(subscribers.id, subscriber.id));
    return actionOk({ message: 'Your newsletter subscription is confirmed.' });
  } catch (error) {
    console.error('[newsletter] confirmation failed', error);
    return actionError(
      'Newsletter confirmation is temporarily unavailable. Please try again later.',
    );
  }
}

export async function unsubscribeNewsletterAction(id: string, token: string) {
  try {
    if (!id || !token) return actionError('This unsubscribe link is not valid.');
    const requestHeaders = await headers();
    const [subscriber] = await db
      .select({ id: subscribers.id, email: subscribers.emailRaw })
      .from(subscribers)
      .where(and(eq(subscribers.id, id), eq(subscribers.unsubscribeTokenHash, hashToken(token))))
      .limit(1);
    if (!subscriber) return actionError('This unsubscribe link is not valid.');
    await db
      .update(subscribers)
      .set({ unsubscribedAt: new Date(), confirmed: false })
      .where(eq(subscribers.id, subscriber.id));
    await recordConsents(
      [
        {
          email: subscriber.email,
          consentType: 'marketing',
          granted: false,
          wordingShown: 'Unsubscribe from Canadian Country Star competition news and updates.',
          source: 'unsubscribe',
        },
      ],
      requestHeaders,
    );
    return actionOk({ message: 'You have been unsubscribed from competition news.' });
  } catch (error) {
    console.error('[newsletter] unsubscribe failed', error);
    return actionError('Unsubscribe is temporarily unavailable. Please try again later.');
  }
}
