package com.geeks.riis_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
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
import org.hibernate.annotations.Array;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
		name = "research_outputs",
		uniqueConstraints = {
				@UniqueConstraint(name = "uq_research_outputs_reference_number", columnNames = {"reference_number"})
		}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchOutput {

	@Id
	@GeneratedValue
	@UuidGenerator
	@Column(name = "id", length = 36, nullable = false, updatable = false)
	private String id;

	@Column(name = "reference_number", length = 64, nullable = false)
	private String referenceNumber;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "institution_id", nullable = false)
	private Institution institution;

	@Column(name = "title", nullable = false, columnDefinition = "text")
	private String title;

	@Column(name = "research_type", length = 32, nullable = false)
	private String researchType;

	@Column(name = "funding_source", length = 255)
	private String fundingSource;

	@Column(name = "publication_venue", length = 255)
	private String publicationVenue;

	@Column(name = "completion_year")
	private Integer completionYear;

	@Column(name = "abstract_text", columnDefinition = "text")
	private String abstractText;

	@Column(name = "keywords", columnDefinition = "text")
	private String keywords;

	@Column(name = "subject_dc", columnDefinition = "text")
	private String subjectDc;

	@Column(name = "coverage_dc", columnDefinition = "text")
	private String coverageDc;

	@Column(name = "rights_dc", columnDefinition = "text")
	private String rightsDc;

	@Column(name = "contributor_dc", columnDefinition = "text")
	private String contributorDc;

	@Column(name = "format_dc", columnDefinition = "text")
	private String formatDc;

	@Column(name = "language_dc", columnDefinition = "text")
	private String languageDc;

	@Column(name = "relation_dc", columnDefinition = "text")
	private String relationDc;

	@Column(name = "source_dc", columnDefinition = "text")
	private String sourceDc;

	@Column(name = "publisher_dc", columnDefinition = "text")
	private String publisherDc;

	@Column(name = "identifier_dc", columnDefinition = "text")
	private String identifierDc;

	@Column(name = "doi", length = 255)
	private String doi;

	@Column(name = "s3_pdf_key", length = 1024)
	private String s3PdfKey;

	@Column(name = "status", length = 32, nullable = false)
	private String status;

	@Column(name = "correction_notes", columnDefinition = "text")
	private String correctionNotes;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reviewed_by")
	private User reviewedBy;

	@Column(name = "reviewed_at")
	private LocalDateTime reviewedAt;

	@Column(name = "specter_embedding", columnDefinition = "vector(768)")
	@JdbcTypeCode(SqlTypes.VECTOR)
	@Array(length = 768)
	private float[] specterEmbedding;

	@Column(name = "sbert_embedding", columnDefinition = "vector(768)")
	@JdbcTypeCode(SqlTypes.VECTOR)
	@Array(length = 768)
	private float[] sbertEmbedding;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "cluster_id")
	private Cluster cluster;

	@Column(name = "cluster_assigned_at")
	private LocalDateTime clusterAssignedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@OneToMany(mappedBy = "researchOutput", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<Author> authors;

	@OneToMany(mappedBy = "researchOutput", fetch = FetchType.LAZY)
	private Set<ValidationLog> validationLogs;

	@OneToOne(mappedBy = "researchOutput", fetch = FetchType.LAZY)
	private ResearchOutputCluster researchOutputCluster;

	@OneToOne(mappedBy = "researchOutput", fetch = FetchType.LAZY)
	private UnclassifiedRecord unclassifiedRecord;

	@OneToMany(mappedBy = "record", fetch = FetchType.LAZY)
	private Set<AiProcessingQueueItem> aiProcessingQueueItems;

	@OneToMany(mappedBy = "newRecord", fetch = FetchType.LAZY)
	private Set<OverlapAlert> newRecordOverlapAlerts;

	@OneToMany(mappedBy = "existingRecord", fetch = FetchType.LAZY)
	private Set<OverlapAlert> existingRecordOverlapAlerts;
}
