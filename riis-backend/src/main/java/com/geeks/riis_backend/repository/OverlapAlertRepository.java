package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.SimilarityDispositionStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OverlapAlertRepository extends JpaRepository<OverlapAlert, String> {

    boolean existsByNewRecordIdAndExistingRecordId(String newRecordId, String existingRecordId);

    // Dashboard reads. The entity graph loads both records, their institutions and
    // the reviewer in the same query: the Similarity Flag Log touches all of them for
    // every row, which with plain lazy loading is an N+1 on the DOST dashboard.
    @EntityGraph(attributePaths = {
            "newRecord", "newRecord.institution", "existingRecord", "existingRecord.institution", "reviewedBy"
    })
    List<OverlapAlert> findBySimilarityScoreGreaterThanEqualOrderByDetectedAtDesc(double minScore);

    @EntityGraph(attributePaths = {
            "newRecord", "newRecord.institution", "existingRecord", "existingRecord.institution", "reviewedBy"
    })
    List<OverlapAlert> findBySimilarityScoreGreaterThanEqualAndStatusOrderByDetectedAtDesc(
            double minScore, SimilarityDispositionStatus status);

    // Row lock for the duration of the disposition transaction, so two admins acting
    // on the same flag are serialised and the second one sees the first one's result.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from OverlapAlert a where a.id = :id")
    Optional<OverlapAlert> findByIdForUpdate(@Param("id") String id);

    long countByStatus(SimilarityDispositionStatus status);
}
