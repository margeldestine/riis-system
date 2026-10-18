package com.geeks.riis_backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Pure ranking maths for Priority 5. No Spring, no database, so it is easy to unit test.
 *
 * Three steps:
 *  1. keywordScores: ranked keyword matching (BM25 style) over fields the viewer is allowed to see.
 *  2. fuse:          combines keyword and semantic rankings into one list (Reciprocal Rank Fusion).
 *  3. diversify:     stops one large institution from filling the whole first page,
 *                    so smaller HEIs stay visible. It never looks at how many records an HEI has.
 */
public final class SearchRanker {

    private SearchRanker() {}

    // Keyword scoring settings
    static final double K1 = 1.2;
    static final double B = 0.75;
    static final double W_TITLE = 3.0;
    static final double W_KEYWORDS = 2.5;
    static final double W_AUTHORS = 2.0;
    static final double W_INSTITUTION = 1.0;
    static final double W_ABSTRACT = 1.0;
    /** A document word that only starts with the query word counts this much (so "agri" finds "agriculture"). */
    static final double PREFIX_WEIGHT = 0.5;
    static final int MIN_PREFIX_LENGTH = 3;

    // Fusion settings
    static final int RRF_K = 60;

    // Fairness settings
    public static final int DEFAULT_WINDOW = 10;
    public static final int DEFAULT_MAX_PER_INSTITUTION = 3;
    /** Only promote a record from another institution if it is at least this relevant compared with the best one. */
    static final double MIN_RELEVANCE_RATIO = 0.35;

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it",
            "of", "on", "or", "the", "to", "with", "using", "study", "analysis");

    /**
     * One searchable record. The caller must leave a field blank when the viewer is not
     * allowed to see it, so hidden text can never influence a ranking.
     */
    public record Doc(String id, String institutionId,
                      String title, String keywords, String authors,
                      String institution, String abstractText) {}

    /** An id with a score and the institution it belongs to. */
    public record Scored(String id, String institutionId, double score) {}

    // 1. Keyword scoring

    public static List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        if (text == null || text.isBlank()) return tokens;
        for (String raw : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (raw.length() < 2 || STOP_WORDS.contains(raw)) continue;
            tokens.add(raw);
        }
        return tokens;
    }

    /** Returns id to score for every document that matches at least one query word. Highest score is best. */
    public static Map<String, Double> keywordScores(List<Doc> docs, String query) {
        Map<String, Double> scores = new LinkedHashMap<>();
        List<String> queryTerms = tokenize(query).stream().distinct().toList();
        if (docs.isEmpty() || queryTerms.isEmpty()) return scores;

        int n = docs.size();
        List<Map<String, Integer>[]> fieldCounts = new ArrayList<>(n);
        double[] avgLen = new double[5];
        for (Doc d : docs) {
            @SuppressWarnings("unchecked")
            Map<String, Integer>[] counts = new Map[5];
            counts[0] = count(d.title());
            counts[1] = count(d.keywords());
            counts[2] = count(d.authors());
            counts[3] = count(d.institution());
            counts[4] = count(d.abstractText());
            for (int f = 0; f < 5; f++) avgLen[f] += length(counts[f]);
            fieldCounts.add(counts);
        }
        for (int f = 0; f < 5; f++) avgLen[f] = Math.max(1.0, avgLen[f] / n);
        double[] weights = {W_TITLE, W_KEYWORDS, W_AUTHORS, W_INSTITUTION, W_ABSTRACT};

        // Document frequency per query word (a document counts once if any field matches).
        Map<String, Integer> df = new HashMap<>();
        for (String term : queryTerms) {
            int hits = 0;
            for (Map<String, Integer>[] counts : fieldCounts) {
                for (int f = 0; f < 5; f++) {
                    if (matchStrength(counts[f], term) > 0) { hits++; break; }
                }
            }
            df.put(term, hits);
        }

        for (int i = 0; i < n; i++) {
            Map<String, Integer>[] counts = fieldCounts.get(i);
            double total = 0.0;
            for (String term : queryTerms) {
                double weightedTf = 0.0;
                for (int f = 0; f < 5; f++) {
                    double tf = matchStrength(counts[f], term);
                    if (tf == 0) continue;
                    double lengthNorm = 1.0 - B + B * (length(counts[f]) / avgLen[f]);
                    weightedTf += weights[f] * tf / lengthNorm;
                }
                if (weightedTf == 0) continue;
                double idf = Math.log(1.0 + (n - df.get(term) + 0.5) / (df.get(term) + 0.5));
                total += idf * (weightedTf * (K1 + 1.0)) / (weightedTf + K1);
            }
            if (total > 0) scores.put(docs.get(i).id(), total);
        }
        return scores;
    }

    private static Map<String, Integer> count(String text) {
        Map<String, Integer> m = new HashMap<>();
        for (String t : tokenize(text)) m.merge(t, 1, Integer::sum);
        return m;
    }

    private static double length(Map<String, Integer> counts) {
        double len = 0;
        for (int c : counts.values()) len += c;
        return len;
    }

    private static double matchStrength(Map<String, Integer> counts, String term) {
        double strength = counts.getOrDefault(term, 0);
        if (term.length() >= MIN_PREFIX_LENGTH) {
            for (Map.Entry<String, Integer> e : counts.entrySet()) {
                if (!e.getKey().equals(term) && e.getKey().startsWith(term)) {
                    strength += PREFIX_WEIGHT * e.getValue();
                }
            }
        }
        return strength;
    }

    // 2. Fusion

    /** Turns a score map into ids sorted best first. Ties are broken by id so results are stable. */
    public static List<String> rank(Map<String, Double> scores) {
        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(Map.Entry::getKey)
                .toList();
    }

    /** Reciprocal Rank Fusion. Rewards records that rank well in either list, and best in both. */
    public static Map<String, Double> fuse(List<String> keywordRanking, double keywordWeight,
                                           List<String> semanticRanking, double semanticWeight) {
        Map<String, Double> fused = new HashMap<>();
        for (int i = 0; i < keywordRanking.size(); i++) {
            fused.merge(keywordRanking.get(i), keywordWeight / (RRF_K + i + 1), Double::sum);
        }
        for (int i = 0; i < semanticRanking.size(); i++) {
            fused.merge(semanticRanking.get(i), semanticWeight / (RRF_K + i + 1), Double::sum);
        }
        return fused;
    }

    /**
     * Keeps only scores within {@code band} of the best score. Nearest neighbour search always returns
     * something, even for a weak match, so without this the tail of a semantic list is just noise.
     */
    public static Map<String, Double> withinBand(Map<String, Double> scores, double band) {
        if (scores.isEmpty()) return scores;
        double best = Collections.max(scores.values());
        Map<String, Double> kept = new LinkedHashMap<>();
        for (Map.Entry<String, Double> e : scores.entrySet()) {
            if (e.getValue() >= best - band) kept.put(e.getKey(), e.getValue());
        }
        return kept;
    }

    // 3. Fairness

    /**
     * Fills the first {@code window} positions in score order, but skips a record when its institution
     * already has {@code maxPerInstitution} places, as long as another institution has a record that is
     * still reasonably relevant. Everything after the window keeps plain score order.
     */
    public static List<Scored> diversify(List<Scored> sortedBestFirst, int window, int maxPerInstitution) {
        List<Scored> remaining = new ArrayList<>(sortedBestFirst);
        List<Scored> out = new ArrayList<>(sortedBestFirst.size());
        if (remaining.isEmpty()) return out;

        double floor = remaining.get(0).score() * MIN_RELEVANCE_RATIO;
        Map<String, Integer> used = new HashMap<>();

        while (!remaining.isEmpty() && out.size() < window) {
            int pick = 0;
            for (int i = 0; i < remaining.size(); i++) {
                Scored c = remaining.get(i);
                if (c.score() < floor) break;
                if (used.getOrDefault(c.institutionId(), 0) < maxPerInstitution) { pick = i; break; }
            }
            Scored chosen = remaining.remove(pick);
            used.merge(chosen.institutionId(), 1, Integer::sum);
            out.add(chosen);
        }
        out.addAll(remaining);
        return out;
    }

    /** How many different institutions appear in the first {@code window} results. */
    public static int distinctInstitutions(List<Scored> results, int window) {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < Math.min(window, results.size()); i++) seen.add(results.get(i).institutionId());
        return seen.size();
    }
}