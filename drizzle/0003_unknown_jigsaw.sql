CREATE TYPE "public"."competition_stage" AS ENUM('applications', 'voting', 'anticipation', 'finalists');--> statement-breakpoint
ALTER TABLE "two_factors" ADD COLUMN "verified" boolean;--> statement-breakpoint
UPDATE "two_factors" SET "verified" = true;--> statement-breakpoint
ALTER TABLE "two_factors" ALTER COLUMN "verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "two_factors" ALTER COLUMN "verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factors" ADD COLUMN "failed_verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factors" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "competition_stage" "competition_stage" DEFAULT 'applications' NOT NULL;
