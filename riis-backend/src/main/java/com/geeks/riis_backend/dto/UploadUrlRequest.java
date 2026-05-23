package com.geeks.riis_backend.dto;

public record UploadUrlRequest(
		String fileName,
		String contentType
) {}
