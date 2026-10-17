package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

/** Row shown in the HEI research-office inbox. */
public record FullTextRequestDTO(
        String id,
        String researchOutputId,
        String referenceNumber,
        String recordTitle,
        String requesterName,
        String requesterEmail,
        String requesterAffiliation,
        String purpose,
        String status,
        String statusLabel,
        String handlerNote,
        LocalDateTime handledAt,
        LocalDateTime createdAt
) {}