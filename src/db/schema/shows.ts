import { pgTable, text, timestamp, integer, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { showTypeEnum, showStatusEnum } from './enums';

/**
 * The five competition events (§3). Seeded from src/config/event.ts.
 *
 * `contingencyDate` exists because §3 requires winter weather planning: the
 * Friday before, the Sunday after, or a designated replacement weekend.
 */
export const shows = pgTable(
  'shows',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    type: showTypeEnum('type').notNull(),

    showDate: date('show_date').notNull(),
    doorsTime: text('doors_time'),
    startTime: text('start_time'),

    /** §3 weather contingency. Null until a postponement is decided. */
    contingencyDate: date('contingency_date'),
    status: showStatusEnum('status').notNull().default('scheduled'),
    statusNote: text('status_note'),

    venueName: text('venue_name'),
    venueAddress: text('venue_address'),

    /** External ticketing provider only. Never a built-in sales flow. */
    ticketUrl: text('ticket_url'),

    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('shows_key_idx').on(table.key),
    index('shows_date_idx').on(table.showDate),
  ],
);

/** Assignment of the final 16 to the four qualifying shows (§4.5). */
export const showArtists = pgTable(
  'show_artists',
  {
    id: text('id').primaryKey(),
    showId: text('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),

    performanceOrder: integer('performance_order'),
    /** Set when this artist advances from a qualifier to the Grand Final. */
    advanced: timestamp('advanced_at', { withTimezone: true }),
    /** Set when this artist wins the Grand Final. Only used on the final show. */
    winnerAt: timestamp('winner_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('show_artists_unique_idx').on(table.showId, table.artistId),
    index('show_artists_show_id_idx').on(table.showId),
    index('show_artists_artist_id_idx').on(table.artistId),
  ],
);
