package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ValidationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ValidationLogRepository extends JpaRepository<ValidationLog, String> {

    List<ValidationLog> findByInstitutionId(String institutionId);

    @Query("SELECT vl FROM ValidationLog vl WHERE vl.institution.id = :institutionId AND vl.passed = false")
    List<ValidationLog> findFailedByInstitutionId(@Param("institutionId") String institutionId);

    @Query("SELECT COUNT(vl) FROM ValidationLog vl WHERE vl.institution.id = :institutionId AND vl.passed = true")
    long countPassedByInstitutionId(@Param("institutionId") String institutionId);

    @Query("SELECT COUNT(vl) FROM ValidationLog vl WHERE vl.institution.id = :institutionId")
    long countByInstitutionId(@Param("institutionId") String institutionId);

    @Query("SELECT vl FROM ValidationLog vl WHERE vl.institution.id = :institutionId ORDER BY vl.createdAt DESC")
    List<ValidationLog> findByInstitutionIdOrderByCreatedAtDesc(@Param("institutionId") String institutionId);

    interface InstitutionValidationCounts {
        String getInstitutionId();
        Long getTotal();
        Long getPassed();
    }

    interface InstitutionErrorFieldCount {
        String getInstitutionId();
        String getField();
        Long getCount();
    }

    // One query for every institution (replaces 2 count queries per institution).
    @Query(value = """
            SELECT institution_id AS "institutionId",
                   COUNT(*) AS "total",
                   COUNT(*) FILTER (WHERE passed) AS "passed"
            FROM validation_logs
            GROUP BY institution_id
            """, nativeQuery = true)
    List<InstitutionValidationCounts> countsByInstitution();

    @Query(value = """
            SELECT vl.institution_id AS "institutionId",
                   e.field_name AS "field",
                   COUNT(*) AS "count"
            FROM validation_logs vl
            CROSS JOIN LATERAL (
                SELECT elem ->> 'field' AS field_name
                FROM jsonb_array_elements(CASE WHEN jsonb_typeof(vl.errors_json) = 'array'
                                               THEN vl.errors_json ELSE CAST('[]' AS jsonb) END) AS elem
                WHERE jsonb_typeof(elem) = 'object'
                UNION ALL
                SELECT k AS field_name
                FROM jsonb_object_keys(CASE WHEN jsonb_typeof(vl.errors_json) = 'object'
                                            THEN vl.errors_json ELSE CAST('{}' AS jsonb) END) AS k
            ) e
            WHERE vl.passed = false AND e.field_name IS NOT NULL
            GROUP BY vl.institution_id, e.field_name
            """, nativeQuery = true)
    List<InstitutionErrorFieldCount> errorFieldCountsByInstitution();

}

