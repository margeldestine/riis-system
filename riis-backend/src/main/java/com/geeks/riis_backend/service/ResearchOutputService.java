package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.MySubmissionItem;
import com.geeks.riis_backend.dto.ResearchSubmissionRequest;
import com.geeks.riis_backend.dto.ResearchSubmissionResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Author;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ResearchOutputService {

	private static final String STATUS_PENDING_VALIDATION = "PENDING_VALIDATION";
	private static final String DEFAULT_RESEARCH_TYPE = "JOURNAL_ARTICLE";

	private final ResearchOutputRepository researchOutputRepository;
	private final InstitutionRepository institutionRepository;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public ResearchOutput getOutputById(String id) {
		return researchOutputRepository
				.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Research output not found: " + id));
	}

	public ResearchOutput createSubmission(ResearchOutput output, String institutionId) {
		Institution institution = institutionRepository
				.findById(institutionId)
				.orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + institutionId));

		output.setInstitution(institution);
		output.setStatus("PENDING_REVIEW");

		return researchOutputRepository.save(output);
	}

	public ResearchSubmissionResponse submitForUser(String userId, ResearchSubmissionRequest request) {
		if (request == null) {
			throw new BadRequestException("Request body is required.");
		}
		if (userId == null || userId.isBlank()) {
			throw new BadRequestException("Authenticated user id is required.");
		}
		if (request.title() == null || request.title().isBlank()) {
			throw new BadRequestException("Title is required.");
		}

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new BadRequestException("User must be linked to an institution before submitting research outputs.");
		}

		Set<Author> authors = new HashSet<>();
		if (request.authors() != null) {
			for (String authorName : request.authors()) {
				if (authorName == null || authorName.isBlank()) {
					continue;
				}
				authors.add(Author.builder().fullName(authorName.trim()).build());
			}
		}

		ResearchOutput output = ResearchOutput.builder()
				.referenceNumber(generateReferenceNumber())
				.institution(institution)
				.title(request.title().trim())
				.abstractText(request.abstractText())
				.subjectDc(request.sAndTTheme())
				.researchType(DEFAULT_RESEARCH_TYPE)
				.status(STATUS_PENDING_VALIDATION)
				.authors(authors)
				.build();

		for (Author author : output.getAuthors()) {
			author.setResearchOutput(output);
		}

		ResearchOutput saved = researchOutputRepository.save(output);
		return new ResearchSubmissionResponse(saved.getId(), saved.getStatus());
	}

	@Transactional(readOnly = true)
	public List<MySubmissionItem> getSubmissionsForUserInstitution(String userId) {
		if (userId == null || userId.isBlank()) {
			throw new BadRequestException("Authenticated user id is required.");
		}

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		Institution institution = user.getInstitution();
		if (institution == null) {
			throw new BadRequestException("User must be linked to an institution.");
		}

		return researchOutputRepository.findByInstitutionIdOrderByCreatedAtDesc(institution.getId()).stream()
				.map(output -> new MySubmissionItem(
						output.getId(),
						output.getTitle(),
						output.getStatus(),
						output.getSubjectDc(),
						output.getCreatedAt()
				))
				.toList();
	}

	@Transactional(readOnly = true)
	public List<ResearchOutput> findSimilarOutputs(float[] embedding, int limit) {
		return researchOutputRepository.findSimilarOutputs(embedding, limit);
	}

	private String generateReferenceNumber() {
		return "RO-" + UUID.randomUUID().toString().replace("-", "");
	}
}
