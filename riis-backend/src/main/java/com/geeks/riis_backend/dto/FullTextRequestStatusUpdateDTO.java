package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FullTextRequestStatusUpdateDTO(
        @NotBlank(message = "Status is required.") String status,
        @Size(max = 2000, message = "Note must be at most 2000 characters.") String note
) {}