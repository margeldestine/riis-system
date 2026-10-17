// riis-backend/src/main/java/com/geeks/riis_backend/service/SimilarityDispositionService.java
package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.geeks.riis_backend.dto.OverlapMatchDTO;
import com.geeks.riis_backend.dto.SimilarityDispositionHistoryEntryDTO;
import com.geeks.riis_backend.dto.SimilarityDispositionRequest;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.SimilarityDispositionStatus;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.OverlapAlertRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Review workflow for similarity flags (overlap alerts): Open -> Reviewed (no issue) /
 * Referred for collaboration / Escalated to research office, each with a mandatory note.
 *
 * Kept separate from OverlapDetectionService on purpose: that class is the detection
 * pipeline (embeddings, thresholds, e-mail) and runs inside the submission flow; this one
 * is an admin-facing write path with its own transaction, locking and audit rules.
 *
 * Authorization is enforced at the edge (URL rule /api/v1/quality/** + @PreAuthorize on the
 * controller, DOST_ADMIN only). HEI officers cannot see the Similarity Flag Log, so they get
 * no write access to it either; "Escalated to research office" is a status DOST sets, not an
 * action an HEI performs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimilarityDispositionService {

    static final String ACTION_TYPE = "SIMILARITY_FLAG_DISPOSITION_CHANGED";
    static final String TARGET_TYPE = "OVERLAP_ALERT";

    private final OverlapAlertRepository overlapAlertRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    /**
     * Applies a disposition to one flag and writes the audit record in the SAME
     * transaction: AuditLogService is itself @Transactional (REQUIRED) so it joins this
     * one. Either both the status change and its audit entry commit, or neither does --
     * there is no state change without a trail and no orphan trail without a change.
     */
    @Transactional
    public OverlapMatchDTO updateDisposition(String alertId, String actorUserId, SimilarityDispositionRequest request) {
        SimilarityDispositionStatus target = SimilarityDispositionStatus.fromString(request.status());
        String notes = request.notes() == null ? "" : request.notes().trim();
        if (notes.length() < 5 || notes.length() > 2000) {
            throw new BadRequestException("Notes must be between 5 and 2000 characters.");
        }

        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorUserId));

        // Pessimistic row lock: concurrent dispositions of the same flag are serialised.
        OverlapAlert alert = overlapAlertRepository.findByIdForUpdate(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Similarity flag not found: " + alertId));

        SimilarityDispositionStatus current = alert.getStatus() == null
                ? SimilarityDispositionStatus.OPEN
                : alert.getStatus();

        if (request.expectedStatus() != null && !request.expectedStatus().isBlank()
                && SimilarityDispositionStatus.fromString(request.expectedStatus()) != current) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This flag was updated by someone else (now '" + current.getLabel()
                            + "'). Reload the log and try again.");
        }
        if (current == target && notes.equals(alert.getDispositionNotes())) {
            throw new BadRequestException("Nothing to update: the status and note are unchanged.");
        }

        alert.setStatus(target);
        alert.setDispositionNotes(notes);
        alert.setReviewedBy(actor);
        alert.setReviewedAt(LocalDateTime.now());
        overlapAlertRepository.save(alert);

        ResearchOutput newRecord = alert.getNewRecord();
        ResearchOutput existingRecord = alert.getExistingRecord();

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("alertId", alert.getId());
        metadata.put("fromStatus", current.name());
        metadata.put("toStatus", target.name());
        metadata.put("notes", notes);
        metadata.put("similarityScore", alert.getSimilarityScore());
        metadata.put("newRecordId", newRecord.getId());
        metadata.put("existingRecordId", existingRecord.getId());

        String comment = "Similarity flag " + newRecord.getReferenceNumber() + " vs "
                + existingRecord.getReferenceNumber() + ": "
                + (current == target
                ? "note updated (" + target.getLabel() + ")"
                : current.getLabel() + " -> " + target.getLabel())
                + ". " + notes;

        auditLogService.logWithMetadata(ACTION_TYPE, TARGET_TYPE, alert.getId(), actor.getId(), comment, metadata);

        log.info("Similarity flag {} disposition {} -> {} by user {}", alert.getId(), current, target, actor.getId());
        return toMatchDto(alert);
    }

    @Transactional(readOnly = true)
    public List<SimilarityDispositionHistoryEntryDTO> getHistory(String alertId) {
        if (!overlapAlertRepository.existsById(alertId)) {
            throw new ResourceNotFoundException("Similarity flag not found: " + alertId);
        }
        return auditLogEntryRepository
                .findByTargetTypeAndTargetIdAndActionTypeOrderByCreatedAtDesc(TARGET_TYPE, alertId, ACTION_TYPE)
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    /** Shared by the list endpoint and the PATCH response so both always agree on the shape. */
    public OverlapMatchDTO toMatchDto(OverlapAlert alert) {
        SimilarityDispositionStatus status = alert.getStatus() == null
                ? SimilarityDispositionStatus.OPEN
                : alert.getStatus();
        ResearchOutput existing = alert.getExistingRecord();
        return new OverlapMatchDTO(
                alert.getId(),
                existing.getId(),
                existing.getTitle(),
                existing.getInstitution() != null ? existing.getInstitution().getName() : "Unknown",
                alert.getSimilarityScore(),
                alert.isNotificationSent(),
                status.name(),
                status.getLabel(),
                alert.getDispositionNotes(),
                alert.getReviewedBy() != null ? alert.getReviewedBy().getFullName() : null,
                alert.getReviewedAt()
        );
    }

    private SimilarityDispositionHistoryEntryDTO toHistoryDto(AuditLogEntry entry) {
        JsonNode meta = entry.getMetadataJson();
        return new SimilarityDispositionHistoryEntryDTO(
                entry.getId(),
                entry.getActor() != null ? entry.getActor().getFullName() : null,
                meta == null ? null : meta.path("fromStatus").asText(null),
                meta == null ? null : meta.path("toStatus").asText(null),
                meta == null ? null : meta.path("notes").asText(null),
                entry.getCreatedAt()
        );
    }
}