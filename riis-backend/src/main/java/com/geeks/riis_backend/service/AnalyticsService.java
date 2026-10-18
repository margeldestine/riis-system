package com.geeks.riis_backend.service;

import com.geeks.riis_backend.repository.AnalyticsQueryRepository;
import com.geeks.riis_backend.repository.AnalyticsQueryRepository.Filter;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Priority 4 (dashboard performance): the research-output panels now run one
 * grouped SQL query each (see AnalyticsQueryRepository) instead of loading every
 * approved record and filtering/aggregating in Java. Response shapes are
 * unchanged, so the frontend needs no changes for this step.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private final AnalyticsQueryRepository analyticsQueryRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final InstitutionRepository institutionRepository;
    private final com.geeks.riis_backend.repository.ThemeKeywordRepository themeKeywordRepository;

    // The 5 fixed S&T research themes captured at submission via
    // sAndTTheme -> research_outputs.subjectDc (see SubmissionPortal.jsx).
    private static final List<String> ST_THEMES = List.of(
            "Health & Medical",
            "Climate & Env",
            "Agriculture",
            "Education & Social",
            "Tech & Innovation"
    );

    private static long num(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    // GET /api/v1/analytics/summary
    public Map<String, Object> getSummary(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, type);
        int currentYear = Year.now().getValue();
        Object[] row = analyticsQueryRepository.summaryRow(f, currentYear);

        long totalApproved = num(row[0]);
        long completeCount = num(row[1]);
        long activeHeis = num(row[2]);
        long totalHeis = institutionRepository.count();

        int completenessRate = totalApproved > 0
                ? (int) Math.round((completeCount * 100.0) / totalApproved)
                : 0;
        int incompleteRate = totalApproved > 0 ? 100 - completenessRate : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalApprovedOutputs", totalApproved);
        result.put("totalRegisteredHeis", totalHeis);
        result.put("activeHeisThisYear", activeHeis);
        result.put("completenessRate", completenessRate);
        result.put("incompleteRate", incompleteRate);
        return result;
    }

    // GET /api/v1/analytics/trend
    public List<Map<String, Object>> getTrend(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, type);
        // Rows arrive ordered by year; LinkedHashMap keeps that order.
        Map<Integer, Map<String, Object>> byYear = new LinkedHashMap<>();
        for (Object[] row : analyticsQueryRepository.trendRows(f)) {
            Integer year = ((Number) row[0]).intValue();
            String outputType = row[1] != null ? (String) row[1] : "Other";
            Map<String, Object> point = byYear.computeIfAbsent(year, y -> {
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("year", String.valueOf(y));
                return p;
            });
            point.put(outputType, num(row[2]));
        }
        return new ArrayList<>(byYear.values());
    }

    // GET /api/v1/analytics/type-distribution
    public List<Map<String, Object>> getTypeDistribution(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, type);
        List<String> colors = List.of("#153e75", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe");

        List<Map<String, Object>> result = new ArrayList<>();
        int i = 0;
        for (Object[] row : analyticsQueryRepository.typeCounts(f)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row[0] != null ? row[0] : "Other");
            item.put("value", num(row[1]));
            item.put("color", colors.get(i % colors.size()));
            result.add(item);
            i++;
        }
        return result;
    }

    // GET /api/v1/analytics/hei-comparison
    public List<Map<String, Object>> getHeiComparison(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, type);

        Map<String, Long> countsByInstitution = new HashMap<>();
        long total = 0;
        for (Object[] row : analyticsQueryRepository.countsByInstitution(f)) {
            long c = num(row[1]);
            countsByInstitution.put((String) row[0], c);
            total += c;
        }
        final long totalFinal = total;

        return institutionRepository.findAll().stream()
                .map(institution -> {
                    long count = countsByInstitution.getOrDefault(institution.getId(), 0L);
                    int progress = totalFinal > 0 ? (int) ((count * 100) / totalFinal) : 0;

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
    public List<Map<String, Object>> getProvinceSummary(Integer yearFrom, Integer yearTo, String province, String institutionId, String type) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, type);

        Map<String, Long> countsByProvince = new HashMap<>();
        for (Object[] row : analyticsQueryRepository.countsByProvince(f)) {
            if (row[0] != null) {
                countsByProvince.put(((String) row[0]).toLowerCase(Locale.ROOT), num(row[1]));
            }
        }

        List<String> provinces = (province == null || province.isBlank())
                ? List.of("Cebu", "Bohol", "Negros Oriental", "Siquijor")
                : List.of(province);

        return provinces.stream().map(p -> {
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("name", p);
            card.put("value", countsByProvince.getOrDefault(p.trim().toLowerCase(Locale.ROOT), 0L));
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
    // Institution x 5-S&T-theme matrix grouped directly off research_outputs.subjectDc.
    // Response shape is unchanged: "clusterId"/"clusterName" are the raw theme string.
    // "clusters" always lists all 5 themes, even those with zero outputs.
    // Type is NOT accepted here (unchanged scope decision).
    public Map<String, Object> getClusterHeatmap(Integer yearFrom, Integer yearTo, String province, String institutionId) {
        Filter f = Filter.of(yearFrom, yearTo, province, institutionId, null);

        List<Map<String, String>> clusters = ST_THEMES.stream()
                .map(theme -> {
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("clusterId", theme);
                    item.put("clusterName", theme);
                    return item;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> cells = new ArrayList<>();
        for (Object[] row : analyticsQueryRepository.themeCountsByInstitution(f)) {
            String theme = (String) row[1];
            // Ignore legacy/free-text subjectDc values outside the 5 canonical themes.
            if (!ST_THEMES.contains(theme)) {
                continue;
            }
            Map<String, Object> cell = new LinkedHashMap<>();
            cell.put("institutionId", row[0]);
            cell.put("clusterId", theme);
            cell.put("count", num(row[2]));
            cells.add(cell);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("clusters", clusters);
        result.put("cells", cells);
        return result;
    }

}