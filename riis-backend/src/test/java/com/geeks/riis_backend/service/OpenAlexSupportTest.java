package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OpenAlexSupportTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void normalizesCommonDoiForms() {
        assertEquals("10.1371/journal.pone.0266781",
                OpenAlexSupport.normalizeDoi("10.1371/journal.pone.0266781"));
        assertEquals("10.1371/journal.pone.0266781",
                OpenAlexSupport.normalizeDoi("  https://doi.org/10.1371/JOURNAL.pone.0266781  "));
        assertEquals("10.1371/journal.pone.0266781",
                OpenAlexSupport.normalizeDoi("doi:10.1371/journal.pone.0266781"));
        assertEquals("10.1371/journal.pone.0266781",
                OpenAlexSupport.normalizeDoi("http://dx.doi.org/10.1371/journal.pone.0266781"));
    }

    @Test
    void refusesValuesThatAreNotUsableDois() {
        assertNull(OpenAlexSupport.normalizeDoi(null));
        assertNull(OpenAlexSupport.normalizeDoi(""));
        assertNull(OpenAlexSupport.normalizeDoi("not a doi"));
        assertNull(OpenAlexSupport.normalizeDoi("10.12/too-short-prefix"));
        // A comma or a pipe would break the OpenAlex filter, so these must never reach it.
        assertNull(OpenAlexSupport.normalizeDoi("10.5675/hywa_2012,4_3"));
        assertNull(OpenAlexSupport.normalizeDoi("10.1234/a|10.1234/b"));
    }

    @Test
    void buildsAnEncodedBatchPath() {
        String path = OpenAlexSupport.worksPath(List.of("10.1234/a", "10.5678/b"));
        assertEquals("/works?filter=doi%3Ahttps%3A%2F%2Fdoi.org%2F10.1234%2Fa%7Chttps%3A%2F%2Fdoi.org%2F10.5678%2Fb"
                + "&per_page=100&select=id,doi,cited_by_count", path);
    }

    @Test
    void readsCitationCountsAndSkipsIncompleteWorks() {
        String json = """
                {"meta":{"count":3},
                 "results":[
                   {"id":"https://openalex.org/W1","doi":"https://doi.org/10.1234/A","cited_by_count":12},
                   {"id":"https://openalex.org/W2","doi":"https://doi.org/10.5678/b","cited_by_count":0},
                   {"id":"https://openalex.org/W3","doi":null,"cited_by_count":7},
                   {"id":"https://openalex.org/W4","doi":"https://doi.org/10.9999/c"}
                 ]}
                """;
        Map<String, Integer> counts = OpenAlexSupport.parseCounts(mapper, json);
        assertEquals(2, counts.size());
        assertEquals(12, counts.get("10.1234/a"));
        // 0 is a real answer ("checked, nobody cited it") and must be kept, not treated as missing.
        assertEquals(0, counts.get("10.5678/b"));
    }

    @Test
    void anUnreadableResponseIsReportedClearly() {
        assertThrows(IllegalStateException.class, () -> OpenAlexSupport.parseCounts(mapper, "not json"));
        assertTrue(OpenAlexSupport.parseCounts(mapper, "{}").isEmpty());
    }

    @Test
    void retryAfterFallsBackWhenTheHeaderIsMissingOrNotANumber() {
        assertEquals(30L, OpenAlexSupport.retryAfterSeconds("30", 10L));
        assertEquals(10L, OpenAlexSupport.retryAfterSeconds(null, 10L));
        assertEquals(10L, OpenAlexSupport.retryAfterSeconds("Wed, 21 Oct 2026 07:28:00 GMT", 10L));
        assertEquals(1L, OpenAlexSupport.retryAfterSeconds("0", 10L));
    }
}
