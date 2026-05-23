package com.geeks.riis_backend.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record InstitutionProfileDTO(
        String id,
        String name,
        String type,
        String province,
        String contactEmail,
        InstitutionStatsDTO stats,
        Page<PublicOutputCardDTO> outputs,
        List<ThemeKeywordDTO> themeKeywords
) {}