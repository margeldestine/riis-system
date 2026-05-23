package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.model.Institution;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, String> {

	Optional<Institution> findByEmailDomain(String emailDomain);

	List<Institution> findByType(String type);

	List<Institution> findByWhitelistStatus(String whitelistStatus);

    List<Institution> findByProvinceIgnoreCase(String province);

	@Query("select new com.geeks.riis_backend.dto.InstitutionDropdownItem(i.id, i.name, i.emailDomain) from Institution i where i.whitelistStatus = 'ACTIVE' order by i.name asc")
	List<InstitutionDropdownItem> findActiveDropdownItems();
}
