package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for {@code POST /api/v1/admin/quality-reviews/{id}/decision}.
 *
 * {@code adminDecision} is validated against the allowed set (AGREE,
 * OVERRIDE, NEEDS_MORE_INFO) in {@code ClaudeReviewService.recordDecision} —
 * never an award/approval value, and never anything that touches
 * {@code research_outputs.status}.
 */
public record QualityReviewDecisionDTO(
        @NotBlank(message = "adminDecision is required") String adminDecision,
        String adminNotes
) {}