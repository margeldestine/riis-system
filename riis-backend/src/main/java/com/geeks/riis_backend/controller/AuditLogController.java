package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.AuditLogEntryDTO;
import com.geeks.riis_backend.service.AuditLogService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// UC-M5-05: GET /api/v1/admin/audit-log -- paginated, filterable by date
// range, actor, and action type. Reads from AuditLogEntryRepository via
// AuditLogService, the same shared audit-writing service every other
// admin action in this gap set writes through.
@RestController
@RequestMapping("/api/v1/admin/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Page<AuditLogEntryDTO>> getAuditLog(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        LocalDateTime from = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime to = dateTo != null ? LocalDateTime.of(dateTo, LocalTime.MAX) : null;

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(auditLogService.search(from, to, actorId, actionType, pageable));
    }
}