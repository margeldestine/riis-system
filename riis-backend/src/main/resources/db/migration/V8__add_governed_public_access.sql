-- riis-backend/src/main/resources/db/migration/V8__add_governed_public_access.sql
-- V8: Governed, tiered public access (Refactoring Priority 1)
--
--   * institutions.default_visibility: the visibility pre-selected on that HEI's
--     new submissions. Default PUBLIC.
--   * research_outputs.visibility: per-record tier. NOT NULL DEFAULT 'PUBLIC'
--     back-fills every existing record in one step (same as today's public view)
--     and keeps any code path that forgets to set it valid.
--   * VARCHAR + CHECK instead of native PG ENUM, same convention as V7.
--   * full_text_requests: "Request full text" submissions routed to the owning HEI
--     research office. DASIG never attaches or serves the PDF; the HEI replies
--     directly and marks the outcome here.

-- 1. Institution-level default
ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS default_visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE institutions DROP CONSTRAINT IF EXISTS chk_institutions_default_visibility;
ALTER TABLE institutions
    ADD CONSTRAINT chk_institutions_default_visibility
        CHECK (default_visibility IN ('PUBLIC', 'METADATA_ONLY', 'RESTRICTED'));

-- 2. Record-level visibility
ALTER TABLE research_outputs
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE research_outputs DROP CONSTRAINT IF EXISTS chk_research_outputs_visibility;
ALTER TABLE research_outputs
    ADD CONSTRAINT chk_research_outputs_visibility
        CHECK (visibility IN ('PUBLIC', 'METADATA_ONLY', 'RESTRICTED'));

-- Public search filters on status + visibility.
CREATE INDEX IF NOT EXISTS idx_research_outputs_status_visibility
    ON research_outputs (status, visibility);

-- 3. Full-text requests
CREATE TABLE IF NOT EXISTS full_text_requests (
                                                  id                    VARCHAR(36)  PRIMARY KEY,
    research_output_id    VARCHAR(36)  NOT NULL,
    institution_id        VARCHAR(36)  NOT NULL,   -- denormalized owner HEI, for the research-office inbox
    requester_name        VARCHAR(255) NOT NULL,
    requester_email       VARCHAR(320) NOT NULL,
    requester_affiliation VARCHAR(255),
    purpose               TEXT         NOT NULL,
    status                VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    handled_by            VARCHAR(36),
    handled_at            TIMESTAMP,
    handler_note          TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_full_text_requests_status
    CHECK (status IN ('PENDING', 'FULFILLED', 'DECLINED')),
    CONSTRAINT fk_full_text_requests_output
    FOREIGN KEY (research_output_id) REFERENCES research_outputs(id) ON DELETE CASCADE,
    CONSTRAINT fk_full_text_requests_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    CONSTRAINT fk_full_text_requests_handled_by
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
    );

-- Research-office inbox: "pending requests for my HEI, newest first".
CREATE INDEX IF NOT EXISTS idx_full_text_requests_inst_status_created
    ON full_text_requests (institution_id, status, created_at DESC);

-- Duplicate-request check (same person, same record).
CREATE INDEX IF NOT EXISTS idx_full_text_requests_output_email
    ON full_text_requests (research_output_id, requester_email);