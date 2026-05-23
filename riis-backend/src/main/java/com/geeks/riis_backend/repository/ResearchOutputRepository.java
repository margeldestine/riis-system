package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ResearchOutput;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchOutputRepository extends JpaRepository<ResearchOutput, String>, JpaSpecificationExecutor<ResearchOutput> {

	Optional<ResearchOutput> findByReferenceNumber(String referenceNumber);

	@Query("select ro from ResearchOutput ro where ro.institution.id = :institutionId and ro.status = :status")
	List<ResearchOutput> findByInstitutionIdAndStatus(@Param("institutionId") String institutionId, @Param("status") String status);

	List<ResearchOutput> findByStatus(String status);

	@Query("select ro from ResearchOutput ro where ro.institution.id = :institutionId order by ro.createdAt desc")
	List<ResearchOutput> findByInstitutionIdOrderByCreatedAtDesc(@Param("institutionId") String institutionId);

	@Query(
			value = "SELECT * FROM research_outputs ORDER BY specter_embedding <-> cast(:embedding as vector) LIMIT :limit",
			nativeQuery = true
	)
	List<ResearchOutput> findSimilarOutputs(@Param("embedding") float[] embedding, @Param("limit") int limit);
}
