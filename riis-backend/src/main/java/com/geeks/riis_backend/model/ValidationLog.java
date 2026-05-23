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
@Table(name = "validation_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationLog {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "research_output_id", nullable = false)
	private ResearchOutput researchOutput;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "institution_id", nullable = false)
	private Institution institution;

	@Column(name = "validated_at", nullable = false)
	private LocalDateTime validatedAt;

	@Column(name = "passed", nullable = false)
	private boolean passed;

	@Column(name = "error_count", nullable = false)
	private int errorCount;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "errors_json", columnDefinition = "jsonb")
	private JsonNode errorsJson;

	@Column(name = "triggered_by", length = 16, nullable = false)
	private String triggeredBy;

	@Column(name = "has_warnings", nullable = false)
	private boolean hasWarnings;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}
