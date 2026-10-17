package com.geeks.riis_backend.model;

import com.geeks.riis_backend.exception.BadRequestException;

/**
 * Public visibility tier of a research output. Stored as its enum name in
 * research_outputs.visibility and institutions.default_visibility
 * (VARCHAR + CHECK, see V8).
 *
 * The raw PDF is never exposed publicly under any tier.
 */
public enum AccessVisibility {
    PUBLIC("Public"),
    METADATA_ONLY("Metadata-only"),
    RESTRICTED("Restricted");

    private final String label;

    AccessVisibility(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** PUBLIC only: the abstract may be shown on public pages. */
    public boolean exposesAbstract() {
        return this == PUBLIC;
    }

    /** PUBLIC and METADATA_ONLY: authors, year, type, funding, venue, keywords, DOI. */
    public boolean exposesDescriptiveMetadata() {
        return this != RESTRICTED;
    }

    /** Case-insensitive parse; unknown values become a 400 instead of a 500. */
    public static AccessVisibility fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Visibility is required.");
        }
        try {
            return AccessVisibility.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown visibility '" + raw.trim()
                    + "'. Allowed values: PUBLIC, METADATA_ONLY, RESTRICTED.");
        }
    }
}