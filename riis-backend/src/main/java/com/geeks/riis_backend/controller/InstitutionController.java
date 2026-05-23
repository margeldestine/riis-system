package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.service.InstitutionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
public class InstitutionController {

	private final InstitutionService institutionService;

	@GetMapping("/active")
	public ResponseEntity<List<InstitutionDropdownItem>> getActiveInstitutions() {
		return ResponseEntity.ok(institutionService.getAllActiveInstitutions());
	}

	@GetMapping("/{id}")
	public ResponseEntity<Institution> getInstitutionById(@PathVariable("id") String id) {
		return ResponseEntity.ok(institutionService.getInstitutionById(id));
	}
}
