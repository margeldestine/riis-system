CREATE INDEX IF NOT EXISTS idx_research_outputs_status_year_inst
    ON research_outputs (status, completion_year, institution_id);

CREATE INDEX IF NOT EXISTS idx_research_outputs_status_type
    ON research_outputs (status, research_type);

CREATE INDEX IF NOT EXISTS idx_research_outputs_status_subject
    ON research_outputs (status, subject_dc);

CREATE INDEX IF NOT EXISTS idx_validation_logs_inst_passed
    ON validation_logs (institution_id, passed);