package com.geeks.riis_backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
@Table(name = "report_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportJob {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "actor_id")
	private User actor;

	@Column(name = "status", length = 32, nullable = false)
	private String status;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "filters_json", columnDefinition = "jsonb")
	private JsonNode filtersJson;

	@Column(name = "output_format", length = 32, nullable = false)
	private String outputFormat;

	@Column(name = "s3_key", length = 1024)
	private String s3Key;

	@Column(name = "download_url", columnDefinition = "text")
	private String downloadUrl;

	@Column(name = "record_count")
	private Integer recordCount;

	@Column(name = "error_message", columnDefinition = "text")
	private String errorMessage;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;
}
