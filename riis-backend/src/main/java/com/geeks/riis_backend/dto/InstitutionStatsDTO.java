package com.geeks.riis_backend.dto;

import java.util.Map;

public record InstitutionStatsDTO(
        int totalApprovedOutputs,
        int totalUniqueAuthors,
        long totalCitations,
        Map<String, Integer> researchTypeDistribution
) {}