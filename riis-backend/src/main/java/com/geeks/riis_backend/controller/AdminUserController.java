package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.service.AdminUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Defense-in-depth: this controller previously relied solely on
 * SecurityConfig's URL-pattern rule for /api/v1/admin/** to restrict
 * access. That rule still applies unchanged -- this class-level
 * @PreAuthorize adds redundant enforcement of the SAME existing rule at
 * the method-invocation layer, so this controller keeps its protection
 * even if the URL-pattern matcher list is ever refactored elsewhere.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAnyAuthority('ROLE_DOST_ADMIN', 'DOST_ADMIN')")
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