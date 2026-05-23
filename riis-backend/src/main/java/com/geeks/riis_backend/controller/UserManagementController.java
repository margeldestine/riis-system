package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.AccountActionDTO;
import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.service.UserApprovalService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserApprovalService userApprovalService;

    @GetMapping
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<List<PendingUserResponse>> getUsers(
            @RequestParam(name = "role",   required = false, defaultValue = "HEI_STAFF") String role,
            @RequestParam(name = "status", required = false, defaultValue = "PENDING")   String status
    ) {
        return ResponseEntity.ok(userApprovalService.getUsersByRoleAndStatus(role, status));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOST_ADMIN')")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AccountActionDTO dto
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminId = auth != null ? auth.getName() : "unknown";

        userApprovalService.processAction(id, dto, adminId);
        return ResponseEntity.ok().build();
    }
}