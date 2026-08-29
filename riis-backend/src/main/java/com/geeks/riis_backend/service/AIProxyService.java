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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIProxyService {

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    /**
     * The Claude holistic-review pass is a single, comparatively slow LLM
     * call (full paper text in, structured rubric scoring out), unlike the
     * sub-second KeyBERT/SBERT/SPECTER calls below — per the integration
     * spec this gets a much longer timeout (60-90s) rather than the 8s used
     * elsewhere in this class.
     */
    private static final int CLAUDE_REVIEW_TIMEOUT_SECONDS = 90;

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

    /**
     * Calls {@code POST /ai/claude/review} for a rubric-guided Claude
     * holistic review of {@code paperText}.
     *
     * Fail-closed by design, matching {@link PdfTextExtractionService}'s
     * style: this never returns an empty/silent placeholder. Every failure
     * mode — blank input, a transport-level failure that trips the circuit
     * breaker, a malformed response body, or {@code riis-ai} itself
     * reporting {@code status: "FAILED"} (missing API key, invalid JSON,
     * schema-invalid model output, timeout, auth error) — comes back as an
     * explicit {@link ClaudeAssessmentResult#failure(String)} so
     * {@code ClaudeReviewService} can record a real {@code failure_reason}
     * on the {@code quality_reviews} row rather than persisting a
     * partially-populated or empty success.
     */
    @CircuitBreaker(name = "aiService", fallbackMethod = "computeClaudeAssessmentFallback")
    @Retryable(maxAttempts = 2, backoff = @Backoff(delay = 3000, multiplier = 2))
    public ClaudeAssessmentResult computeClaudeAssessment(String paperText, String rubricVersion) {
        if (paperText == null || paperText.isBlank()) {
            return ClaudeAssessmentResult.failure("No paper text was provided for Claude review.");
        }
        if (rubricVersion == null || rubricVersion.isBlank()) {
            return ClaudeAssessmentResult.failure("No rubric version was specified for Claude review.");
        }

        WebClient client = WebClient.create(aiServiceUrl);
        // Deliberately not caught here: letting a transport-level exception
        // (timeout, connection refused, 5xx) propagate is what allows
        // @Retryable / @CircuitBreaker to see it and route to the fallback
        // method below.
        Map response = client.post()
                .uri("/ai/claude/review")
                .bodyValue(Map.of("paper_text", paperText, "rubric_version", rubricVersion))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(CLAUDE_REVIEW_TIMEOUT_SECONDS))
                .block();

        if (response == null) {
            return ClaudeAssessmentResult.failure("Received an empty response from the AI review service.");
        }

        // riis-ai always answers 200 with a discriminated {"status": ...}
        // body rather than an HTTP error code for logical failures, so the
        // SUCCESS/FAILED check happens here, not via an exception.
        Object status = response.get("status");
        if (!"SUCCESS".equals(status)) {
            Object reason = response.get("reason");
            return ClaudeAssessmentResult.failure(
                    reason != null ? String.valueOf(reason) : "The AI review service reported a failure.");
        }

        try {
            Integer overallScore = ((Number) response.get("overall_score")).intValue();

            List<Map<String, Object>> criteriaRaw = (List<Map<String, Object>>) response.get("criteria");
            List<CriterionScoreDTO> criteria = criteriaRaw == null ? List.of() : criteriaRaw.stream()
                                                                                 .map(c -> new CriterionScoreDTO(
                                                                                         String.valueOf(c.get("name")),
                                                                                         ((Number) c.get("score")).intValue(),
                                                                                         String.valueOf(c.get("justification"))))
                                                                                 .collect(Collectors.toList());

            List<?> flagsRaw = (List<?>) response.get("flags");
            List<String> flags = flagsRaw == null ? List.of() : flagsRaw.stream()
                                                                .map(String::valueOf)
                                                                .collect(Collectors.toList());

            String summary = response.get("summary") != null ? String.valueOf(response.get("summary")) : "";

            return ClaudeAssessmentResult.success(overallScore, criteria, flags, summary);
        } catch (Exception e) {
            log.error("Claude review response did not match the expected schema: {}", response, e);
            return ClaudeAssessmentResult.failure(
                    "The AI review service returned a response in an unexpected format.");
        }
    }

    public ClaudeAssessmentResult computeClaudeAssessmentFallback(String paperText, String rubricVersion, Throwable t) {
        log.warn("AI service unavailable for Claude holistic review. Fallback activated. Cause: {}", t.getMessage());
        return ClaudeAssessmentResult.failure("The AI review service is currently unavailable: " + t.getMessage());
    }
}