// riis-backend/src/test/java/com/geeks/riis_backend/service/PdfMetadataParserTest.java
package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.geeks.riis_backend.service.PdfMetadataParser.ParsedMetadata;
import com.geeks.riis_backend.service.PdfMetadataParser.TextLine;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Pure unit tests: no Spring context, no PDFs. */
class PdfMetadataParserTest {

    private static TextLine line(String text, float font) {
        return new TextLine(1, text, font);
    }

    private static String words(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append("word").append(i % 50).append(i % 12 == 11 ? ". " : " ");
        }
        return sb.toString().trim();
    }

    private static List<String> wrap(String text, int perLine) {
        String[] w = text.split(" ");
        List<String> out = new ArrayList<>();
        for (int i = 0; i < w.length; i += perLine) {
            out.add(String.join(" ", Arrays.copyOfRange(w, i, Math.min(w.length, i + perLine))));
        }
        return out;
    }

    private static int wordCount(String s) {
        return s.trim().split("\\s+").length;
    }

    @Test
    void parsesJournalStyleFrontMatter() {
        List<TextLine> l = new ArrayList<>();
        l.add(line("Journal of Regional Science 12 (2024) 45-60", 8f));
        l.add(line("Flood Risk Assessment in Bohol Using SAR Imagery", 18f));
        l.add(line("and Geographic Information Systems", 18f));
        l.add(line("Juan Dela Cruz\u00B9, Maria Pe\u00F1a\u00B2*, and Pedro Santos\u00B9", 11f));
        l.add(line("1 Department of Geodetic Engineering, University of San Carlos, Cebu, Philippines", 9f));
        l.add(line("Email: juan@usc.edu.ph", 9f));
        l.add(line("https://doi.org/10.1234/jrs.2024.045.", 9f));
        l.add(line("Abstract", 11f));
        wrap(words(130), 14).forEach(s -> l.add(line(s, 10f)));
        l.add(line("Keywords: flood risk; SAR imagery; GIS; Bohol; hazard mapping", 10f));
        l.add(line("1. Introduction", 12f));
        l.add(line("Floods are common.", 10f));

        ParsedMetadata r = PdfMetadataParser.parse(l);

        assertEquals("Flood Risk Assessment in Bohol Using SAR Imagery and Geographic Information Systems", r.title());
        assertEquals(List.of("Juan Dela Cruz", "Maria Pena", "Pedro Santos"), r.authors());
        assertEquals(130, wordCount(r.abstractText()));
        assertEquals(List.of("flood risk", "SAR imagery", "GIS", "Bohol", "hazard mapping"), r.keywords());
        assertEquals("10.1234/jrs.2024.045", r.doi());
        assertEquals("HIGH", r.confidence().get("title"));
        assertEquals("HIGH", r.confidence().get("abstractText"));
    }

    @Test
    void parsesThesisStyleWithSeparateAbstractHeadingAndWrappedKeywords() {
        List<TextLine> l = new ArrayList<>();
        l.add(line("CEBU INSTITUTE OF TECHNOLOGY - UNIVERSITY", 14f));
        l.add(line("DEVELOPMENT OF A REGIONAL RESEARCH INFORMATION SYSTEM", 16f));
        l.add(line("FOR DOST REGION VII", 16f));
        l.add(line("Francis Carl Abelgas, Karylle Amad, Danise Bianca Catamco", 12f));
        l.add(line("College of Computer Studies", 11f));
        l.add(line("ABSTRACT", 12f));
        wrap(words(110), 12).forEach(s -> l.add(line(s, 11f)));
        l.add(line("Keywords: research information system, semantic search,", 11f));
        l.add(line("similarity detection, regional development", 11f));
        l.add(line("INTRODUCTION", 12f));

        ParsedMetadata r = PdfMetadataParser.parse(l);

        assertEquals("DEVELOPMENT OF A REGIONAL RESEARCH INFORMATION SYSTEM FOR DOST REGION VII", r.title());
        assertTrue(r.warnings().stream().anyMatch(w -> w.contains("ALL CAPS")));
        assertEquals(List.of("Francis Carl Abelgas", "Karylle Amad", "Danise Bianca Catamco"), r.authors());
        assertEquals(List.of("research information system", "semantic search",
                "similarity detection", "regional development"), r.keywords());
        assertEquals(110, wordCount(r.abstractText()));
    }

    @Test
    void parsesSpacedLetterHeadingsAndOneKeywordPerLine() {
        List<TextLine> l = new ArrayList<>();
        l.add(line("Machine Learning for Crop Yield Prediction", 20f));
        l.add(line("Ana Reyes a, Luis Garcia b", 11f));
        l.add(line("a Department of Agriculture, Visayas State University", 9f));
        l.add(line("A R T I C L E I N F O", 8f));
        l.add(line("Keywords:", 9f));
        l.add(line("Crop yield", 9f));
        l.add(line("Machine learning", 9f));
        l.add(line("Remote sensing", 9f));
        l.add(line("A B S T R A C T", 9f));
        wrap(words(120), 12).forEach(s -> l.add(line(s, 9f)));
        l.add(line("1. Introduction", 11f));

        ParsedMetadata r = PdfMetadataParser.parse(l);

        assertEquals("Machine Learning for Crop Yield Prediction", r.title());
        assertEquals(List.of("Ana Reyes", "Luis Garcia"), r.authors());
        assertEquals(List.of("Crop yield", "Machine learning", "Remote sensing"), r.keywords());
        assertEquals(120, wordCount(r.abstractText()));
    }

    @Test
    void fallsBackToFirstLineWhenFontSizesAreUnknown() {
        List<TextLine> l = new ArrayList<>();
        l.add(line("Community Extension Programs and Livelihood Outcomes", 0f));
        l.add(line("Rosa Mendoza and Carlo Tan", 0f));
        l.add(line("Cebu Normal University", 0f));
        l.add(line("Abstract: " + words(105), 0f));
        l.add(line("Keywords: livelihood, extension, outcomes", 0f));

        ParsedMetadata r = PdfMetadataParser.parse(l);

        assertEquals("Community Extension Programs and Livelihood Outcomes", r.title());
        assertEquals("LOW", r.confidence().get("title"));
        assertEquals(List.of("Rosa Mendoza", "Carlo Tan"), r.authors());
        assertEquals(105, wordCount(r.abstractText()));
    }

    @Test
    void trimsOverlongAbstractAndCleansHonorificsAndSurnameFirstNames() {
        List<TextLine> l = new ArrayList<>();
        l.add(line("A Very Long Abstract Study of Things", 18f));
        l.add(line("Dr. Jose Rizal, PhD; Cruz, Juan; SANTOS, MARIA", 11f));
        l.add(line("Abstract", 11f));
        wrap(words(700), 14).forEach(s -> l.add(line(s, 10f)));

        ParsedMetadata r = PdfMetadataParser.parse(l);

        assertTrue(wordCount(r.abstractText()) <= 500);
        assertTrue(r.warnings().stream().anyMatch(w -> w.contains("shortened")));
        assertEquals(List.of("Jose Rizal", "Juan Cruz", "Maria Santos"), r.authors());
    }

    @Test
    void sanitisesKeywordsToTheFrontendPattern() {
        List<String> warnings = new ArrayList<>();
        List<String> kws = PdfMetadataParser.splitKeywords(
                "AI/ML; data (open); 2024; machine learning; AI/ML; caf\u00E9 culture; a", warnings);
        assertEquals(List.of("AI/ML", "data (open)", "machine learning", "cafe culture"), kws);
    }

    @Test
    void neverThrowsOnEmptyNullOrGarbageInput() {
        assertFalse(PdfMetadataParser.parse(List.of()).hasAnyField());
        assertFalse(PdfMetadataParser.parse(null).hasAnyField());
        ParsedMetadata garbage = PdfMetadataParser.parse(
                List.of(line("\u0000\u0001  ", 0f), line("   ", 0f)));
        assertFalse(garbage.hasAnyField());
        assertNotNull(garbage.confidence());
        assertNull(garbage.title());
    }
}