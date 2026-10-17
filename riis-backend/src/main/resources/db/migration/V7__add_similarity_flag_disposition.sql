-- riis-backend/src/main/resources/db/migration/V7__add_similarity_flag_disposition.sql
-- V7: Similarity Flag disposition workflow (Refactoring Priority 2)
--
-- Adds a review status, reviewer note and "who/when" to overlap_alerts.
--   * status is VARCHAR + CHECK (not a native PG ENUM): adding a status later is a
--     one-line constraint change instead of ALTER TYPE, and it maps directly to
--     @Enumerated(EnumType.STRING) with ddl-auto=validate.
--   * NOT NULL DEFAULT 'OPEN' back-fills every existing alert as Open in one step, so
--     alerts created before this migration (and any code path that forgets to set a
--     status) are valid without a separate UPDATE.
--   * reviewed_by is ON DELETE SET NULL, like audit_log.actor_id: removing a user
--     must never delete or block the flag history.

ALTER TABLE overlap_alerts
    ADD COLUMN IF NOT EXISTS status            VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    ADD COLUMN IF NOT EXISTS disposition_notes TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by       VARCHAR(36),
    ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMP;

ALTER TABLE overlap_alerts DROP CONSTRAINT IF EXISTS chk_overlap_alerts_status;
ALTER TABLE overlap_alerts
    ADD CONSTRAINT chk_overlap_alerts_status
        CHECK (status IN ('OPEN', 'REVIEWED_NO_ISSUE', 'REFERRED_FOR_COLLABORATION', 'ESCALATED_TO_RESEARCH_OFFICE'));

ALTER TABLE overlap_alerts DROP CONSTRAINT IF EXISTS fk_overlap_alerts_reviewed_by;
ALTER TABLE overlap_alerts
    ADD CONSTRAINT fk_overlap_alerts_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Dashboard: "show me Open flags, newest first".
CREATE INDEX IF NOT EXISTS idx_overlap_alerts_status_detected_at
    ON overlap_alerts (status, detected_at DESC);

-- Per-flag review history reads audit_log by (target_type, target_id).
CREATE INDEX IF NOT EXISTS idx_audit_log_target
    ON audit_log (target_type, target_id);