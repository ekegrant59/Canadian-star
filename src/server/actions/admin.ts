'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  applications,
  artists,
  auditLog,
  competitionPhases,
  settings,
  showArtists,
  shows,
  votes,
  users,
} from '@/db/schema';
import { COMPETITION_STAGES, type CompetitionStage } from '@/config/event';
import {
  APPLICATION_STATUSES,
  isAllowedReviewTransition,
  REVIEW_STATUSES,
} from '@/lib/application-status';
import {
  requireAdminWriteOrThrow,
  requireSuperAdminOrThrow,
  AuthorizationError,
} from '@/lib/auth/guards';
import { getClientIp, hashIp } from '@/lib/crypto';
import { actionError, actionOk, GENERIC_ERROR, type ActionResult } from './types';
import {
  renderArtistApplicationStageEmail,
  renderArtistEditDecisionEmail,
} from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { deletePhotoAssets } from '@/lib/storage';

const stageKeys = COMPETITION_STAGES.map((stage) => stage.key) as [
  CompetitionStage,
  ...CompetitionStage[],
];
const stageOrAutoKeys = [...stageKeys, 'auto'] as [
  CompetitionStage | 'auto',
  ...(CompetitionStage | 'auto')[],
];

const stageSchema = z.object({
  stage: z.enum(stageOrAutoKeys),
  confirmed: z.literal(true),
  reason: z.string().trim().max(500).optional(),
});

const applicationStatusSchema = z.enum(REVIEW_STATUSES);

const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  expectedStatus: z.enum(APPLICATION_STATUSES),
  status: applicationStatusSchema,
  confirmed: z.literal(true),
  reason: z.string().trim().max(1000).optional(),
});

const noteSchema = z.object({
  applicationId: z.string().uuid(),
  note: z.string().trim().min(2).max(1000),
});

const profileSchema = z.object({
  artistId: z.string().uuid(),
  status: z.enum(['hidden', 'published', 'archived']),
  confirmed: z.literal(true),
  reason: z.string().trim().max(500).optional(),
});

const phaseSchema = z.object({
  phaseId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  confirmed: z.literal(true),
});

const showSchema = z.object({
  showId: z.string().uuid(),
  showDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  doorsTime: z.string().trim().max(20).optional(),
  startTime: z.string().trim().max(20).optional(),
  contingencyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(['scheduled', 'postponed', 'completed', 'cancelled']),
  statusNote: z.string().trim().max(500).nullable().optional(),
  venueName: z.string().trim().min(2).max(200),
  venueAddress: z.string().trim().max(500).nullable().optional(),
  ticketUrl: z.string().url().nullable().optional(),
  confirmed: z.literal(true),
});

const assignmentSchema = z.object({
  showId: z.string().uuid(),
  artistIds: z.array(z.string().uuid()).max(16),
  confirmed: z.literal(true),
});

const advancementSchema = z.object({
  showId: z.string().uuid(),
  artistId: z.string().uuid(),
  confirmed: z.literal(true),
});

const finalWinnerSchema = z.object({
  showId: z.string().uuid(),
  artistId: z.string().uuid(),
  confirmed: z.literal(true),
});

const voteReviewSchema = z.object({
  voteId: z.string().uuid(),
  decision: z.enum(['clear', 'invalidate']),
  reason: z.string().trim().min(3).max(1000),
  confirmed: z.literal(true),
});

const deleteArtistSchema = z.object({
  artistId: z.string().uuid(),
  applicationId: z.string().uuid(),
  confirmed: z.literal(true),
});

const reapprovalSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(1000).optional(),
  confirmed: z.literal(true),
});

function authFailure(error: unknown): ActionResult<never> | null {
  if (!(error instanceof AuthorizationError)) return null;
  return error.code === 'unauthenticated'
    ? actionError('Please sign in to continue.')
    : actionError('You do not have access to this action.');
}

async function auditValues(
  actor: { id: string; email: string },
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  const requestHeaders = await headers();
  return {
    id: randomUUID(),
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    entityType,
    entityId,
    before,
    after,
    ipHash: hashIp(getClientIp(requestHeaders)),
  };
}

class ReviewConflictError extends Error {}
class InvalidReviewTransitionError extends Error {}

function pendingArtistColumns(pending: Record<string, unknown>) {
  const textValue = (key: string) =>
    typeof pending[key] === 'string' ? String(pending[key]).trim() || null : null;
  const socialLinks: Record<string, string> = {};
  for (const key of ['instagram', 'tiktok', 'x', 'youtube', 'facebook']) {
    const value = textValue(key);
    if (value) socialLinks[key] = value;
  }
  const musicLinks: Record<string, string> = {};
  if (Array.isArray(pending.recordedMusicUrls))
    (pending.recordedMusicUrls as unknown[])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .forEach((url, index) => {
        musicLinks[`link_${index + 1}`] = url;
      });
  const videos = Array.isArray(pending.performanceVideoUrls)
    ? (pending.performanceVideoUrls as unknown[]).filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : [];
  return {
    actName: textValue('actName') || 'Untitled application',
    actType: (pending.actType === 'band' || pending.actType === 'duo'
      ? pending.actType
      : 'solo') as 'solo' | 'duo' | 'band',
    bio: textValue('bio'),
    locationCity: textValue('locationCity'),
    contactEmail: textValue('contactEmail'),
    contactPhone: textValue('contactPhone'),
    photoKeys: typeof pending.photoKey === 'string' && pending.photoKey ? [pending.photoKey] : [],
    primaryPhotoKey:
      typeof pending.photoKey === 'string' && pending.photoKey ? pending.photoKey : null,
    websiteUrl: textValue('websiteUrl'),
    performanceVideoUrl: videos[0] ?? null,
    performanceVideoUrls: videos,
    socialLinks,
    musicLinks,
    updatedAt: new Date(),
  };
}

export async function reviewArtistEditsAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = reapprovalSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the artist edit decision.');
  const reviewReason = parsed.data.reason?.trim() ?? '';
  if (parsed.data.decision === 'reject' && reviewReason.length < 3)
    return actionError('A rejection note of at least three characters is required.');
  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          pendingEdits: applications.pendingEdits,
          pendingEditsSubmittedAt: applications.pendingEditsSubmittedAt,
          artistId: applications.artistId,
          status: applications.status,
        })
        .from(applications)
        .where(eq(applications.id, parsed.data.applicationId))
        .limit(1)
        .for('update');
      if (!row?.pendingEdits || !row.pendingEditsSubmittedAt)
        throw new ReviewConflictError('no_submitted_edits');
      if (!['approved', 'shortlisted', 'finalist'].includes(row.status))
        throw new InvalidReviewTransitionError();
      if (parsed.data.decision === 'approve') {
        await tx
          .update(artists)
          .set(pendingArtistColumns(row.pendingEdits))
          .where(eq(artists.id, row.artistId));
        await tx
          .update(applications)
          .set({
            availableAllDates:
              typeof row.pendingEdits.availableAllDates === 'boolean'
                ? row.pendingEdits.availableAllDates
                : undefined,
            isOfAge:
              typeof row.pendingEdits.isEligible === 'boolean'
                ? row.pendingEdits.isEligible
                : undefined,
            isOntarioResident:
              typeof row.pendingEdits.isEligible === 'boolean'
                ? row.pendingEdits.isEligible
                : undefined,
            acceptedRules:
              typeof row.pendingEdits.acceptedRules === 'boolean'
                ? row.pendingEdits.acceptedRules
                : undefined,
            acceptedMediaRelease:
              typeof row.pendingEdits.acceptedMediaRelease === 'boolean'
                ? row.pendingEdits.acceptedMediaRelease
                : undefined,
            pendingEdits: null,
            pendingEditsSubmittedAt: null,
            pendingEditsReviewedAt: now,
            pendingEditsReviewedBy: admin.id,
            updatedAt: now,
          })
          .where(eq(applications.id, parsed.data.applicationId));
      } else {
        await tx
          .update(applications)
          .set({
            pendingEdits: null,
            pendingEditsSubmittedAt: null,
            pendingEditsReviewedAt: now,
            pendingEditsReviewedBy: admin.id,
            updatedAt: now,
          })
          .where(eq(applications.id, parsed.data.applicationId));
      }
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            `artist.edits_${parsed.data.decision}d`,
            'application',
            parsed.data.applicationId,
            { pendingEdits: row.pendingEdits },
            { decision: parsed.data.decision, reason: reviewReason },
          ),
        );
    });
    revalidatePath('/admin');
    revalidatePath('/admin/reapproval');
    revalidatePath('/admin/applications');
    revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
    revalidatePath('/artist');
    revalidatePath('/artists');
    revalidatePath('/');
    const [recipient] = await db
      .select({ email: users.email, artistName: users.name, actName: artists.actName })
      .from(applications)
      .innerJoin(artists, eq(artists.id, applications.artistId))
      .innerJoin(users, eq(users.id, artists.userId))
      .where(eq(applications.id, parsed.data.applicationId))
      .limit(1);
    if (recipient?.email) {
      const rendered = renderArtistEditDecisionEmail({
        artistName: recipient.artistName || recipient.actName,
        actName: recipient.actName,
        approved: parsed.data.decision === 'approve',
        reason: reviewReason,
      });
      const emailResult = await sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (!emailResult.success)
        console.error('[admin] artist edit decision email failed', emailResult.error);
    }
    return actionOk({ decision: parsed.data.decision });
  } catch (error) {
    if (error instanceof ReviewConflictError)
      return actionError('These edits have already been reviewed.');
    if (error instanceof InvalidReviewTransitionError)
      return actionError('Only accepted artists can be reapproved.');
    console.error('[admin] artist edit review failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function setCompetitionStageAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the competition stage change.');
  if (process.env.NODE_ENV === 'production' && (parsed.data.reason?.length ?? 0) < 8) {
    return actionError('Add a short reason for this production stage change.');
  }

  try {
    const now = new Date();
    const auditBase = await auditValues(
      admin,
      'competition.stage_changed',
      'competition',
      null,
      null,
      null,
    );

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('competition:stage'))`);
      const [before] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'competition:stage_override'))
        .limit(1);

      await tx
        .insert(settings)
        .values({
          key: 'competition:stage_override',
          value: parsed.data.stage,
          description: 'Manual phase override; set to auto to follow the scheduled timeline',
          updatedBy: admin.id,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: parsed.data.stage, updatedBy: admin.id, updatedAt: now },
        });

      if (parsed.data.stage === 'voting') {
        await tx
          .insert(settings)
          .values({
            key: 'flag:VOTING_OPEN',
            value: 'true',
            description:
              'Temporary voting pause override; voting opens automatically with the voting phase.',
            updatedBy: admin.id,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: 'true', updatedBy: admin.id, updatedAt: now },
          });
      }

      await tx.insert(auditLog).values({
        ...auditBase,
        before: { stage: before?.value ?? 'auto' },
        after: { stage: parsed.data.stage, reason: parsed.data.reason ?? null },
      });
    });
    revalidatePath('/');
    revalidatePath('/vote');
    revalidatePath('/artists');
    revalidatePath('/admin');
    revalidatePath('/artist');
    return actionOk({ stage: parsed.data.stage });
  } catch (error) {
    console.error('[admin] competition stage change failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function setVotingOpenAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = z.object({ open: z.boolean(), confirmed: z.literal(true) }).safeParse(input);
  if (!parsed.success) return actionError('Confirm the voting window change.');
  try {
    const now = new Date();
    await db
      .insert(settings)
      .values({
        key: 'flag:VOTING_OPEN',
        value: String(parsed.data.open),
        description:
          'Controls public vote submissions; the phase window remains a second server-side guard.',
        updatedBy: admin.id,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(parsed.data.open), updatedBy: admin.id, updatedAt: now },
      });
    await db.insert(auditLog).values(
      await auditValues(admin, 'voting.window_toggled', 'setting', 'flag:VOTING_OPEN', null, {
        open: parsed.data.open,
      }),
    );
    revalidatePath('/');
    revalidatePath('/vote');
    revalidatePath('/artists');
    revalidatePath('/admin/voting');
    return actionOk({ open: parsed.data.open });
  } catch (error) {
    console.error('[admin] voting toggle failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function updateApplicationReviewAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the application decision.');
  if (parsed.data.status === 'rejected' && (parsed.data.reason?.length ?? 0) < 3) {
    return actionError('A rejection reason is required and will be shown to the artist.');
  }

  try {
    const now = new Date();
    const auditBase = await auditValues(
      admin,
      'application.review_status_changed',
      'application',
      parsed.data.applicationId,
      null,
      null,
    );
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({
          status: applications.status,
          profileStatus: artists.profileStatus,
          artistId: applications.artistId,
        })
        .from(applications)
        .innerJoin(artists, eq(artists.id, applications.artistId))
        .where(eq(applications.id, parsed.data.applicationId))
        .limit(1)
        .for('update');
      if (!before) throw new ReviewConflictError('not_found');
      if (before.status !== parsed.data.expectedStatus) {
        throw new ReviewConflictError('stale_status');
      }
      if (!isAllowedReviewTransition(before.status, parsed.data.status)) {
        throw new InvalidReviewTransitionError();
      }
      if (parsed.data.status === 'shortlisted') {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('final-16-selection'))`);
        const [selectionCount] = await tx
          .select({ selectedCount: sql<number>`count(*)` })
          .from(applications)
          .where(inArray(applications.status, ['shortlisted', 'finalist']));
        if (
          Number(selectionCount?.selectedCount ?? 0) >= 16 &&
          before.status !== 'shortlisted' &&
          before.status !== 'finalist'
        )
          throw new InvalidReviewTransitionError();
        const topThirty = await tx
          .select({ artistId: artists.id })
          .from(artists)
          .innerJoin(applications, eq(applications.artistId, artists.id))
          .leftJoin(votes, and(eq(votes.artistId, artists.id), eq(votes.round, 'public_shortlist')))
          .where(inArray(applications.status, ['approved', 'shortlisted', 'finalist']))
          .groupBy(artists.id)
          .orderBy(
            desc(
              sql`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
            ),
            asc(artists.actName),
          )
          .limit(30);
        if (!topThirty.some((entry) => entry.artistId === before.artistId))
          throw new InvalidReviewTransitionError();
      }
      if (parsed.data.status === 'finalist' && before.status !== 'finalist') {
        const [finalistCount] = await tx
          .select({ selectedCount: sql<number>`count(*)` })
          .from(applications)
          .where(eq(applications.status, 'finalist'));
        if (Number(finalistCount?.selectedCount ?? 0) >= 4)
          throw new InvalidReviewTransitionError();
      }

      const updated = await tx
        .update(applications)
        .set({
          status: parsed.data.status,
          rejectionReason: parsed.data.status === 'rejected' ? parsed.data.reason : null,
          reviewedBy: admin.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(applications.id, parsed.data.applicationId),
            eq(applications.status, parsed.data.expectedStatus),
          ),
        )
        .returning({ artistId: applications.artistId });
      if (!updated[0]) throw new ReviewConflictError('stale_status');

      const acceptedStatuses = new Set(['approved', 'shortlisted', 'finalist']);
      const wasAccepted = acceptedStatuses.has(before.status);
      const isAccepted = acceptedStatuses.has(parsed.data.status);
      if (!wasAccepted || !isAccepted) {
        const profileStatus = isAccepted ? 'published' : 'hidden';
        await tx
          .update(artists)
          .set({
            profileStatus,
            publishedAt: profileStatus === 'published' ? now : null,
            updatedAt: now,
          })
          .where(eq(artists.id, updated[0].artistId));
      }

      await tx.insert(auditLog).values({
        ...auditBase,
        before: { status: before.status, profileStatus: before.profileStatus },
        after: { status: parsed.data.status, reason: parsed.data.reason ?? null },
      });
    });
    revalidatePath('/admin');
    revalidatePath('/admin/applications');
    revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
    revalidatePath('/artist');
    const [recipient] = await db
      .select({ email: artists.contactEmail, artistName: users.name, actName: artists.actName })
      .from(applications)
      .innerJoin(artists, eq(artists.id, applications.artistId))
      .innerJoin(users, eq(users.id, artists.userId))
      .where(eq(applications.id, parsed.data.applicationId))
      .limit(1);
    if (recipient?.email) {
      const rendered = renderArtistApplicationStageEmail({
        artistName: recipient.artistName || recipient.actName,
        actName: recipient.actName,
        status: parsed.data.status,
      });
      const emailResult = await sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (!emailResult.success)
        console.error(
          '[admin] application status email failed after status update',
          emailResult.error,
        );
    }
    return actionOk({ status: parsed.data.status });
  } catch (error) {
    if (error instanceof InvalidReviewTransitionError) {
      return actionError('That status change is not allowed from the application current state.');
    }
    if (error instanceof ReviewConflictError) {
      return actionError(
        error.message === 'not_found'
          ? 'Application not found.'
          : 'Another administrator changed this application. Refresh and review the latest status before deciding.',
      );
    }
    console.error('[admin] application review failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function updateArtistProfileStatusAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the profile visibility change.');
  try {
    const now = new Date();
    const [before] = await db
      .select({ status: artists.profileStatus, applicationStatus: applications.status })
      .from(artists)
      .leftJoin(applications, eq(applications.artistId, artists.id))
      .where(eq(artists.id, parsed.data.artistId))
      .limit(1);
    if (!before) return actionError('Artist not found.');
    if (parsed.data.status === 'published' && before.applicationStatus !== 'approved') {
      return actionError('Only an approved artist can be published.');
    }
    await db.transaction(async (tx) => {
      await tx
        .update(artists)
        .set({
          profileStatus: parsed.data.status,
          publishedAt: parsed.data.status === 'published' ? now : null,
          updatedAt: now,
        })
        .where(eq(artists.id, parsed.data.artistId));
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            'artist.profile_visibility_changed',
            'artist',
            parsed.data.artistId,
            before,
            { status: parsed.data.status, reason: parsed.data.reason ?? null },
          ),
        );
    });
    revalidatePath('/artists');
    revalidatePath('/');
    revalidatePath('/admin/applications');
    return actionOk({ status: parsed.data.status });
  } catch (error) {
    console.error('[admin] profile visibility change failed', error);
    return actionError(GENERIC_ERROR);
  }
}

/** Permanently removes an artist profile and its application data. */
export async function deleteArtistApplicationAction(input: unknown) {
  let admin;
  try {
    admin = await requireSuperAdminOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  const parsed = deleteArtistSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the artist deletion.');

  try {
    const requestHeaders = await headers();
    const [artistToDelete] = await db
      .select({
        id: artists.id,
        photoKeys: artists.photoKeys,
      })
      .from(artists)
      .innerJoin(applications, eq(applications.artistId, artists.id))
      .where(
        and(eq(artists.id, parsed.data.artistId), eq(applications.id, parsed.data.applicationId)),
      )
      .limit(1);
    if (!artistToDelete) return actionError('Artist application not found.');

    await deletePhotoAssets(artistToDelete.photoKeys ?? []);

    await db.transaction(async (tx) => {
      const [artist] = await tx
        .select({
          id: artists.id,
          actName: artists.actName,
          applicationId: applications.id,
          applicationStatus: applications.status,
        })
        .from(artists)
        .innerJoin(applications, eq(applications.artistId, artists.id))
        .where(
          and(eq(artists.id, parsed.data.artistId), eq(applications.id, parsed.data.applicationId)),
        )
        .limit(1)
        .for('update');
      if (!artist) throw new ReviewConflictError('not_found');

      await tx.insert(auditLog).values({
        id: randomUUID(),
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'artist.application_deleted',
        entityType: 'artist',
        entityId: artist.id,
        before: {
          actName: artist.actName,
          applicationId: artist.applicationId,
          applicationStatus: artist.applicationStatus,
        },
        after: null,
        ipHash: hashIp(getClientIp(requestHeaders)),
      });
      await tx.delete(artists).where(eq(artists.id, artist.id));
    });

    revalidatePath('/');
    revalidatePath('/artist');
    revalidatePath('/artists');
    revalidatePath('/admin');
    revalidatePath('/admin/applications');
    revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
    revalidatePath('/admin/events');
    revalidatePath('/admin/voting');
    revalidatePath('/admin/voting/leaderboard');
    return actionOk({ deleted: true });
  } catch (error) {
    if (error instanceof ReviewConflictError) return actionError('Artist application not found.');
    console.error('[admin] artist deletion failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function updateCompetitionPhaseAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = phaseSchema.safeParse(input);
  if (!parsed.success || new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt))
    return actionError('Enter a valid phase window.');
  try {
    const now = new Date();
    const [before] = await db
      .select({ startsAt: competitionPhases.startsAt, endsAt: competitionPhases.endsAt })
      .from(competitionPhases)
      .where(eq(competitionPhases.id, parsed.data.phaseId))
      .limit(1);
    if (!before) return actionError('Competition phase not found.');
    const phaseRows = await db
      .select({
        id: competitionPhases.id,
        label: competitionPhases.label,
        startsAt: competitionPhases.startsAt,
        endsAt: competitionPhases.endsAt,
      })
      .from(competitionPhases);
    const nextStartsAt = new Date(parsed.data.startsAt);
    const nextEndsAt = new Date(parsed.data.endsAt);
    const overlap = phaseRows.find(
      (phase) =>
        phase.id !== parsed.data.phaseId &&
        nextStartsAt < phase.endsAt &&
        nextEndsAt > phase.startsAt,
    );
    if (overlap)
      return actionError(
        `This window overlaps ${overlap.label}. Adjust the dates so each phase has one clear owner.`,
      );
    await db.transaction(async (tx) => {
      await tx
        .update(competitionPhases)
        .set({ startsAt: nextStartsAt, endsAt: nextEndsAt, updatedBy: admin.id, updatedAt: now })
        .where(eq(competitionPhases.id, parsed.data.phaseId));
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            'competition.phase_window_changed',
            'competition_phase',
            parsed.data.phaseId,
            before,
            parsed.data,
          ),
        );
    });
    revalidatePath('/');
    revalidatePath('/vote');
    revalidatePath('/artists');
    revalidatePath('/admin');
    revalidatePath('/admin/events');
    return actionOk({ phaseId: parsed.data.phaseId });
  } catch (error) {
    console.error('[admin] phase update failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function updateShowAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = showSchema.safeParse(input);
  if (!parsed.success) return actionError('Check the show details and ticket URL.');
  try {
    const [before] = await db.select().from(shows).where(eq(shows.id, parsed.data.showId)).limit(1);
    if (!before) return actionError('Show not found.');
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(shows)
        .set({
          showDate: parsed.data.showDate,
          doorsTime: parsed.data.doorsTime ?? null,
          startTime: parsed.data.startTime ?? null,
          contingencyDate: parsed.data.contingencyDate ?? null,
          status: parsed.data.status,
          statusNote: parsed.data.statusNote ?? null,
          venueName: parsed.data.venueName,
          venueAddress: parsed.data.venueAddress ?? null,
          ticketUrl: parsed.data.ticketUrl ?? null,
          updatedAt: now,
        })
        .where(eq(shows.id, parsed.data.showId));
      await tx
        .insert(auditLog)
        .values(
          await auditValues(admin, 'show.updated', 'show', parsed.data.showId, before, parsed.data),
        );
    });
    revalidatePath('/');
    revalidatePath('/admin/events');
    revalidatePath('/leaderboard');
    return actionOk({ showId: parsed.data.showId });
  } catch (error) {
    console.error('[admin] show update failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function assignShowArtistsAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return actionError('Select valid artists for this show.');
  try {
    const [show] = await db
      .select({ id: shows.id, type: shows.type })
      .from(shows)
      .where(eq(shows.id, parsed.data.showId))
      .limit(1);
    if (!show) return actionError('Show not found.');
    if (show.type === 'final')
      return actionError(
        'Grand Final finalists are added automatically from qualifying show winners.',
      );
    if (show.type === 'qualifier' && parsed.data.artistIds.length > 4)
      return actionError('A qualifying show can have at most four Final 16 artists.');
    if (show.type === 'qualifier' && parsed.data.artistIds.length > 0) {
      const otherQualifierAssignments = await db
        .selectDistinct({ artistId: showArtists.artistId })
        .from(showArtists)
        .innerJoin(shows, eq(shows.id, showArtists.showId))
        .where(
          and(
            inArray(showArtists.artistId, parsed.data.artistIds),
            eq(shows.type, 'qualifier'),
            sql`${shows.id} <> ${parsed.data.showId}`,
          ),
        );
      if (otherQualifierAssignments.length > 0) {
        return actionError('Each artist can only be assigned to one qualifying show.');
      }
    }
    if (new Set(parsed.data.artistIds).size !== parsed.data.artistIds.length)
      return actionError('An artist can only be assigned once per show.');
    if (parsed.data.artistIds.length) {
      const eligible = await db
        .select({ artistId: applications.artistId })
        .from(applications)
        .innerJoin(artists, eq(artists.id, applications.artistId))
        .where(
          and(
            inArray(applications.artistId, parsed.data.artistIds),
            inArray(
              applications.status,
              show.type === 'qualifier' ? ['shortlisted', 'finalist'] : ['finalist'],
            ),
          ),
        );
      if (eligible.length !== parsed.data.artistIds.length) {
        return actionError(
          show.type === 'qualifier'
            ? 'Only artists who passed voting can be assigned to a qualifying show.'
            : 'Only finalists can be assigned to the Grand Final.',
        );
      }
    }
    const now = new Date();
    await db.transaction(async (tx) => {
      const existingAssignments = await tx
        .select({
          artistId: showArtists.artistId,
          advanced: showArtists.advanced,
          winnerAt: showArtists.winnerAt,
        })
        .from(showArtists)
        .where(eq(showArtists.showId, parsed.data.showId));
      const removedAdvancedArtist = existingAssignments.find(
        (assignment) => assignment.advanced && !parsed.data.artistIds.includes(assignment.artistId),
      );
      if (removedAdvancedArtist) {
        throw new Error('advanced_artist_removed');
      }
      const removedWinnerArtist = existingAssignments.find(
        (assignment) => assignment.winnerAt && !parsed.data.artistIds.includes(assignment.artistId),
      );
      if (removedWinnerArtist) {
        throw new Error('winner_artist_removed');
      }
      const advancedByArtist = new Map(
        existingAssignments.map((assignment) => [assignment.artistId, assignment.advanced]),
      );
      const winnerByArtist = new Map(
        existingAssignments.map((assignment) => [assignment.artistId, assignment.winnerAt]),
      );
      await tx.delete(showArtists).where(eq(showArtists.showId, parsed.data.showId));
      if (parsed.data.artistIds.length)
        await tx.insert(showArtists).values(
          parsed.data.artistIds.map((artistId, index) => ({
            id: randomUUID(),
            showId: parsed.data.showId,
            artistId,
            performanceOrder: index + 1,
            advanced: advancedByArtist.get(artistId) ?? null,
            winnerAt: winnerByArtist.get(artistId) ?? null,
            createdAt: now,
          })),
        );
      await tx.insert(auditLog).values(
        await auditValues(admin, 'show.artists_assigned', 'show', parsed.data.showId, null, {
          artistIds: parsed.data.artistIds,
        }),
      );
    });
    revalidatePath('/');
    revalidatePath('/admin/events');
    revalidatePath('/leaderboard');
    return actionOk({ showId: parsed.data.showId, artistIds: parsed.data.artistIds });
  } catch (error) {
    if (error instanceof Error && error.message === 'advanced_artist_removed') {
      return actionError('An advanced artist cannot be removed from their qualifying show.');
    }
    if (error instanceof Error && error.message === 'winner_artist_removed') {
      return actionError('The Grand Final winner cannot be removed from the final show.');
    }
    console.error('[admin] show assignment failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function advanceShowArtistAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = advancementSchema.safeParse(input);
  if (!parsed.success) return actionError('Confirm the artist advancement.');
  try {
    const [assignment] = await db
      .select({ id: showArtists.id, advanced: showArtists.advanced, showType: shows.type })
      .from(showArtists)
      .innerJoin(shows, eq(shows.id, showArtists.showId))
      .where(
        and(
          eq(showArtists.showId, parsed.data.showId),
          eq(showArtists.artistId, parsed.data.artistId),
        ),
      )
      .limit(1);
    if (!assignment) return actionError('Show assignment not found.');
    if (assignment.showType !== 'qualifier')
      return actionError('Only qualifier assignments can advance to the Grand Final.');
    if (assignment.advanced)
      return actionError('This artist has already advanced from this qualifying show.');
    const [assignmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(showArtists)
      .where(eq(showArtists.showId, parsed.data.showId));
    if (Number(assignmentCount?.count ?? 0) !== 4)
      return actionError(
        'Assign exactly four artists to this qualifying show before recording its winner.',
      );
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`show:winner:${parsed.data.showId}`}))`,
      );
      const [winnerCount] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(showArtists)
        .where(and(eq(showArtists.showId, parsed.data.showId), isNotNull(showArtists.advanced)));
      if (Number(winnerCount?.count ?? 0) >= 1) throw new ReviewConflictError('winner_exists');
      const updatedAssignment = await tx
        .update(showArtists)
        .set({ advanced: now })
        .where(and(eq(showArtists.id, assignment.id), isNull(showArtists.advanced)))
        .returning({ id: showArtists.id });
      if (!updatedAssignment[0]) throw new ReviewConflictError('already_advanced');
      await tx
        .update(shows)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(shows.id, parsed.data.showId));
      const updatedApplication = await tx
        .update(applications)
        .set({ status: 'finalist', reviewedBy: admin.id, reviewedAt: now, updatedAt: now })
        .where(
          and(
            eq(applications.artistId, parsed.data.artistId),
            inArray(applications.status, ['shortlisted', 'finalist']),
          ),
        )
        .returning({ id: applications.id });
      if (!updatedApplication[0]) throw new ReviewConflictError('application_not_eligible');
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            'show.artist_advanced',
            'show_artist',
            assignment.id,
            { advancedAt: assignment.advanced },
            { advancedAt: now },
          ),
        );

      // Finalists are derived from qualifier winners; there is no manual Final 4 roster.
      const [finalShow] = await tx
        .select({ id: shows.id })
        .from(shows)
        .where(eq(shows.type, 'final'))
        .limit(1);
      if (finalShow) {
        const winners = await tx
          .select({
            artistId: showArtists.artistId,
            performanceOrder: showArtists.performanceOrder,
            displayOrder: shows.displayOrder,
            showDate: shows.showDate,
            winnerAt: showArtists.winnerAt,
          })
          .from(showArtists)
          .innerJoin(shows, eq(shows.id, showArtists.showId))
          .where(and(eq(shows.type, 'qualifier'), isNotNull(showArtists.advanced)))
          .orderBy(asc(shows.displayOrder), asc(shows.showDate), asc(showArtists.performanceOrder));
        const uniqueWinners = winners.filter(
          (winner, index) =>
            winners.findIndex((candidate) => candidate.artistId === winner.artistId) === index,
        );
        const existingFinal = await tx
          .select({ artistId: showArtists.artistId, winnerAt: showArtists.winnerAt })
          .from(showArtists)
          .where(eq(showArtists.showId, finalShow.id));
        const winnerAtByArtist = new Map(existingFinal.map((row) => [row.artistId, row.winnerAt]));
        await tx.delete(showArtists).where(eq(showArtists.showId, finalShow.id));
        if (uniqueWinners.length) {
          await tx.insert(showArtists).values(
            uniqueWinners.map((winner, index) => ({
              id: randomUUID(),
              showId: finalShow.id,
              artistId: winner.artistId,
              performanceOrder: index + 1,
              advanced: null,
              winnerAt: winnerAtByArtist.get(winner.artistId) ?? null,
              createdAt: now,
            })),
          );
        }
        await tx
          .insert(auditLog)
          .values(
            await auditValues(
              admin,
              'show.finalists_synced',
              'show',
              finalShow.id,
              { artistIds: existingFinal.map((row) => row.artistId) },
              { artistIds: uniqueWinners.map((winner) => winner.artistId) },
            ),
          );
      }
    });
    revalidatePath('/admin/events');
    revalidatePath('/leaderboard');
    revalidatePath('/');
    revalidatePath('/artists');
    return actionOk({
      showId: parsed.data.showId,
      artistId: parsed.data.artistId,
      advancedAt: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return actionError(
        error.message === 'winner_exists'
          ? 'This qualifying show already has a winner.'
          : error.message === 'already_advanced'
            ? 'Another administrator already advanced this artist.'
            : 'This artist is no longer eligible for advancement. Refresh and try again.',
      );
    }
    console.error('[admin] artist advancement failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function setFinalWinnerAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = finalWinnerSchema.safeParse(input);
  if (!parsed.success) return actionError('Select a finalist before recording the winner.');
  try {
    const [show] = await db
      .select({ id: shows.id, type: shows.type })
      .from(shows)
      .where(eq(shows.id, parsed.data.showId))
      .limit(1);
    if (!show || show.type !== 'final') return actionError('Grand Final not found.');
    const [assignmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(showArtists)
      .where(eq(showArtists.showId, parsed.data.showId));
    if (Number(assignmentCount?.count ?? 0) !== 4)
      return actionError(
        'Record all four qualifying show winners before recording the Grand Final winner.',
      );
    const finalArtists = await db
      .select({ artistId: showArtists.artistId })
      .from(showArtists)
      .where(eq(showArtists.showId, parsed.data.showId));
    const advancedSources = await db
      .selectDistinct({ artistId: showArtists.artistId, showId: showArtists.showId })
      .from(showArtists)
      .innerJoin(shows, eq(shows.id, showArtists.showId))
      .where(
        and(
          inArray(
            showArtists.artistId,
            finalArtists.map((row) => row.artistId),
          ),
          eq(shows.type, 'qualifier'),
          isNotNull(showArtists.advanced),
        ),
      );
    if (
      advancedSources.length !== 4 ||
      new Set(advancedSources.map((row) => row.showId)).size !== 4
    )
      return actionError(
        'The Grand Final roster is waiting for one winner from each qualifying show.',
      );
    const [assignment] = await db
      .select({ id: showArtists.id, winnerAt: showArtists.winnerAt })
      .from(showArtists)
      .where(
        and(
          eq(showArtists.showId, parsed.data.showId),
          eq(showArtists.artistId, parsed.data.artistId),
        ),
      )
      .limit(1);
    if (!assignment) return actionError('The selected artist is not assigned to the Grand Final.');
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`show:final-winner:${parsed.data.showId}`}))`,
      );
      await tx
        .update(showArtists)
        .set({ winnerAt: null })
        .where(eq(showArtists.showId, parsed.data.showId));
      await tx.update(showArtists).set({ winnerAt: now }).where(eq(showArtists.id, assignment.id));
      await tx
        .update(shows)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(shows.id, parsed.data.showId));
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            'show.final_winner_selected',
            'show_artist',
            assignment.id,
            { winnerAt: assignment.winnerAt },
            { winnerAt: now, showId: parsed.data.showId, artistId: parsed.data.artistId },
          ),
        );
    });
    revalidatePath('/admin/events');
    revalidatePath('/leaderboard');
    revalidatePath('/');
    return actionOk({
      showId: parsed.data.showId,
      artistId: parsed.data.artistId,
      winnerAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[admin] final winner selection failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function addApplicationReviewNoteAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return actionError('Enter a review note.');

  try {
    const now = new Date();
    const stamped = `[${now.toISOString()}] ${admin.email}: ${parsed.data.note}`;
    const auditEntry = await auditValues(
      admin,
      'application.review_note_added',
      'application',
      parsed.data.applicationId,
      null,
      { note: parsed.data.note },
    );
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(applications)
        .set({
          reviewNotes: sql<string>`${stamped} || case
            when ${applications.reviewNotes} is null or ${applications.reviewNotes} = '' then ''
            else E'\n\n' || ${applications.reviewNotes}
          end`,
          reviewedBy: admin.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(applications.id, parsed.data.applicationId))
        .returning({ id: applications.id });
      if (!updated[0]) throw new ReviewConflictError('not_found');
      await tx.insert(auditLog).values(auditEntry);
    });
    revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
    return actionOk({ note: stamped });
  } catch (error) {
    if (error instanceof ReviewConflictError) return actionError('Application not found.');
    console.error('[admin] add review note failed', error);
    return actionError(GENERIC_ERROR);
  }
}

export async function reviewVoteAction(input: unknown) {
  let admin;
  try {
    admin = await requireAdminWriteOrThrow();
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }
  const parsed = voteReviewSchema.safeParse(input);
  if (!parsed.success) return actionError('Add a reason before saving the vote decision.');
  try {
    const [before] = await db
      .select({
        id: votes.id,
        invalidatedAt: votes.invalidatedAt,
        reviewDecision: votes.reviewDecision,
      })
      .from(votes)
      .where(eq(votes.id, parsed.data.voteId))
      .limit(1);
    if (!before) return actionError('Vote not found.');
    const now = new Date();
    const invalidated = parsed.data.decision === 'invalidate';
    await db.transaction(async (tx) => {
      await tx
        .update(votes)
        .set({
          invalidatedAt: invalidated ? now : null,
          invalidatedBy: invalidated ? admin.id : null,
          invalidationReason: invalidated ? parsed.data.reason : null,
          reviewDecision: invalidated ? 'invalidated' : 'cleared',
          reviewNotes: parsed.data.reason,
          reviewedAt: now,
          reviewedBy: admin.id,
        })
        .where(eq(votes.id, parsed.data.voteId));
      await tx
        .insert(auditLog)
        .values(
          await auditValues(
            admin,
            invalidated ? 'vote.invalidated' : 'vote.cleared',
            'vote',
            parsed.data.voteId,
            before,
            { decision: parsed.data.decision, reason: parsed.data.reason },
          ),
        );
    });
    revalidatePath('/admin/voting');
    revalidatePath('/admin/voting/leaderboard');
    revalidatePath(`/admin/voting/integrity/${parsed.data.voteId}`);
    return actionOk({ voteId: parsed.data.voteId, decision: parsed.data.decision });
  } catch (error) {
    console.error('[admin] vote review failed', error);
    return actionError(GENERIC_ERROR);
  }
}
