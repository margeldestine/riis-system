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
		String status,
		// DAS-045/046: institutionId/institutionName and authorNames were
		// missing entirely — the admin list/table already referenced
		// item.institutionName and item.principalInvestigator, but neither
		// existed on this DTO, so they always rendered blank. Added here so
		// the HEI filter dropdown and author search can actually work.
		String institutionId,
		String institutionName,
		String authorNames
) {
	public SubmissionSummaryDTO(
			String id,
			String referenceNumber,
			String title,
			String researchType,
			String fundingSource,
			Integer completionYear,
			LocalDateTime submittedAt,
			String status,
			String institutionId,
			String institutionName,
			String authorNames
	) {
		this(id, referenceNumber, title, researchType, fundingSource, completionYear, submittedAt, submittedAt, status,
				institutionId, institutionName, authorNames);
	}
}