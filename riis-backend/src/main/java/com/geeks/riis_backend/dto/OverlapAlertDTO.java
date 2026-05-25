package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record OverlapAlertDTO(
        String id,
        String newRecordId,
        String newRecordReferenceNumber,
        String newRecordTitle,
        String newRecordHei,
        String existingRecordId,
        String existingRecordTitle,
        String existingRecordHei,
        double similarityScore,
        LocalDateTime detectedAt,
        boolean notificationSent
) {}