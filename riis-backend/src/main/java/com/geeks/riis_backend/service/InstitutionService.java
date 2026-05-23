package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.dto.InstitutionProfileDTO;
import com.geeks.riis_backend.dto.InstitutionStatsDTO;
import com.geeks.riis_backend.dto.InstitutionSummaryDTO;
import com.geeks.riis_backend.dto.PublicAuthorDTO;
import com.geeks.riis_backend.dto.PublicOutputCardDTO;
import com.geeks.riis_backend.dto.RegisterHEIDTO;
import com.geeks.riis_backend.dto.ThemeKeywordDTO;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.ThemeProfile;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.ThemeProfileRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class InstitutionService {

    private static final Pattern DOMAIN_PATTERN =
            Pattern.compile("^@[a-z0-9.-]+\\.[a-z]{2,}$");
    private static final String STATUS_APPROVED = "APPROVED";

    private final InstitutionRepository   institutionRepository;
    private final UserRepository          userRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final ThemeProfileRepository  themeProfileRepository;


    @Transactional(readOnly = true)
    public List<InstitutionDropdownItem> getAllActiveInstitutions() {
        return institutionRepository.findActiveDropdownItems();
    }


    @Transactional(readOnly = true)
    public Institution getInstitutionById(String id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + id));
    }


    @Transactional(readOnly = true)
    public List<InstitutionSummaryDTO> listAll(String province) {
        List<Institution> list = (province != null && !province.isBlank())
                ? institutionRepository.findByProvinceIgnoreCase(province)
                : institutionRepository.findAll();

        return list.stream()
                .map(i -> new InstitutionSummaryDTO(
                        i.getId(), i.getName(), i.getType(),
                        i.getProvince(), i.getEmailDomain(), i.getWhitelistStatus(),
                        institutionRepository.countApprovedOutputs(i.getId())
                ))
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public List<InstitutionSummaryDTO> listAll() {
        return listAll(null);
    }


    @Transactional(readOnly = true)
    public InstitutionProfileDTO buildProfileDTO(String institutionId, Pageable pageable) {
        Institution inst = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + institutionId));


        Page<ResearchOutput> outputPage = researchOutputRepository
                .findByInstitutionIdAndStatus(institutionId, STATUS_APPROVED, pageable);


        Page<PublicOutputCardDTO> outputDTOs = outputPage.map(ro -> {
            List<PublicAuthorDTO> authors = ro.getAuthors() == null ? List.of() :
                    ro.getAuthors().stream()
                            .map(a -> new PublicAuthorDTO(a.getFullName(), a.getOrcidId()))
                            .collect(Collectors.toList());

            String excerpt = ro.getAbstractText() != null && ro.getAbstractText().length() > 300
                    ? ro.getAbstractText().substring(0, 300) + "…"
                    : ro.getAbstractText();

            return new PublicOutputCardDTO(
                    ro.getId(),
                    ro.getTitle(),
                    ro.getDoi(),
                    ro.getResearchType(),
                    ro.getCompletionYear(),
                    ro.getFundingSource(),
                    excerpt,
                    authors
            );
        });


        int totalApproved = researchOutputRepository
                .countByInstitutionIdAndStatus(institutionId, STATUS_APPROVED);


        List<ResearchOutput> allApproved = researchOutputRepository
                .findByInstitutionIdAndStatus(institutionId, STATUS_APPROVED);

        long uniqueAuthors = allApproved.stream()
                .filter(ro -> ro.getAuthors() != null)
                .flatMap(ro -> ro.getAuthors().stream())
                .map(a -> a.getFullName() != null ? a.getFullName().toLowerCase().trim() : "")
                .filter(name -> !name.isBlank())
                .distinct()
                .count();


        Map<String, Integer> typeDistribution = allApproved.stream()
                .filter(ro -> ro.getResearchType() != null)
                .collect(Collectors.groupingBy(
                        ResearchOutput::getResearchType,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        InstitutionStatsDTO stats = new InstitutionStatsDTO(
                totalApproved,
                (int) uniqueAuthors,
                typeDistribution
        );


        List<ThemeKeywordDTO> keywords = themeProfileRepository
                .findByInstitutionId(institutionId)
                .map(ThemeProfile::getKeywords)
                .map(kwds -> kwds.stream()
                        .map(k -> new ThemeKeywordDTO(k.getKeyword(), k.getWeight()))
                        .sorted((a, b) -> Double.compare(b.weight(), a.weight()))
                        .collect(Collectors.toList()))
                .orElse(List.of());

        return new InstitutionProfileDTO(
                inst.getId(),
                inst.getName(),
                inst.getType(),
                inst.getProvince(),
                inst.getContactEmail(),
                stats,
                outputDTOs,
                keywords
        );
    }


    public Institution registerHEI(RegisterHEIDTO dto, String adminEmail) {
        String domain = dto.emailDomain().trim().toLowerCase();

        if (!DOMAIN_PATTERN.matcher(domain).matches()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid email domain format. Must be like @domain.edu.ph");
        }

        if (institutionRepository.findByEmailDomain(domain).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An institution with this email domain is already registered.");
        }

        User admin = adminEmail != null
                ? userRepository.findByEmail(adminEmail).orElse(null)
                : null;

        String cleanDomain = domain.startsWith("@") ? domain.substring(1) : domain;

        Institution institution = Institution.builder()
                .name(dto.name().trim())
                .type(dto.type())
                .province(dto.province())
                .emailDomain(cleanDomain)
                .contactEmail(cleanDomain)
                .whitelistStatus(dto.status() != null && !dto.status().isBlank() ? dto.status() : "ACTIVE")
                .registeredBy(admin)
                .build();

        try {
            Institution saved = institutionRepository.save(institution);
            writeAuditLog("REGISTER_HEI", saved.getId(), adminEmail, null);
            return saved;
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An institution with this email domain is already registered.");
        }
    }


    public void updateStatus(UUID id, String newStatus, String adminEmail) {
        Institution inst = institutionRepository.findById(id.toString())
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + id));

        if (newStatus == null || newStatus.isBlank()) {
            throw new BadRequestException("Status is required.");
        }

        inst.setWhitelistStatus(newStatus.toUpperCase());
        institutionRepository.save(inst);
        writeAuditLog("UPDATE_HEI_STATUS", inst.getId(), adminEmail, newStatus);
    }


    private void writeAuditLog(String actionType, String targetId, String adminEmail, String comment) {
        User admin = adminEmail != null
                ? userRepository.findByEmail(adminEmail).orElse(null)
                : null;

        AuditLogEntry entry = AuditLogEntry.builder()
                .actor(admin)
                .actionType(actionType)
                .targetType("INSTITUTION")
                .targetId(targetId)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();

        auditLogEntryRepository.save(entry);
    }
}