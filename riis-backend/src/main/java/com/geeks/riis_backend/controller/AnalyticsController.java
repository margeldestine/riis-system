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

    // DAS-036/037/038: all five params are optional. yearFrom/yearTo together
    // act as the date-range filter (DAS-038); province/institutionId/type
    // back the Province, HEI and Type dropdowns (DAS-036). Applied together
    // when the frontend's "Apply Filters" button is clicked (DAS-037).
    @GetMapping("/summary")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getSummary(yearFrom, yearTo, province, institutionId, type));
    }

    @GetMapping("/trend")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTrend(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getTrend(yearFrom, yearTo, province, institutionId, type));
    }

    @GetMapping("/type-distribution")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTypeDistribution(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getTypeDistribution(yearFrom, yearTo, province, institutionId, type));
    }

    @GetMapping("/hei-comparison")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getHeiComparison(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getHeiComparison(yearFrom, yearTo, province, institutionId, type));
    }

    @GetMapping("/province-summary")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getProvinceSummary(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getProvinceSummary(yearFrom, yearTo, institutionId, type));
    }

    // DAS-039-filters: Province/HEI only — Year and Type don't apply here
    // (see AnalyticsService.getHeatmap() for why).
    @GetMapping("/heatmap")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getHeatmap(
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId) {
        return ResponseEntity.ok(analyticsService.getHeatmap(province, institutionId));
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
    // Institution x 5-S&T-cluster matrix, real output counts, backing the
    // redesigned ThematicDensityHeatmap.
    // DAS-039-filters: Year/Province/HEI only — no Type param (scope decision).
    @GetMapping("/cluster-heatmap")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Object>> getClusterHeatmap(
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String institutionId) {
        return ResponseEntity.ok(analyticsService.getClusterHeatmap(yearFrom, yearTo, province, institutionId));
    }
}