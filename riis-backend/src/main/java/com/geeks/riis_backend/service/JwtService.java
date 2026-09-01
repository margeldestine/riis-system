package com.geeks.riis_backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private final String issuer;
	private final long accessTokenTtlSeconds;
	private final long rememberMeTtlSeconds;
	private final SecretKey signingKey;

	public JwtService(
			@Value("${jwt.secret:${app.security.jwt.secret}}") String secret,
			@Value("${app.security.jwt.issuer}") String issuer,
			@Value("${app.security.jwt.access-token-ttl-seconds:3600}") long accessTokenTtlSeconds,
			@Value("${app.security.jwt.remember-me-ttl-seconds:2592000}") long rememberMeTtlSeconds
	) {
		this.issuer = issuer;
		this.accessTokenTtlSeconds = accessTokenTtlSeconds;
		this.rememberMeTtlSeconds = rememberMeTtlSeconds;
		String normalizedSecret = secret == null ? "" : secret.trim();
		if (normalizedSecret.isBlank() || "PLEASE_SET_JWT_SECRET".equals(normalizedSecret)) {
			// Fail fast, not fail warn: a placeholder or missing secret is
			// computable by anyone who's seen this public repo, so signing
			// real tokens with it would mean any caller could forge a valid
			// admin JWT. Refusing to start is the only safe option here --
			// a warning that the app keeps running past is exactly the fail-open
			// behavior this replaces.
			throw new IllegalStateException(
					"JWT_SECRET is not configured. Refusing to start with an insecure placeholder " +
							"signing key. Set the JWT_SECRET environment variable before starting this application.");
		}
		this.signingKey = Keys.hmacShaKeyFor(hashTo256Bits(normalizedSecret));
	}

	/**
	 * Existing behavior — unchanged. Uses the default access-token TTL.
	 */
	public String generateAccessToken(String subject, Map<String, Object> claims) {
		return generateAccessToken(subject, claims, accessTokenTtlSeconds);
	}

	/**
	 * New overload — lets callers (e.g. login with rememberMe=true) request
	 * a custom TTL instead of the default one. Falls back to the default
	 * TTL if a non-positive value is passed in.
	 */
	public String generateAccessToken(String subject, Map<String, Object> claims, long ttlSeconds) {
		long effectiveTtl = ttlSeconds > 0 ? ttlSeconds : accessTokenTtlSeconds;
		Instant now = Instant.now();
		Instant expiresAt = now.plusSeconds(effectiveTtl);

		return Jwts.builder()
				.subject(subject)
				.issuer(issuer)
				.issuedAt(Date.from(now))
				.expiration(Date.from(expiresAt))
				.claims(claims)
				.signWith(signingKey)
				.compact();
	}

	public long getRememberMeTtlSeconds() {
		return rememberMeTtlSeconds;
	}

	public Claims parseAndValidate(String token) {
		return Jwts.parser()
				.verifyWith(signingKey)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}

	private byte[] hashTo256Bits(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return digest.digest(value.getBytes(StandardCharsets.UTF_8));
		} catch (Exception e) {
			throw new IllegalStateException("Unable to initialize JWT signing key.", e);
		}
	}
}