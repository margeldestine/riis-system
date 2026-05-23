package com.geeks.riis_backend.dto;

public record VectorSearchRequest(float[] embedding, int limit) {}

