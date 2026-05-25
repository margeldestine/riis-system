package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.OverlapAlertDTO;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.ValidationLog;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.OverlapAlertRepository;
import com.geeks.riis_backend.repository.ValidationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/quality")
@RequiredArgsConstructor
public class QualityController {

    private final OverlapAlertRepository overlapAlertRepository;
    private final ValidationLogRepository validationLogRepository;
    private final InstitutionRepository institutionRepository;

    @GetMapping("/overlaps")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<OverlapAlertDTO>> getOverlapAlerts(
            @RequestParam(defaultValue = "0.80") double minScore) {

        List<OverlapAlert> alerts = overlapAlertRepository.findAll();

        List<OverlapAlertDTO> result = alerts.stream()
                .filter(a -> a.getSimilarityScore() >= minScore)
                .map(a -> new OverlapAlertDTO(
                        a.getId(),
                        a.getNewRecord().getId(),
                        a.getNewRecord().getTitle(),
                        a.getNewRecord().getInstitution() != null ?
                                a.getNewRecord().getInstitution().getName() : "Unknown",
                        a.getExistingRecord().getId(),
                        a.getExistingRecord().getTitle(),
                        a.getExistingRecord().getInstitution() != null ?
                                a.getExistingRecord().getInstitution().getName() : "Unknown",
                        a.getSimilarityScore(),
                        a.getDetectedAt(),
                        a.isNotificationSent()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getQualityMetrics() {
        List<Institution> institutions = institutionRepository.findAll();
        List<Map<String, Object>> metrics = new ArrayList<>();

        for (Institution inst : institutions) {
            long total = validationLogRepository.countByInstitutionId(inst.getId());
            long passed = validationLogRepository.countPassedByInstitutionId(inst.getId());
            List<ValidationLog> failed = validationLogRepository
                    .findFailedByInstitutionId(inst.getId());

            double completenessRate = total > 0 ? (double) passed / total * 100 : 0;

            Map<String, Integer> errorFrequency = new HashMap<>();
            for (ValidationLog log : failed) {
                if (log.getErrorsJson() != null) {
                    log.getErrorsJson().fields().forEachRemaining(entry ->
                            errorFrequency.merge(entry.getKey(), 1, Integer::sum));
                }
            }

            Map<String, Object> metric = new HashMap<>();
            metric.put("institutionId", inst.getId());
            metric.put("institutionName", inst.getName());
            metric.put("completenessRate", Math.round(completenessRate));
            metric.put("totalSubmissions", total);
            metric.put("totalErrors", failed.size());
            metric.put("errorFrequency", errorFrequency);
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