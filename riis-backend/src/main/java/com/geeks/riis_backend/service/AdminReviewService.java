package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.repository.QualityQueryRepository;
import com.geeks.riis_backend.model.Author;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.HashMap;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminReviewService {

    private final ResearchOutputRepository researchOutputRepository;
    private final S3UploadService s3UploadService;

    private final QualityQueryRepository qualityQueryRepository;

    @Transactional(readOnly = true)
    public Page<SubmissionSummaryDTO> listSubmissions(String status, String institutionId,
                                                      String researchType, Pageable pageable) {
        List<Object[]> rows = qualityQueryRepository.submissionRows(
                status, (int) pageable.getOffset(), pageable.getPageSize());

        List<String> ids = rows.stream().map(r -> (String) r[0]).toList();
        Map<String, List<String>> authorsByOutput = new HashMap<>();
        for (Object[] r : qualityQueryRepository.authorNames(ids)) {
            String name = (String) r[1];
            if (name != null && !name.isBlank()) {
                authorsByOutput.computeIfAbsent((String) r[0], k -> new ArrayList<>()).add(name);
            }
        }

        List<SubmissionSummaryDTO> content = rows.stream()
                .map(r -> new SubmissionSummaryDTO(
                        (String) r[0],
                        (String) r[1],
                        (String) r[2],
                        (String) r[3],
                        (String) r[4],
                        r[5] == null ? null : ((Number) r[5]).intValue(),
                        (LocalDateTime) r[6],
                        (String) r[7],
                        (String) r[8],
                        (String) r[9],
                        String.join(", ", authorsByOutput.getOrDefault((String) r[0], List.of()))))
                .toList();

        return PageableExecutionUtils.getPage(content, pageable,
                () -> qualityQueryRepository.submissionCount(status));
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
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .toList();

        int validationErrorCount = output.getValidationLogs() == null
                ? 0
                : output.getValidationLogs().stream()
                .mapToInt(vl -> vl == null ? 0 : vl.getErrorCount())
                .sum();

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
                output.getPrincipalInvestigator(),
                output.getInstitutionalAffiliation(),
                output.getDoi(),
                output.getConferenceUrl(),
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
                validationErrorCount,
                output.getVisibility() == null ? null : output.getVisibility().name()
        );
    }

    // DAS-047: Review screen previously had no way to view/download the
    // HEI's uploaded PDF, even though every submission stores an s3PdfKey.
    @Transactional(readOnly = true)
    public String getFileDownloadUrl(String submissionId) {
        ResearchOutput output = researchOutputRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        String s3PdfKey = output.getS3PdfKey();
        if (s3PdfKey == null || s3PdfKey.isBlank()) {
            return null;
        }

        try {
            return s3UploadService.generateDownloadUrl(s3PdfKey);
        } catch (BadRequestException e) {
            return null;
        }
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

    // DAS-043: the manual Approve / Requires Correction / Reject action was removed.
    // This service is now read-only for DOST Admin monitoring.
}