package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.LoginRequest;
import com.geeks.riis_backend.dto.LoginResponse;
import com.geeks.riis_backend.dto.RegisterRequest;
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
}
