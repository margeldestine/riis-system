package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.SimilarityDispositionStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;
import java.util.Collection;

import java.util.List;

@Repository
public class QualityQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public List<Object[]> overlapRows(double minScore, SimilarityDispositionStatus status) {
        String jpql = """
                SELECT a.id, a.similarityScore, a.detectedAt, a.notificationSent, a.status,
                       a.dispositionNotes, a.reviewedAt, rb.fullName,
                       nr.id, nr.referenceNumber, nr.title, ni.name,
                       er.id, er.title, ei.name
                FROM OverlapAlert a
                JOIN a.newRecord nr
                LEFT JOIN nr.institution ni
                JOIN a.existingRecord er
                LEFT JOIN er.institution ei
                LEFT JOIN a.reviewedBy rb
                WHERE a.similarityScore >= :minScore
                """
                + (status != null ? " AND a.status = :status" : "")
                + " ORDER BY a.detectedAt DESC";
        TypedQuery<Object[]> q = em.createQuery(jpql, Object[].class);
        q.setParameter("minScore", minScore);
        if (status != null) q.setParameter("status", status);
        return q.getResultList();
    }

    public List<Object[]> submissionRows(String status, int offset, int limit) {
        return em.createQuery("""
                        SELECT ro.id, ro.referenceNumber, ro.title, ro.researchType, ro.fundingSource,
                               ro.completionYear, ro.createdAt, ro.status, i.id, i.name
                        FROM ResearchOutput ro
                        LEFT JOIN ro.institution i
                        WHERE ro.status = :status
                        ORDER BY ro.createdAt DESC
                        """, Object[].class)
                .setParameter("status", status)
                .setFirstResult(offset)
                .setMaxResults(limit)
                .getResultList();
    }

    public long submissionCount(String status) {
        return em.createQuery(
                        "SELECT COUNT(ro) FROM ResearchOutput ro WHERE ro.status = :status", Long.class)
                .setParameter("status", status)
                .getSingleResult();
    }

    /** Rows: [researchOutputId, authorFullName] for the given outputs, in one query. */
    public List<Object[]> authorNames(Collection<String> outputIds) {
        if (outputIds == null || outputIds.isEmpty()) return List.of();
        return em.createQuery("""
                        SELECT a.researchOutput.id, a.fullName
                        FROM Author a
                        WHERE a.researchOutput.id IN :ids
                        ORDER BY a.createdAt, a.fullName
                        """, Object[].class)
                .setParameter("ids", outputIds)
                .getResultList();
    }
}