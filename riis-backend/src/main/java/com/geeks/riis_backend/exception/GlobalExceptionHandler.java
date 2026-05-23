package com.geeks.riis_backend.exception;

import com.geeks.riis_backend.dto.FieldError;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(SubmissionValidationException.class)
	public ResponseEntity<List<FieldError>> handleSubmissionValidationException(SubmissionValidationException ex) {
		return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ex.getErrors());
	}
}
