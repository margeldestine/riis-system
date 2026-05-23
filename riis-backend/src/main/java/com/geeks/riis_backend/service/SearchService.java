package com.geeks.riis_backend.service;

import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private final ResearchOutputRepository researchOutputRepository;

    public Map<String, Object> search(String query, String mode, Map<String, Object> filters) {
        List<ResearchOutput> approved = researchOutputRepository.findByStatus("APPROVED");

        String q = query == null ? "" : query.trim().toLowerCase();

        List<ResearchOutput> results = approved.stream()
                .filter(o -> matchesQuery(o, q))
                .filter(o -> matchesFilters(o, filters))
                .collect(Collectors.toList());

        List<Map<String, Object>> cards = results.stream()
                .map(this::toCard)
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("results", cards);
        response.put("total", cards.size());
        response.put("fallback", true);
        return response;
    }

    public Map<String, Object> getById(String id) {
        ResearchOutput o = researchOutputRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + id));
        Map<String, Object> card = toCard(o);
        card.put("abstractText", o.getAbstractText());
        card.put("subjectDc", o.getSubjectDc());
        card.put("coverageDc", o.getCoverageDc());
        card.put("rightsDc", o.getRightsDc());
        card.put("publisherDc", o.getPublisherDc());
        card.put("contributorDc", o.getContributorDc());
        card.put("s3PdfKey", o.getS3PdfKey());
        return card;
    }

    public List<Map<String, Object>> getRelated(String id) {
        ResearchOutput source = researchOutputRepository.findById(id).orElse(null);
        if (source == null) return List.of();

        List<ResearchOutput> approved = researchOutputRepository.findByStatus("APPROVED");

        return approved.stream()
                .filter(o -> !o.getId().equals(id))
                .filter(o -> hasKeywordOverlap(source, o))
                .limit(3)
                .map(o -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", o.getId());
                    item.put("title", o.getTitle());
                    item.put("institutionName", o.getInstitution() != null ? o.getInstitution().getName() : "");
                    item.put("researchType", o.getResearchType());
                    item.put("similarityScore", 75);
                    return item;
                })
                .collect(Collectors.toList());
    }

    private boolean matchesQuery(ResearchOutput o, String q) {
        if (q.isBlank()) return true;
        String title = o.getTitle() != null ? o.getTitle().toLowerCase() : "";
        String keywords = o.getKeywords() != null ? o.getKeywords().toLowerCase() : "";
        String abstrakt = o.getAbstractText() != null ? o.getAbstractText().toLowerCase() : "";
        String institution = o.getInstitution() != null && o.getInstitution().getName() != null
                ? o.getInstitution().getName().toLowerCase() : "";
        String authors = o.getAuthors() != null
                ? o.getAuthors().stream()
                .map(a -> a.getFullName() != null ? a.getFullName().toLowerCase() : "")
                .collect(Collectors.joining(" ")) : "";
        return title.contains(q) || keywords.contains(q) || abstrakt.contains(q)
                || institution.contains(q) || authors.contains(q);
    }

    private boolean matchesFilters(ResearchOutput o, Map<String, Object> filters) {
        if (filters == null) return true;

        Object institution = filters.get("institutionId");
        if (institution != null && !institution.toString().isBlank()) {
            if (o.getInstitution() == null || !o.getInstitution().getId().equals(institution.toString()))
                return false;
        }

        Object province = filters.get("province");
        if (province != null && !province.toString().isBlank()) {
            if (o.getInstitution() == null || !province.toString()
                    .equalsIgnoreCase(o.getInstitution().getProvince()))
                return false;
        }

        Object researchType = filters.get("researchType");
        if (researchType != null && !researchType.toString().isBlank()) {
            if (!researchType.toString().equalsIgnoreCase(o.getResearchType()))
                return false;
        }

        Object year = filters.get("year");
        if (year != null && !year.toString().isBlank()) {
            try {
                int y = Integer.parseInt(year.toString());
                if (o.getCompletionYear() == null || o.getCompletionYear() != y)
                    return false;
            } catch (NumberFormatException ignored) {}
        }

        Object fundingSource = filters.get("fundingSource");
        if (fundingSource != null && !fundingSource.toString().isBlank()) {
            if (o.getFundingSource() == null || !o.getFundingSource()
                    .toLowerCase().contains(fundingSource.toString().toLowerCase()))
                return false;
        }

        return true;
    }

    private boolean hasKeywordOverlap(ResearchOutput a, ResearchOutput b) {
        if (a.getKeywords() == null || b.getKeywords() == null) return false;
        Set<String> aKeys = Arrays.stream(a.getKeywords().split(","))
                .map(String::trim).map(String::toLowerCase).collect(Collectors.toSet());
        Set<String> bKeys = Arrays.stream(b.getKeywords().split(","))
                .map(String::trim).map(String::toLowerCase).collect(Collectors.toSet());
        aKeys.retainAll(bKeys);
        return !aKeys.isEmpty();
    }

    private Map<String, Object> toCard(ResearchOutput o) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", o.getId());
        card.put("title", o.getTitle());
        card.put("researchType", o.getResearchType());
        card.put("completionYear", o.getCompletionYear());
        card.put("fundingSource", o.getFundingSource());
        card.put("publicationVenue", o.getPublicationVenue());
        card.put("doi", o.getDoi());
        card.put("abstractExcerpt", truncate(o.getAbstractText(), 200));
        card.put("keywords", parseKeywords(o.getKeywords()));
        card.put("institutionId", o.getInstitution() != null ? o.getInstitution().getId() : null);
        card.put("institutionName", o.getInstitution() != null ? o.getInstitution().getName() : null);
        card.put("province", o.getInstitution() != null ? o.getInstitution().getProvince() : null);
        card.put("authors", o.getAuthors() != null ? o.getAuthors().stream()
                .map(a -> Map.of("fullName", a.getFullName() != null ? a.getFullName() : "",
                        "orcidId", a.getOrcidId() != null ? a.getOrcidId() : ""))
                .collect(Collectors.toList()) : List.of());
        return card;
    }

    private String truncate(String text, int maxChars) {
        if (text == null) return "";
        return text.length() <= maxChars ? text : text.substring(0, maxChars) + "...";
    }

    private List<String> parseKeywords(String keywords) {
        if (keywords == null || keywords.isBlank()) return List.of();
        return Arrays.stream(keywords.split(","))
                .map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toList());
    }
}