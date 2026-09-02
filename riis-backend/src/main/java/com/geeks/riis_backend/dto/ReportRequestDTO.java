package com.geeks.riis_backend.dto;

import java.util.List;

public record ReportRequestDTO(
        Integer yearFrom,
        Integer yearTo,
        List<String> researchTypes,
        List<String> fundingSources,
        List<String> publicationStatuses,
        String scopeType,
        String institutionId,
        String province,
        String outputFormat
) {}