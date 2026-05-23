package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.service.AdminReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/submissions")
@RequiredArgsConstructor
public class AdminReviewController {

    private final AdminReviewService adminReviewService;

    @GetMapping
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Page<SubmissionSummaryDTO>> listSubmissions(
            @RequestParam(defaultValue = "PENDING_REVIEW") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String institutionId,
            @RequestParam(required = false) String researchType
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminReviewService.listSubmissions(status, institutionId, researchType, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<SubmissionDetailDTO> getSubmission(@PathVariable String id) {
        return ResponseEntity.ok(adminReviewService.getSubmissionDetail(id));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(adminReviewService.getStatusStats());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Void> actionSubmission(
            @PathVariable String id,
            @RequestBody ReviewActionRequest body,
            Authentication authentication
    ) {
        String adminUserId = authentication.getName();
        adminReviewService.actionSubmission(id, body.action(), body.comment(), adminUserId);
        return ResponseEntity.ok().build();
    }

    public record ReviewActionRequest(String action, String comment) {}
}