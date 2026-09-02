package com.geeks.riis_backend.dto;

import java.util.List;

public record InstitutionExportDataDTO(
        String institutionName,
        String institutionType,
        String institutionProvince,
        List<ResearchOutputExportRowDTO> outputs
) {}