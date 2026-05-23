package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	@Query("select u from User u where u.institution.id = :institutionId")
	List<User> findByInstitutionId(@Param("institutionId") String institutionId);

	@Query("""
			select new com.geeks.riis_backend.dto.PendingUserResponse(
				u.id,
				u.fullName,
				u.email,
				i.name,
				u.department,
				u.position
			)
			from User u
			left join u.institution i
			where u.status = :status
			order by u.createdAt asc
			""")
	List<PendingUserResponse> findUsersByStatusForPendingList(@Param("status") String status);
}
