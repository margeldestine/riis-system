package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.SubmissionRequest;
import com.geeks.riis_backend.dto.SubmissionFilterDTO;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionResponse;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.dto.UploadUrlRequest;
import com.geeks.riis_backend.dto.UploadUrlResponse;
import com.geeks.riis_backend.service.S3UploadService;
import com.geeks.riis_backend.service.SubmissionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/submissions")
public class SubmissionController {

	private final SubmissionService submissionService;
	private final S3UploadService s3UploadService;

	public SubmissionController(SubmissionService submissionService, S3UploadService s3UploadService) {
		this.submissionService = submissionService;
		this.s3UploadService = s3UploadService;
	}

	@PostMapping
	public ResponseEntity<SubmissionResponse> createSubmission(@RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		SubmissionResponse response = submissionService.submit(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping("/upload-url")
	public ResponseEntity<UploadUrlResponse> createUploadUrl(@RequestBody UploadUrlRequest request) {
		String userId = getAuthenticatedUserId();
		String institutionId = submissionService.getInstitutionIdForUser(userId);

		S3UploadService.PresignedUpload presigned = s3UploadService.createPresignedPutUrl(
				institutionId,
				request == null ? null : request.fileName(),
				request == null ? null : request.contentType()
		);

		return ResponseEntity.ok(new UploadUrlResponse(presigned.uploadUrl(), presigned.objectKey()));
	}

	@GetMapping
	public ResponseEntity<Page<SubmissionSummaryDTO>> listSubmissions(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			SubmissionFilterDTO filter
	) {
		String userId = getAuthenticatedUserId();
		Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
		return ResponseEntity.ok(submissionService.listSubmissions(userId, filter, pageable));
	}

	@GetMapping("/{id}")
	public ResponseEntity<SubmissionDetailDTO> getSubmissionById(@PathVariable("id") String id) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.getSubmissionDetail(userId, id));
	}

	@PutMapping("/{id}")
	public ResponseEntity<SubmissionResponse> resubmit(@PathVariable("id") String id, @RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.resubmit(userId, id, request));
	}

	private String getAuthenticatedUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
		}
		Object principal = authentication.getPrincipal();
		String userId = principal == null ? null : principal.toString();
		if (userId == null || userId.isBlank() || "anonymousUser".equalsIgnoreCase(userId)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
		}
		return userId;
	}
}
