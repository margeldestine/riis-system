package com.geeks.riis_backend.config;

import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.UserRepository;
import com.geeks.riis_backend.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
	static final String JWT_FAILURE_REASON_ATTRIBUTE = "jwtFailureReason";

	private final JwtService jwtService;
	private final UserRepository userRepository;

	public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain
	) throws ServletException, IOException {
		String path = request.getRequestURI();
		if (path != null && path.startsWith("/api/v1/submissions")) {
			request.setAttribute(JWT_FAILURE_REASON_ATTRIBUTE, "JWT filter executed but authentication not established.");
		}
		if (SecurityContextHolder.getContext().getAuthentication() != null) {
			filterChain.doFilter(request, response);
			return;
		}

		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		String normalizedHeader = header == null ? null : header.trim();
		if (normalizedHeader == null || !normalizedHeader.toLowerCase().startsWith("bearer ")) {
			setJwtFailureReasonIfSubmissionsRequest(request, header == null
					? "Authorization header missing"
					: "Authorization header malformed (expected: Bearer <token>)");
			logMissingOrMalformedAuthHeader(request, header);
			filterChain.doFilter(request, response);
			return;
		}

		String token = normalizedHeader.substring("bearer ".length()).trim();
		if (token.isEmpty()) {
			setJwtFailureReasonIfSubmissionsRequest(request, "Authorization header malformed (empty token)");
			logMissingOrMalformedAuthHeader(request, header);
			filterChain.doFilter(request, response);
			return;
		}
		if ("null".equalsIgnoreCase(token) || "undefined".equalsIgnoreCase(token)) {
			setJwtFailureReasonIfSubmissionsRequest(request, "Authorization header malformed (token is null/undefined)");
			logMissingOrMalformedAuthHeader(request, header);
			filterChain.doFilter(request, response);
			return;
		}
		if (token.length() >= 2 && token.startsWith("\"") && token.endsWith("\"")) {
			token = token.substring(1, token.length() - 1).trim();
		}
		if (token.isEmpty()) {
			setJwtFailureReasonIfSubmissionsRequest(request, "Authorization header malformed (empty token)");
			logMissingOrMalformedAuthHeader(request, header);
			filterChain.doFilter(request, response);
			return;
		}

		try {
			Claims claims = jwtService.parseAndValidate(token);
			String subject = claims.getSubject();
			if (subject == null || subject.isBlank()) {
				logAuthFailure(request, "JWT subject is missing/blank");
				request.setAttribute(JWT_FAILURE_REASON_ATTRIBUTE, "JWT subject is missing/blank");
				filterChain.doFilter(request, response);
				return;
			}

			String normalizedSubject = subject.trim();
			Optional<User> userOptional = userRepository.findById(normalizedSubject);
			if (userOptional.isEmpty()) {
				userOptional = userRepository.findByEmail(normalizedSubject.toLowerCase());
			}
			if (userOptional.isEmpty()) {
				logAuthFailure(request, "No user found for JWT subject");
				request.setAttribute(JWT_FAILURE_REASON_ATTRIBUTE, "No user found for JWT subject");
				filterChain.doFilter(request, response);
				return;
			}

			User user = userOptional.get();
			String role = user.getRole();
			List<SimpleGrantedAuthority> authorities;
			if (role == null || role.isBlank()) {
				authorities = List.of();
			} else {
				String normalizedRole = role.trim();
				if (normalizedRole.startsWith("ROLE_")) {
					authorities = List.of(
							new SimpleGrantedAuthority(normalizedRole),
							new SimpleGrantedAuthority(normalizedRole.substring("ROLE_".length()))
					);
				} else {
					authorities = List.of(
							new SimpleGrantedAuthority("ROLE_" + normalizedRole),
							new SimpleGrantedAuthority(normalizedRole)
					);
				}
			}

			UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
					user.getId(),
					null,
					authorities
			);
			authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authentication);
			logAuthSuccess(request, user.getId(), user.getRole());
			request.removeAttribute(JWT_FAILURE_REASON_ATTRIBUTE);
		} catch (Exception ignored) {
			String reason = ignored.getClass().getSimpleName() + ": " + safeMessage(ignored.getMessage());
			logAuthFailure(request, reason);
			request.setAttribute(JWT_FAILURE_REASON_ATTRIBUTE, reason);
			SecurityContextHolder.clearContext();
		}

		filterChain.doFilter(request, response);
	}

	private void logMissingOrMalformedAuthHeader(HttpServletRequest request, String header) {
		String path = request.getRequestURI();
		if (!path.startsWith("/api/v1/submissions")) {
			return;
		}
		if (header == null) {
			logger.warn("JWT auth header missing for {} {}", request.getMethod(), path);
			return;
		}
		logger.warn("JWT auth header malformed for {} {} (startsWithBearer={})", request.getMethod(), path, header.startsWith("Bearer "));
	}

	private void logAuthFailure(HttpServletRequest request, String reason) {
		String path = request.getRequestURI();
		if (!path.startsWith("/api/v1/submissions")) {
			return;
		}
		logger.warn("JWT auth failed for {} {}: {}", request.getMethod(), path, reason);
	}

	private void logAuthSuccess(HttpServletRequest request, String userId, String role) {
		String path = request.getRequestURI();
		if (!path.startsWith("/api/v1/submissions")) {
			return;
		}
		logger.info("JWT auth ok for {} {} (userId={}, role={})", request.getMethod(), path, userId, role);
	}

	private void setJwtFailureReasonIfSubmissionsRequest(HttpServletRequest request, String reason) {
		String path = request.getRequestURI();
		if (!path.startsWith("/api/v1/submissions")) {
			return;
		}
		request.setAttribute(JWT_FAILURE_REASON_ATTRIBUTE, reason);
	}

	private String safeMessage(String message) {
		if (message == null) {
			return "";
		}
		String trimmed = message.trim();
		if (trimmed.length() > 160) {
			return trimmed.substring(0, 160);
		}
		return trimmed;
	}
}
