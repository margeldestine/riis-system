package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ThemeKeyword;
import com.geeks.riis_backend.model.ThemeProfile;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ThemeProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ThemeProfileService {

    private final ThemeProfileRepository themeProfileRepository;
    private final InstitutionRepository institutionRepository;

    public void updateThemeProfile(String institutionId, List<List<Object>> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            log.warn("No keywords to update for institution: {}", institutionId);
            return;
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElse(null);
        if (institution == null) {
            log.warn("Institution not found: {}", institutionId);
            return;
        }

        ThemeProfile profile = themeProfileRepository
                .findByInstitutionId(institutionId)
                .orElseGet(() -> ThemeProfile.builder()
                        .institution(institution)
                        .lastUpdated(LocalDateTime.now())
                        .keywords(new HashSet<>())
                        .build());

        int totalCount = profile.getKeywords().size() + keywords.size();

        for (List<Object> kwPair : keywords) {
            if (kwPair == null || kwPair.size() < 2) continue;
            String keyword = kwPair.get(0).toString().toLowerCase().trim();
            double score = Double.parseDouble(kwPair.get(1).toString());

            ThemeKeyword existing = profile.getKeywords().stream()
                    .filter(k -> k.getKeyword().equalsIgnoreCase(keyword))
                    .findFirst()
                    .orElse(null);

            if (existing != null) {
                existing.setOccurrenceCount(existing.getOccurrenceCount() + 1);
                existing.setWeight((double) existing.getOccurrenceCount() / totalCount);
            } else {
                ThemeKeyword newKeyword = ThemeKeyword.builder()
                        .themeProfile(profile)
                        .keyword(keyword)
                        .occurrenceCount(1)
                        .weight(score)
                        .build();
                profile.getKeywords().add(newKeyword);
            }
        }

        profile.setLastUpdated(LocalDateTime.now());
        themeProfileRepository.save(profile);
        log.info("Theme profile updated for institution: {}", institutionId);
    }
}