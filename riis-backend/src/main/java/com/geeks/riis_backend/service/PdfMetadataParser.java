// riis-backend/src/main/java/com/geeks/riis_backend/service/PdfMetadataParser.java
package com.geeks.riis_backend.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rule/heuristic parser that turns the first pages of a research paper
 * (already split into lines, each tagged with its largest font size) into
 * the values the DASIG submission form asks for: title, authors, abstract,
 * keywords and DOI.
 *
 * <p>Deliberately free of Spring, PDFBox and Lombok so it is a pure function:
 * {@code List<TextLine> -> ParsedMetadata}. That keeps it trivially unit-testable
 * and means a parsing bug can never turn into a 500 -- {@link #parse(List)} never
 * throws for any input.
 *
 * <p>Everything returned is <b>advisory</b>. Output is pre-sanitised so that it
 * satisfies the frontend Zod rules in SubmissionPortal.jsx (ASCII names, keyword
 * pattern, abstract word cap, title length cap), but the HEI officer always
 * reviews and may edit before submitting.
 */
public final class PdfMetadataParser {

    public static final String HIGH = "HIGH";
    public static final String MEDIUM = "MEDIUM";
    public static final String LOW = "LOW";
    public static final String NONE = "NONE";

    static final int MAX_TITLE_CHARS = 500;
    static final int MAX_ABSTRACT_WORDS = 500;
    static final int MIN_ABSTRACT_WORDS = 100;
    static final int MAX_KEYWORDS = 10;
    static final int MIN_KEYWORDS = 3;
    static final int MAX_KEYWORD_WORDS = 6;
    static final int MAX_KEYWORD_CHARS = 60;
    static final int MAX_AUTHORS = 15;
    private static final int MAX_TITLE_LINES = 4;
    private static final int TITLE_SEARCH_WINDOW = 25;
    private static final int AUTHOR_ZONE_MAX_LINES = 8;
    private static final int KEYWORD_MAX_EXTRA_LINES = 3;

    /** One visual line of text; {@code fontSize} is the largest glyph size on the line (0 if unknown). */
    public record TextLine(int page, String text, float fontSize) {}

    public record ParsedMetadata(
            String title,
            List<String> authors,
            String abstractText,
            List<String> keywords,
            String doi,
            Map<String, String> confidence,
            List<String> warnings
    ) {
        public boolean hasAnyField() {
            return title != null || !authors.isEmpty() || abstractText != null
                    || !keywords.isEmpty() || doi != null;
        }
    }

    // ---------------------------------------------------------------- patterns

    private static final Pattern SPACED_LETTERS = Pattern.compile("^(?:\\p{L} ){3,}\\p{L}$");

    private static final Pattern ABSTRACT_START = Pattern.compile(
            "^(?:abstract|summary)\\b\\s*[:.\\-\\u2013\\u2014]?\\s*(.*)$", Pattern.CASE_INSENSITIVE);

    private static final Pattern KEYWORDS_START = Pattern.compile(
            "^(?:author\\s+)?(?:key\\s*-?\\s*words?|index\\s+terms?)\\b\\s*[:.\\-\\u2013\\u2014]?\\s*(.*)$",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern SECTION_HEADING = Pattern.compile(
            "^(?:(?:\\d+|[IVX]+)[.)]?\\s+)?(?:introduction|background|literature review|related work|"
                    + "review of related literature|methodology|methods?|materials and methods|"
                    + "statement of the problem|rationale)\\s*$", Pattern.CASE_INSENSITIVE);

    private static final Pattern NUMBERED_HEADING = Pattern.compile("^\\d+\\.?\\s+\\p{Lu}[\\p{L} ]{2,40}$");

    private static final Pattern BOILERPLATE = Pattern.compile(
            "^(?:journal\\b|international journal|proceedings|vol\\.?\\s*\\d|volume\\b|issn|e-?issn|isbn|"
                    + "doi\\b|https?:|www\\.|copyright|\\u00A9|received\\b|accepted\\b|published\\b|"
                    + "available online|research article|original article|review article|short communication|"
                    + "article info|full length article|corresponding author|citation:|cite this)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern AFFILIATION = Pattern.compile(
            "\\b(?:university|universities|institute|college|department|dept\\.?|school|laborator(?:y|ies)|"
                    + "centre|center|faculty|division|hospital|polytechnic|academy|foundation|"
                    + "corporation|ltd|philippines|philippine|cebu|manila|davao|region)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+");

    private static final Pattern DOI = Pattern.compile("\\b(10\\.\\d{4,9}/[-._;()/:A-Za-z0-9]+)");

    private static final Pattern SUPERSCRIPTS = Pattern.compile("[\\u00B2\\u00B3\\u00B9\\u2070-\\u209F*\\u2020\\u2021\\u00A7\\u00B6#]");

    private static final Pattern ATTACHED_MARKERS = Pattern.compile("(?<=\\p{L})\\d+(?:\\s*,\\s*\\d+)*");

    private static final Pattern HONORIFIC_PREFIX = Pattern.compile(
            "^(?:dr|prof|engr|ar|atty|mr|mrs|ms|assoc|asst)\\.?\\s+", Pattern.CASE_INSENSITIVE);

    private static final Pattern DEGREE_SUFFIX = Pattern.compile(
            "\\b(?:ph\\.?\\s?d\\.?|m\\.?d\\.?|msc|m\\.?s\\.?|mba|rn|rmt|dpm|cpa)\\b\\.?", Pattern.CASE_INSENSITIVE);

    private static final Pattern NAME_ALLOWED = Pattern.compile("^[A-Za-z]+(?:[ '.\\-]+[A-Za-z]+)*\\.?$");

    private PdfMetadataParser() {
    }

    // ------------------------------------------------------------------ entry

    public static ParsedMetadata parse(List<TextLine> rawLines) {
        List<String> warnings = new ArrayList<>();
        Map<String, String> confidence = new LinkedHashMap<>();
        confidence.put("title", NONE);
        confidence.put("authors", NONE);
        confidence.put("abstractText", NONE);
        confidence.put("keywords", NONE);
        confidence.put("doi", NONE);

        try {
            List<TextLine> lines = normalise(rawLines);
            if (lines.isEmpty()) {
                return new ParsedMetadata(null, List.of(), null, List.of(), null, confidence, warnings);
            }
            int firstPage = lines.get(0).page();
            List<TextLine> page1 = lines.stream().filter(l -> l.page() == firstPage).toList();

            // Where the "front matter" ends on the first page: the abstract or keywords heading.
            int limitIdx = Math.min(page1.size(), TITLE_SEARCH_WINDOW);
            for (int i = 0; i < page1.size() && i < TITLE_SEARCH_WINDOW * 2; i++) {
                String t = page1.get(i).text();
                if (matchesAbstractHeading(t) || KEYWORDS_START.matcher(t).matches()) {
                    limitIdx = Math.min(limitIdx, i);
                    break;
                }
            }

            TitleResult titleResult = extractTitle(page1, limitIdx, warnings);
            if (titleResult.title != null) {
                confidence.put("title", titleResult.confidence);
            }

            List<String> authors = extractAuthors(page1, titleResult.endIdx, limitIdx, warnings, confidence);

            // Abstract/keywords search the whole parsed range, starting after the title block.
            int searchFrom = 0;
            if (titleResult.endIdx >= 0) {
                searchFrom = lines.indexOf(page1.get(titleResult.endIdx)) + 1;
            }
            String abstractText = extractAbstract(lines, searchFrom, warnings, confidence);
            List<String> keywords = extractKeywords(lines, warnings, confidence);
            String doi = extractDoi(page1, confidence);

            if (abstractText == null && titleResult.title != null) {
                warnings.add("No 'Abstract' heading was found - please paste or type the abstract.");
            }

            return new ParsedMetadata(
                    titleResult.title, authors, abstractText, keywords, doi, confidence, warnings);
        } catch (RuntimeException e) {
            // Fail closed: parsing is a convenience, never a reason to fail a request.
            warnings.add("Some details could not be read automatically. Please fill the form manually.");
            return new ParsedMetadata(null, List.of(), null, List.of(), null, confidence, warnings);
        }
    }

    // --------------------------------------------------------------- helpers

    private static List<TextLine> normalise(List<TextLine> raw) {
        List<TextLine> out = new ArrayList<>();
        if (raw == null) {
            return out;
        }
        for (TextLine line : raw) {
            if (line == null || line.text() == null) {
                continue;
            }
            String text = line.text().replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", " ").replaceAll("\\s+", " ").trim();
            if (text.isEmpty()) {
                continue;
            }
            if (SPACED_LETTERS.matcher(text).matches()) {
                text = text.replace(" ", ""); // "A B S T R A C T" -> "ABSTRACT"
            }
            out.add(new TextLine(line.page(), text, line.fontSize()));
        }
        return out;
    }

    private static boolean matchesAbstractHeading(String text) {
        return ABSTRACT_START.matcher(text).matches();
    }

    private static boolean isBoilerplate(String text) {
        if (text.length() < 4) {
            return true;
        }
        if (text.matches("^[\\d\\s./-]+$")) {
            return true; // page numbers, dates
        }
        return BOILERPLATE.matcher(text).find() || EMAIL.matcher(text).find() || text.contains("http");
    }

    private static String stripDiacritics(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }

    private static int wordCount(String value) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
    }

    /** Joins wrapped lines, repairing a word hyphenated across a line break. */
    private static String joinLines(List<String> parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (sb.length() == 0) {
                sb.append(part);
                continue;
            }
            char last = sb.charAt(sb.length() - 1);
            char first = part.charAt(0);
            if (last == '-' && sb.length() > 1 && Character.isLetter(sb.charAt(sb.length() - 2))
                    && Character.isLowerCase(first)) {
                sb.setLength(sb.length() - 1);
                sb.append(part);
            } else {
                sb.append(' ').append(part);
            }
        }
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    // ------------------------------------------------------------------ title

    private record TitleResult(String title, int endIdx, String confidence) {}

    private static TitleResult extractTitle(List<TextLine> page1, int limitIdx, List<String> warnings) {
        List<Integer> eligible = new ArrayList<>();
        for (int i = 0; i < limitIdx; i++) {
            String text = page1.get(i).text();
            if (!isBoilerplate(text) && !DOI.matcher(text).find()) {
                eligible.add(i);
            }
        }
        if (eligible.isEmpty()) {
            return new TitleResult(null, -1, NONE);
        }

        float maxFont = 0f;
        float minFont = Float.MAX_VALUE;
        for (int idx : eligible) {
            float f = page1.get(idx).fontSize();
            maxFont = Math.max(maxFont, f);
            if (f > 0f) {
                minFont = Math.min(minFont, f);
            }
        }
        boolean fontVaries = maxFont > 0f && minFont != Float.MAX_VALUE && (maxFont - minFont) > 0.75f;

        List<Integer> block = new ArrayList<>();
        String confidence;
        if (fontVaries) {
            // Largest-type heading block. Ignore very short lines (logos, "FIGURE 1").
            Integer start = null;
            for (int idx : eligible) {
                TextLine l = page1.get(idx);
                if (l.fontSize() >= maxFont * 0.95f && l.text().length() >= 6) {
                    start = idx;
                    break;
                }
            }
            if (start == null) {
                return new TitleResult(null, -1, NONE);
            }
            block.add(start);
            float blockFont = page1.get(start).fontSize();
            int chars = page1.get(start).text().length();
            int cursor = start;
            while (block.size() < MAX_TITLE_LINES && chars < 300) {
                int next = cursor + 1;
                if (next >= limitIdx || !eligible.contains(next)) {
                    break;
                }
                TextLine l = page1.get(next);
                float tolerance = Math.max(0.6f, blockFont * 0.04f);
                if (Math.abs(l.fontSize() - blockFont) > tolerance) {
                    break;
                }
                block.add(next);
                chars += l.text().length();
                cursor = next;
            }
            confidence = (blockFont >= medianFont(page1, limitIdx) * 1.15f && block.size() <= 3) ? HIGH : MEDIUM;
        } else {
            // No usable font information: take the first plausible line, plus one wrapped
            // continuation line when the first one clearly doesn't end a sentence.
            int first = eligible.get(0);
            block.add(first);
            String text = page1.get(first).text();
            int next = first + 1;
            if (text.length() < 90 && !text.endsWith(".") && next < limitIdx && eligible.contains(next)
                    && Character.isLowerCase(page1.get(next).text().charAt(0))) {
                block.add(next);
            }
            confidence = LOW;
        }

        List<String> parts = new ArrayList<>();
        for (int idx : block) {
            parts.add(page1.get(idx).text());
        }
        String title = joinLines(parts).replaceAll("[*\\u2020\\u2021\\u00A7]+$", "").trim();
        if (title.length() < 8) {
            return new TitleResult(null, -1, NONE);
        }
        if (title.length() > MAX_TITLE_CHARS) {
            title = title.substring(0, MAX_TITLE_CHARS).trim();
            warnings.add("The title was longer than " + MAX_TITLE_CHARS + " characters and was shortened.");
        }
        if (title.equals(title.toUpperCase(Locale.ROOT)) && title.chars().filter(Character::isLetter).count() > 12) {
            warnings.add("The title is in ALL CAPS - please check the capitalisation.");
        }
        return new TitleResult(title, block.get(block.size() - 1), confidence);
    }

    private static float medianFont(List<TextLine> page1, int limitIdx) {
        List<Float> sizes = new ArrayList<>();
        for (int i = 0; i < page1.size(); i++) {
            float f = page1.get(i).fontSize();
            if (f > 0f) {
                sizes.add(f);
            }
        }
        if (sizes.isEmpty()) {
            return 0f;
        }
        sizes.sort(Float::compare);
        return sizes.get(sizes.size() / 2);
    }

    // ---------------------------------------------------------------- authors

    private static List<String> extractAuthors(
            List<TextLine> page1, int titleEndIdx, int limitIdx, List<String> warnings, Map<String, String> confidence) {
        if (titleEndIdx < 0) {
            return List.of();
        }
        List<String> names = new ArrayList<>();
        boolean stoppedAtBoundary = false;
        int scanned = 0;
        for (int i = titleEndIdx + 1; i < page1.size() && scanned < AUTHOR_ZONE_MAX_LINES; i++, scanned++) {
            String text = page1.get(i).text();
            if (i >= limitIdx || matchesAbstractHeading(text) || KEYWORDS_START.matcher(text).matches()) {
                stoppedAtBoundary = true;
                break;
            }
            if (isBoilerplate(text)) {
                if (!names.isEmpty()) {
                    stoppedAtBoundary = true;
                    break;
                }
                continue;
            }
            if (AFFILIATION.matcher(text).find() || text.matches("^\\d.*")) {
                stoppedAtBoundary = true;
                break;
            }
            names.addAll(namesFromLine(text));
        }

        List<String> deduped = new ArrayList<>(new LinkedHashSet<>(names));
        if (deduped.size() > MAX_AUTHORS) {
            deduped = new ArrayList<>(deduped.subList(0, MAX_AUTHORS));
            warnings.add("Only the first " + MAX_AUTHORS + " authors were pre-filled.");
        }
        if (deduped.isEmpty()) {
            warnings.add("Authors could not be read automatically - please add them in Step 2.");
        } else {
            confidence.put("authors", stoppedAtBoundary ? MEDIUM : LOW);
            warnings.add("Author names are the least reliable part of automatic extraction - please verify each one.");
        }
        return deduped;
    }

    static List<String> namesFromLine(String rawLine) {
        String line = EMAIL.matcher(rawLine).replaceAll(" ");
        line = SUPERSCRIPTS.matcher(line).replaceAll("");
        line = ATTACHED_MARKERS.matcher(line).replaceAll("");
        line = line.replaceAll("\\b\\d+\\b", " ");
        line = line.replaceAll("(?i)\\s+(?:and|&)\\s+", ",");

        List<String> out = new ArrayList<>();
        boolean surnameFirst = line.contains(";");
        for (String chunk : line.split(surnameFirst ? "[;\\u00B7\\u2022|]" : "[,;\\u00B7\\u2022|]")) {
            String candidate = DEGREE_SUFFIX.matcher(chunk).replaceAll(" ").replaceAll("[,\\s]+$", "").trim();
            if (surnameFirst && candidate.contains(",")) {
                String[] halves = candidate.split(",", 2); // "Cruz, Juan" -> "Juan Cruz"
                candidate = halves[1].trim() + " " + halves[0].trim();
            }
            String clean = cleanName(candidate);
            if (clean != null) {
                out.add(clean);
            }
        }
        return out;
    }

    private static String cleanName(String candidate) {
        String name = stripDiacritics(candidate);
        name = DEGREE_SUFFIX.matcher(name).replaceAll(" ").trim();
        name = HONORIFIC_PREFIX.matcher(name).replaceFirst("");
        // Lone lowercase letters are affiliation labels ("Ana Reyes a"), never part of a name.
        name = name.replaceAll("(?<![A-Za-z'.-])[a-z](?![A-Za-z'.-])", " ");
        name = name.replaceAll("[^A-Za-z\\s'.\\-]", " ").replaceAll("\\s+", " ").trim();
        if (name.isEmpty() || name.length() < 4 || name.length() > 80 || AFFILIATION.matcher(name).find()) {
            return null;
        }
        String[] tokens = name.split(" ");
        if (tokens.length < 2 || tokens.length > 6) {
            return null;
        }
        int meaningful = 0;
        for (String token : tokens) {
            if (token.replaceAll("[^A-Za-z]", "").length() >= 2) {
                meaningful++;
            }
        }
        if (meaningful < 1 || !NAME_ALLOWED.matcher(name).matches()) {
            return null;
        }
        boolean allCaps = name.equals(name.toUpperCase(Locale.ROOT));
        return allCaps ? toTitleCase(name) : name;
    }

    private static String toTitleCase(String value) {
        StringBuilder sb = new StringBuilder();
        boolean upperNext = true;
        for (char c : value.toLowerCase(Locale.ROOT).toCharArray()) {
            sb.append(upperNext && Character.isLetter(c) ? Character.toUpperCase(c) : c);
            upperNext = c == ' ' || c == '-' || c == '\'' || c == '.';
        }
        return sb.toString();
    }

    // --------------------------------------------------------------- abstract

    private static String extractAbstract(
            List<TextLine> lines, int searchFrom, List<String> warnings, Map<String, String> confidence) {
        int start = -1;
        String firstChunk = "";
        for (int i = Math.max(0, searchFrom); i < lines.size(); i++) {
            String text = lines.get(i).text();
            if (matchesAbstractHeading(text)) {
                Matcher m = ABSTRACT_START.matcher(text);
                if (m.matches()) {
                    start = i;
                    firstChunk = m.group(1).trim();
                    break;
                }
            }
        }
        if (start < 0) {
            return null;
        }

        List<String> parts = new ArrayList<>();
        if (!firstChunk.isEmpty()) {
            parts.add(firstChunk);
        }
        boolean terminated = false;
        int words = wordCount(firstChunk);
        for (int i = start + 1; i < lines.size(); i++) {
            String text = lines.get(i).text();
            if (isAbstractTerminator(text, words)) {
                terminated = true;
                break;
            }
            parts.add(text);
            words += wordCount(text);
            if (words > MAX_ABSTRACT_WORDS * 2) {
                break; // runaway: no terminator found; trimmed below
            }
        }
        if (parts.isEmpty()) {
            return null;
        }

        String abstractText = joinLines(parts);
        if (wordCount(abstractText) > MAX_ABSTRACT_WORDS) {
            abstractText = trimToWords(abstractText, MAX_ABSTRACT_WORDS);
            warnings.add("The abstract was longer than " + MAX_ABSTRACT_WORDS
                    + " words and was shortened - please check where it ends.");
            terminated = false;
        }
        int finalWords = wordCount(abstractText);
        String level = terminated ? HIGH : MEDIUM;
        if (finalWords < MIN_ABSTRACT_WORDS) {
            warnings.add("The abstract has " + finalWords + " words; the form needs " + MIN_ABSTRACT_WORDS + "-"
                    + MAX_ABSTRACT_WORDS + ". It may be cut off or incomplete.");
            level = LOW;
        }
        confidence.put("abstractText", level);
        return abstractText;
    }

    private static boolean isAbstractTerminator(String text, int wordsSoFar) {
        if (KEYWORDS_START.matcher(text).matches() || SECTION_HEADING.matcher(text).matches()) {
            return true;
        }
        if (wordsSoFar < 30) {
            return false; // too early to trust looser rules
        }
        return NUMBERED_HEADING.matcher(text).matches()
                || BOILERPLATE.matcher(text).find()
                || (text.length() < 60 && text.equals(text.toUpperCase(Locale.ROOT))
                && text.chars().filter(Character::isLetter).count() >= 5);
    }

    private static String trimToWords(String text, int maxWords) {
        String[] words = text.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        int lastSentenceEnd = -1;
        for (int i = 0; i < maxWords && i < words.length; i++) {
            if (i > 0) {
                sb.append(' ');
            }
            sb.append(words[i]);
            if (words[i].matches(".*[.!?][\"')\\]]?$")) {
                lastSentenceEnd = sb.length();
            }
        }
        // Prefer ending on a full sentence if we kept at least 60% of the allowance.
        if (lastSentenceEnd > 0 && wordCount(sb.substring(0, lastSentenceEnd)) >= maxWords * 0.6) {
            return sb.substring(0, lastSentenceEnd).trim();
        }
        return sb.toString().trim();
    }

    // --------------------------------------------------------------- keywords

    private static List<String> extractKeywords(
            List<TextLine> lines, List<String> warnings, Map<String, String> confidence) {
        for (int i = 0; i < lines.size(); i++) {
            Matcher m = KEYWORDS_START.matcher(lines.get(i).text());
            if (!m.matches()) {
                continue;
            }
            StringBuilder raw = new StringBuilder(m.group(1).trim());
            boolean listStyle = raw.length() == 0; // "Keywords:" alone, one keyword per following line
            int extra = 0;
            int maxExtra = listStyle ? MAX_KEYWORDS + 2 : KEYWORD_MAX_EXTRA_LINES;
            while (extra < maxExtra && i + 1 + extra < lines.size()) {
                String next = lines.get(i + 1 + extra).text();
                if (SECTION_HEADING.matcher(next).matches() || NUMBERED_HEADING.matcher(next).matches()
                        || matchesAbstractHeading(next) || BOILERPLATE.matcher(next).find()) {
                    break;
                }
                if (listStyle) {
                    if (next.length() > MAX_KEYWORD_CHARS || next.endsWith(".")) {
                        break;
                    }
                    raw.append(raw.length() == 0 ? "" : ";").append(next);
                    extra++;
                    continue;
                }
                String soFar = raw.toString().trim();
                boolean continues = soFar.endsWith(",") || soFar.endsWith(";") || soFar.endsWith("-")
                        || Character.isLowerCase(next.charAt(0));
                if (!continues) {
                    break;
                }
                raw.append(' ').append(next);
                extra++;
            }
            List<String> keywords = splitKeywords(raw.toString(), warnings);
            if (!keywords.isEmpty()) {
                confidence.put("keywords", keywords.size() >= MIN_KEYWORDS ? HIGH : MEDIUM);
                if (keywords.size() < MIN_KEYWORDS) {
                    warnings.add("Only " + keywords.size() + " keyword(s) were found; the form needs at least "
                            + MIN_KEYWORDS + ".");
                }
                return keywords;
            }
        }
        return List.of();
    }

    static List<String> splitKeywords(String raw, List<String> warnings) {
        String cleaned = raw.replaceAll("\\.\\s*$", "");
        String[] pieces = cleaned.split("[;,\\u2022\\u00B7|]");
        if (pieces.length == 1 && cleaned.contains("  ")) {
            pieces = cleaned.split("\\s{2,}");
        }
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        boolean droppedLong = false;
        boolean capped = false;
        for (String piece : pieces) {
            String keyword = stripDiacritics(piece)
                    .replaceAll("^\\s*(?:\\d+[.)]|[-\\u2013\\u2014])\\s*", "")
                    .replaceAll("[^A-Za-z0-9\\s./'()-]", " ")
                    .replaceAll("\\s+", " ")
                    .trim()
                    .replaceAll("\\.$", "")
                    .trim();
            if (keyword.length() < 2 || keyword.matches("^\\d+$")) {
                continue;
            }
            if (wordCount(keyword) > MAX_KEYWORD_WORDS || keyword.length() > MAX_KEYWORD_CHARS) {
                droppedLong = true;
                continue;
            }
            if (!seen.add(keyword.toLowerCase(Locale.ROOT))) {
                continue;
            }
            if (out.size() >= MAX_KEYWORDS) {
                capped = true;
                break;
            }
            out.add(keyword);
        }
        if (droppedLong) {
            warnings.add("A keyword phrase was too long to use and was skipped.");
        }
        if (capped) {
            warnings.add("Only the first " + MAX_KEYWORDS + " keywords were pre-filled.");
        }
        return out;
    }

    // -------------------------------------------------------------------- doi

    private static String extractDoi(List<TextLine> page1, Map<String, String> confidence) {
        for (TextLine line : page1) {
            Matcher m = DOI.matcher(line.text());
            if (m.find()) {
                String doi = m.group(1).replaceAll("[.,;:)\\]]+$", "");
                String lower = line.text().toLowerCase(Locale.ROOT);
                confidence.put("doi", (lower.contains("doi") || lower.contains("doi.org")) ? HIGH : MEDIUM);
                return doi;
            }
        }
        return null;
    }
}