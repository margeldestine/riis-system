package com.geeks.riis_backend.dto;

import java.util.Map;

public record ReportStatsDTO(
        int totalRecords,
        int uniqueAuthors,
        int uniqueInstitutions,
        Map<String, Long> byResearchType,
        Map<String, Long> byYear,
        Map<String, Long> byFundingSource,
        Map<String, Long> byInstitution
) {}