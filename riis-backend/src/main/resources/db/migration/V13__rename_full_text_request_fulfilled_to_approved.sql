-- V13: Rename the full-text request status FULFILLED to APPROVED (requirement 9).
--
-- WHY the order matters: the old CHECK constraint only allows FULFILLED. If we
-- updated the rows first, the UPDATE would violate the constraint. So we:
--   1) drop the old constraint,
--   2) rewrite existing rows,
--   3) add the new constraint.
-- All three run in one transaction, so there is no moment where the table has
-- no rule or half-converted data.

ALTER TABLE full_text_requests
DROP CONSTRAINT IF EXISTS chk_full_text_requests_status;

UPDATE full_text_requests
SET status = 'APPROVED'
WHERE status = 'FULFILLED';

ALTER TABLE full_text_requests
    ADD CONSTRAINT chk_full_text_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED'));

-- NOTE: audit_log metadata written before this migration still contains the
-- text "FULFILLED". That is history, so we leave it unchanged.