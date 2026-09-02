package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.exception.BadRequestException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

class PdfTextExtractionServiceTest {

    private static final String TEST_KEY = "test-institution/submissions/2026/abc123-paper.pdf";

    @Test
    void extractText_returnsSuccessForNormalPdf() throws IOException {
        S3UploadService s3UploadService = mock(S3UploadService.class);
        when(s3UploadService.downloadFileBytes(TEST_KEY)).thenReturn(buildPdfWithWords(200));

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText(TEST_KEY);

        assertTrue(result.isSuccess());
        assertEquals(PdfExtractionStatus.SUCCESS, result.status());
        assertFalse(result.truncated());
        assertTrue(result.wordCount() >= 200);
        assertTrue(result.extractedText().contains("word0"));
        assertNull(result.failureReason());
    }

    @Test
    void extractText_setsTruncatedFlagWhenOverWordCap() throws IOException {
        S3UploadService s3UploadService = mock(S3UploadService.class);
        when(s3UploadService.downloadFileBytes(TEST_KEY)).thenReturn(buildPdfWithWords(16_000));

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText(TEST_KEY);

        assertTrue(result.isSuccess());
        assertTrue(result.truncated());
        assertTrue(result.wordCount() <= PdfTextExtractionService.MAX_WORDS);
        assertTrue(result.extractedText().length() <= PdfTextExtractionService.MAX_CHARACTERS);
    }

    @Test
    void extractText_flagsLikelyScannedPdfBelowWordThreshold() throws IOException {
        S3UploadService s3UploadService = mock(S3UploadService.class);
        when(s3UploadService.downloadFileBytes(TEST_KEY)).thenReturn(buildPdfWithWords(5));

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText(TEST_KEY);

        assertFalse(result.isSuccess());
        assertEquals(PdfExtractionStatus.LIKELY_SCANNED_OR_IMAGE_ONLY, result.status());
        assertNull(result.extractedText());
        assertEquals(0, result.wordCount());
        assertEquals("Likely scanned or image-only PDF — no extractable text.", result.failureReason());
    }

    @Test
    void extractText_returnsCorruptedStatusForUnparsableBytes() {
        S3UploadService s3UploadService = mock(S3UploadService.class);
        byte[] garbageBytes = "this is definitely not a pdf file".getBytes(StandardCharsets.UTF_8);
        when(s3UploadService.downloadFileBytes(TEST_KEY)).thenReturn(garbageBytes);

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText(TEST_KEY);

        assertFalse(result.isSuccess());
        assertEquals(PdfExtractionStatus.CORRUPTED_OR_UNREADABLE_PDF, result.status());
        assertNull(result.extractedText());
    }

    @Test
    void extractText_returnsKeyMissingStatusForBlankKey() {
        S3UploadService s3UploadService = mock(S3UploadService.class);

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText((String) null);

        assertFalse(result.isSuccess());
        assertEquals(PdfExtractionStatus.S3_KEY_MISSING, result.status());
    }

    @Test
    void extractText_returnsKeyMissingStatusWhenS3FetchFails() {
        S3UploadService s3UploadService = mock(S3UploadService.class);
        when(s3UploadService.downloadFileBytes(TEST_KEY))
                .thenThrow(new BadRequestException("No object found in storage for key: " + TEST_KEY));

        PdfTextExtractionService service = new PdfTextExtractionService(s3UploadService);
        PdfExtractionResult result = service.extractText(TEST_KEY);

        assertFalse(result.isSuccess());
        assertEquals(PdfExtractionStatus.S3_KEY_MISSING, result.status());
    }

    /** Builds a real, valid single-page PDF containing {@code wordCount} distinct words. */
    private byte[] buildPdfWithWords(int wordCount) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                contentStream.newLineAtOffset(50, 700);

                int wordsPerLine = 10;
                int written = 0;
                while (written < wordCount) {
                    StringBuilder line = new StringBuilder();
                    for (int i = 0; i < wordsPerLine && written < wordCount; i++, written++) {
                        line.append("word").append(written).append(' ');
                    }
                    contentStream.showText(line.toString().trim());
                    contentStream.newLineAtOffset(0, -12);
                }

                contentStream.endText();
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }
}