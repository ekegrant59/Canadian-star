ALTER TABLE "applications" ADD COLUMN "pending_edits" jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "pending_edits_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "pending_edits_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "pending_edits_reviewed_by" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "placement" text DEFAULT 'bottom' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_pending_edits_reviewed_by_users_id_fk" FOREIGN KEY ("pending_edits_reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
