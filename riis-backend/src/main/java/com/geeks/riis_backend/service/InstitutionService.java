package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.repository.InstitutionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstitutionService {

	private final InstitutionRepository institutionRepository;

	@Transactional(readOnly = true)
	public Institution getInstitutionById(String id) {
		return institutionRepository
				.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Institution not found: " + id));
	}

	@Transactional(readOnly = true)
	public List<InstitutionDropdownItem> getAllActiveInstitutions() {
		return institutionRepository.findActiveDropdownItems();
	}
}
