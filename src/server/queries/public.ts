import 'server-only';

import { and, eq, asc } from 'drizzle-orm';
import { db } from '@/db';
import { judges, sponsors, prizes, shows, settings, contentBlocks } from '@/db/schema';
import { FEATURE_FLAG_DEFAULTS, type FeatureFlag } from '@/config/event';
import { publicJudgeColumns, publicSponsorColumns, publicPrizeColumns } from './columns';

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
      ticketUrl: shows.ticketUrl,
    })
    .from(shows)
    .orderBy(asc(shows.displayOrder), asc(shows.showDate));
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
