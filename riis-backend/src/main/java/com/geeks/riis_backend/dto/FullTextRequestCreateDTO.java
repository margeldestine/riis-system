package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Public "Request full text" form. "website" is a honeypot: real users leave it empty. */
public record FullTextRequestCreateDTO(
        @NotBlank(message = "Name is required.") @Size(max = 255) String name,
        @NotBlank(message = "Email is required.") @Email(message = "Email is invalid.") @Size(max = 320) String email,
        @Size(max = 255) String affiliation,
        @NotBlank(message = "Please tell the research office why you need the full text.")
        @Size(min = 10, max = 2000, message = "Purpose must be between 10 and 2000 characters.") String purpose,
        @Size(max = 200) String website
) {}