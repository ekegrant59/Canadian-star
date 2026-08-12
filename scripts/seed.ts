import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import {
  SHOW_DATES,
  EVENT,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SCORING_CRITERIA,
  FEATURE_FLAG_DEFAULTS,
} from '../src/config/event';

/**
 * Development seed.
 *
 * Loads the structural records every environment needs (shows, scoring weights,
 * criteria, feature flags) plus realistic dev data for building against.
 *
 * Safe to re-run: structural rows are upserted by their natural key.
 *
 * NOTE: no judge, sponsor, or prize is seeded as `confirmed`. §8 states that
 * any artist or public figure is unconfirmed until written agreement exists,
 * and seeding a confirmed record would make it render publicly.
 */

const ONTARIO_CITIES = [
  'Peterborough',
  'Kingston',
  'Oshawa',
  'Belleville',
  'Cobourg',
  'Lindsay',
  'Barrie',
  'Kitchener',
  'London',
  'Hamilton',
  'Ottawa',
  'Sudbury',
];

const ACT_NAMES = [
  'The Gravel Road Band',
  'Maple Creek',
  'Sarah Whitfield',
  'The Hayloft Sessions',
  'Dusty Boots Collective',
  'Jesse Callahan',
  'Northern Line',
  'The Kawartha Ramblers',
  'Emily Rose Duncan',
  'Backroad Revival',
  'The Silver Birch Trio',
  'Tanner McGrath',
  'Wildflower Highway',
  'The Lockridge Brothers',
  'Casey Lynn Turner',
  'Ironwood County',
  'The Bellamy Sisters',
  'Cole Harrington',
  'Riverbend Union',
  'Mackenzie Doyle',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool, { schema });

  console.log('Seeding...');

  // -------------------------------------------------------------------------
  // Shows (§3)
  // -------------------------------------------------------------------------
  for (const [index, show] of SHOW_DATES.entries()) {
    await db
      .insert(schema.shows)
      .values({
        id: randomUUID(),
        key: show.key,
        label: show.label,
        type: show.type,
        showDate: show.date,
        venueName: EVENT.venue.name,
        displayOrder: index,
      })
      .onConflictDoNothing({ target: schema.shows.key });
  }
  console.log(`  shows: ${SHOW_DATES.length}`);

  // -------------------------------------------------------------------------
  // Scoring weights (§7). Tip jar seeded DISABLED.
  // -------------------------------------------------------------------------
  for (const [index, weight] of DEFAULT_SCORING_WEIGHTS.entries()) {
    await db
      .insert(schema.scoringWeights)
      .values({
        id: randomUUID(),
        component: weight.component,
        label: weight.label,
        weight: String(weight.weight),
        enabled: weight.component !== 'tip_jar',
        displayOrder: index,
      })
      .onConflictDoNothing({ target: schema.scoringWeights.component });
  }
  console.log(`  scoring weights: ${DEFAULT_SCORING_WEIGHTS.length} (tip jar disabled)`);

  // -------------------------------------------------------------------------
  // Scoring criteria (§4.4)
  // -------------------------------------------------------------------------
  for (const [index, criterion] of DEFAULT_SCORING_CRITERIA.entries()) {
    await db
      .insert(schema.scoringCriteria)
      .values({
        id: randomUUID(),
        key: criterion.key,
        label: criterion.label,
        weight: '1',
        maxScore: 10,
        displayOrder: index,
      })
      .onConflictDoNothing({ target: schema.scoringCriteria.key });
  }
  console.log(`  scoring criteria: ${DEFAULT_SCORING_CRITERIA.length}`);

  // -------------------------------------------------------------------------
  // Feature flags
  // -------------------------------------------------------------------------
  for (const [flag, value] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    await db
      .insert(schema.settings)
      .values({
        key: `flag:${flag}`,
        value: String(value),
        description: `Feature flag: ${flag}`,
      })
      .onConflictDoNothing({ target: schema.settings.key });
  }
  console.log(`  feature flags: ${Object.keys(FEATURE_FLAG_DEFAULTS).length}`);

  // -------------------------------------------------------------------------
  // Dev-only sample data. Never run against production.
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    console.log('Production detected: skipping sample data.');
    await pool.end();
    return;
  }

  const statuses = ['draft', 'submitted', 'under_review', 'shortlisted', 'finalist'] as const;
  let created = 0;

  for (const [index, actName] of ACT_NAMES.entries()) {
    const slug = slugify(actName);

    const existing = await db.query.artists.findFirst({
      where: (artists, { eq }) => eq(artists.slug, slug),
    });
    if (existing) continue;

    const userId = randomUUID();
    const email = `${slug}@example.test`;

    await db.insert(schema.users).values({
      id: userId,
      email,
      emailRaw: email,
      emailCanonical: email,
      emailVerified: true,
      name: actName,
      role: 'artist',
    });

    const status = statuses[index % statuses.length]!;
    const isPublished = status === 'shortlisted' || status === 'finalist';

    const artistId = randomUUID();
    await db.insert(schema.artists).values({
      id: artistId,
      userId,
      actName,
      slug,
      actType: index % 3 === 0 ? 'solo' : index % 3 === 1 ? 'band' : 'duo',
      bio: `${actName} is an emerging country act from ${ONTARIO_CITIES[index % ONTARIO_CITIES.length]}, Ontario. Sample seed data for development.`,
      locationCity: ONTARIO_CITIES[index % ONTARIO_CITIES.length]!,
      locationProvince: 'ON',
      formationYear: 2015 + (index % 10),
      memberCount: index % 3 === 0 ? 1 : 2 + (index % 4),
      photoKeys: [],
      socialLinks: {},
      musicLinks: {},
      isPublished,
      publishedAt: isPublished ? new Date() : null,
      contactEmail: email,
    });

    await db.insert(schema.applications).values({
      id: randomUUID(),
      artistId,
      status,
      currentStep: status === 'draft' ? 3 : 8,
      isOntarioResident: true,
      isOfAge: true,
      hasRecordingContract: false,
      hasManagementContract: false,
      wonPreviousCompetition: false,
      availableAllDates: true,
      acceptedRules: status !== 'draft',
      acceptedMediaRelease: status !== 'draft',
      acceptedPrivacyPolicy: status !== 'draft',
      submittedAt: status === 'draft' ? null : new Date(),
    });

    created += 1;
  }

  console.log(`  sample artists + applications: ${created}`);
  console.log('Seed complete.');

  await pool.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
