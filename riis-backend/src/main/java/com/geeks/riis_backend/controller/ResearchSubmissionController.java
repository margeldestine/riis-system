package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.MySubmissionItem;
import com.geeks.riis_backend.dto.ResearchSubmissionRequest;
import com.geeks.riis_backend.dto.ResearchSubmissionResponse;
import com.geeks.riis_backend.service.ResearchOutputService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/research")
@RequiredArgsConstructor
public class ResearchSubmissionController {

	private final ResearchOutputService researchOutputService;

	@PostMapping("/submit")
	public ResponseEntity<ResearchSubmissionResponse> submit(@RequestBody ResearchSubmissionRequest request) {
		String userId = getAuthenticatedUserId();
		ResearchSubmissionResponse response = researchOutputService.submitForUser(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@GetMapping("/my-submissions")
	public ResponseEntity<List<MySubmissionItem>> getMySubmissions() {
		String userId = getAuthenticatedUserId();
		return ResponseEntity.ok(researchOutputService.getSubmissionsForUserInstitution(userId));
	}

	private String getAuthenticatedUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
		}
		Object principal = authentication.getPrincipal();
		String userId = principal == null ? null : principal.toString();
		if (userId == null || userId.isBlank() || "anonymousUser".equalsIgnoreCase(userId)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
		}
		return userId;
	}
}
