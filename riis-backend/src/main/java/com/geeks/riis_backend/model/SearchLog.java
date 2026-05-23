package com.geeks.riis_backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
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
@Table(name = "search_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchLog {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@Column(name = "query_hash", length = 128, nullable = false)
	private String queryHash;

	@Column(name = "search_mode", length = 32, nullable = false)
	private String searchMode;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "filter_json", columnDefinition = "jsonb")
	private JsonNode filterJson;

	@Column(name = "result_count", nullable = false)
	private int resultCount;

	@Column(name = "response_ms", nullable = false)
	private int responseMs;

	@Column(name = "was_fallback", nullable = false)
	private boolean fallback;

	@Column(name = "searched_at", nullable = false)
	private LocalDateTime searchedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}
