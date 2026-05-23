package com.geeks.riis_backend.dto;

public record InstitutionSummaryDTO(
        String id,
        String name,
        String type,
        String province,
        String contactEmail,
        int approvedOutputCount
) {}