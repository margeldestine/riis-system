package com.geeks.riis_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(
		name = "users",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_users_email", columnNames = {"email"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@Column(name = "full_name", length = 255, nullable = false)
	private String fullName;

	@Column(name = "email", length = 320, nullable = false)
	private String email;

	@Column(name = "password_hash", length = 255, nullable = false)
	private String passwordHash;

	@Column(name = "role", length = 16, nullable = false)
	private String role;

	@Column(name = "status", length = 32, nullable = false)
	private String status;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "institution_id")
	private Institution institution;

	@Column(name = "department", length = 255)
	private String department;

	@Column(name = "position", length = 255)
	private String position;

	@Column(name = "employee_id", length = 64)
	private String employeeId;

	@Column(name = "must_reset_password", nullable = false)
	private boolean mustResetPassword;

	@Column(name = "email_verified_at")
	private LocalDateTime emailVerifiedAt;

	@Column(name = "last_login_at")
	private LocalDateTime lastLoginAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
	private Set<RefreshToken> refreshTokens;

	@OneToMany(mappedBy = "registeredBy", fetch = FetchType.LAZY)
	private Set<Institution> registeredInstitutions;

	@OneToMany(mappedBy = "reviewedBy", fetch = FetchType.LAZY)
	private Set<ResearchOutput> reviewedResearchOutputs;

	@OneToMany(mappedBy = "resolvedBy", fetch = FetchType.LAZY)
	private Set<UnclassifiedRecord> resolvedUnclassifiedRecords;

	@OneToMany(mappedBy = "adminUser", fetch = FetchType.LAZY)
	private Set<AdminAction> adminActions;

	@OneToMany(mappedBy = "actor", fetch = FetchType.LAZY)
	private Set<AuditLogEntry> auditLogEntries;

	@OneToMany(mappedBy = "actor", fetch = FetchType.LAZY)
	private Set<ReportJob> reportJobs;
}
