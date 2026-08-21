ALTER TABLE "users" ADD COLUMN "admin_invitation_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_invitation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_password_set_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users"
SET "admin_password_set_at" = COALESCE("admin_password_set_at", "created_at")
WHERE "role" = 'admin';
