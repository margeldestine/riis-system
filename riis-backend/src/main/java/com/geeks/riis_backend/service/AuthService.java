package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.ForgotPasswordRequest;
import com.geeks.riis_backend.dto.LoginRequest;
import com.geeks.riis_backend.dto.LoginResponse;
import com.geeks.riis_backend.dto.RegisterRequest;
import com.geeks.riis_backend.dto.ResetPasswordRequest;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.PasswordResetToken;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.PasswordResetTokenRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final UserRepository userRepository;
	private final InstitutionRepository institutionRepository;
	private final PasswordResetTokenRepository passwordResetTokenRepository;
	private final JwtService jwtService;
	private final EmailNotificationService emailNotificationService;
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	@Value("${app.security.password-reset-token-ttl-minutes:30}")
	private long passwordResetTokenTtlMinutes;

	@Value("${app.frontend.base-url:http://localhost:5173}")
	private String frontendBaseUrl;

	public User register(RegisterRequest request) {
		if (request == null) {
			throw new BadRequestException("Request body is required.");
		}

		String email = normalizeEmail(request.email());
		if (userRepository.existsByEmail(email)) {
			throw new BadRequestException("Email is already registered.");
		}

		Institution institution = institutionRepository
				.findById(request.institutionId())
				.orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + request.institutionId()));

		String emailDomain = extractDomain(email);
		String allowedDomain = normalizeDomain(institution.getEmailDomain());
		if (!emailDomain.equals(allowedDomain)) {
			throw new BadRequestException("Email domain does not match the selected institution whitelist.");
		}

		String password = request.password();
		if (password == null || password.isBlank()) {
			throw new BadRequestException("Password is required.");
		}

		User user = User.builder()
				.fullName(request.fullName())
				.email(email)
				.passwordHash(passwordEncoder.encode(password))
				.role("HEI_STAFF")
				.status("PENDING")
				.institution(institution)
				.employeeId(request.employeeId())
				.department(request.department())
				.position(request.position())
				.mustResetPassword(false)
				.build();

		return userRepository.save(user);
	}

	public LoginResponse login(LoginRequest request) {
		if (request == null) {
			throw new BadRequestException("Request body is required.");
		}

		String email = normalizeEmail(request.email());
		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		String whitelistStatus = user.getInstitution() == null ? null : user.getInstitution().getWhitelistStatus();

        if ("PENDING".equalsIgnoreCase(user.getStatus()) || "PENDING".equalsIgnoreCase(whitelistStatus)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account pending DOST approval.");
        }

        if ("REJECTED".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been rejected and cannot sign in.");
        }

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
		}

		user.setLastLoginAt(LocalDateTime.now());
		User saved = userRepository.save(user);

		boolean rememberMe = Boolean.TRUE.equals(request.rememberMe());
		long ttlSeconds = rememberMe ? jwtService.getRememberMeTtlSeconds() : -1;

		Map<String, Object> claims = new java.util.HashMap<>();
		claims.put("role", saved.getRole());
		claims.put("email", saved.getEmail());
		claims.put("institutionId", saved.getInstitution() != null ? saved.getInstitution().getId() : null);

		String token = jwtService.generateAccessToken(
				saved.getId(),
				claims,
				ttlSeconds
		);

		String institutionName = saved.getInstitution() == null ? null : saved.getInstitution().getName();
		String position = saved.getPosition();

		return new LoginResponse(
				saved.getId(),
				saved.getEmail(),
				saved.getFullName(),
				saved.getRole(),
				saved.getStatus(),
				saved.isMustResetPassword(),
				token,
				institutionName,
				position
		);
	}

	/**
	 * Always completes without revealing whether the email exists — an
	 * enumeration-safe response is sent by the controller either way.
	 */
	public void forgotPassword(ForgotPasswordRequest request) {
		if (request == null || request.email() == null || request.email().isBlank()) {
			throw new BadRequestException("Email is required.");
		}

		String email = normalizeEmail(request.email());
		userRepository.findByEmail(email).ifPresent(user -> {
			String rawToken = generateRawToken();
			String tokenHash = hashToken(rawToken);

			PasswordResetToken resetToken = PasswordResetToken.builder()
					.user(user)
					.tokenHash(tokenHash)
					.expiresAt(LocalDateTime.now().plusMinutes(passwordResetTokenTtlMinutes))
					.build();
			passwordResetTokenRepository.save(resetToken);

			String resetLink = frontendBaseUrl + "/reset-password?token=" + rawToken;
			emailNotificationService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink);
		});
	}

	public void resetPassword(ResetPasswordRequest request) {
		if (request == null || request.token() == null || request.token().isBlank()) {
			throw new BadRequestException("Reset token is required.");
		}
		if (request.newPassword() == null || request.newPassword().isBlank()) {
			throw new BadRequestException("New password is required.");
		}

		String tokenHash = hashToken(request.token());
		PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
				.orElseThrow(() -> new BadRequestException("Invalid or expired reset link."));

		if (resetToken.getUsedAt() != null) {
			throw new BadRequestException("This reset link has already been used.");
		}
		if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BadRequestException("This reset link has expired.");
		}

		User user = resetToken.getUser();
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		user.setMustResetPassword(false);
		userRepository.save(user);

		resetToken.setUsedAt(LocalDateTime.now());
		passwordResetTokenRepository.save(resetToken);
	}

	private String generateRawToken() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hashToken(String rawToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
			StringBuilder hex = new StringBuilder(hash.length * 2);
			for (byte b : hash) {
				hex.append(String.format("%02x", b));
			}
			return hex.toString();
		} catch (Exception e) {
			throw new IllegalStateException("Unable to hash reset token.", e);
		}
	}

	private String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			throw new BadRequestException("Email is required.");
		}
		return email.trim().toLowerCase();
	}

	private String extractDomain(String email) {
		int atIndex = email.lastIndexOf('@');
		if (atIndex < 1 || atIndex == email.length() - 1) {
			throw new BadRequestException("Email must contain a valid domain.");
		}
		return email.substring(atIndex + 1).trim().toLowerCase();
	}

	private String normalizeDomain(String domain) {
		if (domain == null || domain.isBlank()) {
			return "";
		}
		String normalized = domain.trim().toLowerCase();
		if (normalized.startsWith("@")) {
			normalized = normalized.substring(1);
		}
		return normalized;
	}
}