package com.geeks.riis_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
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
		name = "institutions",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_institutions_email_domain", columnNames = {"email_domain"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Institution {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@Column(name = "name", length = 255, nullable = false)
	private String name;

	@Column(name = "type", length = 16, nullable = false)
	private String type;

	@Column(name = "province", length = 64, nullable = false)
	private String province;

	@Column(name = "email_domain", length = 255, nullable = false)
	private String emailDomain;

	@Column(name = "contact_email", length = 320, nullable = false)
	private String contactEmail;

	@Column(name = "whitelist_status", length = 16, nullable = false)
	private String whitelistStatus;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "registered_by")
	private User registeredBy;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@OneToMany(mappedBy = "institution", fetch = FetchType.LAZY)
	private Set<User> users;

	@OneToMany(mappedBy = "institution", fetch = FetchType.LAZY)
	private Set<ResearchOutput> researchOutputs;

	@OneToMany(mappedBy = "institution", fetch = FetchType.LAZY)
	private Set<RegistrationAttempt> registrationAttempts;

	@OneToMany(mappedBy = "institution", fetch = FetchType.LAZY)
	private Set<ValidationLog> validationLogs;

	@OneToMany(mappedBy = "institution", fetch = FetchType.LAZY)
	private Set<AdminAction> adminActions;

	@OneToOne(mappedBy = "institution", fetch = FetchType.LAZY)
	private ThemeProfile themeProfile;

	@OneToMany(mappedBy = "sourceHei", fetch = FetchType.LAZY)
	private Set<CollaborationEdge> outgoingCollaborationEdges;

	@OneToMany(mappedBy = "targetHei", fetch = FetchType.LAZY)
	private Set<CollaborationEdge> incomingCollaborationEdges;
}
