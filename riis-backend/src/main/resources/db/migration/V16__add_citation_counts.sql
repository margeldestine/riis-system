-- V16: Worldwide citation counts from OpenAlex (requirement 1).
--
-- WHY citation_count is nullable: NULL means "not available" (no DOI, or not
-- checked yet). 0 means "checked, and nobody has cited it". Showing 0 for
-- records without a DOI would wrongly say "never cited".
--
-- citation_source records where the number came from (for example 'openalex'
-- or 'manual'), because different services report different counts for the
-- same paper. citation_checked_at powers the "as of <date>" label.
ALTER TABLE research_outputs
    ADD COLUMN IF NOT EXISTS citation_count      INTEGER,
    ADD COLUMN IF NOT EXISTS citation_source     VARCHAR(32),
    ADD COLUMN IF NOT EXISTS citation_checked_at TIMESTAMP;

ALTER TABLE research_outputs
    DROP CONSTRAINT IF EXISTS chk_research_outputs_citation_count;
ALTER TABLE research_outputs
    ADD CONSTRAINT chk_research_outputs_citation_count
        CHECK (citation_count IS NULL OR citation_count >= 0);

-- WHY this index: the scheduled job looks records up by DOI in batches. DOIs are
-- case-insensitive, so we index lower(doi). Partial index = smaller and faster,
-- since most capstones and theses have no DOI.
CREATE INDEX IF NOT EXISTS idx_research_outputs_doi_lower
    ON research_outputs (lower(doi))
    WHERE doi IS NOT NULL;

-- WHY this index: supports an optional "most cited" sort in public search.
-- Limited to APPROVED records, because only those appear publicly.
CREATE INDEX IF NOT EXISTS idx_research_outputs_citation_count
    ON research_outputs (citation_count DESC NULLS LAST)
    WHERE status = 'APPROVED';
