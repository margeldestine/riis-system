package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.dto.InstitutionProfileDTO;
import com.geeks.riis_backend.dto.InstitutionSummaryDTO;
import com.geeks.riis_backend.dto.RegisterHEIDTO;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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

    private final InstitutionRepository   institutionRepository;
    private final UserRepository          userRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;

    // -----------------------------------------------------------------------
    // Used by public InstitutionController — register dropdown
    // -----------------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<InstitutionDropdownItem> getAllActiveInstitutions() {
        return institutionRepository.findActiveDropdownItems();
    }

    // -----------------------------------------------------------------------
    // Used by public InstitutionController — get by ID
    // -----------------------------------------------------------------------
    @Transactional(readOnly = true)
    public Institution getInstitutionById(String id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + id));
    }

    // -----------------------------------------------------------------------
    // Used by public InstitutionController — list with optional province filter
    // -----------------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<InstitutionSummaryDTO> listAll(String province) {
        List<Institution> list = (province != null && !province.isBlank())
                ? institutionRepository.findByProvinceIgnoreCase(province)
                : institutionRepository.findAll();

        return list.stream()
                .map(i -> new InstitutionSummaryDTO(
                        i.getId(), i.getName(), i.getType(),
                        i.getProvince(), i.getEmailDomain(), i.getWhitelistStatus()
                ))
                .collect(Collectors.toList());
    }

    // -----------------------------------------------------------------------
    // Used by HEIManagementController — list all (no filter)
    // -----------------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<InstitutionSummaryDTO> listAll() {
        return listAll(null);
    }

    // -----------------------------------------------------------------------
    // Used by public InstitutionController — institution profile page
    // -----------------------------------------------------------------------
    @Transactional(readOnly = true)
    public InstitutionProfileDTO buildProfileDTO(String institutionId, Pageable pageable) {
        Institution inst = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + institutionId));
        return new InstitutionProfileDTO(
                inst.getId(),
                inst.getName(),
                inst.getType(),
                inst.getProvince(),
                inst.getContactEmail(),
                null,
                org.springframework.data.domain.Page.empty(),
                java.util.List.of()
        );
    }

    // -----------------------------------------------------------------------
    // Used by HEIManagementController — register a new HEI
    // -----------------------------------------------------------------------
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

        Institution institution = Institution.builder()
                .name(dto.name().trim())
                .type(dto.type())
                .province(dto.province())
                .emailDomain(domain)
                .contactEmail(domain.substring(1))
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

    // -----------------------------------------------------------------------
    // Used by HEIManagementController — toggle whitelist status
    // -----------------------------------------------------------------------
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