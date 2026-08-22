package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.InstitutionExportDataDTO;
import com.geeks.riis_backend.dto.ResearchOutputExportRowDTO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

/**
 * Pure formatting layer: takes the already-filtered, already-materialized
 * export DTOs and turns them into PDF or CSV bytes. Deliberately has no
 * repository/entity dependencies so it can't accidentally touch a lazy
 * association outside a Hibernate session — InstitutionService is
 * responsible for resolving everything (including author names) before
 * building the DTO.
 */
@Service
public class ReportExportService {

    private static final float MARGIN = 50f;
    private static final float TITLE_FONT_SIZE = 16f;
    private static final float SUBHEADING_FONT_SIZE = 11f;
    private static final float BODY_FONT_SIZE = 9f;
    private static final float LINE_HEIGHT = 14f;
    private static final float TEXT_WIDTH = PDRectangle.LETTER.getWidth() - (2 * MARGIN);

    private static final PDType1Font HELVETICA = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDType1Font HELVETICA_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDType1Font HELVETICA_OBLIQUE = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

    private static final DateTimeFormatter GENERATED_AT_FORMAT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy h:mm a");

    public byte[] generateCsv(InstitutionExportDataDTO data) {
        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM so Excel opens accented characters correctly.
        sb.append('\uFEFF');
        sb.append("Title,Research Type,Completion Year,Funding Source,Publication Venue,")
                .append("Principal Investigator,DOI,Authors\n");

        for (ResearchOutputExportRowDTO row : data.outputs()) {
            sb.append(csvField(row.title())).append(',')
                    .append(csvField(row.researchType())).append(',')
                    .append(csvField(row.completionYear() != null ? row.completionYear().toString() : "")).append(',')
                    .append(csvField(row.fundingSource())).append(',')
                    .append(csvField(row.publicationVenue())).append(',')
                    .append(csvField(row.principalInvestigator())).append(',')
                    .append(csvField(row.doi())).append(',')
                    .append(csvField(String.join("; ", row.authorNames()))).append('\n');
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] generatePdf(InstitutionExportDataDTO data) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PdfCursor cursor = new PdfCursor(document);

            cursor.writeTitle(data.institutionName() + " - Research Output Report");
            cursor.writeSubheading(subheadingLine(data));
            cursor.writeBody("Generated " + LocalDateTime.now().format(GENERATED_AT_FORMAT));
            cursor.blankLine();

            if (data.outputs().isEmpty()) {
                cursor.writeBody("No research outputs match the current filters.");
            } else {
                for (ResearchOutputExportRowDTO row : data.outputs()) {
                    cursor.writeEntry(row);
                }
            }

            cursor.close();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate PDF report", e);
        }
    }

    private String subheadingLine(InstitutionExportDataDTO data) {
        StringBuilder sb = new StringBuilder();
        if (data.institutionType() != null && !data.institutionType().isBlank()) {
            sb.append(data.institutionType());
        }
        if (data.institutionProvince() != null && !data.institutionProvince().isBlank()) {
            if (sb.length() > 0) sb.append("  \u00b7  ");
            sb.append(data.institutionProvince());
        }
        int count = data.outputs().size();
        if (sb.length() > 0) sb.append("  \u00b7  ");
        sb.append(count).append(" research output").append(count == 1 ? "" : "s");
        return sb.toString();
    }

    private String csvField(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    /**
     * Owns the current PDPageContentStream and Y cursor, creating a new page
     * automatically when content would run off the bottom of the page.
     */
    private static class PdfCursor {
        private final PDDocument document;
        private PDPageContentStream stream;
        private float y;

        PdfCursor(PDDocument document) throws IOException {
            this.document = document;
            newPage();
        }

        void writeTitle(String text) throws IOException {
            ensureSpace(LINE_HEIGHT * 2);
            write(text, HELVETICA_BOLD, TITLE_FONT_SIZE);
            y -= 6;
        }

        void writeSubheading(String text) throws IOException {
            ensureSpace(LINE_HEIGHT);
            write(text, HELVETICA, SUBHEADING_FONT_SIZE);
        }

        void blankLine() {
            y -= LINE_HEIGHT / 2;
        }

        void writeBody(String text) throws IOException {
            for (String line : wrap(text, HELVETICA, BODY_FONT_SIZE)) {
                ensureSpace(LINE_HEIGHT);
                write(line, HELVETICA, BODY_FONT_SIZE);
            }
        }

        void writeEntry(ResearchOutputExportRowDTO row) throws IOException {
            ensureSpace(LINE_HEIGHT * 2);
            for (String line : wrap(nullToDash(row.title()), HELVETICA_BOLD, BODY_FONT_SIZE + 1)) {
                ensureSpace(LINE_HEIGHT);
                write(line, HELVETICA_BOLD, BODY_FONT_SIZE + 1);
            }

            String meta = String.join("  \u00b7  ",
                    nullToDash(row.researchType()),
                    row.completionYear() != null ? row.completionYear().toString() : "\u2014",
                    nullToDash(row.fundingSource()));
            ensureSpace(LINE_HEIGHT);
            write(meta, HELVETICA_OBLIQUE, BODY_FONT_SIZE);

            if (!row.authorNames().isEmpty()) {
                for (String line : wrap("Authors: " + String.join("; ", row.authorNames()), HELVETICA, BODY_FONT_SIZE)) {
                    ensureSpace(LINE_HEIGHT);
                    write(line, HELVETICA, BODY_FONT_SIZE);
                }
            }

            if (row.doi() != null && !row.doi().isBlank()) {
                ensureSpace(LINE_HEIGHT);
                write("DOI: " + row.doi(), HELVETICA, BODY_FONT_SIZE);
            }

            y -= LINE_HEIGHT / 2;
        }

        private List<String> wrap(String text, PDType1Font font, float fontSize) throws IOException {
            List<String> lines = new ArrayList<>();
            if (text == null || text.isBlank()) {
                lines.add("");
                return lines;
            }

            String[] words = text.split("\\s+");
            StringBuilder current = new StringBuilder();
            for (String word : words) {
                String candidate = current.length() == 0 ? word : current + " " + word;
                float width = font.getStringWidth(sanitize(candidate)) / 1000f * fontSize;
                if (width > TEXT_WIDTH && current.length() > 0) {
                    lines.add(current.toString());
                    current = new StringBuilder(word);
                } else {
                    current = new StringBuilder(candidate);
                }
            }
            if (current.length() > 0) {
                lines.add(current.toString());
            }
            return lines;
        }

        private void write(String text, PDType1Font font, float fontSize) throws IOException {
            stream.beginText();
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(MARGIN, y);
            stream.showText(sanitize(text));
            stream.endText();
            y -= LINE_HEIGHT;
        }

        private void ensureSpace(float needed) throws IOException {
            if (y - needed < MARGIN) {
                newPage();
            }
        }

        private void newPage() throws IOException {
            if (stream != null) stream.close();
            PDPage page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            y = PDRectangle.LETTER.getHeight() - MARGIN;
        }

        private String sanitize(String text) {
            // Standard14 Helvetica only supports WinAnsiEncoding; strip
            // anything outside basic Latin/Latin-1 so showText() never throws.
            return text.replaceAll("[^\\x00-\\xFF]", "?");
        }

        private String nullToDash(String value) {
            return value == null || value.isBlank() ? "\u2014" : value;
        }

        void close() throws IOException {
            stream.close();
        }
    }
}