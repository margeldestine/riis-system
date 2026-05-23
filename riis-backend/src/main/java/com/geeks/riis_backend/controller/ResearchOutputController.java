package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.ResearchOutputSubmissionRequest;
import com.geeks.riis_backend.dto.VectorSearchRequest;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.service.ResearchOutputService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/research-outputs")
@RequiredArgsConstructor
public class ResearchOutputController {

	private final ResearchOutputService researchOutputService;

	@GetMapping("/{id}")
	public ResponseEntity<ResearchOutput> getResearchOutputById(@PathVariable("id") String id) {
		return ResponseEntity.ok(researchOutputService.getOutputById(id));
	}

	@PostMapping
	public ResponseEntity<ResearchOutput> createSubmission(@RequestBody ResearchOutputSubmissionRequest request) {
		ResearchOutput output = ResearchOutput.builder()
				.referenceNumber(request.referenceNumber())
				.title(request.title())
				.researchType(request.researchType())
				.fundingSource(request.fundingSource())
				.publicationVenue(request.publicationVenue())
				.completionYear(request.completionYear())
				.abstractText(request.abstractText())
				.keywords(request.keywords())
				.subjectDc(request.subjectDc())
				.coverageDc(request.coverageDc())
				.rightsDc(request.rightsDc())
				.contributorDc(request.contributorDc())
				.formatDc(request.formatDc())
				.languageDc(request.languageDc())
				.relationDc(request.relationDc())
				.sourceDc(request.sourceDc())
				.publisherDc(request.publisherDc())
				.identifierDc(request.identifierDc())
				.doi(request.doi())
				.s3PdfKey(request.s3PdfKey())
				.build();

		ResearchOutput saved = researchOutputService.createSubmission(output, request.institutionId());
		return ResponseEntity.status(HttpStatus.CREATED).body(saved);
	}

	@PostMapping("/search/similar")
	public ResponseEntity<List<ResearchOutput>> findSimilarOutputs(@RequestBody VectorSearchRequest request) {
		return ResponseEntity.ok(researchOutputService.findSimilarOutputs(request.embedding(), request.limit()));
	}
}

