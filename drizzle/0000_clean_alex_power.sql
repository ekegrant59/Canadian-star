CREATE TYPE "public"."act_type" AS ENUM('solo', 'duo', 'band');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'shortlisted', 'finalist', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."confirmation_status" AS ENUM('prospect', 'contacted', 'confirmed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('voting', 'marketing', 'application', 'privacy_policy', 'media_release', 'competition_rules');--> statement-breakpoint
CREATE TYPE "public"."judge_seat" AS ENUM('sponsor', 'artist', 'radio_industry', 'promoter_venue');--> statement-breakpoint
CREATE TYPE "public"."scoring_component" AS ENUM('judge_sponsor', 'judge_artist', 'judge_radio', 'judge_promoter', 'live_fan_vote', 'tip_jar');--> statement-breakpoint
CREATE TYPE "public"."show_status" AS ENUM('scheduled', 'postponed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."show_type" AS ENUM('qualifier', 'final');--> statement-breakpoint
CREATE TYPE "public"."sponsor_tier" AS ENUM('presenting', 'stage', 'fan_vote', 'artist_development', 'recording_studio', 'photography_video', 'radio_media', 'beverage', 'transportation', 'hotel', 'prize', 'final_night');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('artist', 'judge', 'industry_reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vote_round" AS ENUM('public_shortlist', 'live_show');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_raw" text NOT NULL,
	"email_canonical" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"role" "user_role" DEFAULT 'artist' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp with time zone,
	"ban_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"is_ontario_resident" boolean,
	"is_of_age" boolean,
	"has_recording_contract" boolean,
	"has_management_contract" boolean,
	"contract_details" text,
	"won_previous_competition" boolean,
	"previous_competition_details" text,
	"available_all_dates" boolean,
	"availability_notes" text,
	"accepted_rules" boolean DEFAULT false NOT NULL,
	"accepted_media_release" boolean DEFAULT false NOT NULL,
	"accepted_privacy_policy" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"review_notes" text,
	"rejection_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"act_name" text NOT NULL,
	"slug" text NOT NULL,
	"act_type" "act_type" NOT NULL,
	"bio" text,
	"location_city" text,
	"location_province" text DEFAULT 'ON',
	"formation_year" integer,
	"member_count" integer,
	"photo_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_photo_key" text,
	"website_url" text,
	"performance_video_url" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"music_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"contact_email" text,
	"contact_phone" text,
	"contact_address" text,
	"management_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_artists" (
	"id" text PRIMARY KEY NOT NULL,
	"show_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"performance_order" integer,
	"advanced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "show_type" NOT NULL,
	"show_date" date NOT NULL,
	"doors_time" text,
	"start_time" text,
	"contingency_date" date,
	"status" "show_status" DEFAULT 'scheduled' NOT NULL,
	"status_note" text,
	"venue_name" text,
	"venue_address" text,
	"ticket_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"email_raw" text NOT NULL,
	"email_canonical" text NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"wording_shown" text NOT NULL,
	"document_version" text,
	"source" text NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email_raw" text NOT NULL,
	"email_canonical" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmation_token_hash" text,
	"confirmation_expires_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_token_hash" text,
	"source" text DEFAULT 'coming_soon' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"round" "vote_round" DEFAULT 'public_shortlist' NOT NULL,
	"show_id" text,
	"email_raw" text NOT NULL,
	"email_canonical" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_token_hash" text,
	"verification_expires_at" timestamp with time zone,
	"ip_hash" text,
	"user_agent_hash" text,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"fraud_signals" text,
	"invalidated_at" timestamp with time zone,
	"invalidated_by" text,
	"invalidation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"reviewer_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"criteria_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" text PRIMARY KEY NOT NULL,
	"judge_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"show_id" text NOT NULL,
	"criteria_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"unlocked_by" text,
	"unlocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"weight" numeric(5, 2) DEFAULT '1' NOT NULL,
	"max_score" integer DEFAULT 10 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_weights" (
	"id" text PRIMARY KEY NOT NULL,
	"component" "scoring_component" NOT NULL,
	"label" text NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tip_jar_totals" (
	"id" text PRIMARY KEY NOT NULL,
	"show_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"counted_by" text NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"entered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text,
	"body" text,
	"published" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"title" text,
	"organization" text,
	"seat" "judge_seat",
	"bio" text,
	"photo_key" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "confirmation_status" DEFAULT 'prospect' NOT NULL,
	"agreement_notes" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prizes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"provider" text,
	"estimated_value" text,
	"status" "confirmation_status" DEFAULT 'prospect' NOT NULL,
	"agreement_notes" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" "sponsor_tier",
	"logo_key" text,
	"website_url" text,
	"description" text,
	"status" "confirmation_status" DEFAULT 'prospect' NOT NULL,
	"agreement_notes" text,
	"requires_age_gate" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_invalidated_by_users_id_fk" FOREIGN KEY ("invalidated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_reviews" ADD CONSTRAINT "industry_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_reviews" ADD CONSTRAINT "industry_reviews_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_judge_id_users_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_unlocked_by_users_id_fk" FOREIGN KEY ("unlocked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_weights" ADD CONSTRAINT "scoring_weights_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_jar_totals" ADD CONSTRAINT "tip_jar_totals_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_jar_totals" ADD CONSTRAINT "tip_jar_totals_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_jar_totals" ADD CONSTRAINT "tip_jar_totals_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judges" ADD CONSTRAINT "judges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_canonical_idx" ON "users" USING btree ("email_canonical");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verifications_expires_at_idx" ON "verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "applications_artist_id_idx" ON "applications" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_submitted_at_idx" ON "applications" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "artists_slug_idx" ON "artists" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "artists_user_id_idx" ON "artists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artists_published_idx" ON "artists" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "artists_location_idx" ON "artists" USING btree ("location_city");--> statement-breakpoint
CREATE UNIQUE INDEX "show_artists_unique_idx" ON "show_artists" USING btree ("show_id","artist_id");--> statement-breakpoint
CREATE INDEX "show_artists_show_id_idx" ON "show_artists" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "show_artists_artist_id_idx" ON "show_artists" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shows_key_idx" ON "shows" USING btree ("key");--> statement-breakpoint
CREATE INDEX "shows_date_idx" ON "shows" USING btree ("show_date");--> statement-breakpoint
CREATE INDEX "email_consents_canonical_idx" ON "email_consents" USING btree ("email_canonical");--> statement-breakpoint
CREATE INDEX "email_consents_type_idx" ON "email_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "email_consents_created_at_idx" ON "email_consents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_at_idx" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_email_canonical_idx" ON "subscribers" USING btree ("email_canonical");--> statement-breakpoint
CREATE INDEX "subscribers_confirmed_idx" ON "subscribers" USING btree ("confirmed");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_public_round_email_idx" ON "votes" USING btree ("email_canonical","round") WHERE "votes"."round" = 'public_shortlist';--> statement-breakpoint
CREATE UNIQUE INDEX "votes_live_show_email_idx" ON "votes" USING btree ("email_canonical","show_id") WHERE "votes"."round" = 'live_show' AND "votes"."show_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "votes_artist_id_idx" ON "votes" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "votes_verified_idx" ON "votes" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "votes_created_at_idx" ON "votes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "votes_ip_hash_idx" ON "votes" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "votes_fraud_score_idx" ON "votes" USING btree ("fraud_score");--> statement-breakpoint
CREATE UNIQUE INDEX "industry_reviews_reviewer_artist_idx" ON "industry_reviews" USING btree ("reviewer_id","artist_id");--> statement-breakpoint
CREATE INDEX "industry_reviews_artist_id_idx" ON "industry_reviews" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_judge_artist_show_idx" ON "scores" USING btree ("judge_id","artist_id","show_id");--> statement-breakpoint
CREATE INDEX "scores_show_id_idx" ON "scores" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "scores_artist_id_idx" ON "scores" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_criteria_key_idx" ON "scoring_criteria" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_weights_component_idx" ON "scoring_weights" USING btree ("component");--> statement-breakpoint
CREATE UNIQUE INDEX "tip_jar_show_artist_idx" ON "tip_jar_totals" USING btree ("show_id","artist_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_key_idx" ON "content_blocks" USING btree ("key");--> statement-breakpoint
CREATE INDEX "judges_status_idx" ON "judges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prizes_status_idx" ON "prizes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sponsors_status_idx" ON "sponsors" USING btree ("status");