package com.geeks.riis_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(
		name = "overlap_alerts",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_overlap_alerts_pair", columnNames = {"new_record_id", "existing_record_id"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OverlapAlert {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "new_record_id", nullable = false)
	private ResearchOutput newRecord;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "existing_record_id", nullable = false)
	private ResearchOutput existingRecord;

	@Column(name = "similarity_score", nullable = false)
	private double similarityScore;

	@Column(name = "detected_at", nullable = false)
	private LocalDateTime detectedAt;

	@Column(name = "notification_sent", nullable = false)
	private boolean notificationSent;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}
