ALTER TABLE "votes" ADD COLUMN "device_hash" text;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "verification_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "review_decision" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "votes_device_hash_idx" ON "votes" USING btree ("device_hash");