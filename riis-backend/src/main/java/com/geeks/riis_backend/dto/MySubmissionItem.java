package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public record MySubmissionItem(
		String id,
		String title,
		String status,
		String sAndTTheme,
		LocalDateTime createdAt
) {}
