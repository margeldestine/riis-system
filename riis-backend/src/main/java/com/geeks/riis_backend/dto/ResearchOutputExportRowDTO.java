package com.geeks.riis_backend.dto;

import java.util.List;

public record ResearchOutputExportRowDTO(
        String title,
        String researchType,
        Integer completionYear,
        String fundingSource,
        String publicationVenue,
        String principalInvestigator,
        String doi,
        List<String> authorNames
) {}