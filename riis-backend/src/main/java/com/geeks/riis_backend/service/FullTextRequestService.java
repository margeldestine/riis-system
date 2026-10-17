package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.geeks.riis_backend.dto.FullTextRequestCreateDTO;
import com.geeks.riis_backend.dto.FullTextRequestDTO;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditActionTypes;
import com.geeks.riis_backend.model.FullTextRequest;
import com.geeks.riis_backend.model.FullTextRequestStatus;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.FullTextRequestRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Request full text": stored, emailed to the SUBMITTING research officer (plus the HEI's
 * office address when it is a real email), and tracked in an inbox.
 * DASIG never attaches or serves the PDF. The HEI replies to the requester itself and records the outcome here.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FullTextRequestService {

    private static final String STATUS_APPROVED = "APPROVED";

    private final FullTextRequestRepository fullTextRequestRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EmailNotificationService emailNotificationService;

    /** Public submit. Silent no-op for bots (honeypot) and for repeat requests that are still pending. */
    public void create(String recordId, FullTextRequestCreateDTO dto) {
        if (dto.website() != null && !dto.website().isBlank()) {
            return; // honeypot filled: pretend success, save nothing
        }

        ResearchOutput output = researchOutputRepository.findById(recordId)
                .filter(o -> STATUS_APPROVED.equals(o.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + recordId));

        String email = dto.email().trim().toLowerCase();
        if (fullTextRequestRepository.existsByResearchOutput_IdAndRequesterEmailIgnoreCaseAndStatus(
                recordId, email, FullTextRequestStatus.PENDING)) {
            return; // same person already has an open request for this record
        }

        Institution institution = output.getInstitution();
        String name = dto.name().trim();
        String affiliation = dto.affiliation() == null || dto.affiliation().isBlank() ? null : dto.affiliation().trim();
        String purpose = dto.purpose().trim();

        FullTextRequest saved = fullTextRequestRepository.save(FullTextRequest.builder()
                .researchOutput(output)
                .institution(institution)
                .requesterName(name)
                .requesterEmail(email)
                .requesterAffiliation(affiliation)
                .purpose(purpose)
                .build());

        // No requester PII in the audit log.
        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("researchOutputId", recordId);
        metadata.put("referenceNumber", output.getReferenceNumber());
        metadata.put("institutionId", institution.getId());
        auditLogService.logWithMetadata(
                AuditActionTypes.FULL_TEXT_REQUEST_CREATED,
                "FULL_TEXT_REQUEST",
                saved.getId(),
                null,
                "Full text requested for " + output.getReferenceNumber() + ".",
                metadata);

        List<String> recipients = resolveRecipients(institution, output);
        if (recipients.isEmpty()) {
            log.warn("[FullTextRequest] No recipient email found for record {} (institution {}). "
                            + "Request {} is saved and visible in the HEI inbox.",
                    output.getReferenceNumber(), institution.getId(), saved.getId());
        }
        for (String recipient : recipients) {
            log.info("[FullTextRequest] Notifying {} about request {} (record {})",
                    recipient, saved.getId(), output.getReferenceNumber());
            try {
                emailNotificationService.sendFullTextRequestToResearchOffice(
                        recipient,
                        institution.getName(),
                        output.getTitle(),
                        output.getReferenceNumber(),
                        name,
                        email,
                        affiliation,
                        purpose);
            } catch (Exception e) {
                // One bad address must not block the others or roll back the saved request.
                log.error("[FullTextRequest] Failed to notify {} for request {}: {}",
                        recipient, saved.getId(), e.getMessage(), e);
            }
        }

        try {
            emailNotificationService.sendFullTextRequestConfirmation(
                    email, name, output.getTitle(), institution.getName());
        } catch (Exception e) {
            log.error("[FullTextRequest] Failed to send confirmation to requester for request {}: {}",
                    saved.getId(), e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<FullTextRequestDTO> list(String actorUserId, FullTextRequestStatus status, Pageable pageable) {
        User actor = loadActor(actorUserId);
        Page<FullTextRequest> page;
        if (PublicAccessPolicy.isAdmin(actor)) {
            page = status == null
                    ? fullTextRequestRepository.findAll(pageable)
                    : fullTextRequestRepository.findByStatus(status, pageable);
        } else {
            String institutionId = requireInstitutionId(actor);
            page = status == null
                    ? fullTextRequestRepository.findByInstitution_Id(institutionId, pageable)
                    : fullTextRequestRepository.findByInstitution_IdAndStatus(institutionId, status, pageable);
        }
        return page.map(this::toDto);
    }

    public FullTextRequestDTO updateStatus(String actorUserId, String requestId, FullTextRequestStatus next, String note) {
        if (next == FullTextRequestStatus.PENDING) {
            throw new BadRequestException("Status must be FULFILLED or DECLINED.");
        }
        User actor = loadActor(actorUserId);
        String notFound = "Full text request not found: " + requestId;

        FullTextRequest request = fullTextRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(notFound));
        requireAccess(actor, request.getInstitution().getId(), notFound);

        FullTextRequestStatus current = request.getStatus();
        if (current != FullTextRequestStatus.PENDING) {
            throw new BadRequestException("This request is already " + current.getLabel().toLowerCase() + ".");
        }

        request.setStatus(next);
        request.setHandledBy(actor);
        request.setHandledAt(LocalDateTime.now());
        request.setHandlerNote(note == null || note.isBlank() ? null : note.trim());
        FullTextRequest saved = fullTextRequestRepository.save(request);

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("from", current.name());
        metadata.put("to", next.name());
        auditLogService.logWithMetadata(
                AuditActionTypes.FULL_TEXT_REQUEST_STATUS_CHANGED,
                "FULL_TEXT_REQUEST",
                saved.getId(),
                actorUserId,
                "Full text request marked " + next.getLabel() + ".",
                metadata);

        return toDto(saved);
    }

    private FullTextRequestDTO toDto(FullTextRequest r) {
        ResearchOutput output = r.getResearchOutput();
        return new FullTextRequestDTO(
                r.getId(),
                output.getId(),
                output.getReferenceNumber(),
                output.getTitle(),
                r.getRequesterName(),
                r.getRequesterEmail(),
                r.getRequesterAffiliation(),
                r.getPurpose(),
                r.getStatus().name(),
                r.getStatus().getLabel(),
                r.getHandlerNote(),
                r.getHandledAt(),
                r.getCreatedAt());
    }

    /**
     * Who gets the "someone requested your full text" email:
     *  1. The research officer who SUBMITTED the record (research_outputs.submitted_by),
     *     whenever their account has an email.
     *  2. The institution's contact_email, only if it is a real address. registerHEI() stores
     *     just the email DOMAIN there (e.g. "cit.edu"), which is not deliverable and is skipped.
     *  3. Fallback: all ACTIVE HEI_STAFF of the institution, used only when the submitter is
     *     missing, has no email, or is no longer ACTIVE, so the request never goes unnoticed.
     */
    private List<String> resolveRecipients(Institution institution, ResearchOutput output) {
        Set<String> recipients = new LinkedHashSet<>();

        User submitter = output.getSubmittedBy();
        boolean submitterReachable = false;
        if (submitter != null && isRealEmail(submitter.getEmail())) {
            recipients.add(submitter.getEmail().trim().toLowerCase());
            submitterReachable = "ACTIVE".equalsIgnoreCase(submitter.getStatus());
        }

        String contact = institution.getContactEmail();
        if (isRealEmail(contact)) {
            recipients.add(contact.trim().toLowerCase());
        }

        if (!submitterReachable) {
            userRepository.findByInstitutionIdAndRoleAndStatus(institution.getId(), "HEI_STAFF", "ACTIVE")
                    .stream()
                    .map(User::getEmail)
                    .filter(this::isRealEmail)
                    .map(e -> e.trim().toLowerCase())
                    .forEach(recipients::add);
        }
        return List.copyOf(recipients);
    }

    private boolean isRealEmail(String value) {
        if (value == null) return false;
        String v = value.trim();
        int at = v.indexOf('@');
        return at > 0 && at < v.length() - 1 && !v.contains(" ");
    }

    private User loadActor(String actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorUserId));
    }

    private String requireInstitutionId(User actor) {
        if (actor.getInstitution() == null) {
            throw new BadRequestException("User is not linked to an institution.");
        }
        return actor.getInstitution().getId();
    }

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