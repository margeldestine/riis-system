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