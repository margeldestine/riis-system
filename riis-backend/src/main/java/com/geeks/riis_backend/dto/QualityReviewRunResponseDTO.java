package com.geeks.riis_backend.dto;

/**
 * Response body for {@code POST /api/v1/admin/quality-reviews/{researchOutputId}/run}.
 * Returned immediately with {@code status = "PENDING"} — the actual review
 * work happens asynchronously in {@code ClaudeReviewService.runReview}.
 */
public record QualityReviewRunResponseDTO(String reviewId, String status) {}