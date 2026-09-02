package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.QualityReview;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QualityReviewRepository extends JpaRepository<QualityReview, String> {

    /**
     * Multiple QualityReview rows can exist per research output (audit trail /
     * regeneration), so callers that want "the current one" go through here
     * rather than assuming a 1:1 relationship.
     */
    Optional<QualityReview> findFirstByResearchOutputIdOrderByCreatedAtDesc(String researchOutputId);

    /**
     * Full review history for an output, newest first — powers the admin
     * history view and audit trail across regenerations.
     */
    List<QualityReview> findAllByResearchOutputIdOrderByCreatedAtDesc(String researchOutputId);
}