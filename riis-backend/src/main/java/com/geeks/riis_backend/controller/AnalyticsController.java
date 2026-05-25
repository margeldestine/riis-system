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

}