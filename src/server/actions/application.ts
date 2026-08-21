'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, like } from 'drizzle-orm';
import { db } from '@/db';
import { artists, applications } from '@/db/schema';
import { requireRoleOrThrow, AuthorizationError } from '@/lib/auth/guards';
import { slugify, uniqueSlug } from '@/lib/slug';
import {
  applicationDraftSchema,
  applicationSubmitSchema,
  APPLICATION_CONSENT_WORDING,
  type ApplicationDraftOutput,
} from '@/lib/validation/application';
import { recordConsents } from '@/server/consent';
import { isCompetitionStageActive } from '@/server/queries/public';
import { renderArtistApplicationStageEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import {
  actionOk,
  actionError,
  fieldErrorsFromZod,
  GENERIC_ERROR,
  type ActionResult,
} from './types';

/**
 * Artist application actions (§4.2).
 *
 * ORDER IN EVERY ACTION: authorize, validate, then scope the write to the
 * session user. Validate first and you've done work for an anonymous caller
 * and leaked the schema shape through your error messages.
 *
 * Nothing in this file takes an `artistId` or `applicationId` parameter. Every
 * row gets found from the session, which leaves no id for a client to tamper
 * with and no IDOR to get wrong.
 */

/** Maps a thrown AuthorizationError onto a result the form can render. */
function authFailure(error: unknown): ActionResult<never> | null {
  if (error instanceof AuthorizationError) {
    return error.code === 'unauthenticated'
      ? actionError('Please sign in to continue.')
      : actionError('You do not have access to this.');
  }
  return null;
}

/** Splits the flat form payload into the artists and applications column sets. */
function toArtistColumns(data: ApplicationDraftOutput) {
  const socialLinks: Record<string, string> = {};
  if (data.instagram) socialLinks.instagram = data.instagram;
  if (data.tiktok) socialLinks.tiktok = data.tiktok;
  if (data.x) socialLinks.x = data.x;
  if (data.youtube) socialLinks.youtube = data.youtube;
  if (data.facebook) socialLinks.facebook = data.facebook;

  const musicLinks: Record<string, string> = {};
  (data.recordedMusicUrls ?? []).forEach((url, index) => {
    musicLinks[`link_${index + 1}`] = url;
  });

  return {
    actName: data.actName?.trim() || 'Untitled application',
    actType: (data.actType || 'solo') as 'solo' | 'duo' | 'band',
    bio: data.bio || null,
    locationCity: data.locationCity || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    /**
     * photoKeys holds Cloudinary public_ids, never delivery URLs. A URL bakes
     * the cloud name and the transformation into every single row.
     */
    photoKeys: data.photoKey ? [data.photoKey] : [],
    primaryPhotoKey: data.photoKey || null,
    websiteUrl: data.websiteUrl || null,
    /** The first video is the one embedded on the public profile. */
    performanceVideoUrl: data.performanceVideoUrls?.[0] ?? null,
    performanceVideoUrls: data.performanceVideoUrls ?? [],
    socialLinks,
    musicLinks,
    updatedAt: new Date(),
  };
}

function toApplicationColumns(data: ApplicationDraftOutput) {
  return {
    currentStep: data.currentStep ?? 1,
    availableAllDates: data.availableAllDates ?? null,
    /**
     * One checkbox covers both age and residency (§4.1), so both columns take
     * its value. Split them if the client ever separates the questions.
     */
    isOfAge: data.isEligible ?? null,
    isOntarioResident: data.isEligible ?? null,
    acceptedRules: data.acceptedRules ?? false,
    acceptedMediaRelease: data.acceptedMediaRelease ?? false,
    updatedAt: new Date(),
  };
}

/**
 * Creates the artist and application rows if this user has none.
 *
 * Wrapped in a transaction. An artist row with no application leaves the
 * dashboard unable to load and the artist unable to create one, because a row
 * already exists.
 */
async function ensureApplicationRows(
  userId: string,
  fallbackName: string,
): Promise<{ artistId: string; applicationId: string; status: string }> {
  const [existing] = await db
    .select({
      artistId: artists.id,
      applicationId: applications.id,
      status: applications.status,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(eq(artists.userId, userId))
    .limit(1);

  if (existing) return existing;

  const artistId = randomUUID();
  const applicationId = randomUUID();

  // Candidate slugs already in use, so a second "The Ramblers" becomes
  // "the-ramblers-2" instead of colliding.
  const root = slugify(fallbackName) || 'artist';
  const conflicts = await db
    .select({ slug: artists.slug })
    .from(artists)
    .where(like(artists.slug, `${root}%`));

  const slug = uniqueSlug(fallbackName, new Set(conflicts.map((row) => row.slug)), artistId);

  await db.transaction(async (tx) => {
    await tx.insert(artists).values({
      id: artistId,
      userId,
      actName: fallbackName || 'Untitled application',
      slug,
      actType: 'solo',
    });

    await tx.insert(applications).values({
      id: applicationId,
      artistId,
      status: 'draft',
      currentStep: 1,
    });
  });

  return { artistId, applicationId, status: 'draft' };
}

/**
 * Saves a draft (§3.1).
 *
 * Lenient on purpose. A half-finished application saved from a phone on a
 * dropped connection has to survive with three fields still blank. Hard gates
 * belong to submitApplicationAction, not here.
 */
export async function saveApplicationDraftAction(
  input: unknown,
): Promise<ActionResult<{ savedAt: string }>> {
  let user;
  try {
    user = await requireRoleOrThrow('artist');
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  const parsed = applicationDraftSchema.safeParse(input);
  if (!parsed.success) {
    // Caller is authenticated and owns this row, so field-level detail is safe
    // here, and without it the form is unusable.
    return actionError(
      'Please check the highlighted fields.',
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  try {
    const rows = await ensureApplicationRows(
      user.id,
      parsed.data.actName?.trim() || user.name || 'Untitled application',
    );

    /**
     * A submitted application is locked (§3.2). Quietly accepting the write and
     * returning success beats refusing only in appearance: the artist walks
     * away believing an edit landed, when the review queue already read the old
     * version.
     */
    if (['approved', 'shortlisted', 'finalist', 'withdrawn'].includes(rows.status)) {
      return actionError(
        'This application is locked after advancement and can no longer be edited.',
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(artists)
        .set(toArtistColumns(parsed.data))
        // Scoped by userId. Never by an id off the request.
        .where(and(eq(artists.id, rows.artistId), eq(artists.userId, user.id)));

      await tx
        .update(applications)
        .set({
          ...toApplicationColumns(parsed.data),
          status: 'draft',
          submittedAt: null,
          rejectionReason: null,
        })
        .where(
          and(
            eq(applications.id, rows.applicationId),
            inArray(applications.status, ['draft', 'submitted', 'under_review', 'rejected']),
          ),
        );
    });

    revalidatePath('/artist');
    return actionOk({ savedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[application] draft save failed', error);
    return actionError(GENERIC_ERROR);
  }
}

/**
 * Submits the application.
 *
 * The strict schema runs here. Every §4.1 gate gets checked server-side:
 * availability for all five dates, eligibility, rules, media release. The
 * client checked them too, and the client is not who we trust.
 */
export async function submitApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; submittedAt: string }>> {
  let user;
  try {
    user = await requireRoleOrThrow('artist');
  } catch (error) {
    return authFailure(error) ?? actionError(GENERIC_ERROR);
  }

  /**
   * The application window (§19), checked server-side. A closed window that
   * only hides a button isn't closed.
   */
  const applicationsOpen = await isCompetitionStageActive('applications');
  if (!applicationsOpen) {
    return actionError('Applications are not open at the moment.');
  }

  const parsed = applicationSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      'Some required information is missing. Please review the highlighted fields.',
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  try {
    const rows = await ensureApplicationRows(user.id, parsed.data.actName);

    if (['approved', 'shortlisted', 'finalist', 'withdrawn'].includes(rows.status)) {
      return actionError('This application is locked after advancement.');
    }

    const submittedAt = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(artists)
        .set(toArtistColumns(parsed.data))
        .where(and(eq(artists.id, rows.artistId), eq(artists.userId, user.id)));

      const updated = await tx
        .update(applications)
        .set({
          ...toApplicationColumns(parsed.data),
          status: 'submitted',
          submittedAt,
          acceptedPrivacyPolicy: true,
          currentStep: 5,
        })
        /**
         * Scoped on status='draft' as well as id. Two submits racing off a
         * double-tapped button both clear the check above. Only one updates a
         * row here; the second sees zero rows and rolls back.
         */
        .where(and(eq(applications.id, rows.applicationId), eq(applications.status, 'draft')))
        .returning({ id: applications.id });

      if (updated.length === 0) {
        throw new Error('application_already_submitted');
      }
    });

    /**
     * Consent records carrying the exact wording shown. Outside the transaction
     * for the same reason as sign-up: a failed consent write must not roll back
     * a submission the artist was already told had succeeded. Logged, never
     * swallowed.
     */
    try {
      const requestHeaders = await headers();
      await recordConsents(
        [
          {
            email: parsed.data.contactEmail,
            consentType: 'competition_rules',
            granted: true,
            wordingShown: APPLICATION_CONSENT_WORDING.rules,
            source: 'application',
          },
          {
            email: parsed.data.contactEmail,
            consentType: 'media_release',
            granted: true,
            wordingShown: APPLICATION_CONSENT_WORDING.mediaRelease,
            source: 'application',
          },
          {
            email: parsed.data.contactEmail,
            consentType: 'application',
            granted: true,
            wordingShown: `${APPLICATION_CONSENT_WORDING.eligibility} ${APPLICATION_CONSENT_WORDING.availability}`,
            source: 'application',
          },
        ],
        requestHeaders,
      );
    } catch (consentError) {
      console.error('[application] consent record failed', consentError);
    }

    revalidatePath('/artist');
    const rendered = renderArtistApplicationStageEmail({
      artistName: user.name || parsed.data.actName,
      actName: parsed.data.actName,
      status: 'submitted',
    });
    const emailResult = await sendEmail({
      to: parsed.data.contactEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (!emailResult.success)
      console.error('[application] confirmation email failed after submission', emailResult.error);
    return actionOk({
      applicationId: rows.applicationId,
      submittedAt: submittedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'application_already_submitted') {
      return actionError('This application has already been submitted.');
    }
    console.error('[application] submit failed', error);
    return actionError(GENERIC_ERROR);
  }
}
