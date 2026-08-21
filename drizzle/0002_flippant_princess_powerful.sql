DROP INDEX IF EXISTS "applications_artist_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "artists_user_id_idx";--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "performance_video_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "artists"
SET "performance_video_urls" = jsonb_build_array("performance_video_url")
WHERE "performance_video_url" IS NOT NULL
  AND "performance_video_url" <> ''
  AND "performance_video_urls" = '[]'::jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_key_unique_idx" ON "rate_limits" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_artist_id_idx" ON "applications" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artists_user_id_idx" ON "artists" USING btree ("user_id");
