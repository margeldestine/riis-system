package com.geeks.riis_backend.dto;

import java.util.List;

public record ResearchSubmissionRequest(
		String title,
		String abstractText,
		List<String> authors,
		String sAndTTheme
) {}
