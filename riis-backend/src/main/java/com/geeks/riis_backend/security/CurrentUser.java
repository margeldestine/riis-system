package com.geeks.riis_backend.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

/** Resolves the authenticated user's id (the JWT principal is the user id). */
public final class CurrentUser {

    private CurrentUser() {}

    public static String requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        Object principal = authentication.getPrincipal();
        String userId = principal == null ? null : principal.toString();
        if (userId == null || userId.isBlank() || "anonymousUser".equalsIgnoreCase(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return userId;
    }
}