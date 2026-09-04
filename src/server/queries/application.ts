import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { artists, applications } from '@/db/schema';

/**
 * Reads for the artist's own application.
 *
 * Every function here scopes by userId from the SESSION, never a parameter the
 * client controls. An id arriving from the browser is an IDOR waiting to
 * happen, and this surface is where one would hurt most: applications hold
 * contact details and, after review, private admin notes.
 */

/** Everything the artist may see about their own application. */
export type ArtistApplication = {
  artistId: string;
  applicationId: string;
  status: (typeof applications.status.enumValues)[number];
  currentStep: number;
  submittedAt: Date | null;
  /** Shown to the artist on rejection. Review notes are NOT included. */
  rejectionReason: string | null;

  actName: string;
  slug: string;
  actType: (typeof artists.actType.enumValues)[number];
  bio: string | null;
  locationCity: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  photoKeys: string[];
  primaryPhotoKey: string | null;
  websiteUrl: string | null;
  performanceVideoUrl: string | null;
  performanceVideoUrls: string[];
  socialLinks: Record<string, string>;
  musicLinks: Record<string, string>;

  availableAllDates: boolean | null;
  isOfAge: boolean | null;
  isOntarioResident: boolean | null;
  acceptedRules: boolean;
  acceptedMediaRelease: boolean;
  acceptedPrivacyPolicy: boolean;
  pendingEdits: Record<string, unknown> | null;
  pendingEditsSubmittedAt: Date | null;
};

/**
 * Loads the signed-in artist's application, or null if they have not started one.
 *
 * Columns get listed explicitly, and `reviewNotes` is missing on purpose. It
 * records an internal panel discussion and must never reach the applicant. A
 * whole-row select handed to a serialized prop is how it would.
 */
export async function getApplicationForUser(userId: string): Promise<ArtistApplication | null> {
  const [row] = await db
    .select({
      artistId: artists.id,
      applicationId: applications.id,
      status: applications.status,
      currentStep: applications.currentStep,
      submittedAt: applications.submittedAt,
      rejectionReason: applications.rejectionReason,

      actName: artists.actName,
      slug: artists.slug,
      actType: artists.actType,
      bio: artists.bio,
      locationCity: artists.locationCity,
      contactEmail: artists.contactEmail,
      contactPhone: artists.contactPhone,
      photoKeys: artists.photoKeys,
      primaryPhotoKey: artists.primaryPhotoKey,
      websiteUrl: artists.websiteUrl,
      performanceVideoUrl: artists.performanceVideoUrl,
      performanceVideoUrls: artists.performanceVideoUrls,
      socialLinks: artists.socialLinks,
      musicLinks: artists.musicLinks,

      availableAllDates: applications.availableAllDates,
      isOfAge: applications.isOfAge,
      isOntarioResident: applications.isOntarioResident,
      acceptedRules: applications.acceptedRules,
      acceptedMediaRelease: applications.acceptedMediaRelease,
      acceptedPrivacyPolicy: applications.acceptedPrivacyPolicy,
      pendingEdits: applications.pendingEdits,
      pendingEditsSubmittedAt: applications.pendingEditsSubmittedAt,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(eq(artists.userId, userId))
    .limit(1);

  return row ?? null;
}

/** The artist row id for a user, if one exists. Used before an update. */
export async function getArtistIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.userId, userId))
    .limit(1);

  return row?.id ?? null;
}
