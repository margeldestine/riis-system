package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminReviewService {

    private final ResearchOutputRepository researchOutputRepository;

    @Transactional(readOnly = true)
    public Page<SubmissionSummaryDTO> listSubmissions(String status, String institutionId,
                                                      String researchType, Pageable pageable) {
        return researchOutputRepository.findByStatus(status, pageable)
                .map(o -> new SubmissionSummaryDTO(
                        o.getId(),
                        o.getReferenceNumber(),
                        o.getTitle(),
                        o.getResearchType(),
                        o.getFundingSource(),
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
                output.getS3PdfKey(),
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

    // DAS-043: the manual Approve / Requires Correction / Reject action (and
    // its "PATCH /{id}/status" endpoint) was removed per Sir Ralph's
    // feedback — only registered, verified HEI staff accounts can submit,
    // so submissions are already trusted at the account level and now
    // auto-publish straight to APPROVED in SubmissionService#submit(),
    // which is also where the RecordIngestedEvent now fires. This service
    // stays in place purely as the read-only monitoring API (listSubmissions
    // / getSubmissionDetail / getStatusStats above) for DOST Admins to
    // audit what HEIs have submitted.
}

