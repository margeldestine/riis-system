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
            @RequestParam(defaultValue = "APPROVED") String status,
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

    // DAS-047: returns a temporary signed download URL for the submission's
    // uploaded PDF (via s3PdfKey), or a 204 No Content when no file is on
    // record, so the frontend can show "No file uploaded" instead of a
    // broken link.
    @GetMapping("/{id}/file-url")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Map<String, String>> getFileDownloadUrl(@PathVariable String id) {
        String url = adminReviewService.getFileDownloadUrl(id);
        if (url == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(Map.of("url", url));
    }

    // DAS-043: PATCH /{id}/status (Approve / Requires Correction / Reject)
    // was removed per Sir Ralph's feedback — only registered, verified HEI
    // staff accounts can submit, so submissions are already trusted at the
    // account level and now auto-publish on creation. This controller is
    // now read-only, for DOST Admins to monitor/audit what's been submitted.
}