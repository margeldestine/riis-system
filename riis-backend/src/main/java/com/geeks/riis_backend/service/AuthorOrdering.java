package com.geeks.riis_backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/**
 * Requirement 14: puts the principal author first in the author list of a public record, so the
 * record page, the result cards and the generated citations all list that person first.
 *
 * There is no Spring code here on purpose, so the rule is easy to unit test.
 */
final class AuthorOrdering {

    private AuthorOrdering() {}

    /**
     * Returns the items in their stored order, except that the first item whose name matches the
     * principal author is moved to the front. Names are compared ignoring case and extra spaces. If
     * there is no principal author, or nobody matches (older records may not match exactly), the stored
     * order is returned unchanged.
     */
    static <T> List<T> principalFirst(Collection<T> items, Function<T, String> nameOf, String principal) {
        List<T> ordered = new ArrayList<>(items == null ? List.<T>of() : items);
        String wanted = normalize(principal);
        if (wanted.isEmpty()) {
            return ordered;
        }
        for (int index = 0; index < ordered.size(); index++) {
            if (normalize(nameOf.apply(ordered.get(index))).equals(wanted)) {
                if (index > 0) {
                    ordered.add(0, ordered.remove(index));
                }
                return ordered;
            }
        }
        return ordered;
    }

    /**
     * Returns the items in a stable order: oldest creation time first, then by id. Items with no
     * creation time or no id go last. Authors are kept in a set, so the database and the entity can
     * return them in a different order on every load. Sorting first makes the order the same on
     * every load. It is NOT the order the member typed the authors in, because that was never
     * stored. Items must not be null. The input collection is not changed.
     */
    static <T> List<T> stableOrder(Collection<T> items, Function<T, LocalDateTime> createdAtOf,
            Function<T, String> idOf) {
        List<T> ordered = new ArrayList<>(items == null ? List.<T>of() : items);
        Comparator<T> byTimeThenId = (x, y) -> {
            int byTime = compareNullsLast(createdAtOf.apply(x), createdAtOf.apply(y));
            return byTime != 0 ? byTime : compareNullsLast(idOf.apply(x), idOf.apply(y));
        };
        ordered.sort(byTimeThenId);
        return ordered;
    }

    private static int compareNullsLast(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b == null ? 0 : 1;
        if (b == null) return -1;
        return a.compareTo(b);
    }

    private static int compareNullsLast(String a, String b) {
        if (a == null) return b == null ? 0 : 1;
        if (b == null) return -1;
        return a.compareTo(b);
    }

    private static String normalize(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
