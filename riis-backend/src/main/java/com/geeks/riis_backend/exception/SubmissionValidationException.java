package com.geeks.riis_backend.exception;

import com.geeks.riis_backend.dto.FieldError;
import java.util.List;

public class SubmissionValidationException extends RuntimeException {

	private final List<FieldError> errors;

	public SubmissionValidationException(List<FieldError> errors) {
		super("Validation failed.");
		this.errors = errors == null ? List.of() : List.copyOf(errors);
	}

	public List<FieldError> getErrors() {
		return errors;
	}
}
