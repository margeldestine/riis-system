package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.model.Author;
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

    // Ranking settings (tune these using the sample query set, see the Priority 5 guide)
    private static final int SEMANTIC_POOL = 100;
    private static final double KEYWORD_WEIGHT = 0.4;
    private static final double SEMANTIC_WEIGHT = 0.6;
    private static final int RELATED_LIMIT = 5;
    private static final int RELATED_POOL = 15;
    private static final int RELATED_MAX_PER_INSTITUTION = 2;
    /**
     * A semantic match is kept only if its cosine similarity is within this distance of the best match.
     * Smaller means stricter. Tune it with the sample query set.
     */
    private static final double SEMANTIC_BAND = 0.15;

    private float[] computeQueryEmbedding(String query) {
        return aiProxyService.computeSPECTEREmbedding(query, "");
    }

    private static String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) return "BOTH";
        String m = mode.trim().toUpperCase();
        return ("KEYWORD".equals(m) || "SEMANTIC".equals(m)) ? m : "BOTH";
    }

    public Map<String, Object> search(String query, String mode, Map<String, Object> filters) {
        String requestedMode = normalizeMode(mode);
        String q = query == null ? "" : query.trim();
        boolean blank = q.isBlank();
        Viewer viewer = accessPolicy.currentViewer();

        // Two queries total (records with institutions, then all authors).
        List<ResearchOutput> approved = researchOutputRepository.findByStatusWithInstitution(STATUS_APPROVED);
        Map<String, List<Author>> authorsById = loadAuthors(approved);
        Map<String, ResearchOutput> byId = new LinkedHashMap<>();
        for (ResearchOutput o : approved) byId.put(o.getId(), o);

        String effectiveMode = requestedMode;
        boolean fallback = false;
        Map<String, Double> cosineById = new HashMap<>();
        List<String> semanticRanking = List.of();

        if (!blank && !"KEYWORD".equals(requestedMode)) {
            float[] embedding = computeQueryEmbedding(q);
            if (embedding == null || embedding.length == 0) {
                effectiveMode = "KEYWORD";
                fallback = true;
            } else {
                for (ResearchOutput o : researchOutputRepository.findSimilarForViewer(
                        embedding, "", SEMANTIC_POOL,
                        filterText(filters, "institutionId"), filterText(filters, "province"),
                        filterText(filters, "researchType"), filterYear(filters), filterText(filters, "fundingSource"),
                        viewer.admin(), viewer.institutionId())) {
                    if (!byId.containsKey(o.getId())) continue;
                    cosineById.put(o.getId(), computeCosineSimilarity(embedding, o.getSpecterEmbedding()));
                }
                cosineById = SearchRanker.withinBand(cosineById, SEMANTIC_BAND);
                semanticRanking = SearchRanker.rank(cosineById);
            }
        }

        // Score every record
        Map<String, Double> scores;
        if (blank) {
            scores = browseScores(byId.values(), viewer);
        } else {
            Map<String, Double> keywordScores = "SEMANTIC".equals(effectiveMode)
                    ? Map.of()
                    : SearchRanker.keywordScores(toDocs(approved, viewer, authorsById), q);
            if ("SEMANTIC".equals(effectiveMode)) {
                scores = cosineById;
            } else if ("BOTH".equals(effectiveMode)) {
                scores = SearchRanker.fuse(SearchRanker.rank(keywordScores), KEYWORD_WEIGHT,
                        semanticRanking, SEMANTIC_WEIGHT);
            } else {
                scores = keywordScores;
            }
        }

        // Filters, order, fairness
        List<SearchRanker.Scored> ordered = new ArrayList<>();
        for (String id : SearchRanker.rank(scores)) {
            ResearchOutput o = byId.get(id);
            if (o == null || !matchesFilters(o, filters, viewer)) continue;
            ordered.add(new SearchRanker.Scored(id, accessPolicy.institutionIdOf(o), scores.get(id)));
        }
        boolean institutionFiltered = filterText(filters, "institutionId") != null;
        if (!institutionFiltered) {
            ordered = SearchRanker.diversify(ordered, SearchRanker.DEFAULT_WINDOW,
                    SearchRanker.DEFAULT_MAX_PER_INSTITUTION);
        }

        List<Map<String, Object>> results = new ArrayList<>(ordered.size());
        for (SearchRanker.Scored s : ordered) {
            Map<String, Object> card = toCard(byId.get(s.id()), viewer, authorsById);
            Double cosine = cosineById.get(s.id());
            card.put("similarityScore", cosine == null ? null : Math.round(cosine * 1000.0) / 10.0);
            results.add(card);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("results", results);
        response.put("total", results.size());
        response.put("fallback", fallback);
        response.put("mode", effectiveMode);
        response.put("institutionsInTop10", SearchRanker.distinctInstitutions(ordered, SearchRanker.DEFAULT_WINDOW));
        return response;
    }

    /** Empty search box: newest first, hidden years last. Equal scores so fairness spreading still applies. */
    private Map<String, Double> browseScores(Collection<ResearchOutput> records, Viewer viewer) {
        List<ResearchOutput> sorted = new ArrayList<>(records);
        sorted.sort(Comparator
                .comparing((ResearchOutput o) -> accessPolicy.viewTier(viewer, o).exposesDescriptiveMetadata()
                                && o.getCompletionYear() != null ? o.getCompletionYear() : Integer.MIN_VALUE,
                        Comparator.reverseOrder())
                .thenComparing(o -> o.getTitle() == null ? "" : o.getTitle().toLowerCase()));
        // LinkedHashMap would keep this order, but rank() sorts by score then id, so encode the order in the score.
        Map<String, Double> scores = new LinkedHashMap<>();
        for (int i = 0; i < sorted.size(); i++) {
            scores.put(sorted.get(i).getId(), 1.0 - (i * 1e-9));
        }
        return scores;
    }

    /**
     * Only fields the viewer may see are given to the ranker, so a hidden abstract
     * (or hidden keywords and authors) can never be discovered by searching for words inside it.
     */
    private List<SearchRanker.Doc> toDocs(List<ResearchOutput> records, Viewer viewer,
                                          Map<String, List<Author>> authorsById) {
        List<SearchRanker.Doc> docs = new ArrayList<>(records.size());
        for (ResearchOutput o : records) {
            AccessVisibility tier = accessPolicy.viewTier(viewer, o);
            String authors = "";
            if (tier.exposesDescriptiveMetadata()) {
                Collection<Author> list = authorsOf(o, authorsById);
                authors = list == null ? "" : list.stream()
                        .map(a -> a.getFullName() == null ? "" : a.getFullName())
                        .collect(Collectors.joining(" "));
            }
            docs.add(new SearchRanker.Doc(
                    o.getId(),
                    accessPolicy.institutionIdOf(o),
                    o.getTitle(),
                    tier.exposesDescriptiveMetadata() ? o.getKeywords() : "",
                    authors,
                    o.getInstitution() != null ? o.getInstitution().getName() : "",
                    tier.exposesAbstract() ? o.getAbstractText() : ""));
        }
        return docs;
    }

    private static String filterText(Map<String, Object> filters, String key) {
        if (filters == null) return null;
        Object v = filters.get(key);
        if (v == null || v.toString().isBlank()) return null;
        return v.toString().trim();
    }

    private static Integer filterYear(Map<String, Object> filters) {
        String raw = filterText(filters, "year");
        if (raw == null) return null;
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return null;
        }
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

        AccessVisibility sourceTier = accessPolicy.viewTier(viewer, source);
        Map<String, ResearchOutput> candidates = new LinkedHashMap<>();
        Map<String, Double> cosineById = new HashMap<>();
        Map<String, Double> overlapById = new HashMap<>();
        Set<String> sourceKeys = Set.of();

        // Similar topic. The embedding comes from the abstract, so it is used only
        // when the viewer is allowed to see the abstract of the source record.
        float[] embedding = source.getSpecterEmbedding();
        if (sourceTier.exposesAbstract() && embedding != null && embedding.length > 0) {
            for (ResearchOutput o : researchOutputRepository.findSimilarForViewer(
                    embedding, id, RELATED_POOL, null, null, null, null, null,
                    viewer.admin(), viewer.institutionId())) {
                cosineById.put(o.getId(), computeCosineSimilarity(embedding, o.getSpecterEmbedding()));
                candidates.put(o.getId(), o);
            }
            cosineById = SearchRanker.withinBand(cosineById, SEMANTIC_BAND);
            candidates.keySet().retainAll(cosineById.keySet());
        }

        // Shared keywords. Needs the source keywords and the candidate keywords to be visible.
        if (sourceTier.exposesDescriptiveMetadata()) {
            sourceKeys = keywordSet(source.getKeywords());
            if (!sourceKeys.isEmpty()) {
                for (ResearchOutput o : researchOutputRepository.findByStatusWithInstitution(STATUS_APPROVED)) {
                    if (o.getId().equals(id)) continue;
                    if (!accessPolicy.viewTier(viewer, o).exposesDescriptiveMetadata()) continue;
                    Set<String> shared = new LinkedHashSet<>(sourceKeys);
                    Set<String> theirs = keywordSet(o.getKeywords());
                    shared.retainAll(theirs);
                    if (shared.isEmpty()) continue;
                    Set<String> union = new HashSet<>(sourceKeys);
                    union.addAll(theirs);
                    overlapById.put(o.getId(), (double) shared.size() / union.size());
                    candidates.putIfAbsent(o.getId(), o);
                }
            }
        }
        if (candidates.isEmpty()) return List.of();

        Map<String, Double> fused = SearchRanker.fuse(
                SearchRanker.rank(overlapById), KEYWORD_WEIGHT,
                SearchRanker.rank(cosineById), SEMANTIC_WEIGHT);
        List<SearchRanker.Scored> ordered = new ArrayList<>();
        for (String cid : SearchRanker.rank(fused)) {
            ordered.add(new SearchRanker.Scored(cid, accessPolicy.institutionIdOf(candidates.get(cid)), fused.get(cid)));
        }
        ordered = SearchRanker.diversify(ordered, RELATED_LIMIT, RELATED_MAX_PER_INSTITUTION);

        List<Map<String, Object>> items = new ArrayList<>();
        for (SearchRanker.Scored s : ordered.subList(0, Math.min(RELATED_LIMIT, ordered.size()))) {
            ResearchOutput o = candidates.get(s.id());
            List<String> shared = new ArrayList<>();
            if (!sourceKeys.isEmpty() && accessPolicy.viewTier(viewer, o).exposesDescriptiveMetadata()) {
                for (String k : keywordSet(o.getKeywords())) {
                    if (sourceKeys.contains(k)) shared.add(k);
                }
            }
            Double cosine = cosineById.get(s.id());
            items.add(toRelatedItem(o, viewer,
                    cosine == null ? null : Math.round(cosine * 1000.0) / 10.0,
                    shared.subList(0, Math.min(3, shared.size()))));
        }
        return items;
    }

    private static Set<String> keywordSet(String keywords) {
        if (keywords == null || keywords.isBlank()) return Set.of();
        return Arrays.stream(keywords.split(","))
                .map(String::trim).map(String::toLowerCase)
                .filter(k -> !k.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Map<String, List<Author>> loadAuthors(List<ResearchOutput> outputs) {
        if (outputs.isEmpty()) return Map.of();
        List<String> ids = outputs.stream().map(ResearchOutput::getId).collect(Collectors.toList());
        Map<String, List<Author>> byId = new HashMap<>();
        for (Object[] row : researchOutputRepository.findAuthorRowsByResearchOutputIds(ids)) {
            byId.computeIfAbsent((String) row[0], k -> new ArrayList<>()).add((Author) row[1]);
        }
        return byId;
    }

    /** Uses the preloaded map when given (search list); otherwise falls back to the entity's own authors. */
    private Collection<Author> authorsOf(ResearchOutput o, Map<String, List<Author>> authorsById) {
        if (authorsById != null) return authorsById.getOrDefault(o.getId(), List.of());
        return o.getAuthors();
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

    /** Same keys as before, plus "visibility" and "fullText". Hidden fields are blank, never removed. */
    private Map<String, Object> toCard(ResearchOutput o, Viewer viewer) {
        return toCard(o, viewer, null);
    }

    private Map<String, Object> toCard(ResearchOutput o, Viewer viewer, Map<String, List<Author>> authorsById) {
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
        Collection<Author> cardAuthors = metadata ? authorsOf(o, authorsById) : null;
        card.put("authors", cardAuthors != null ? cardAuthors.stream()
                .map(a -> Map.of("fullName", a.getFullName() != null ? a.getFullName() : "",
                        "orcidId", a.getOrcidId() != null ? a.getOrcidId() : ""))
                .collect(Collectors.toList()) : List.of());
        card.put("visibility", accessPolicy.effectiveVisibility(o).name());
        card.put("fullText", accessPolicy.fullTextAction(o));
        return card;
    }

    private Map<String, Object> toRelatedItem(ResearchOutput o, Viewer viewer, Double similarityScore,
                                              List<String> sharedKeywords) {
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
        item.put("sharedKeywords", sharedKeywords);
        item.put("reason", relatedReason(similarityScore != null, sharedKeywords));
        item.put("visibility", accessPolicy.effectiveVisibility(o).name());
        return item;
    }

    private static String relatedReason(boolean similarTopic, List<String> shared) {
        String keywords = String.join(", ", shared);
        if (similarTopic && !shared.isEmpty()) return "Similar topic and shared keywords: " + keywords;
        if (similarTopic) return "Similar topic";
        if (!shared.isEmpty()) return "Shared keywords: " + keywords;
        return "";
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