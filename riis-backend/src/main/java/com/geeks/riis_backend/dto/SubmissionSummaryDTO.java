package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record SubmissionSummaryDTO(
		String id,
		String referenceNumber,
		String title,
		String researchType,
		String fundingSource,
		Integer completionYear,
		LocalDateTime submittedAt,
		LocalDateTime updatedAt,
		String status
) {
	public SubmissionSummaryDTO(
			String id,
			String referenceNumber,
			String title,
			String researchType,
			String fundingSource,
			Integer completionYear,
			LocalDateTime submittedAt,
			String status
	) {
		this(id, referenceNumber, title, researchType, fundingSource, completionYear, submittedAt, submittedAt, status);
	}
}
