package com.geeks.riis_backend.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.geeks.riis_backend.model.QualityReview;
import java.time.LocalDateTime;

public record QualityReviewDTO(
        String id,
        String researchOutputId,
        String rubricVersion,
        Integer overallScore,
        JsonNode criteria,
        JsonNode flags,
        String summary,
        String status,
        String failureReason,
        String reviewedByAdminId,
        String adminDecision,
        String adminNotes,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {

    public static QualityReviewDTO from(QualityReview review) {
        return new QualityReviewDTO(
                review.getId(),
                review.getResearchOutput() != null ? review.getResearchOutput().getId() : null,
                review.getRubricVersion(),
                review.getOverallScore(),
                review.getCriteriaJson(),
                review.getFlagsJson(),
                review.getSummary(),
                review.getStatus(),
                review.getFailureReason(),
                review.getReviewedByAdmin() != null ? review.getReviewedByAdmin().getId() : null,
                review.getAdminDecision(),
                review.getAdminNotes(),
                review.getCreatedAt(),
                review.getReviewedAt()
        );
    }
}