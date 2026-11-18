package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

class AuthorOrderingTest {

    private static final Function<String, String> SELF = name -> name;

    @Test
    void movesThePrincipalAuthorToTheFrontAndKeepsTheRestInOrder() {
        List<String> authors = List.of("Ana Lopez", "Juan Santos", "Maria dela Cruz", "Ben Tan");
        assertEquals(List.of("Maria dela Cruz", "Ana Lopez", "Juan Santos", "Ben Tan"),
                AuthorOrdering.principalFirst(authors, SELF, "Maria dela Cruz"));
    }

    @Test
    void ignoresCaseAndExtraSpacesWhenMatching() {
        List<String> authors = List.of("Ana Lopez", "Juan  Santos");
        assertEquals(List.of("Juan  Santos", "Ana Lopez"),
                AuthorOrdering.principalFirst(authors, SELF, "  juan santos "));
    }

    @Test
    void keepsTheStoredOrderWhenThereIsNoPrincipalOrNoMatch() {
        List<String> authors = List.of("Ana Lopez", "Juan Santos");
        assertEquals(authors, AuthorOrdering.principalFirst(authors, SELF, null));
        assertEquals(authors, AuthorOrdering.principalFirst(authors, SELF, "   "));
        assertEquals(authors, AuthorOrdering.principalFirst(authors, SELF, "Someone Else"));
    }

    @Test
    void anAlreadyFirstPrincipalChangesNothing() {
        List<String> authors = List.of("Ana Lopez", "Juan Santos");
        assertEquals(authors, AuthorOrdering.principalFirst(authors, SELF, "Ana Lopez"));
    }

    @Test
    void onlyTheFirstMatchMoves() {
        List<String> authors = List.of("Ben Tan", "Ana Lopez", "Ana Lopez");
        assertEquals(List.of("Ana Lopez", "Ben Tan", "Ana Lopez"),
                AuthorOrdering.principalFirst(authors, SELF, "Ana Lopez"));
    }

    @Test
    void handlesNullInputsAndNullNames() {
        assertEquals(List.of(), AuthorOrdering.principalFirst(null, SELF, "Ana Lopez"));
        List<String> withNull = java.util.Arrays.asList("Ana Lopez", null, "Juan Santos");
        assertEquals(java.util.Arrays.asList("Juan Santos", "Ana Lopez", null),
                AuthorOrdering.principalFirst(withNull, SELF, "Juan Santos"));
    }

    private record Row(String id, LocalDateTime createdAt) {}

    private static List<Row> stable(List<Row> rows) {
        return AuthorOrdering.stableOrder(rows, Row::createdAt, Row::id);
    }

    @Test
    void stableOrderSortsByCreationTimeThenId() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 1, 10, 0, 0);
        Row late = new Row("z", t.plusSeconds(5));
        Row tieB = new Row("b", t);
        Row tieA = new Row("a", t);
        assertEquals(List.of(tieA, tieB, late), stable(List.of(late, tieB, tieA)));
        assertEquals(List.of(tieA, tieB, late), stable(List.of(tieA, late, tieB)));
    }

    @Test
    void stableOrderPutsMissingTimesAndIdsLast() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 1, 10, 0, 0);
        Row noTime = new Row("n", null);
        Row noId = new Row(null, t);
        Row normal = new Row("x", t);
        assertEquals(List.of(normal, noId, noTime), stable(List.of(noTime, noId, normal)));
        assertEquals(List.of(normal, noId, noTime), stable(List.of(normal, noTime, noId)));
    }

    @Test
    void stableOrderHandlesNullAndLeavesTheInputAlone() {
        assertEquals(List.of(), AuthorOrdering.<Row>stableOrder(null, Row::createdAt, Row::id));
        LocalDateTime t = LocalDateTime.of(2026, 11, 1, 10, 0, 0);
        List<Row> input = new java.util.ArrayList<>(List.of(new Row("b", t), new Row("a", t)));
        stable(input);
        assertEquals(List.of(new Row("b", t), new Row("a", t)), input);
    }

    @Test
    void sameListForEveryLoadOrderOnceTheOrderIsStableAndThePrincipalIsFirst() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 1, 10, 0, 0);
        Row first = new Row("a", t);
        Row second = new Row("b", t.plusSeconds(1));
        Row third = new Row("c", t.plusSeconds(2));
        List<Row> expected = List.of(third, first, second);
        List<List<Row>> loads = List.of(List.of(first, second, third),
                List.of(third, first, second), List.of(second, third, first));
        for (List<Row> load : loads) {
            assertEquals(expected, AuthorOrdering.principalFirst(stable(load), Row::id, "c"));
        }
    }
}
