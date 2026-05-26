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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionResponse> createSubmission(@RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		SubmissionResponse response = submissionService.submit(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping("/upload-url")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<UploadUrlResponse> createUploadUrl(@RequestBody UploadUrlRequest request) {
		String userId = getAuthenticatedUserId();
		String institutionId = submissionService.getInstitutionIdForUser(userId);

		// Proper logging (imports should be at the top of the file)
		org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(SubmissionController.class);
		logger.info("Controller: Current authorities: " + SecurityContextHolder.getContext().getAuthentication().getAuthorities());

		S3UploadService.PresignedUpload presigned = s3UploadService.createPresignedPutUrl(
				institutionId,
				request == null ? null : request.fileName(),
				request == null ? null : request.contentType()
		);
		return ResponseEntity.ok(new UploadUrlResponse(presigned.uploadUrl(), presigned.objectKey()));
	}

	@PostMapping("/upload")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<UploadUrlResponse> uploadFile(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
		String userId = getAuthenticatedUserId();
		String institutionId = submissionService.getInstitutionIdForUser(userId);

		S3UploadService.PresignedUpload upload = s3UploadService.uploadFile(institutionId, file);
		return ResponseEntity.ok(new UploadUrlResponse(upload.uploadUrl(), upload.objectKey()));
	}

	@GetMapping
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<Page<SubmissionSummaryDTO>> listSubmissions(
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String status,
			Pageable pageable,
			SubmissionFilterDTO filter
	) {
		String userId = getAuthenticatedUserId();
		Pageable safePageable = PageRequest.of(
				Math.max(pageable == null ? 0 : pageable.getPageNumber(), 0),
				Math.min(Math.max(pageable == null ? 20 : pageable.getPageSize(), 1), 200),
				(pageable == null || pageable.getSort() == null || pageable.getSort().isUnsorted())
						? Sort.by(Sort.Direction.DESC, "createdAt")
						: pageable.getSort()
		);
		if (status != null && !status.isBlank()) {
			filter.setStatuses(java.util.List.of(status));
		}
		return ResponseEntity.ok(submissionService.listSubmissions(userId, filter, safePageable, keyword));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionDetailDTO> getSubmissionById(@PathVariable("id") String id) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.getSubmissionDetail(userId, id));
	}

	@GetMapping("/{id}/download-url")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<DownloadUrlResponse> getDownloadUrl(@PathVariable("id") String id) {
		String userId = getAuthenticatedUserId();
		String attachmentKey = submissionService.getSubmissionAttachmentKey(userId, id);
		String downloadUrl = s3UploadService.generateDownloadUrl(attachmentKey);
		return ResponseEntity.ok(new DownloadUrlResponse(downloadUrl));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionResponse> resubmit(@PathVariable("id") String id, @RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.resubmit(userId, id, request));
	}

	@PatchMapping("/{id}")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionResponse> updateSubmission(@PathVariable("id") String id, @RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.updateSubmission(userId, id, request));
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

	public record DownloadUrlResponse(String downloadUrl) {}
}
