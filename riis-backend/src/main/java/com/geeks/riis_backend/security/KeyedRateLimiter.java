package com.geeks.riis_backend.security;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;

/**
 * A shared per-key rate limiter used by both {@link AuthRateLimitingFilter}
 * (per-IP, for the unauthenticated auth endpoints) and
 * {@code QualityReviewController} (per-admin-user, for the Claude review
 * trigger endpoints).
 *
 * Resilience4j's {@code @RateLimiter} annotation applies ONE shared limiter
 * per method — every caller draws from the same bucket, which isn't what we
 * want here (one abusive IP shouldn't exhaust the login attempt budget for
 * everyone else). This wraps {@link RateLimiterRegistry} to hand out one
 * independent limiter per (rule name, key) pair instead, created lazily and
 * kept in memory for the life of this instance.
 *
 * IMPORTANT: this is a same-instance, in-memory limiter. It resets on
 * restart and does not coordinate across multiple app instances behind a
 * load balancer. That's an accepted stopgap for now — see the caller sites
 * for the production recommendation (rate-limit at the edge / reverse proxy
 * / API gateway as well).
 */
@Component
public class KeyedRateLimiter {

    private final RateLimiterRegistry registry = RateLimiterRegistry.ofDefaults();
    private final ConcurrentMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    /**
     * Attempts to consume one permit for {@code key} under the named rule.
     * Returns {@code true} if allowed, {@code false} if the caller has
     * exceeded {@code limitForPeriod} within {@code period} and should be
     * rejected (HTTP 429).
     *
     * Uses a zero timeout — this never blocks waiting for a permit to free
     * up; a request either has budget right now or it doesn't.
     */
    public boolean tryConsume(String ruleName, String key, int limitForPeriod, Duration period) {
        String compositeKey = ruleName + ":" + key;
        RateLimiter limiter = limiters.computeIfAbsent(compositeKey, k -> {
            RateLimiterConfig config = RateLimiterConfig.custom()
                    .limitForPeriod(limitForPeriod)
                    .limitRefreshPeriod(period)
                    .timeoutDuration(Duration.ZERO)
                    .build();
            return registry.rateLimiter(compositeKey, config);
        });
        return limiter.acquirePermission();
    }
}