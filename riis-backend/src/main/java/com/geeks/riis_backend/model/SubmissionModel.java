package com.geeks.riis_backend.model;

import com.geeks.riis_backend.exception.BadRequestException;

/** How HEIs are expected to submit to DASIG. Stored as its name in system_settings. */
public enum SubmissionModel {
    MANDATORY("Mandatory"),
    VOLUNTARY("Voluntary");

    private final String label;

    SubmissionModel(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** Case-insensitive parse; unknown values become a 400 instead of a 500. */
    public static SubmissionModel fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Submission model is required.");
        }
        try {
            return SubmissionModel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown submission model '" + raw.trim()
                    + "'. Allowed values: MANDATORY, VOLUNTARY.");
        }
    }
}