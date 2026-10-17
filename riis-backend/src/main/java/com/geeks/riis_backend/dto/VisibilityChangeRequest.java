package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;

public record VisibilityChangeRequest(@NotBlank(message = "Visibility is required.") String visibility) {}