import { pgEnum } from 'drizzle-orm/pg-core';

/** Roles. Judge and admin sign-in is allowlist-only, never open registration. */
export const userRoleEnum = pgEnum('user_role', ['artist', 'judge', 'industry_reviewer', 'admin']);

/** Application lifecycle (§4.2 through §4.5). */
export const applicationStatusEnum = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'shortlisted',
  'finalist',
  'rejected',
  'withdrawn',
]);

/** §18: both solo artists and bands may apply. */
export const actTypeEnum = pgEnum('act_type', ['solo', 'duo', 'band']);

/**
 * §8 and §9: nobody and nothing is confirmed until written agreement exists.
 * Only `confirmed` renders publicly. Enforced in the query layer.
 */
export const confirmationStatusEnum = pgEnum('confirmation_status', [
  'prospect',
  'contacted',
  'confirmed',
  'declined',
]);

/** The four judge seats (§6). */
export const judgeSeatEnum = pgEnum('judge_seat', [
  'sponsor',
  'artist',
  'radio_industry',
  'promoter_venue',
]);

/** Sponsorship categories (§13). */
export const sponsorTierEnum = pgEnum('sponsor_tier', [
  'presenting',
  'stage',
  'fan_vote',
  'artist_development',
  'recording_studio',
  'photography_video',
  'radio_media',
  'beverage',
  'transportation',
  'hotel',
  'prize',
  'final_night',
]);

/** Show type (§3, §5). */
export const showTypeEnum = pgEnum('show_type', ['qualifier', 'final']);

export const showStatusEnum = pgEnum('show_status', [
  'scheduled',
  'postponed',
  'completed',
  'cancelled',
]);

/**
 * CASL requires distinguishing consent purposes. A vote is not consent to be
 * marketed to (§4.3).
 */
export const consentTypeEnum = pgEnum('consent_type', [
  'voting',
  'marketing',
  'application',
  'privacy_policy',
  'media_release',
  'competition_rules',
]);

/** Voting rounds. Keeps the public round and per-show live votes separate. */
export const voteRoundEnum = pgEnum('vote_round', ['public_shortlist', 'live_show']);

/** Scoring components (§7). Weights live in the scoring_weights table. */
export const scoringComponentEnum = pgEnum('scoring_component', [
  'judge_sponsor',
  'judge_artist',
  'judge_radio',
  'judge_promoter',
  'live_fan_vote',
  'tip_jar',
]);
