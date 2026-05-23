package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record SubmissionSummaryDTO(
		String id,
		String referenceNumber,
		String title,
		String researchType,
		Integer completionYear,
		LocalDateTime submittedAt,
		String status
) {}
