package com.geeks.riis_backend.service;

public record PdfExtractionResult(
        PdfExtractionStatus status,
        String extractedText,
        int wordCount,
        boolean truncated,
        String failureReason
) {

    public static PdfExtractionResult success(String extractedText, int wordCount, boolean truncated) {
        return new PdfExtractionResult(PdfExtractionStatus.SUCCESS, extractedText, wordCount, truncated, null);
    }

    public static PdfExtractionResult failure(PdfExtractionStatus status, String failureReason) {
        if (status == PdfExtractionStatus.SUCCESS) {
            throw new IllegalArgumentException("failure() cannot be called with SUCCESS status.");
        }
        return new PdfExtractionResult(status, null, 0, false, failureReason);
    }

    public boolean isSuccess() {
        return status == PdfExtractionStatus.SUCCESS;
    }
}

/**
 * Typed, fail-closed result of a single PDF text extraction attempt.
 *
 * {@link PdfTextExtractionService} never throws an uncaught exception —
 * every failure mode (missing S3 key, corrupted/unreadable file, scanned or
 * image-only PDF, unexpected IO error) is represented here as a
 * {@link PdfExtractionStatus} value plus a human-readable
 * {@code failureReason}, instead of an exception escaping the service.
 *
 * On failure, {@code extractedText} is {@code null} and {@code wordCount}
 * is {@code 0} — callers should always check {@link #isSuccess()} before
 * reading {@code extractedText}.
 */