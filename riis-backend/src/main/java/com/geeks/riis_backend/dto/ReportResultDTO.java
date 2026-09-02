package com.geeks.riis_backend.dto;

import java.time.Instant;

public record ReportResultDTO(
        String jobId,
        String status,
        String downloadUrl,
        String filename,
        Integer recordCount,
        Instant generatedAt
) {}