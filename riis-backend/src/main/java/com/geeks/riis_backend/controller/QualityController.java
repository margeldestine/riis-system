package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.OverlapAlertGroupDTO;
import com.geeks.riis_backend.dto.OverlapMatchDTO;
import com.geeks.riis_backend.dto.SimilarityDispositionHistoryEntryDTO;
import com.geeks.riis_backend.dto.SimilarityDispositionRequest;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.SimilarityDispositionStatus;
import com.geeks.riis_backend.model.ValidationLog;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.OverlapAlertRepository;
import com.geeks.riis_backend.repository.ValidationLogRepository;
import com.geeks.riis_backend.service.SimilarityDispositionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
    private final SimilarityDispositionService similarityDispositionService;

    @GetMapping("/overlaps")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<OverlapAlertGroupDTO>> getOverlapAlerts(
            @RequestParam(defaultValue = "0.80") double minScore,
            @RequestParam(required = false) String status) {

        SimilarityDispositionStatus statusFilter =
                (status == null || status.isBlank()) ? null : SimilarityDispositionStatus.fromString(status);

        List<OverlapAlert> alerts = statusFilter == null
                ? overlapAlertRepository.findBySimilarityScoreGreaterThanEqualOrderByDetectedAtDesc(minScore)
                : overlapAlertRepository.findBySimilarityScoreGreaterThanEqualAndStatusOrderByDetectedAtDesc(
                        minScore, statusFilter);

        Map<String, List<OverlapAlert>> groupedByNewRecord = alerts.stream()
                .collect(Collectors.groupingBy(a -> a.getNewRecord().getId(), LinkedHashMap::new, Collectors.toList()));

        List<OverlapAlertGroupDTO> result = groupedByNewRecord.values().stream()
                .map(group -> {
                    OverlapAlert first = group.get(0);

                    List<OverlapMatchDTO> matches = group.stream()
                            .map(similarityDispositionService::toMatchDto)
                            .collect(Collectors.toList());

                    return new OverlapAlertGroupDTO(
                            first.getNewRecord().getId(),
                            first.getNewRecord().getReferenceNumber(),
                            first.getNewRecord().getTitle(),
                            first.getNewRecord().getInstitution() != null ?
                                    first.getNewRecord().getInstitution().getName() : "Unknown",
                            first.getDetectedAt(),
                            matches
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // Refactoring Priority 2: disposition workflow for similarity flags.
    // Covered by the URL-level rule /api/v1/quality/** (DOST_ADMIN) in SecurityConfig
    // AND by @PreAuthorize here -- two independent layers, same as the rest of this controller.
    @PatchMapping("/overlaps/{alertId}/disposition")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<OverlapMatchDTO> updateDisposition(
            @PathVariable String alertId,
            @Valid @RequestBody SimilarityDispositionRequest request) {
        String actorUserId = getAuthenticatedUserId();
        return ResponseEntity.ok(similarityDispositionService.updateDisposition(alertId, actorUserId, request));
    }

    @GetMapping("/overlaps/{alertId}/history")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<SimilarityDispositionHistoryEntryDTO>> getDispositionHistory(
            @PathVariable String alertId) {
        return ResponseEntity.ok(similarityDispositionService.getHistory(alertId));
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        Object principal = authentication.getPrincipal();
        String userId = principal == null ? null : principal.toString();
        if (userId == null || userId.isBlank() || "anonymousUser".equalsIgnoreCase(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return userId;
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