package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionFilterDTO;
import com.geeks.riis_backend.dto.SubmissionRequest;
import com.geeks.riis_backend.dto.SubmissionResponse;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.dto.ValidationResult;
import com.geeks.riis_backend.event.RecordIngestedEvent;
import com.geeks.riis_backend.event.RecordResubmittedEvent;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.exception.SubmissionValidationException;
import com.geeks.riis_backend.model.Author;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.Year;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class SubmissionService {

	private static final String STATUS_PENDING_REVIEW = "PENDING_REVIEW";
	private static final String STATUS_REQUIRES_CORRECTION = "REQUIRES_CORRECTION";
	private static final String DEFAULT_RESEARCH_TYPE = "JOURNAL_ARTICLE";

	private final UserRepository userRepository;
	private final ResearchOutputRepository researchOutputRepository;
	private final ValidationService validationService;
	private final ApplicationEventPublisher eventPublisher;
	private final EmailNotificationService emailNotificationService;
	private final AuditLogService auditLogService;
	private final ValidationLogService validationLogService;

	public SubmissionResponse submit(String userId, SubmissionRequest dto) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new SubmissionValidationException(List.of(
					new com.geeks.riis_backend.dto.FieldError("institution", "User is not linked to an institution.")
			));
		}

		ValidationResult validationResult = validationService.validate(dto, institution.getId());
		validationLogService.persistValidationResult(
				validationResult,
				institution.getId(),
				null,
				"INITIAL_SUBMIT"
		);
		if (!validationResult.passed()) {
			throw new SubmissionValidationException(validationResult.errors());
		}

		String referenceNumber = generateReferenceNumber();
		String keywords = dto.keywords() == null ? null : dto.keywords().stream()
				.filter(value -> value != null && !value.isBlank())
				.map(String::trim)
				.distinct()
				.reduce((a, b) -> a + ", " + b)
				.orElse(null);

		Set<Author> authors = mapAuthors(dto.authors());

		ResearchOutput output = ResearchOutput.builder()
				.referenceNumber(referenceNumber)
				.institution(institution)
				.title(dto.title().trim())
				.abstractText(dto.abstractText().trim())
				.completionYear(dto.completionYear())
				.keywords(keywords)
				.doi(dto.doi() == null ? null : dto.doi().trim())
				.subjectDc(dto.sAndTTheme())
				.coverageDc(dto.coverageDc())
				.rightsDc(dto.rightsDc())
				.researchType(isBlank(dto.researchType()) ? DEFAULT_RESEARCH_TYPE : dto.researchType().trim())
				.fundingSource(dto.fundingSource())
				.publicationVenue(dto.publicationVenue())
				.s3PdfKey(dto.attachmentKey())
				.status(STATUS_PENDING_REVIEW)
				.authors(authors)
				.build();

		for (Author author : output.getAuthors()) {
			author.setResearchOutput(output);
		}

		ResearchOutput saved = researchOutputRepository.save(output);

		emailNotificationService.sendSubmissionConfirmation(user.getEmail(), saved.getReferenceNumber());

		return new SubmissionResponse(saved.getReferenceNumber());
	}

	@Transactional(readOnly = true)
	public Page<SubmissionSummaryDTO> listSubmissions(String userId, SubmissionFilterDTO filter, Pageable pageable, String keyword) {
		String institutionId = getInstitutionIdForUser(userId);

		if (!isBlank(keyword)) {
			return researchOutputRepository.findByInstitutionIdAndTitleContainingIgnoreCaseOrAuthorsContainingIgnoreCase(
					institutionId,
					keyword.trim(),
					keyword.trim(),
					pageable
			).map(output -> new SubmissionSummaryDTO(
					output.getId(),
					output.getReferenceNumber(),
					output.getTitle(),
					output.getResearchType(),
					output.getFundingSource(),
					output.getCompletionYear(),
					output.getCreatedAt(),
					output.getUpdatedAt(),
					output.getStatus()
			));
		}

		var spec = SubmissionSpecifications.forInstitution(institutionId)
				.and(SubmissionSpecifications.withFilters(filter));

		return researchOutputRepository.findAll(spec, pageable)
				.map(output -> new SubmissionSummaryDTO(
						output.getId(),
						output.getReferenceNumber(),
						output.getTitle(),
						output.getResearchType(),
						output.getFundingSource(),
						output.getCompletionYear(),
						output.getCreatedAt(),
						output.getUpdatedAt(),
						output.getStatus()
				));
	}

	@Transactional(readOnly = true)
	public SubmissionDetailDTO getSubmissionDetail(String userId, String submissionId) {
		String institutionId = getInstitutionIdForUser(userId);

		var spec = SubmissionSpecifications.forInstitution(institutionId)
				.and((root, query, cb) -> cb.equal(root.get("id"), submissionId));

		ResearchOutput output = researchOutputRepository.findOne(spec)
				.orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

		List<SubmissionAuthorRequest> authors = output.getAuthors() == null
				? List.of()
				: output.getAuthors().stream()
				.map(author -> new SubmissionAuthorRequest(author.getFullName(), author.getOrcidId()))
				.toList();

		List<String> keywords = parseKeywords(output.getKeywords());

		int validationErrorCount = output.getValidationLogs() == null
				? 0
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

	public SubmissionResponse resubmit(String userId, String submissionId, SubmissionRequest dto) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new SubmissionValidationException(List.of(
					new com.geeks.riis_backend.dto.FieldError("institution", "User is not linked to an institution.")
			));
		}

		var spec = SubmissionSpecifications.forInstitution(institution.getId())
				.and((root, query, cb) -> cb.equal(root.get("id"), submissionId));

		ResearchOutput output = researchOutputRepository.findOne(spec)
				.orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

		if (!STATUS_REQUIRES_CORRECTION.equalsIgnoreCase(output.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Submission is not in REQUIRES_CORRECTION status.");
		}

		ValidationResult validationResult = validationService.validate(dto, institution.getId());
		validationLogService.persistValidationResult(
				validationResult,
				institution.getId(),
				submissionId,
				"RESUBMIT"
		);
		if (!validationResult.passed()) {
			throw new SubmissionValidationException(validationResult.errors());
		}

		output.setTitle(dto.title().trim());
		output.setCompletionYear(dto.completionYear());
		output.setAbstractText(dto.abstractText().trim());
		output.setDoi(dto.doi() == null ? null : dto.doi().trim());
		output.setSubjectDc(dto.sAndTTheme());
		output.setCoverageDc(dto.coverageDc());
		output.setRightsDc(dto.rightsDc());
		output.setResearchType(isBlank(dto.researchType()) ? DEFAULT_RESEARCH_TYPE : dto.researchType().trim());
		output.setFundingSource(dto.fundingSource());
		output.setPublicationVenue(dto.publicationVenue());
		output.setS3PdfKey(dto.attachmentKey());
		output.setKeywords(dto.keywords() == null ? null : dto.keywords().stream()
				.filter(value -> value != null && !value.isBlank())
				.map(String::trim)
				.distinct()
				.reduce((a, b) -> a + ", " + b)
				.orElse(null));

		Set<Author> updatedAuthors = mapAuthors(dto.authors());
		if (output.getAuthors() == null) {
			output.setAuthors(updatedAuthors);
		} else {
			output.getAuthors().clear();
			output.getAuthors().addAll(updatedAuthors);
		}
		for (Author author : output.getAuthors()) {
			author.setResearchOutput(output);
		}

		output.setStatus(STATUS_PENDING_REVIEW);
		output.setReviewedBy(null);
		output.setReviewedAt(null);

		ResearchOutput saved = researchOutputRepository.save(output);

		auditLogService.logResubmission(saved.getId(), userId);

		eventPublisher.publishEvent(new RecordResubmittedEvent(
				saved.getId(),
				saved.getReferenceNumber(),
				institution.getId()
		));

		return new SubmissionResponse(saved.getReferenceNumber());
	}

	public SubmissionResponse updateSubmission(String userId, String submissionId, SubmissionRequest dto) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new SubmissionValidationException(List.of(
					new com.geeks.riis_backend.dto.FieldError("institution", "User is not linked to an institution.")
			));
		}

		var spec = SubmissionSpecifications.forInstitution(institution.getId())
				.and((root, query, cb) -> cb.equal(root.get("id"), submissionId));

		ResearchOutput output = researchOutputRepository.findOne(spec)
				.orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

		ValidationResult validationResult = validationService.validate(dto, institution.getId(), submissionId);
		validationLogService.persistValidationResult(
				validationResult,
				institution.getId(),
				submissionId,
				"RESUBMIT"
		);
		if (!validationResult.passed()) {
			throw new SubmissionValidationException(validationResult.errors());
		}

		output.setTitle(dto.title().trim());
		output.setCompletionYear(dto.completionYear());
		output.setAbstractText(dto.abstractText().trim());
		output.setDoi(dto.doi() == null ? null : dto.doi().trim());
		output.setSubjectDc(dto.sAndTTheme());
		output.setCoverageDc(dto.coverageDc());
		output.setRightsDc(dto.rightsDc());
		output.setResearchType(isBlank(dto.researchType()) ? DEFAULT_RESEARCH_TYPE : dto.researchType().trim());
		output.setFundingSource(dto.fundingSource());
		output.setPublicationVenue(dto.publicationVenue());
		output.setS3PdfKey(dto.attachmentKey());
		output.setKeywords(dto.keywords() == null ? null : dto.keywords().stream()
				.filter(value -> value != null && !value.isBlank())
				.map(String::trim)
				.distinct()
				.reduce((a, b) -> a + ", " + b)
				.orElse(null));

		Set<Author> updatedAuthors = mapAuthors(dto.authors());
		if (output.getAuthors() == null) {
			output.setAuthors(updatedAuthors);
		} else {
			output.getAuthors().clear();
			output.getAuthors().addAll(updatedAuthors);
		}
		for (Author author : output.getAuthors()) {
			author.setResearchOutput(output);
		}

		output.setStatus(STATUS_PENDING_REVIEW);
		output.setReviewedBy(null);
		output.setReviewedAt(null);

		ResearchOutput saved = researchOutputRepository.save(output);

		auditLogService.logResubmission(saved.getId(), userId);

		eventPublisher.publishEvent(new RecordResubmittedEvent(
				saved.getId(),
				saved.getReferenceNumber(),
				institution.getId()
		));

		return new SubmissionResponse(saved.getReferenceNumber());
	}

	@Transactional(readOnly = true)
	public String getInstitutionIdForUser(String userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new ResourceNotFoundException("Institution not found for user: " + userId);
		}
		return institution.getId();
	}

	@Transactional(readOnly = true)
	public String getSubmissionAttachmentKey(String userId, String submissionId) {
		String institutionId = getInstitutionIdForUser(userId);

		var spec = SubmissionSpecifications.forInstitution(institutionId)
				.and((root, query, cb) -> cb.equal(root.get("id"), submissionId));

		ResearchOutput output = researchOutputRepository.findOne(spec)
				.orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

		String attachmentKey = output.getS3PdfKey();
		if (attachmentKey == null || attachmentKey.isBlank()) {
			throw new ResourceNotFoundException("No attachment found for submission: " + submissionId);
		}
		return attachmentKey;
	}

	private Set<Author> mapAuthors(List<SubmissionAuthorRequest> authors) {
		Set<Author> mapped = new HashSet<>();
		if (authors == null) return mapped;

		for (SubmissionAuthorRequest author : authors) {
			if (author == null) continue;
			if (isBlank(author.fullName())) continue;
			mapped.add(Author.builder()
					.fullName(author.fullName().trim())
					.orcidId(isBlank(author.orcid()) ? null : author.orcid().trim())
					.build());
		}
		return mapped;
	}

	private String generateReferenceNumber() {
		String year = String.valueOf(Year.now().getValue());
		String uuidShort = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
		return "DASIG-" + year + "-" + uuidShort;
	}

	private List<String> parseKeywords(String keywords) {
		if (keywords == null || keywords.isBlank()) {
			return List.of();
		}
		return Arrays.stream(keywords.split(","))
				.map(String::trim)
				.filter(v -> !v.isBlank())
				.toList();
	}

	private boolean isBlank(String value) {
		return value == null || value.isBlank();
	}
}
