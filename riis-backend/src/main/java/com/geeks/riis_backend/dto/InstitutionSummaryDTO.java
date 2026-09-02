package com.geeks.riis_backend.dto;

import java.util.List;

public record InstitutionSummaryDTO(
        String id,
        String name,
        String type,
        String province,
        String emailDomain,
        String whitelistStatus,
        long approvedOutputCount,
        List<ThemeKeywordDTO> themeKeywords
) {}