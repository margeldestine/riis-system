package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.LoginRequest;
import com.geeks.riis_backend.dto.LoginResponse;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AuthServiceTest {

	@Test
	void login_blocksPendingUserStatus() {
		UserRepository userRepository = mock(UserRepository.class);
		InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
		JwtService jwtService = new JwtService("test-secret", "test-issuer", 3600);
		AuthService authService = new AuthService(userRepository, institutionRepository, jwtService);

		User pendingUser = User.builder()
				.email("pending@cit.edu")
				.status("PENDING")
				.passwordHash("$2a$10$g3A0J2GvG3A0J2GvG3A0JuP4C8S4nK6h4g7k1u5u0i7kB1b7zT8A6")
				.build();

		when(userRepository.findByEmail("pending@cit.edu")).thenReturn(Optional.of(pendingUser));

		ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
				authService.login(new LoginRequest("pending@cit.edu", "any-password"))
		);

		assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
		assertEquals("Account pending DOST approval.", ex.getReason());
	}

	@Test
	void login_blocksPendingWhitelistStatus() {
		UserRepository userRepository = mock(UserRepository.class);
		InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
		JwtService jwtService = new JwtService("test-secret", "test-issuer", 3600);
		AuthService authService = new AuthService(userRepository, institutionRepository, jwtService);

		Institution institution = Institution.builder()
				.id("CITU")
				.name("Cebu Institute of Technology - University")
				.whitelistStatus("PENDING")
				.build();

		User user = User.builder()
				.email("active@cit.edu")
				.status("ACTIVE")
				.institution(institution)
				.passwordHash("$2a$10$g3A0J2GvG3A0J2GvG3A0JuP4C8S4nK6h4g7k1u5u0i7kB1b7zT8A6")
				.build();

		when(userRepository.findByEmail("active@cit.edu")).thenReturn(Optional.of(user));

		ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
				authService.login(new LoginRequest("active@cit.edu", "any-password"))
		);

		assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
		assertEquals("Account pending DOST approval.", ex.getReason());
	}

	@Test
	void login_throwsWhenUserNotFound() {
		UserRepository userRepository = mock(UserRepository.class);
		InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
		JwtService jwtService = new JwtService("test-secret", "test-issuer", 3600);
		AuthService authService = new AuthService(userRepository, institutionRepository, jwtService);

		when(userRepository.findByEmail("missing@cit.edu")).thenReturn(Optional.empty());

		assertThrows(ResourceNotFoundException.class, () ->
				authService.login(new LoginRequest("missing@cit.edu", "any-password"))
		);
	}

	@Test
	void login_returnsJwtTokenForActiveUsers() {
		UserRepository userRepository = mock(UserRepository.class);
		InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
		JwtService jwtService = new JwtService("test-secret", "test-issuer", 3600);
		AuthService authService = new AuthService(userRepository, institutionRepository, jwtService);

		String passwordHash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("password");

		User user = User.builder()
				.id("user-1")
				.fullName("DOST Admin")
				.email("admin@dost.gov.ph")
				.role("DOST_ADMIN")
				.status("ACTIVE")
				.passwordHash(passwordHash)
				.build();

		when(userRepository.findByEmail("admin@dost.gov.ph")).thenReturn(Optional.of(user));
		when(userRepository.save(user)).thenReturn(user);

		LoginResponse response = authService.login(new LoginRequest("admin@dost.gov.ph", "password"));
		assertEquals("admin@dost.gov.ph", response.email());
		assertNotNull(response.token());
	}
}
