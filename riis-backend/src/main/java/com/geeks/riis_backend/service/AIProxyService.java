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
}