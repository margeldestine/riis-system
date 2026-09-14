package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

// UC-M5-05: flattened projection of AuditLogEntry for the audit log
// viewer -- actorName/actorEmail instead of the full User entity, so the
// list endpoint doesn't need to serialize (or lazily fail to load) the
// actor's other relationships.
public record AuditLogEntryDTO(
        String id,
        String actorId,
        String actorName,
        String actorEmail,
        String actionType,
        String targetType,
        String targetId,
        String comment,
        LocalDateTime createdAt
) {}