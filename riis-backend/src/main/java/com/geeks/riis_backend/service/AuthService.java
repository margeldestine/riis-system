package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.LoginRequest;
import com.geeks.riis_backend.dto.LoginResponse;
import com.geeks.riis_backend.dto.RegisterRequest;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
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

	private final UserRepository userRepository;
	private final InstitutionRepository institutionRepository;
	private final JwtService jwtService;
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

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

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
		}

		user.setLastLoginAt(LocalDateTime.now());
		User saved = userRepository.save(user);

		String token = jwtService.generateAccessToken(saved.getId(), Map.of(
				"role", saved.getRole(),
				"email", saved.getEmail()
		));

		return new LoginResponse(
				saved.getId(),
				saved.getEmail(),
				saved.getFullName(),
				saved.getRole(),
				saved.getStatus(),
				saved.isMustResetPassword(),
				token
		);
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
