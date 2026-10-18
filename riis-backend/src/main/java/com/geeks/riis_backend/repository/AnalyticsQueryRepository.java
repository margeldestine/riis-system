package com.geeks.riis_backend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Locale;

/**
 * Priority 4 (dashboard performance): database-side aggregates for the DOST
 * analytics panels.
 *
 * Before: every panel loaded ALL approved ResearchOutput entities into memory,
 * filtered them in Java, and triggered lazy loads (institution, authors) row by
 * row (N+1). Each lazy load is a network round trip to the database.
 *
 * After: each panel runs ONE grouped query and gets back only the numbers it
 * needs. The optional filters are appended to the WHERE clause only when they
 * are set, so no query ever binds a null parameter (which Postgres cannot type).
 */
@Repository
public class AnalyticsQueryRepository {

    @PersistenceContext
    private EntityManager em;

    /** Normalised filter: blank strings become null. */
    public record Filter(Integer yearFrom, Integer yearTo, String province,
                         String institutionId, String type) {
        public static Filter of(Integer yearFrom, Integer yearTo, String province,
                                String institutionId, String type) {
            return new Filter(
                    yearFrom,
                    yearTo,
                    blankToNull(province) == null ? null : province.trim().toLowerCase(Locale.ROOT),
                    blankToNull(institutionId),
                    blankToNull(type) == null ? null : type.trim().toLowerCase(Locale.ROOT));
        }

        private static String blankToNull(String s) {
            return (s == null || s.isBlank()) ? null : s;
        }
    }

    private static final String FROM_APPROVED =
            " FROM ResearchOutput ro JOIN ro.institution i WHERE ro.status = 'APPROVED'";

    private String filterClause(Filter f) {
        StringBuilder sb = new StringBuilder();
        if (f.yearFrom() != null) sb.append(" AND ro.completionYear >= :yearFrom");
        if (f.yearTo() != null) sb.append(" AND ro.completionYear <= :yearTo");
        if (f.province() != null) sb.append(" AND LOWER(i.province) = :province");
        if (f.institutionId() != null) sb.append(" AND i.id = :institutionId");
        if (f.type() != null) sb.append(" AND LOWER(ro.researchType) = :type");
        return sb.toString();
    }

    private <T> TypedQuery<T> bind(TypedQuery<T> q, Filter f) {
        if (f.yearFrom() != null) q.setParameter("yearFrom", f.yearFrom());
        if (f.yearTo() != null) q.setParameter("yearTo", f.yearTo());
        if (f.province() != null) q.setParameter("province", f.province());
        if (f.institutionId() != null) q.setParameter("institutionId", f.institutionId());
        if (f.type() != null) q.setParameter("type", f.type());
        return q;
    }

    private List<Object[]> run(String select, String groupOrder, Filter f) {
        String jpql = select + FROM_APPROVED + filterClause(f) + groupOrder;
        return bind(em.createQuery(jpql, Object[].class), f).getResultList();
    }

    /**
     * One row: [totalApproved, completeCount, activeHeisInCurrentYear].
     * "Complete" mirrors AnalyticsService's original hasAllRequiredMetadata():
     * title, at least one author, abstract, keywords, research type,
     * completion year and publication venue all present and non-blank.
     */
    public Object[] summaryRow(Filter f, int currentYear) {
        String select = """
                SELECT COUNT(ro),
                       COUNT(CASE WHEN (ro.title IS NOT NULL AND TRIM(ro.title) <> ''
                                    AND EXISTS (SELECT 1 FROM Author a WHERE a.researchOutput = ro)
                                    AND ro.abstractText IS NOT NULL AND TRIM(ro.abstractText) <> ''
                                    AND ro.keywords IS NOT NULL AND TRIM(ro.keywords) <> ''
                                    AND ro.researchType IS NOT NULL AND TRIM(ro.researchType) <> ''
                                    AND ro.completionYear IS NOT NULL
                                    AND ro.publicationVenue IS NOT NULL AND TRIM(ro.publicationVenue) <> '')
                                  THEN 1 END),
                       COUNT(DISTINCT CASE WHEN ro.completionYear = :currentYear THEN i.id END)
                """;
        String jpql = select + FROM_APPROVED + filterClause(f);
        TypedQuery<Object[]> q = em.createQuery(jpql, Object[].class);
        q.setParameter("currentYear", currentYear);
        return bind(q, f).getSingleResult();
    }

    /** Rows: [year, researchType, count], ordered by year. Records without a year are skipped. */
    public List<Object[]> trendRows(Filter f) {
        return run("SELECT ro.completionYear, ro.researchType, COUNT(ro)",
                " AND ro.completionYear IS NOT NULL"
                        + " GROUP BY ro.completionYear, ro.researchType ORDER BY ro.completionYear", f);
    }

    /** Rows: [researchType, count], ordered by type so chart colours stay stable. */
    public List<Object[]> typeCounts(Filter f) {
        return run("SELECT ro.researchType, COUNT(ro)",
                " GROUP BY ro.researchType ORDER BY ro.researchType", f);
    }

    /** Rows: [institutionId, count]. */
    public List<Object[]> countsByInstitution(Filter f) {
        return run("SELECT i.id, COUNT(ro)", " GROUP BY i.id", f);
    }

    /** Rows: [lower(province), count]. */
    public List<Object[]> countsByProvince(Filter f) {
        return run("SELECT LOWER(i.province), COUNT(ro)", " GROUP BY LOWER(i.province)", f);
    }

    /** Rows: [institutionId, subjectDc, count]; records with no theme are skipped. */
    public List<Object[]> themeCountsByInstitution(Filter f) {
        return run("SELECT i.id, ro.subjectDc, COUNT(ro)",
                " AND ro.subjectDc IS NOT NULL AND TRIM(ro.subjectDc) <> ''"
                        + " GROUP BY i.id, ro.subjectDc", f);
    }

    // ---- HEI list (InstitutionService.listAll) -------------------------------

    /** Rows: [institutionId, approvedCount] for every institution that has approved outputs. */
    public List<Object[]> approvedCountsByInstitution() {
        return em.createQuery(
                "SELECT ro.institution.id, COUNT(ro) FROM ResearchOutput ro "
                        + "WHERE ro.status = 'APPROVED' GROUP BY ro.institution.id",
                Object[].class).getResultList();
    }

    /** Rows: [institutionId, keyword, weight] for every theme keyword of every institution. */
    public List<Object[]> themeKeywordRows() {
        return em.createQuery(
                "SELECT tp.institution.id, tk.keyword, tk.weight FROM ThemeKeyword tk "
                        + "JOIN tk.themeProfile tp",
                Object[].class).getResultList();
    }
}