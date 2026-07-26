package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.model.Author;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminReviewService {

    private final ResearchOutputRepository researchOutputRepository;
    private final S3UploadService s3UploadService;

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
                        o.getStatus(),
                        o.getInstitution() != null ? o.getInstitution().getId() : null,
                        o.getInstitution() != null ? o.getInstitution().getName() : null,
                        o.getAuthors() == null ? null
                                : o.getAuthors().stream()
                                  .map(Author::getFullName)
                                  .filter(name -> name != null && !name.isBlank())
                                  .collect(Collectors.joining(", "))
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

    // DAS-047: Review screen previously had no way to view/download the
    // HEI's uploaded PDF, even though every submission stores an s3PdfKey.
    // Reuses the same S3UploadService presigning logic already used for
    // HEI-side uploads (S3UploadService#generateDownloadUrl), just from the
    // admin side. Returns null when there's genuinely no file on record
    // (e.g., legacy/malformed submissions) so the controller can respond
    // with a clear "no file uploaded" message instead of a broken link.
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
            // S3 not configured / bad key — surface as "no file available"
            // rather than a 500, since this is a data/config issue, not
            // something the admin caused.
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