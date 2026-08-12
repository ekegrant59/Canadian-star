-- Append-only audit log.
--
-- An audit log an admin can edit is not evidence. §11 of the proposal makes
-- vote integrity a named accountability, and this table is how a challenge to a
-- result gets answered. Blocking UPDATE and DELETE at the database means a
-- compromised application account cannot rewrite history.
--
-- Enforced with triggers rather than role grants so the protection holds
-- regardless of which role the app connects as (Coolify provisions the database
-- user, and we do not control that grant from here).

CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
--> statement-breakpoint

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
--> statement-breakpoint

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
--> statement-breakpoint

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
--> statement-breakpoint

-- Consent records are the CASL defence and carry the same rule: the burden of
-- proving consent is on the sender, so the history must be immutable. A
-- withdrawal is a NEW row, never an update to an existing one.
CREATE OR REPLACE FUNCTION email_consents_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'email_consents is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS email_consents_no_update ON email_consents;
--> statement-breakpoint

CREATE TRIGGER email_consents_no_update
  BEFORE UPDATE ON email_consents
  FOR EACH ROW EXECUTE FUNCTION email_consents_immutable();
--> statement-breakpoint

DROP TRIGGER IF EXISTS email_consents_no_delete ON email_consents;
--> statement-breakpoint

CREATE TRIGGER email_consents_no_delete
  BEFORE DELETE ON email_consents
  FOR EACH ROW EXECUTE FUNCTION email_consents_immutable();
