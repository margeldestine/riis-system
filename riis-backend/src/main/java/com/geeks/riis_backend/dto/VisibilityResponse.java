package com.geeks.riis_backend.dto;

public record VisibilityResponse(String targetId, String visibility, String label, boolean changed) {}