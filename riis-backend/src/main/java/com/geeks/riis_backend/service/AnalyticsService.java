package com.geeks.riis_backend.service;

import com.geeks.riis_backend.repository.InstitutionRepository;
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

        // Build map: year -> { researchType -> count }
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
}