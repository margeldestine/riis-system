package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.service.AdminUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

	private final AdminUserService adminUserService;

	@GetMapping("/pending")
	public ResponseEntity<List<PendingUserResponse>> getPendingUsers() {
		return ResponseEntity.ok(adminUserService.getPendingUsers());
	}

	@PatchMapping("/{userId}/approve")
	public ResponseEntity<Void> approveUser(@PathVariable("userId") String userId) {
		adminUserService.approveUser(userId);
		return ResponseEntity.ok().build();
	}
}
