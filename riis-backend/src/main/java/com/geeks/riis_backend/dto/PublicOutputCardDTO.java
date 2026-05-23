package com.geeks.riis_backend.dto;

import java.util.List;

public record PublicOutputCardDTO(
        String id,
        String title,
        String doi,
        String researchType,
        Integer completionYear,
        String fundingSource,
        String abstractExcerpt,
        List<PublicAuthorDTO> authors
) {}