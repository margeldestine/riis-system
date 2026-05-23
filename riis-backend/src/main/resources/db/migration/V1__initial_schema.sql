CREATE EXTENSION IF NOT EXISTS vector;

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. CORE TABLES        (institutions, users)
CREATE TABLE IF NOT EXISTS institutions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL,
  province VARCHAR(64) NOT NULL,
  email_domain VARCHAR(255) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  whitelist_status VARCHAR(16) NOT NULL,
  registered_by VARCHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_institutions_type CHECK (type IN ('SUC', 'PRIVATE', 'LUC')),
  CONSTRAINT chk_institutions_whitelist_status CHECK (whitelist_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT uq_institutions_email_domain UNIQUE (email_domain)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  institution_id VARCHAR(36),
  department VARCHAR(255),
  position VARCHAR(255),
  employee_id VARCHAR(64),
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_role CHECK (role IN ('SUPER_ADMIN', 'DOST_ADMIN', 'HEI_STAFF')),
  CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED', 'PENDING_PASSWORD_RESET')),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT fk_users_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

ALTER TABLE institutions
  ADD CONSTRAINT fk_institutions_registered_by
  FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2. AUTH TABLES        (refresh_tokens, registration_attempts)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registration_attempts (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  email_domain VARCHAR(255) NOT NULL,
  institution_id VARCHAR(36),
  outcome VARCHAR(64) NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_registration_attempts_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

-- 3. RESEARCH OUTPUT    (research_outputs, authors, validation_logs)
CREATE TABLE IF NOT EXISTS research_outputs (
  id VARCHAR(36) PRIMARY KEY,
  reference_number VARCHAR(64) NOT NULL,
  institution_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  research_type VARCHAR(32) NOT NULL,
  funding_source VARCHAR(255),
  publication_venue VARCHAR(255),
  completion_year INTEGER,
  abstract_text TEXT,
  keywords TEXT,
  subject_dc TEXT,
  coverage_dc TEXT,
  rights_dc TEXT,
  contributor_dc TEXT,
  format_dc TEXT,
  language_dc TEXT,
  relation_dc TEXT,
  source_dc TEXT,
  publisher_dc TEXT,
  identifier_dc TEXT,
  doi VARCHAR(255),
  s3_pdf_key VARCHAR(1024),
  status VARCHAR(32) NOT NULL,
  correction_notes TEXT,
  reviewed_by VARCHAR(36),
  reviewed_at TIMESTAMP,
  specter_embedding VECTOR(768),
  sbert_embedding VECTOR(768),
  cluster_id VARCHAR(36),
  cluster_assigned_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_research_outputs_status CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_CORRECTION', 'ARCHIVED')),
  CONSTRAINT chk_research_outputs_research_type CHECK (research_type IN ('JOURNAL_ARTICLE', 'CONFERENCE_PAPER', 'FUNDED_PROJECT', 'INNOVATION_OUTPUT', 'IP_REGISTRATION')),
  CONSTRAINT uq_research_outputs_reference_number UNIQUE (reference_number),
  CONSTRAINT fk_research_outputs_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_research_outputs_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS authors (
  id VARCHAR(36) PRIMARY KEY,
  research_output_id VARCHAR(36) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  orcid_id VARCHAR(32),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_authors_research_output FOREIGN KEY (research_output_id) REFERENCES research_outputs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS validation_logs (
  id VARCHAR(36) PRIMARY KEY,
  research_output_id VARCHAR(36) NOT NULL,
  institution_id VARCHAR(36) NOT NULL,
  validated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  passed BOOLEAN NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors_json JSONB,
  triggered_by VARCHAR(16) NOT NULL,
  has_warnings BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_validation_logs_triggered_by CHECK (triggered_by IN ('INITIAL_SUBMIT', 'RESUBMIT')),
  CONSTRAINT fk_validation_logs_research_output FOREIGN KEY (research_output_id) REFERENCES research_outputs(id) ON DELETE CASCADE,
  CONSTRAINT fk_validation_logs_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 4. AI & CLUSTERS      (clusters, research_output_clusters, unclassified_records, ai_processing_queue)
CREATE TABLE IF NOT EXISTS clusters (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) NOT NULL,
  vocabulary_json JSONB,
  centroid_vector VECTOR(768),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_clusters_slug UNIQUE (slug)
);

ALTER TABLE research_outputs
  ADD CONSTRAINT fk_research_outputs_cluster
  FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS research_output_clusters (
  id VARCHAR(36) PRIMARY KEY,
  research_output_id VARCHAR(36) NOT NULL,
  cluster_id VARCHAR(36) NOT NULL,
  assignment_score DOUBLE PRECISION,
  signal_scores_json JSONB,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_research_output_clusters_one_cluster_per_output UNIQUE (research_output_id),
  CONSTRAINT fk_research_output_clusters_research_output FOREIGN KEY (research_output_id) REFERENCES research_outputs(id) ON DELETE CASCADE,
  CONSTRAINT fk_research_output_clusters_cluster FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS unclassified_records (
  id VARCHAR(36) PRIMARY KEY,
  research_output_id VARCHAR(36) NOT NULL,
  max_score_reached DOUBLE PRECISION,
  flagged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_unclassified_records_research_output UNIQUE (research_output_id),
  CONSTRAINT fk_unclassified_records_research_output FOREIGN KEY (research_output_id) REFERENCES research_outputs(id) ON DELETE CASCADE,
  CONSTRAINT fk_unclassified_records_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_processing_queue (
  id VARCHAR(36) PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  task_type VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ai_processing_queue_task_type CHECK (task_type IN ('KEYBERT', 'SBERT_EMBED', 'SPECTER_EMBED', 'CLUSTER')),
  CONSTRAINT chk_ai_processing_queue_status CHECK (status IN ('PENDING', 'PROCESSING', 'FAILED', 'COMPLETE')),
  CONSTRAINT fk_ai_processing_queue_record FOREIGN KEY (record_id) REFERENCES research_outputs(id) ON DELETE CASCADE
);

-- 5. THEME & OVERLAP    (theme_profiles, theme_keywords, overlap_alerts)
CREATE TABLE IF NOT EXISTS theme_profiles (
  id VARCHAR(36) PRIMARY KEY,
  institution_id VARCHAR(36) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_theme_profiles_institution UNIQUE (institution_id),
  CONSTRAINT fk_theme_profiles_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS theme_keywords (
  id VARCHAR(36) PRIMARY KEY,
  theme_profile_id VARCHAR(36) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_theme_keywords_profile_keyword UNIQUE (theme_profile_id, keyword),
  CONSTRAINT fk_theme_keywords_profile FOREIGN KEY (theme_profile_id) REFERENCES theme_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS overlap_alerts (
  id VARCHAR(36) PRIMARY KEY,
  new_record_id VARCHAR(36) NOT NULL,
  existing_record_id VARCHAR(36) NOT NULL,
  similarity_score DOUBLE PRECISION NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_overlap_alerts_distinct CHECK (new_record_id <> existing_record_id),
  CONSTRAINT uq_overlap_alerts_pair UNIQUE (new_record_id, existing_record_id),
  CONSTRAINT fk_overlap_alerts_new_record FOREIGN KEY (new_record_id) REFERENCES research_outputs(id) ON DELETE CASCADE,
  CONSTRAINT fk_overlap_alerts_existing_record FOREIGN KEY (existing_record_id) REFERENCES research_outputs(id) ON DELETE CASCADE
);

-- 6. ADMIN & AUDIT      (admin_actions, audit_log, report_jobs)
CREATE TABLE IF NOT EXISTS admin_actions (
  id VARCHAR(36) PRIMARY KEY,
  institution_id VARCHAR(36) NOT NULL,
  admin_user_id VARCHAR(36),
  action_type VARCHAR(64) NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_actions_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_actions_admin_user FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36),
  action_type VARCHAR(64) NOT NULL,
  target_type VARCHAR(64),
  target_id VARCHAR(36),
  comment TEXT,
  metadata_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_log_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS report_jobs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36),
  status VARCHAR(32) NOT NULL,
  filters_json JSONB,
  output_format VARCHAR(32) NOT NULL,
  s3_key VARCHAR(1024),
  download_url TEXT,
  record_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT fk_report_jobs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. ANALYTICS          (search_logs, collaboration_edges)
CREATE TABLE IF NOT EXISTS search_logs (
  id VARCHAR(36) PRIMARY KEY,
  query_hash VARCHAR(128) NOT NULL,
  search_mode VARCHAR(32) NOT NULL,
  filter_json JSONB,
  result_count INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER NOT NULL,
  was_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  searched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaboration_edges (
  id VARCHAR(36) PRIMARY KEY,
  source_hei_id VARCHAR(36) NOT NULL,
  target_hei_id VARCHAR(36) NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0,
  edge_type VARCHAR(32) NOT NULL,
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_collaboration_edges_distinct CHECK (source_hei_id <> target_hei_id),
  CONSTRAINT uq_collaboration_edges_edge UNIQUE (source_hei_id, target_hei_id, edge_type),
  CONSTRAINT fk_collaboration_edges_source FOREIGN KEY (source_hei_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_collaboration_edges_target FOREIGN KEY (target_hei_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_research_outputs_institution_id ON research_outputs(institution_id);
CREATE INDEX IF NOT EXISTS idx_research_outputs_status ON research_outputs(status);
CREATE INDEX IF NOT EXISTS idx_research_outputs_completion_year ON research_outputs(completion_year);

CREATE INDEX IF NOT EXISTS idx_authors_research_output_id ON authors(research_output_id);

CREATE INDEX IF NOT EXISTS idx_validation_logs_institution_id ON validation_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_research_output_id ON validation_logs(research_output_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_token_hash ON refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_institution_id ON registration_attempts(institution_id);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_domain ON registration_attempts(email_domain);

CREATE INDEX IF NOT EXISTS idx_research_output_clusters_cluster_id ON research_output_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_queue_status_next_retry ON ai_processing_queue(status, next_retry);
CREATE INDEX IF NOT EXISTS idx_overlap_alerts_detected_at ON overlap_alerts(detected_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON search_logs(searched_at);

CREATE INDEX IF NOT EXISTS idx_collaboration_edges_source ON collaboration_edges(source_hei_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_edges_target ON collaboration_edges(target_hei_id);

CREATE INDEX ON research_outputs USING hnsw (specter_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX ON research_outputs USING hnsw (sbert_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 9. MATERIALIZED VIEWS
CREATE MATERIALIZED VIEW mv_analytics_trend AS
SELECT
  ro.institution_id,
  ro.research_type,
  ro.completion_year AS year,
  COUNT(*) AS output_count
FROM research_outputs ro
WHERE ro.status = 'APPROVED' AND ro.completion_year IS NOT NULL
GROUP BY ro.institution_id, ro.research_type, ro.completion_year;

CREATE MATERIALIZED VIEW mv_hei_comparison AS
SELECT
  ro.institution_id,
  COUNT(*) AS approved_output_count
FROM research_outputs ro
WHERE ro.status = 'APPROVED'
GROUP BY ro.institution_id;

CREATE MATERIALIZED VIEW mv_cluster_distribution AS
SELECT
  c.id AS cluster_id,
  c.name AS cluster_name,
  COUNT(roc.research_output_id) AS approved_output_count
FROM clusters c
LEFT JOIN research_output_clusters roc ON roc.cluster_id = c.id
LEFT JOIN research_outputs ro ON ro.id = roc.research_output_id AND ro.status = 'APPROVED'
GROUP BY c.id, c.name;

CREATE MATERIALIZED VIEW mv_heatmap_matrix AS
SELECT
  tp.institution_id,
  tk.keyword,
  COUNT(ro.id) AS approved_output_count
FROM theme_profiles tp
JOIN theme_keywords tk ON tk.theme_profile_id = tp.id
LEFT JOIN research_outputs ro
  ON ro.institution_id = tp.institution_id
 AND ro.status = 'APPROVED'
 AND (
   ro.keywords ILIKE '%' || tk.keyword || '%'
   OR ro.title ILIKE '%' || tk.keyword || '%'
   OR ro.abstract_text ILIKE '%' || tk.keyword || '%'
 )
GROUP BY tp.institution_id, tk.keyword;
