package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.FieldError;
import com.geeks.riis_backend.dto.SubmissionAuthorRequest;
import com.geeks.riis_backend.dto.SubmissionRequest;
import com.geeks.riis_backend.dto.ValidationResult;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import java.util.Set;

@Service
public class ValidationService {

    private final ResearchOutputRepository researchOutputRepository;

    public ValidationService(ResearchOutputRepository researchOutputRepository) {
        this.researchOutputRepository = researchOutputRepository;
    }

	private static final Pattern DOI_PATTERN = Pattern.compile("^10\\.\\d{4,9}/[-._;()/:A-Z0-9]+$", Pattern.CASE_INSENSITIVE);
	private static final Pattern ORCID_PATTERN = Pattern.compile("^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$", Pattern.CASE_INSENSITIVE);

	private static final Set<String> ALLOWED_RESEARCH_TYPES = Set.of(
			"Funded Project", "Journal Article", "Conference Paper", "Innovation Output", "Community Extension Research"
	);

	public ValidationResult validate(SubmissionRequest dto, String institutionId) {
		return validate(dto, institutionId, null);
	}

	public ValidationResult validate(SubmissionRequest dto, String institutionId, String submissionId) {
		List<FieldError> errors = new ArrayList<>();

		if (dto == null) {
			errors.add(new FieldError("body", "Request body is required."));
			return new ValidationResult(false, errors);
		}

		if (isBlank(dto.title())) {
			errors.add(new FieldError("title", "Title is required."));
		}

		if (dto.completionYear() == null) {
			errors.add(new FieldError("completionYear", "Completion year is required."));
		} else {
			int currentYear = Year.now().getValue();
			if (dto.completionYear() > currentYear) {
				errors.add(new FieldError("completionYear", "Completion year must not be in the future."));
			}
		}

		if (isBlank(dto.abstractText())) {
			errors.add(new FieldError("abstractText", "Abstract is required."));
		} else {
			int wordCount = countWords(dto.abstractText());
			if (wordCount < 100 || wordCount > 500) {
				errors.add(new FieldError("abstractText", "Abstract must be between 100 and 500 words."));
			}
		}

		List<String> keywords = dto.keywords() == null ? List.of() : dto.keywords().stream()
				.filter(value -> value != null && !value.isBlank())
				.map(String::trim)
				.toList();

		if (keywords.isEmpty()) {
			errors.add(new FieldError("keywords", "Keywords are required."));
		} else if (keywords.size() < 3 || keywords.size() > 10) {
			errors.add(new FieldError("keywords", "Keywords must contain 3 to 10 items."));
		}

		if (!isBlank(dto.researchType()) && !ALLOWED_RESEARCH_TYPES.contains(dto.researchType().trim())) {
			errors.add(new FieldError("researchType", "Research type must be one of: Funded Project, Journal Article, Conference Paper, Innovation Output, Community Extension Research."));
		}

		if (!isBlank(dto.doi()) && !DOI_PATTERN.matcher(dto.doi().trim()).matches()) {
			errors.add(new FieldError("doi", "DOI format is invalid."));
		}

		List<SubmissionAuthorRequest> authors = dto.authors() == null ? List.of() : dto.authors();
		List<SubmissionAuthorRequest> normalizedAuthors = authors.stream()
				.filter(author -> author != null && !isBlank(author.fullName()))
				.toList();

		if (normalizedAuthors.isEmpty()) {
			errors.add(new FieldError("authors", "At least one author is required."));
		} else {
			for (int i = 0; i < authors.size(); i++) {
				SubmissionAuthorRequest author = authors.get(i);
				if (author == null) {
					errors.add(new FieldError("authors[" + i + "]", "Author is required."));
					continue;
				}
				if (isBlank(author.fullName())) {
					errors.add(new FieldError("authors[" + i + "].fullName", "Author full name is required."));
				}
				if (!isBlank(author.orcid()) && !ORCID_PATTERN.matcher(author.orcid().trim()).matches()) {
					errors.add(new FieldError("authors[" + i + "].orcid", "ORCID format is invalid."));
				}
			}
		}

		if (submissionId == null && !isBlank(dto.title()) && institutionId != null) {
			long duplicateCount = researchOutputRepository.countByTitleIgnoreCaseAndInstitutionIdAndStatusNot(
					dto.title().trim(), institutionId, "ARCHIVED"
			);
			if (duplicateCount > 0) {
				errors.add(new FieldError("title", "A research output with this title already exists in your institution. Please verify this is not a duplicate."));
			}
		}

		boolean passed = errors.isEmpty();
		return new ValidationResult(passed, errors);
	}

	private int countWords(String value) {
		String trimmed = value.trim();
		if (trimmed.isEmpty()) return 0;
		return trimmed.split("\\s+").length;
	}

	private boolean isBlank(String value) {
		return value == null || value.isBlank();
	}
}
