package com.geeks.riis_backend.model;

import com.geeks.riis_backend.exception.BadRequestException;

/** State of a "Request full text" submission. Stored in full_text_requests.status. */
public enum FullTextRequestStatus {
    PENDING("Pending"),
    FULFILLED("Fulfilled"),
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
        try {
            return FullTextRequestStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status '" + raw.trim()
                    + "'. Allowed values: PENDING, FULFILLED, DECLINED.");
        }
    }
}