ALTER TABLE "votes" ADD COLUMN "ip_prefix_hash" text;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "verification_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "votes_ip_prefix_hash_idx" ON "votes" USING btree ("ip_prefix_hash");