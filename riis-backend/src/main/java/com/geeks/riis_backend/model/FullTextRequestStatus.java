package com.geeks.riis_backend.model;

import com.geeks.riis_backend.exception.BadRequestException;

/** State of a "Request full text" submission. Stored in full_text_requests.status. */
public enum FullTextRequestStatus {
    PENDING("Pending"),
    APPROVED("Approved"),
    DECLINED("Declined");

    private final String label;

    FullTextRequestStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static FullTextRequestStatus fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Status is required.");
        }
        String normalized = raw.trim().toUpperCase();
        // TEMPORARY rollout helper (requirement 9): FULFILLED was renamed to APPROVED.
        // A browser tab still running the old frontend keeps sending "FULFILLED" until it is
        // refreshed, so we map it to APPROVED instead of returning a 400. Delete these two
        // lines once the new frontend has been live for a few days.
        if ("FULFILLED".equals(normalized)) {
            return APPROVED;
        }
        try {
            return FullTextRequestStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status '" + raw.trim()
                    + "'. Allowed values: PENDING, APPROVED, DECLINED.");
        }
    }
}