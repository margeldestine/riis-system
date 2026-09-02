package com.geeks.riis_backend.service;

/**
 * One rubric criterion's score from a Claude holistic review, mirroring
 * {@code CriterionScore} in {@code riis-ai/models/schemas.py}
 * ({@code name}, {@code score}, {@code justification}).
 */
public record CriterionScoreDTO(String name, int score, String justification) {}