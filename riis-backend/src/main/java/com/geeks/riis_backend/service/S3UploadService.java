package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.BadRequestException;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.Year;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
public class S3UploadService {

	private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(15);
	private static final Duration DOWNLOAD_URL_TTL = Duration.ofMinutes(15);

	/**
	 * Research output submissions are PDFs only, per the system's own
	 * domain -- reject anything else before a presigned URL is ever
	 * issued, and again (see verifyUploadedPdf) after the file actually
	 * lands in the bucket, since the presigner has no way to enforce this
	 * itself once the browser is talking directly to S3.
	 */
	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");

	/**
	 * Matches spring.servlet.multipart.max-file-size, which only
	 * constrains the multipart /upload endpoint below -- the presigned-PUT
	 * flow bypasses that setting entirely (the browser uploads straight to
	 * S3, never touching this application's request pipeline), so this
	 * constant is what verifyUploadedPdf checks after the fact instead.
	 */
	private static final long MAX_UPLOAD_BYTES = 20L * 1024 * 1024;

	private final String bucketName;
	private final String accessKey;
	private final String secretKey;
	private final S3Presigner presigner;
	private final S3Client s3Client;

	public S3UploadService(
			@Value("${app.s3.bucket:}") String bucketName,
			@Value("${app.s3.access-key:}") String accessKey,
			@Value("${app.s3.secret-key:}") String secretKey,
			S3Presigner presigner,
			S3Client s3Client
	) {
		this.bucketName = bucketName == null ? "" : bucketName.trim();
		this.accessKey = accessKey == null ? "" : accessKey.trim();
		this.secretKey = secretKey == null ? "" : secretKey.trim();
		this.presigner = presigner;
		this.s3Client = s3Client;
	}

	public PresignedUpload createPresignedPutUrl(String institutionId, String fileName, String contentType) {
		if (bucketName.isBlank()) {
			throw new BadRequestException("S3 bucket is not configured.");
		}
		if (accessKey.isBlank() || secretKey.isBlank()) {
			throw new BadRequestException("S3 credentials are not configured.");
		}
		if (institutionId == null || institutionId.isBlank()) {
			throw new BadRequestException("Institution id is required.");
		}

		String normalizedType = contentType == null ? "" : contentType.trim().toLowerCase();
		if (!ALLOWED_CONTENT_TYPES.contains(normalizedType)) {
			throw new BadRequestException("Only PDF uploads are allowed.");
		}

		String safeFileName = sanitizeFileName(fileName);
		String objectKey = institutionId.trim() + "/submissions/" + Year.now().getValue() + "/" + uuidShort() + "-" + safeFileName;

		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
				.bucket(bucketName)
				.key(objectKey)
				.contentType(normalizedType)
				.build();

		PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
				.signatureDuration(UPLOAD_URL_TTL)
				.putObjectRequest(putObjectRequest)
				.build();

		PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
		return new PresignedUpload(presignedRequest.url().toString(), objectKey);
	}

	/**
	 * Confirms an object uploaded via a presigned PUT URL is actually what
	 * was promised when the URL was issued. The presigned-PUT flow lets
	 * the browser upload straight to S3, entirely bypassing this
	 * application -- so createPresignedPutUrl's content-type check above
	 * only constrains what the client *said* it would upload, not what it
	 * actually did, and the S3 presigner has no built-in way to cap the
	 * byte size of a PUT at all. This is the second, after-the-fact layer:
	 * called once the client reports upload completion, before the
	 * reported key is ever trusted enough to persist on a ResearchOutput.
	 *
	 * Deletes the object and throws BadRequestException if it fails
	 * either check, so a rejected upload doesn't linger in the bucket
	 * under a plausible-looking key.
	 */
	public void verifyUploadedPdf(String objectKey) {
		if (bucketName.isBlank()) {
			throw new BadRequestException("S3 bucket is not configured.");
		}
		if (objectKey == null || objectKey.isBlank()) {
			throw new BadRequestException("Object key is required.");
		}

		HeadObjectResponse head;
		try {
			head = s3Client.headObject(HeadObjectRequest.builder()
					.bucket(bucketName)
					.key(objectKey.trim())
					.build());
		} catch (NoSuchKeyException e) {
			throw new BadRequestException("No file was found at the reported upload location.");
		}

		String contentType = head.contentType() == null ? "" : head.contentType().trim().toLowerCase();
		boolean typeOk = ALLOWED_CONTENT_TYPES.contains(contentType);
		boolean sizeOk = head.contentLength() != null && head.contentLength() > 0 && head.contentLength() <= MAX_UPLOAD_BYTES;

		if (!typeOk || !sizeOk) {
			deleteObjectQuietly(objectKey);
			if (!typeOk) {
				throw new BadRequestException(
						"Uploaded file type (" + (contentType.isBlank() ? "unknown" : contentType)
								+ ") is not allowed. Only PDF uploads are accepted.");
			}
			throw new BadRequestException("Uploaded file exceeds the maximum allowed size of 20MB.");
		}
	}

	private void deleteObjectQuietly(String objectKey) {
		try {
			s3Client.deleteObject(DeleteObjectRequest.builder()
					.bucket(bucketName)
					.key(objectKey.trim())
					.build());
		} catch (Exception e) {
			// Best-effort cleanup. The BadRequestException the caller is
			// about to throw is what actually rejects the submission --
			// failing to delete an already-rejected object shouldn't mask
			// that real error or fail the request a different way.
			log.warn("Failed to delete rejected upload at key {}: {}", objectKey, e.getMessage());
		}
	}

	public PresignedUpload uploadFile(String institutionId, MultipartFile file) {
		if (bucketName.isBlank()) {
			throw new BadRequestException("S3 bucket is not configured.");
		}
		if (accessKey.isBlank() || secretKey.isBlank()) {
			throw new BadRequestException("S3 credentials are not configured.");
		}
		if (institutionId == null || institutionId.isBlank()) {
			throw new BadRequestException("Institution id is required.");
		}
		if (file == null || file.isEmpty()) {
			throw new BadRequestException("File is required.");
		}

		String safeFileName = sanitizeFileName(file.getOriginalFilename());
		String objectKey = institutionId.trim() + "/submissions/" + Year.now().getValue() + "/" + uuidShort() + "-" + safeFileName;

		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
				.bucket(bucketName)
				.key(objectKey)
				.contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
				.build();

		try {
			byte[] bytes = file.getBytes();
			s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
		} catch (IOException e) {
			log.error("S3 upload IO error: {}", e.getMessage(), e);
			throw new BadRequestException("Failed to read file for upload.");
		} catch (Exception e) {
			log.error("S3 upload failed: {}", e.getMessage(), e);
			throw new BadRequestException("Failed to upload file to storage.");
		}

		return new PresignedUpload(null, objectKey);
	}

	public String generateDownloadUrl(String objectKey) {
		if (bucketName.isBlank()) {
			throw new BadRequestException("S3 bucket is not configured.");
		}
		if (accessKey.isBlank() || secretKey.isBlank()) {
			throw new BadRequestException("S3 credentials are not configured.");
		}
		if (objectKey == null || objectKey.isBlank()) {
			throw new BadRequestException("Object key is required.");
		}

		GetObjectRequest getObjectRequest = GetObjectRequest.builder()
				.bucket(bucketName)
				.key(objectKey.trim())
				.build();

		GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
				.signatureDuration(DOWNLOAD_URL_TTL)
				.getObjectRequest(getObjectRequest)
				.build();

		PresignedGetObjectRequest presignedRequest = presigner.presignGetObject(presignRequest);
		return presignedRequest.url().toString();
	}

	/**
	 * Server-side byte fetch for an S3 object -- added for
	 * {@code PdfTextExtractionService}, which needs the raw PDF bytes
	 * in-process rather than a presigned URL for the browser. Mirrors the
	 * same config/validation guards as the other methods in this class, so
	 * a misconfigured bucket/credentials fails the same way everywhere.
	 */
	public byte[] downloadFileBytes(String objectKey) {
		if (bucketName.isBlank()) {
			throw new BadRequestException("S3 bucket is not configured.");
		}
		if (accessKey.isBlank() || secretKey.isBlank()) {
			throw new BadRequestException("S3 credentials are not configured.");
		}
		if (objectKey == null || objectKey.isBlank()) {
			throw new BadRequestException("Object key is required.");
		}

		GetObjectRequest getObjectRequest = GetObjectRequest.builder()
				.bucket(bucketName)
				.key(objectKey.trim())
				.build();

		try (ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getObjectRequest)) {
			return response.readAllBytes();
		} catch (NoSuchKeyException e) {
			throw new BadRequestException("No object found in storage for key: " + objectKey);
		} catch (IOException e) {
			throw new BadRequestException("Failed to read file bytes from storage for key: " + objectKey);
		}
	}

	private String uuidShort() {
		return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
	}

	private String sanitizeFileName(String fileName) {
		if (fileName == null || fileName.isBlank()) {
			return "upload.bin";
		}
		String normalized = fileName.replace("\\", "/");
		int lastSlash = normalized.lastIndexOf('/');
		String base = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
		base = base.replaceAll("[^A-Za-z0-9._-]", "_");
		if (base.isBlank()) {
			return "upload.bin";
		}
		return base;
	}

	public record PresignedUpload(String uploadUrl, String objectKey) {}
}