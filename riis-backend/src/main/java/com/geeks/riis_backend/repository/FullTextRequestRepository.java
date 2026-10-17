package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.FullTextRequest;
import com.geeks.riis_backend.model.FullTextRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FullTextRequestRepository extends JpaRepository<FullTextRequest, String> {

    /** Research-office inbox: one HEI's requests, filtered by status, newest first via Pageable sort. */
    Page<FullTextRequest> findByInstitution_IdAndStatus(String institutionId, FullTextRequestStatus status, Pageable pageable);

    Page<FullTextRequest> findByInstitution_Id(String institutionId, Pageable pageable);

    long countByInstitution_IdAndStatus(String institutionId, FullTextRequestStatus status);

    /** Duplicate guard: same person already has an open request for this record. */
    boolean existsByResearchOutput_IdAndRequesterEmailIgnoreCaseAndStatus(
            String researchOutputId, String requesterEmail, FullTextRequestStatus status);

    Page<FullTextRequest> findByStatus(FullTextRequestStatus status, Pageable pageable);
}