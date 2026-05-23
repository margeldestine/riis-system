package com.geeks.riis_backend.model;

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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "ai_processing_queue")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiProcessingQueueItem {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "record_id", nullable = false)
	private ResearchOutput record;

	@Column(name = "task_type", length = 16, nullable = false)
	private String taskType;

	@Column(name = "status", length = 16, nullable = false)
	private String status;

	@Column(name = "attempts", nullable = false)
	private int attempts;

	@Column(name = "next_retry")
	private LocalDateTime nextRetry;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
