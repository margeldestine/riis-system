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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserApprovalService {

    private final UserRepository          userRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final EmailNotificationService emailNotificationService;

    // SDD §5.6 — GET /api/v1/admin/users?role=HEI_STAFF&status=PENDING|ACTIVE|REJECTED
    @Transactional(readOnly = true)
    public List<PendingUserResponse> getUsersByRoleAndStatus(String role, String status) {
        return userRepository.findByRoleAndStatusForQueue(role, status);
    }

    // SDD §5.6 — PATCH /api/v1/admin/users/{id}/status  { action, reason }
    public void processAction(UUID id, AccountActionDTO dto, String adminEmail) {

        User user = userRepository.findById(id.toString())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (!"PENDING".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("User is not in PENDING status.");
        }

        switch (dto.getAction()) {
            case APPROVED -> {
                user.setStatus("ACTIVE");
                user.setMustResetPassword(false);
                userRepository.save(user);
                writeAuditLog("APPROVE_ACCOUNT", user, adminEmail, null);
                emailNotificationService.sendAccountApprovalEmail(user.getEmail(), user.getFullName());
            }
            case REJECTED -> {
                if (dto.getReason() == null || dto.getReason().isBlank()) {
                    throw new BadRequestException("Rejection reason is required.");
                }
                user.setStatus("REJECTED");
                userRepository.save(user);
                writeAuditLog("REJECT_ACCOUNT", user, adminEmail, dto.getReason());
                emailNotificationService.sendAccountRejectionEmail(
                        user.getEmail(), user.getFullName(), dto.getReason());
            }
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