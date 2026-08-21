import { pgTable, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { competitionStageEnum } from './enums';

/** Editable campaign timeline. Phase status is derived from these windows. */
export const competitionPhases = pgTable(
  'competition_phases',
  {
    id: text('id').primaryKey(),
    key: competitionStageEnum('key').notNull(),
    label: text('label').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('competition_phases_key_idx').on(table.key),
    index('competition_phases_window_idx').on(table.startsAt, table.endsAt),
  ],
);
