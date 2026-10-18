package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.geeks.riis_backend.service.SearchRanker.Doc;
import com.geeks.riis_backend.service.SearchRanker.Scored;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SearchRankerTest {

    private static final List<Doc> DOCS = List.of(
            new Doc("title", "i1", "Rice yield improvement in Cebu", "rice, yield", "Ana Cruz", "Inst One", ""),
            new Doc("abstract", "i1", "Soil survey", "soil", "Ben Lim", "Inst One",
                    "This work studies rice farming practices and rice storage"),
            new Doc("agri", "i2", "Agriculture extension programs", "extension", "Cy Dee", "Inst Two", ""),
            new Doc("hidden", "i2", "Marine survey", "marine", "", "Inst Two", ""),
            new Doc("other", "i3", "Coastal tourism", "tourism", "", "Inst Three", "beach resorts"));

    @Test
    void titleAndKeywordMatchRanksAboveAbstractOnlyMatch() {
        List<String> ranked = SearchRanker.rank(SearchRanker.keywordScores(DOCS, "rice"));
        assertEquals(List.of("title", "abstract"), ranked);
    }

    @Test
    void beginningOfAWordStillMatches() {
        assertEquals(List.of("agri"), SearchRanker.rank(SearchRanker.keywordScores(DOCS, "agri")));
    }

    @Test
    void blankFieldsCannotMatchAndStopWordsAreIgnored() {
        assertTrue(SearchRanker.keywordScores(DOCS, "secretword").isEmpty());
        assertTrue(SearchRanker.keywordScores(DOCS, "the of").isEmpty());
    }

    @Test
    void recordInBothListsBeatsRecordInOne() {
        Map<String, Double> fused = SearchRanker.fuse(List.of("x", "y"), 0.4, List.of("y", "z"), 0.6);
        assertEquals("y", SearchRanker.rank(fused).get(0));
    }

    @Test
    void weakSemanticMatchesAreDropped() {
        Map<String, Double> kept = SearchRanker.withinBand(Map.of("a", 0.90, "b", 0.80, "c", 0.40), 0.15);
        assertTrue(kept.containsKey("a"));
        assertTrue(kept.containsKey("b"));
        assertFalse(kept.containsKey("c"));
    }

    @Test
    void relevantSmallInstitutionReachesTheFirstPage() {
        List<Scored> list = new ArrayList<>();
        for (int i = 0; i < 8; i++) list.add(new Scored("big" + i, "BIG", 1.0 - i * 0.01));
        list.add(new Scored("small", "SMALL", 0.60));

        List<Scored> out = SearchRanker.diversify(list, 10, 3);

        assertEquals("big0", out.get(0).id());
        assertEquals("big2", out.get(2).id());
        assertEquals("small", out.get(3).id());
        assertEquals(list.size(), out.size());
    }

    @Test
    void irrelevantRecordsAreNotPromotedJustForDiversity() {
        List<Scored> list = new ArrayList<>();
        for (int i = 0; i < 6; i++) list.add(new Scored("u" + i, "USC", 1.0 - i * 0.05));
        list.add(new Scored("other", "OTHER", 0.05));

        List<Scored> out = SearchRanker.diversify(list, 10, 3);

        assertEquals("u3", out.get(3).id());
        assertEquals("other", out.get(6).id());
    }
}