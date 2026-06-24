package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(analyticsService.getSummary());
    }

    @GetMapping("/trend")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTrend() {
        return ResponseEntity.ok(analyticsService.getTrend());
    }

    @GetMapping("/type-distribution")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTypeDistribution() {
        return ResponseEntity.ok(analyticsService.getTypeDistribution());
    }

    @GetMapping("/hei-comparison")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getHeiComparison() {
        return ResponseEntity.ok(analyticsService.getHeiComparison());
    }

    @GetMapping("/province-summary")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getProvinceSummary() {
        return ResponseEntity.ok(analyticsService.getProvinceSummary());
    }

    @GetMapping("/heatmap")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getHeatmap() {
        return ResponseEntity.ok(analyticsService.getHeatmap());
    }

    // Still exists, unchanged — top-10-region-wide-KeyBERT-theme matrix.
    // No longer consumed by the frontend's ThematicDensityHeatmap (see
    // AnalyticsService.getHeatmapMatrix() comment for why it's left in
    // place rather than removed).
    @GetMapping("/heatmap-matrix")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getHeatmapMatrix() {
        return ResponseEntity.ok(analyticsService.getHeatmapMatrix());
    }

    // GET /api/v1/analytics/cluster-heatmap
    // NEW — institution x 5-S&T-cluster matrix, real output counts (not
    // keyword counts), backing the redesigned ThematicDensityHeatmap.
    @GetMapping("/cluster-heatmap")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Object>> getClusterHeatmap() {
        return ResponseEntity.ok(analyticsService.getClusterHeatmap());
    }
}