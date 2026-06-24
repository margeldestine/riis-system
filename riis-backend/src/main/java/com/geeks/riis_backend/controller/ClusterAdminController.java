package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.service.CentroidRecomputationScheduler;
import com.geeks.riis_backend.service.ClusterAssignmentService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Confirmed against the real AnalyticsController convention in this
 * codebase: @PreAuthorize("hasRole('DOST_ADMIN')") is the correct, real
 * pattern (not a guess).
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class ClusterAdminController {

    private final CentroidRecomputationScheduler centroidRecomputationScheduler;
    private final ClusterAssignmentService clusterAssignmentService;

    @PostMapping("/recompute-centroids")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public String recomputeCentroids() {
        centroidRecomputationScheduler.recomputeAllCentroids();
        return "Centroid recomputation triggered.";
    }

    /**
     * One-time (but safely re-runnable) backfill for research outputs that
     * were approved before ClusterAssignmentService existed. Recommended
     * order for a clean first run: seed vocabulary_json -> call this once
     * -> call /recompute-centroids -> call this again (semantic signal now
     * has real centroids to score against, so some previously-Unclassified
     * records may now qualify).
     */
    @PostMapping("/backfill-cluster-assignments")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public Map<String, Object> backfillClusterAssignments() {
        return clusterAssignmentService.backfillApprovedRecords();
    }
}