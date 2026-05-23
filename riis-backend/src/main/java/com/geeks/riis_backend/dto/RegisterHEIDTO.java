package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterHEIDTO(

        @NotBlank(message = "Institution name is required.")
        String name,

        @NotBlank(message = "Institution type is required.")
        String type,

        @NotBlank(message = "Province is required.")
        String province,

        @NotBlank(message = "Email domain is required.")
        @Pattern(
                regexp = "^@[a-z0-9.-]+\\.[a-z]{2,}$",
                message = "Email domain must be in format @domain.edu.ph"
        )
        String emailDomain,

        // Optional — defaults to ACTIVE in service
        String status
) {}