import 'server-only';

import { artists, judges, sponsors, prizes } from '@/db/schema';

/**
 * Explicit column sets for public queries.
 *
 * NEVER `select()` a whole row for anything public. Artist records hold contact
 * details and internal review notes; a whole-row select serialized into a
 * component prop is how private data ends up in the HTML payload, where it is
 * readable even though nothing renders it.
 *
 * Import one of these objects into every public query. If a column is not
 * listed here, it does not reach the browser.
 */

/** Safe to render on a public artist profile. Excludes all contact fields. */
export const publicArtistColumns = {
  id: artists.id,
  actName: artists.actName,
  slug: artists.slug,
  actType: artists.actType,
  bio: artists.bio,
  locationCity: artists.locationCity,
  locationProvince: artists.locationProvince,
  formationYear: artists.formationYear,
  memberCount: artists.memberCount,
  photoKeys: artists.photoKeys,
  primaryPhotoKey: artists.primaryPhotoKey,
  websiteUrl: artists.websiteUrl,
  performanceVideoUrl: artists.performanceVideoUrl,
  socialLinks: artists.socialLinks,
  musicLinks: artists.musicLinks,
  publishedAt: artists.publishedAt,
} as const;

/** Directory listing. Narrower still: no bio, no links. */
export const artistCardColumns = {
  id: artists.id,
  actName: artists.actName,
  slug: artists.slug,
  actType: artists.actType,
  locationCity: artists.locationCity,
  primaryPhotoKey: artists.primaryPhotoKey,
} as const;

/**
 * Judges. Excludes agreementNotes, which is an internal record of where a
 * written agreement stands (§8).
 */
export const publicJudgeColumns = {
  id: judges.id,
  name: judges.name,
  title: judges.title,
  organization: judges.organization,
  seat: judges.seat,
  bio: judges.bio,
  photoKey: judges.photoKey,
  socialLinks: judges.socialLinks,
  displayOrder: judges.displayOrder,
} as const;

export const publicSponsorColumns = {
  id: sponsors.id,
  name: sponsors.name,
  tier: sponsors.tier,
  logoKey: sponsors.logoKey,
  websiteUrl: sponsors.websiteUrl,
  description: sponsors.description,
  requiresAgeGate: sponsors.requiresAgeGate,
  displayOrder: sponsors.displayOrder,
  placement: sponsors.placement,
} as const;

export const publicPrizeColumns = {
  id: prizes.id,
  title: prizes.title,
  description: prizes.description,
  provider: prizes.provider,
  estimatedValue: prizes.estimatedValue,
  displayOrder: prizes.displayOrder,
} as const;
