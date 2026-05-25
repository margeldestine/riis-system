package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.ReportResultDTO;
import com.geeks.riis_backend.model.ReportJob;
import com.geeks.riis_backend.repository.ReportJobRepository;
import com.geeks.riis_backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.geeks.riis_backend.dto.ReportRequestDTO;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportJobRepository reportJobRepository;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyAuthority('ROLE_DOST_ADMIN', 'DOST_ADMIN', 'ROLE_HEI_STAFF', 'HEI_STAFF')")
    public ResponseEntity<ReportResultDTO> generate(
            @RequestBody ReportRequestDTO request,
            Authentication authentication
    ) {
        String actorId = authentication.getName();
        List<?> filtered = reportService.buildFilteredDataset(request);

        if (filtered.size() <= 100) {
            ReportResultDTO result = reportService.generateSynchronous(request, actorId);
            return ResponseEntity.ok(result);
        }

        ReportJob job = ReportJob.builder()
                .status("PENDING")
                .outputFormat(request.outputFormat())
                .build();
        reportJobRepository.save(job);
        reportService.generateAsync(request, actorId, job.getId());
        return ResponseEntity.accepted().body(
                new ReportResultDTO(job.getId(), "PENDING", null, null, null, null)
        );
    }

    @GetMapping("/{jobId}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_DOST_ADMIN', 'DOST_ADMIN', 'ROLE_HEI_STAFF', 'HEI_STAFF')")
    public ResponseEntity<ReportResultDTO> getStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(reportService.getStatus(jobId));
    }
}