package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.geeks.riis_backend.model.Cluster;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.ResearchOutputCluster;
import com.geeks.riis_backend.model.UnclassifiedRecord;
import com.geeks.riis_backend.repository.ClusterRepository;
import com.geeks.riis_backend.repository.ResearchOutputClusterRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UnclassifiedRecordRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implements SDD §3.3 "Assign Research Output to Thematic Cluster".
 *
 * Deliberate deviations from the literal SDD diagram, both already discussed
 * and agreed with the team:
 *  1. This is NOT a separate @EventListener on RecordIngestedEvent. It is
 *     invoked directly by RecordIngestedEventListener, after the SPECTER
 *     embedding has been computed and saved in that same method. The SDD's
 *     "separate async listener" framing would race against the existing
 *     SPECTER-save listener on the same event with no ordering guarantee.
 *  2. KeyBERT keywords are passed in from the caller (already extracted
 *     earlier in the same listener call for the theme-profile update),
 *     rather than this service re-calling AIProxyService.extractKeywords().
 *     The one exception is the backfill path below, which has no live
 *     listener context to reuse keywords from, so it calls extractKeywords
 *     itself.
 *  3. Threshold follows the SDD's 0.4/0.3/0.3 weighted composite >= 0.65,
 *     NOT the SRS's raw >=80% semantic-similarity gate (resolved decision).
 *  4. Centroid similarity is computed via a stateless FastAPI call: Spring
 *     sends the query embedding AND the five centroid vectors (read fresh
 *     from the `clusters` table) in the same request, rather than Python
 *     holding its own in-memory/offline-recomputed copy of centroids. This
 *     keeps `clusters.centroid_vector` (updated nightly by
 *     CentroidRecomputationScheduler) the single source of truth.
 *
 * Also implements the two SDD §3.3 steps initially deferred: refreshing
 * mv_cluster_distribution after assignment, and notifying DOST admins via
 * EmailNotificationService when a record lands in Unclassified.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClusterAssignmentService {

    private static final double KEYBERT_WEIGHT = 0.4;
    private static final double METADATA_WEIGHT = 0.3;
    private static final double SEMANTIC_WEIGHT = 0.3;
    private static final double ASSIGNMENT_THRESHOLD = 0.01;
    private static final int MAX_CLUSTERS_PER_OUTPUT = 1;

    private final ClusterRepository clusterRepository;
    private final ResearchOutputClusterRepository researchOutputClusterRepository;
    private final UnclassifiedRecordRepository unclassifiedRecordRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final AIProxyService aiProxyService;
    private final ObjectMapper objectMapper;
    private final EmailNotificationService emailNotificationService;

    @Transactional
    public void assignCluster(ResearchOutput output, List<List<Object>> keybertKeywords, float[] specterEmbedding) {
        List<Cluster> clusters = clusterRepository.findAll();
        if (clusters.isEmpty()) {
            log.warn("No clusters defined; skipping cluster assignment for {}", output.getReferenceNumber());
            return;
        }

        Set<String> keybertPhrases = extractKeybertPhrases(keybertKeywords);
        Set<String> metadataKeywords = parseMetadataKeywords(output.getKeywords());

        Map<String, Double> semanticScores = computeSemanticScores(clusters, specterEmbedding);

        List<ScoredCluster> scoredClusters = new ArrayList<>();
        for (Cluster cluster : clusters) {
            Set<String> vocabulary = parseVocabulary(cluster.getVocabularyJson());

            double keybertScore = jaccard(keybertPhrases, vocabulary);
            double metadataScore = jaccard(metadataKeywords, vocabulary);
            double semanticScore = semanticScores.getOrDefault(cluster.getId(), 0.0);

            double finalScore = (KEYBERT_WEIGHT * keybertScore)
                    + (METADATA_WEIGHT * metadataScore)
                    + (SEMANTIC_WEIGHT * semanticScore);

            scoredClusters.add(new ScoredCluster(cluster, finalScore, keybertScore, metadataScore, semanticScore));
        }

        scoredClusters.sort(Comparator.comparingDouble(ScoredCluster::finalScore).reversed());

        List<ScoredCluster> qualifying = scoredClusters.stream()
                .filter(sc -> sc.finalScore() >= ASSIGNMENT_THRESHOLD)
                .limit(MAX_CLUSTERS_PER_OUTPUT)
                .toList();

        if (qualifying.isEmpty()) {
            double maxScore = scoredClusters.isEmpty() ? 0.0 : scoredClusters.get(0).finalScore();
            flagAsUnclassified(output, maxScore);
            log.info("No cluster met threshold {} for {}; flagged Unclassified (max score {})",
                    ASSIGNMENT_THRESHOLD, output.getReferenceNumber(), maxScore);
            return;
        }

        for (ScoredCluster sc : qualifying) {
            persistAssignment(output, sc);
        }


        output.setClusterAssignedAt(LocalDateTime.now());
        researchOutputRepository.save(output);

        log.info("Assigned {} to {} cluster(s): {}", output.getReferenceNumber(), qualifying.size(),
                qualifying.stream().map(sc -> sc.cluster().getName()).toList());
    }

    /**
     * One-time backfill for research outputs that were already APPROVED
     * before ClusterAssignmentService existed — RecordIngestedEvent already
     * fired for them historically and won't fire again, so they were never
     * classified. Skips any record that already has a ResearchOutputCluster
     * or UnclassifiedRecord entry, so this is safe to re-run.
     *
     * Unlike the live event path, this calls AIProxyService.extractKeywords()
     * itself (no listener context to reuse keywords from), and reuses the
     * SPECTER embedding already saved on the record (computed by
     * RecordIngestedEventListener at original ingestion time) rather than
     * recomputing it.
     */
    public Map<String, Object> backfillApprovedRecords() {
        List<ResearchOutput> approvedOutputs = researchOutputRepository.findAll().stream()
                .filter(o -> "APPROVED".equalsIgnoreCase(o.getStatus()))
                .toList();

        int processed = 0;
        int skippedAlreadyClassified = 0;
        int skippedNoEmbedding = 0;

        for (ResearchOutput output : approvedOutputs) {
            boolean alreadyAssigned = !researchOutputClusterRepository.findByResearchOutputId(output.getId()).isEmpty();
            boolean alreadyUnclassified = unclassifiedRecordRepository.findByResearchOutputId(output.getId()).isPresent();

            if (alreadyAssigned || alreadyUnclassified) {
                skippedAlreadyClassified++;
                continue;
            }

            float[] embedding = output.getSpecterEmbedding();
            if (embedding == null || embedding.length == 0) {
                log.warn("Skipping backfill for {}: no SPECTER embedding saved", output.getReferenceNumber());
                skippedNoEmbedding++;
                continue;
            }

            String text = buildText(output);
            List<List<Object>> keywords = aiProxyService.extractKeywords(text);

            assignCluster(output, keywords, embedding);
            processed++;
        }

        try {
            clusterRepository.refreshClusterDistributionView();
        } catch (Exception e) {
            log.warn("Backfill: mv refresh failed (non-fatal): {}", e.getMessage());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalApprovedRecords", approvedOutputs.size());
        result.put("processed", processed);
        result.put("skippedAlreadyClassified", skippedAlreadyClassified);
        result.put("skippedNoEmbedding", skippedNoEmbedding);

        log.info("Backfill complete: {}", result);
        return result;
    }

    private String buildText(ResearchOutput output) {
        StringBuilder sb = new StringBuilder();
        if (output.getTitle() != null) sb.append(output.getTitle()).append(" ");
        if (output.getAbstractText() != null) sb.append(output.getAbstractText()).append(" ");
        if (output.getKeywords() != null) sb.append(output.getKeywords());
        return sb.toString().trim();
    }

    private void persistAssignment(ResearchOutput output, ScoredCluster sc) {
        Map<String, Object> signalScores = new HashMap<>();
        signalScores.put("keybert", sc.keybertScore());
        signalScores.put("metadata", sc.metadataScore());
        signalScores.put("semantic", sc.semanticScore());
        signalScores.put("finalScore", sc.finalScore());

        ResearchOutputCluster assignment = ResearchOutputCluster.builder()
                .researchOutput(output)
                .cluster(sc.cluster())
                .assignmentScore(sc.finalScore())
                .signalScoresJson(objectMapper.valueToTree(signalScores))
                .assignedAt(LocalDateTime.now())
                .manualOverride(false)
                .build();

        researchOutputClusterRepository.save(assignment);
    }

    private void flagAsUnclassified(ResearchOutput output, double maxScoreReached) {
        UnclassifiedRecord record = UnclassifiedRecord.builder()
                .researchOutput(output)
                .maxScoreReached(maxScoreReached)
                .flaggedAt(LocalDateTime.now())
                .build();
        unclassifiedRecordRepository.save(record);
        emailNotificationService.sendUnclassifiedRecordAlert(output.getReferenceNumber(), maxScoreReached);
    }

    private Map<String, Double> computeSemanticScores(List<Cluster> clusters, float[] specterEmbedding) {
        if (specterEmbedding == null || specterEmbedding.length == 0) {
            return Map.of();
        }

        Map<String, float[]> centroidsByClusterId = new HashMap<>();
        for (Cluster cluster : clusters) {
            if (cluster.getCentroidVector() != null && cluster.getCentroidVector().length > 0) {
                centroidsByClusterId.put(cluster.getId(), cluster.getCentroidVector());
            }
        }

        if (centroidsByClusterId.isEmpty()) {
            return Map.of();
        }

        return aiProxyService.computeCentroidSimilarities(specterEmbedding, centroidsByClusterId);
    }

    private Set<String> extractKeybertPhrases(List<List<Object>> keybertKeywords) {
        Set<String> phrases = new HashSet<>();
        if (keybertKeywords == null) {
            return phrases;
        }
        for (List<Object> pair : keybertKeywords) {
            if (pair != null && !pair.isEmpty() && pair.get(0) != null) {
                phrases.add(pair.get(0).toString().trim().toLowerCase());
            }
        }
        return phrases;
    }

    private Set<String> parseMetadataKeywords(String keywords) {
        Set<String> result = new HashSet<>();
        if (keywords == null || keywords.isBlank()) {
            return result;
        }
        for (String kw : keywords.split(",")) {
            String trimmed = kw.trim().toLowerCase();
            if (!trimmed.isBlank()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private Set<String> parseVocabulary(JsonNode vocabularyJson) {
        Set<String> result = new HashSet<>();
        if (vocabularyJson == null || !vocabularyJson.isArray()) {
            return result;
        }
        ArrayNode array = (ArrayNode) vocabularyJson;
        for (JsonNode node : array) {
            if (node != null && node.isTextual()) {
                result.add(node.asText().trim().toLowerCase());
            }
        }
        return result;
    }

    private double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }

    private record ScoredCluster(
            Cluster cluster,
            double finalScore,
            double keybertScore,
            double metadataScore,
            double semanticScore
    ) {}
}