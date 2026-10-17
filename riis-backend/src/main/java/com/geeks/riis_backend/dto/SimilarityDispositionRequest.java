// riis-backend/src/main/java/com/geeks/riis_backend/dto/SimilarityDispositionRequest.java
package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of PATCH /api/v1/quality/overlaps/{alertId}/disposition.
 *
 * @param status         target status name (see SimilarityDispositionStatus)
 * @param notes          reviewer's rationale; mandatory so the audit trail always says why
 * @param expectedStatus optional: the status the client was looking at. If another admin
 *                       changed the flag meanwhile the server answers 409 instead of
 *                       silently overwriting their decision.
 */
public record SimilarityDispositionRequest(
        @NotBlank(message = "Status is required.")
        String status,

        @NotBlank(message = "A note explaining the decision is required.")
        @Size(min = 5, max = 2000, message = "Notes must be between 5 and 2000 characters.")
        String notes,

        String expectedStatus
) {}