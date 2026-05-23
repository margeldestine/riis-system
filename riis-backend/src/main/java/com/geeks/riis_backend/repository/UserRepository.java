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

	@Query("""
            SELECT new com.geeks.riis_backend.dto.PendingUserResponse(
                u.id,
                u.fullName,
                u.email,
                u.status,
                i.name,
                i.type,
                i.province,
                u.department,
                u.position,
                u.employeeId,
                u.createdAt
            )
            FROM User u
            LEFT JOIN u.institution i
            WHERE u.role   = :role
              AND u.status = :status
            ORDER BY u.createdAt ASC
            """)
	List<PendingUserResponse> findByRoleAndStatusForQueue(
			@Param("role")   String role,
			@Param("status") String status
	);

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);
}