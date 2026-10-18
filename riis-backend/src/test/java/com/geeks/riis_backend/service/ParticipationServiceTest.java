package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.ParticipationSummaryDTO;
import com.geeks.riis_backend.repository.InstitutionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class ParticipationServiceTest {

    @Test
    void getParticipation_computesPerProvinceAndRegionRates() {
        InstitutionRepository repo = mock(InstitutionRepository.class);
        when(repo.participationByProvince()).thenReturn(List.of(
                new Object[] {"Bohol", 3L, 1L},
                new Object[] {"Cebu", 10L, 7L}));
        when(repo.nonParticipatingInstitutions()).thenReturn(List.of(
                new Object[] {"Bohol", "HEI A"},
                new Object[] {"Bohol", "HEI B"},
                new Object[] {"Cebu", "HEI C"}));

        ParticipationSummaryDTO result = new ParticipationService(repo).getParticipation();

        assertEquals(13, result.totalWhitelisted());
        assertEquals(8, result.totalParticipating());
        assertEquals(61.5, result.ratePercent());
        assertEquals(33.3, result.provinces().get(0).ratePercent());
        assertEquals(List.of("HEI A", "HEI B"), result.provinces().get(0).nonParticipating());
    }

    @Test
    void getParticipation_emptyRegionDoesNotDivideByZero() {
        InstitutionRepository repo = mock(InstitutionRepository.class);
        when(repo.participationByProvince()).thenReturn(List.of());
        when(repo.nonParticipatingInstitutions()).thenReturn(List.of());

        ParticipationSummaryDTO result = new ParticipationService(repo).getParticipation();

        assertEquals(0.0, result.ratePercent());
        assertEquals(0, result.provinces().size());
    }
}