package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotNull;

public class AccountActionDTO {

    public enum AccountAction {
        APPROVED,
        REJECTED,
        // UC-M5-04: actions on already-ACTIVE accounts, not just the
        // PENDING -> ACTIVE/REJECTED transitions above.
        SUSPENDED,
        DEACTIVATED,
        REACTIVATED,
        ROLE_CHANGED
    }

    @NotNull(message = "action is required")
    private AccountAction action;


    private String reason;

    // UC-M5-04: required only when action = ROLE_CHANGED. One of the
    // roles already enforced by the users.role check constraint
    // (SUPER_ADMIN, DOST_ADMIN, HEI_STAFF).
    private String newRole;

    public AccountActionDTO() {}

    public AccountActionDTO(AccountAction action, String reason) {
        this.action = action;
        this.reason = reason;
    }

    public AccountActionDTO(AccountAction action, String reason, String newRole) {
        this.action = action;
        this.reason = reason;
        this.newRole = newRole;
    }

    public AccountAction getAction() { return action; }
    public void setAction(AccountAction action) { this.action = action; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNewRole() { return newRole; }
    public void setNewRole(String newRole) { this.newRole = newRole; }
}