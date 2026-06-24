-- V3__add_unique_index_mv_cluster_distribution.sql
-- mv_cluster_distribution currently has no indexes at all, but
-- REFRESH MATERIALIZED VIEW CONCURRENTLY (called by
-- ClusterRepository.refreshClusterDistributionView()) requires at least
-- one UNIQUE index on the view to function. cluster_id is unique per row
-- since the view's underlying query is GROUP BY c.id, c.name.

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_cluster_distribution_cluster_id
    ON mv_cluster_distribution (cluster_id);