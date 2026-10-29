package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record ReportPreviewRowDTO(
        String id,
        String referenceNumber,
        String title,
        String researchType,
        String fundingSource,
        Integer completionYear,
        LocalDateTime submittedAt,
        LocalDateTime updatedAt,
        String status,
        String institutionId,
        String institutionName,
        String authorNames,
        String subject
) {}