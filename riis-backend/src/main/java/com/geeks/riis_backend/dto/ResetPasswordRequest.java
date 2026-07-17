package com.geeks.riis_backend.dto;

public record ResetPasswordRequest(String token, String newPassword) {}