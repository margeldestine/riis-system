package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ThemeProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ThemeProfileRepository extends JpaRepository<ThemeProfile, String> {
    Optional<ThemeProfile> findByInstitutionId(String institutionId);
}