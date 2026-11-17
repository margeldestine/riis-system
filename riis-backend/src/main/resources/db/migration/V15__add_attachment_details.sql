-- V15: Store details of the uploaded PDF so the record page can show a
-- "Documents" summary: file name, type, size (requirement 2).
--
-- WHY store them instead of asking S3 on every page view: a HEAD request to S3
-- per record view is slow and costs money. We save the values once at
-- submission time (and backfill old records from Java in Step 6).
--
-- WHY language_dc is NOT added here: it already exists on research_outputs
-- since V1 (language_dc TEXT). Step 6 only starts collecting it in the form.
ALTER TABLE research_outputs
    ADD COLUMN IF NOT EXISTS attachment_file_name    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_content_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS attachment_size_bytes   BIGINT;

ALTER TABLE research_outputs
    DROP CONSTRAINT IF EXISTS chk_research_outputs_attachment_size;
ALTER TABLE research_outputs
    ADD CONSTRAINT chk_research_outputs_attachment_size
        CHECK (attachment_size_bytes IS NULL OR attachment_size_bytes >= 0);
