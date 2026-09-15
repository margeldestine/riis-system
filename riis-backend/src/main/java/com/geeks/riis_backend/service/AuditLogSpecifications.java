package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.AuditLogEntry;
import java.time.LocalDateTime;
import org.springframework.data.jpa.domain.Specification;

// UC-M5-05: mirrors SubmissionSpecifications' pattern for
// ResearchOutput -- a small set of composable Specification<T> filters,
// each a no-op (cb.conjunction()) when its parameter is absent.
public class AuditLogSpecifications {

    public static Specification<AuditLogEntry> withFilters(
            LocalDateTime from, LocalDateTime to, String actorId, String actionType
    ) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (from != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (actorId != null && !actorId.isBlank()) {
                predicate = cb.and(predicate, cb.equal(root.get("actor").get("id"), actorId));
            }
            if (actionType != null && !actionType.isBlank()) {
                predicate = cb.and(predicate, cb.equal(root.get("actionType"), actionType));
            }

            return predicate;
        };
    }
}