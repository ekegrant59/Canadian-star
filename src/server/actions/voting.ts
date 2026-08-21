'use server';

import { randomInt, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { and, count, countDistinct, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { applications, artists, emailConsents, votes } from '@/db/schema';
import {
  getClientIp,
  hashIp,
  hashIpPrefix,
  hashToken,
  hashUserAgent,
  hashVerificationCode,
  safeCompare,
} from '@/lib/crypto';
import { normalizeEmail } from '@/lib/email-normalize';
import { checkRateLimits } from '@/lib/rate-limit';
import { assessVoteFraud, countSequentialEmailPatterns } from '@/lib/voting/fraud';
import { sendVoteOtpEmail } from '@/lib/voting/email';
import { renderVoteConfirmedEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { verifyTurnstile } from '@/lib/voting/turnstile';
import { getFeatureFlag, isCompetitionStageActive } from '@/server/queries/public';
import { getCurrentUser } from '@/lib/auth/guards';
import { actionError, actionOk, GENERIC_ERROR } from './types';

const requestSchema = z.object({
  artistId: z.string().uuid(),
  email: z.string().trim().min(3).max(254),
  marketingOptIn: z.boolean().default(false),
  deviceId: z.string().trim().min(8).max(200),
  turnstileToken: z.string().max(4096).optional(),
  turnstileIdempotencyKey: z.string().uuid().optional(),
});
const verifySchema = z.object({
  voteId: z.string().uuid(),
  email: z.string().max(254),
  code: z.string().regex(/^\d{6}$/),
});
const resendSchema = z.object({ voteId: z.string().uuid(), email: z.string().max(254) });

const VOTING_WORDING =
  'I understand that my vote counts only after email verification and that one verified email may vote once in this public voting round.';
const MARKETING_WORDING =
  "I'd like to receive competition updates and ticket information by email.";

async function votingIsOpen() {
  const [flag, stage] = await Promise.all([
    getFeatureFlag('VOTING_OPEN'),
    isCompetitionStageActive('voting'),
  ]);
  return flag && stage;
}

function otpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function requestVoteOtpAction(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return actionError('Check your email address and try again.');
  if (!(await votingIsOpen())) return actionError('Voting is not open right now.');

  const normalized = normalizeEmail(parsed.data.email);
  if (!normalized.ok) return actionError('Enter a valid email address.');
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  const ipHash = hashIp(clientIp);
  const ipPrefixHash = hashIpPrefix(clientIp);
  const userAgent = requestHeaders.get('user-agent') ?? 'unknown';
  const userAgentHash = hashUserAgent(userAgent);
  const deviceHash = hashUserAgent(`${parsed.data.deviceId}:${userAgent}`);

  if (
    !(await verifyTurnstile(parsed.data.turnstileToken, clientIp, {
      idempotencyKey: parsed.data.turnstileIdempotencyKey,
      action: 'vote',
    }))
  )
    return actionError('Complete the security check and try again.');
  const limits = await checkRateLimits([
    { scope: 'vote:ip', identifier: ipHash },
    { scope: 'vote:ip:daily', identifier: ipHash },
    { scope: 'vote:email', identifier: hashToken(normalized.canonical) },
    { scope: 'vote:device', identifier: deviceHash },
    { scope: 'vote:artist', identifier: parsed.data.artistId },
  ]);
  if (!limits.allowed)
    return actionError(
      `Too many vote attempts. Try again in about ${Math.ceil(limits.retryAfter / 60)} minutes.`,
    );

  try {
    const [artist] = await db
      .select({ id: artists.id, name: artists.actName })
      .from(artists)
      .innerJoin(applications, eq(applications.artistId, artists.id))
      .where(
        and(
          eq(artists.id, parsed.data.artistId),
          eq(artists.profileStatus, 'published'),
          sql`${applications.status} in ('approved', 'shortlisted', 'finalist')`,
        ),
      )
      .limit(1);
    if (!artist) return actionError('This artist is not currently eligible for voting.');

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const hasEstablishedSession = Boolean(await getCurrentUser().catch(() => null));
    const [
      [deviceHour],
      [deviceEmails],
      [ipHour],
      [ipDevices],
      [ipPrefixHour],
      [ipPrefixDevices],
      [artistVelocity],
      recentEmailRows,
      [existing],
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(votes)
        .where(and(eq(votes.deviceHash, deviceHash), gte(votes.createdAt, hourAgo))),
      db
        .select({ value: countDistinct(votes.emailCanonical) })
        .from(votes)
        .where(and(eq(votes.deviceHash, deviceHash), gte(votes.createdAt, dayAgo))),
      db
        .select({ value: count() })
        .from(votes)
        .where(and(eq(votes.ipHash, ipHash), gte(votes.createdAt, hourAgo))),
      db
        .select({ value: countDistinct(votes.deviceHash) })
        .from(votes)
        .where(and(eq(votes.ipHash, ipHash), gte(votes.createdAt, hourAgo))),
      db
        .select({ value: count() })
        .from(votes)
        .where(and(eq(votes.ipPrefixHash, ipPrefixHash), gte(votes.createdAt, hourAgo))),
      db
        .select({ value: countDistinct(votes.deviceHash) })
        .from(votes)
        .where(and(eq(votes.ipPrefixHash, ipPrefixHash), gte(votes.createdAt, hourAgo))),
      db
        .select({ value: count() })
        .from(votes)
        .where(and(eq(votes.artistId, artist.id), gte(votes.createdAt, tenMinutesAgo))),
      db
        .select({ email: votes.emailCanonical })
        .from(votes)
        .where(
          and(
            or(eq(votes.deviceHash, deviceHash), eq(votes.ipHash, ipHash)),
            gte(votes.createdAt, dayAgo),
          ),
        )
        .limit(25),
      db
        .select({ id: votes.id, verified: votes.verified })
        .from(votes)
        .where(
          and(eq(votes.emailCanonical, normalized.canonical), eq(votes.round, 'public_shortlist')),
        )
        .limit(1),
    ]);
    if (existing?.verified)
      return actionError('This email address has already cast its vote in this round.');

    const assessment = assessVoteFraud({
      deviceVotesLastHour: Number(deviceHour?.value ?? 0) + 1,
      deviceDistinctEmailsLastDay: Number(deviceEmails?.value ?? 0) + (existing ? 0 : 1),
      ipVotesLastHour: Number(ipHour?.value ?? 0) + 1,
      ipDistinctDevicesLastHour: Math.max(1, Number(ipDevices?.value ?? 0)),
      ipPrefixVotesLastHour: Number(ipPrefixHour?.value ?? 0) + 1,
      ipPrefixDistinctDevicesLastHour: Math.max(1, Number(ipPrefixDevices?.value ?? 0)),
      artistVotesLastTenMinutes: Number(artistVelocity?.value ?? 0) + 1,
      emailDomain: normalized.domain,
      sequentialEmailPatternCount: countSequentialEmailPatterns(
        normalized.canonical,
        recentEmailRows.map((row) => row.email),
      ),
      hasEstablishedSession,
    });
    const code = otpCode();
    const voteId = existing?.id ?? randomUUID();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const tokenHash = hashVerificationCode(voteId, code);

    await db.transaction(async (tx) => {
      if (existing) {
        const cooldown = new Date(now.getTime() - 60 * 1000);
        const updated = await tx
          .update(votes)
          .set({
            artistId: artist.id,
            emailRaw: normalized.raw,
            verificationTokenHash: tokenHash,
            verificationExpiresAt: expiresAt,
            verificationAttempts: 0,
            verificationSentAt: now,
            verificationResendCount: 0,
            ipHash,
            ipPrefixHash,
            userAgentHash,
            deviceHash,
            fraudScore: assessment.score,
            fraudSignals: JSON.stringify(assessment.signals),
            reviewDecision: 'pending',
          })
          .where(
            and(
              eq(votes.id, voteId),
              eq(votes.verified, false),
              isNull(votes.invalidatedAt),
              sql`(${votes.verificationSentAt} IS NULL OR ${votes.verificationSentAt} <= ${cooldown})`,
            ),
          )
          .returning({ id: votes.id });
        if (!updated[0]) throw new Error('OTP_COOLDOWN');
      } else {
        await tx
          .insert(votes)
          .values({
            id: voteId,
            artistId: artist.id,
            round: 'public_shortlist',
            emailRaw: normalized.raw,
            emailCanonical: normalized.canonical,
            verificationTokenHash: tokenHash,
            verificationExpiresAt: expiresAt,
            verificationSentAt: now,
            ipHash,
            ipPrefixHash,
            userAgentHash,
            deviceHash,
            fraudScore: assessment.score,
            fraudSignals: JSON.stringify(assessment.signals),
          });
      }
      await tx.insert(emailConsents).values([
        {
          id: randomUUID(),
          emailRaw: normalized.raw,
          emailCanonical: normalized.canonical,
          consentType: 'voting',
          granted: true,
          wordingShown: VOTING_WORDING,
          documentVersion: '2026-08-18',
          source: 'vote',
          ipHash,
          userAgentHash,
        },
        {
          id: randomUUID(),
          emailRaw: normalized.raw,
          emailCanonical: normalized.canonical,
          consentType: 'marketing',
          granted: parsed.data.marketingOptIn,
          wordingShown: MARKETING_WORDING,
          documentVersion: '2026-08-18',
          source: 'vote',
          ipHash,
          userAgentHash,
        },
      ]);
    });

    await sendVoteOtpEmail({ email: normalized.raw, artistName: artist.name, code });
    return actionOk({
      voteId,
      expiresAt: expiresAt.toISOString(),
      devCode:
        process.env.NODE_ENV !== 'production' && !process.env.BREVO_API_KEY ? code : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'OTP_COOLDOWN')
      return actionError(
        'A verification code was sent recently. Please wait about a minute before requesting another.',
      );
    if ((error as { code?: string }).code === '23505')
      return actionError('This email address already has a vote in this round.');
    console.error('[voting] OTP request failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function verifyVoteOtpAction(input: unknown) {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return actionError('Enter the six-digit verification code.');
  const normalized = normalizeEmail(parsed.data.email);
  if (!normalized.ok) return actionError('The verification request is invalid.');
  const requestHeaders = await headers();
  const ipHash = hashIp(getClientIp(requestHeaders));
  const limits = await checkRateLimits([
    { scope: 'vote:verify:ip', identifier: ipHash },
    { scope: 'vote:verify:email', identifier: hashToken(normalized.canonical) },
  ]);
  if (!limits.allowed)
    return actionError('Too many verification attempts. Request a new code later.');

  try {
    const [vote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.id, parsed.data.voteId),
          eq(votes.emailCanonical, normalized.canonical),
          eq(votes.round, 'public_shortlist'),
        ),
      )
      .limit(1);
    if (!vote) return actionError('That verification code is not valid.');
    if (vote.verified) return actionOk({ counted: !vote.invalidatedAt });
    if (!(await votingIsOpen()))
      return actionError('Voting has closed. This verification can no longer be counted.');
    const [eligibleArtist] = await db
      .select({ id: artists.id, actName: artists.actName })
      .from(artists)
      .innerJoin(applications, eq(applications.artistId, artists.id))
      .where(
        and(
          eq(artists.id, vote.artistId),
          eq(artists.profileStatus, 'published'),
          sql`${applications.status} in ('approved', 'shortlisted', 'finalist')`,
        ),
      )
      .limit(1);
    if (!eligibleArtist) return actionError('This artist is no longer eligible for voting.');
    if (
      !vote.verificationTokenHash ||
      !vote.verificationExpiresAt ||
      vote.verificationExpiresAt <= new Date()
    )
      return actionError('That code has expired. Request a new one.');
    if (vote.verificationAttempts >= 5)
      return actionError('Too many incorrect attempts. Request a new code.');
    const presentedHash = hashVerificationCode(vote.id, parsed.data.code);
    if (!safeCompare(vote.verificationTokenHash, presentedHash)) {
      await db
        .update(votes)
        .set({ verificationAttempts: sql`${votes.verificationAttempts} + 1` })
        .where(
          and(
            eq(votes.id, vote.id),
            eq(votes.verified, false),
            isNull(votes.invalidatedAt),
            eq(votes.verificationTokenHash, vote.verificationTokenHash),
            sql`${votes.verificationAttempts} < 5`,
            sql`${votes.verificationExpiresAt} > NOW()`,
          ),
        );
      return actionError('That verification code is not valid.');
    }
    const now = new Date();
    const updated = await db
      .update(votes)
      .set({
        verified: true,
        verifiedAt: now,
        verificationTokenHash: null,
        verificationExpiresAt: null,
        verificationSentAt: null,
      })
      .where(
        and(
          eq(votes.id, vote.id),
          eq(votes.verified, false),
          isNull(votes.invalidatedAt),
          eq(votes.verificationTokenHash, presentedHash),
          sql`${votes.verificationAttempts} < 5`,
          sql`${votes.verificationExpiresAt} > NOW()`,
        ),
      )
      .returning({ id: votes.id });
    if (!updated[0]) return actionError('This vote could not be counted.');
    const confirmed = renderVoteConfirmedEmail({
      artistName: eligibleArtist.actName,
      voterEmail: vote.emailRaw,
    });
    const emailResult = await sendEmail({
      to: vote.emailRaw,
      subject: confirmed.subject,
      html: confirmed.html,
      text: confirmed.text,
    });
    if (!emailResult.success)
      console.error(
        '[voting] confirmation email failed after vote verification',
        emailResult.error,
      );
    revalidatePath('/admin/voting');
    revalidatePath('/admin/voting/leaderboard');
    return actionOk({ counted: true });
  } catch (error) {
    console.error('[voting] OTP verification failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function resendVoteOtpAction(input: unknown) {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return actionError('Request a new verification code.');
  const normalized = normalizeEmail(parsed.data.email);
  if (!normalized.ok) return actionError('Request a new verification code.');
  const requestHeaders = await headers();
  const ipHash = hashIp(getClientIp(requestHeaders));
  const limits = await checkRateLimits([
    { scope: 'vote:verify:ip', identifier: ipHash },
    { scope: 'vote:verify:email', identifier: hashToken(normalized.canonical) },
    { scope: 'verify:resend', identifier: hashToken(normalized.canonical) },
  ]);
  if (!limits.allowed) return actionError('Too many resend requests. Try again later.');
  if (!(await votingIsOpen())) return actionError('Voting is not open right now.');
  const [vote] = await db
    .select({
      id: votes.id,
      verified: votes.verified,
      artistName: artists.actName,
      emailRaw: votes.emailRaw,
      verificationSentAt: votes.verificationSentAt,
      resendCount: votes.verificationResendCount,
    })
    .from(votes)
    .innerJoin(artists, eq(artists.id, votes.artistId))
    .where(
      and(
        eq(votes.id, parsed.data.voteId),
        eq(votes.emailCanonical, normalized.canonical),
        eq(votes.round, 'public_shortlist'),
      ),
    )
    .limit(1);
  if (!vote || vote.verified) return actionError('A new code cannot be sent for this vote.');
  const code = otpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const now = new Date();
  const cooldownSeconds = Math.min(60 * 2 ** Number(vote.resendCount ?? 0), 15 * 60);
  const cooldown = new Date(now.getTime() - cooldownSeconds * 1000);
  const updated = await db
    .update(votes)
    .set({
      verificationTokenHash: hashVerificationCode(vote.id, code),
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      verificationSentAt: now,
      verificationResendCount: sql`${votes.verificationResendCount} + 1`,
    })
    .where(
      and(
        eq(votes.id, vote.id),
        eq(votes.verified, false),
        isNull(votes.invalidatedAt),
        sql`(${votes.verificationSentAt} IS NULL OR ${votes.verificationSentAt} <= ${cooldown})`,
      ),
    )
    .returning({ id: votes.id });
  if (!updated[0]) {
    const elapsedSeconds = vote.verificationSentAt
      ? Math.floor((now.getTime() - vote.verificationSentAt.getTime()) / 1000)
      : 0;
    return actionError(
      `Please wait ${formatWait(Math.max(1, cooldownSeconds - elapsedSeconds))} before requesting another code.`,
    );
  }
  await sendVoteOtpEmail({ email: vote.emailRaw, artistName: vote.artistName, code });
  return actionOk({
    expiresAt: expiresAt.toISOString(),
    devCode: process.env.NODE_ENV !== 'production' && !process.env.BREVO_API_KEY ? code : undefined,
  });
}

function formatWait(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
