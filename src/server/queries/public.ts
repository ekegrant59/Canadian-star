import 'server-only';

import { and, asc, count, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  artists,
  applications,
  competitionPhases,
  judges,
  sponsors,
  prizes,
  shows,
  settings,
  contentBlocks,
  homepageAnnouncements,
  showArtists,
  votes,
} from '@/db/schema';
import { FEATURE_FLAG_DEFAULTS, type FeatureFlag } from '@/config/event';
import { COMPETITION_STAGES, type CompetitionStage } from '@/config/event';
import {
  artistCardColumns,
  publicArtistColumns,
  publicJudgeColumns,
  publicSponsorColumns,
  publicPrizeColumns,
} from './columns';

/**
 * Public read queries.
 *
 * Two rules enforced here rather than in components:
 *
 *  1. Explicit column sets only (see columns.ts).
 *  2. Only `confirmed` participants and prizes are returned. §8 and §9 state
 *     that nobody and nothing is confirmed until written agreement exists, and
 *     the proposal names Kaleb, Sasha, and the James Barker Band only as
 *     potential. Filtering here means a component cannot leak an unconfirmed
 *     name by forgetting a condition.
 */

export async function getConfirmedJudges() {
  return db
    .select(publicJudgeColumns)
    .from(judges)
    .where(eq(judges.status, 'confirmed'))
    .orderBy(asc(judges.displayOrder), asc(judges.name));
}

export async function getConfirmedSponsors() {
  return db
    .select(publicSponsorColumns)
    .from(sponsors)
    .where(eq(sponsors.status, 'confirmed'))
    .orderBy(asc(sponsors.displayOrder), asc(sponsors.name));
}

export async function getConfirmedPrizes() {
  return db
    .select(publicPrizeColumns)
    .from(prizes)
    .where(eq(prizes.status, 'confirmed'))
    .orderBy(asc(prizes.displayOrder));
}

/** The five shows (§3), in date order. */
export async function getShows() {
  return db
    .select({
      id: shows.id,
      key: shows.key,
      label: shows.label,
      type: shows.type,
      showDate: shows.showDate,
      doorsTime: shows.doorsTime,
      startTime: shows.startTime,
      contingencyDate: shows.contingencyDate,
      status: shows.status,
      statusNote: shows.statusNote,
      venueName: shows.venueName,
      venueAddress: shows.venueAddress,
      ticketUrl: shows.ticketUrl,
    })
    .from(shows)
    .orderBy(asc(shows.displayOrder), asc(shows.showDate));
}

/** Public artist roster for voting and anticipation. */
export async function getPublicVotingArtists() {
  return db
    .select({
      ...publicArtistColumns,
      applicationStatus: applications.status,
      verifiedVotes: sql<number>`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .leftJoin(votes, and(eq(votes.artistId, artists.id), eq(votes.round, 'public_shortlist')))
    .where(
      and(
        eq(artists.profileStatus, 'published'),
        or(
          eq(applications.status, 'approved'),
          eq(applications.status, 'shortlisted'),
          eq(applications.status, 'finalist'),
        ),
      ),
    )
    .groupBy(artists.id, applications.id)
    .orderBy(
      desc(sql`case when ${applications.status} in ('shortlisted', 'finalist') then 1 else 0 end`),
      desc(
        sql`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      ),
      asc(artists.actName),
    );
}

/** Public directory projection. Kept separate so profile visibility is explicit. */
export async function getPublicArtistCards() {
  return db
    .select({
      ...artistCardColumns,
      applicationStatus: applications.status,
      verifiedVotes: sql<number>`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .leftJoin(votes, and(eq(votes.artistId, artists.id), eq(votes.round, 'public_shortlist')))
    .where(
      and(
        eq(artists.profileStatus, 'published'),
        or(
          eq(applications.status, 'approved'),
          eq(applications.status, 'shortlisted'),
          eq(applications.status, 'finalist'),
        ),
      ),
    )
    .groupBy(artists.id, applications.id)
    .orderBy(
      desc(sql`case when ${applications.status} in ('shortlisted', 'finalist') then 1 else 0 end`),
      desc(
        sql`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      ),
      asc(artists.actName),
    );
}

export async function getPublicFinalists() {
  return db
    .select({
      ...publicArtistColumns,
      showId: shows.id,
      showLabel: shows.label,
      showDate: shows.showDate,
      ticketUrl: shows.ticketUrl,
      performanceOrder: showArtists.performanceOrder,
    })
    .from(showArtists)
    .innerJoin(artists, eq(artists.id, showArtists.artistId))
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .innerJoin(shows, eq(shows.id, showArtists.showId))
    .where(
      and(
        eq(artists.profileStatus, 'published'),
        or(eq(applications.status, 'shortlisted'), eq(applications.status, 'finalist')),
        eq(shows.type, 'qualifier'),
      ),
    )
    .orderBy(asc(shows.showDate), asc(showArtists.performanceOrder), asc(artists.actName));
}

/** The four qualifier winners assigned to the Grand Final. */
export async function getPublicGrandFinalists() {
  return db
    .select({
      ...publicArtistColumns,
      showId: shows.id,
      showLabel: shows.label,
      showDate: shows.showDate,
      ticketUrl: shows.ticketUrl,
      performanceOrder: showArtists.performanceOrder,
    })
    .from(showArtists)
    .innerJoin(artists, eq(artists.id, showArtists.artistId))
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .innerJoin(shows, eq(shows.id, showArtists.showId))
    .where(
      and(
        eq(artists.profileStatus, 'published'),
        eq(applications.status, 'finalist'),
        eq(shows.type, 'final'),
      ),
    )
    .orderBy(asc(showArtists.performanceOrder), asc(artists.actName));
}

/**
 * Reads a feature flag.
 *
 * The database is the operational source of truth so an admin can flip a flag
 * without a deploy; src/config/event.ts holds the default used before a row
 * exists. One setting, one scope: a flag is read here and nowhere else.
 */
export async function getFeatureFlag(flag: FeatureFlag): Promise<boolean> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, `flag:${flag}`))
    .limit(1);

  if (!row) return FEATURE_FLAG_DEFAULTS[flag];
  return row.value === 'true';
}

export async function getFeatureFlags(): Promise<Record<FeatureFlag, boolean>> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings);

  const overrides = new Map(rows.map((row) => [row.key, row.value]));
  const result = {} as Record<FeatureFlag, boolean>;

  for (const flag of Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlag[]) {
    const override = overrides.get(`flag:${flag}`);
    result[flag] = override === undefined ? FEATURE_FLAG_DEFAULTS[flag] : override === 'true';
  }

  return result;
}

/** Operational phase shared by the landing, artist, and admin experiences. */
export async function getCompetitionStage(): Promise<CompetitionStage> {
  const [override] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'competition:stage_override'))
    .limit(1);

  if (
    override?.value &&
    override.value !== 'auto' &&
    COMPETITION_STAGES.some((stage) => stage.key === override.value)
  ) {
    return override.value as CompetitionStage;
  }

  const now = new Date();
  const [scheduled] = await db
    .select({ key: competitionPhases.key })
    .from(competitionPhases)
    .where(and(lte(competitionPhases.startsAt, now), gt(competitionPhases.endsAt, now)))
    .orderBy(desc(competitionPhases.displayOrder))
    .limit(1);
  if (scheduled?.key) return scheduled.key;

  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'competition:stage'))
    .limit(1);

  return COMPETITION_STAGES.some((stage) => stage.key === row?.value)
    ? (row!.value as CompetitionStage)
    : 'applications';
}

export async function getCompetitionStageOverride(): Promise<CompetitionStage | 'auto'> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'competition:stage_override'))
    .limit(1);
  return row?.value === 'auto' || COMPETITION_STAGES.some((stage) => stage.key === row?.value)
    ? ((row?.value as CompetitionStage | 'auto' | undefined) ?? 'auto')
    : 'auto';
}

/** Whether a phase is operationally open, honoring a manual override first. */
export async function isCompetitionStageActive(stage: CompetitionStage): Promise<boolean> {
  const override = await getCompetitionStageOverride();
  if (override !== 'auto') return override === stage;

  const now = new Date();
  const [phase] = await db
    .select({ id: competitionPhases.id })
    .from(competitionPhases)
    .where(
      and(
        eq(competitionPhases.key, stage),
        lte(competitionPhases.startsAt, now),
        gt(competitionPhases.endsAt, now),
      ),
    )
    .limit(1);
  return Boolean(phase);
}

export async function getCompetitionPhases() {
  return db
    .select({
      key: competitionPhases.key,
      label: competitionPhases.label,
      startsAt: competitionPhases.startsAt,
      endsAt: competitionPhases.endsAt,
      displayOrder: competitionPhases.displayOrder,
    })
    .from(competitionPhases)
    .orderBy(asc(competitionPhases.displayOrder));
}

export async function getActiveHomepageAnnouncement() {
  const [row] = await db
    .select({
      id: homepageAnnouncements.id,
      title: homepageAnnouncements.title,
      body: homepageAnnouncements.body,
      ctaLabel: homepageAnnouncements.ctaLabel,
      ctaUrl: homepageAnnouncements.ctaUrl,
      severity: homepageAnnouncements.severity,
    })
    .from(homepageAnnouncements)
    .where(
      and(
        eq(homepageAnnouncements.id, 'homepage-primary'),
        eq(homepageAnnouncements.published, true),
      ),
    )
    .orderBy(desc(homepageAnnouncements.updatedAt))
    .limit(1);
  return row ?? null;
}

/** Published marketing copy for a content block key. */
export async function getContentBlock(key: string) {
  const [row] = await db
    .select({
      key: contentBlocks.key,
      title: contentBlocks.title,
      body: contentBlocks.body,
    })
    .from(contentBlocks)
    .where(and(eq(contentBlocks.key, key), eq(contentBlocks.published, true)))
    .limit(1);

  return row ?? null;
}

/** Public artist profile lookup. Returns only published voting-eligible records. */
export async function getPublicArtistBySlug(slug: string) {
  const [row] = await db
    .select({ ...publicArtistColumns, applicationStatus: applications.status })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(
      and(
        eq(artists.slug, slug),
        eq(artists.profileStatus, 'published'),
        or(
          eq(applications.status, 'approved'),
          eq(applications.status, 'shortlisted'),
          eq(applications.status, 'finalist'),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublicArtistVoteCount(artistId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(votes)
    .where(
      and(
        eq(votes.artistId, artistId),
        eq(votes.round, 'public_shortlist'),
        eq(votes.verified, true),
        isNull(votes.invalidatedAt),
      ),
    );
  return Number(row?.count ?? 0);
}
