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
		String method = request.getMethod();
		boolean isSubmissionsRequest = path != null && path.startsWith("/api/v1/submissions");

		String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (isSubmissionsRequest) {
			logger.info("JWT Filter: {} {} (Authorization header present={})", method, path, authHeader != null);
		}

		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			if (isSubmissionsRequest) {
				logger.info("JWT Filter: No Bearer token found.");
			}
			filterChain.doFilter(request, response);
			return;
		}

		if (SecurityContextHolder.getContext().getAuthentication() != null) {
			if (isSubmissionsRequest) {
				logger.info("JWT Filter: SecurityContext already has authentication; skipping.");
			}
			filterChain.doFilter(request, response);
			return;
		}

		try {
			String jwt = authHeader.substring("Bearer ".length()).trim();
			if (jwt.isBlank() || "null".equalsIgnoreCase(jwt) || "undefined".equalsIgnoreCase(jwt)) {
				if (isSubmissionsRequest) {
					logger.warn("JWT Filter: Bearer token is blank/null/undefined.");
				}
				filterChain.doFilter(request, response);
				return;
			}
			if (jwt.length() >= 2 && jwt.startsWith("\"") && jwt.endsWith("\"")) {
				jwt = jwt.substring(1, jwt.length() - 1).trim();
			}
			if (jwt.isBlank()) {
				if (isSubmissionsRequest) {
					logger.warn("JWT Filter: Bearer token is blank after trimming quotes.");
				}
				filterChain.doFilter(request, response);
				return;
			}

			if (isSubmissionsRequest) {
				logger.info("JWT Filter: Bearer token received (length={})", jwt.length());
			}

			Claims claims = jwtService.parseAndValidate(jwt);
			String subject = claims == null ? null : claims.getSubject();
			if (subject == null || subject.isBlank()) {
				if (isSubmissionsRequest) {
					logger.warn("JWT Filter: JWT subject is missing/blank.");
				}
				filterChain.doFilter(request, response);
				return;
			}

			String normalizedSubject = subject.trim();
			Optional<User> userOptional = userRepository.findById(normalizedSubject);
			if (userOptional.isEmpty()) {
				userOptional = userRepository.findByEmail(normalizedSubject.toLowerCase());
			}
			if (userOptional.isEmpty()) {
				if (isSubmissionsRequest) {
					logger.warn("JWT Filter: No user found for JWT subject.");
				}
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

			UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
					user.getId(),
					null,
					authorities
			);
			authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authToken);

			if (isSubmissionsRequest) {
				logger.info("JWT Filter: SecurityContext set for user: {} (role={})", user.getId(), role);
			}
		} catch (Exception e) {
			if (isSubmissionsRequest) {
				logger.error("JWT Filter: Error during authentication", e);
			}
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
