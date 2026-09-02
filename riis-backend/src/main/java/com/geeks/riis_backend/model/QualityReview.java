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

/**
 * A single Claude holistic-review pass over a {@link ResearchOutput}'s PDF.
 *
 * Strictly additive to the existing submission workflow: this entity never
 * mutates {@code research_outputs.status}. {@code adminDecision} captures a
 * human admin's read on Claude's assessment (AGREE / OVERRIDE /
 * NEEDS_MORE_INFO) and is deliberately never an award/approval value —
 * Claude and this table are an aid to review, not a decision mechanism.
 * Multiple rows per {@code researchOutput} are expected (regeneration /
 * audit trail), so there is intentionally no unique constraint there.
 */
@Entity
@Table(name = "quality_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityReview {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_output_id", nullable = false)
    private ResearchOutput researchOutput;

    @Column(name = "rubric_version", length = 32, nullable = false)
    private String rubricVersion;

    @Column(name = "overall_score")
    private Integer overallScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "criteria_json", columnDefinition = "jsonb")
    private JsonNode criteriaJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "flags_json", columnDefinition = "jsonb")
    private JsonNode flagsJson;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    /** PENDING -> PROCESSING -> COMPLETE / FAILED. */
    @Column(name = "status", length = 16, nullable = false)
    private String status;

    @Column(name = "failure_reason", columnDefinition = "text")
    private String failureReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_admin_id")
    private User reviewedByAdmin;

    /** AGREE, OVERRIDE, or NEEDS_MORE_INFO — never an award/approval value. */
    @Column(name = "admin_decision", length = 32)
    private String adminDecision;

    @Column(name = "admin_notes", columnDefinition = "text")
    private String adminNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}