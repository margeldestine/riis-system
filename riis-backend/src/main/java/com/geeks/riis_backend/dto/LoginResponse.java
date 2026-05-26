package com.geeks.riis_backend.dto;

public record LoginResponse(
		String id,
		String email,
		String fullName,
		String role,
		String status,
		boolean mustResetPassword,
		String token,
		String institutionName,
		String position
) {}
