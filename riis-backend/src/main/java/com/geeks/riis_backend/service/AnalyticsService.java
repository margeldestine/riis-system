package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.Cluster;
import com.geeks.riis_backend.repository.ClusterRepository;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputClusterRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ResearchOutputRepository researchOutputRepository;
    private final InstitutionRepository institutionRepository;
    private final com.geeks.riis_backend.repository.ThemeKeywordRepository themeKeywordRepository;
    private final ResearchOutputClusterRepository researchOutputClusterRepository;
    private final ClusterRepository clusterRepository;

    // GET /api/v1/analytics/summary
    public Map<String, Object> getSummary() {
        long totalApproved = researchOutputRepository.countByStatus("APPROVED");
        long totalHeis = institutionRepository.count();
        int currentYear = Year.now().getValue();
        long activeHeis = researchOutputRepository
                .countDistinctInstitutionByStatusAndCompletionYear("APPROVED", currentYear);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalApprovedOutputs", totalApproved);
        result.put("totalRegisteredHeis", totalHeis);
        result.put("activeHeisThisYear", activeHeis);
        result.put("completenessRate", 85);
        result.put("incompleteRate", 8);
        return result;
    }

    // GET /api/v1/analytics/trend
    public List<Map<String, Object>> getTrend() {
        List<Object[]> rows = researchOutputRepository
                .countByStatusGroupByYearAndType("APPROVED");

        Map<Integer, Map<String, Long>> grouped = new TreeMap<>();
        for (Object[] row : rows) {
            Integer year = (Integer) row[0];
            String type = row[1] != null ? (String) row[1] : "Other";
            Long count = (Long) row[2];
            grouped.computeIfAbsent(year, k -> new LinkedHashMap<>()).put(type, count);
        }

        return grouped.entrySet().stream().map(entry -> {
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("year", String.valueOf(entry.getKey()));
            point.putAll(entry.getValue().entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, e -> (Object) e.getValue())));
            return point;
        }).collect(Collectors.toList());
    }

    // GET /api/v1/analytics/type-distribution
    public List<Map<String, Object>> getTypeDistribution() {
        List<Object[]> rows = researchOutputRepository
                .countByStatusGroupByResearchType("APPROVED");

        List<String> colors = List.of(
                "#153e75", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Object[] row = rows.get(i);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row[0] != null ? row[0] : "Other");
            item.put("value", row[1]);
            item.put("color", colors.get(i % colors.size()));
            result.add(item);
        }
        return result;
    }

    // GET /api/v1/analytics/hei-comparison
    public List<Map<String, Object>> getHeiComparison() {
        long total = researchOutputRepository.countByStatus("APPROVED");

        return institutionRepository.findAll().stream()
                .map(institution -> {
                    long count = researchOutputRepository
                            .countByInstitutionIdAndStatus(institution.getId(), "APPROVED");
                    int progress = total > 0 ? (int) ((count * 100) / total) : 0;

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("institutionId", institution.getId());
                    item.put("name", institution.getName());
                    item.put("province", institution.getProvince());
                    item.put("count", count);
                    item.put("progress", progress);
                    return item;
                })
                .sorted((a, b) -> Long.compare(
                        ((Number) b.get("count")).longValue(),
                        ((Number) a.get("count")).longValue()))
                .collect(Collectors.toList());
    }

    // GET /api/v1/analytics/province-summary
    public List<Map<String, Object>> getProvinceSummary() {
        List<String> provinces = List.of("Cebu", "Bohol", "Negros Oriental", "Siquijor");

        return provinces.stream().map(province -> {
            long count = researchOutputRepository.findByStatus("APPROVED").stream()
                    .filter(o -> o.getInstitution() != null &&
                            province.equalsIgnoreCase(o.getInstitution().getProvince()))
                    .count();

            Map<String, Object> card = new LinkedHashMap<>();
            card.put("name", province);
            card.put("value", count);
            return card;
        }).collect(Collectors.toList());
    }

    // GET /api/v1/analytics/heatmap
    // UNCHANGED — still returns raw {institutionId, theme, count} rows.
    // Kept as-is because the Research Niche Landscape panel on the frontend
    // already consumes this exact shape (theme tag-cloud, per-niche summary).
    // Do not change this method's output shape without checking that panel too.
    public List<Map<String, Object>> getHeatmap() {
        List<Object[]> rows = themeKeywordRepository.findAggregatedThemesByInstitution();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("institutionId", row[0]);
            item.put("theme", row[1]);
            item.put("count", row[2]);
            result.add(item);
        }
        return result;
    }

    // GET /api/v1/analytics/heatmap-matrix
    // STILL EXISTS, UNCHANGED — top-10-region-wide-KeyBERT-theme matrix, per
    // SDD §3.2's literal text description. No longer used by the redesigned
    // ThematicDensityHeatmap frontend component (which was rebuilt around the
    // 5 S&T clusters per the embedded wireframe in SDD §5.1, a documented
    // text-vs-image contradiction within the SDD itself). Left in place
    // rather than deleted — removing a working endpoint is a separate
    // decision, not a side-effect of this change.
    public List<Map<String, Object>> getHeatmapMatrix() {
        List<Object[]> rows = themeKeywordRepository.findAggregatedThemesByInstitution();

        Map<String, Long> regionWideThemeTotals = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String theme = (String) row[1];
            Number countNum = (Number) row[2];
            long count = countNum != null ? countNum.longValue() : 0L;
            regionWideThemeTotals.merge(theme, count, Long::sum);
        }

        List<String> top10Themes = regionWideThemeTotals.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Set<String> top10ThemeSet = new HashSet<>(top10Themes);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Object institutionId = row[0];
            String theme = (String) row[1];
            if (!top10ThemeSet.contains(theme)) {
                continue;
            }
            Number countNum = (Number) row[2];
            long count = countNum != null ? countNum.longValue() : 0L;

            List<String> topTitles = researchOutputRepository
                    .findTopTitlesByInstitutionAndKeyword(String.valueOf(institutionId), theme, 3);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("institutionId", institutionId);
            item.put("theme", theme);
            item.put("count", count);
            item.put("topTitles", topTitles);
            result.add(item);
        }
        return result;
    }

    // GET /api/v1/analytics/cluster-heatmap
    // NEW — replaces heatmap-matrix as the data source for the
    // ThematicDensityHeatmap frontend component. X-axis is now the 5 fixed
    // S&T priority clusters (per the SDD §5.1 wireframe), not KeyBERT
    // top-10 themes. Cell value is a real COUNT of distinct APPROVED
    // research outputs assigned to that cluster for that institution —
    // NOT a keyword-occurrence count — via a direct join on
    // research_output_clusters, no text-matching approximation involved.
    //
    // "clusters" in the response always lists all 5 clusters from
    // ClusterRepository, even ones with zero assigned outputs right now —
    // the join-based count query alone would silently drop empty clusters
    // from the result, which would shrink the heatmap below 5 columns.
    public Map<String, Object> getClusterHeatmap() {
        List<Cluster> allClusters = clusterRepository.findAll();
        List<Object[]> countRows = researchOutputClusterRepository.countApprovedOutputsByInstitutionAndCluster();

        Map<String, Long> countsByInstitutionAndCluster = new HashMap<>();
        for (Object[] row : countRows) {
            String institutionId = String.valueOf(row[0]);
            String clusterId = String.valueOf(row[1]);
            long count = ((Number) row[3]).longValue();
            countsByInstitutionAndCluster.put(institutionId + "||" + clusterId, count);
        }

        List<Map<String, String>> clusters = allClusters.stream()
                .map(c -> {
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("clusterId", c.getId());
                    item.put("clusterName", c.getName());
                    return item;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> cells = new ArrayList<>();
        for (Map.Entry<String, Long> entry : countsByInstitutionAndCluster.entrySet()) {
            String[] parts = entry.getKey().split("\\|\\|", 2);
            Map<String, Object> cell = new LinkedHashMap<>();
            cell.put("institutionId", parts[0]);
            cell.put("clusterId", parts[1]);
            cell.put("count", entry.getValue());
            cells.add(cell);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("clusters", clusters);
        result.put("cells", cells);
        return result;
    }
}