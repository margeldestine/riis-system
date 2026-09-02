package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.QualityReviewDTO;
import com.geeks.riis_backend.dto.QualityReviewDecisionDTO;
import com.geeks.riis_backend.dto.QualityReviewRunResponseDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.QualityReview;
import com.geeks.riis_backend.repository.QualityReviewRepository;
import com.geeks.riis_backend.security.KeyedRateLimiter;
import com.geeks.riis_backend.service.ClaudeReviewService;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin-only endpoints for triggering, reading, deciding on, and
 * regenerating Claude holistic quality reviews of research output PDFs.
 *
 * Strictly additive: nothing here reads or writes
 * {@code research_outputs.status}, and there is no approval/award decision
 * made anywhere in this controller -- it only ever creates or reads
 * {@code quality_reviews} rows. This pipeline is strictly advisory for
 * human {@code DOST_ADMIN} reviewers.
 */
@RestController
@RequestMapping("/api/v1/admin/quality-reviews")
@PreAuthorize("hasRole('DOST_ADMIN')")
@RequiredArgsConstructor
public class QualityReviewController {

    private final ClaudeReviewService claudeReviewService;
    private final QualityReviewRepository qualityReviewRepository;
    private final KeyedRateLimiter keyedRateLimiter;

    /**
     * Every real Claude review call has a genuine Anthropic API cost.
     * Bounding this per admin user (10/hour) limits the blast radius of a
     * compromised admin session or a scripted client looping this endpoint
     * -- it does not limit legitimate review volume in normal use.
     */
    private static final int CLAUDE_REVIEW_LIMIT_PER_HOUR = 10;

    /**
     * Initializes a PENDING QualityReview row and kicks off async
     * processing in {@link ClaudeReviewService#runReview(String)}.
     * Returns immediately with 202 Accepted -- poll GET .../{researchOutputId}
     * for the result.
     */
    @PostMapping("/{researchOutputId}/run")
    public ResponseEntity<QualityReviewRunResponseDTO> runReview(
            @PathVariable String researchOutputId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {

        enforceClaudeReviewRateLimit(authentication);

        String rubricVersion = body != null ? body.get("rubric_version") : null;

        QualityReview review = claudeReviewService.initializeReview(researchOutputId, rubricVersion);
        claudeReviewService.runReview(review.getId());

        return ResponseEntity.accepted()
                .body(new QualityReviewRunResponseDTO(review.getId(), review.getStatus()));
    }

    /**
     * Returns the most recent QualityReview for a research output,
     * regardless of status (PENDING/PROCESSING/COMPLETE/FAILED) -- callers
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

    /**
     * Returns the full review history for a research output, newest first --
     * the audit trail across every regeneration and admin decision.
     */
    @GetMapping("/{researchOutputId}/history")
    public ResponseEntity<List<QualityReviewDTO>> getReviewHistory(@PathVariable String researchOutputId) {
        List<QualityReviewDTO> history = qualityReviewRepository
                .findAllByResearchOutputIdOrderByCreatedAtDesc(researchOutputId)
                .stream()
                .map(QualityReviewDTO::from)
                .toList();

        return ResponseEntity.ok(history);
    }

    /**
     * Records a human DOST_ADMIN's decision on a Claude assessment
     * (AGREE / OVERRIDE / NEEDS_MORE_INFO). Never an award/approval action --
     * see {@link ClaudeReviewService#recordDecision}.
     */
    @PostMapping("/{id}/decision")
    public ResponseEntity<QualityReviewDTO> recordDecision(
            @PathVariable String id,
            @Valid @RequestBody QualityReviewDecisionDTO body,
            Authentication authentication) {

        String adminUserId = getAuthenticatedUserId(authentication);
        QualityReview review = claudeReviewService.recordDecision(
                id, body.adminDecision(), body.adminNotes(), adminUserId);

        return ResponseEntity.ok(QualityReviewDTO.from(review));
    }

    /**
     * Triggers an async regeneration: a brand-new QualityReview row for the
     * same research output as {@code id}, leaving all prior rows (and their
     * admin decisions) untouched. Counts against the same per-admin Claude
     * review rate limit as {@link #runReview} -- a regenerate is just as
     * costly as an initial run.
     */
    @PostMapping("/{id}/regenerate")
    public ResponseEntity<QualityReviewRunResponseDTO> regenerateReview(
            @PathVariable String id,
            Authentication authentication) {

        enforceClaudeReviewRateLimit(authentication);

        QualityReview newReview = claudeReviewService.regenerateReview(id);

        return ResponseEntity.accepted()
                .body(new QualityReviewRunResponseDTO(newReview.getId(), newReview.getStatus()));
    }

    private void enforceClaudeReviewRateLimit(Authentication authentication) {
        String adminUserId = getAuthenticatedUserId(authentication);
        boolean allowed = keyedRateLimiter.tryConsume(
                "quality-review-run", adminUserId, CLAUDE_REVIEW_LIMIT_PER_HOUR, Duration.ofHours(1));
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Rate limit exceeded: no more than " + CLAUDE_REVIEW_LIMIT_PER_HOUR
                            + " AI quality reviews per hour per admin.");
        }
    }

    private String getAuthenticatedUserId(Authentication authentication) {
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
}