package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SubmissionDetailDTO(
		String id,
		String referenceNumber,
		String title,
		String researchType,
		String fundingSource,
		String publicationVenue,
		Integer completionYear,
		LocalDateTime submittedAt,
		String status,
		String abstractText,
		List<SubmissionAuthorRequest> authors,
		List<String> keywords,
		String doi,
		String subjectDc,
		String coverageDc,
		String rightsDc,
		String contributorDc,
		String formatDc,
		String languageDc,
		String relationDc,
		String sourceDc,
		String publisherDc,
		String identifierDc,
		String correctionNotes,
		String s3PdfKey,
		int validationErrorCount
) {}
