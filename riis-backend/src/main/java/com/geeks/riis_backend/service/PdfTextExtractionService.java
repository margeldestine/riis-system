package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.model.ResearchOutput;
import java.io.IOException;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

/**
 * Fetches an uploaded research PDF from S3 and extracts plain text from it,
 * ahead of the Claude holistic-scoring pass (see
 * FINAL_LLM_SCORING_IMPLEMENTATION_PLAN.md — Phase 1).
 *
 * This service is deliberately fail-closed: {@link #extractText(String)} and
 * {@link #extractText(ResearchOutput)} never throw. Every failure mode —
 * missing/blank S3 key, the object not existing in S3, a corrupted or
 * unparsable PDF, or an unexpected IO error — is caught here and reported as
 * a typed {@link PdfExtractionResult} with a {@link PdfExtractionStatus},
 * mirroring the fail-soft-with-typed-outcome style already used by
 * {@code AIProxyService}'s circuit-breaker fallbacks, but returning an
 * explicit typed result instead of a silently empty value so a scoring
 * pipeline downstream can tell "no text because scanned PDF" apart from
 * "no text because empty string".
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfTextExtractionService {

    /** ~15,000 words, per the Phase 1 spec. */
    static final int MAX_WORDS = 15_000;

    /** ~60,000 characters, per the Phase 1 spec — applied after the word cap. */
    static final int MAX_CHARACTERS = 60_000;

    /** Below this word count, treat the PDF as likely scanned/image-only rather than a valid (if short) document. */
    static final int MIN_WORDS_FOR_VALID_TEXT = 50;

    private final S3UploadService s3UploadService;

    /**
     * Convenience overload for callers that already have the entity loaded.
     */
    public PdfExtractionResult extractText(ResearchOutput researchOutput) {
        if (researchOutput == null) {
            log.warn("PDF extraction requested with a null ResearchOutput.");
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.S3_KEY_MISSING,
                    "No research output was provided.");
        }
        return extractText(researchOutput.getS3PdfKey());
    }

    /**
     * Fetches the PDF at {@code s3PdfKey} and extracts and caps its text.
     * Never throws — see class Javadoc.
     */
    public PdfExtractionResult extractText(String s3PdfKey) {
        if (s3PdfKey == null || s3PdfKey.isBlank()) {
            log.warn("PDF extraction requested with a missing/blank s3PdfKey.");
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.S3_KEY_MISSING,
                    "No S3 PDF key was provided for this research output.");
        }

        byte[] pdfBytes;
        try {
            pdfBytes = s3UploadService.downloadFileBytes(s3PdfKey);
        } catch (BadRequestException e) {
            // Covers: bucket/credentials not configured, blank key, and the
            // NoSuchKeyException case S3UploadService itself wraps into
            // BadRequestException.
            log.warn("Failed to fetch PDF from S3 for key '{}': {}", s3PdfKey, e.getMessage());
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.S3_KEY_MISSING,
                    "Could not fetch the PDF from storage: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error fetching PDF from S3 for key '{}'", s3PdfKey, e);
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.IO_ERROR,
                    "Unexpected error while fetching the PDF from storage.");
        }

        if (pdfBytes == null || pdfBytes.length == 0) {
            log.warn("S3 returned an empty payload for PDF key '{}'.", s3PdfKey);
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.S3_KEY_MISSING,
                    "The PDF object at key '" + s3PdfKey + "' was empty.");
        }

        String rawText;
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            rawText = stripper.getText(document);
        } catch (IOException e) {
            log.warn("Corrupted or unreadable PDF for key '{}': {}", s3PdfKey, e.getMessage());
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.CORRUPTED_OR_UNREADABLE_PDF,
                    "The PDF file could not be parsed (corrupted or unsupported format).");
        } catch (Exception e) {
            // PDFBox occasionally surfaces malformed-content-stream issues
            // as unchecked exceptions rather than IOException — fail closed
            // here too rather than letting them propagate.
            log.error("Unexpected error extracting text from PDF for key '{}'", s3PdfKey, e);
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.IO_ERROR,
                    "Unexpected error while extracting text from the PDF.");
        }

        if (rawText == null) {
            rawText = "";
        }

        String trimmed = rawText.trim();
        String[] words = trimmed.isEmpty() ? new String[0] : trimmed.split("\\s+");

        if (words.length < MIN_WORDS_FOR_VALID_TEXT) {
            log.info("PDF at key '{}' produced only {} word(s) — flagging as likely scanned/image-only.",
                    s3PdfKey, words.length);
            return PdfExtractionResult.failure(
                    PdfExtractionStatus.LIKELY_SCANNED_OR_IMAGE_ONLY,
                    "Likely scanned or image-only PDF — no extractable text.");
        }

        boolean truncated = false;
        String cappedText = rawText;

        // Cap by word count first (retains from the start — methodology
        // sections tend to come before results/references).
        if (words.length > MAX_WORDS) {
            cappedText = String.join(" ", Arrays.copyOfRange(words, 0, MAX_WORDS));
            truncated = true;
        }

        // Then enforce the hard character cap on whatever's left.
        if (cappedText.length() > MAX_CHARACTERS) {
            cappedText = cappedText.substring(0, MAX_CHARACTERS);
            truncated = true;
        }

        String finalTrimmed = cappedText.trim();
        int finalWordCount = finalTrimmed.isEmpty() ? 0 : finalTrimmed.split("\\s+").length;

        return PdfExtractionResult.success(cappedText, finalWordCount, truncated);
    }
}