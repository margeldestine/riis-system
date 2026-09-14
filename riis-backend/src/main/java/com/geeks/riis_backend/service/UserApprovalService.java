package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.AccountActionDTO;
import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.AuditLogEntry;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class
UserApprovalService {

    private final UserRepository          userRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final EmailNotificationService emailNotificationService;

    // SDD §5.6 — GET /api/v1/admin/users?role=HEI_STAFF&status=PENDING|ACTIVE|REJECTED
    @Transactional(readOnly = true)
    public List<PendingUserResponse> getUsersByRoleAndStatus(String role, String status) {
        return userRepository.findByRoleAndStatusForQueue(role, status);
    }

    // UC-M5-04: full account directory -- searchable/filterable by role,
    // institution, and status, unlike getUsersByRoleAndStatus above which
    // requires both role and status. Any filter left null/blank is
    // ignored (matches everything for that dimension).
    @Transactional(readOnly = true)
    public Page<PendingUserResponse> searchAccounts(String role, String status, String institutionId, String search, Pageable pageable) {
        String normalizedRole = blankToNull(role);
        String normalizedStatus = blankToNull(status);
        String normalizedInstitutionId = blankToNull(institutionId);
        String likeSearch = blankToNull(search) != null ? "%" + search.trim().toLowerCase() + "%" : null;
        return userRepository.searchAccounts(normalizedRole, normalizedStatus, normalizedInstitutionId, likeSearch, pageable);
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    // SDD §5.6 / UC-M5-04 — PATCH /api/v1/admin/users/{id}/status  { action, reason, newRole }
    // Originally handled only the PENDING -> ACTIVE/REJECTED registration
    // decision. Now also covers actions on already-ACTIVE accounts
    // (suspend, deactivate, reactivate, role change), routed by whichever
    // action is requested rather than by the account's current status.
    public void processAction(UUID id, AccountActionDTO dto, String adminEmail) {

        User user = userRepository.findById(id.toString())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        // UC-M5-04: an admin can never take an action against their own
        // account through this endpoint -- most importantly, this blocks
        // an admin locking themselves out via self-suspend/self-deactivate.
        User actingAdmin = adminEmail != null ? userRepository.findByEmail(adminEmail).orElse(null) : null;
        if (actingAdmin != null && actingAdmin.getId().equals(user.getId())) {
            throw new BadRequestException("You cannot perform this action on your own account.");
        }

        switch (dto.getAction()) {
            case APPROVED -> {
                requireStatus(user, "PENDING");
                user.setStatus("ACTIVE");
                user.setMustResetPassword(false);
                userRepository.save(user);
                writeAuditLog("APPROVE_ACCOUNT", user, adminEmail, null);
                emailNotificationService.sendAccountApprovalEmail(user.getEmail(), user.getFullName());
            }
            case REJECTED -> {
                requireStatus(user, "PENDING");
                if (dto.getReason() == null || dto.getReason().isBlank()) {
                    throw new BadRequestException("Rejection reason is required.");
                }
                user.setStatus("REJECTED");
                userRepository.save(user);
                writeAuditLog("REJECT_ACCOUNT", user, adminEmail, dto.getReason());
                emailNotificationService.sendAccountRejectionEmail(
                        user.getEmail(), user.getFullName(), dto.getReason());
            }
            case SUSPENDED -> {
                requireStatus(user, "ACTIVE");
                user.setStatus("SUSPENDED");
                userRepository.save(user);
                writeAuditLog("SUSPEND_ACCOUNT", user, adminEmail, dto.getReason());
            }
            case DEACTIVATED -> {
                requireStatus(user, "ACTIVE");
                user.setStatus("DEACTIVATED");
                userRepository.save(user);
                writeAuditLog("DEACTIVATE_ACCOUNT", user, adminEmail, dto.getReason());
            }
            case REACTIVATED -> {
                if (!"SUSPENDED".equalsIgnoreCase(user.getStatus()) && !"DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
                    throw new BadRequestException("Only suspended or deactivated accounts can be reactivated.");
                }
                user.setStatus("ACTIVE");
                userRepository.save(user);
                writeAuditLog("REACTIVATE_ACCOUNT", user, adminEmail, dto.getReason());
            }
            case ROLE_CHANGED -> {
                requireStatus(user, "ACTIVE");
                if (dto.getNewRole() == null || dto.getNewRole().isBlank()) {
                    throw new BadRequestException("newRole is required for a role change.");
                }
                String newRole = dto.getNewRole().trim().toUpperCase();
                if (!List.of("SUPER_ADMIN", "DOST_ADMIN", "HEI_STAFF").contains(newRole)) {
                    throw new BadRequestException("Invalid role: " + newRole);
                }
                String previousRole = user.getRole();
                user.setRole(newRole);
                userRepository.save(user);
                writeAuditLog("CHANGE_ACCOUNT_ROLE", user, adminEmail,
                        (dto.getReason() != null ? dto.getReason() + " " : "") + "(" + previousRole + " -> " + newRole + ")");
            }
        }
    }

    private void requireStatus(User user, String expectedStatus) {
        if (!expectedStatus.equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("User must be in " + expectedStatus + " status for this action.");
        }
    }

    private void writeAuditLog(String actionType, User target, String adminEmail, String reason) {
        User admin = userRepository.findByEmail(adminEmail).orElse(null);

        AuditLogEntry entry = AuditLogEntry.builder()
                .actor(admin)
                .actionType(actionType)
                .targetType("USER")
                .targetId(target.getId())
                .comment(reason)
                .createdAt(LocalDateTime.now())
                .build();

        auditLogEntryRepository.save(entry);
    }
}