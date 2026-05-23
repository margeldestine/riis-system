package com.geeks.riis_backend.dto;

public record ResearchOutputSubmissionRequest(
		String institutionId,
		String referenceNumber,
		String title,
		String researchType,
		String fundingSource,
		String publicationVenue,
		Integer completionYear,
		String abstractText,
		String keywords,
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
		String doi,
		String s3PdfKey
) {}

