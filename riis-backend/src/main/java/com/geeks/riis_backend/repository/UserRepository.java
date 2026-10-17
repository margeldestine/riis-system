package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

	List<User> findByEmployeeId(String employeeId);

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	// UC-M5-03: used before deactivating/suspending an HEI so the admin can
	// be warned if doing so would strand currently-active staff accounts.
	long countByInstitutionIdAndRoleAndStatus(String institutionId, String role, String status);

	// Full-text request routing: active staff of one institution (fallback recipients).
	List<User> findByInstitutionIdAndRoleAndStatus(String institutionId, String role, String status);

	@Query("""
            SELECT new com.geeks.riis_backend.dto.PendingUserResponse(
                u.id,
                u.fullName,
                u.email,
                u.status,
                u.role,
                i.id,
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
            WHERE (:role IS NULL OR u.role = :role)
              AND (:status IS NULL OR u.status = :status)
              AND (:institutionId IS NULL OR i.id = :institutionId)
              AND (:search IS NULL OR LOWER(u.fullName) LIKE :search OR LOWER(u.email) LIKE :search)
            ORDER BY u.createdAt DESC
            """)
	Page<PendingUserResponse> searchAccounts(
			@Param("role") String role,
			@Param("status") String status,
			@Param("institutionId") String institutionId,
			@Param("search") String search,
			Pageable pageable
	);
}