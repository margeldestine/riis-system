CREATE INDEX IF NOT EXISTS idx_institutions_lower_province
    ON institutions (lower(province));

CREATE INDEX IF NOT EXISTS idx_research_outputs_approved_institution
    ON research_outputs (institution_id)
    WHERE status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_research_outputs_approved_type_lower
    ON research_outputs (lower(research_type))
    WHERE status = 'APPROVED';