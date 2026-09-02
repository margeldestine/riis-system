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

	private static final String STATUS_ACTIVE = "ACTIVE";
	private static final String STATUS_PENDING = "PENDING";
	private static final String STATUS_REJECTED = "REJECTED";

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	/**
	 * A pre-hashed dummy value, never a real credential for any account.
	 * Used only so an unrecognized email still triggers exactly one bcrypt
	 * comparison in login() below -- the same cost (strength 10, matching
	 * every real hash produced by BCryptPasswordEncoder() elsewhere in this
	 * class) as checking a real password against a real hash. Its only
	 * purpose is to make an unknown-email attempt cost the same wall-clock
	 * time as a known-email one with a wrong password, so the two cases
	 * can't be told apart by response timing.
	 */
	private static final String DUMMY_PASSWORD_HASH =
			"$2b$10$/woQFJdE0a3G.33j/L7U1OdKIpSjM4ErQ9NCbhZYGQSleVE7Tv1/u";

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

		User existingUser = userRepository.findByEmail(email).orElse(null);
		if (existingUser != null) {
			if (STATUS_REJECTED.equalsIgnoreCase(existingUser.getStatus())) {
				throw new BadRequestException(
						"This email's registration was previously rejected and cannot register again. Please contact your DOST Region VII administrator.");
			}
			if (STATUS_PENDING.equalsIgnoreCase(existingUser.getStatus())) {
				throw new BadRequestException(
						"This email already has a pending registration awaiting DOST approval. Please wait for approval before registering again.");
			}
			if (STATUS_ACTIVE.equalsIgnoreCase(existingUser.getStatus())) {
				throw new BadRequestException(
						"This email is already registered and active. Please sign in instead, or use \"Forgot password\" if you've lost access.");
			}
			// Catch-all for any other/future status values.
			throw new BadRequestException("Email is already registered.");
		}

		if (request.employeeId() != null && !request.employeeId().isBlank()) {
			boolean previouslyRejected = userRepository.findByEmployeeId(request.employeeId()).stream()
					.anyMatch(u -> STATUS_REJECTED.equalsIgnoreCase(u.getStatus()));
			if (previouslyRejected) {
				throw new BadRequestException(
						"This Employee ID was previously rejected and cannot be used to register again. Please contact your DOST Region VII administrator.");
			}
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
		User user = userRepository.findByEmail(email).orElse(null);

		// An unrecognized email must be indistinguishable from a recognized
		// one with a wrong password -- same status code, same message, and
		// (by still running a real bcrypt comparison here, against a dummy
		// hash) roughly the same response time. Without this, an unknown
		// email used to short-circuit straight to a 404 with no bcrypt work
		// at all, which is both a status-code and a timing signal an
		// attacker could use to enumerate which emails have accounts.
		if (user == null) {
			passwordEncoder.matches(request.password(), DUMMY_PASSWORD_HASH);
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
		}

		// Whitelist check: only ACTIVE accounts may log in. Previously this
		// only blocked PENDING, which meant a REJECTED account (status is
		// updated, not deleted, by UserApprovalService) could still log in
		// as long as the password matched. Any status other than ACTIVE —
		// present or future — is now blocked by default.
		if (!STATUS_ACTIVE.equalsIgnoreCase(user.getStatus())) {
			if (STATUS_PENDING.equalsIgnoreCase(user.getStatus())) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account pending DOST approval.");
			}
			if (STATUS_REJECTED.equalsIgnoreCase(user.getStatus())) {
				throw new ResponseStatusException(
						HttpStatus.FORBIDDEN,
						"Your account registration was not approved. Please contact your DOST Region VII administrator.");
			}
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active. Please contact your administrator.");
		}

		String whitelistStatus = user.getInstitution() == null ? null : user.getInstitution().getWhitelistStatus();
		if (STATUS_PENDING.equalsIgnoreCase(whitelistStatus)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account pending DOST approval.");
		}

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
		}

		user.setLastLoginAt(LocalDateTime.now());
		User saved = userRepository.save(user);

		String token = jwtService.generateAccessToken(saved.getId(), Map.of(
				"role", saved.getRole(),
				"email", saved.getEmail()
		));

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