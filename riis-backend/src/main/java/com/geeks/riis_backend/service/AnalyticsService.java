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

    // ---- DAS-036/037/038: shared filter helper --------------------------
    // Applies the optional Year-From / Year-To / Province / HEI / Type
    // filters in-memory over the APPROVED research outputs. Kept as a
    // single shared helper (rather than new SQL per filter combination) so
    // every analytics panel filters consistently off the same criteria.
    private List<com.geeks.riis_backend.model.ResearchOutput> getFilteredApprovedOutputs(
            Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        return researchOutputRepository.findByStatus("APPROVED").stream()
                .filter(ro -> yearFrom == null || (ro.getCompletionYear() != null && ro.getCompletionYear() >= yearFrom))
                .filter(ro -> yearTo == null || (ro.getCompletionYear() != null && ro.getCompletionYear() <= yearTo))
                .filter(ro -> province == null || province.isBlank()
                        || (ro.getInstitution() != null && province.equalsIgnoreCase(ro.getInstitution().getProvince())))
                .filter(ro -> institutionId == null || institutionId.isBlank()
                        || (ro.getInstitution() != null && institutionId.equals(ro.getInstitution().getId())))
                .filter(ro -> type == null || type.isBlank() || type.equalsIgnoreCase(ro.getResearchType()))
                .collect(Collectors.toList());
    }

    // GET /api/v1/analytics/summary
    public Map<String, Object> getSummary(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        List<com.geeks.riis_backend.model.ResearchOutput> filtered =
                getFilteredApprovedOutputs(yearFrom, yearTo, province, institutionId, type);

        long totalApproved = filtered.size();
        long totalHeis = institutionRepository.count();
        int currentYear = Year.now().getValue();
        long activeHeis = filtered.stream()
                .filter(ro -> Objects.equals(ro.getCompletionYear(), currentYear))
                .map(ro -> ro.getInstitution() != null ? ro.getInstitution().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalApprovedOutputs", totalApproved);
        result.put("totalRegisteredHeis", totalHeis);
        result.put("activeHeisThisYear", activeHeis);
        result.put("completenessRate", 85);
        result.put("incompleteRate", 8);
        return result;
    }

    // GET /api/v1/analytics/trend
    public List<Map<String, Object>> getTrend(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        List<com.geeks.riis_backend.model.ResearchOutput> filtered =
                getFilteredApprovedOutputs(yearFrom, yearTo, province, institutionId, type);

        Map<Integer, Map<String, Long>> grouped = new TreeMap<>();
        for (com.geeks.riis_backend.model.ResearchOutput ro : filtered) {
            Integer year = ro.getCompletionYear();
            String outputType = ro.getResearchType() != null ? ro.getResearchType() : "Other";
            grouped.computeIfAbsent(year, k -> new LinkedHashMap<>())
                    .merge(outputType, 1L, Long::sum);
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
    public List<Map<String, Object>> getTypeDistribution(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        List<com.geeks.riis_backend.model.ResearchOutput> filtered =
                getFilteredApprovedOutputs(yearFrom, yearTo, province, institutionId, type);

        Map<String, Long> counts = new LinkedHashMap<>();
        for (com.geeks.riis_backend.model.ResearchOutput ro : filtered) {
            String outputType = ro.getResearchType() != null ? ro.getResearchType() : "Other";
            counts.merge(outputType, 1L, Long::sum);
        }

        List<String> colors = List.of(
                "#153e75", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"
        );

        List<Map<String, Object>> result = new ArrayList<>();
        int i = 0;
        for (Map.Entry<String, Long> entry : counts.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", entry.getKey());
            item.put("value", entry.getValue());
            item.put("color", colors.get(i % colors.size()));
            result.add(item);
            i++;
        }
        return result;
    }

    // GET /api/v1/analytics/hei-comparison
    public List<Map<String, Object>> getHeiComparison(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        List<com.geeks.riis_backend.model.ResearchOutput> filtered =
                getFilteredApprovedOutputs(yearFrom, yearTo, province, institutionId, type);

        Map<String, Long> countsByInstitution = new HashMap<>();
        for (com.geeks.riis_backend.model.ResearchOutput ro : filtered) {
            if (ro.getInstitution() == null) continue;
            countsByInstitution.merge(ro.getInstitution().getId(), 1L, Long::sum);
        }
        long total = filtered.size();

        return institutionRepository.findAll().stream()
                .map(institution -> {
                    long count = countsByInstitution.getOrDefault(institution.getId(), 0L);
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
    public List<Map<String, Object>> getProvinceSummary(Integer yearFrom, Integer yearTo, String institutionId, String type) {
        List<com.geeks.riis_backend.model.ResearchOutput> filtered =
                getFilteredApprovedOutputs(yearFrom, yearTo, null, institutionId, type);
        List<String> provinces = List.of("Cebu", "Bohol", "Negros Oriental", "Siquijor");

        return provinces.stream().map(province -> {
            long count = filtered.stream()
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
    // Returns raw {institutionId, theme, count} rows. Kept as-is shape
    // because the Research Niche Landscape panel on the frontend already
    // consumes this exact shape (theme tag-cloud, per-niche summary).
    // Do not change this method's output shape without checking that panel too.
    //
    // DAS-039-filters: province/institutionId are optional and narrow which
    // institutions' pre-aggregated theme profiles are included. yearFrom/
    // yearTo/type are NOT accepted — see the repository query's Javadoc for
    // why (theme_profiles has no per-output year/type data to filter on).
    public List<Map<String, Object>> getHeatmap(String province, String institutionId) {
        List<Object[]> rows = themeKeywordRepository.findAggregatedThemesByInstitution(province, institutionId);
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
    // Institution x 5-S&T-cluster matrix, real output counts (not keyword
    // counts), backing the redesigned ThematicDensityHeatmap.
    //
    // "clusters" in the response always lists all 5 clusters from
    // ClusterRepository, even ones with zero assigned outputs right now —
    // the join-based count query alone would silently drop empty clusters
    // from the result, which would shrink the heatmap below 5 columns.
    //
    // DAS-039-filters: yearFrom/yearTo/province/institutionId are optional.
    // Type is NOT accepted here (scope decision) — the heatmap's x-axis is
    // already the 5 S&T clusters, so it doesn't get a Type filter.
    public Map<String, Object> getClusterHeatmap(Integer yearFrom, Integer yearTo, String province, String institutionId) {
        List<Cluster> allClusters = clusterRepository.findAll();
        List<Object[]> countRows = researchOutputClusterRepository
                .countApprovedOutputsByInstitutionAndCluster(yearFrom, yearTo, province, institutionId);

        Map<String, Long> countsByInstitutionAndCluster = new HashMap<>();
        for (Object[] row : countRows) {
            String institutionId2 = String.valueOf(row[0]);
            String clusterId = String.valueOf(row[1]);
            long count = ((Number) row[3]).longValue();
            countsByInstitutionAndCluster.put(institutionId2 + "||" + clusterId, count);
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