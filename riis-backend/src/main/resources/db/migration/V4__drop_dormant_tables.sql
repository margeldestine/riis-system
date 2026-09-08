-- V4__drop_dormant_tables.sql
--
-- Technical debt cleanup: drops tables for entities/features that were
-- scaffolded early in development but never wired into the application,
-- or were superseded before launch. Matching JPA entities and repository
-- interfaces have already been removed from the codebase (see
-- AdminAction, AiProcessingQueueItem, SearchLog).
--
-- Note: as of this migration, admin_actions, ai_processing_queue, and
-- search_logs were already absent from the production database (never
-- fully applied, per the drift noted in V2's comments). clusters,
-- research_output_clusters, and unclassified_records were never
-- implemented as JPA entities at all. IF EXISTS is used throughout so
-- this migration is a safe no-op wherever a table is already gone, while
-- still correctly cleaning up any environment where it does exist.

DROP TABLE IF EXISTS admin_actions;
DROP TABLE IF EXISTS ai_processing_queue;
DROP TABLE IF EXISTS search_logs;
DROP TABLE IF EXISTS unclassified_records;
-- research_output_clusters has mv_cluster_distribution (V2) depending on
-- it; both are empty/unused, so CASCADE removes the view along with the
-- table in one step.
DROP TABLE IF EXISTS research_output_clusters CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;