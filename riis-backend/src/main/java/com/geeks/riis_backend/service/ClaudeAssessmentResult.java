package com.geeks.riis_backend.service;

import java.util.List;


public record ClaudeAssessmentResult(
        boolean success,
        Integer overallScore,
        List<CriterionScoreDTO> criteria,
        List<String> flags,
        String summary,
        String failureReason
) {


    public static ClaudeAssessmentResult success(
            Integer overallScore, List<CriterionScoreDTO> criteria, List<String> flags, String summary) {
        return new ClaudeAssessmentResult(true, overallScore, criteria, flags, summary, null);
    }

    public static ClaudeAssessmentResult failure(String failureReason) {
        return new ClaudeAssessmentResult(false, null, null, null, null, failureReason);
    }
}

/**
 * Typed, fail-closed result of a single call to {@code POST /ai/claude/review}
 * via {@link AIProxyService#computeClaudeAssessment(String, String)}.
 *
 * {@code riis-ai}'s endpoint always answers with HTTP 200 and a discriminated
 * body ({@code status: "SUCCESS" | "FAILED"}) rather than an HTTP error code
 * for logical failures (missing API key, malformed model output, etc). This
 * record normalizes that — plus any transport-level failure (timeout,
 * connection refused, 5xx) surfaced through the {@code AIProxyService}
 * circuit-breaker fallback — into a single typed outcome so
 * {@code ClaudeReviewService} never has to distinguish "empty" from "failed".
 *
 * On failure, every score/content field is {@code null} — callers must
 * check {@link #success()} before reading them.
 */