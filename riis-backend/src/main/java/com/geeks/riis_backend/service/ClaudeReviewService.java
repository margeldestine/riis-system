package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.QualityReview;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.QualityReviewRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
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

    private static final String DEFAULT_RUBRIC_VERSION = "v1-tentative";

    private final QualityReviewRepository qualityReviewRepository;
    private final ResearchOutputRepository researchOutputRepository;
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
}