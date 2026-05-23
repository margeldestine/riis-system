package com.geeks.riis_backend.dto;

public record PendingUserResponse(
		String id,
		String fullName,
		String email,
		String institutionName,
		String department,
		String position
) {}
