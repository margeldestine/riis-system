package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.QualityReview;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.QualityReviewRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Async orchestration for the Claude holistic quality-review pipeline,
 * following the same {@code PENDING -> PROCESSING -> COMPLETE / FAILED}
 * pattern as {@code ReportService.generateAsync}.
 *
 * Strictly additive: this service only ever creates/updates rows in
 * {@code quality_reviews}. It never reads or writes
 * {@code research_outputs.status} and never makes or influences any
 * approval/award decision — Claude's output here is an aid for a human
 * admin (see {@code QualityReview.adminDecision}), never a final decision.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaudeReviewService {

    // Kept in lockstep with RUBRIC_VERSION in
    // riis-ai/rubric/quality_rubric.py -- this is the value actually
    // persisted on new quality_reviews rows whenever a caller doesn't
    // specify a rubric_version explicitly (every review run through the
    // normal admin UI). If the two drift, riis-ai logs a spurious rubric
    // mismatch warning on every single review even though nothing is
    // actually wrong.
    private static final String DEFAULT_RUBRIC_VERSION = "v1.0.0";

    /** The only values a DOST_ADMIN reviewer may record — deliberately never an award/approval value. */
    private static final Set<String> VALID_DECISIONS = Set.of("AGREE", "OVERRIDE", "NEEDS_MORE_INFO");

    private final QualityReviewRepository qualityReviewRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final UserRepository userRepository;
    private final PdfTextExtractionService pdfTextExtractionService;
    private final AIProxyService aiProxyService;
    private final ObjectMapper objectMapper;

    /**
     * Creates the initial {@code PENDING} {@link QualityReview} row
     * synchronously so the controller has an id/status to return in its
     * {@code 202 Accepted} response before the async work in
     * {@link #runReview(String)} even starts.
     */
    @Transactional
    public QualityReview initializeReview(String researchOutputId, String rubricVersion) {
        ResearchOutput researchOutput = researchOutputRepository.findById(researchOutputId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Research output not found: " + researchOutputId));

        QualityReview review = QualityReview.builder()
                .researchOutput(researchOutput)
                .rubricVersion(rubricVersion != null && !rubricVersion.isBlank()
                        ? rubricVersion : DEFAULT_RUBRIC_VERSION)
                .status("PENDING")
                .build();

        return qualityReviewRepository.save(review);
    }

    /**
     * The actual async pipeline: PENDING -> PROCESSING -> COMPLETE / FAILED.
     * Every exit point other than full success saves a populated
     * {@code failure_reason} — this method never leaves a review row
     * silently stuck in {@code PROCESSING}.
     */
    @Async
    @Transactional
    public void runReview(String reviewId) {
        QualityReview review = qualityReviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            log.error("QualityReview {} was not found when async processing started.", reviewId);
            return;
        }

        review.setStatus("PROCESSING");
        qualityReviewRepository.save(review);

        ResearchOutput researchOutput = review.getResearchOutput();

        // Step 1: fail-closed PDF text extraction.
        PdfExtractionResult extraction = pdfTextExtractionService.extractText(researchOutput);
        if (!extraction.isSuccess()) {
            log.warn("PDF extraction failed for research output {} (review {}): {}",
                    researchOutput.getId(), reviewId, extraction.failureReason());
            review.setStatus("FAILED");
            review.setFailureReason("PDF extraction failed: " + extraction.failureReason());
            qualityReviewRepository.save(review);
            return;
        }

        // Step 2: fail-closed Claude holistic assessment.
        ClaudeAssessmentResult assessment = aiProxyService.computeClaudeAssessment(
                extraction.extractedText(), review.getRubricVersion());

        if (!assessment.success()) {
            log.warn("Claude assessment failed for research output {} (review {}): {}",
                    researchOutput.getId(), reviewId, assessment.failureReason());
            review.setStatus("FAILED");
            review.setFailureReason("Claude review failed: " + assessment.failureReason());
            qualityReviewRepository.save(review);
            return;
        }

        // Step 3: success — populate scoring fields and mark COMPLETE.
        review.setOverallScore(assessment.overallScore());
        review.setCriteriaJson(objectMapper.valueToTree(assessment.criteria()));
        review.setFlagsJson(objectMapper.valueToTree(assessment.flags()));
        review.setSummary(assessment.summary());
        review.setStatus("COMPLETE");
        qualityReviewRepository.save(review);
    }

    /**
     * Records a human DOST_ADMIN's read on a completed Claude assessment.
     * Never touches {@code research_outputs.status} — this is purely an
     * annotation on the {@code quality_reviews} row itself.
     */
    @Transactional
    public QualityReview recordDecision(String reviewId, String decision, String notes, String adminUserId) {
        QualityReview review = qualityReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Quality review not found: " + reviewId));

        if (decision == null || !VALID_DECISIONS.contains(decision)) {
            throw new BadRequestException(
                    "Invalid admin decision: " + decision + ". Must be one of AGREE, OVERRIDE, NEEDS_MORE_INFO.");
        }

        if ("OVERRIDE".equals(decision) && (notes == null || notes.isBlank())) {
            throw new BadRequestException("Admin notes are required when overriding an assessment.");
        }

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + adminUserId));

        review.setReviewedByAdmin(adminUser);
        review.setAdminDecision(decision);
        review.setAdminNotes(notes);
        review.setReviewedAt(LocalDateTime.now());

        return qualityReviewRepository.save(review);
    }

    /**
     * Regenerates a review for the same research output as {@code reviewId}.
     * Inserts a brand-new {@code QualityReview} row via the existing
     * {@link #initializeReview} + {@link #runReview} pipeline — prior rows
     * (including any recorded {@code adminDecision}) are never overwritten
     * or mutated, preserving the full audit trail.
     */
    @Transactional
    public QualityReview regenerateReview(String reviewId) {
        QualityReview existing = qualityReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Quality review not found: " + reviewId));

        String researchOutputId = existing.getResearchOutput().getId();

        QualityReview newReview = initializeReview(researchOutputId, DEFAULT_RUBRIC_VERSION);
        runReview(newReview.getId());

        return newReview;
    }
}