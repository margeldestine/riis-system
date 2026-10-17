// riis-backend/src/main/java/com/geeks/riis_backend/dto/SimilarityDispositionHistoryEntryDTO.java
package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

/** One past disposition change of a similarity flag, read back from the audit log. */
public record SimilarityDispositionHistoryEntryDTO(
        String id,
        String actorName,
        String fromStatus,
        String toStatus,
        String notes,
        LocalDateTime changedAt
) {}