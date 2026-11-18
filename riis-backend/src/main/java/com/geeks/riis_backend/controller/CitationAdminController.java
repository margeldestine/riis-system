package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.service.OpenAlexCitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets a DOST admin start the OpenAlex citation refresh on demand (requirement 1), instead of
 * waiting for the weekly job. Covered by the URL rule /api/v1/admin/** (DOST_ADMIN) in
 * SecurityConfig AND by @PreAuthorize here.
 */
@RestController
@RequestMapping("/api/v1/admin/citations")
@RequiredArgsConstructor
public class CitationAdminController {

	private final OpenAlexCitationService openAlexCitationService;

	/** force=true re-checks every record with a DOI, even ones checked recently. */
	@PostMapping("/refresh")
	@PreAuthorize("hasRole('DOST_ADMIN')")
	public ResponseEntity<OpenAlexCitationService.RefreshSummary> refresh(
			@RequestParam(name = "force", defaultValue = "false") boolean force) {
		return ResponseEntity.ok(openAlexCitationService.refresh(force));
	}
}
