package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.InstitutionSummaryDTO;
import com.geeks.riis_backend.dto.RegisterHEIDTO;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.service.InstitutionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/institutions")
@RequiredArgsConstructor
public class HeiManagementController {

    private final InstitutionService institutionService;

    // GET /api/v1/admin/institutions — list all institutions
    @GetMapping
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<InstitutionSummaryDTO>> listInstitutions() {
        return ResponseEntity.ok(institutionService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<?> registerHEI(@Valid @RequestBody RegisterHEIDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminId = auth != null ? auth.getName() : null;

        Institution saved = institutionService.registerHEI(dto, adminId);

        InstitutionSummaryDTO response = new InstitutionSummaryDTO(
                saved.getId(),
                saved.getName(),
                saved.getType(),
                saved.getProvince(),
                saved.getEmailDomain(),
                saved.getWhitelistStatus()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // PATCH /api/v1/admin/institutions/{id}/status — toggle active/inactive
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Void> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminId = auth != null ? auth.getName() : null;
        String status = body.get("status");
        institutionService.updateStatus(id, status, adminId);
        return ResponseEntity.ok().build();
    }
}