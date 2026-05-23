package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotNull;

public class AccountActionDTO {

    public enum AccountAction {
        APPROVED,
        REJECTED
    }

    @NotNull(message = "action is required")
    private AccountAction action;


    private String reason;

    public AccountActionDTO() {}

    public AccountActionDTO(AccountAction action, String reason) {
        this.action = action;
        this.reason = reason;
    }

    public AccountAction getAction() { return action; }
    public void setAction(AccountAction action) { this.action = action; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}