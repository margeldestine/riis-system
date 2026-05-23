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
		name = "collaboration_edges",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_collaboration_edges_edge", columnNames = {"source_hei_id", "target_hei_id", "edge_type"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaborationEdge {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "source_hei_id", nullable = false)
	private Institution sourceHei;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "target_hei_id", nullable = false)
	private Institution targetHei;

	@Column(name = "weight", nullable = false)
	private double weight;

	@Column(name = "edge_type", length = 32, nullable = false)
	private String edgeType;

	@Column(name = "computed_at", nullable = false)
	private LocalDateTime computedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}
