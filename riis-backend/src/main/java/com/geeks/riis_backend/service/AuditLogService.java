package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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
}
