package com.geeks.riis_backend.dto;

import java.util.Map;

public record InstitutionStatsDTO(
        int totalApprovedOutputs,
        int totalUniqueAuthors,
        Map<String, Integer> researchTypeDistribution
) {}