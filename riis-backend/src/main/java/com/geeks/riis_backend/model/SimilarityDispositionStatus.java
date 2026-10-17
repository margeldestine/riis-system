// riis-backend/src/main/java/com/geeks/riis_backend/model/SimilarityDispositionStatus.java
package com.geeks.riis_backend.model;

import com.geeks.riis_backend.exception.BadRequestException;

/**
 * Review state of a similarity flag (overlap alert). Stored as its enum name in
 * overlap_alerts.status (VARCHAR + CHECK constraint, see V7).
 *
 * The similarity signal itself stays advisory and non-binding: these states record
 * what a DOST administrator decided to do about a flag; they never block or
 * unpublish a research output.
 */
public enum SimilarityDispositionStatus {
    OPEN("Open"),
    REVIEWED_NO_ISSUE("Reviewed - no issue"),
    REFERRED_FOR_COLLABORATION("Referred for collaboration"),
    ESCALATED_TO_RESEARCH_OFFICE("Escalated to research office");

    private final String label;

    SimilarityDispositionStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** Case-insensitive parse; unknown values become a 400 instead of an IllegalArgumentException/500. */
    public static SimilarityDispositionStatus fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Status is required.");
        }
        try {
            return SimilarityDispositionStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status '" + raw.trim() + "'. Allowed values: OPEN, "
                    + "REVIEWED_NO_ISSUE, REFERRED_FOR_COLLABORATION, ESCALATED_TO_RESEARCH_OFFICE.");
        }
    }
}