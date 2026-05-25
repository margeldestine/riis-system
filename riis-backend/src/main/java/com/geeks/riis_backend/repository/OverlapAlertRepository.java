package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.OverlapAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OverlapAlertRepository extends JpaRepository<OverlapAlert, String> {
    boolean existsByNewRecordIdAndExistingRecordId(String newRecordId, String existingRecordId);
}