// riis-backend/src/test/java/com/geeks/riis_backend/service/PdfMetadataExtractionServiceTest.java
package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.PdfMetadataExtractionResponseDTO;
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

class PdfMetadataExtractionServiceTest {

    private final S3UploadService s3UploadService = mock(S3UploadService.class);
    private final PdfMetadataExtractionService service = new PdfMetadataExtractionService(s3UploadService);

    @Test
    void extractsFieldsFromARealTextPdf() throws IOException {
        PdfMetadataExtractionResponseDTO result = service.extractFromBytes(buildPaperPdf());

        assertEquals("SUCCESS", result.status());
        assertTrue(result.extracted());
        assertEquals("Flood Risk Assessment in Bohol", result.title());
        assertTrue(result.authors().contains("Juan Dela Cruz"));
        assertTrue(result.authors().contains("Maria Santos"));
        assertEquals(120, result.abstractText().trim().split("\\s+").length);
        assertEquals(3, result.keywords().size());
    }

    @Test
    void blankPageIsReportedAsLikelyScannedNotAnError() throws IOException {
        PdfMetadataExtractionResponseDTO result = service.extractFromBytes(buildBlankPdf());

        assertEquals("LIKELY_SCANNED_OR_IMAGE_ONLY", result.status());
        assertFalse(result.extracted());
        assertTrue(result.authors().isEmpty());
    }

    @Test
    void corruptedPdfAfterAValidHeaderIsReportedNotThrown() {
        byte[] bytes = "%PDF-1.7\nthis is not a real pdf body".getBytes(StandardCharsets.US_ASCII);

        PdfMetadataExtractionResponseDTO result = service.extractFromBytes(bytes);

        assertEquals("CORRUPTED_OR_UNREADABLE_PDF", result.status());
        assertFalse(result.extracted());
    }

    @Test
    void nonPdfBytesAreRejectedGracefully() {
        PdfMetadataExtractionResponseDTO result =
                service.extractFromBytes("hello world".getBytes(StandardCharsets.US_ASCII));

        assertEquals("CORRUPTED_OR_UNREADABLE_PDF", result.status());
    }

    @Test
    void emptyBytesAreReportedAsIoError() {
        assertEquals("IO_ERROR", service.extractFromBytes(new byte[0]).status());
        assertEquals("IO_ERROR", service.extractFromBytes(null).status());
    }

    @Test
    void missingStorageObjectIsReportedAsS3KeyMissing() {
        when(s3UploadService.downloadFileBytes("inst/submissions/2026/x.pdf"))
                .thenThrow(new BadRequestException("No object found"));

        PdfMetadataExtractionResponseDTO result = service.extractFromS3Key("inst/submissions/2026/x.pdf");

        assertEquals("S3_KEY_MISSING", result.status());
    }

    @Test
    void storageKeyModeReadsThePdfFromS3() throws IOException {
        when(s3UploadService.downloadFileBytes("inst/submissions/2026/ok.pdf")).thenReturn(buildPaperPdf());

        PdfMetadataExtractionResponseDTO result = service.extractFromS3Key("inst/submissions/2026/ok.pdf");

        assertEquals("SUCCESS", result.status());
        assertEquals("Flood Risk Assessment in Bohol", result.title());
    }

    // ------------------------------------------------------------ fixtures

    private static byte[] buildPaperPdf() throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                write(cs, bold, 18, 740, "Flood Risk Assessment in Bohol");
                write(cs, regular, 11, 715, "Juan Dela Cruz, Maria Santos");
                write(cs, regular, 9, 698, "Department of Geodetic Engineering, University of San Carlos");
                write(cs, bold, 11, 675, "Abstract");
                float y = 660;
                StringBuilder lineText = new StringBuilder();
                for (int i = 0; i < 120; i++) {
                    lineText.append("word").append(i % 50).append(i % 12 == 11 ? ". " : " ");
                    if (i % 12 == 11) {
                        write(cs, regular, 10, y, lineText.toString().trim());
                        lineText.setLength(0);
                        y -= 14;
                    }
                }
                write(cs, regular, 10, y - 4, "Keywords: flood risk; SAR imagery; GIS");
                write(cs, bold, 12, y - 30, "1. Introduction");
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] buildBlankPdf() throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static void write(PDPageContentStream cs, PDType1Font font, float size, float y, String text)
            throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(50, y);
        cs.showText(text);
        cs.endText();
    }
}