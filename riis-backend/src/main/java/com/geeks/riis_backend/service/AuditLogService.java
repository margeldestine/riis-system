package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.geeks.riis_backend.dto.AuditLogEntryDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuditLogService {

	private final AuditLogEntryRepository auditLogEntryRepository;
	private final UserRepository userRepository;

	public void logResubmission(String recordId, String actorId) {
		User actor = userRepository.findById(actorId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorId));

		AuditLogEntry entry = AuditLogEntry.builder()
				.actor(actor)
				.actionType("SUBMISSION_RESUBMITTED")
				.targetType("RESEARCH_OUTPUT")
				.targetId(recordId)
				.comment("Submission resubmitted by HEI user.")
				.metadataJson(JsonNodeFactory.instance.objectNode())
				.build();

		auditLogEntryRepository.save(entry);
	}

	/**
	 * Generic write path shared by admin-facing services (review decisions,
	 * account actions, HEI status changes). Looks the actor up by email --
	 * same tolerant lookup used historically by UserApprovalService and
	 * InstitutionService's private writeAuditLog helpers -- and resolves to
	 * a null actor rather than failing the whole action if the acting
	 * admin's email can't be matched to a user record.
	 */
	public void log(String actionType, String targetType, String targetId, String actorEmail, String comment) {
		User actor = actorEmail != null
				? userRepository.findByEmail(actorEmail).orElse(null)
				: null;

		AuditLogEntry entry = AuditLogEntry.builder()
				.actor(actor)
				.actionType(actionType)
				.targetType(targetType)
				.targetId(targetId)
				.comment(comment)
				.createdAt(LocalDateTime.now())
				.build();

		auditLogEntryRepository.save(entry);
	}

	// UC-M5-05: GET /api/v1/admin/audit-log -- paginated, filterable by
	// date range, actor, and action type.
	@Transactional(readOnly = true)
	public Page<AuditLogEntryDTO> search(LocalDateTime from, LocalDateTime to, String actorId, String actionType, Pageable pageable) {
		return auditLogEntryRepository
				.findAll(AuditLogSpecifications.withFilters(from, to, actorId, actionType), pageable)
				.map(entry -> new AuditLogEntryDTO(
						entry.getId(),
						entry.getActor() != null ? entry.getActor().getId() : null,
						entry.getActor() != null ? entry.getActor().getFullName() : null,
						entry.getActor() != null ? entry.getActor().getEmail() : null,
						entry.getActionType(),
						entry.getTargetType(),
						entry.getTargetId(),
						entry.getComment(),
						entry.getCreatedAt()
				));
	}
}