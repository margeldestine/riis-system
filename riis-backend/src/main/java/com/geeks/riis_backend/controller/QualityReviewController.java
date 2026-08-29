package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.QualityReviewDTO;
import com.geeks.riis_backend.dto.QualityReviewRunResponseDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.QualityReview;
import com.geeks.riis_backend.repository.QualityReviewRepository;
import com.geeks.riis_backend.service.ClaudeReviewService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only endpoints for triggering and reading Claude holistic quality
 * reviews of research output PDFs.
 *
 * Strictly additive: nothing here reads or writes
 * {@code research_outputs.status}, and there is no approval/award decision
 * made anywhere in this controller — it only ever creates or reads
 * {@code quality_reviews} rows.
 */
@RestController
@RequestMapping("/api/v1/admin/quality-reviews")
@PreAuthorize("hasRole('DOST_ADMIN')")
@RequiredArgsConstructor
public class QualityReviewController {

    private final ClaudeReviewService claudeReviewService;
    private final QualityReviewRepository qualityReviewRepository;

    /**
     * Initializes a PENDING QualityReview row and kicks off async
     * processing in {@link ClaudeReviewService#runReview(String)}.
     * Returns immediately with 202 Accepted — poll GET .../{researchOutputId}
     * for the result.
     */
    @PostMapping("/{researchOutputId}/run")
    public ResponseEntity<QualityReviewRunResponseDTO> runReview(
            @PathVariable String researchOutputId,
            @RequestBody(required = false) Map<String, String> body) {

        String rubricVersion = body != null ? body.get("rubric_version") : null;

        QualityReview review = claudeReviewService.initializeReview(researchOutputId, rubricVersion);
        claudeReviewService.runReview(review.getId());

        return ResponseEntity.accepted()
                .body(new QualityReviewRunResponseDTO(review.getId(), review.getStatus()));
    }

    /**
     * Returns the most recent QualityReview for a research output,
     * regardless of status (PENDING/PROCESSING/COMPLETE/FAILED) — callers
     * poll this to watch a review progress.
     */
    @GetMapping("/{researchOutputId}")
    public ResponseEntity<QualityReviewDTO> getLatestReview(@PathVariable String researchOutputId) {
        QualityReview review = qualityReviewRepository
                .findFirstByResearchOutputIdOrderByCreatedAtDesc(researchOutputId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No quality review found for research output: " + researchOutputId));

        return ResponseEntity.ok(QualityReviewDTO.from(review));
    }
}