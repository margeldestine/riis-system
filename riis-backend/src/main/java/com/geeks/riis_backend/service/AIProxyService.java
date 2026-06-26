package com.geeks.riis_backend.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIProxyService {

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @CircuitBreaker(name = "aiService", fallbackMethod = "extractKeywordsFallback")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2))
    public List<List<Object>> extractKeywords(String text) {
        if (text == null || text.split("\\s+").length < 50) {
            return List.of();
        }

        WebClient client = WebClient.create(aiServiceUrl);
        Map response = client.post()
                .uri("/ai/keybert/extract")
                .bodyValue(Map.of("text", text, "top_n", 10))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(8))
                .block();

        if (response == null || !response.containsKey("keywords")) {
            return List.of();
        }
        return (List<List<Object>>) response.get("keywords");
    }

    public List<List<Object>> extractKeywordsFallback(String text, Throwable t) {
        log.warn("AI service unavailable for keyword extraction. Fallback activated. Cause: {}", t.getMessage());
        return List.of();
    }

    @CircuitBreaker(name = "aiService", fallbackMethod = "computeSBERTEmbeddingFallback")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2))
    public float[] computeSBERTEmbedding(String text) {
        if (text == null || text.split("\\s+").length < 10) {
            return new float[0];
        }

        WebClient client = WebClient.create(aiServiceUrl);
        Map response = client.post()
                .uri("/ai/sbert/embed")
                .bodyValue(Map.of("text", text))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(8))
                .block();

        if (response == null || !response.containsKey("embedding")) {
            return new float[0];
        }

        List<Double> embeddingList = (List<Double>) response.get("embedding");
        float[] embedding = new float[embeddingList.size()];
        for (int i = 0; i < embeddingList.size(); i++) {
            embedding[i] = embeddingList.get(i).floatValue();
        }
        return embedding;
    }

    public float[] computeSBERTEmbeddingFallback(String text, Throwable t) {
        log.warn("AI service unavailable for SBERT embedding. Fallback activated. Cause: {}", t.getMessage());
        return new float[0];
    }

    @CircuitBreaker(name = "aiService", fallbackMethod = "computeSPECTEREmbeddingFallback")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2))
    public float[] computeSPECTEREmbedding(String text) {
        if (text == null || text.isBlank()) {
            return new float[0];
        }

        WebClient client = WebClient.create(aiServiceUrl);
        Map response = client.post()
                .uri("/ai/specter/encode")
                .bodyValue(Map.of("text", text))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(8))
                .block();

        if (response == null || !response.containsKey("embedding")) {
            return new float[0];
        }

        List<Double> embeddingList = (List<Double>) response.get("embedding");
        float[] embedding = new float[embeddingList.size()];
        for (int i = 0; i < embeddingList.size(); i++) {
            embedding[i] = embeddingList.get(i).floatValue();
        }
        return embedding;
    }

    public float[] computeSPECTEREmbeddingFallback(String text, Throwable t) {
        log.warn("AI service unavailable for SPECTER embedding. Fallback activated. Cause: {}", t.getMessage());
        return new float[0];
    }

    @CircuitBreaker(name = "aiService", fallbackMethod = "computeCentroidSimilaritiesFallback")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2))
    public Map<String, Double> computeCentroidSimilarities(float[] specterEmbedding, Map<String, float[]> centroidsByClusterId) {
        if (specterEmbedding == null || specterEmbedding.length == 0 || centroidsByClusterId == null || centroidsByClusterId.isEmpty()) {
            return Map.of();
        }

        Map<String, List<Float>> centroidsPayload = new java.util.HashMap<>();
        for (Map.Entry<String, float[]> entry : centroidsByClusterId.entrySet()) {
            List<Float> vector = new java.util.ArrayList<>(entry.getValue().length);
            for (float v : entry.getValue()) {
                vector.add(v);
            }
            centroidsPayload.put(entry.getKey(), vector);
        }

        List<Float> embeddingPayload = new java.util.ArrayList<>(specterEmbedding.length);
        for (float v : specterEmbedding) {
            embeddingPayload.add(v);
        }

        WebClient client = WebClient.create(aiServiceUrl);
        Map response = client.post()
                .uri("/ai/specter/centroid-similarity")
                .bodyValue(Map.of("embedding", embeddingPayload, "centroids", centroidsPayload))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(8))
                .block();

        if (response == null || !response.containsKey("similarities")) {
            return Map.of();
        }

        Map<String, Object> rawSimilarities = (Map<String, Object>) response.get("similarities");
        Map<String, Double> result = new java.util.HashMap<>();
        for (Map.Entry<String, Object> entry : rawSimilarities.entrySet()) {
            if (entry.getValue() instanceof Number num) {
                result.put(entry.getKey(), num.doubleValue());
            }
        }
        return result;
    }

    public Map<String, Double> computeCentroidSimilaritiesFallback(float[] specterEmbedding, Map<String, float[]> centroidsByClusterId, Throwable t) {
        log.warn("AI service unavailable for centroid similarity. Fallback activated. Cause: {}", t.getMessage());
        return Map.of();
    }
}