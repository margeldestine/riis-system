package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.geeks.riis_backend.dto.VisibilityResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.model.AuditActionTypes;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Changes record-level visibility and the institution default.
 * Every real change writes an audit entry in the SAME transaction (before/after in metadata).
 * Changing an institution default never alters existing records.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class VisibilityService {

    private final ResearchOutputRepository researchOutputRepository;
    private final InstitutionRepository institutionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public VisibilityResponse changeRecordVisibility(String actorUserId, String recordId, AccessVisibility next) {
        User actor = loadActor(actorUserId);
        String notFound = "Submission not found: " + recordId;

        ResearchOutput output = researchOutputRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException(notFound));
        requireAccess(actor, output.getInstitution().getId(), notFound);

        AccessVisibility current = output.getVisibility() == null ? AccessVisibility.RESTRICTED : output.getVisibility();
        if (current == next) {
            return new VisibilityResponse(recordId, next.name(), next.getLabel(), false);
        }

        output.setVisibility(next);
        researchOutputRepository.save(output);

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("from", current.name());
        metadata.put("to", next.name());
        metadata.put("referenceNumber", output.getReferenceNumber());
        auditLogService.logWithMetadata(
                AuditActionTypes.RECORD_VISIBILITY_CHANGED,
                "RESEARCH_OUTPUT",
                recordId,
                actorUserId,
                "Record visibility changed from " + current.getLabel() + " to " + next.getLabel() + ".",
                metadata);

        return new VisibilityResponse(recordId, next.name(), next.getLabel(), true);
    }

    @Transactional(readOnly = true)
    public VisibilityResponse getOwnInstitutionDefault(String actorUserId) {
        Institution institution = requireOwnInstitution(loadActor(actorUserId));
        AccessVisibility current = institution.getDefaultVisibility() == null
                ? AccessVisibility.PUBLIC : institution.getDefaultVisibility();
        return new VisibilityResponse(institution.getId(), current.name(), current.getLabel(), false);
    }

    public VisibilityResponse changeOwnInstitutionDefault(String actorUserId, AccessVisibility next) {
        Institution institution = requireOwnInstitution(loadActor(actorUserId));
        return applyInstitutionDefault(actorUserId, institution, next);
    }

    /** DOST admin: set any institution's default. */
    public VisibilityResponse changeInstitutionDefault(String actorUserId, String institutionId, AccessVisibility next) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + institutionId));
        return applyInstitutionDefault(actorUserId, institution, next);
    }

    private VisibilityResponse applyInstitutionDefault(String actorUserId, Institution institution, AccessVisibility next) {
        AccessVisibility current = institution.getDefaultVisibility() == null
                ? AccessVisibility.PUBLIC : institution.getDefaultVisibility();
        if (current == next) {
            return new VisibilityResponse(institution.getId(), next.name(), next.getLabel(), false);
        }

        institution.setDefaultVisibility(next);
        institutionRepository.save(institution);

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("from", current.name());
        metadata.put("to", next.name());
        metadata.put("institutionName", institution.getName());
        auditLogService.logWithMetadata(
                AuditActionTypes.INSTITUTION_DEFAULT_VISIBILITY_CHANGED,
                "INSTITUTION",
                institution.getId(),
                actorUserId,
                "Institution default visibility changed from " + current.getLabel() + " to " + next.getLabel()
                        + ". Existing records are unchanged.",
                metadata);

        return new VisibilityResponse(institution.getId(), next.name(), next.getLabel(), true);
    }

    private User loadActor(String actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorUserId));
    }

    private Institution requireOwnInstitution(User actor) {
        if (actor.getInstitution() == null) {
            throw new BadRequestException("User is not linked to an institution.");
        }
        return actor.getInstitution();
    }

    /** Admins pass; HEI staff must belong to the owning institution. Anyone else gets a 404 (no enumeration). */
    private void requireAccess(User actor, String institutionId, String notFoundMessage) {
        if (PublicAccessPolicy.isAdmin(actor)) {
            return;
        }
        if (PublicAccessPolicy.isHeiStaff(actor)
                && actor.getInstitution() != null
                && actor.getInstitution().getId().equals(institutionId)) {
            return;
        }
        throw new ResourceNotFoundException(notFoundMessage);
    }
}