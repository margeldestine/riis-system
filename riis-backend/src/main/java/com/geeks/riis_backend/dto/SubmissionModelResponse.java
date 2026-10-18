package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record SubmissionModelResponse(
        String model, String label, String note, LocalDateTime updatedAt, boolean changed) {}