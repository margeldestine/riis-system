package com.geeks.riis_backend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import java.util.Collection;

import java.util.List;

@Repository
public class QualityQueryRepository {

    @PersistenceContext
    private EntityManager em;

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