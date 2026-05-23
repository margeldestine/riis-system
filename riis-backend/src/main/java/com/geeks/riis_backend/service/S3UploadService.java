package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.BadRequestException;
import java.time.Duration;
import java.time.Year;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3UploadService {

	private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(15);

	private final String bucketName;
	private final String accessKey;
	private final String secretKey;
	private final S3Presigner presigner;

	public S3UploadService(
			@Value("${app.s3.bucket:}") String bucketName,
			@Value("${app.s3.access-key:}") String accessKey,
			@Value("${app.s3.secret-key:}") String secretKey,
			S3Presigner presigner
	) {
		this.bucketName = bucketName == null ? "" : bucketName.trim();
		this.accessKey = accessKey == null ? "" : accessKey.trim();
		this.secretKey = secretKey == null ? "" : secretKey.trim();
		this.presigner = presigner;
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

		String safeFileName = sanitizeFileName(fileName);
		String objectKey = institutionId.trim() + "/submissions/" + Year.now().getValue() + "/" + uuidShort() + "-" + safeFileName;

		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
				.bucket(bucketName)
				.key(objectKey)
				.contentType(contentType == null ? "application/octet-stream" : contentType)
				.build();

		PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
				.signatureDuration(UPLOAD_URL_TTL)
				.putObjectRequest(putObjectRequest)
				.build();

		PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
		return new PresignedUpload(presignedRequest.url().toString(), objectKey);
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
