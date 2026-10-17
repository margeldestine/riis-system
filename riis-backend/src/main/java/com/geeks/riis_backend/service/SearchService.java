package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.service.PublicAccessPolicy.Viewer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private static final String STATUS_APPROVED = "APPROVED";

    private final ResearchOutputRepository researchOutputRepository;
    private final AIProxyService aiProxyService;
    private final PublicAccessPolicy accessPolicy;

    private float[] computeQueryEmbedding(String query) {
        return aiProxyService.computeSPECTEREmbedding(query, "");
    }

    public Map<String, Object> search(String query, String mode, Map<String, Object> filters) {
        String normalizedMode = mode == null ? "KEYWORD" : mode.trim().toUpperCase();

        List<Map<String, Object>> results;
        boolean fallback = false;

        if ("SEMANTIC".equals(normalizedMode)) {
            float[] embedding = computeQueryEmbedding(query);
            if (embedding.length == 0) {
                results = executeKeywordSearch(query, filters);
                fallback = true;
            } else {
                results = executeSemanticSearch(embedding, filters);
                fallback = false;
            }
        } else if ("BOTH".equals(normalizedMode)) {
            float[] embedding = computeQueryEmbedding(query);
            if (embedding.length == 0) {
                results = executeKeywordSearch(query, filters);
                fallback = true;
            } else {
                List<Map<String, Object>> keywordResults = executeKeywordSearch(query, filters);
                List<Map<String, Object>> semanticResults = executeSemanticSearch(embedding, filters);
                results = mergeAndRankResults(keywordResults, semanticResults);
                fallback = false;
            }
        } else {
            results = executeKeywordSearch(query, filters);
            fallback = false;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("results", results);
        response.put("total", results.size());
        response.put("fallback", fallback);
        return response;
    }

    public List<Map<String, Object>> executeKeywordSearch(String query, Map<String, Object> filters) {
        Viewer viewer = accessPolicy.currentViewer();
        List<ResearchOutput> approved = researchOutputRepository.findByStatus(STATUS_APPROVED);
        String q = query == null ? "" : query.trim().toLowerCase();

        return approved.stream()
                .filter(o -> matchesQuery(o, q, viewer))
                .filter(o -> matchesFilters(o, filters, viewer))
                .map(o -> {
                    Map<String, Object> card = toCard(o, viewer);
                    card.put("similarityScore", null);
                    return card;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> executeSemanticSearch(float[] embedding, Map<String, Object> filters) {
        Viewer viewer = accessPolicy.currentViewer();
        List<ResearchOutput> similar = researchOutputRepository
                .findSimilarBySpecterEmbedding(embedding, "00000000-0000-0000-0000-000000000000", 20);

        return similar.stream()
                .filter(o -> matchesFilters(o, filters, viewer))
                .map(o -> {
                    Map<String, Object> card = toCard(o, viewer);
                    double score = computeCosineSimilarity(embedding, o.getSpecterEmbedding());
                    card.put("similarityScore", Math.round(score * 1000.0) / 10.0);
                    return card;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> mergeAndRankResults(
            List<Map<String, Object>> keywordResults,
            List<Map<String, Object>> semanticResults) {

        Map<String, Map<String, Object>> merged = new LinkedHashMap<>();

        for (int i = 0; i < keywordResults.size(); i++) {
            Map<String, Object> r = keywordResults.get(i);
            String id = (String) r.get("id");
            double bm25Score = 1.0 / (i + 1);
            r.put("mergedScore", 0.4 * bm25Score);
            merged.put(id, r);
        }

        for (int i = 0; i < semanticResults.size(); i++) {
            Map<String, Object> r = semanticResults.get(i);
            String id = (String) r.get("id");
            Double simScore = r.get("similarityScore") != null ?
                    ((Number) r.get("similarityScore")).doubleValue() / 100.0 : 0.0;
            double semanticScore = simScore;

            if (merged.containsKey(id)) {
                double existing = ((Number) merged.get(id).get("mergedScore")).doubleValue();
                merged.get(id).put("mergedScore", existing + 0.6 * semanticScore);
                merged.get(id).put("similarityScore", r.get("similarityScore"));
            } else {
                r.put("mergedScore", 0.6 * semanticScore);
                merged.put(id, r);
            }
        }

        return merged.values().stream()
                .sorted((a, b) -> Double.compare(
                        ((Number) b.get("mergedScore")).doubleValue(),
                        ((Number) a.get("mergedScore")).doubleValue()))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getById(String id) {
        Viewer viewer = accessPolicy.currentViewer();
        ResearchOutput o = researchOutputRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + id));

        // Public detail pages only show APPROVED records (owners and admins may still open their own).
        boolean seesAll = viewer.canSeeAll(accessPolicy.institutionIdOf(o));
        if (!STATUS_APPROVED.equals(o.getStatus()) && !seesAll) {
            throw new ResourceNotFoundException("Record not found: " + id);
        }

        AccessVisibility tier = accessPolicy.viewTier(viewer, o);
        boolean metadata = tier.exposesDescriptiveMetadata();

        Map<String, Object> card = toCard(o, viewer);
        card.put("abstractText", tier.exposesAbstract() ? o.getAbstractText() : null);
        card.put("subjectDc", metadata ? o.getSubjectDc() : null);
        card.put("coverageDc", metadata ? o.getCoverageDc() : null);
        card.put("rightsDc", metadata ? o.getRightsDc() : null);
        card.put("publisherDc", metadata ? o.getPublisherDc() : null);
        card.put("contributorDc", metadata ? o.getContributorDc() : null);
        // s3PdfKey is intentionally NEVER returned. The raw PDF is not exposed through any public endpoint.
        return card;
    }

    public List<Map<String, Object>> getRelated(String id) {
        Viewer viewer = accessPolicy.currentViewer();
        ResearchOutput source = researchOutputRepository.findById(id).orElse(null);
        if (source == null) return List.of();
        if (!STATUS_APPROVED.equals(source.getStatus())
                && !viewer.canSeeAll(accessPolicy.institutionIdOf(source))) {
            return List.of();
        }

        if (source.getSpecterEmbedding() != null && source.getSpecterEmbedding().length > 0) {
            return researchOutputRepository
                    .findSimilarBySpecterEmbedding(source.getSpecterEmbedding(), id, 3)
                    .stream()
                    .map(o -> {
                        double score = computeCosineSimilarity(source.getSpecterEmbedding(), o.getSpecterEmbedding());
                        return toRelatedItem(o, viewer, Math.round(score * 1000.0) / 10.0);
                    })
                    .collect(Collectors.toList());
        }

        // Keyword fallback reads keywords, so skip it when the source hides them.
        if (!accessPolicy.viewTier(viewer, source).exposesDescriptiveMetadata()) {
            return List.of();
        }

        return researchOutputRepository.findByStatus(STATUS_APPROVED).stream()
                .filter(o -> !o.getId().equals(id))
                .filter(o -> accessPolicy.viewTier(viewer, o).exposesDescriptiveMetadata())
                .filter(o -> hasKeywordOverlap(source, o))
                .limit(3)
                .map(o -> toRelatedItem(o, viewer, null))
                .collect(Collectors.toList());
    }

    private double computeCosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Only fields the viewer is allowed to see take part in matching, so a hidden abstract
     * (or hidden keywords/authors) can never be discovered by searching for words inside it.
     */
    private boolean matchesQuery(ResearchOutput o, String q, Viewer viewer) {
        if (q.isBlank()) return true;
        AccessVisibility tier = accessPolicy.viewTier(viewer, o);

        String title = o.getTitle() != null ? o.getTitle().toLowerCase() : "";
        String institution = o.getInstitution() != null && o.getInstitution().getName() != null
                ? o.getInstitution().getName().toLowerCase() : "";
        if (title.contains(q) || institution.contains(q)) return true;

        if (tier.exposesDescriptiveMetadata()) {
            String keywords = o.getKeywords() != null ? o.getKeywords().toLowerCase() : "";
            String authors = o.getAuthors() != null
                    ? o.getAuthors().stream()
                    .map(a -> a.getFullName() != null ? a.getFullName().toLowerCase() : "")
                    .collect(Collectors.joining(" ")) : "";
            if (keywords.contains(q) || authors.contains(q)) return true;
        }

        if (tier.exposesAbstract()) {
            String abstrakt = o.getAbstractText() != null ? o.getAbstractText().toLowerCase() : "";
            return abstrakt.contains(q);
        }
        return false;
    }

    /**
     * Type / year / funding are hidden for RESTRICTED records, so filtering on them must not
     * reveal them: when one of those filters is active, hidden-field records are excluded.
     */
    private boolean matchesFilters(ResearchOutput o, Map<String, Object> filters, Viewer viewer) {
        if (filters == null) return true;
        boolean hiddenMetadata = !accessPolicy.viewTier(viewer, o).exposesDescriptiveMetadata();

        Object institution = filters.get("institutionId");
        if (institution != null && !institution.toString().isBlank()) {
            if (o.getInstitution() == null || !o.getInstitution().getId().equals(institution.toString()))
                return false;
        }

        Object province = filters.get("province");
        if (province != null && !province.toString().isBlank()) {
            if (o.getInstitution() == null || !province.toString()
                    .equalsIgnoreCase(o.getInstitution().getProvince()))
                return false;
        }

        Object researchType = filters.get("researchType");
        if (researchType != null && !researchType.toString().isBlank()) {
            if (hiddenMetadata || !researchType.toString().equalsIgnoreCase(o.getResearchType()))
                return false;
        }

        Object year = filters.get("year");
        if (year != null && !year.toString().isBlank()) {
            if (hiddenMetadata) return false;
            try {
                int y = Integer.parseInt(year.toString());
                if (o.getCompletionYear() == null || o.getCompletionYear() != y)
                    return false;
            } catch (NumberFormatException ignored) {}
        }

        Object fundingSource = filters.get("fundingSource");
        if (fundingSource != null && !fundingSource.toString().isBlank()) {
            if (hiddenMetadata || o.getFundingSource() == null || !o.getFundingSource()
                    .toLowerCase().contains(fundingSource.toString().toLowerCase()))
                return false;
        }

        return true;
    }

    private boolean hasKeywordOverlap(ResearchOutput a, ResearchOutput b) {
        if (a.getKeywords() == null || b.getKeywords() == null) return false;
        Set<String> aKeys = Arrays.stream(a.getKeywords().split(","))
                .map(String::trim).map(String::toLowerCase).collect(Collectors.toSet());
        Set<String> bKeys = Arrays.stream(b.getKeywords().split(","))
                .map(String::trim).map(String::toLowerCase).collect(Collectors.toSet());
        aKeys.retainAll(bKeys);
        return !aKeys.isEmpty();
    }

    /** Same keys as before, plus "visibility" and "fullText". Hidden fields are blank, never removed. */
    private Map<String, Object> toCard(ResearchOutput o, Viewer viewer) {
        AccessVisibility tier = accessPolicy.viewTier(viewer, o);
        boolean metadata = tier.exposesDescriptiveMetadata();

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", o.getId());
        card.put("title", o.getTitle());
        card.put("researchType", metadata ? o.getResearchType() : "");
        card.put("completionYear", metadata ? o.getCompletionYear() : null);
        card.put("fundingSource", metadata ? o.getFundingSource() : null);
        card.put("publicationVenue", metadata ? o.getPublicationVenue() : null);
        card.put("doi", metadata ? o.getDoi() : null);
        card.put("abstractExcerpt", tier.exposesAbstract() ? truncate(o.getAbstractText(), 200) : "");
        card.put("keywords", metadata ? parseKeywords(o.getKeywords()) : List.of());
        card.put("institutionId", o.getInstitution() != null ? o.getInstitution().getId() : null);
        card.put("institutionName", o.getInstitution() != null ? o.getInstitution().getName() : null);
        card.put("province", o.getInstitution() != null ? o.getInstitution().getProvince() : null);
        card.put("authors", metadata && o.getAuthors() != null ? o.getAuthors().stream()
                .map(a -> Map.of("fullName", a.getFullName() != null ? a.getFullName() : "",
                        "orcidId", a.getOrcidId() != null ? a.getOrcidId() : ""))
                .collect(Collectors.toList()) : List.of());
        card.put("visibility", accessPolicy.effectiveVisibility(o).name());
        card.put("fullText", accessPolicy.fullTextAction(o));
        return card;
    }

    private Map<String, Object> toRelatedItem(ResearchOutput o, Viewer viewer, Double similarityScore) {
        AccessVisibility tier = accessPolicy.viewTier(viewer, o);
        boolean metadata = tier.exposesDescriptiveMetadata();

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", o.getId());
        item.put("title", o.getTitle());
        item.put("institutionName", o.getInstitution() != null ? o.getInstitution().getName() : "");
        item.put("researchType", metadata ? o.getResearchType() : "");
        item.put("completionYear", metadata ? o.getCompletionYear() : null);
        item.put("abstractExcerpt", tier.exposesAbstract() ? truncate(o.getAbstractText(), 150) : "");
        item.put("similarityScore", similarityScore);
        item.put("visibility", accessPolicy.effectiveVisibility(o).name());
        return item;
    }

    private String truncate(String text, int maxChars) {
        if (text == null) return "";
        return text.length() <= maxChars ? text : text.substring(0, maxChars) + "...";
    }

    private List<String> parseKeywords(String keywords) {
        if (keywords == null || keywords.isBlank()) return List.of();
        return Arrays.stream(keywords.split(","))
                .map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toList());
    }
}