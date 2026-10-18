package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.ParticipationSummaryDTO;
import com.geeks.riis_backend.dto.ProvinceParticipationDTO;
import com.geeks.riis_backend.repository.InstitutionRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Priority 3: whitelisted HEIs vs. HEIs with at least one submission, per province. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParticipationService {

    private final InstitutionRepository institutionRepository;

    public ParticipationSummaryDTO getParticipation() {
        Map<String, List<String>> missingByProvince = new LinkedHashMap<>();
        for (Object[] row : institutionRepository.nonParticipatingInstitutions()) {
            missingByProvince
                    .computeIfAbsent(String.valueOf(row[0]), k -> new ArrayList<>())
                    .add(String.valueOf(row[1]));
        }

        List<ProvinceParticipationDTO> provinces = new ArrayList<>();
        long totalWhitelisted = 0;
        long totalParticipating = 0;
        for (Object[] row : institutionRepository.participationByProvince()) {
            String province = String.valueOf(row[0]);
            long whitelisted = ((Number) row[1]).longValue();
            long participating = ((Number) row[2]).longValue();
            totalWhitelisted += whitelisted;
            totalParticipating += participating;
            provinces.add(new ProvinceParticipationDTO(
                    province,
                    whitelisted,
                    participating,
                    percent(participating, whitelisted),
                    missingByProvince.getOrDefault(province, List.of())));
        }

        return new ParticipationSummaryDTO(
                totalWhitelisted, totalParticipating, percent(totalParticipating, totalWhitelisted), provinces);
    }

    static double percent(long part, long whole) {
        if (whole <= 0) {
            return 0.0;
        }
        return Math.round((part * 1000.0) / whole) / 10.0;
    }
}