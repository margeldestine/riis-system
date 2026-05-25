package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ResearchOutput;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ResearchOutputRepository extends JpaRepository<ResearchOutput, String>, JpaSpecificationExecutor<ResearchOutput> {

	Optional<ResearchOutput> findByReferenceNumber(String referenceNumber);

    int countByInstitutionIdAndStatus(String institutionId, String status);
    Page<ResearchOutput> findByInstitutionIdAndStatus(String institutionId, String status, Pageable pageable);

	@Query("select ro from ResearchOutput ro where ro.institution.id = :institutionId and ro.status = :status")
	List<ResearchOutput> findByInstitutionIdAndStatus(@Param("institutionId") String institutionId, @Param("status") String status);

	List<ResearchOutput> findByStatus(String status);

	@Query("select ro from ResearchOutput ro where ro.institution.id = :institutionId order by ro.createdAt desc")
	List<ResearchOutput> findByInstitutionIdOrderByCreatedAtDesc(@Param("institutionId") String institutionId);

	@Query("""
			select distinct ro
			from ResearchOutput ro
			left join ro.authors a
			where ro.institution.id = :institutionId
			  and (
					lower(ro.title) like lower(concat('%', :keyword, '%'))
					or lower(a.fullName) like lower(concat('%', :author, '%'))
			  )
			""")
	Page<ResearchOutput> findByInstitutionIdAndTitleContainingIgnoreCaseOrAuthorsContainingIgnoreCase(
			@Param("institutionId") String institutionId,
			@Param("keyword") String keyword,
			@Param("author") String author,
			Pageable pageable
	);

	@Query(
			value = "SELECT * FROM research_outputs ORDER BY specter_embedding <-> cast(:embedding as vector) LIMIT :limit",
			nativeQuery = true
	)
	List<ResearchOutput> findSimilarOutputs(@Param("embedding") float[] embedding, @Param("limit") int limit);
	long countByTitleIgnoreCaseAndInstitutionIdAndStatusNot(String title, String institutionId, String status);

	@Query(
			value = "SELECT * FROM research_outputs WHERE status = 'APPROVED' AND id != :excludeId AND sbert_embedding IS NOT NULL AND 1 - (sbert_embedding <=> cast(:embedding as vector)) >= :threshold",
			nativeQuery = true
	)
	List<ResearchOutput> findSimilarBySbertEmbedding(
			@Param("embedding") float[] embedding,
			@Param("excludeId") String excludeId,
			@Param("threshold") double threshold
	);

    long countByStatus(String status);

    @Query("SELECT COUNT(DISTINCT ro.institution.id) FROM ResearchOutput ro WHERE ro.status = :status AND ro.completionYear = :year")
    long countDistinctInstitutionByStatusAndCompletionYear(@Param("status") String status, @Param("year") int year);

    @Query("SELECT ro.researchType, COUNT(ro) FROM ResearchOutput ro WHERE ro.status = :status GROUP BY ro.researchType")
    List<Object[]> countByStatusGroupByResearchType(@Param("status") String status);

    @Query("SELECT ro.completionYear, ro.researchType, COUNT(ro) FROM ResearchOutput ro WHERE ro.status = :status GROUP BY ro.completionYear, ro.researchType ORDER BY ro.completionYear ASC")
    List<Object[]> countByStatusGroupByYearAndType(@Param("status") String status);

	@Modifying
	@Query(value = "UPDATE research_outputs SET sbert_embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
	void updateSbertEmbedding(@Param("id") String id, @Param("embedding") float[] embedding);

	@Query(
			value = "SELECT * FROM research_outputs WHERE status = 'APPROVED' AND id != :excludeId AND specter_embedding IS NOT NULL ORDER BY specter_embedding <=> cast(:embedding as vector) LIMIT :limit",
			nativeQuery = true
	)
	List<ResearchOutput> findSimilarBySpecterEmbedding(
			@Param("embedding") float[] embedding,
			@Param("excludeId") String excludeId,
			@Param("limit") int limit
	);

	@Modifying
	@Transactional
	@Query(value = "UPDATE research_outputs SET specter_embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
	void updateSpecterEmbedding(@Param("id") String id, @Param("embedding") float[] embedding);

    Page<ResearchOutput> findByStatus(String status, Pageable pageable);
}
