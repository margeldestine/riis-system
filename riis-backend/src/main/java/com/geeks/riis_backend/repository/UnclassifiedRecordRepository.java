package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.UnclassifiedRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UnclassifiedRecordRepository extends JpaRepository<UnclassifiedRecord, String> {

    Optional<UnclassifiedRecord> findByResearchOutputId(String researchOutputId);

    long countByResolvedAtIsNull();
}