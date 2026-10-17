package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record OverlapMatchDTO(
        String alertId,
        String existingRecordId,
        String existingRecordTitle,
        String existingRecordHei,
        double similarityScore,
        boolean notificationSent,
        String status,
        String statusLabel,
        String dispositionNotes,
        String reviewedByName,
        LocalDateTime reviewedAt
) {}
