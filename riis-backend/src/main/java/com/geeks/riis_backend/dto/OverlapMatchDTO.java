package com.geeks.riis_backend.dto;

public record OverlapMatchDTO(
        String alertId,
        String existingRecordId,
        String existingRecordTitle,
        String existingRecordHei,
        double similarityScore,
        boolean notificationSent
) {}