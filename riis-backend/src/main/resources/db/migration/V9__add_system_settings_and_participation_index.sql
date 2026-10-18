-- V9: Stakeholder value transparency and participation tracking (Refactoring Priority 3)
--
--   * system_settings: small key/value table for DOST-level policy decisions.
--     First use: submission_model (MANDATORY | VOLUNTARY). The note records the basis
--     of the decision (for example the meeting or memo it came from).
--   * VARCHAR + CHECK, same convention as V7 and V8.
--   * updated_by is ON DELETE SET NULL, like audit_log.actor_id.
--   * Index for the participation query (ACTIVE HEIs grouped by province).

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key   VARCHAR(64)  PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    note          TEXT,
    updated_by    VARCHAR(36),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_system_settings_submission_model
        CHECK (setting_key <> 'submission_model' OR setting_value IN ('MANDATORY', 'VOLUNTARY')),
    CONSTRAINT fk_system_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO system_settings (setting_key, setting_value, note)
VALUES ('submission_model', 'VOLUNTARY',
        'Initial value. Mandatory vs. voluntary submission is still an open question with DOST Region VII.')
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_institutions_whitelist_province
    ON institutions (whitelist_status, province);