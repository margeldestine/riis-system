package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.FullTextActionDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SearchServiceVisibilityTest {

    @Mock ResearchOutputRepository repo;
    @Mock AIProxyService ai;
    @Mock UserRepository userRepository;

    SearchService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        service = new SearchService(repo, ai, new PublicAccessPolicy(userRepository));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ResearchOutput record(String id, AccessVisibility visibility) {
        return ResearchOutput.builder()
                .id(id)
                .title("Title " + id)
                .abstractText("Contains SECRETWORD in the abstract")
                .keywords("alpha, beta")
                .researchType("JOURNAL_ARTICLE")
                .completionYear(2025)
                .doi("10.1234/abc")
                .status("APPROVED")
                .visibility(visibility)
                .s3PdfKey("private/" + id + ".pdf")
                .institution(Institution.builder().id("i1").name("Inst One").province("Cebu").build())
                .authors(Set.of())
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> results(Map<String, Object> response) {
        return (List<Map<String, Object>>) response.get("results");
    }

    @Test
    void anonymousSearchCannotMatchHiddenAbstracts() {
        when(repo.findByStatus("APPROVED")).thenReturn(List.of(
                record("pub", AccessVisibility.PUBLIC),
                record("meta", AccessVisibility.METADATA_ONLY),
                record("res", AccessVisibility.RESTRICTED)));

        List<Map<String, Object>> found = results(service.search("secretword", "KEYWORD", null));

        assertEquals(1, found.size());
        assertEquals("pub", found.get(0).get("id"));
    }

    @Test
    void restrictedCardShowsOnlyTitleAndInstitution() {
        when(repo.findByStatus("APPROVED")).thenReturn(List.of(record("res", AccessVisibility.RESTRICTED)));

        Map<String, Object> card = results(service.search("title", "KEYWORD", null)).get(0);

        assertEquals("Title res", card.get("title"));
        assertEquals("Inst One", card.get("institutionName"));
        assertEquals("", card.get("abstractExcerpt"));
        assertEquals("", card.get("researchType"));
        assertNull(card.get("doi"));
        assertNull(card.get("completionYear"));
        assertEquals(List.of(), card.get("keywords"));
        assertEquals(List.of(), card.get("authors"));
        assertEquals(FullTextActionDTO.REQUEST_FORM, ((FullTextActionDTO) card.get("fullText")).type());
    }

    @Test
    void fullTextActionLinksToDoiUnlessRestricted() {
        when(repo.findByStatus("APPROVED")).thenReturn(List.of(
                record("pub", AccessVisibility.PUBLIC),
                record("meta", AccessVisibility.METADATA_ONLY)));

        for (Map<String, Object> card : results(service.search("title", "KEYWORD", null))) {
            FullTextActionDTO action = (FullTextActionDTO) card.get("fullText");
            assertEquals(FullTextActionDTO.DOI_LINK, action.type());
            assertEquals("https://doi.org/10.1234/abc", action.url());
        }
    }

    @Test
    void detailNeverReturnsPdfKeyAndHidesAbstractWhenNotPublic() {
        when(repo.findById("res")).thenReturn(Optional.of(record("res", AccessVisibility.RESTRICTED)));

        Map<String, Object> detail = service.getById("res");

        assertFalse(detail.containsKey("s3PdfKey"));
        assertNull(detail.get("abstractText"));
    }

    @Test
    void detailNeverReturnsPdfKeyEvenForPublicRecords() {
        when(repo.findById("pub")).thenReturn(Optional.of(record("pub", AccessVisibility.PUBLIC)));

        Map<String, Object> detail = service.getById("pub");

        assertFalse(detail.containsKey("s3PdfKey"));
        assertNotNull(detail.get("abstractText"));
    }

    @Test
    void unapprovedRecordIsNotFoundForAnonymous() {
        ResearchOutput pending = record("pend", AccessVisibility.PUBLIC);
        pending.setStatus("PENDING_REVIEW");
        when(repo.findById("pend")).thenReturn(Optional.of(pending));

        assertThrows(ResourceNotFoundException.class, () -> service.getById("pend"));
    }

    @Test
    void owningInstitutionStaffSeesEverythingOnOwnRecords() {
        User staff = User.builder()
                .id("u1").role("HEI_STAFF").status("ACTIVE")
                .institution(Institution.builder().id("i1").build())
                .build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(staff));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "u1", null, List.of(new SimpleGrantedAuthority("ROLE_HEI_STAFF"))));

        when(repo.findByStatus("APPROVED")).thenReturn(List.of(
                record("pub", AccessVisibility.PUBLIC),
                record("meta", AccessVisibility.METADATA_ONLY),
                record("res", AccessVisibility.RESTRICTED)));

        assertEquals(3, results(service.search("secretword", "KEYWORD", null)).size());
    }
}