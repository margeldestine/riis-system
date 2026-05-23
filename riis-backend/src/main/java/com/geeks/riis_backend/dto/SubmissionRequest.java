package com.geeks.riis_backend.dto;

import java.util.List;

public record SubmissionRequest(
		String title,
		Integer completionYear,
		String abstractText,
		List<String> keywords,
		String doi,
		List<SubmissionAuthorRequest> authors,
		String sAndTTheme,
		String researchType,
		String fundingSource,
		String publicationVenue,
		String s3PdfKey
) {}
