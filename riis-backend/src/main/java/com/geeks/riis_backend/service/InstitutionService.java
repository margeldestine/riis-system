package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.dto.InstitutionProfileDTO;
import com.geeks.riis_backend.dto.InstitutionStatsDTO;
import com.geeks.riis_backend.dto.InstitutionSummaryDTO;
import com.geeks.riis_backend.dto.PublicAuthorDTO;
import com.geeks.riis_backend.dto.PublicOutputCardDTO;
import com.geeks.riis_backend.dto.ThemeKeywordDTO;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstitutionService {

    private final InstitutionRepository institutionRepository;
    private final ResearchOutputRepository researchOutputRepository;

    @Transactional(readOnly = true)
    public Institution getInstitutionById(String id) {
        return institutionRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<InstitutionDropdownItem> getAllActiveInstitutions() {
        return institutionRepository.findActiveDropdownItems();
    }

    @Transactional(readOnly = true)
    public List<InstitutionSummaryDTO> listAll(String province) {
        List<Institution> institutions = province != null && !province.isBlank()
                ? institutionRepository.findByProvinceIgnoreCase(province.trim())
                : institutionRepository.findAll();

        return institutions.stream().map(inst -> {
            int count = researchOutputRepository.countByInstitutionIdAndStatus(inst.getId(), "APPROVED");
            return new InstitutionSummaryDTO(
                    inst.getId(),
                    inst.getName(),
                    inst.getType(),
                    inst.getProvince(),
                    inst.getContactEmail(),
                    count
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public InstitutionProfileDTO buildProfileDTO(String institutionId, Pageable pageable) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + institutionId));

        Page<PublicOutputCardDTO> outputs = researchOutputRepository
                .findByInstitutionIdAndStatus(institutionId, "APPROVED", pageable)
                .map(output -> {
                    String excerpt = output.getAbstractText() == null ? null
                            : output.getAbstractText().length() > 200
                            ? output.getAbstractText().substring(0, 200) + "..."
                            : output.getAbstractText();

                    List<PublicAuthorDTO> authors = output.getAuthors() == null ? List.of()
                            : output.getAuthors().stream()
                            .map(a -> new PublicAuthorDTO(a.getFullName(), a.getOrcidId()))
                            .toList();

                    return new PublicOutputCardDTO(
                            output.getId(),
                            output.getTitle(),
                            output.getDoi(),
                            output.getResearchType(),
                            output.getCompletionYear(),
                            output.getFundingSource(),
                            excerpt,
                            authors
                    );
                });

        int totalApproved = researchOutputRepository
                .countByInstitutionIdAndStatus(institutionId, "APPROVED");

        long uniqueAuthors = researchOutputRepository
                .findByInstitutionIdAndStatus(institutionId, "APPROVED", Pageable.unpaged())
                .stream()
                .flatMap(o -> o.getAuthors() == null
                        ? java.util.stream.Stream.empty()
                        : o.getAuthors().stream())
                .map(a -> a.getFullName() == null ? "" : a.getFullName().trim().toLowerCase())
                .distinct()
                .count();

        Map<String, Integer> typeDistribution = researchOutputRepository
                .findByInstitutionIdAndStatus(institutionId, "APPROVED", Pageable.unpaged())
                .stream()
                .collect(Collectors.groupingBy(
                        o -> o.getResearchType() == null ? "Unknown" : o.getResearchType(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        InstitutionStatsDTO stats = new InstitutionStatsDTO(
                totalApproved,
                (int) uniqueAuthors,
                typeDistribution
        );

        return new InstitutionProfileDTO(
                institution.getId(),
                institution.getName(),
                institution.getType(),
                institution.getProvince(),
                institution.getContactEmail(),
                stats,
                outputs,
                List.of()
        );
    }
}