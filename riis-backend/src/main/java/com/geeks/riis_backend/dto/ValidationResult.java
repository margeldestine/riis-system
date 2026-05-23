package com.geeks.riis_backend.dto;

import java.util.List;

public record ValidationResult(
		boolean passed,
		List<FieldError> errors
) {}
