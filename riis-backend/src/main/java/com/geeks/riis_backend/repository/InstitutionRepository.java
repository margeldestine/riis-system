package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.model.Institution;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, String> {

	Optional<Institution> findByEmailDomain(String emailDomain);

	List<Institution> findByType(String type);

	List<Institution> findByWhitelistStatus(String whitelistStatus);

    List<Institution> findByProvinceIgnoreCase(String province);

	@Query("select new com.geeks.riis_backend.dto.InstitutionDropdownItem(i.id, i.name, i.emailDomain) from Institution i where i.whitelistStatus = 'ACTIVE' order by i.name asc")
	List<InstitutionDropdownItem> findActiveDropdownItems();

	@Query("SELECT COUNT(ro) FROM ResearchOutput ro WHERE ro.institution.id = :institutionId AND ro.status = 'APPROVED'")
    long countApprovedOutputs(@Param("institutionId") String institutionId);

    // Priority 3: participation = ACTIVE (whitelisted) HEIs vs. ACTIVE HEIs with at least one submission.
    // Columns: province, whitelisted, participating. To count approved records only, add
    // "AND ro.status = 'APPROVED'" inside the EXISTS subquery (and the NOT EXISTS one below).
    @Query(value = """
			SELECT i.province AS province,
			       COUNT(*) AS whitelisted,
			       COUNT(*) FILTER (WHERE EXISTS (
			           SELECT 1 FROM research_outputs ro WHERE ro.institution_id = i.id)) AS participating
			FROM institutions i
			WHERE i.whitelist_status = 'ACTIVE'
			GROUP BY i.province
			ORDER BY i.province
			""", nativeQuery = true)
    List<Object[]> participationByProvince();

    // Columns: province, name. ACTIVE HEIs with no submission yet (outreach list for DOST).
    @Query(value = """
			SELECT i.province, i.name
			FROM institutions i
			WHERE i.whitelist_status = 'ACTIVE'
			  AND NOT EXISTS (SELECT 1 FROM research_outputs ro WHERE ro.institution_id = i.id)
			ORDER BY i.province, i.name
			""", nativeQuery = true)
    List<Object[]> nonParticipatingInstitutions();
}
