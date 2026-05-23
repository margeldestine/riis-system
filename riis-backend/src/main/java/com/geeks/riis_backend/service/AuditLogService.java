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

    public void logReviewAction(String recordId, String actorId, String action, String comment) {
        User actor = userRepository.findById(actorId).orElse(null);

        AuditLogEntry entry = AuditLogEntry.builder()
                .actor(actor)
                .actionType("SUBMISSION_" + action)
                .targetType("RESEARCH_OUTPUT")
                .targetId(recordId)
                .comment(comment != null ? comment : "")
                .metadataJson(JsonNodeFactory.instance.objectNode())
                .build();

        auditLogEntryRepository.save(entry);
    }
}
