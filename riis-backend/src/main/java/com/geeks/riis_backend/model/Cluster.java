package com.geeks.riis_backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
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
import org.hibernate.annotations.Array;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
		name = "clusters",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_clusters_slug", columnNames = {"slug"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cluster {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@Column(name = "name", length = 255, nullable = false)
	private String name;

	@Column(name = "slug", length = 128, nullable = false)
	private String slug;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "vocabulary_json", columnDefinition = "jsonb")
	private JsonNode vocabularyJson;

	@Column(name = "centroid_vector", columnDefinition = "vector(768)")
	@JdbcTypeCode(SqlTypes.VECTOR)
	@Array(length = 768)
	private float[] centroidVector;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@OneToMany(mappedBy = "cluster", fetch = FetchType.LAZY)
	private Set<ResearchOutput> researchOutputs;

	@OneToMany(mappedBy = "cluster", fetch = FetchType.LAZY)
	private Set<ResearchOutputCluster> researchOutputClusters;
}

