package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminReviewService {

    private final ResearchOutputRepository researchOutputRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<SubmissionSummaryDTO> listSubmissions(String status, String institutionId,
                                                      String researchType, Pageable pageable) {
        return researchOutputRepository.findByStatus(status, pageable)
                .map(o -> new SubmissionSummaryDTO(
                        o.getId(),
                        o.getReferenceNumber(),
                        o.getTitle(),
                        o.getResearchType(),
                        o.getCompletionYear(),
                        o.getCreatedAt(),
                        o.getStatus()
                ));
    }

    @Transactional(readOnly = true)
    public SubmissionDetailDTO getSubmissionDetail(String submissionId) {
        ResearchOutput output = researchOutputRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        List<SubmissionAuthorRequest> authors = output.getAuthors() == null
                ? List.of()
                : output.getAuthors().stream()
                .map(a -> new SubmissionAuthorRequest(a.getFullName(), a.getOrcidId()))
                .toList();

        List<String> keywords = output.getKeywords() == null || output.getKeywords().isBlank()
                ? List.of()
                : Arrays.stream(output.getKeywords().split(","))
                .map(String::trim).filter(v -> !v.isBlank()).toList();

        int validationErrorCount = output.getValidationLogs() == null ? 0
                : output.getValidationLogs().stream().mapToInt(vl -> vl == null ? 0 : vl.getErrorCount()).sum();

        return new SubmissionDetailDTO(
                output.getId(),
                output.getReferenceNumber(),
                output.getTitle(),
                output.getResearchType(),
                output.getFundingSource(),
                output.getPublicationVenue(),
                output.getCompletionYear(),
                output.getCreatedAt(),
                output.getStatus(),
                output.getAbstractText(),
                authors,
                keywords,
                output.getDoi(),
                output.getSubjectDc(),
                output.getCoverageDc(),
                output.getRightsDc(),
                output.getContributorDc(),
                output.getFormatDc(),
                output.getLanguageDc(),
                output.getRelationDc(),
                output.getSourceDc(),
                output.getPublisherDc(),
                output.getIdentifierDc(),
                output.getCorrectionNotes(),
                validationErrorCount
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStatusStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("PENDING_REVIEW", researchOutputRepository.countByStatus("PENDING_REVIEW"));
        stats.put("APPROVED", researchOutputRepository.countByStatus("APPROVED"));
        stats.put("REQUIRES_CORRECTION", researchOutputRepository.countByStatus("REQUIRES_CORRECTION"));
        stats.put("REJECTED", researchOutputRepository.countByStatus("REJECTED"));
        return stats;
    }

    public void actionSubmission(String submissionId, String action, String comment, String adminUserId) {
        if (action == null || action.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action is required.");
        }

        String normalizedAction = action.trim().toUpperCase();
        boolean requiresComment = normalizedAction.equals("REJECTED") || normalizedAction.equals("REQUIRES_CORRECTION");

        if (requiresComment && (comment == null || comment.isBlank())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Comment is required for " + normalizedAction + " action.");
        }

        ResearchOutput output = researchOutputRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        User admin = userRepository.findById(adminUserId).orElse(null);

        output.setStatus(normalizedAction);
        output.setCorrectionNotes(requiresComment ? comment.trim() : null);
        output.setReviewedBy(admin);
        output.setReviewedAt(LocalDateTime.now());

        researchOutputRepository.save(output);

        auditLogService.logReviewAction(submissionId, adminUserId, normalizedAction, comment);

        String submitterEmail = output.getInstitution() != null
                ? getUserEmailForInstitution(output)
                : null;

        if (submitterEmail != null) {
            emailNotificationService.sendReviewStatusEmail(
                    submitterEmail,
                    output.getReferenceNumber(),
                    normalizedAction,
                    comment
            );
        }
    }

    private String getUserEmailForInstitution(ResearchOutput output) {
        try {
            return userRepository.findAll().stream()
                    .filter(u -> u.getInstitution() != null &&
                            u.getInstitution().getId().equals(output.getInstitution().getId()))
                    .map(User::getEmail)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}