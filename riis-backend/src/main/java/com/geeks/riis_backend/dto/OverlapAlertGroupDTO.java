package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OverlapAlertGroupDTO(
        String newRecordId,
        String newRecordReferenceNumber,
        String newRecordTitle,
        String newRecordHei,
        LocalDateTime detectedAt,
        List<OverlapMatchDTO> matches
) {}