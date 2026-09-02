package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.ForgotPasswordRequest;
import com.geeks.riis_backend.dto.LoginRequest;
import com.geeks.riis_backend.dto.LoginResponse;
import com.geeks.riis_backend.dto.RegisterRequest;
import com.geeks.riis_backend.dto.ResetPasswordRequest;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.service.AuthService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
		User user = authService.register(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
				"id", user.getId(),
				"email", user.getEmail(),
				"status", user.getStatus()
		));
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.login(request));
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
		authService.forgotPassword(request);
		// Same response whether or not the email exists — avoids account enumeration.
		return ResponseEntity.ok(Map.of(
				"message", "If an account with that email exists, a password reset link has been sent."
		));
	}

	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
		authService.resetPassword(request);
		return ResponseEntity.ok(Map.of(
				"message", "Your password has been reset. You can now log in with your new password."
		));
	}
}