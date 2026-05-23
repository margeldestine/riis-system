package com.geeks.riis_backend.dto;

public record LoginRequest(
		String email,
		String password
) {}
