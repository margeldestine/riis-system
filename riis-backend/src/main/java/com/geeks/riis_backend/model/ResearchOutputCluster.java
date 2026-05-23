package com.geeks.riis_backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
		name = "research_output_clusters",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_research_output_clusters_one_cluster_per_output", columnNames = {"research_output_id"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchOutputCluster {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "research_output_id", nullable = false, unique = true)
	private ResearchOutput researchOutput;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "cluster_id", nullable = false)
	private Cluster cluster;

	@Column(name = "assignment_score")
	private Double assignmentScore;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "signal_scores_json", columnDefinition = "jsonb")
	private JsonNode signalScoresJson;

	@Column(name = "assigned_at", nullable = false)
	private LocalDateTime assignedAt;

	@Column(name = "is_manual_override", nullable = false)
	private boolean manualOverride;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}
