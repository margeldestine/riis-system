package com.geeks.riis_backend.service;

public enum PdfExtractionStatus {
    SUCCESS,
    S3_KEY_MISSING,
    LIKELY_SCANNED_OR_IMAGE_ONLY,
    CORRUPTED_OR_UNREADABLE_PDF,
    IO_ERROR
}

/**
 * Fail-closed status classification for {@link PdfTextExtractionService}.
 * {@code SUCCESS} is the only status that guarantees
 * {@link PdfExtractionResult#extractedText()} is usable — every other value
 * means the caller should treat this record as "no usable text" and fall
 * back accordingly (e.g. skip LLM holistic scoring for this submission
 * rather than sending it a corrupted/empty payload).
 */