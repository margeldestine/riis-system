package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ThemeKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ThemeKeywordRepository extends JpaRepository<ThemeKeyword, String> {

    @Query(value = """
            SELECT tp.institution_id, tk.keyword, SUM(tk.occurrence_count) as count
            FROM theme_keywords tk
            JOIN theme_profiles tp ON tk.theme_profile_id = tp.id
            GROUP BY tp.institution_id, tk.keyword
            ORDER BY count DESC
            """, nativeQuery = true)
    List<Object[]> findAggregatedThemesByInstitution();

    // DAS-039-filters: Province/HEI-filtered variant backing the Regional
    // Research Niche Landscape panel. Year and Type are intentionally NOT
    // supported here — theme_profiles is one rolled-up row per institution
    // aggregated across that institution's entire submission history, with
    // no link back to individual research_outputs rows (no completion_year,
    // no research_type). Filtering by those would require re-deriving theme
    // profiles per query, which the KeyBERT pipeline isn't built for.
    @Query(value = """
            SELECT tp.institution_id, tk.keyword, SUM(tk.occurrence_count) as count
            FROM theme_keywords tk
            JOIN theme_profiles tp ON tk.theme_profile_id = tp.id
            JOIN institutions i ON i.id = tp.institution_id
            WHERE (:province IS NULL OR i.province = :province)
              AND (:institutionId IS NULL OR tp.institution_id = :institutionId)
            GROUP BY tp.institution_id, tk.keyword
            ORDER BY count DESC
            """, nativeQuery = true)
    List<Object[]> findAggregatedThemesByInstitution(
            @org.springframework.data.repository.query.Param("province") String province,
            @org.springframework.data.repository.query.Param("institutionId") String institutionId);

    @Query(value = """
            SELECT tk.keyword, SUM(tk.occurrence_count) as count
            FROM theme_keywords tk
            JOIN theme_profiles tp ON tk.theme_profile_id = tp.id
            WHERE tp.institution_id = :institutionId
            ORDER BY count DESC
            LIMIT 10
            """, nativeQuery = true)
    List<Object[]> findTopKeywordsByInstitutionId(@org.springframework.data.repository.query.Param("institutionId") String institutionId);
}