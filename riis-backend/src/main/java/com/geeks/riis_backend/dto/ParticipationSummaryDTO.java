package com.geeks.riis_backend.dto;

import java.util.List;

public record ParticipationSummaryDTO(
        long totalWhitelisted,
        long totalParticipating,
        double ratePercent,
        List<ProvinceParticipationDTO> provinces) {}