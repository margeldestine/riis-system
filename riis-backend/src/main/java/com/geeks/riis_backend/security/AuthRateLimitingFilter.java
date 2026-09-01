package com.geeks.riis_backend.security;

import com.geeks.riis_backend.config.JwtAuthenticationFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-IP rate limiting for the unauthenticated auth endpoints:
 * POST /api/v1/auth/login, /register, /forgot-password.
 *
 * These endpoints are intentionally permitAll() in SecurityConfig (login
 * has to be reachable without a token, registration and forgot-password
 * are pre-auth by nature) — so they get no protection at all from JWT
 * checks. This filter is what stands between them and unlimited
 * password-guessing / registration spam / SMTP-quota exhaustion.
 *
 * Registered in SecurityConfig BEFORE JwtAuthenticationFilter so an
 * over-limit request is rejected before any token parsing work happens.
 */
@Component
public class AuthRateLimitingFilter extends OncePerRequestFilter {

    private final KeyedRateLimiter keyedRateLimiter;

    public AuthRateLimitingFilter(KeyedRateLimiter keyedRateLimiter) {
        this.keyedRateLimiter = keyedRateLimiter;
    }

    private static final Map<String, RateLimitRule> RULES = Map.of(
            "/api/v1/auth/login", new RateLimitRule("auth-login", 5, Duration.ofMinutes(1)),
            "/api/v1/auth/register", new RateLimitRule("auth-register", 3, Duration.ofMinutes(1)),
            "/api/v1/auth/forgot-password", new RateLimitRule("auth-forgot-password", 3, Duration.ofMinutes(1))
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if ("POST".equalsIgnoreCase(request.getMethod())) {
            RateLimitRule rule = RULES.get(request.getRequestURI());
            if (rule != null) {
                String ip = resolveClientIp(request);
                boolean allowed = keyedRateLimiter.tryConsume(rule.name(), ip, rule.limit(), rule.period());
                if (!allowed) {
                    response.setStatus(429);
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"message\":\"Too many attempts. Please try again later.\"}");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Reads the direct TCP peer address. If this app is later deployed
     * behind a reverse proxy or load balancer, every request will appear
     * to come from the proxy's IP unless X-Forwarded-For is trusted and
     * parsed at that layer — deliberately NOT reading a client-supplied
     * header here, since trusting X-Forwarded-For on a setup that isn't
     * actually behind a proxy lets a caller spoof their own rate-limit key
     * and bypass this filter entirely. Wire that up at deploy time once
     * the actual proxy topology is known.
     */
    private String resolveClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private record RateLimitRule(String name, int limit, Duration period) {}
}