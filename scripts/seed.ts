import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, inArray } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import * as schema from '../src/db/schema';
import { normalizeEmail } from '../src/lib/email-normalize';
import { PASSWORD_MIN_LENGTH } from '../src/lib/validation/auth';
import {
  SHOW_DATES,
  EVENT,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SCORING_CRITERIA,
  FEATURE_FLAG_DEFAULTS,
  MILESTONES,
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

const LEGACY_SAMPLE_ACT_NAMES = [
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

const PHASE_SEEDS = [
  {
    key: 'applications' as const,
    label: 'Applications',
    startsAt: `${MILESTONES.applicationsOpen}T00:00:00-04:00`,
    endsAt: `${MILESTONES.applicationsClose}T23:59:59-04:00`,
    displayOrder: 1,
  },
  {
    key: 'voting' as const,
    label: 'Fan Voting',
    startsAt: `${MILESTONES.votingOpen}T00:00:00-04:00`,
    endsAt: `${MILESTONES.votingClose}T23:59:59-05:00`,
    displayOrder: 2,
  },
  {
    key: 'anticipation' as const,
    label: 'Industry Review & Anticipation',
    startsAt: '2026-12-01T00:00:00-05:00',
    endsAt: '2027-01-08T23:59:59-05:00',
    displayOrder: 3,
  },
  {
    key: 'finalists' as const,
    label: 'Finalists & Live Shows',
    startsAt: '2027-01-09T00:00:00-05:00',
    endsAt: '2027-02-07T23:59:59-05:00',
    displayOrder: 4,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool, { schema });

  console.log('Seeding...');

  // -------------------------------------------------------------------------
  // Environment-seeded administrator account
  // -------------------------------------------------------------------------
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set together');
  }
  if (adminEmail && adminPassword) {
    if (adminPassword.length < PASSWORD_MIN_LENGTH && process.env.NODE_ENV === 'production') {
      throw new Error(`ADMIN_SEED_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (adminPassword.length < PASSWORD_MIN_LENGTH) {
      console.warn(
        `  warning: development admin password is shorter than the ${PASSWORD_MIN_LENGTH}-character production minimum`,
      );
    }
    const normalized = normalizeEmail(adminEmail);
    if (!normalized.ok) throw new Error('ADMIN_SEED_EMAIL is invalid');

    const existing = await db.query.users.findFirst({
      where: (users, { eq: equals }) => equals(users.emailCanonical, normalized.canonical),
    });
    const userId = existing?.id ?? randomUUID();
    const passwordHash = await hashPassword(adminPassword);

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(schema.users)
          .set({
            email: normalized.raw,
            emailRaw: normalized.raw,
            emailCanonical: normalized.canonical,
            name: process.env.ADMIN_SEED_NAME || existing.name || 'Competition Administrator',
            role: 'admin',
            adminAccessLevel: 'super',
            adminPasswordSetAt: new Date(),
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, userId));
      } else {
        await tx.insert(schema.users).values({
          id: userId,
          email: normalized.raw,
          emailRaw: normalized.raw,
          emailCanonical: normalized.canonical,
          name: process.env.ADMIN_SEED_NAME || 'Competition Administrator',
          role: 'admin',
          adminAccessLevel: 'super',
          adminPasswordSetAt: new Date(),
          emailVerified: true,
        });
      }

      await tx
        .insert(schema.accounts)
        .values({
          id: randomUUID(),
          userId,
          accountId: userId,
          providerId: 'credential',
          password: passwordHash,
        })
        .onConflictDoUpdate({
          target: [schema.accounts.providerId, schema.accounts.accountId],
          set: { password: passwordHash, updatedAt: new Date() },
        });
    });
    console.log(`  admin account: ${normalized.raw}`);
  } else {
    console.log('  admin account: skipped (ADMIN_SEED_EMAIL not set)');
  }

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
  // Editable campaign timeline
  // -------------------------------------------------------------------------
  for (const phase of PHASE_SEEDS) {
    await db
      .insert(schema.competitionPhases)
      .values({
        id: randomUUID(),
        key: phase.key,
        label: phase.label,
        startsAt: new Date(phase.startsAt),
        endsAt: new Date(phase.endsAt),
        displayOrder: phase.displayOrder,
      })
      .onConflictDoUpdate({
        target: schema.competitionPhases.key,
        set: {
          label: phase.label,
          startsAt: new Date(phase.startsAt),
          endsAt: new Date(phase.endsAt),
          displayOrder: phase.displayOrder,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`  campaign phases: ${PHASE_SEEDS.length}`);

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
  await db
    .insert(schema.settings)
    .values({
      key: 'competition:stage',
      value: 'applications',
      description: 'Live competition phase for landing and artist dashboards',
    })
    .onConflictDoNothing({ target: schema.settings.key });
  await db
    .insert(schema.settings)
    .values({
      key: 'competition:stage_override',
      value: 'auto',
      description: 'Manual phase override; auto follows the campaign timeline',
    })
    .onConflictDoNothing({ target: schema.settings.key });
  console.log(`  feature flags: ${Object.keys(FEATURE_FLAG_DEFAULTS).length}`);

  // -------------------------------------------------------------------------
  // Remove sample applications created by older development seeds. New seeds
  // never manufacture users or applications; those records must come through
  // the real artist workflow.
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    console.log('Production detected: skipping sample data.');
    await pool.end();
    return;
  }

  const legacyEmails = LEGACY_SAMPLE_ACT_NAMES.map((name) => `${slugify(name)}@example.test`);
  const removed = await db
    .delete(schema.users)
    .where(inArray(schema.users.emailCanonical, legacyEmails))
    .returning({ id: schema.users.id });
  console.log(`  legacy sample artists + applications removed: ${removed.length}`);
  console.log('Seed complete.');

  await pool.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
