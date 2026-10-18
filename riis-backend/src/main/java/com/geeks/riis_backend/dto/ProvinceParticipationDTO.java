package com.geeks.riis_backend.dto;

import java.util.List;

public record ProvinceParticipationDTO(
        String province,
        long whitelisted,
        long participating,
        double ratePercent,
        List<String> nonParticipating) {}