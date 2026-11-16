package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ValidationLog;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ValidationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// The Similarity/Overlap endpoints (GET /overlaps, PATCH /overlaps/{id}/disposition,
// GET /overlaps/{id}/history) were removed (requirement 16). Only the data-quality
// metrics endpoints remain. They are still covered by the URL-level rule
// /api/v1/quality/** (DOST_ADMIN) in SecurityConfig AND by @PreAuthorize here.
@RestController
@RequestMapping("/api/v1/quality")
@RequiredArgsConstructor
public class QualityController {

    private final ValidationLogRepository validationLogRepository;
    private final InstitutionRepository institutionRepository;

    @GetMapping("/metrics")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getQualityMetrics() {
        List<Institution> institutions = institutionRepository.findAll();

        Map<String, ValidationLogRepository.InstitutionValidationCounts> counts = new HashMap<>();
        for (ValidationLogRepository.InstitutionValidationCounts c : validationLogRepository.countsByInstitution()) {
            counts.put(c.getInstitutionId(), c);
        }

        Map<String, Map<String, Integer>> errorsByInstitution = new HashMap<>();
        for (ValidationLogRepository.InstitutionErrorFieldCount row
                : validationLogRepository.errorFieldCountsByInstitution()) {
            errorsByInstitution
                    .computeIfAbsent(row.getInstitutionId(), k -> new HashMap<>())
                    .put(row.getField(), row.getCount().intValue());
        }

        List<Map<String, Object>> metrics = new ArrayList<>();
        for (Institution inst : institutions) {
            ValidationLogRepository.InstitutionValidationCounts c = counts.get(inst.getId());
            long total = c == null ? 0 : c.getTotal();
            long passed = c == null ? 0 : c.getPassed();
            long failed = total - passed;

            double completenessRate = total > 0 ? (double) passed / total * 100 : 0;

            Map<String, Object> metric = new HashMap<>();
            metric.put("institutionId", inst.getId());
            metric.put("institutionName", inst.getName());
            metric.put("completenessRate", Math.round(completenessRate));
            metric.put("totalSubmissions", total);
            metric.put("totalErrors", failed);
            metric.put("errorFrequency", errorsByInstitution.getOrDefault(inst.getId(), new HashMap<>()));
            metric.put("province", inst.getProvince());
            metrics.add(metric);
        }

        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/metrics/{institutionId}")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Object>> getInstitutionQualityMetrics(
            @PathVariable String institutionId) {

        List<ValidationLog> logs = validationLogRepository
                .findByInstitutionIdOrderByCreatedAtDesc(institutionId);

        long total = logs.size();
        long passed = logs.stream().filter(ValidationLog::isPassed).count();
        long failed = total - passed;

        double completenessRate = total > 0 ? (double) passed / total * 100 : 0;

        Map<String, Integer> errorFrequency = new HashMap<>();
        for (ValidationLog log : logs) {
            if (!log.isPassed() && log.getErrorsJson() != null) {
                log.getErrorsJson().fields().forEachRemaining(entry ->
                        errorFrequency.merge(entry.getKey(), 1, Integer::sum));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("institutionId", institutionId);
        result.put("totalSubmissions", total);
        result.put("passedValidations", passed);
        result.put("failedValidations", failed);
        result.put("completenessRate", Math.round(completenessRate));
        result.put("errorFrequency", errorFrequency);
        result.put("recentLogs", logs.stream().limit(10).map(log -> {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", log.getId());
            logMap.put("passed", log.isPassed());
            logMap.put("errorCount", log.getErrorCount());
            logMap.put("triggeredBy", log.getTriggeredBy());
            logMap.put("validatedAt", log.getValidatedAt());
            return logMap;
        }).collect(Collectors.toList()));

        return ResponseEntity.ok(result);
    }
}