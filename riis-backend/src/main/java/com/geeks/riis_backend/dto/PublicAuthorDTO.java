package com.geeks.riis_backend.dto;

// PRIVACY: there is no email field here on purpose. Author emails must never reach a public response.
public record PublicAuthorDTO(
        String fullName,
        String orcidId,
        String institution
) {}