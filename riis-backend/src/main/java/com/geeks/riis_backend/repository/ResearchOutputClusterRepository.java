package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ResearchOutputCluster;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchOutputClusterRepository extends JpaRepository<ResearchOutputCluster, String> {

    List<ResearchOutputCluster> findByResearchOutputId(String researchOutputId);

    List<ResearchOutputCluster> findByClusterId(String clusterId);

    /**
     * Counts APPROVED research outputs per (institution, cluster) pair —
     * the literal "number of studies per cluster" the heatmap needs, NOT a
     * keyword-occurrence count. COUNT(DISTINCT ...) so a record assigned to
     * 2 clusters still contributes exactly 1 to each of its 2 cluster
     * columns, never double-counted within a single column.
     *
     * DAS-039-filters: Year/Province/HEI are optional (null = no filter on
     * that dimension), backing the Research Concentration Heatmap's filter
     * bar. Type is deliberately NOT a param here — the heatmap's whole
     * x-axis is already the 5 S&T clusters, so a Type filter would just
     * collapse most columns to empty rather than adding useful narrowing.
     */
    @Query(value = "SELECT ro.institution_id AS institutionId, " +
            "c.id AS clusterId, " +
            "c.name AS clusterName, " +
            "COUNT(DISTINCT ro.id) AS outputCount " +
            "FROM research_output_clusters roc " +
            "JOIN research_outputs ro ON ro.id = roc.research_output_id " +
            "JOIN clusters c ON c.id = roc.cluster_id " +
            "JOIN institutions i ON i.id = ro.institution_id " +
            "WHERE ro.status = 'APPROVED' " +
            "AND (:yearFrom IS NULL OR ro.completion_year >= :yearFrom) " +
            "AND (:yearTo IS NULL OR ro.completion_year <= :yearTo) " +
            "AND (:province IS NULL OR i.province = :province) " +
            "AND (:institutionId IS NULL OR ro.institution_id = :institutionId) " +
            "GROUP BY ro.institution_id, c.id, c.name",
            nativeQuery = true)
    List<Object[]> countApprovedOutputsByInstitutionAndCluster(
            @Param("yearFrom") Integer yearFrom,
            @Param("yearTo") Integer yearTo,
            @Param("province") String province,
            @Param("institutionId") String institutionId);
}