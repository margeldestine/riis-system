package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.AuditLogEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

// UC-M5-05: JpaSpecificationExecutor backs the filterable /admin/audit-log
// endpoint (date range, actor, action type), mirroring how
// ResearchOutputRepository + SubmissionSpecifications already do
// specification-based filtering for submissions.
@Repository
public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, String>, JpaSpecificationExecutor<AuditLogEntry> {

    // Per-target history (used for the similarity flag review history).
    List<AuditLogEntry> findByTargetTypeAndTargetIdAndActionTypeOrderByCreatedAtDesc(
            String targetType, String targetId, String actionType);
}
