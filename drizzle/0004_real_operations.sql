ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'approved' BEFORE 'shortlisted';--> statement-breakpoint
CREATE TYPE "public"."artist_profile_status" AS ENUM('hidden', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "profile_status" "artist_profile_status" DEFAULT 'hidden' NOT NULL;--> statement-breakpoint
UPDATE "artists" SET "profile_status" = CASE WHEN "is_published" THEN 'published'::"artist_profile_status" ELSE 'hidden'::"artist_profile_status" END;--> statement-breakpoint
ALTER TABLE "artists" DROP COLUMN "is_published";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "competition_stage";--> statement-breakpoint
CREATE TABLE "competition_phases" (
	"id" text PRIMARY KEY NOT NULL,
	"key" "competition_stage" NOT NULL,
	"label" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "homepage_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"cta_label" text,
	"cta_url" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "competition_phases" ADD CONSTRAINT "competition_phases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_announcements" ADD CONSTRAINT "homepage_announcements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_phases_key_idx" ON "competition_phases" USING btree ("key");--> statement-breakpoint
CREATE INDEX "competition_phases_window_idx" ON "competition_phases" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "homepage_announcements_published_idx" ON "homepage_announcements" USING btree ("published");--> statement-breakpoint
CREATE INDEX "homepage_announcements_window_idx" ON "homepage_announcements" USING btree ("starts_at","ends_at");
