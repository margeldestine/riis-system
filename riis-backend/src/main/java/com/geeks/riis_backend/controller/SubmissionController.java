package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.PdfMetadataExtractionResponseDTO;
import com.geeks.riis_backend.dto.SubmissionRequest;
import com.geeks.riis_backend.dto.SubmissionFilterDTO;
import com.geeks.riis_backend.dto.SubmissionDetailDTO;
import com.geeks.riis_backend.dto.SubmissionResponse;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
import com.geeks.riis_backend.dto.UploadUrlRequest;
import com.geeks.riis_backend.dto.UploadUrlResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.service.PdfMetadataExtractionService;
import com.geeks.riis_backend.service.S3UploadService;
import com.geeks.riis_backend.service.SubmissionService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.geeks.riis_backend.dto.SubmitterDTO;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/submissions")
public class SubmissionController {

	private final SubmissionService submissionService;
	private final S3UploadService s3UploadService;
	private final PdfMetadataExtractionService pdfMetadataExtractionService;

	public SubmissionController(
			SubmissionService submissionService,
			S3UploadService s3UploadService,
			PdfMetadataExtractionService pdfMetadataExtractionService
	) {
		this.submissionService = submissionService;
		this.s3UploadService = s3UploadService;
		this.pdfMetadataExtractionService = pdfMetadataExtractionService;
	}



	@PostMapping
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionResponse> createSubmission(@Valid @RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		SubmissionResponse response = submissionService.submit(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping("/upload-url")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<UploadUrlResponse> createUploadUrl(@RequestBody UploadUrlRequest request) {
		String userId = getAuthenticatedUserId();
		String institutionId = submissionService.getInstitutionIdForUser(userId);

		// Auth-context tracing for this endpoint -- DEBUG only, not INFO, so
		// authority/role details for a specific user aren't written to
		// production logs by default.
		Logger logger = LoggerFactory.getLogger(SubmissionController.class);
		if (logger.isDebugEnabled()) {
			logger.debug("Controller: Current authorities: {}", SecurityContextHolder.getContext().getAuthentication().getAuthorities());
		}

		S3UploadService.PresignedUpload presigned = s3UploadService.createPresignedPutUrl(
				institutionId,
				request == null ? null : request.fileName(),
				request == null ? null : request.contentType()
		);
		return ResponseEntity.ok(new UploadUrlResponse(presigned.uploadUrl(), presigned.objectKey()));
	}

	@PostMapping("/upload")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<UploadUrlResponse> uploadFile(@RequestParam("file") MultipartFile file) {
		String userId = getAuthenticatedUserId();
		String institutionId = submissionService.getInstitutionIdForUser(userId);

		S3UploadService.PresignedUpload upload = s3UploadService.uploadFile(institutionId, file);
		return ResponseEntity.ok(new UploadUrlResponse(upload.uploadUrl(), upload.objectKey()));
	}

	/**
	 * Guided PDF intake: reads the front matter of a research PDF and returns
	 * advisory values for the submission form. Nothing is stored -- the PDF is
	 * parsed in memory (multipart) or read from the caller's own S3 prefix
	 * (objectKey) -- and the endpoint answers 200 even for scanned/corrupt PDFs
	 * (see PdfMetadataExtractionResponseDTO.status).
	 *
	 * Exactly one of {@code file} or {@code objectKey} must be supplied.
	 */
	@PostMapping("/extract-metadata")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<PdfMetadataExtractionResponseDTO> extractMetadata(
			@RequestParam(value = "file", required = false) MultipartFile file,
			@RequestParam(value = "objectKey", required = false) String objectKey
	) {
		String userId = getAuthenticatedUserId();
		boolean hasFile = file != null && !file.isEmpty();
		boolean hasKey = objectKey != null && !objectKey.isBlank();
		if (hasFile == hasKey) {
			throw new BadRequestException("Provide either a PDF file or an objectKey (exactly one).");
		}

		if (hasFile) {
			String contentType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase();
			boolean typeOk = contentType.isEmpty()
					|| contentType.equals("application/pdf")
					|| contentType.equals("application/octet-stream");
			if (!typeOk) {
				throw new BadRequestException("Only PDF files can be read.");
			}
			try {
				return ResponseEntity.ok(pdfMetadataExtractionService.extractFromBytes(file.getBytes()));
			} catch (IOException e) {
				throw new BadRequestException("The uploaded file could not be read.");
			}
		}

		// Storage-key mode: only keys under the caller's own institution prefix,
		// otherwise any HEI officer could read another institution's PDFs.
		String institutionId = submissionService.getInstitutionIdForUser(userId);
		String key = objectKey.trim();
		String ownPrefix = institutionId.trim() + "/submissions/";
		if (!key.startsWith(ownPrefix) || key.contains("..")) {
			throw new BadRequestException("That storage key does not belong to your institution.");
		}
		return ResponseEntity.ok(pdfMetadataExtractionService.extractFromS3Key(key));
	}

	@GetMapping
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<Page<SubmissionSummaryDTO>> listSubmissions(
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String researchType,
			@RequestParam(required = false) Boolean mine,
			Pageable pageable,
			SubmissionFilterDTO filter
	) {
		String userId = getAuthenticatedUserId();
		Pageable safePageable = PageRequest.of(
				Math.max(pageable == null ? 0 : pageable.getPageNumber(), 0),
				Math.min(Math.max(pageable == null ? 20 : pageable.getPageSize(), 1), 200),
				(pageable == null || pageable.getSort().isUnsorted())
						? Sort.by(Sort.Direction.DESC, "createdAt")
						: pageable.getSort()
		);
		if (status != null && !status.isBlank()) {
			filter.setStatuses(List.of(status));
		}
		if (researchType != null && !researchType.isBlank()) {
			filter.setResearchTypes(List.of(researchType));
		}
		if (mine != null) {
			filter.setMine(mine);
		}
		return ResponseEntity.ok(submissionService.listSubmissions(userId, filter, safePageable, keyword));
	}

	@GetMapping("/submitters")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<List<SubmitterDTO>> listSubmitters() {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.listSubmitters(userId));
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
	public ResponseEntity<SubmissionResponse> resubmit(@PathVariable("id") String id, @Valid @RequestBody SubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(submissionService.resubmit(userId, id, request));
	}

	@PatchMapping("/{id}")
	@PreAuthorize("hasAnyAuthority('HEI_STAFF', 'ROLE_HEI_STAFF')")
	public ResponseEntity<SubmissionResponse> updateSubmission(@PathVariable("id") String id, @Valid @RequestBody SubmissionRequest request) {
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