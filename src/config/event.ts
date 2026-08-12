/**
 * Single source of truth for event identity, dates, and feature flags.
 *
 * §17 of the proposal flags the event name and domain as unconfirmed pending a
 * trademark search. Every user-facing reference to the name reads from here, so
 * a rename is a one-line change rather than a find-and-replace.
 *
 * Rule: one setting, one scope. Anything the client will plausibly want to
 * change without a deploy belongs in the database (see `settings` table and
 * `content_blocks`), not here. This file holds what is structural.
 */

export const EVENT = {
  /** Working title (§17, unconfirmed pending trademark search). */
  name: 'The Next Great Canadian Country Star Competition',
  shortName: 'Canadian Country Star',
  tagline: 'Ontario country music, live and unsigned.',

  organizer: 'Hellion Entertainment',

  venue: {
    name: 'The Venue',
    city: 'Peterborough',
    province: 'Ontario',
    country: 'CA',
  },
} as const;

/**
 * The five competition dates (§3). All Saturdays, January 9 to February 6, 2027.
 * Stored as ISO date strings; the `shows` table is the operational record and
 * these seed it.
 */
export const SHOW_DATES = [
  { key: 'qualifier-1', label: 'Qualifying Show 1', date: '2027-01-09', type: 'qualifier' },
  { key: 'qualifier-2', label: 'Qualifying Show 2', date: '2027-01-16', type: 'qualifier' },
  { key: 'qualifier-3', label: 'Qualifying Show 3', date: '2027-01-23', type: 'qualifier' },
  { key: 'qualifier-4', label: 'Qualifying Show 4', date: '2027-01-30', type: 'qualifier' },
  { key: 'grand-final', label: 'Grand Final', date: '2027-02-06', type: 'final' },
] as const;

/**
 * Campaign milestones (§19). Used for countdowns and for deciding which
 * surface is live. These are dates the client may move, so the admin-editable
 * `settings` table overrides them at runtime; these are the defaults.
 */
export const MILESTONES = {
  /** Public campaign launch (§12.2). */
  campaignLaunch: '2026-09-07',
  /** Artist applications open (§19). */
  applicationsOpen: '2026-09-07',
  /** Applications close before fan voting (§19). */
  applicationsClose: '2026-10-31',
  /** Fan voting window (§19, November 2026). */
  votingOpen: '2026-11-01',
  votingClose: '2026-11-30',
  /** Final 16 announced (§4.5). */
  finalistsAnnounced: '2026-12-01',
} as const;

/**
 * Performance format, settled in §18 and §5.1. Rendered on the rules page and
 * enforced in the application form.
 */
export const FORMAT = {
  songsPerPerformance: 4,
  maxPerformanceMinutes: 20,
  originalSongsQualifier: 1,
  originalSongsFinal: 2,
  artistsPerQualifier: 4,
  finalistCount: 16,
  /** Fan vote reduces the applicant pool to this range (§4.3). */
  shortlistMin: 25,
  shortlistMax: 30,
  /** §18: decided that no entry fee is required. */
  entryFee: null,
} as const;

/**
 * Feature flags. Defaults here; the `settings` table overrides at runtime so
 * the client can flip them from admin without a deploy.
 *
 * TIP_JAR_ENABLED defaults OFF deliberately. §7 states the tip jar "should not
 * be implemented until the financial, ethical and judging implications are
 * clearly defined" and warns it may advantage artists with wealthier support
 * networks. The scoring math must stay correct with it disabled.
 */
export const FEATURE_FLAG_DEFAULTS = {
  COMING_SOON_MODE: true,
  APPLICATIONS_OPEN: false,
  VOTING_OPEN: false,
  LIVE_VOTING_OPEN: false,
  TIP_JAR_ENABLED: false,
  RESULTS_PUBLISHED: false,
  SHOW_LIVE_VOTE_COUNTS: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAG_DEFAULTS;

/**
 * Scoring component weights (§7). Seeded into `scoring_weights`, which is the
 * operational source of truth and is admin-editable. Never read these
 * constants when computing a result: read the table.
 */
export const DEFAULT_SCORING_WEIGHTS = [
  { component: 'judge_sponsor', label: 'Sponsor Judge', weight: 20 },
  { component: 'judge_artist', label: 'Artist Judge', weight: 20 },
  { component: 'judge_radio', label: 'Radio / Industry Judge', weight: 20 },
  { component: 'judge_promoter', label: 'Promoter / Venue Judge', weight: 20 },
  { component: 'live_fan_vote', label: 'Live Fan Vote', weight: 10 },
  { component: 'tip_jar', label: 'Tip Jar', weight: 10 },
] as const;

/**
 * The nine industry review criteria (§4.4). Seeded into `scoring_criteria`,
 * which is admin-editable.
 */
export const DEFAULT_SCORING_CRITERIA = [
  { key: 'vocal_ability', label: 'Vocal ability' },
  { key: 'musicianship', label: 'Musicianship' },
  { key: 'stage_presence', label: 'Stage presence' },
  { key: 'originality', label: 'Originality' },
  { key: 'commercial_potential', label: 'Commercial potential' },
  { key: 'song_selection', label: 'Song selection' },
  { key: 'professional_readiness', label: 'Professional readiness' },
  { key: 'audience_engagement', label: 'Audience engagement' },
  { key: 'material_quality', label: 'Quality of submitted material' },
] as const;
