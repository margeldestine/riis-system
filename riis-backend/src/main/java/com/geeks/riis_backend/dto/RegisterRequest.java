package com.geeks.riis_backend.dto;

public record RegisterRequest(
		String fullName,
		String email,
		String password,
		String institutionId,
		String employeeId,
		String department,
		String position
) {}

