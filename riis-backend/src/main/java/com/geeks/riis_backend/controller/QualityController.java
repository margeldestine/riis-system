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
import com.geeks.riis_backend.repository.QualityQueryRepository;
import java.time.LocalDateTime;
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

    private final QualityQueryRepository qualityQueryRepository;
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

        List<OverlapRow> rows = qualityQueryRepository.overlapRows(minScore, statusFilter).stream()
                .map(OverlapRow::of)
                .collect(Collectors.toList());

        Map<String, List<OverlapRow>> groupedByNewRecord = rows.stream()
                .collect(Collectors.groupingBy(OverlapRow::newId, LinkedHashMap::new, Collectors.toList()));

        List<OverlapAlertGroupDTO> result = groupedByNewRecord.values().stream()
                .map(group -> {
                    OverlapRow first = group.get(0);
                    List<OverlapMatchDTO> matches = group.stream()
                            .map(OverlapRow::toMatchDto)
                            .collect(Collectors.toList());
                    return new OverlapAlertGroupDTO(
                            first.newId(),
                            first.newRef(),
                            first.newTitle(),
                            first.newHei() != null ? first.newHei() : "Unknown",
                            first.detectedAt(),
                            matches
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** One flag row from QualityQueryRepository.overlapRows (column order documented there). */
    private record OverlapRow(String alertId, double score, LocalDateTime detectedAt,
                              boolean notificationSent, SimilarityDispositionStatus status,
                              String notes, LocalDateTime reviewedAt, String reviewer,
                              String newId, String newRef, String newTitle, String newHei,
                              String existingId, String existingTitle, String existingHei) {

        static OverlapRow of(Object[] r) {
            return new OverlapRow(
                    (String) r[0], ((Number) r[1]).doubleValue(), (LocalDateTime) r[2],
                    (Boolean) r[3], (SimilarityDispositionStatus) r[4],
                    (String) r[5], (LocalDateTime) r[6], (String) r[7],
                    (String) r[8], (String) r[9], (String) r[10], (String) r[11],
                    (String) r[12], (String) r[13], (String) r[14]);
        }

        OverlapMatchDTO toMatchDto() {
            SimilarityDispositionStatus s = status == null ? SimilarityDispositionStatus.OPEN : status;
            return new OverlapMatchDTO(
                    alertId, existingId, existingTitle,
                    existingHei != null ? existingHei : "Unknown",
                    score, notificationSent, s.name(), s.getLabel(), notes, reviewer, reviewedAt);
        }
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