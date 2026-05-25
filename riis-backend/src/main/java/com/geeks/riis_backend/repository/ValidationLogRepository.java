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
}