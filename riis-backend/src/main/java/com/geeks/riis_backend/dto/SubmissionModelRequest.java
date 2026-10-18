package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** note is the basis of the decision (meeting, memo, agreement). Required so the audit trail says why. */
public record SubmissionModelRequest(
        @NotBlank(message = "Submission model is required.") String model,
        @NotBlank(message = "A note recording the basis of this decision is required.")
        @Size(max = 1000, message = "Note must be 1000 characters or fewer.") String note) {}