package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ResearchOutput;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
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

	// Requirement 2: records that have a PDF but no saved file details yet (used by the one-time backfill).
	List<ResearchOutput> findByS3PdfKeyIsNotNullAndAttachmentSizeBytesIsNull();

	/** Only the id and DOI, so the citation job does not load whole records (with their embeddings). */
	interface CitationCandidate {
		String getId();
		String getDoi();
	}

	// Requirement 1: approved records that have a DOI and were never checked, or not checked since the cutoff.
	@Query("SELECT ro.id AS id, ro.doi AS doi FROM ResearchOutput ro "
			+ "WHERE ro.status = 'APPROVED' AND ro.doi IS NOT NULL AND ro.doi <> '' "
			+ "AND (ro.citationCheckedAt IS NULL OR ro.citationCheckedAt < :cutoff)")
	List<CitationCandidate> findCitationCandidates(@Param("cutoff") LocalDateTime cutoff);

	@Modifying
	@Transactional
	@Query("UPDATE ResearchOutput ro SET ro.citationCount = :count, ro.citationSource = :source, "
			+ "ro.citationCheckedAt = :checkedAt WHERE ro.id = :id")
	int updateCitation(@Param("id") String id, @Param("count") Integer count,
			@Param("source") String source, @Param("checkedAt") LocalDateTime checkedAt);

	// DOI not known to the service: remember that we asked, but keep any count we already had.
	@Modifying
	@Transactional
	@Query("UPDATE ResearchOutput ro SET ro.citationSource = :source, ro.citationCheckedAt = :checkedAt WHERE ro.id = :id")
	int markCitationChecked(@Param("id") String id, @Param("source") String source,
			@Param("checkedAt") LocalDateTime checkedAt);

	@Modifying
	@Transactional
	@Query("UPDATE ResearchOutput ro SET ro.attachmentFileName = :fileName, ro.attachmentContentType = :contentType, "
			+ "ro.attachmentSizeBytes = :sizeBytes WHERE ro.id = :id")
	int updateAttachmentDetails(@Param("id") String id, @Param("fileName") String fileName,
			@Param("contentType") String contentType, @Param("sizeBytes") Long sizeBytes);

	/** Browse Research only: loads each record together with its institution in ONE query (no per-record institution lookups). */
	@Query("select ro from ResearchOutput ro join fetch ro.institution where ro.status = :status")
	List<ResearchOutput> findByStatusWithInstitution(@Param("status") String status);

	/** Browse Research only: loads authors for many records in ONE query. Each row is [researchOutputId, Author]. */
	@Query("select a.researchOutput.id, a from Author a where a.researchOutput.id in :ids")
	List<Object[]> findAuthorRowsByResearchOutputIds(@Param("ids") java.util.Collection<String> ids);

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

	@Query(
			value = """
					SELECT ro.*
					FROM research_outputs ro
					JOIN institutions i ON i.id = ro.institution_id
					WHERE ro.status = 'APPROVED'
					  AND ro.specter_embedding IS NOT NULL
					  AND ro.id <> cast(:excludeId as text)
					  AND (ro.visibility = 'PUBLIC'
					       OR cast(:seeAll as boolean) = true
					       OR ro.institution_id = cast(:viewerInstitutionId as text))
					  AND (cast(:institutionId as text) IS NULL OR ro.institution_id = cast(:institutionId as text))
					  AND (cast(:province as text) IS NULL OR lower(i.province) = lower(cast(:province as text)))
					  AND (cast(:researchType as text) IS NULL OR lower(ro.research_type) = lower(cast(:researchType as text)))
					  AND (cast(:year as integer) IS NULL OR ro.completion_year = cast(:year as integer))
					  AND (cast(:fundingSource as text) IS NULL
					       OR lower(ro.funding_source) LIKE lower(concat('%', cast(:fundingSource as text), '%')))
					ORDER BY ro.specter_embedding <=> cast(:embedding as vector)
					LIMIT :limit
					""",
			nativeQuery = true
	)
	List<ResearchOutput> findSimilarForViewer(
			@Param("embedding") float[] embedding,
			@Param("excludeId") String excludeId,
			@Param("limit") int limit,
			@Param("institutionId") String institutionId,
			@Param("province") String province,
			@Param("researchType") String researchType,
			@Param("year") Integer year,
			@Param("fundingSource") String fundingSource,
			@Param("seeAll") boolean seeAll,
			@Param("viewerInstitutionId") String viewerInstitutionId
	);

	@Modifying
	@Transactional
	@Query(value = "UPDATE research_outputs SET specter_embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
	void updateSpecterEmbedding(@Param("id") String id, @Param("embedding") float[] embedding);

	Page<ResearchOutput> findByStatus(String status, Pageable pageable);

	@Query(value = """
        SELECT title
        FROM research_outputs
        WHERE institution_id = :institutionId
          AND status = 'APPROVED'
          AND (
                LOWER(title) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(abstract_text) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(keywords) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY created_at DESC
        LIMIT :limit
        """, nativeQuery = true)
	List<String> findTopTitlesByInstitutionAndKeyword(
			@org.springframework.data.repository.query.Param("institutionId") String institutionId,
			@org.springframework.data.repository.query.Param("keyword") String keyword,
			@org.springframework.data.repository.query.Param("limit") int limit
	);

	@Query("""
			SELECT DISTINCT new com.geeks.riis_backend.dto.SubmitterDTO(u.id, u.fullName)
			FROM ResearchOutput ro
			JOIN ro.submittedBy u
			WHERE ro.institution.id = :institutionId
			ORDER BY u.fullName ASC
			""")
	List<com.geeks.riis_backend.dto.SubmitterDTO> findDistinctSubmittersByInstitutionId(
			@Param("institutionId") String institutionId
	);
}

