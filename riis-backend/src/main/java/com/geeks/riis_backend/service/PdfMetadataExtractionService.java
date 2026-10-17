// riis-backend/src/main/java/com/geeks/riis_backend/service/PdfMetadataExtractionService.java
package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.PdfMetadataExtractionResponseDTO;
import com.geeks.riis_backend.exception.BadRequestException;
import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.stereotype.Service;

/**
 * Reads the first few pages of a research PDF and pre-fills submission metadata
 * (title, authors, abstract, keywords, DOI) for the guided intake screen.
 *
 * <p>Same contract as {@link PdfTextExtractionService}: <b>never throws</b> for a
 * bad PDF. Every failure is reported as a typed {@link PdfExtractionStatus} inside
 * the response, so a scanned or corrupt PDF produces an empty-but-valid result and
 * the officer simply types the details by hand. Only an invalid <i>request</i>
 * (no file, wrong storage key) raises {@link BadRequestException}, and that is done
 * by the controller.
 *
 * <p>Why a separate service instead of extending {@link PdfTextExtractionService}:
 * that service flattens the whole document to capped plain text for the Claude
 * holistic-scoring pass and deliberately discards layout. Title detection needs the
 * <i>font size</i> of each line, and we only want the first {@value #MAX_PAGES}
 * pages, so this service runs its own bounded pass and reuses the same
 * {@link PdfExtractionStatus} vocabulary and {@link S3UploadService} byte fetch.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfMetadataExtractionService {

    /** Front matter (title, authors, abstract, keywords) is always within the first pages. */
    static final int MAX_PAGES = 4;

    /** Same ceiling as spring.servlet.multipart.max-file-size and S3UploadService. */
    static final long MAX_BYTES = 20L * 1024 * 1024;

    /** Fewer words than this across the parsed pages means there is no usable text layer. */
    static final int MIN_WORDS_FOR_TEXT_LAYER = 50;

    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    private final S3UploadService s3UploadService;

    /** Extracts from an in-memory PDF (the multipart upload path). */
    public PdfMetadataExtractionResponseDTO extractFromBytes(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return failure(PdfExtractionStatus.IO_ERROR, "The uploaded file was empty.");
        }
        if (pdfBytes.length > MAX_BYTES) {
            return failure(PdfExtractionStatus.IO_ERROR, "The PDF is larger than 20 MB.");
        }
        if (!looksLikePdf(pdfBytes)) {
            return failure(PdfExtractionStatus.CORRUPTED_OR_UNREADABLE_PDF,
                    "That file does not look like a PDF.");
        }

        List<PdfMetadataParser.TextLine> lines;
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            LineCollector collector = new LineCollector();
            collector.setSortByPosition(true);
            collector.setStartPage(1);
            collector.setEndPage(Math.max(1, Math.min(MAX_PAGES, document.getNumberOfPages())));
            collector.writeText(document, Writer.nullWriter());
            lines = collector.collectedLines();
        } catch (InvalidPasswordException e) {
            log.info("Metadata extraction skipped: PDF is password-protected.");
            return failure(PdfExtractionStatus.CORRUPTED_OR_UNREADABLE_PDF,
                    "The PDF is password-protected, so its details cannot be read.");
        } catch (IOException e) {
            log.warn("Metadata extraction: unreadable PDF: {}", e.getMessage());
            return failure(PdfExtractionStatus.CORRUPTED_OR_UNREADABLE_PDF,
                    "The PDF could not be read (it may be corrupted).");
        } catch (RuntimeException e) {
            // PDFBox sometimes surfaces malformed content streams as unchecked exceptions.
            log.error("Metadata extraction: unexpected failure while reading PDF", e);
            return failure(PdfExtractionStatus.IO_ERROR, "Unexpected error while reading the PDF.");
        }

        int words = lines.stream().mapToInt(l -> l.text().trim().isEmpty() ? 0 : l.text().trim().split("\\s+").length).sum();
        if (words < MIN_WORDS_FOR_TEXT_LAYER) {
            return failure(PdfExtractionStatus.LIKELY_SCANNED_OR_IMAGE_ONLY,
                    "This looks like a scanned PDF with no readable text. Please enter the details manually.");
        }

        PdfMetadataParser.ParsedMetadata parsed = PdfMetadataParser.parse(lines);
        return success(parsed);
    }

    /**
     * Extracts from a PDF already in storage (e.g. re-reading the attachment of an
     * existing submission). Ownership of the key is verified by the controller.
     */
    public PdfMetadataExtractionResponseDTO extractFromS3Key(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return failure(PdfExtractionStatus.S3_KEY_MISSING, "No storage key was provided.");
        }
        byte[] bytes;
        try {
            bytes = s3UploadService.downloadFileBytes(objectKey);
        } catch (BadRequestException e) {
            log.warn("Metadata extraction: could not fetch '{}': {}", objectKey, e.getMessage());
            return failure(PdfExtractionStatus.S3_KEY_MISSING, "The PDF could not be found in storage.");
        } catch (RuntimeException e) {
            log.error("Metadata extraction: unexpected S3 error for '{}'", objectKey, e);
            return failure(PdfExtractionStatus.IO_ERROR, "Unexpected error while fetching the PDF.");
        }
        return extractFromBytes(bytes);
    }

    // ------------------------------------------------------------- helpers

    private static boolean looksLikePdf(byte[] bytes) {
        // The spec allows junk before the header but only within the first 1024 bytes.
        int limit = Math.min(bytes.length - PDF_MAGIC.length, 1024);
        for (int i = 0; i <= limit; i++) {
            boolean match = true;
            for (int j = 0; j < PDF_MAGIC.length; j++) {
                if (bytes[i + j] != PDF_MAGIC[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        return false;
    }

    private static PdfMetadataExtractionResponseDTO success(PdfMetadataParser.ParsedMetadata parsed) {
        int found = 0;
        found += parsed.title() != null ? 1 : 0;
        found += parsed.authors().isEmpty() ? 0 : 1;
        found += parsed.abstractText() != null ? 1 : 0;
        found += parsed.keywords().isEmpty() ? 0 : 1;
        String message = found == 0
                ? "We could not find any details in this PDF. Please enter them manually."
                : "Pre-filled " + found + " of 4 fields. Please review each one before submitting.";
        return new PdfMetadataExtractionResponseDTO(
                PdfExtractionStatus.SUCCESS.name(),
                parsed.hasAnyField(),
                parsed.title(),
                parsed.authors(),
                parsed.abstractText(),
                parsed.keywords(),
                parsed.doi(),
                parsed.confidence(),
                parsed.warnings(),
                message);
    }

    private static PdfMetadataExtractionResponseDTO failure(PdfExtractionStatus status, String message) {
        Map<String, String> confidence = new LinkedHashMap<>();
        for (String field : List.of("title", "authors", "abstractText", "keywords", "doi")) {
            confidence.put(field, PdfMetadataParser.NONE);
        }
        return new PdfMetadataExtractionResponseDTO(
                status.name(), false, null, List.of(), null, List.of(), null, confidence, List.of(), message);
    }

    /**
     * PDFBox stripper that records one {@link PdfMetadataParser.TextLine} per visual
     * line together with the largest font size on it. New lines are detected from the
     * baseline moving, not from PDFBox's separators, so it behaves the same across
     * PDFBox versions; a large horizontal gap also starts a new line so that two
     * columns sharing a baseline are not glued together.
     */
    private static final class LineCollector extends PDFTextStripper {

        private final List<PdfMetadataParser.TextLine> lines = new ArrayList<>();
        private final StringBuilder current = new StringBuilder();
        private float currentY = Float.NaN;
        private float currentMaxFont = 0f;
        private float lastEndX = Float.NaN;
        private int currentPage = 1;

        LineCollector() throws IOException {
            super();
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            if (text == null || text.isBlank() || positions == null || positions.isEmpty()) {
                return;
            }
            TextPosition first = positions.get(0);
            TextPosition last = positions.get(positions.size() - 1);
            float y = first.getYDirAdj();
            float x = first.getXDirAdj();
            float font = 0f;
            for (TextPosition position : positions) {
                font = Math.max(font, position.getFontSizeInPt());
            }

            boolean newBaseline = !Float.isNaN(currentY)
                    && Math.abs(y - currentY) > Math.max(1.5f, 0.5f * Math.max(font, currentMaxFont));
            boolean columnJump = !Float.isNaN(lastEndX) && (x - lastEndX) > 4f * Math.max(font, 1f);
            if (newBaseline || columnJump) {
                flushLine();
            }
            if (Float.isNaN(currentY)) {
                currentY = y;
                currentPage = getCurrentPageNo();
            }
            current.append(text);
            currentMaxFont = Math.max(currentMaxFont, font);
            lastEndX = last.getXDirAdj() + last.getWidthDirAdj();
        }

        @Override
        protected void writeWordSeparator() {
            if (current.length() > 0 && current.charAt(current.length() - 1) != ' ') {
                current.append(' ');
            }
        }

        @Override
        protected void writeLineSeparator() {
            flushLine();
        }

        @Override
        protected void endPage(PDPage page) throws IOException {
            flushLine();
            super.endPage(page);
        }

        private void flushLine() {
            String text = current.toString().trim();
            if (!text.isEmpty()) {
                lines.add(new PdfMetadataParser.TextLine(currentPage, text, currentMaxFont));
            }
            current.setLength(0);
            currentY = Float.NaN;
            currentMaxFont = 0f;
            lastEndX = Float.NaN;
        }

        List<PdfMetadataParser.TextLine> collectedLines() {
            flushLine();
            return lines;
        }
    }
}